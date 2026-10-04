import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import ImpImage from "./ImpImage.jsx";
import { loadProfile, saveProfile } from "../lib/db.js";
import { fetchOwnedImps, notifyProfileChange, profileKey } from "../lib/imps.js";

const TABS = ["Stats", "Trophies", "Collection", "Information", "Edit Profile"];

function Star() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.2 14.7 9l6.3.6-4.8 4.1 1.5 6.1L12 16.8 6.3 19.8l1.5-6.1L3 9.6 9.3 9 12 3.2z"
      />
    </svg>
  );
}

function rememberProfile(address, username, pfpId) {
  try {
    localStorage.setItem(profileKey(address, "username"), username || "");
    localStorage.setItem(profileKey(address, "pfp"), pfpId || "");
  } catch {}
  notifyProfileChange({ address, username: username || "", pfpId: pfpId || "" });
}

function EditProfile({ address, isConnected, username, pfpId, onSave }) {
  const { open } = useAppKit();
  const [draft, setDraft] = useState(username);
  const [imps, setImps] = useState([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(username);
  }, [username]);

  useEffect(() => {
    if (!address) {
      setImps([]);
      setStatus("");
      return undefined;
    }

    let cancelled = false;
    setStatus("Loading Impz from your wallet…");
    fetchOwnedImps(address)
      .then((owned) => {
        if (cancelled) return;
        setImps(owned);
        setStatus(owned.length ? "" : "No Impz in this wallet");
      })
      .catch(() => {
        if (!cancelled) setStatus("Could not load Impz from this wallet");
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  async function saveUsername() {
    if (!address || saving) return;
    setSaving(true);
    setStatus("");
    try {
      await onSave({ username: draft.trim().slice(0, 24) });
      setStatus("Username saved");
    } catch (error) {
      setStatus(error.message || "Could not save username");
    } finally {
      setSaving(false);
    }
  }

  async function chooseImp(imp) {
    if (!address || saving) return;
    setSaving(true);
    setStatus("");
    try {
      await onSave({ username: draft.trim().slice(0, 24), pfp_id: imp.id });
      setStatus("Profile picture saved");
    } catch (error) {
      setStatus(error.message || "Could not save profile picture");
    } finally {
      setSaving(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="profile-editor">
        <p>Connect your wallet to set a username and profile picture.</p>
        <button type="button" onClick={() => open()}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="profile-editor">
      <label htmlFor="profile-username-input">Username</label>
      <div className="profile-editor-row">
        <input
          id="profile-username-input"
          type="text"
          maxLength={24}
          value={draft}
          placeholder="Username"
          onChange={(event) => setDraft(event.target.value.slice(0, 24))}
          onKeyDown={(event) => {
            if (event.key === "Enter") saveUsername();
          }}
        />
        <button type="button" onClick={saveUsername} disabled={saving}>
          Save
        </button>
      </div>
      <p className="profile-editor-label">Profile picture</p>
      {status ? <p className="profile-editor-status">{status}</p> : null}
      {imps.length ? (
        <div className="profile-nft-pick">
          {imps.map((imp) => (
            <button
              key={imp.id}
              type="button"
              className={imp.id === pfpId ? "selected" : undefined}
              aria-label={`Use ${imp.name} as profile picture`}
              disabled={saving}
              onClick={() => chooseImp(imp)}
            >
              <ImpImage tokenId={imp.id} remote={imp.image} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ProfileButton() {
  const { address, isConnected } = useAppKitAccount();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("Stats");
  const [username, setUsername] = useState("");
  const [pfpId, setPfpId] = useState("");

  useEffect(() => {
    if (!address) {
      setUsername("");
      setPfpId("");
      return undefined;
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
        setUsername(nextName);
        setPfpId(nextPfp);
        rememberProfile(address, nextName, nextPfp);
      })
      .catch(() => {});

    function onChange(event) {
      const detail = event.detail || {};
      if (detail.address && String(detail.address).toLowerCase() !== String(address).toLowerCase()) return;
      if (detail.username != null) setUsername(detail.username);
      if (detail.pfpId != null) setPfpId(detail.pfpId);
    }

    window.addEventListener("impz-profile", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("impz-profile", onChange);
    };
  }, [address]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function saveFields(fields) {
    const nextName = fields.username != null ? fields.username : username;
    const nextPfp = fields.pfp_id != null ? fields.pfp_id : pfpId;
    const row = await saveProfile(address, {
      username: nextName || null,
      pfp_id: nextPfp || null,
    });
    const savedName = row?.username || nextName || "";
    const savedPfp = row?.pfp_id || nextPfp || "";
    setUsername(savedName);
    setPfpId(savedPfp);
    rememberProfile(address, savedName, savedPfp);
  }

  return (
    <>
      <button
        type="button"
        className="wallet-slot"
        aria-label="Open profile"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {pfpId ? <ImpImage tokenId={pfpId} alt="" /> : null}
      </button>
      {open
        ? createPortal(
            <div className="profile-pop">
              <button type="button" className="profile-pop-scrim" aria-label="Close profile" onClick={() => setOpen(false)} />
              <div className="profile-card" role="dialog" aria-modal="true" aria-label="Profile">
                <div className="profile-side">
                  <div className="profile-name-row">
                    <div className={username ? "profile-username set" : "profile-username"}>{username || "Username"}</div>
                    <div className="profile-level">
                      <Star />
                      <span>—</span>
                    </div>
                  </div>
                  <div className="profile-portrait">{pfpId ? <ImpImage tokenId={pfpId} alt="" /> : null}</div>
                  <div className="profile-badges">
                    <div className="profile-emblem">Emblem</div>
                    <div className="profile-title">Title</div>
                  </div>
                </div>
                <div className="profile-main">
                  <div className="profile-tabs" role="tablist" aria-label="Profile sections">
                    {TABS.map((name) => (
                      <button
                        key={name}
                        type="button"
                        role="tab"
                        aria-selected={tab === name}
                        className={tab === name ? "active" : undefined}
                        onClick={() => setTab(name)}
                      >
                        {name}
                      </button>
                    ))}
                    <button type="button" className="profile-close" aria-label="Close profile" onClick={() => setOpen(false)}>
                      <span />
                      <span />
                    </button>
                  </div>
                  <div className={tab === "Edit Profile" ? "profile-panel editing" : "profile-panel"} role="tabpanel">
                    {tab === "Edit Profile" ? (
                      <EditProfile
                        address={address}
                        isConnected={isConnected}
                        username={username}
                        pfpId={pfpId}
                        onSave={saveFields}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
