import { useEffect, useState } from "react";
import { impImageSrc, remoteImpSrc } from "../lib/imps.js";

export default function ImpImage({ tokenId, remote, alt }) {
  const local = impImageSrc(tokenId, "");
  const fallback = remote || remoteImpSrc(tokenId);
  const [src, setSrc] = useState(local || fallback || "");

  useEffect(() => {
    setSrc(local || fallback || "");
  }, [local, fallback]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => {
        if (fallback && src !== fallback) setSrc(fallback);
      }}
    />
  );
}
