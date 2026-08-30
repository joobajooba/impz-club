import { useEffect, useState } from "react";
import { impImageCandidates } from "../lib/imps.js";

export default function ImpImage({ tokenId, remote, alt }) {
  const candidates = impImageCandidates(tokenId, remote);
  const [index, setIndex] = useState(0);
  const src = candidates[index] || "";

  useEffect(() => {
    setIndex(0);
  }, [tokenId, remote]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => {
        setIndex((current) => (current + 1 < candidates.length ? current + 1 : current));
      }}
    />
  );
}
