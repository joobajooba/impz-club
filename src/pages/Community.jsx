import { useEffect, useState } from "react";
import ImpImage from "../components/ImpImage.jsx";
import { daysSince, loadClub } from "../lib/db.js";
import { shortAddress } from "../lib/imps.js";

const ZERO = /^0x0+1?$/;

function ageLabel(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "—";
  const days = daysSince(value);
  return days === 1 ? "1 day" : `${days} days`;
}

function memberName(row) {
  const wallet = shortAddress(row.wallet);
  const name = String(row.username || "").trim();
  return name ? `${name}: ${wallet}` : wallet;
}

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "0";
}

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
        if (!cancelled) setError("Could not load the community list.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="club-page">
      <h1>Community List</h1>
      {loading ? <p className="club-status">Loading members…</p> : null}
      {error ? <p className="club-status">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? <p className="club-status">No members yet.</p> : null}
      {!loading && !error && rows.length > 0 ? (
        <div className="club-table-wrap">
          <table className="club-table">
            <thead>
              <tr>
                <th>Profile picture</th>
                <th>Username</th>
                <th>User Level</th>
                <th>Account age</th>
                <th>Total Impz</th>
                <th>Total Tier 1s</th>
                <th>Total Tier 2s</th>
                <th>Total Tier 3s</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.wallet}>
                  <td className="club-pfp">
                    {row.pfp_id ? (
                      <ImpImage tokenId={row.pfp_id} alt="" />
                    ) : (
                      <span className="club-pfp-empty" aria-hidden="true" />
                    )}
                  </td>
                  <td>{memberName(row)}</td>
                  <td>{row.rank == null || row.rank === "" ? "—" : String(row.rank)}</td>
                  <td>{ageLabel(row.account_age)}</td>
                  <td>{count(row.total_impz)}</td>
                  <td>{count(row.tier_1)}</td>
                  <td>{count(row.tier_2)}</td>
                  <td>{count(row.tier_3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
