import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildImp, disposeImp, loadManifest } from "../lib/impRig.js";
import { shortAddress } from "../lib/imps.js";
import { deleteSavedImp, loadBuilder, saveImp, signError } from "../lib/savedImps.js";

const TYPES = [
  { key: "body", label: "Body", none: false },
  { key: "head", label: "Head", none: true },
  { key: "eyes", label: "Eyes", none: true },
  { key: "clothing", label: "Clothing", none: true },
  { key: "back", label: "Back", none: true },
];
const DEFAULT = { body: "body_green", head: null, eyes: null, clothing: null, back: null };

const TABS = [...TYPES, { key: "saved", label: "Saved" }];

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

// The look of one owned Imp: for each slot, the trait whose list of Impz includes it.
function lookOf(impId, traits) {
  const look = { ...DEFAULT };
  for (const t of TYPES) {
    const hit = Object.entries(traits?.[t.key] || {}).find(([, ids]) => ids.includes(impId));
    look[t.key] = hit ? hit[0] : t.none ? null : DEFAULT[t.key];
  }
  return look;
}

// The selection in the URL, keeping only traits the wallet owns; anything else comes from `fallback`.
function readSelection(params, manifest, owns, fallback) {
  const sel = { ...fallback };
  if (!manifest) return sel;
  for (const t of TYPES) {
    const v = params.get(t.key);
    if (v === "none" && t.none) sel[t.key] = null;
    else if (v && owns(t.key, `${t.key}_${v}`)) sel[t.key] = `${t.key}_${v}`;
  }
  return sel;
}

function SavedList({ saved, manifest, owns, busy, onLoad, onDelete }) {
  if (!saved.length) return <p className="custom-empty">No saved Impz yet. Build one and press Save.</p>;
  const nameOf = (type, id) => manifest?.[type].find((e) => e.id === id)?.name || id;
  return (
    <ul className="custom-saved">
      {saved.map((imp) => {
        const lost = TYPES.some((t) => imp[t.key] && !owns(t.key, imp[t.key]));
        return (
          <li key={imp.id}>
            <div>
              <strong>{imp.name}</strong>
              <span>
                {TYPES.map((t) => (imp[t.key] ? nameOf(t.key, imp[t.key]) : null))
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {lost ? <em>Uses a trait from an Imp no longer in this wallet</em> : null}
            </div>
            <button type="button" onClick={() => onLoad(imp)} disabled={busy || lost}>
              Load
            </button>
            <button type="button" onClick={() => onDelete(imp)} disabled={busy}>
              Delete
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function ImpCustomization() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [manifest, setManifest] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState("body");
  const [status, setStatus] = useState("loading");
  const [params, setParams] = useSearchParams();
  // What the connected wallet owns, from /api/imps (read from the Imp contract on the server).
  const [wallet, setWallet] = useState({ state: "none" });
  const [name, setName] = useState("");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    loadManifest().then(setManifest, () => setFailed(true));
  }, []);

  useEffect(() => {
    setNotice(null);
    if (!isConnected || !address) {
      setWallet({ state: "none" });
      return undefined;
    }
    let cancelled = false;
    setWallet({ state: "loading" });
    loadBuilder(address)
      .then((data) => !cancelled && setWallet({ state: "ready", ...data }))
      .catch((error) => !cancelled && setWallet({ state: "error", error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  const ready = wallet.state === "ready";
  const traits = ready ? wallet.traits : null;
  const owns = useCallback((type, id) => Boolean(traits?.[type]?.[id]), [traits]);
  const firstImp = ready && wallet.imps.length ? wallet.imps[0] : null;
  const fallback = useMemo(() => (firstImp ? lookOf(firstImp, traits) : DEFAULT), [firstImp, traits]);

  const selectionKey = TYPES.map((t) => params.get(t.key) || "").join("|");
  const selection = useMemo(
    () => readSelection(params, manifest, owns, fallback),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectionKey, manifest, owns, fallback],
  );
  const eyesEntry = useMemo(
    () => (manifest && selection.eyes ? manifest.eyes.find((e) => e.id === selection.eyes) : null),
    [manifest, selection.eyes],
  );
  const canBuild = Boolean(firstImp);

  function apply(next) {
    const p = new URLSearchParams();
    for (const t of TYPES) {
      const id = next[t.key];
      if (id !== fallback[t.key]) p.set(t.key, id ? id.slice(t.key.length + 1) : "none");
    }
    setParams(p, { replace: true });
  }

  function pick(type, id) {
    setNotice(null);
    apply({ ...selection, [type]: id });
  }

  function randomize() {
    const next = {};
    for (const t of TYPES) {
      const options = manifest[t.key].filter((e) => owns(t.key, e.id)).map((e) => e.id);
      if (t.none) options.push(null);
      next[t.key] = options[Math.floor(Math.random() * options.length)];
    }
    apply(next);
  }

  async function save(event) {
    event.preventDefault();
    if (!canBuild || saving) return;
    setNotice(null);
    setSaving("check");
    try {
      const row = await saveImp(address, name, selection, setSaving);
      setWallet((w) => ({ ...w, saved: [row, ...(w.saved || [])], savedError: "" }));
      setName("");
      setNotice({ ok: true, text: `Saved "${row.name}" to your account.` });
    } catch (error) {
      setNotice({ ok: false, text: signError(error) });
    } finally {
      setSaving("");
    }
  }

  async function remove(imp) {
    if (saving || !window.confirm(`Delete "${imp.name}"? Your wallet will ask you to sign.`)) return;
    setNotice(null);
    setSaving("delete");
    try {
      await deleteSavedImp(address, imp.id);
      setWallet((w) => ({ ...w, saved: w.saved.filter((s) => s.id !== imp.id) }));
      setNotice({ ok: true, text: `Deleted "${imp.name}".` });
    } catch (error) {
      setNotice({ ok: false, text: signError(error) });
    } finally {
      setSaving("");
    }
  }

  function load(imp) {
    apply(Object.fromEntries(TYPES.map((t) => [t.key, imp[t.key] || null])));
    setTab("body");
    setNotice({ ok: true, text: `Loaded "${imp.name}".` });
  }

  if (failed) {
    return (
      <main className="custom-page">
        <h1>Imp Customization</h1>
        <p className="custom-error">The Imp models could not be loaded. Try refreshing the page.</p>
      </main>
    );
  }

  const current = TABS.find((t) => t.key === tab);
  const options = manifest && tab !== "saved" ? manifest[tab] : [];
  const nameOf = (type, id) => (id ? manifest?.[type].find((e) => e.id === id)?.name : "None");
  const from = (type, id) => traits?.[type]?.[id] || [];

  let gate = null;
  if (!isConnected) {
    gate = (
      <div className="custom-gate">
        <p>Connect your wallet to build an Imp. You can use the traits of every Imp you hold.</p>
        <button type="button" onClick={() => open()}>
          Connect Wallet
        </button>
      </div>
    );
  } else if (wallet.state === "loading" || wallet.state === "none") {
    gate = <p className="custom-gate">Checking the Impz in your wallet…</p>;
  } else if (wallet.state === "error") {
    gate = <p className="custom-gate">Could not check your wallet: {wallet.error}</p>;
  } else if (!canBuild) {
    gate = (
      <div className="custom-gate">
        <p>This wallet holds no Impz, so there are no traits to build with.</p>
        <a href="https://opensea.io/collection/implingz" target="_blank" rel="noreferrer">
          Find an Imp on OpenSea
        </a>
      </div>
    );
  }

  return (
    <main className="custom-page">
      <section className="custom-menu" aria-label="Traits">
        <div className="custom-head">
          <h1>Imp Customization</h1>
          <p className="custom-note">
            {canBuild
              ? `${shortAddress(address)} · ${wallet.imps.length} Imp${wallet.imps.length === 1 ? "" : "z"} · only traits you own are unlocked`
              : "Build an Imp from the traits in your wallet."}
          </p>
        </div>
        {gate || (
          <>
            <div className="custom-tabs" role="tablist" aria-label="Trait type">
              {TABS.map((t) => (
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
            {tab === "saved" ? (
              <div className="custom-options custom-options-list" role="tabpanel" aria-label="Saved Impz">
                {wallet.savedError ? <p className="custom-empty">{wallet.savedError}</p> : null}
                <SavedList
                  saved={wallet.saved || []}
                  manifest={manifest}
                  owns={owns}
                  busy={Boolean(saving)}
                  onLoad={load}
                  onDelete={remove}
                />
              </div>
            ) : (
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
                  const ids = from(tab, opt.id);
                  const active = selection[tab] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`custom-option${active ? " active" : ""}`}
                      aria-pressed={active}
                      disabled={!ids.length}
                      title={ids.length ? `${opt.name}: from Imp #${ids.join(", #")}` : `${opt.name}: none of your Impz have it`}
                      onClick={() => pick(tab, opt.id)}
                    >
                      {opt.name}
                      {ids.length ? <small>Imp #{ids[0]}{ids.length > 1 ? ` +${ids.length - 1}` : ""}</small> : null}
                    </button>
                  );
                })}
              </div>
            )}
            <dl className="custom-summary">
              {TYPES.map((t) => (
                <div key={t.key}>
                  <dt>{t.label}</dt>
                  <dd>{manifest ? nameOf(t.key, selection[t.key]) : "…"}</dd>
                </div>
              ))}
            </dl>
            <div className="custom-actions custom-actions-3">
              <label className="custom-start">
                <span className="sr-only">Start from one of your Impz</span>
                <select
                  value=""
                  onChange={(e) => e.target.value && apply(lookOf(Number(e.target.value), traits))}
                  disabled={!manifest}
                >
                  <option value="">My Impz…</option>
                  {wallet.imps.map((id) => (
                    <option key={id} value={id}>
                      Imp #{id}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={randomize} disabled={!manifest}>
                Randomize
              </button>
              <button type="button" onClick={() => apply(fallback)} disabled={!manifest}>
                Reset
              </button>
            </div>
            <form className="custom-save" onSubmit={save}>
              <input
                type="text"
                value={name}
                maxLength={32}
                placeholder="Name your Imp"
                aria-label="Imp name"
                onChange={(e) => setName(e.target.value)}
                disabled={Boolean(saving)}
              />
              <button type="submit" disabled={!manifest || Boolean(saving) || !name.trim()}>
                {saving === "sign"
                  ? "Sign in wallet…"
                  : saving === "check" || saving === "save"
                    ? "Saving…"
                    : "Save Imp"}
              </button>
            </form>
            {notice ? (
              <p className={notice.ok ? "custom-notice" : "custom-notice bad"} role="status">
                {notice.text}
              </p>
            ) : (
              <p className="custom-fine">Saving asks your wallet to sign a free message proving you own these traits.</p>
            )}
          </>
        )}
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
