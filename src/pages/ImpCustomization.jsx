import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildImp, disposeImp, loadManifest } from "../lib/impRig.js";

const TYPES = [
  { key: "body", label: "Body", none: false },
  { key: "head", label: "Head", none: true },
  { key: "eyes", label: "Eyes", none: true },
  { key: "clothing", label: "Clothing", none: true },
  { key: "back", label: "Back", none: true },
];
const DEFAULT = { body: "body_green", head: null, eyes: null, clothing: null, back: null };

// Later this will come from the Impz in the connected wallet. For testing every trait is unlocked.
function isOwned() {
  return true;
}

function ImpStage({ selection, eyesEntry, onState }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const [spin, setSpin] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8088a0, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(60, 140, 120);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(-80, 60, -120);
    scene.add(rim);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(46, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
    camera.position.set(70, 95, 250);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 58, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 110;
    controls.maxDistance = 520;
    controls.autoRotateSpeed = 1.6;
    controls.update();
    const holder = new THREE.Group();
    scene.add(holder);
    sceneRef.current = { holder, controls };

    function resize() {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      holder.children.forEach(disposeImp);
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.controls.autoRotate = spin;
  }, [spin]);

  useEffect(() => {
    let cancelled = false;
    onState("loading");
    buildImp(selection, eyesEntry)
      .then((imp) => {
        const s = sceneRef.current;
        if (cancelled || !s) {
          disposeImp(imp);
          return;
        }
        s.holder.children.slice().forEach((old) => {
          s.holder.remove(old);
          disposeImp(old);
        });
        s.holder.add(imp);
        onState("ready");
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) onState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [selection, eyesEntry, onState]);

  return (
    <div className="custom-stage">
      <div className="custom-canvas" ref={hostRef} />
      <button type="button" className="custom-spin" onClick={() => setSpin((v) => !v)}>
        {spin ? "Stop spin" : "Spin"}
      </button>
      <p className="custom-hint">Drag to turn · scroll to zoom</p>
    </div>
  );
}

function readSelection(params, manifest) {
  const sel = { ...DEFAULT };
  if (!manifest) return sel;
  for (const t of TYPES) {
    const v = params.get(t.key);
    if (v === "none" && t.none) sel[t.key] = null;
    else if (v && manifest[t.key].some((e) => e.id === `${t.key}_${v}`)) sel[t.key] = `${t.key}_${v}`;
  }
  return sel;
}

export default function ImpCustomization() {
  const [manifest, setManifest] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState("body");
  const [status, setStatus] = useState("loading");
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    loadManifest().then(setManifest, () => setFailed(true));
  }, []);

  const selectionKey = TYPES.map((t) => params.get(t.key) || "").join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selection = useMemo(() => readSelection(params, manifest), [selectionKey, manifest]);
  const eyesEntry = useMemo(
    () => (manifest && selection.eyes ? manifest.eyes.find((e) => e.id === selection.eyes) : null),
    [manifest, selection.eyes],
  );

  function apply(next) {
    const p = new URLSearchParams();
    for (const t of TYPES) {
      const id = next[t.key];
      if (id !== DEFAULT[t.key]) p.set(t.key, id ? id.slice(t.key.length + 1) : "none");
    }
    setParams(p, { replace: true });
  }

  function pick(type, id) {
    apply({ ...selection, [type]: id });
  }

  function randomize() {
    const next = {};
    for (const t of TYPES) {
      const options = manifest[t.key].filter((e) => isOwned(t.key, e.id)).map((e) => e.id);
      if (t.none) options.push(null);
      next[t.key] = options[Math.floor(Math.random() * options.length)];
    }
    apply(next);
  }

  if (failed) {
    return (
      <main className="custom-page">
        <h1>Imp Customization</h1>
        <p className="custom-error">The Imp models could not be loaded. Try refreshing the page.</p>
      </main>
    );
  }

  const current = TYPES.find((t) => t.key === tab);
  const options = manifest ? manifest[tab] : [];
  const nameOf = (type, id) => (id ? manifest?.[type].find((e) => e.id === id)?.name : "None");

  return (
    <main className="custom-page">
      <section className="custom-menu" aria-label="Traits">
        <div className="custom-head">
          <h1>Imp Customization</h1>
          <p className="custom-note">Testing mode: every trait is unlocked.</p>
        </div>
        <div className="custom-tabs" role="tablist" aria-label="Trait type">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? "active" : undefined}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="custom-options" role="tabpanel" aria-label={current.label}>
          {current.none ? (
            <button
              type="button"
              className={selection[tab] === null ? "custom-option active" : "custom-option"}
              aria-pressed={selection[tab] === null}
              onClick={() => pick(tab, null)}
            >
              None
            </button>
          ) : null}
          {options.map((opt) => {
            const owned = isOwned(tab, opt.id);
            const active = selection[tab] === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`custom-option${active ? " active" : ""}`}
                aria-pressed={active}
                disabled={!owned}
                title={owned ? opt.name : `${opt.name} (not owned)`}
                onClick={() => pick(tab, opt.id)}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
        <dl className="custom-summary">
          {TYPES.map((t) => (
            <div key={t.key}>
              <dt>{t.label}</dt>
              <dd>{manifest ? nameOf(t.key, selection[t.key]) : "…"}</dd>
            </div>
          ))}
        </dl>
        <div className="custom-actions">
          <button type="button" onClick={randomize} disabled={!manifest}>
            Randomize
          </button>
          <button type="button" onClick={() => apply(DEFAULT)} disabled={!manifest}>
            Reset
          </button>
        </div>
      </section>
      <section className="custom-view" aria-label="3D preview">
        {manifest ? <ImpStage selection={selection} eyesEntry={eyesEntry} onState={setStatus} /> : null}
        {status !== "ready" ? (
          <p className="custom-status">{status === "error" ? "This Imp could not be built." : "Loading Imp…"}</p>
        ) : null}
      </section>
    </main>
  );
}
