import { bioError } from "../src/lib/bio.js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://phlixtsxxuicatmrmdou.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobGl4dHN4eHVpY2F0bXJtZG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzExNTQsImV4cCI6MjEwMzYwNzE1NH0.DMLjjNJir1sHlnlBFIh6FKyOZUkK6a_wL7-8Cf2YlC4";

const PROFILE_COLS = "wallet,username,pfp_id,rank,total_impz,tier_1,tier_2,tier_3,imp_coins,imp_coin_claimed,account_age,bio,updated_at";
const WALLET = /^0x[0-9a-f]{40}$/;

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

function fail(status, error) {
  const err = new Error(error);
  err.status = status;
  return err;
}

async function claimImpCoins(wallet) {
  if (!WALLET.test(wallet)) throw fail(400, "Missing wallet");
  const balances = await supabase(
    `imp_coin_balances?select=portable_imp_coin&wallet_address=eq.${encodeURIComponent(wallet)}`
  );
  const balance = Array.isArray(balances) ? balances[0] : null;
  const portable = Number(balance?.portable_imp_coin) || 0;
  if (!balance || portable <= 0) throw fail(404, "This wallet has no Imp Coins to claim.");

  let profiles = await supabase(
    `profiles?select=imp_coins,imp_coin_claimed&wallet=eq.${encodeURIComponent(wallet)}`
  );
  let profile = Array.isArray(profiles) ? profiles[0] : null;
  if (!profile) {
    await supabase("profiles", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify({
        wallet,
        imp_coins: "0",
        imp_coin_claimed: false,
        updated_at: new Date().toISOString(),
      }),
    });
    profile = { imp_coins: "0", imp_coin_claimed: false };
  }
  if (profile.imp_coin_claimed) throw fail(409, "Imp Coins have already been claimed.");

  const next = (Number(profile.imp_coins) || 0) + portable;
  const rows = await supabase(
    `profiles?wallet=eq.${encodeURIComponent(wallet)}&imp_coin_claimed=eq.false`,
    {
      method: "PATCH",
      body: JSON.stringify({
        imp_coins: String(next),
        imp_coin_claimed: true,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw fail(409, "Imp Coins have already been claimed.");
  return row;
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
        `profiles?select=wallet,username,pfp_id,rank,total_impz,tier_1,tier_2,tier_3,account_age&limit=2000`
      );
      json(res, 200, rows || []);
      return;
    }

    if (req.method === "GET" && url.searchParams.get("coins") === "1") {
      if (!WALLET.test(wallet)) {
        json(res, 400, { error: "Missing wallet" });
        return;
      }
      const [balances, profiles] = await Promise.all([
        supabase(`imp_coin_balances?select=portable_imp_coin&wallet_address=eq.${encodeURIComponent(wallet)}`),
        supabase(`profiles?select=imp_coins,imp_coin_claimed&wallet=eq.${encodeURIComponent(wallet)}`),
      ]);
      const balance = Array.isArray(balances) ? balances[0] : null;
      const profile = Array.isArray(profiles) ? profiles[0] : null;
      json(res, 200, {
        wallet,
        portable_imp_coin: Number(balance?.portable_imp_coin) || 0,
        imp_coins: profile?.imp_coins == null || profile.imp_coins === "" ? "0" : String(profile.imp_coins),
        imp_coin_claimed: Boolean(profile?.imp_coin_claimed),
      });
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
      if (fields.action === "claim-imp-coins") {
        const row = await claimImpCoins(nextWallet);
        json(res, 200, row);
        return;
      }
      const payload = {
        ...fields,
        wallet: nextWallet,
        updated_at: new Date().toISOString(),
      };
      delete payload.action;
      delete payload.imp_coins;
      delete payload.imp_coin_claimed;
      if (Object.prototype.hasOwnProperty.call(fields, "bio")) {
        const problem = bioError(fields.bio);
        if (problem) {
          json(res, 400, { error: problem });
          return;
        }
        payload.bio = String(fields.bio || "").trim().slice(0, 300) || null;
      }
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
