import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { claimImpCoins, loadImpCoins } from "../lib/db.js";
import { notifyProfileChange } from "../lib/imps.js";

const CATEGORIES = ["Whitelist Access", "Imp Items", "Titles", "Emblems", "Other"];

function coins(value) {
  return Number(value || 0).toLocaleString("en-US");
}

export default function Merchant() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      setError("");
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    loadImpCoins(address)
      .then((row) => {
        if (!cancelled) setBalance(row);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load Imp Coins.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  async function claim() {
    if (!address || claiming) return;
    setClaiming(true);
    setError("");
    try {
      const row = await claimImpCoins(address);
      const next = row?.imp_coins == null ? "0" : String(row.imp_coins);
      setBalance({
        wallet: address.toLowerCase(),
        portable_imp_coin: balance?.portable_imp_coin || 0,
        imp_coins: next,
        imp_coin_claimed: true,
      });
      notifyProfileChange({ address, impCoins: next });
    } catch (err) {
      setError(err?.message || "Could not claim Imp Coins.");
    } finally {
      setClaiming(false);
    }
  }

  const portable = Number(balance?.portable_imp_coin) || 0;
  const claimed = Boolean(balance?.imp_coin_claimed);

  return (
    <main className="merchant-page">
      <div className="merchant-column">
        <img className="merchant-portrait" src="/merchant.png" alt="Merchant" />
        {!isConnected ? (
          <button type="button" className="merchant-claim" onClick={() => open()}>
            Connect Wallet
          </button>
        ) : null}
        {isConnected && loading ? <p className="merchant-status">Loading Imp Coins…</p> : null}
        {error ? <p className="merchant-status">{error}</p> : null}
        {isConnected && !loading && balance ? (
          <section className="merchant-card">
            <p>Imp Coin Balance</p>
            <strong>{coins(balance.imp_coins)}</strong>
            {portable > 0 && !claimed ? (
              <button type="button" className="merchant-claim" disabled={claiming} onClick={claim}>
                {claiming ? "Claiming…" : `Claim ${coins(portable)} Imp Coins`}
              </button>
            ) : null}
            {claimed ? <span>These Imp Coins are on your account.</span> : null}
            {!claimed && portable <= 0 ? <span>This wallet has no Imp Coins to claim.</span> : null}
          </section>
        ) : null}
        <section className="merchant-welcome">
          <p>Welcome to the Merchant. Here you can spend your Imp Coins for a variety of cool things!</p>
        </section>
      </div>
      <section className="merchant-shop" aria-label="Items for sale">
        <div className="merchant-filters">
          {CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              className={category === name ? "active" : ""}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="merchant-items">
          {Array.from({ length: 8 }, (_, index) => (
            <article className="merchant-item" key={`${category}-${index}`}>
              <div />
              <span>Placeholder</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
