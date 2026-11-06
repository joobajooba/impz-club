// Builds a three.js Imp from the Blockbench models exported to /impz (see scripts/export_impz_models.py).
// A body supplies the skeleton. Each trait file repeats the body's bone names down to where it attaches,
// so its parts are merged into the body's bones by name and move with them.
import * as THREE from "three";

const BASE = "/impz";
const DEG = Math.PI / 180;
// three.js BoxGeometry face order
const FACES = ["east", "west", "up", "down", "south", "north"];

const jsonCache = new Map();
const imageCache = new Map();

export function loadManifest() {
  return loadJson(`${BASE}/manifest.json`);
}

function loadJson(url) {
  if (!jsonCache.has(url)) {
    jsonCache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return r.json();
      }),
    );
  }
  return jsonCache.get(url);
}

function loadImage(url) {
  if (!imageCache.has(url)) {
    imageCache.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`${url} failed to load`));
        img.src = url;
      }),
    );
  }
  return imageCache.get(url);
}

export const iconUrl = (id) => `${BASE}/icons/${id}.png`;

function pixelTexture(source) {
  const tex = new THREE.Texture(source);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// the body's texture, with an eyes overlay (pupil colours, beam glow) painted over it
async function bodyTexture(bodyId, overlayId) {
  const img = await loadImage(`${BASE}/textures/${bodyId}.png`);
  if (!overlayId) return pixelTexture(img);
  const over = await loadImage(`${BASE}/textures/${overlayId}.png`);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  ctx.drawImage(over, 0, 0, img.width, img.height);
  return pixelTexture(canvas);
}

function materials(texture) {
  return {
    lit: new THREE.MeshLambertMaterial({ map: texture, transparent: true, alphaTest: 0.05 }),
    glow: new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.05, depthWrite: false }),
  };
}

function setRotation(obj, rot) {
  if (!rot) return;
  obj.rotation.order = "ZYX"; // Blockbench's order
  obj.rotation.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG);
}

function cubeMesh(el, [uvW, uvH], mats) {
  const stretch = el.stretch || [1, 1, 1];
  const size = [0, 1, 2].map((i) => Math.max(Math.abs((el.to[i] - el.from[i]) * stretch[i]), 0.001));
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const uv = geo.attributes.uv;
  const index = [];
  const src = geo.index.array;
  FACES.forEach((name, f) => {
    const face = el.faces[name];
    if (!face) return; // untextured faces are not drawn
    const [u1, v1, u2, v2] = face.uv;
    for (let k = 0; k < 4; k += 1) {
      const u = k % 2 ? u2 : u1;
      const v = k < 2 ? v1 : v2;
      uv.setXY(f * 4 + k, u / uvW, 1 - v / uvH);
    }
    for (let i = 0; i < 6; i += 1) index.push(src[f * 6 + i]);
  });
  geo.setIndex(index);
  geo.clearGroups();
  const mesh = new THREE.Mesh(geo, /glow/i.test(el.name) ? mats.glow : mats.lit);
  // a negative stretch mirrors the cube about its centre
  mesh.scale.set(Math.sign(stretch[0]) || 1, Math.sign(stretch[1]) || 1, Math.sign(stretch[2]) || 1);
  mesh.name = el.name;
  return mesh;
}

// place a cube inside a bone: pivot at the cube's origin, mesh centred on the cube
function addCube(el, parent, parentOrigin, texSize, mats) {
  const pivot = new THREE.Object3D();
  pivot.position.set(el.origin[0] - parentOrigin[0], el.origin[1] - parentOrigin[1], el.origin[2] - parentOrigin[2]);
  setRotation(pivot, el.rotation);
  const mesh = cubeMesh(el, texSize, mats);
  mesh.position.set(
    (el.from[0] + el.to[0]) / 2 - el.origin[0],
    (el.from[1] + el.to[1]) / 2 - el.origin[1],
    (el.from[2] + el.to[2]) / 2 - el.origin[2],
  );
  pivot.add(mesh);
  parent.add(pivot);
}

function makeBone(node, parentOrigin) {
  const obj = new THREE.Group();
  obj.name = node.name;
  obj.position.set(node.origin[0] - parentOrigin[0], node.origin[1] - parentOrigin[1], node.origin[2] - parentOrigin[2]);
  setRotation(obj, node.rotation);
  return obj;
}

function addModel(model, mats, root, bones) {
  function walk(node, parent, parentOrigin) {
    if (typeof node === "number") {
      addCube(model.elements[node], parent, parentOrigin, model.texture, mats);
      return;
    }
    let bone = bones.get(node.name);
    if (!bone) {
      bone = { obj: makeBone(node, parentOrigin), origin: node.origin };
      parent.add(bone.obj);
      bones.set(node.name, bone);
    }
    node.children.forEach((child) => walk(child, bone.obj, bone.origin));
  }
  model.bones.forEach((node) => walk(node, root, [0, 0, 0]));
}

// selection: { body, head, eyes, clothing, back } of manifest ids (null = none); eyesEntry is the manifest entry
export async function buildImp(selection, eyesEntry) {
  const parts = ["head", "clothing", "back"].map((t) => selection[t]).filter(Boolean);
  if (eyesEntry?.model) parts.push(eyesEntry.id);
  const [body, bodyTex, ...traits] = await Promise.all([
    loadJson(`${BASE}/models/${selection.body}.json`),
    bodyTexture(selection.body, eyesEntry?.overlay),
    ...parts.map((id) =>
      Promise.all([loadJson(`${BASE}/models/${id}.json`), loadImage(`${BASE}/textures/${id}.png`)]),
    ),
  ]);
  const root = new THREE.Group();
  const bones = new Map();
  addModel(body, materials(bodyTex), root, bones);
  traits.forEach(([model, img]) => addModel(model, materials(pixelTexture(img)), root, bones));
  return root;
}

export function disposeImp(root) {
  const seen = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    if (!seen.has(o.material)) {
      seen.add(o.material);
      o.material.map?.dispose();
      o.material.dispose();
    }
  });
}
