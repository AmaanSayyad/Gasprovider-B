import {
  Chain,
} from "viem/chains";
import { ChainData } from "../types";
import { chainLogoUrl } from "./chainLogos";

// Treasury contract addresses for all supported chains
// Requirements: 1.1, 9.1, 13.4
export const TREASURY_ADDRESSES: Record<number, string> = {
  114: "0xc031c437d6b915dbdc946dbd8613a1ac9dd75d63", // Coston2
  11155111: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Ethereum Sepolia
  80002: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Polygon Amoy
  421614: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Arbitrum Sepolia
  11155420: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Optimism Sepolia
  84532: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Base Sepolia
  4801: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // World Sepolia
  999999999: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Zora Sepolia
  534351: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Scroll Sepolia
  43113: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Avalanche Fuji
  97: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // BSC Testnet
  10143: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Monad Testnet
  300: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // zkSync Sepolia
  314159: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Filecoin Calibration
  1301: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Unichain Sepolia
  48898: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Zircuit Garfield
  5115: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Citrea Testnet
  545: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Flow EVM Testnet
  44787: "0x5b402676535a3ba75c851c14e1e249a4257d2265", // Celo Alfajores
};

// Define Flare testnet chain (not in viem/chains yet)
const coston2: Chain = {
  id: 114,
  name: "Coston2",
  nativeCurrency: {
    name: "Coston2 Flare",
    symbol: "C2FLR",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://coston2-api.flare.network/ext/C/rpc"],
    },
    public: {
      http: ["https://coston2-api.flare.network/ext/C/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Coston2 Explorer",
      url: "https://coston2-explorer.flare.network",
    },
  },
  testnet: true,
};

// Define testnet chains for Treasury system
// Requirements: 13.4
const sepolia: Chain = {
  id: 11155111,
  name: "Ethereum Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.org"],
    },
    public: {
      http: ["https://rpc.sepolia.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
    },
  },
  testnet: true,
};

const polygonAmoy: Chain = {
  id: 80002,
  name: "Polygon Amoy",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-amoy.polygon.technology"],
    },
    public: {
      http: ["https://rpc-amoy.polygon.technology"],
    },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: "https://amoy.polygonscan.com",
    },
  },
  testnet: true,
};

const arbitrumSepolia: Chain = {
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia-rollup.arbitrum.io/rpc"],
    },
    public: {
      http: ["https://sepolia-rollup.arbitrum.io/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://sepolia.arbiscan.io",
    },
  },
  testnet: true,
};

const optimismSepolia: Chain = {
  id: 11155420,
  name: "Optimism Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia.optimism.io"],
    },
    public: {
      http: ["https://sepolia.optimism.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia-optimism.etherscan.io",
    },
  },
  testnet: true,
};

const baseSepolia: Chain = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia.base.org"],
    },
    public: {
      http: ["https://sepolia.base.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://sepolia.basescan.org",
    },
  },
  testnet: true,
};

const worldSepolia: Chain = {
  id: 4801,
  name: "World Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://worldchain-sepolia.g.alchemy.com/public"],
    },
    public: {
      http: ["https://worldchain-sepolia.g.alchemy.com/public"],
    },
  },
  blockExplorers: {
    default: {
      name: "World Explorer",
      url: "https://worldchain-sepolia.explorer.alchemy.com",
    },
  },
  testnet: true,
};

const zoraSepolia: Chain = {
  id: 999999999,
  name: "Zora Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia.rpc.zora.energy"],
    },
    public: {
      http: ["https://sepolia.rpc.zora.energy"],
    },
  },
  blockExplorers: {
    default: {
      name: "Zora Explorer",
      url: "https://sepolia.explorer.zora.energy",
    },
  },
  testnet: true,
};

const scrollSepolia: Chain = {
  id: 534351,
  name: "Scroll Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia-rpc.scroll.io"],
    },
    public: {
      http: ["https://sepolia-rpc.scroll.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Scrollscan",
      url: "https://sepolia.scrollscan.com",
    },
  },
  testnet: true,
};

const avalancheFuji: Chain = {
  id: 43113,
  name: "Avalanche Fuji",
  nativeCurrency: {
    name: "AVAX",
    symbol: "AVAX",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://api.avax-test.network/ext/bc/C/rpc"],
    },
    public: {
      http: ["https://api.avax-test.network/ext/bc/C/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "SnowTrace",
      url: "https://testnet.snowtrace.io",
    },
  },
  testnet: true,
};

const monadTestnet: Chain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
    public: {
      http: ["https://testnet-rpc.monad.xyz", "https://rpc.ankr.com/monad_testnet"],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://testnet.monadvision.com",
    },
  },
  testnet: true,
};

const zkSyncSepolia: Chain = {
  id: 300,
  name: "zkSync Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.era.zksync.dev"] },
    public: { http: ["https://sepolia.era.zksync.dev"] },
  },
  blockExplorers: {
    default: { name: "zkSync Explorer", url: "https://sepolia.explorer.zksync.io" },
  },
  testnet: true,
};

const filecoinCalibration: Chain = {
  id: 314159,
  name: "Filecoin Calibration",
  nativeCurrency: { name: "testnet FIL", symbol: "tFIL", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.calibration.node.glif.io/rpc/v1"] },
    public: { http: ["https://api.calibration.node.glif.io/rpc/v1"] },
  },
  blockExplorers: {
    default: { name: "Filfox", url: "https://calibration.filfox.info/en" },
  },
  testnet: true,
};

const unichainSepolia: Chain = {
  id: 1301,
  name: "Unichain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.unichain.org"] },
    public: { http: ["https://sepolia.unichain.org"] },
  },
  blockExplorers: {
    default: { name: "Uniscan", url: "https://sepolia.uniscan.xyz" },
  },
  testnet: true,
};

const zircuitGarfield: Chain = {
  id: 48898,
  name: "Zircuit Garfield",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://garfield-testnet.zircuit.com"] },
    public: { http: ["https://garfield-testnet.zircuit.com"] },
  },
  blockExplorers: {
    default: { name: "Zircuit Explorer", url: "https://explorer.garfield-testnet.zircuit.com" },
  },
  testnet: true,
};

const citreaTestnet: Chain = {
  id: 5115,
  name: "Citrea Testnet",
  nativeCurrency: { name: "Citrea Bitcoin", symbol: "cBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.citrea.xyz"] },
    public: { http: ["https://rpc.testnet.citrea.xyz"] },
  },
  blockExplorers: {
    default: { name: "Citrea Explorer", url: "https://explorer.testnet.citrea.xyz" },
  },
  testnet: true,
};

const flowEvmTestnet: Chain = {
  id: 545,
  name: "Flow EVM Testnet",
  nativeCurrency: { name: "Flow", symbol: "FLOW", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.evm.nodes.onflow.org"] },
    public: { http: ["https://testnet.evm.nodes.onflow.org"] },
  },
  blockExplorers: {
    default: { name: "Flowscan", url: "https://evm-testnet.flowscan.io" },
  },
  testnet: true,
};

const celoAlfajores: Chain = {
  id: 44787,
  name: "Celo Alfajores",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://alfajores-forno.celo-testnet.org"] },
    public: { http: ["https://alfajores-forno.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "CeloScan", url: "https://alfajores.celoscan.io" },
  },
  testnet: true,
};

// Map chain IDs to viem chain objects (testnets only)
const chainIdMap: Record<string, Chain> = {
  coston2: coston2,
  // Testnet chains for Treasury
  sepolia: sepolia,
  polygonAmoy: polygonAmoy,
  arbitrumSepolia: arbitrumSepolia,
  optimismSepolia: optimismSepolia,
  baseSepolia: baseSepolia,
  worldSepolia: worldSepolia,
  zoraSepolia: zoraSepolia,
  scrollSepolia: scrollSepolia,
  avalancheFuji: avalancheFuji,
  monadTestnet: monadTestnet,
  zkSyncSepolia: zkSyncSepolia,
  filecoinCalibration: filecoinCalibration,
  unichainSepolia: unichainSepolia,
  zircuitGarfield: zircuitGarfield,
  citreaTestnet: citreaTestnet,
  flowEvmTestnet: flowEvmTestnet,
  celoAlfajores: celoAlfajores,
};

// All available chains (testnets only)
const allChains: ChainData[] = [
  {
    id: "coston2",
    name: "Coston2",
    symbol: "C2FLR",
    logo: chainLogoUrl(114, "Coston2"),
    // ~1 simple transfer on Flare C-chain (very cheap)
    avgTxCost: 0.002,
    nativePrice: 0.006,
    viemChain: coston2,
  },
  // Testnet chains for Treasury system
  {
    id: "sepolia",
    name: "Ethereum Sepolia",
    symbol: "ETH",
    logo: chainLogoUrl(11155111, "Ethereum Sepolia"),
    // L1-style buffer (~0.00008 ETH @ ~$1900)
    avgTxCost: 0.15,
    nativePrice: 1900,
    viemChain: sepolia,
  },
  {
    id: "polygonAmoy",
    name: "Polygon Amoy",
    symbol: "MATIC",
    logo: chainLogoUrl(80002, "Polygon Amoy"),
    avgTxCost: 0.008,
    nativePrice: 0.45,
    viemChain: polygonAmoy,
  },
  {
    id: "arbitrumSepolia",
    name: "Arbitrum Sepolia",
    symbol: "ETH",
    logo: chainLogoUrl(421614, "Arbitrum Sepolia"),
    // Typical L2 simple tx buffer
    avgTxCost: 0.025,
    nativePrice: 1900,
    viemChain: arbitrumSepolia,
  },
  {
    id: "optimismSepolia",
    name: "Optimism Sepolia",
    symbol: "ETH",
    logo: chainLogoUrl(11155420, "Optimism Sepolia"),
    avgTxCost: 0.02,
    nativePrice: 1900,
    viemChain: optimismSepolia,
  },
  {
    id: "baseSepolia",
    name: "Base Sepolia",
    symbol: "ETH",
    logo: chainLogoUrl(84532, "Base Sepolia"),
    avgTxCost: 0.012,
    nativePrice: 1900,
    viemChain: baseSepolia,
  },
  {
    id: "worldSepolia",
    name: "World Sepolia",
    symbol: "ETH",
    logo: chainLogoUrl(4801, "World Sepolia"),
    avgTxCost: 0.015,
    nativePrice: 1900,
    viemChain: worldSepolia,
  },
  {
    id: "zoraSepolia",
    name: "Zora Sepolia",
    symbol: "ETH",
    logo: chainLogoUrl(999999999, "Zora Sepolia"),
    avgTxCost: 0.015,
    nativePrice: 1900,
    viemChain: zoraSepolia,
  },
  {
    id: "scrollSepolia",
    name: "Scroll Sepolia",
    symbol: "ETH",
    logo: chainLogoUrl(534351, "Scroll Sepolia"),
    avgTxCost: 0.03,
    nativePrice: 1900,
    viemChain: scrollSepolia,
  },
  {
    id: "avalancheFuji",
    name: "Avalanche Fuji",
    symbol: "AVAX",
    logo: chainLogoUrl(43113, "Avalanche Fuji"),
    avgTxCost: 0.04,
    nativePrice: 25,
    viemChain: avalancheFuji,
  },
  {
    id: "monadTestnet",
    name: "Monad Testnet",
    symbol: "MON",
    logo: chainLogoUrl(10143, "Monad Testnet"),
    avgTxCost: 0.008,
    nativePrice: 0.05,
    viemChain: monadTestnet,
  },
  {
    id: "zkSyncSepolia",
    name: "zkSync Sepolia",
    symbol: "ETH",
    logo: chainLogoUrl(300, "zkSync Sepolia"),
    avgTxCost: 0.015,
    nativePrice: 1900,
    viemChain: zkSyncSepolia,
  },
  {
    id: "filecoinCalibration",
    name: "Filecoin Calibration",
    symbol: "tFIL",
    logo: chainLogoUrl(314159, "Filecoin Calibration"),
    avgTxCost: 0.04,
    nativePrice: 4,
    viemChain: filecoinCalibration,
  },
  {
    id: "unichainSepolia",
    name: "Unichain Sepolia",
    symbol: "ETH",
    logo: chainLogoUrl(1301, "Unichain Sepolia"),
    avgTxCost: 0.012,
    nativePrice: 1900,
    viemChain: unichainSepolia,
  },
  {
    id: "zircuitGarfield",
    name: "Zircuit Garfield",
    symbol: "ETH",
    logo: chainLogoUrl(48898, "Zircuit Garfield"),
    avgTxCost: 0.015,
    nativePrice: 1900,
    viemChain: zircuitGarfield,
  },
  {
    id: "citreaTestnet",
    name: "Citrea Testnet",
    symbol: "cBTC",
    logo: chainLogoUrl(5115, "Citrea Testnet"),
    avgTxCost: 0.08,
    nativePrice: 64000,
    viemChain: citreaTestnet,
  },
  {
    id: "flowEvmTestnet",
    name: "Flow EVM Testnet",
    symbol: "FLOW",
    logo: chainLogoUrl(545, "Flow EVM Testnet"),
    avgTxCost: 0.01,
    nativePrice: 0.4,
    viemChain: flowEvmTestnet,
  },
  {
    id: "celoAlfajores",
    name: "Celo Alfajores",
    symbol: "CELO",
    logo: chainLogoUrl(44787, "Celo Alfajores"),
    avgTxCost: 0.01,
    nativePrice: 0.35,
    viemChain: celoAlfajores,
  },
];

// Destination catalog: curated Flare demo chains first, then ~1000 EVM chains.
// Selectable only when the destination treasury actually has native balance.
import { CATALOG_CHAINS } from "./catalogChains";

const destinationChainIds = [
  "coston2",
  "optimismSepolia",
  "worldSepolia",
  "baseSepolia",
  "polygonAmoy",
  "zoraSepolia",
  "scrollSepolia",
  "zkSyncSepolia",
  "filecoinCalibration",
  "unichainSepolia",
  "zircuitGarfield",
  "citreaTestnet",
  "flowEvmTestnet",
  "celoAlfajores",
] as const;

/** Chains hidden from destination selection (unstable / underfunded operator gas). */
const DISABLED_DESTINATION_IDS = new Set([
  "sepolia", // Ethereum Sepolia
  "arbitrumSepolia",
]);

const DISABLED_DESTINATION_NUMERIC_IDS = new Set([
  11155111, // Ethereum Sepolia
  421614, // Arbitrum Sepolia
]);

/** Pre-select these so a demo doesn't auto-include unfunded chains. */
export const DEFAULT_DESTINATION_IDS = [
  "coston2",
  "optimismSepolia",
  "worldSepolia",
  "baseSepolia",
] as const;

export const SOURCE_CHAINS = ["coston2", "monadTestnet"]
  .map((id) => allChains.find((chain) => chain.id === id))
  .filter((chain): chain is ChainData => chain !== undefined);

const curatedDestinations = destinationChainIds
  .map((id) => allChains.find((chain) => chain.id === id))
  .filter((chain): chain is ChainData => chain !== undefined)
  .filter((chain) => !DISABLED_DESTINATION_IDS.has(chain.id));

const curatedNumericIds = new Set(
  curatedDestinations.map((c) => c.viemChain.id)
);

/** Full destination list: curated branding first, then Chainlist (~1000). */
export const DESTINATION_CHAINS: ChainData[] = [
  ...curatedDestinations,
  ...CATALOG_CHAINS.filter(
    (c) =>
      !curatedNumericIds.has(c.viemChain.id) &&
      !DISABLED_DESTINATION_NUMERIC_IDS.has(c.viemChain.id)
  ),
].slice(0, 1000);

export const DEFAULT_DESTINATION_CHAINS = DEFAULT_DESTINATION_IDS
  .map((id) => allChains.find((chain) => chain.id === id))
  .filter((chain): chain is ChainData => chain !== undefined);

// UI list = destinations + any source-only extras (e.g. Monad)
const destinationIds = new Set(DESTINATION_CHAINS.map((c) => c.id));
export const chains: ChainData[] = [
  ...DESTINATION_CHAINS,
  ...allChains.filter((c) => !destinationIds.has(c.id)),
];

export const getViemChain = (chainId: string): Chain | undefined => {
  return (
    chainIdMap[chainId] ||
    DESTINATION_CHAINS.find((c) => c.id === chainId)?.viemChain
  );
};

// Map numeric chain IDs to string chain IDs
export const getChainIdFromNumeric = (
  numericChainId: number
): string | undefined => {
  const chain = chains.find((c) => c.viemChain.id === numericChainId);
  return chain?.id;
};

// Map string chain IDs to numeric chain IDs
export const getNumericChainId = (chainId: string): number | undefined => {
  const chain = chains.find((c) => c.id === chainId);
  return chain?.viemChain.id;
};

// Get explorer URL for a chain
export const getExplorerUrl = (chainId: string): string => {
  const chain = chains.find((c) => c.id === chainId);
  if (!chain) return "https://basescan.org";

  // Use blockExplorer from viem chain if available
  const explorer = chain.viemChain.blockExplorers?.default;
  if (explorer?.url) {
    return explorer.url;
  }

  // Fallback to known explorers
  const explorerMap: Record<string, string> = {
    base: "https://basescan.org",
    arb: "https://arbiscan.io",
    op: "https://optimistic.etherscan.io",
    eth: "https://etherscan.io",
  };

  return explorerMap[chainId] || "https://basescan.org";
};

// Get Treasury contract address for a chain
export const getTreasuryAddress = (chainId: number): string | undefined => {
  return TREASURY_ADDRESSES[chainId];
};

// Get Treasury contract address by string chain ID
export const getTreasuryAddressByStringId = (chainId: string): string | undefined => {
  const numericId = getNumericChainId(chainId);
  return numericId ? TREASURY_ADDRESSES[numericId] : undefined;
};

export { chainIdMap };
