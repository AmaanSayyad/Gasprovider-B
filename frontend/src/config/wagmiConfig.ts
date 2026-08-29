import { createConfig, http } from "wagmi";
import { sepolia, bscTestnet, avalancheFuji } from "wagmi/chains";

// Custom testnet chain definitions
const coston2 = {
  id: 114,
  name: "Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] },
    public: { http: ["https://coston2-api.flare.network/ext/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Coston2 Explorer", url: "https://coston2-explorer.flare.network" },
  },
  testnet: true,
} as const;

const baseSepolia = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] },
    public: { http: ["https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://sepolia.basescan.org" },
  },
  testnet: true,
} as const;

const arbitrumSepolia = {
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia-rollup.arbitrum.io/rpc"] },
    public: { http: ["https://sepolia-rollup.arbitrum.io/rpc"] },
  },
  blockExplorers: {
    default: { name: "Arbiscan", url: "https://sepolia.arbiscan.io" },
  },
  testnet: true,
} as const;

const optimismSepolia = {
  id: 11155420,
  name: "Optimism Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.optimism.io"] },
    public: { http: ["https://sepolia.optimism.io"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia-optimism.etherscan.io" },
  },
  testnet: true,
} as const;

const polygonAmoy = {
  id: 80002,
  name: "Polygon Amoy",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc-amoy.polygon.technology"] },
    public: { http: ["https://rpc-amoy.polygon.technology"] },
  },
  blockExplorers: {
    default: { name: "PolygonScan", url: "https://amoy.polygonscan.com" },
  },
  testnet: true,
} as const;

const scrollSepolia = {
  id: 534351,
  name: "Scroll Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia-rpc.scroll.io"] },
    public: { http: ["https://sepolia-rpc.scroll.io"] },
  },
  blockExplorers: {
    default: { name: "Scrollscan", url: "https://sepolia.scrollscan.com" },
  },
  testnet: true,
} as const;

const zoraSepolia = {
  id: 999999999,
  name: "Zora Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.rpc.zora.energy"] },
    public: { http: ["https://sepolia.rpc.zora.energy"] },
  },
  blockExplorers: {
    default: { name: "Zora Explorer", url: "https://sepolia.explorer.zora.energy" },
  },
  testnet: true,
} as const;

const worldSepolia = {
  id: 4801,
  name: "World Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://worldchain-sepolia.g.alchemy.com/public"] },
    public: { http: ["https://worldchain-sepolia.g.alchemy.com/public"] },
  },
  blockExplorers: {
    default: { name: "World Explorer", url: "https://worldchain-sepolia.explorer.alchemy.com" },
  },
  testnet: true,
} as const;

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
    public: { http: ["https://testnet-rpc.monad.xyz", "https://rpc.ankr.com/monad_testnet"] },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://testnet.monadvision.com" },
  },
  testnet: true,
} as const;

const zkSyncSepolia = {
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
} as const;

const filecoinCalibration = {
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
} as const;

const unichainSepolia = {
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
} as const;

const zircuitGarfield = {
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
} as const;

const citreaTestnet = {
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
} as const;

const flowEvmTestnet = {
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
} as const;

const celoAlfajores = {
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
} as const;

// Create wagmi config for direct wagmi usage (testnets only)
// This is used by WagmiProvider in App.tsx
export const wagmiConfig = createConfig({
  chains: [
    coston2,
    sepolia,
    baseSepolia,
    arbitrumSepolia,
    optimismSepolia,
    polygonAmoy,
    bscTestnet,
    avalancheFuji,
    scrollSepolia,
    zoraSepolia,
    worldSepolia,
    monadTestnet,
    zkSyncSepolia,
    filecoinCalibration,
    unichainSepolia,
    zircuitGarfield,
    citreaTestnet,
    flowEvmTestnet,
    celoAlfajores,
  ],
  transports: {
    [coston2.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [bscTestnet.id]: http(),
    [avalancheFuji.id]: http(),
    [scrollSepolia.id]: http(),
    [zoraSepolia.id]: http(),
    [worldSepolia.id]: http(),
    [monadTestnet.id]: http(),
    [zkSyncSepolia.id]: http(),
    [filecoinCalibration.id]: http(),
    [unichainSepolia.id]: http(),
    [zircuitGarfield.id]: http(),
    [citreaTestnet.id]: http(),
    [flowEvmTestnet.id]: http(),
    [celoAlfajores.id]: http(),
  },
});

