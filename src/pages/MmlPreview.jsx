import { useEffect, useState } from "react";
import { useSignMessage } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import "@google/model-viewer";

const MML_MESSAGE = "Unlock the Impz model preview";

export default function MmlPreview() {
  const { address, isConnected } = useAppKitAccount();
  const { signMessageAsync } = useSignMessage();
  const [src, setSrc] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch("/api/mml-session")
      .then(async (res) => {
        if (cancel || !res.ok) return;
        const type = res.headers.get("content-type") || "";
        if (!type.includes("application/json")) return;
        const data = await res.json();
        if (!data?.ok || !address) return;
        if (String(data.address || "").toLowerCase() !== String(address).toLowerCase()) return;
        const model = await fetch("/avatars/green.mml");
        if (cancel || !model.ok) return;
        const match = String(await model.text()).match(/src="([^"]+)"/);
        if (match) {
          setSrc(match[1]);
          setUnlocked(true);
        }
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [address]);

  async function unlock() {
    if (!address) return;
    try {
      const signature = await signMessageAsync({ message: MML_MESSAGE });
      const res = await fetch("/api/mml-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });
      const type = res.headers.get("content-type") || "";
      if (!res.ok || !type.includes("application/json")) return;
      const model = await fetch("/avatars/green.mml");
      if (!model.ok) return;
      const match = String(await model.text()).match(/src="([^"]+)"/);
      if (!match) return;
      setSrc(match[1]);
      setUnlocked(true);
    } catch {
      setSrc("");
      setUnlocked(false);
    }
  }

  if (!unlocked) {
    if (!isConnected) return <main className="page" />;
    return (
      <main className="viewer-page">
        <div className="viewer-switch">
          <button type="button" onClick={unlock}>
            Continue
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="viewer-page">
      <h1>Green Imp</h1>
      <div className="viewer-stage">
        {src ? (
          <model-viewer
            src={src}
            alt="Green Imp"
            camera-controls=""
            auto-rotate=""
            shadow-intensity="1"
            exposure="1"
          />
        ) : null}
      </div>
    </main>
  );
}
