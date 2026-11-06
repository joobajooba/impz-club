// Imp builder: which traits a wallet may use, and saving signed builds to the wallet's account.
//
// Ownership is always read from the Imp contract on Robinhood Chain (never from the browser), and the
// traits each Imp has come from api/metadata/traits.json (the collection metadata). A build can only
// use traits from Impz the wallet owns right now, and saving it needs a wallet signature over a message
// that lists the build and the Impz its traits come from. The message and signature are stored with it.
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, defineChain, http } from "viem";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://phlixtsxxuicatmrmdou.supabase.co";
// Server-only secret, set in Vercel. Never give it a VITE_ prefix and never write it in this file.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const IMP_CONTRACT = "0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029";
const IMP_SUPPLY = 2222;
const WALLET = /^0x[0-9a-f]{40}$/;
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_SAVED = 100;
const NAME = /^[\p{L}\p{N} _.,'!?#&()-]{1,32}$/u;

// Order of the values in traits.json: Background, Body, Head, Back, Clothing, Eyes, Tier.
export const SLOTS = [
  { key: "body", label: "Body", column: 1, none: false },
  { key: "head", label: "Head", column: 2, none: true },
  { key: "eyes", label: "Eyes", column: 5, none: true },
  { key: "clothing", label: "Clothing", column: 4, none: true },
  { key: "back", label: "Back", column: 3, none: true },
];

const TRAITS = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "metadata", "traits.json"), "utf8"),
);

// "Bug-Eye" -> eyes_bug_eye, the ids of public/impz/manifest.json.
export function traitId(slot, value) {
  if (!value || value === "None") return null;
  return `${slot}_${String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

const TRAIT_NAMES = {};
for (const row of TRAITS) {
  for (const s of SLOTS) {
    const id = traitId(s.key, row[s.column]);
    if (id) TRAIT_NAMES[id] = row[s.column];
  }
}

const chain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
});
const client = createPublicClient({ chain, transport: http() });
const ownerOfAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
];

function fail(status, error, extra = {}) {
  const err = new Error(error);
  err.status = status;
  Object.assign(err, extra);
  return err;
}

// Every Imp id the wallet owns, read from the contract (ownerOf for all 2222, in a few multicalls).
async function ownedImpIds(wallet) {
  const ids = [];
  const chunk = 500;
  for (let start = 1; start <= IMP_SUPPLY; start += chunk) {
    const contracts = [];
    for (let id = start; id < start + chunk && id <= IMP_SUPPLY; id += 1) {
      contracts.push({ address: IMP_CONTRACT, abi: ownerOfAbi, functionName: "ownerOf", args: [BigInt(id)] });
    }
    let results;
    try {
      results = await client.multicall({ contracts, allowFailure: true });
    } catch {
      throw fail(503, "Could not read the Imp contract. Please try again.");
    }
    results.forEach((r, i) => {
      if (r.status === "success" && String(r.result).toLowerCase() === wallet) ids.push(start + i);
    });
  }
  return ids;
}

// The traits those Impz give: { body: { body_green: [12, 40] }, head: {...}, ... }.
export function traitsOf(impIds) {
  const traits = Object.fromEntries(SLOTS.map((s) => [s.key, {}]));
  for (const id of impIds) {
    const row = TRAITS[id - 1];
    if (!row) continue;
    for (const s of SLOTS) {
      const t = traitId(s.key, row[s.column]);
      if (t) (traits[s.key][t] ||= []).push(id);
    }
  }
  return traits;
}

// Checks a build against the owned traits; returns it cleaned, with the Imp each trait comes from.
export function checkBuild(raw, traits) {
  const build = {};
  const sources = {};
  for (const s of SLOTS) {
    const value = raw?.[s.key] ?? null;
    if (value === null || value === "") {
      if (!s.none) throw fail(400, `Pick a ${s.label.toLowerCase()}.`);
      build[s.key] = null;
      continue;
    }
    const from = traits[s.key][value];
    if (!from) {
      const name = TRAIT_NAMES[value] || value;
      throw fail(403, `You don't own an Imp with the ${s.label} trait "${name}".`);
    }
    build[s.key] = value;
    sources[s.key] = from[0];
  }
  return { build, sources };
}

export function cleanName(raw) {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!NAME.test(name)) throw fail(400, "Give your Imp a name: up to 32 letters, numbers or spaces.");
  return name;
}

function hmac(text) {
  if (!SUPABASE_SERVICE_ROLE_KEY) throw fail(500, "Server is missing SUPABASE_SERVICE_ROLE_KEY");
  const secret = createHmac("sha256", SUPABASE_SERVICE_ROLE_KEY).update("impz-saved-imps").digest();
  return createHmac("sha256", secret).update(text).digest("base64url");
}

function traitLine(s, build, sources) {
  const id = build[s.key];
  return `${s.label}: ${id ? `${TRAIT_NAMES[id]} (from Imp #${sources[s.key]})` : "None"}`;
}

export function saveMessage(wallet, name, build, sources, issued, sign = hmac) {
  const body = SLOTS.map((s) => traitLine(s, build, sources));
  return [
    "impz.club: save this Imp to your account.",
    "",
    `Wallet: ${wallet}`,
    `Imp name: ${name}`,
    ...body,
    `Issued: ${issued}`,
    `Nonce: ${sign(`save|${wallet}|${issued}|${name}|${body.join("|")}`)}`,
    "",
    "By signing you confirm this wallet owns the Impz these traits come from.",
    "Signing is free. It does not send a transaction or give access to your funds.",
  ].join("\n");
}

export function deleteMessage(wallet, id, name, issued, sign = hmac) {
  return [
    "impz.club: delete a saved Imp from your account.",
    "",
    `Wallet: ${wallet}`,
    `Saved Imp: #${id} ${name}`,
    `Issued: ${issued}`,
    `Nonce: ${sign(`delete|${wallet}|${issued}|${id}`)}`,
    "",
    "Signing is free. It does not send a transaction or give access to your funds.",
  ].join("\n");
}

function issuedOf(message) {
  const issued = /^Issued: (.+)$/m.exec(String(message || ""))?.[1] || "";
  const age = Date.now() - Date.parse(issued);
  if (!(age >= 0 && age < CHALLENGE_TTL_MS)) throw fail(401, "The signing request expired. Please try again.");
  return issued;
}

async function checkSignature(wallet, message, signature) {
  // The chain client also accepts smart-contract wallets (ERC-1271), not only plain keys.
  const ok = await client.verifyMessage({ address: wallet, message, signature }).catch(() => false);
  if (!ok) throw fail(401, "The signature does not match this wallet.");
}

async function supabase(path, options = {}) {
  if (!SUPABASE_SERVICE_ROLE_KEY) throw fail(500, "Server is missing SUPABASE_SERVICE_ROLE_KEY");
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: options.prefer || "return=representation",
  };
  if (SUPABASE_SERVICE_ROLE_KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
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
    const message = String(data?.message || data?.error || text || `Supabase ${res.status}`);
    if (/saved_imps/.test(message) && /does not exist|could not find/i.test(message)) {
      throw fail(503, "Saving Impz is not switched on yet (the saved_imps table is missing).");
    }
    if (res.status === 409 || /duplicate key|unique constraint/i.test(message)) {
      throw fail(409, "This signature was already used. Please save again.");
    }
    throw fail(res.status >= 500 ? 502 : res.status, message);
  }
  return data;
}

const SAVED_COLS = "id,name,body,head,eyes,clothing,back,source_imps,created_at";

function listSaved(wallet) {
  return supabase(`saved_imps?select=${SAVED_COLS}&wallet=eq.${wallet}&order=created_at.desc&limit=${MAX_SAVED}`);
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(fail(400, "Bad request"));
      }
    });
    req.on("error", reject);
  });
}

function buildFrom(source) {
  return Object.fromEntries(SLOTS.map((s) => [s.key, source[s.key] || null]));
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const q = url.searchParams;

    if (req.method === "GET") {
      const wallet = String(q.get("wallet") || "").toLowerCase();
      if (!WALLET.test(wallet)) throw fail(400, "Connect a wallet first.");

      if (q.get("challenge") === "save") {
        const name = cleanName(q.get("name"));
        const { build, sources } = checkBuild(buildFrom(Object.fromEntries(q)), traitsOf(await ownedImpIds(wallet)));
        json(res, 200, { message: saveMessage(wallet, name, build, sources, new Date().toISOString()) });
        return;
      }

      if (q.get("challenge") === "delete") {
        const id = Number(q.get("id"));
        const rows = Number.isInteger(id) ? await supabase(`saved_imps?select=id,name&id=eq.${id}&wallet=eq.${wallet}`) : [];
        if (!rows?.[0]) throw fail(404, "That saved Imp was not found.");
        json(res, 200, { message: deleteMessage(wallet, id, rows[0].name, new Date().toISOString()) });
        return;
      }

      // What this wallet can build with, and what it has saved.
      const imps = await ownedImpIds(wallet);
      let saved = [];
      let savedError = "";
      try {
        saved = (await listSaved(wallet)) || [];
      } catch (error) {
        savedError = error.message;
      }
      json(res, 200, { wallet, imps, traits: traitsOf(imps), saved, savedError });
      return;
    }

    if (req.method === "POST") {
      const fields = await readBody(req);
      const wallet = String(fields.wallet || "").toLowerCase();
      if (!WALLET.test(wallet)) throw fail(400, "Connect a wallet first.");
      const message = String(fields.message || "");
      const issued = issuedOf(message);

      if (fields.action === "save") {
        const name = cleanName(fields.name);
        // Ownership is checked again now: the Impz must still be in the wallet when the build is saved.
        const { build, sources } = checkBuild(buildFrom(fields.build || {}), traitsOf(await ownedImpIds(wallet)));
        if (message !== saveMessage(wallet, name, build, sources, issued)) {
          throw fail(409, "The signed message no longer matches this build or your Impz. Please save again.");
        }
        await checkSignature(wallet, message, fields.signature);
        const count = await supabase(`saved_imps?select=id&wallet=eq.${wallet}&limit=${MAX_SAVED}`);
        if ((count || []).length >= MAX_SAVED) throw fail(400, `You can save up to ${MAX_SAVED} Impz. Delete one first.`);
        const rows = await supabase("saved_imps", {
          method: "POST",
          body: JSON.stringify({
            wallet,
            name,
            ...build,
            source_imps: sources,
            message,
            signature: String(fields.signature),
            nonce: /^Nonce: (.+)$/m.exec(message)[1],
          }),
        });
        const row = Array.isArray(rows) ? rows[0] : rows;
        json(res, 200, Object.fromEntries(SAVED_COLS.split(",").map((c) => [c, row?.[c] ?? null])));
        return;
      }

      if (fields.action === "delete") {
        const id = Number(fields.id);
        const rows = Number.isInteger(id) ? await supabase(`saved_imps?select=id,name&id=eq.${id}&wallet=eq.${wallet}`) : [];
        if (!rows?.[0]) throw fail(404, "That saved Imp was not found.");
        if (message !== deleteMessage(wallet, id, rows[0].name, issued)) throw fail(401, "The signing request does not match.");
        await checkSignature(wallet, message, fields.signature);
        await supabase(`saved_imps?id=eq.${id}&wallet=eq.${wallet}`, { method: "DELETE", prefer: "return=minimal" });
        json(res, 200, { deleted: id });
        return;
      }

      throw fail(400, "Unknown action");
    }

    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    json(res, error.status || 500, { error: error.message || "Imp request failed" });
  }
}
