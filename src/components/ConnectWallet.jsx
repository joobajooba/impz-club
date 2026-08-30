import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

function shortAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function ConnectWallet({ className = "fill" }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  return (
    <button type="button" className={className} onClick={() => open()}>
      {isConnected && address ? shortAddress(address) : "Connect Wallet"}
    </button>
  );
}
