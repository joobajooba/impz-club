import { useEffect, useRef, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import ConnectWallet from "../components/ConnectWallet.jsx";
import ImpImage from "../components/ImpImage.jsx";
import {
  daysSince,
  joinedAtFromProfile,
  loadLeaderboard,
  loadProfile,
  rankFromLeaderboard,
  saveProfile,
} from "../lib/db.js";
import { fetchImpBalance, fetchOwnedImps, notifyProfileChange, profileKey } from "../lib/imps.js";

export default function Profile() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const picker = useRef(null);
  const saveTimer = useRef(0);

  const [username, setUsername] = useState("");
  const [pfpId, setPfpId] = useState("");
  const [rank, setRank] = useState("");
  const [totalImpz, setTotalImpz] = useState("");
  const [impCoins, setImpCoins] = useState("");
  const [accountAge, setAccountAge] = useState("");
  const [imps, setImps] = useState([]);
  const [status, setStatus] = useState("");
  const [nftStatus, setNftStatus] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingNfts, setLoadingNfts] = useState(false);

  function cacheLocal(key, value) {
    try {
      localStorage.setItem(profileKey(address, key), value);
    } catch {}
    notifyProfileChange({
      address,
      username: key === "username" ? value : undefined,
      pfpId: key === "pfp" ? value : undefined,
    });
  }

  function persist(fields) {
    if (!address) return Promise.resolve();
    return saveProfile(address, fields).catch((err) => {
      console.warn("Could not save profile", err);
    });
  }

  useEffect(() => {
    if (!address) {
      setUsername("");
      setPfpId("");
      setRank("");
      setTotalImpz("");
      setImpCoins("");
      setAccountAge("");
      setImps([]);
      setLoadError("");
      setNftStatus("");
      setLoading(false);
      setLoadingNfts(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadingNfts(true);
    setLoadError("");
    setNftStatus("Loading Impz…");

    let localName = "";
    let localPfp = "";
    try {
      localName = localStorage.getItem(profileKey(address, "username")) || "";
      localPfp = localStorage.getItem(profileKey(address, "pfp")) || "";
    } catch {}
    setUsername(localName);
    setPfpId(localPfp);

    (async () => {
      try {
        const [row, ownedCount, board] = await Promise.all([
          loadProfile(address).catch(() => null),
          fetchImpBalance(address),
          loadLeaderboard().catch(() => []),
        ]);
        if (cancelled) return;

        const nextUsername = row?.username || localName || "";
        const nextPfp = row?.pfp_id || localPfp || "";
        const joined = joinedAtFromProfile(row);
        const ageDays = daysSince(joined);
        const nextRank = rankFromLeaderboard(address, ownedCount, board);
        const nextCoins = row?.imp_coins == null || row.imp_coins === "" ? "0" : String(row.imp_coins);
        const joinStamp =
          row?.account_age && !Number.isNaN(Date.parse(row.account_age))
            ? row.account_age
            : joined.toISOString();

        setUsername(nextUsername);
        setPfpId(nextPfp);
        notifyProfileChange({ address, username: nextUsername, pfpId: nextPfp });
        setTotalImpz(String(ownedCount));
        setRank(nextRank);
        setImpCoins(nextCoins);
        setAccountAge(String(ageDays));

        persist({
          username: nextUsername || null,
          pfp_id: nextPfp || null,
          total_impz: String(ownedCount),
          rank: nextRank,
          imp_coins: nextCoins,
          account_age: joinStamp,
        });
      } catch (err) {
        console.warn("Could not sync profile", err);
        if (!cancelled) setLoadError("Could not load wallet profile. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }

      try {
        const owned = await fetchOwnedImps(address);
        if (cancelled) return;
        setImps(owned);
        setNftStatus(owned.length ? "" : "No Impz in this wallet");
        setTotalImpz(String(owned.length));
        const board = await loadLeaderboard().catch(() => []);
        const nextRank = rankFromLeaderboard(address, owned.length, board);
        setRank(nextRank);
        persist({
          total_impz: String(owned.length),
          rank: nextRank,
        });
      } catch {
        if (!cancelled) setNftStatus("Could not load Impz from this wallet");
      } finally {
        if (!cancelled) setLoadingNfts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  function saveUsername(value) {
    const next = value.slice(0, 24);
    setUsername(next);
    if (!address) return;
    cacheLocal("username", next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      persist({ username: next }).catch(() => {});
    }, 400);
  }

  function chooseImp(imp) {
    setPfpId(imp.id);
    if (address) {
      cacheLocal("pfp", imp.id);
      persist({ pfp_id: imp.id }).catch(() => {});
    }
    picker.current?.close();
  }

  function openPicker() {
    if (!isConnected) {
      open();
      return;
    }
    picker.current?.showModal();
    setStatus(imps.length ? "" : loadingNfts ? "Loading Impz…" : "No Impz in this wallet");
  }

  const selected = imps.find((imp) => imp.id === pfpId);

  return (
    <main className="profile">
      <div id="profile-app">
        <div className="profile-banner">
          <img src="/sneakpeek.gif" alt="" />
        </div>

        <div className="profile-identity">
          <button type="button" className="profile-avatar" onClick={openPicker} title="Choose an Imp">
            {pfpId ? (
              <ImpImage tokenId={pfpId} remote={selected?.image} alt={"Implingz #" + pfpId} />
            ) : (
              <span>{isConnected ? "Choose an Imp" : "profile picture"}</span>
            )}
          </button>
          <div className="profile-id-meta">
            <input
              className="profile-username"
              type="text"
              maxLength={24}
              placeholder={isConnected ? "set a username" : "username"}
              value={username}
              disabled={!isConnected}
              onChange={(event) => saveUsername(event.target.value)}
              aria-label="Username"
            />
            <ConnectWallet className="profile-wallet-chip" />
          </div>
        </div>

        <div className="profile-stat-row">
          <div className="profile-stat-card">
            <span className="stat-label">User Rank</span>
            <span className="stat-value">{loading ? "…" : rank ? `#${rank}` : "—"}</span>
          </div>
          <div className="profile-stat-card">
            <span className="stat-label">Total Impz</span>
            <span className="stat-value">{loading ? "…" : totalImpz || "—"}</span>
          </div>
          <div className="profile-stat-card">
            <span className="stat-label">Total Imp coins</span>
            <span className="stat-value">{loading ? "…" : impCoins || "0"}</span>
          </div>
          <div className="profile-stat-card">
            <span className="stat-label">Account age</span>
            <span className="stat-value">
              {loading ? "…" : accountAge === "" ? "—" : `${accountAge} days`}
            </span>
          </div>
        </div>

        {loadError ? <p className="profile-error">{loadError}</p> : null}
        {!isConnected ? (
          <p className="profile-hint">Connect a Reown wallet to load your Impz and save this profile.</p>
        ) : null}

        <section className="profile-nfts">
          <div className="profile-nfts-head">
            <h3>Impz</h3>
            <span>{loadingNfts ? "…" : imps.length}</span>
          </div>
          {nftStatus ? <p className="profile-nft-status">{nftStatus}</p> : null}
          {imps.length ? (
            <div className="profile-nft-grid">
              {imps.map((imp) => (
                <button
                  key={imp.id}
                  type="button"
                  className={"profile-nft-card" + (imp.id === pfpId ? " selected" : "")}
                  onClick={() => chooseImp(imp)}
                >
                  <ImpImage tokenId={imp.id} remote={imp.image} alt={imp.name} />
                  <strong>{imp.name}</strong>
                  <span>#{imp.id}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <dialog
        className="site-dialog"
        id="imp-picker"
        ref={picker}
        onClick={(event) => {
          if (event.target === picker.current) picker.current.close();
        }}
      >
        <div className="team-head">
          <h3>Choose an Imp</h3>
          <button type="button" className="team-close" aria-label="Close" onClick={() => picker.current?.close()}>
            x
          </button>
        </div>
        {status ? <p className="profile-picker-status">{status}</p> : null}
        <div className="imp-picker-grid">
          {imps.map((imp) => (
            <button
              key={imp.id}
              type="button"
              className={"imp-picker-card" + (imp.id === pfpId ? " selected" : "")}
              onClick={() => chooseImp(imp)}
            >
              <ImpImage tokenId={imp.id} remote={imp.image} alt={imp.name} />
              <span>#{imp.id}</span>
            </button>
          ))}
        </div>
      </dialog>
    </main>
  );
}
