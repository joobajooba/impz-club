import { useState } from "react";
import ImpImage from "../components/ImpImage.jsx";
import { fetchImpMetadata, IMP_SUPPLY } from "../lib/imps.js";

export default function ImpStats() {
  const [query, setQuery] = useState("");
  const [imp, setImp] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("Loading Imp…");
    try {
      const data = await fetchImpMetadata(query);
      setImp(data);
      setStatus("");
    } catch (err) {
      setImp(null);
      setStatus(err.message || "Could not load that Imp.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="stats">
      <div className="stats-wrap">
        <h2>
          Imp
          <br />
          <span>Stats</span>
        </h2>
        <p>
          Search an Imp ID from the OpenSea Implingz collection to see its image and traits.
        </p>
        <form className="stats-search" onSubmit={search}>
          <input
            type="search"
            inputMode="numeric"
            autoComplete="off"
            placeholder={`Imp ID (1–${IMP_SUPPLY})`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Imp ID"
          />
          <button type="submit" className="fill" disabled={loading}>
            {loading ? "…" : "Search"}
          </button>
        </form>
        {status ? <p className="stats-status">{status}</p> : null}
        {imp ? (
          <section className="stats-result">
            <article className="stats-card">
              <ImpImage tokenId={imp.id} remote={imp.image} alt={imp.name} />
              <strong>{imp.name}</strong>
              <a href={imp.opensea} target="_blank" rel="noopener noreferrer">
                View on OpenSea
              </a>
            </article>
            <div className="stats-traits">
              {imp.traits.length ? (
                imp.traits.map((trait) => (
                  <article className="stats-trait" key={`${trait.type}-${trait.value}`}>
                    <span>{trait.type}</span>
                    <strong>{trait.value}</strong>
                  </article>
                ))
              ) : (
                <p className="stats-status">No traits listed for this Imp.</p>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
