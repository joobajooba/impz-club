import { isMmlWallet, hasMmlAccess, readMmlCookie, MML_COOKIE, MML_MESSAGE } from "../src/lib/mmlAccess.js";
import { verifyMessage } from "viem";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function cookie(req, value) {
  const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${MML_COOKIE}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${value ? 604800 : 0}${secure}`;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const allowed = await hasMmlAccess(req.headers.cookie);
    res.statusCode = allowed ? 200 : 404;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "private, no-store");
    if (!allowed) {
      res.end("");
      return;
    }
    const raw = readMmlCookie(req.headers.cookie);
    const address = raw.slice(0, raw.indexOf("."));
    res.end(JSON.stringify({ ok: true, address }));
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  let body = {};
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    body = {};
  }

  const address = String(body.address || "");
  const signature = String(body.signature || "");
  let valid = false;
  if (isMmlWallet(address) && signature) {
    try {
      valid = await verifyMessage({ address, message: MML_MESSAGE, signature });
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    res.statusCode = 404;
    res.setHeader("Set-Cookie", cookie(req, ""));
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Set-Cookie", cookie(req, `${address}.${signature}`));
  res.setHeader("Cache-Control", "private, no-store");
  res.end(JSON.stringify({ ok: true }));
}
