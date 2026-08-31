const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://phlixtsxxuicatmrmdou.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobGl4dHN4eHVpY2F0bXJtZG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzExNTQsImV4cCI6MjEwMzYwNzE1NH0.DMLjjNJir1sHlnlBFIh6FKyOZUkK6a_wL7-8Cf2YlC4";

const PROFILE_COLS = "wallet,username,pfp_id,rank,total_impz,imp_coins,account_age,updated_at";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
    },
    body: options.body,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const message = data?.message || data?.error || text || `Supabase ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, "http://localhost");
    const wallet = String(url.searchParams.get("wallet") || "").toLowerCase();

    if (req.method === "GET" && url.searchParams.get("board") === "1") {
      const rows = await supabase(`profiles?select=wallet,total_impz&limit=2000`);
      json(res, 200, rows || []);
      return;
    }

    if (req.method === "GET" && url.searchParams.get("club") === "1") {
      const rows = await supabase(
        `profiles?select=wallet,username,pfp_id,total_impz,account_age,updated_at&limit=2000`
      );
      json(res, 200, rows || []);
      return;
    }

    if (req.method === "GET") {
      if (!wallet) {
        json(res, 400, { error: "Missing wallet" });
        return;
      }
      const rows = await supabase(
        `profiles?select=${PROFILE_COLS}&wallet=eq.${encodeURIComponent(wallet)}`
      );
      json(res, 200, Array.isArray(rows) ? rows[0] || null : rows);
      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      const raw = await readBody(req);
      const fields = raw ? JSON.parse(raw) : {};
      const nextWallet = String(fields.wallet || wallet).toLowerCase();
      if (!nextWallet) {
        json(res, 400, { error: "Missing wallet" });
        return;
      }
      const payload = {
        ...fields,
        wallet: nextWallet,
        updated_at: new Date().toISOString(),
      };
      const rows = await supabase("profiles", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: JSON.stringify(payload),
      });
      json(res, 200, Array.isArray(rows) ? rows[0] || payload : rows);
      return;
    }

    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    json(res, error.status || 500, { error: error.message || "Profile request failed" });
  }
}
