import { networks } from "@web3icons/common";
import type { INetworkMetadata } from "@web3icons/common";
import chainlistIpfs from "./chainlistIconIpfs.json";
import llamaSlugs from "./llamaChainSlugs.json";
import localWeb3IconIds from "./localWeb3IconIds.json";

const IPFS = chainlistIpfs as Record<string, string>;
const LLAMA = llamaSlugs as Record<string, string>;
const LOCAL_IDS = new Set(localWeb3IconIds as string[]);

const TESTNET_NAME_RE =
  /testnet|sepolia|goerli|holesky|hoodi|amoy|fuji|alfajores|calibration|garfield|cardona|kairos|hekla|mordor|devnet|ghostnet/i;

/** Testnet / extra ids → mainnet chain id (always show the mainnet brand). */
const TO_MAINNET_CHAIN_ID: Record<number, number> = {
  11155111: 1,
  17000: 1,
  560048: 1,
  5: 1,
  11155420: 10,
  420: 10,
  114: 14,
  16: 14,
  97: 56,
  10200: 100,
  80002: 137,
  80001: 137,
  4002: 250,
  300: 324,
  4801: 480,
  545: 747,
  84532: 8453,
  84531: 8453,
  421614: 42161,
  43113: 43114,
  59141: 59144,
  534351: 534352,
  999999999: 7777777,
  1301: 130,
  48898: 48900,
  44787: 42220,
  11142220: 42220,
  314159: 314,
  10143: 143,
  168587773: 81457,
  5003: 5000,
  919: 34443,
  167009: 167000,
  1946: 1868,
  33111: 33139,
  11124: 2741,
  80069: 80094,
  57054: 146,
  1442: 1101,
  5115: 4114, // Citrea testnet → Citrea brand
};

/** Direct web3icon ids when chain-id lookup is missing or wrong. */
const ICON_ID_BY_CHAIN: Record<number, string> = {
  1: "ethereum",
  10: "optimism",
  14: "flare",
  56: "binance-smart-chain",
  100: "gnosis",
  130: "unichain",
  137: "polygon",
  143: "monad",
  146: "sonic",
  250: "fantom",
  314: "filecoin",
  324: "zksync",
  480: "world",
  747: "flow",
  1101: "polygon-zkevm",
  4114: "citrea",
  5000: "mantle",
  8453: "base",
  42161: "arbitrum-one",
  42220: "celo",
  43114: "avalanche",
  48900: "zircuit",
  59144: "linea",
  81457: "blast",
  534352: "scroll",
  7777777: "zora",
  80094: "berachain",
  114: "flare",
  11155420: "optimism",
  84532: "base",
  421614: "arbitrum-one",
  4801: "world",
  80002: "polygon",
  300: "zksync",
  534351: "scroll",
  999999999: "zora",
  1301: "unichain",
  48898: "zircuit",
  5115: "citrea",
  545: "flow",
  44787: "celo",
  314159: "filecoin",
  10143: "monad",
  97: "binance-smart-chain",
  43113: "avalanche",
  11155111: "ethereum",
};

const NAME_ALIASES: Record<string, string> = {
  op: "optimism",
  optimism: "optimism",
  ethereum: "ethereum",
  eth: "ethereum",
  sepolia: "ethereum",
  base: "base",
  arbitrum: "arbitrum-one",
  arb: "arbitrum-one",
  polygon: "polygon",
  matic: "polygon",
  pol: "polygon",
  amoy: "polygon",
  avalanche: "avalanche",
  avax: "avalanche",
  fuji: "avalanche",
  bsc: "binance-smart-chain",
  bnb: "binance-smart-chain",
  binance: "binance-smart-chain",
  flare: "flare",
  coston: "flare",
  coston2: "flare",
  world: "world",
  zora: "zora",
  scroll: "scroll",
  zksync: "zksync",
  zk: "zksync",
  filecoin: "filecoin",
  fil: "filecoin",
  unichain: "unichain",
  zircuit: "zircuit",
  celo: "celo",
  alfajores: "celo",
  flow: "flow",
  monad: "monad",
  citrea: "citrea",
  gnosis: "gnosis",
  xdai: "gnosis",
  linea: "linea",
  blast: "blast",
  mantle: "mantle",
  fantom: "fantom",
  sonic: "sonic",
  berachain: "berachain",
  taiko: "taiko",
  mode: "mode",
  ink: "ink",
  soneium: "soneium",
  apechain: "apechain",
  abstract: "abstract",
};

/** Official marks we already ship in /public (prefer these over generic CDNs). */
const LOCAL_OVERRIDES: Record<number, string> = {
  14: "/flarelogo.png",
  114: "/flarelogo.png",
  16: "/flarelogo.png",
  480: "/chains/world-v2.svg",
  4801: "/chains/world-v2.svg",
  143: "/monad_logo.png",
  10143: "/monad_logo.png",
  747: "/chains/flow-llama.jpg",
  545: "/chains/flow-llama.jpg",
};

const NETS = networks as INetworkMetadata[];

const BY_CHAIN_ID = new Map<number, INetworkMetadata[]>();
const BY_ID = new Map<string, INetworkMetadata>();
const BY_NAME = new Map<string, INetworkMetadata>();

for (const net of NETS) {
  BY_ID.set(net.id, net);
  if (net.name) BY_NAME.set(net.name.toLowerCase(), net);
  if (net.shortName) BY_NAME.set(net.shortName.toLowerCase(), net);
  const cid =
    typeof net.chainId === "number"
      ? net.chainId
      : net.chainId
        ? Number(net.chainId)
        : NaN;
  if (Number.isFinite(cid)) {
    const list = BY_CHAIN_ID.get(cid) || [];
    list.push(net);
    BY_CHAIN_ID.set(cid, list);
  }
}

function isTestnetMeta(net: INetworkMetadata): boolean {
  return TESTNET_NAME_RE.test(`${net.id} ${net.name} ${net.shortName || ""}`);
}

function stripTestnetSuffix(id: string): string {
  return id
    .replace(/-sepolia$/, "")
    .replace(/-testnet$/, "")
    .replace(/-goerli$/, "")
    .replace(/-holesky$/, "")
    .replace(/-amoy$/, "")
    .replace(/-fuji$/, "")
    .replace(/-alfajores$/, "")
    .replace(/-calibration$/, "")
    .replace(/-cardona$/, "")
    .replace(/-hekla$/, "")
    .replace(/-kairos$/, "")
    .replace(/-garfield$/, "");
}

export function mainnetChainIdFor(chainId: number): number {
  return TO_MAINNET_CHAIN_ID[chainId] ?? chainId;
}

function pickMainnetMeta(list: INetworkMetadata[]): INetworkMetadata | undefined {
  return list.find((n) => !isTestnetMeta(n)) || list[0];
}

export function web3IconIdFor(chainId: number, name = ""): string | undefined {
  if (ICON_ID_BY_CHAIN[chainId]) return ICON_ID_BY_CHAIN[chainId];

  const main = mainnetChainIdFor(chainId);
  if (ICON_ID_BY_CHAIN[main]) return ICON_ID_BY_CHAIN[main];

  const byMain = BY_CHAIN_ID.get(main);
  if (byMain?.length) {
    const meta = pickMainnetMeta(byMain);
    if (meta) return stripTestnetSuffix(meta.id);
  }

  const byExact = BY_CHAIN_ID.get(chainId);
  if (byExact?.length) {
    const meta = pickMainnetMeta(byExact);
    if (meta) return stripTestnetSuffix(meta.id);
  }

  const cleaned = name
    .toLowerCase()
    .replace(
      /testnet|sepolia|goerli|holesky|hoodi|amoy|fuji|alfajores|calibration|garfield|cardona|kairos|hekla|mordor|devnet|ghostnet/gi,
      " "
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (cleaned) {
    for (const token of cleaned.split(/\s+/)) {
      if (NAME_ALIASES[token]) return NAME_ALIASES[token];
    }
    if (NAME_ALIASES[cleaned.replace(/\s+/g, "-")]) {
      return NAME_ALIASES[cleaned.replace(/\s+/g, "-")];
    }
    const byName = BY_NAME.get(cleaned) || BY_ID.get(cleaned.replace(/\s+/g, "-"));
    if (byName) return stripTestnetSuffix(byName.id);
  }

  return undefined;
}

function localWeb3Url(id: string): string {
  return `/web3icons/networks/${id}.svg`;
}

function jsdelivrUrl(id: string): string {
  return `https://cdn.jsdelivr.net/gh/0xa3k5/web3icons@main/packages/core/src/svgs/networks/branded/${id}.svg`;
}

function ipfsUrl(cid: string, gateway: "cf" | "ipfs" = "cf"): string {
  return gateway === "cf"
    ? `https://cloudflare-ipfs.com/ipfs/${cid}`
    : `https://ipfs.io/ipfs/${cid}`;
}

function llamaUrl(slug: string): string {
  return `https://icons.llamao.fi/icons/chains/rsz_${slug}.jpg`;
}

export const FALLBACK_CHAIN_LOGO = localWeb3Url("ethereum");

export function chainLogoCandidates(
  chainId: number,
  name = "",
  icon?: string,
  slug?: string
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (u?: string) => {
    if (u && !seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  };

  push(LOCAL_OVERRIDES[chainId] || LOCAL_OVERRIDES[mainnetChainIdFor(chainId)]);

  const w3 = web3IconIdFor(chainId, name);
  if (w3) {
    if (LOCAL_IDS.has(w3)) push(localWeb3Url(w3));
    push(jsdelivrUrl(w3));
  }

  if (icon && IPFS[icon]) {
    push(ipfsUrl(IPFS[icon], "cf"));
    push(ipfsUrl(IPFS[icon], "ipfs"));
  }

  const llamaSlug =
    LLAMA[String(mainnetChainIdFor(chainId))] ||
    LLAMA[String(chainId)];
  // Llama's ethereum/base files are tiny broken placeholders — skip those.
  if (llamaSlug && llamaSlug !== "ethereum") {
    push(llamaUrl(llamaSlug));
  }
  if (slug && slug !== "ethereum" && slug !== llamaSlug) {
    push(llamaUrl(slug));
  }

  push(FALLBACK_CHAIN_LOGO);
  return urls;
}

export function chainLogoUrl(
  chainId: number,
  name = "",
  mappedSlug?: string,
  icon?: string
): string {
  return chainLogoCandidates(chainId, name, icon, mappedSlug)[0];
}

export function tokenLogoUrl(symbol: string): string | undefined {
  const s = symbol.toUpperCase();
  const map: Record<string, string> = {
    ETH: "/web3icons/tokens/eth.svg",
    WETH: "/web3icons/tokens/eth.svg",
    USDC: "/web3icons/tokens/usdc.svg",
    USDT: "/web3icons/tokens/usdt.svg",
    BTC: "/web3icons/tokens/btc.svg",
    FBTC: "/web3icons/tokens/btc.svg",
    CBTC: "/web3icons/tokens/btc.svg",
    XRP: "/web3icons/tokens/xrp.svg",
    FXRP: "/web3icons/tokens/xrp.svg",
    FLR: "/flarelogo.png",
    C2FLR: "/flarelogo.png",
    CFLR: "/flarelogo.png",
    MATIC: "/web3icons/tokens/matic.svg",
    POL: "/web3icons/tokens/pol.svg",
    AVAX: "/web3icons/tokens/avax.svg",
    BNB: "/web3icons/tokens/bnb.svg",
    TBNB: "/web3icons/tokens/bnb.svg",
    DOGE: "/web3icons/tokens/doge.svg",
    FDOGE: "/web3icons/tokens/doge.svg",
    LTC: "/web3icons/tokens/ltc.svg",
    FLTC: "/web3icons/tokens/ltc.svg",
    FIL: "/web3icons/networks/filecoin.svg",
    TFIL: "/web3icons/networks/filecoin.svg",
    FLOW: "/chains/flow-llama.jpg",
    CELO: "/web3icons/networks/celo.svg",
    MON: "/monad_logo.png",
    OP: "/web3icons/tokens/op.svg",
    ARB: "/web3icons/tokens/arb.svg",
  };
  return map[s];
}
