import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyMessage } from "viem";
import { bioError } from "../src/lib/bio.js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://phlixtsxxuicatmrmdou.supabase.co";
// Server-only secret, set in Vercel. Never give it a VITE_ prefix (Vite ships those to the browser)
// and never write it in this file.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const PROFILE_COLS = "wallet,username,pfp_id,rank,total_impz,tier_1,tier_2,tier_3,imp_coins,imp_coin_claimed,account_age,bio,updated_at";
// The only columns the site may save. Coins and the claim flag change only through a claim.
const EDITABLE_COLS = ["username", "pfp_id", "bio", "total_impz", "rank", "tier_1", "tier_2", "tier_3", "account_age"];
const WALLET = /^0x[0-9a-f]{40}$/;
// Changing these needs a signed-in session for the wallet. The rest are stats the site syncs on load.
const OWNER_COLS = ["username", "pfp_id", "bio"];
// Usernames are unique (supabase/profile_accounts.sql), ignoring capitals and spaces at the ends.
// New names must be 3-24 letters, numbers, spaces, dots, dashes or underscores. Names saved before this
// rule keep working until they are changed.
const USERNAME = /^[A-Za-z0-9 ._-]{3,24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAKEN = "That username is taken. Please pick another.";
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hmac(text) {
  if (!SUPABASE_SERVICE_ROLE_KEY) throw fail(500, "Server is missing SUPABASE_SERVICE_ROLE_KEY");
  const secret = createHmac("sha256", SUPABASE_SERVICE_ROLE_KEY).update("impz-profile-session").digest();
  return createHmac("sha256", secret).update(text).digest("base64url");
}

function sameText(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function challengeMessage(wallet, issued) {
  return [
    "impz.club wants you to sign in to edit your profile.",
    "",
    `Wallet: ${wallet}`,
    `Issued: ${issued}`,
    `Nonce: ${hmac(`challenge|${wallet}|${issued}`)}`,
    "",
    "Signing is free. It does not send a transaction or give access to your funds.",
  ].join("\n");
}

async function signIn(wallet, message, signature) {
  if (!WALLET.test(wallet)) throw fail(400, "Missing wallet");
  const issued = /^Issued: (.+)$/m.exec(String(message || ""))?.[1] || "";
  const age = Date.now() - Date.parse(issued);
  if (!(age >= 0 && age < CHALLENGE_TTL_MS) || message !== challengeMessage(wallet, issued)) {
    throw fail(401, "Sign-in message expired. Please try again.");
  }
  const ok = await verifyMessage({ address: wallet, message, signature }).catch(() => false);
  if (!ok) throw fail(401, "Signature does not match this wallet.");
  const body = Buffer.from(JSON.stringify({ w: wallet, exp: Date.now() + SESSION_TTL_MS })).toString("base64url");
  return `${body}.${hmac(`session|${body}`)}`;
}

function sessionWallet(req) {
  const token = String(req.headers?.["x-impz-session"] || "");
  const [body, sig] = token.split(".");
  if (!body || !sig || !sameText(sig, hmac(`session|${body}`))) return "";
  try {
    const { w, exp } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return exp > Date.now() && WALLET.test(w) ? w : "";
  } catch {
    return "";
  }
}

function usernameError(name) {
  if (!USERNAME.test(name)) return "Usernames are 3 to 24 letters, numbers, spaces, dots, dashes or underscores.";
  return "";
}

// An exact, case-blind match with PostgREST's ilike. Only valid usernames get here, so "_" is the one
// wildcard they can hold (no % or *): it is escaped with a backslash.
function likeExact(text) {
  return encodeURIComponent(String(text).replace(/_/g, "\\_"));
}

async function usernameTaken(name, wallet) {
  const rows = await supabase(
    `profiles?select=wallet&username=ilike.${likeExact(name)}&wallet=neq.${encodeURIComponent(wallet)}&limit=1`
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function loadEmail(wallet) {
  const rows = await supabase(`profile_private?select=email&wallet=eq.${encodeURIComponent(wallet)}`);
  return (Array.isArray(rows) ? rows[0]?.email : null) || "";
}

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
  if (!SUPABASE_SERVICE_ROLE_KEY) throw fail(500, "Server is missing SUPABASE_SERVICE_ROLE_KEY");
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: options.prefer || "return=representation",
  };
  // Legacy keys are JWTs and also go in Authorization. Newer sb_secret_ keys only go in apikey.
  if (SUPABASE_SERVICE_ROLE_KEY.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers,
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
  // The secret key skips row-level security, which used to refuse wallets with nothing to claim.
  const balances = await supabase(
    `imp_coin_balances?select=portable_imp_coin&wallet_address=eq.${encodeURIComponent(wallet)}`
  );
  const balance = Array.isArray(balances) ? balances[0] : null;
  if (!(Number(balance?.portable_imp_coin) > 0)) throw fail(404, "This wallet has no Imp Coins to claim.");
  try {
    await supabase("imp_coin_claims", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({ wallet_address: wallet }),
    });
  } catch (error) {
    const message = String(error.message || "");
    if (error.status === 409 || /duplicate key|already been claimed|unique constraint/i.test(message)) {
      throw fail(409, "Imp Coins have already been claimed.");
    }
    if (/no Imp Coins|foreign key|row-level security/i.test(message)) {
      throw fail(404, "This wallet has no Imp Coins to claim.");
    }
    throw error;
  }
  const rows = await supabase(
    `profiles?select=${PROFILE_COLS}&wallet=eq.${encodeURIComponent(wallet)}`
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.imp_coin_claimed) throw fail(409, "Imp Coins have already been claimed.");
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

    if (req.method === "GET" && url.searchParams.get("challenge") === "1") {
      if (!WALLET.test(wallet)) {
        json(res, 400, { error: "Missing wallet" });
        return;
      }
      json(res, 200, { message: challengeMessage(wallet, new Date().toISOString()) });
      return;
    }

    if (req.method === "GET" && url.searchParams.has("username_free")) {
      const name = String(url.searchParams.get("username_free") || "").trim();
      const problem = usernameError(name);
      json(res, 200, { free: !problem && !(await usernameTaken(name, wallet)), error: problem || undefined });
      return;
    }

    // The signed-in wallet's own account, with its private email (the game's Profile menu).
    if (req.method === "GET" && url.searchParams.get("me") === "1") {
      if (!WALLET.test(wallet) || sessionWallet(req) !== wallet) {
        json(res, 401, { error: "Sign in with your wallet to see your account.", needsSignature: true });
        return;
      }
      const [rows, email] = await Promise.all([
        supabase(`profiles?select=${PROFILE_COLS}&wallet=eq.${encodeURIComponent(wallet)}`),
        loadEmail(wallet),
      ]);
      const row = Array.isArray(rows) ? rows[0] || null : null;
      json(res, 200, { wallet, profile: row, email });
      return;
    }

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
      if (fields.action === "sign-in") {
        const session = await signIn(nextWallet, fields.message, fields.signature);
        json(res, 200, { session });
        return;
      }
      if (!WALLET.test(nextWallet)) {
        json(res, 400, { error: "Missing wallet" });
        return;
      }
      const has = (col) => Object.prototype.hasOwnProperty.call(fields, col);
      const signedIn = sessionWallet(req) === nextWallet;
      // The email is private: only the wallet's own signed-in session can set it.
      if (has("email")) {
        if (!signedIn) {
          json(res, 401, { error: "Sign in with your wallet to change your email.", needsSignature: true });
          return;
        }
        const email = String(fields.email || "").trim().toLowerCase();
        if (email && (email.length > 254 || !EMAIL.test(email))) {
          json(res, 400, { error: "That email address doesn't look right." });
          return;
        }
      }
      const norm = (value) => String(value ?? "").trim();
      const owned = OWNER_COLS.filter(has);
      if (owned.length) {
        // Re-sending the stored value (the page's sync on load) needs no signature. Changing it does.
        const rows = await supabase(`profiles?select=${OWNER_COLS.join(",")}&wallet=eq.${encodeURIComponent(nextWallet)}`);
        const current = (Array.isArray(rows) ? rows[0] : null) || {};
        if (!signedIn && owned.some((col) => norm(fields[col]) !== norm(current[col]))) {
          json(res, 401, { error: "Sign in with your wallet to change your profile.", needsSignature: true });
          return;
        }
        if (has("username") && norm(fields.username) !== norm(current.username)) {
          const name = norm(fields.username);
          if (name) {
            const problem = usernameError(name);
            if (problem) {
              json(res, 400, { error: problem });
              return;
            }
            if (await usernameTaken(name, nextWallet)) {
              json(res, 409, { error: TAKEN });
              return;
            }
          }
        }
      }
      if (has("email")) {
        const email = String(fields.email || "").trim().toLowerCase();
        await supabase("profile_private", {
          method: "POST",
          prefer: "resolution=merge-duplicates,return=minimal",
          body: JSON.stringify({ wallet: nextWallet, email: email || null, updated_at: new Date().toISOString() }),
        });
      }
      const payload = { wallet: nextWallet, updated_at: new Date().toISOString() };
      for (const col of EDITABLE_COLS) {
        if (has(col)) payload[col] = fields[col];
      }
      if (has("username")) payload.username = norm(fields.username).slice(0, 24);
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
    // Two players saving the same new name at once: the unique index stops the second.
    if (/profiles_username_unique/.test(String(error.message || ""))) {
      json(res, 409, { error: TAKEN });
      return;
    }
    json(res, error.status || 500, { error: error.message || "Profile request failed" });
  }
}
