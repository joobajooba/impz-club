import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import ImpImage from "./ImpImage.jsx";
import { loadProfile } from "../lib/db.js";
import { profileKey, shortAddress } from "../lib/imps.js";

export default function HeaderUser() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [pfpId, setPfpId] = useState("");

  useEffect(() => {
    if (!address) {
      setUsername("");
      setPfpId("");
      return;
    }

    let cancelled = false;
    try {
      setUsername(localStorage.getItem(profileKey(address, "username")) || "");
      setPfpId(localStorage.getItem(profileKey(address, "pfp")) || "");
    } catch {}

    loadProfile(address)
      .then((row) => {
        if (cancelled || !row) return;
        const nextName = row.username || "";
        const nextPfp = row.pfp_id || "";
        if (nextName) setUsername(nextName);
        if (nextPfp) setPfpId(nextPfp);
      })
      .catch(() => {});

    function onChange(event) {
      const detail = event.detail || {};
      if (detail.address && String(detail.address).toLowerCase() !== String(address).toLowerCase()) {
        return;
      }
      if (detail.username != null) setUsername(detail.username);
      if (detail.pfpId != null) setPfpId(detail.pfpId);
    }

    window.addEventListener("impz-profile", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("impz-profile", onChange);
    };
  }, [address]);

  function onClick() {
    if (!isConnected) {
      open();
      return;
    }
    navigate("/account");
  }

  return (
    <button type="button" className="header-user" onClick={onClick} title={isConnected ? "Open profile" : "Connect wallet"}>
      <img className="header-user-plate" src="/header-user.png" alt="" />
      <span className={"header-user-pfp" + (pfpId ? " has-imp" : "")}>
        {pfpId ? <ImpImage tokenId={pfpId} alt="" /> : null}
      </span>
      <span className="header-user-meta">
        <span className="header-user-name">{isConnected ? username || "set username" : "Connect"}</span>
        <span className="header-user-wallet">{isConnected && address ? shortAddress(address) : "wallet"}</span>
      </span>
    </button>
  );
}
