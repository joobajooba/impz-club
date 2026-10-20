import { signMessage } from "wagmi/actions";
import { wagmiAdapter } from "../reown.js";

export function walletId(address) {
  return String(address || "").toLowerCase();
}

async function profileRequest(path, options = {}, attempt = 0) {
  try {
    const res = await fetch(`/api/profile${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const error = new Error(data?.error || `Profile request failed (${res.status})`);
      error.status = res.status;
      error.needsSignature = Boolean(data?.needsSignature);
      throw error;
    }
    return data;
  } catch (error) {
    if (attempt >= 2 || error.status === 401) throw error;
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    return profileRequest(path, options, attempt + 1);
  }
}

export async function loadProfile(address) {
  return profileRequest(`?wallet=${encodeURIComponent(walletId(address))}`);
}

export async function loadLeaderboard() {
  return (await profileRequest("?board=1")) || [];
}

export async function loadClub() {
  return (await profileRequest("?club=1")) || [];
}

export async function loadImpCoins(address) {
  return profileRequest(`?coins=1&wallet=${encodeURIComponent(walletId(address))}`);
}

export async function claimImpCoins(address) {
  return profileRequest("", {
    method: "POST",
    body: JSON.stringify({
      wallet: walletId(address),
      action: "claim-imp-coins",
    }),
  });
}

const OWNER_FIELDS = ["username", "pfp_id", "bio"];
const sessionKey = (wallet) => `impz-session:${wallet}`;

function readSession(wallet) {
  try {
    return localStorage.getItem(sessionKey(wallet)) || "";
  } catch {
    return "";
  }
}

// Asks the wallet to sign a free message once; the server answers with a 7-day session.
async function signInProfile(wallet) {
  const { message } = await profileRequest(`?challenge=1&wallet=${encodeURIComponent(wallet)}`);
  const signature = await signMessage(wagmiAdapter.wagmiConfig, { message });
  const { session } = await profileRequest("", {
    method: "POST",
    body: JSON.stringify({ wallet, action: "sign-in", message, signature }),
  });
  try {
    localStorage.setItem(sessionKey(wallet), session);
  } catch {}
  return session;
}

function postProfile(wallet, fields, session) {
  return profileRequest("", {
    method: "POST",
    headers: session ? { "x-impz-session": session } : {},
    body: JSON.stringify({ wallet, ...fields }),
  });
}

// Changing username, picture or bio needs a wallet signature. Pass { sign: false } for
// background syncs: they never prompt, and save only the other fields if a signature is needed.
export async function saveProfile(address, fields, { sign = true } = {}) {
  const wallet = walletId(address);
  try {
    return await postProfile(wallet, fields, readSession(wallet));
  } catch (error) {
    if (!error.needsSignature) throw error;
    if (!sign) {
      const rest = { ...fields };
      for (const key of OWNER_FIELDS) delete rest[key];
      return postProfile(wallet, rest, "");
    }
    return postProfile(wallet, fields, await signInProfile(wallet));
  }
}

export function rankFromLeaderboard(address, totalImpz, rows) {
  const wallet = walletId(address);
  const scores = (rows || []).map((row) => ({
    wallet: walletId(row.wallet),
    total: Number(row.total_impz) || 0,
  }));
  const existing = scores.find((row) => row.wallet === wallet);
  if (existing) existing.total = Number(totalImpz) || 0;
  else scores.push({ wallet, total: Number(totalImpz) || 0 });
  scores.sort((a, b) => b.total - a.total || a.wallet.localeCompare(b.wallet));
  const index = scores.findIndex((row) => row.wallet === wallet);
  return index >= 0 ? String(index + 1) : "—";
}

export function joinedAtFromProfile(row) {
  if (row?.account_age && !Number.isNaN(Date.parse(row.account_age))) {
    return new Date(row.account_age);
  }
  if (row?.updated_at) return new Date(row.updated_at);
  return new Date();
}

export function daysSince(date) {
  const start = date instanceof Date ? date : new Date(date);
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
}
