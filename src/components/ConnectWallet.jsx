import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { shortAddress } from "../lib/imps.js";

export default function ConnectWallet({ className = "fill" }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  return (
    <button type="button" className={className} onClick={() => open()}>
      {isConnected && address ? shortAddress(address) : "Connect Wallet"}
    </button>
  );
}
