import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import ImpImage from "./ImpImage.jsx";
import { bioError } from "../lib/bio.js";
import { daysSince, loadProfile, saveProfile } from "../lib/db.js";
import { countOwnedTiers, fetchOwnedImps, notifyProfileChange, profileKey } from "../lib/imps.js";

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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6 L18 18 M18 6 L6 18" />
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

function ageLabel(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "—";
  const days = daysSince(value);
  return days === 1 ? "1 day" : `${days} days`;
}

function EditProfile({ isConnected, username, bio, onSave, onOpenPicker }) {
  const { open } = useAppKit();
  const [draft, setDraft] = useState(username);
  const [bioDraft, setBioDraft] = useState(bio);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(username);
  }, [username]);

  useEffect(() => {
    setBioDraft(bio);
  }, [bio]);

  async function saveUsername() {
    if (saving) return;
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
      <button type="button" onClick={onOpenPicker} disabled={saving}>
        Profile Picture
      </button>
      <label htmlFor="profile-bio-input">Bio</label>
      <textarea
        id="profile-bio-input"
        maxLength={300}
        value={bioDraft}
        placeholder="Write a short bio"
        onChange={(event) => setBioDraft(event.target.value.slice(0, 300))}
      />
      <span className="profile-editor-count">{bioDraft.length}/300</span>
      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          if (saving) return;
          const next = bioDraft.trim().slice(0, 300);
          const problem = bioError(next);
          if (problem) {
            setStatus(problem);
            return;
          }
          setSaving(true);
          setStatus("");
          try {
            await onSave({ bio: next });
            setStatus("Bio saved");
          } catch (error) {
            setStatus(error.message || "Could not save bio");
          } finally {
            setSaving(false);
          }
        }}
      >
        Save bio
      </button>
      {status ? <p className="profile-editor-status">{status}</p> : null}
    </div>
  );
}

function PicturePicker({ imps, status, pfpId, saving, onChoose, onClose }) {
  return (
    <div className="profile-picker-pop">
      <button type="button" className="profile-pop-scrim" aria-label="Close profile picture" onClick={onClose} />
      <div className="profile-picker" role="dialog" aria-modal="true" aria-label="Profile picture">
        <div className="profile-picker-head">
          <h2>Profile Picture</h2>
          <button type="button" className="profile-close" aria-label="Close profile picture" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        {status ? <p className="profile-editor-status">{status}</p> : null}
        <div className="profile-picker-grid">
          {imps.map((imp) => (
            <button
              key={imp.id}
              type="button"
              className={imp.id === pfpId ? "selected" : undefined}
              aria-label={`Use ${imp.name} as profile picture`}
              disabled={saving}
              onClick={() => onChoose(imp)}
            >
              <ImpImage tokenId={imp.id} remote={imp.image} alt="" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfileButton() {
  const { address, isConnected } = useAppKitAccount();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState("Stats");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [pfpId, setPfpId] = useState("");
  const [rank, setRank] = useState("");
  const [accountAge, setAccountAge] = useState("");
  const [totalImpz, setTotalImpz] = useState("");
  const [tiers, setTiers] = useState({ 1: 0, 2: 0, 3: 0 });
  const [imps, setImps] = useState([]);
  const [ownedStatus, setOwnedStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function applyRow(row) {
    if (!row) return;
    setUsername(row.username || "");
    setBio(row.bio || "");
    setPfpId(row.pfp_id || "");
    setRank(row.rank == null || row.rank === "" ? "" : String(row.rank));
    setAccountAge(row.account_age || "");
    setTotalImpz(row.total_impz == null || row.total_impz === "" ? "" : String(row.total_impz));
    setTiers({
      1: Number(row.tier_1) || 0,
      2: Number(row.tier_2) || 0,
      3: Number(row.tier_3) || 0,
    });
    if (address) rememberProfile(address, row.username || "", row.pfp_id || "");
  }

  useEffect(() => {
    if (!address) {
      setUsername("");
      setBio("");
      setPfpId("");
      setRank("");
      setAccountAge("");
      setTotalImpz("");
      setTiers({ 1: 0, 2: 0, 3: 0 });
      setImps([]);
      return undefined;
    }

    let cancelled = false;
    try {
      setUsername(localStorage.getItem(profileKey(address, "username")) || "");
      setPfpId(localStorage.getItem(profileKey(address, "pfp")) || "");
    } catch {}

    loadProfile(address)
      .then((row) => {
        if (!cancelled) applyRow(row);
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
    if (!open || !address) return undefined;
    let cancelled = false;
    setOwnedStatus("Loading Impz…");

    (async () => {
      try {
        const [row, owned] = await Promise.all([
          loadProfile(address).catch(() => null),
          fetchOwnedImps(address),
        ]);
        if (cancelled) return;
        applyRow(row);
        setImps(owned);
        setOwnedStatus(owned.length ? "" : "No Impz in this wallet");
        const counted = await countOwnedTiers(owned);
        if (cancelled) return;
        const accountStamp =
          row?.account_age && !Number.isNaN(Date.parse(row.account_age))
            ? row.account_age
            : new Date().toISOString();
        const saved = await saveProfile(address, {
          total_impz: String(owned.length),
          tier_1: counted[1],
          tier_2: counted[2],
          tier_3: counted[3],
          account_age: accountStamp,
        });
        if (!cancelled) applyRow(saved);
      } catch {
        if (!cancelled) setOwnedStatus("Could not load Impz from this wallet");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, address]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key !== "Escape") return;
      if (pickerOpen) setPickerOpen(false);
      else setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pickerOpen]);

  async function saveFields(fields) {
    const payload = {};
    let nextName = username;
    let nextPfp = pfpId;
    if (fields.username != null || fields.pfp_id != null) {
      nextName = fields.username != null ? fields.username : username;
      nextPfp = fields.pfp_id != null ? fields.pfp_id : pfpId;
      payload.username = nextName || null;
      payload.pfp_id = nextPfp || null;
    }
    if (fields.bio != null || fields.bio === "") {
      const nextBio = String(fields.bio || "").trim().slice(0, 300);
      const problem = bioError(nextBio);
      if (problem) throw new Error(problem);
      payload.bio = nextBio || null;
    }
    const row = await saveProfile(address, payload);
    applyRow({
      ...row,
      username: row?.username || nextName || "",
      pfp_id: row?.pfp_id || nextPfp || "",
      bio: row?.bio || payload.bio || "",
    });
  }

  async function chooseImp(imp) {
    if (!address || saving) return;
    setSaving(true);
    try {
      await saveFields({ pfp_id: imp.id });
      setPickerOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const stats = [
    ["Account Age", accountAge ? ageLabel(accountAge) : "—"],
    ["Total Impz", totalImpz === "" ? "—" : totalImpz],
    ["Total Tier 1s", String(tiers[1] || 0)],
    ["Total Tier 2s", String(tiers[2] || 0)],
    ["Total Tier 3s", String(tiers[3] || 0)],
  ];

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
                      <span>{rank || "—"}</span>
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
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="profile-panel" role="tabpanel">
                    {tab === "Stats" ? (
                      <div className="profile-stats">
                        {stats.map(([label, value]) => (
                          <div className="profile-stat" key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {tab === "Collection" ? (
                      <div className="profile-collection">
                        {!isConnected ? <p>Connect your wallet to see your Impz.</p> : null}
                        {isConnected && ownedStatus ? <p>{ownedStatus}</p> : null}
                        {imps.map((imp) => (
                          <figure key={imp.id}>
                            <ImpImage tokenId={imp.id} remote={imp.image} alt={imp.name} />
                          </figure>
                        ))}
                      </div>
                    ) : null}
                    {tab === "Information" ? (
                      <div className="profile-info">
                        <p>{bio || "No bio yet."}</p>
                      </div>
                    ) : null}
                    {tab === "Edit Profile" ? (
                      <EditProfile
                        isConnected={isConnected}
                        username={username}
                        bio={bio}
                        onSave={saveFields}
                        onOpenPicker={() => setPickerOpen(true)}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
              {pickerOpen ? (
                <PicturePicker
                  imps={imps}
                  status={ownedStatus}
                  pfpId={pfpId}
                  saving={saving}
                  onChoose={chooseImp}
                  onClose={() => setPickerOpen(false)}
                />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
