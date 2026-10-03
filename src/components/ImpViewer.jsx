import { useState } from "react";
import "@google/model-viewer";

const AVATARS = [
  { id: 0, label: "Imp 0" },
  { id: 1, label: "Imp 1" },
];

const SITE = "https://www.impz.club";

export default function ImpViewer() {
  const [id, setId] = useState(0);
  const glb = `${SITE}/avatars/${id}.glb`;
  const mml = `${SITE}/avatars/${id}.mml`;

  return (
    <main className="viewer-page">
      <h1>Imp Viewer</h1>
      <div className="viewer-switch" role="tablist" aria-label="Choose an Imp">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            role="tab"
            aria-selected={id === avatar.id}
            className={id === avatar.id ? "active" : undefined}
            onClick={() => setId(avatar.id)}
          >
            {avatar.label}
          </button>
        ))}
      </div>
      <div className="viewer-files">
        <a href={glb}>{glb}</a>
        <a href={mml}>{mml}</a>
      </div>
      <div className="viewer-stage">
        <model-viewer
          key={id}
          src={`/avatars/${id}.glb`}
          alt={`Imp ${id}`}
          camera-controls=""
          auto-rotate=""
          shadow-intensity="1"
          exposure="1"
        />
      </div>
    </main>
  );
}
