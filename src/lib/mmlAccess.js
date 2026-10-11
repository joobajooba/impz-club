import { verifyMessage } from "viem";

const ALLOWED = new Set([
  "0x53391bf6931e3a8d829029b2a7640f3213cf6c94",
  "0x58975a6720b7ba2f5501e3a26f4943f0ced0adf8",
]);

export const MML_COOKIE = "impz_mml";
export const MML_MESSAGE = "Unlock the Impz model preview";

export function isMmlWallet(address) {
  return ALLOWED.has(String(address || "").toLowerCase());
}

export function readMmlCookie(header) {
  const match = String(header || "").match(new RegExp("(?:^|;\\s*)" + MML_COOKIE + "=([^;]*)"));
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

export async function hasMmlAccess(cookieHeader) {
  const raw = readMmlCookie(cookieHeader);
  const splitAt = raw.indexOf(".");
  if (splitAt < 1) return false;
  const address = raw.slice(0, splitAt);
  const signature = raw.slice(splitAt + 1);
  if (!isMmlWallet(address) || !signature) return false;
  try {
    return await verifyMessage({ address, message: MML_MESSAGE, signature });
  } catch {
    return false;
  }
}
