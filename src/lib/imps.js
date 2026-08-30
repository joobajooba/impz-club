import { createPublicClient, defineChain, http } from "viem";

export const IMP_CONTRACT = "0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029";
export const IMP_SUPPLY = 2222;
export const IMP_IMAGE_CID = "QmQ67ks5EfM8cLvLJ8UecWBjm9nrxP5x2H8ZDAnPWp1xPF";

const robinhoodViem = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
});

const ownerOfAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
];

const balanceOfAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

const rhClient = createPublicClient({
  chain: robinhoodViem,
  transport: http("https://rpc.mainnet.chain.robinhood.com"),
});

export function localImpSrc(tokenId) {
  const n = Number(tokenId);
  if (n >= 1 && n <= 12) return `/slideshow/${n}.png`;
  if (n >= 100 && n <= 103) return `/slideshow/${n}.png`;
  return "";
}

export function remoteImpSrc(tokenId) {
  return `https://ipfs.io/ipfs/${IMP_IMAGE_CID}/${tokenId}`;
}

export function impImageSrc(tokenId, remote = "") {
  return localImpSrc(tokenId) || remote || remoteImpSrc(tokenId);
}

function sameAddress(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

export async function fetchImpBalance(owner) {
  if (!owner) return 0;
  const balance = await rhClient.readContract({
    address: IMP_CONTRACT,
    abi: balanceOfAbi,
    functionName: "balanceOf",
    args: [owner],
  });
  return Number(balance);
}

async function fetchFromBlockscout(owner) {
  const items = [];
  let url =
    "https://robinhoodchain.blockscout.com/api/v2/tokens/" +
    IMP_CONTRACT +
    "/instances?holder_address_hash=" +
    owner;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load Impz");
    const data = await res.json();
    for (const item of data.items || []) {
      const ownerHash = item.owner?.hash;
      if (ownerHash && !sameAddress(ownerHash, owner)) continue;
      items.push({
        id: String(item.id),
        image: item.image_url || remoteImpSrc(item.id),
        name: item.metadata?.name || "Implingz #" + item.id,
      });
    }
    const next = data.next_page_params;
    if (!next) break;
    url =
      "https://robinhoodchain.blockscout.com/api/v2/tokens/" +
      IMP_CONTRACT +
      "/instances?holder_address_hash=" +
      owner +
      "&" +
      new URLSearchParams(next).toString();
  }

  return items;
}

async function fetchFromOwnerOf(owner) {
  const items = [];
  const chunk = 200;
  for (let start = 1; start <= IMP_SUPPLY; start += chunk) {
    const contracts = [];
    for (let id = start; id < start + chunk && id <= IMP_SUPPLY; id += 1) {
      contracts.push({
        address: IMP_CONTRACT,
        abi: ownerOfAbi,
        functionName: "ownerOf",
        args: [BigInt(id)],
      });
    }
    const results = await rhClient.multicall({ contracts, allowFailure: true });
    results.forEach((result, index) => {
      if (result.status === "success" && sameAddress(result.result, owner)) {
        const id = String(start + index);
        items.push({ id, image: remoteImpSrc(id), name: "Implingz #" + id });
      }
    });
  }
  return items;
}

export async function fetchOwnedImps(owner) {
  if (!owner) return [];
  try {
    return await fetchFromBlockscout(owner);
  } catch (err) {
    console.warn("Imp lookup via explorer failed, reading the Imp contract instead", err);
    return fetchFromOwnerOf(owner);
  }
}

export function profileKey(address, suffix) {
  return "impz-" + suffix + ":" + String(address).toLowerCase();
}
