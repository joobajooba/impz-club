import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient } from "@tanstack/react-query";
import {
  arbitrum,
  base,
  defineChain,
  mainnet,
  optimism,
  polygon,
} from "@reown/appkit/networks";

export const projectId =
  import.meta.env.VITE_REOWN_PROJECT_ID || "0da3c1b5e20efa536c3c8c7b927c65f4";

export const robinhood = defineChain({
  id: 4663,
  caipNetworkId: "eip155:4663",
  chainNamespace: "eip155",
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

export const networks = [robinhood, mainnet, polygon, optimism, arbitrum, base];

const siteUrl =
  typeof window !== "undefined" ? window.location.origin : "https://www.impz.club";

export const metadata = {
  name: "Club Impz",
  description: "Club Impz is the home of the Implingz community.",
  url: siteUrl,
  icons: [`${siteUrl}/logo.gif`],
};

export const queryClient = new QueryClient();

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  defaultNetwork: robinhood,
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#e85a4f",
    "--w3m-font-family": '"Pixelify Sans", monospace',
  },
  enableCoinbase: false,
  features: {
    analytics: false,
    swaps: false,
    onramp: false,
    email: false,
    socials: false,
  },
});
