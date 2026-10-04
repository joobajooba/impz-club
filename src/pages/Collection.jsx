import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IMPS, LOCAL_IMAGES, TRAIT_NAMES, TRAIT_OPTIONS } from "../data/collection.js";
import { pinataImpSrc } from "../lib/imps.js";

const FILTERS = ["Tier", "Body", "Head", "Eyes", "Clothing", "Back", "Background"].filter(
  (name) => TRAIT_OPTIONS[name].length > 1
);
const INDEX = Object.fromEntries(TRAIT_NAMES.map((name, index) => [name, index]));
const PAGE = 48;

function impSrc(id) {
  return LOCAL_IMAGES[id - 1] === "1" ? `/collection/${id}.png` : pinataImpSrc(id);
}

function matches(row, id, digits, picked, skipType) {
  if (digits && !String(id).includes(digits)) return false;
  for (const type of FILTERS) {
    if (type === skipType) continue;
    const chosen = picked[type];
    if (chosen?.length && !chosen.includes(row[INDEX[type]])) return false;
  }
  return true;
}

export default function Collection() {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState({});
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState(0);
  const digits = query.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const active = Boolean(digits) || FILTERS.some((type) => picked[type]?.length);

  const { ids, counts } = useMemo(() => {
    const nextIds = [];
    const nextCounts = {};
    for (const type of FILTERS) {
      nextCounts[type] = Object.fromEntries(TRAIT_OPTIONS[type].map((value) => [value, 0]));
    }
    IMPS.forEach((row, index) => {
      const id = index + 1;
      if (matches(row, id, digits, picked)) nextIds.push(id);
      for (const type of FILTERS) {
        if (!matches(row, id, digits, picked, type)) continue;
        nextCounts[type][row[INDEX[type]]] += 1;
      }
    });
    return { ids: nextIds, counts: nextCounts };
  }, [digits, picked]);

  useEffect(() => {
    setShown(PAGE);
  }, [digits, picked]);

  useEffect(() => {
    if (!selected) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setSelected(0);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  function toggle(type, value) {
    setPicked((current) => {
      const chosen = new Set(current[type] || []);
      if (chosen.has(value)) chosen.delete(value);
      else chosen.add(value);
      return { ...current, [type]: [...chosen] };
    });
  }

  function clearFilters() {
    setQuery("");
    setPicked({});
  }

  const visible = ids.slice(0, shown);
  const selectedRow = selected ? IMPS[selected - 1] : null;

  return (
    <main className="browse">
      <aside className="browse-filters">
        <label className="browse-search">
          Imp ID
          <input
            type="search"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Search Imp ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {FILTERS.map((type) => (
          <details key={type} open={type === "Tier"}>
            <summary>{type}</summary>
            <div>
              {TRAIT_OPTIONS[type].map((value) => {
                const count = counts[type][value] || 0;
                const checked = Boolean(picked[type]?.includes(value));
                return (
                  <label className="browse-option" key={value}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && count === 0}
                      onChange={() => toggle(type, value)}
                    />
                    <span>{value}</span>
                    <span>{count.toLocaleString("en-US")}</span>
                  </label>
                );
              })}
            </div>
          </details>
        ))}
        {active ? (
          <button type="button" className="browse-clear" onClick={clearFilters}>
            Clear
          </button>
        ) : null}
      </aside>
      <section
        className="browse-results"
        onScroll={(event) => {
          const el = event.currentTarget;
          if (shown < ids.length && el.scrollTop + el.clientHeight > el.scrollHeight - 280) {
            setShown((count) => Math.min(count + PAGE, ids.length));
          }
        }}
      >
        <div className="browse-toolbar">
          <h1>Collection</h1>
          <p>{ids.length.toLocaleString("en-US")} Impz</p>
        </div>
        {ids.length === 0 ? <p className="browse-empty">No Impz match these filters.</p> : null}
        <div className="browse-grid">
          {visible.map((id) => (
            <button type="button" className="browse-card" key={id} onClick={() => setSelected(id)}>
              <img src={impSrc(id)} alt="" loading="lazy" />
              <span>#{id}</span>
            </button>
          ))}
        </div>
        {shown < ids.length ? (
          <button type="button" className="browse-more" onClick={() => setShown((count) => Math.min(count + PAGE, ids.length))}>
            Load more
          </button>
        ) : null}
      </section>
      {selectedRow
        ? createPortal(
            <div className="browse-pop">
              <button type="button" className="browse-pop-scrim" aria-label="Close Imp" onClick={() => setSelected(0)} />
              <article className="browse-detail" role="dialog" aria-modal="true" aria-label={`Imp ${selected}`}>
                <img src={impSrc(selected)} alt="" />
                <div>
                  <h2>IMPLINGZ #{selected}</h2>
                  <button type="button" className="browse-close" aria-label="Close Imp" onClick={() => setSelected(0)}>
                    ×
                  </button>
                  <dl>
                    {TRAIT_NAMES.map((type) => (
                      <div key={type}>
                        <dt>{type}</dt>
                        <dd>{selectedRow[INDEX[type]]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            </div>,
            document.body
          )
        : null}
    </main>
  );
}
