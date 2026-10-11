import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const IMAGE_CID = "QmQ67ks5EfM8cLvLJ8UecWBjm9nrxP5x2H8ZDAnPWp1xPF";
const MML_URL = "https://www.impz.club/avatars/0.mml";
const TRAIT_NAMES = ["Background", "Body", "Head", "Back", "Clothing", "Eyes", "Tier"];
const traits = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "traits.json"), "utf8")
);

function metadataFor(id) {
  const values = traits[id - 1];
  if (!values) return null;
  return {
    image: `ipfs://${IMAGE_CID}/${id}`,
    name: `IMPLINGZ #${id}`,
    description: "A collection of unique pixel art IMPLINGZ on Robinhood Chain",
    external_url: "https://opensea.io",
    mml: MML_URL,
    attributes: TRAIT_NAMES.map((trait, index) => ({
      trait_type: trait,
      value: values[index],
    })),
  };
}

export default function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const id = Number(req.query.id);
  const metadata = Number.isInteger(id) ? metadataFor(id) : null;
  if (!metadata) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify({ error: "Unknown Imp" }));
    return;
  }

  const body = JSON.stringify(metadata);
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.end(req.method === "HEAD" ? undefined : body);
}
