import { Chain } from "viem/chains";

/**
 * BOT Chain — the source chain for Gas Provider.
 * Users deposit here; the escrow/treasury contracts live here and the
 * dispersal service fans gas out to the destination chains.
 * See BOTCHAIN_MIGRATION.md (ADR-2).
 */
const NETWORKS = {
  mainnet: {
    id: 677,
    name: "BOT Chain",
    rpc: "https://rpc.botchain.ai",
    explorer: "https://scan.botchain.ai",
    usdt: "0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c",
  },
  testnet: {
    id: 968,
    name: "BOT Chain Testnet",
    rpc: "https://rpc.bohr.life",
    explorer: "https://scan.bohr.life",
    usdt: "0x75edC9335175Fc0552D51D48439F229c10420fe3",
  },
} as const;

const requested = (import.meta.env?.VITE_BOTCHAIN_NETWORK as string | undefined)?.trim().toLowerCase();
export const BOTCHAIN_NETWORK: "mainnet" | "testnet" = requested === "testnet" ? "testnet" : "mainnet";

const net = NETWORKS[BOTCHAIN_NETWORK];

export const BOT_CHAIN_ID = net.id;
export const BOT_CHAIN_RPC = (import.meta.env?.VITE_BOTCHAIN_RPC_URL as string | undefined)?.trim() || net.rpc;
export const BOT_CHAIN_EXPLORER = (import.meta.env?.VITE_BOTCHAIN_EXPLORER as string | undefined)?.trim() || net.explorer;
export const BOTCHAIN_USDT_ADDRESS = net.usdt;
export const BOTCHAIN_USDT_DECIMALS = 6;

export const botChain: Chain = {
  id: BOT_CHAIN_ID,
  name: net.name,
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [BOT_CHAIN_RPC] },
    public: { http: [BOT_CHAIN_RPC] },
  },
  blockExplorers: {
    default: { name: "BOTScan", url: BOT_CHAIN_EXPLORER },
  },
  testnet: BOTCHAIN_NETWORK === "testnet",
};
