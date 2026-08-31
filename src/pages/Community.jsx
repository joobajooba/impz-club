import { useEffect, useState } from "react";
import ImpImage from "../components/ImpImage.jsx";
import { daysSince, joinedAtFromProfile, loadClub } from "../lib/db.js";
import { shortAddress } from "../lib/imps.js";

const ZERO = /^0x0+1?$/;

export default function Community() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    loadClub()
      .then((data) => {
        if (cancelled) return;
        const members = (data || [])
          .filter((row) => row?.wallet && !ZERO.test(String(row.wallet)))
          .sort((a, b) => (Number(b.total_impz) || 0) - (Number(a.total_impz) || 0));
        setRows(members);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load club members.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="club">
      <div className="club-wrap">
        <h2>Club</h2>
        {loading ? <p className="club-status">Loading members…</p> : null}
        {error ? <p className="club-status club-error">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="club-status">No members yet. Connect a wallet on Account to join.</p>
        ) : null}
        {!loading && !error && rows.length > 0 ? (
          <div className="club-table-wrap">
            <table className="club-table">
              <thead>
                <tr>
                  <th>Profile picture</th>
                  <th>Username</th>
                  <th>Wallet address</th>
                  <th>Account age</th>
                  <th>Total Impz</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.wallet}>
                    <td className="club-pfp">
                      {row.pfp_id ? (
                        <ImpImage tokenId={row.pfp_id} alt={row.username || "Imp"} />
                      ) : (
                        <span className="club-pfp-empty" aria-hidden="true" />
                      )}
                    </td>
                    <td>{row.username || "—"}</td>
                    <td title={row.wallet}>{shortAddress(row.wallet)}</td>
                    <td>{daysSince(joinedAtFromProfile(row))} days</td>
                    <td>{row.total_impz || "0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </main>
  );
}
