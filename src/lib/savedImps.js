import { signMessage } from "wagmi/actions";
import { wagmiAdapter } from "../reown.js";

const SLOTS = ["body", "head", "eyes", "clothing", "back"];

async function request(path, options = {}) {
  const res = await fetch(`/api/imps${path}`, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

const wallet = (address) => String(address || "").toLowerCase();

// The Impz in the wallet (read from the contract by the server), the traits they give, and saved builds.
export function loadBuilder(address) {
  return request(`?wallet=${wallet(address)}`);
}

function sign(message) {
  return signMessage(wagmiAdapter.wagmiConfig, { message });
}

// Saving asks the wallet to sign a message listing the build and the Impz its traits come from.
// onStep("sign") fires when the wallet prompt is about to open.
export async function saveImp(address, name, build, onStep = () => {}) {
  const w = wallet(address);
  const p = new URLSearchParams({ challenge: "save", wallet: w, name });
  for (const s of SLOTS) if (build[s]) p.set(s, build[s]);
  const { message } = await request(`?${p}`);
  onStep("sign");
  const signature = await sign(message);
  onStep("save");
  return request("", {
    method: "POST",
    body: JSON.stringify({ action: "save", wallet: w, name, build, message, signature }),
  });
}

export async function deleteSavedImp(address, id) {
  const w = wallet(address);
  const { message } = await request(`?challenge=delete&wallet=${w}&id=${id}`);
  const signature = await sign(message);
  return request("", { method: "POST", body: JSON.stringify({ action: "delete", wallet: w, id, message, signature }) });
}

// Wallets report a declined signature in several ways; show one friendly line for all of them.
export function signError(error) {
  const text = String(error?.shortMessage || error?.message || error || "");
  if (/reject|denied|cancel/i.test(text)) return "Signature cancelled. Nothing was saved.";
  return text || "Something went wrong.";
}
