import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { claimImpCoins, loadImpCoins } from "../lib/db.js";
import { notifyProfileChange } from "../lib/imps.js";

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
      </div>
    </main>
  );
}
