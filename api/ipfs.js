const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
];

function ipfsPath(req) {
  const raw = req.url || "";
  const fromUrl = raw.split("/api/ipfs/")[1] || "";
  const queryPath = typeof req.query?.path === "string" ? req.query.path : "";
  return decodeURIComponent(queryPath || fromUrl).replace(/^\/+/, "").split("?")[0];
}

export default async function handler(req, res) {
  const path = ipfsPath(req);
  if (!path || path.includes("..")) {
    res.statusCode = 400;
    res.end("Missing IPFS path");
    return;
  }

  for (const gateway of GATEWAYS) {
    try {
      const upstream = await fetch(gateway + path, {
        headers: { Accept: "image/*,application/json,*/*" },
      });
      if (!upstream.ok) continue;
      const type = upstream.headers.get("content-type") || "application/octet-stream";
      const body = Buffer.from(await upstream.arrayBuffer());
      res.statusCode = 200;
      res.setHeader("Content-Type", type);
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(body);
      return;
    } catch {}
  }

  res.statusCode = 404;
  res.end("Not found");
}
