import type { Chain } from "viem";
import type { ChainData } from "../types";
import catalog from "./chainCatalog1000.json";
import { chainLogoUrl } from "./chainLogos";

type CatalogEntry = {
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  rpc: string;
  explorer: string;
  testnet: boolean;
  id: string;
  logoChainId?: number;
  logoSlug?: string;
  icon?: string;
};

const entries = catalog as CatalogEntry[];

function estimateAvgTxCost(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s === "ETH" || s === "WETH") return 0.02;
  if (s === "BTC" || s === "CBTC" || s === "TBTC") return 0.08;
  if (s === "MATIC" || s === "POL" || s === "BNB" || s === "TBNB") return 0.01;
  return 0.015;
}

function estimateNativePrice(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s === "ETH" || s === "WETH") return 1900;
  if (s === "BTC" || s === "CBTC" || s === "TBTC") return 64000;
  if (s === "C2FLR" || s === "FLR" || s === "CFLR") return 0.006;
  if (s === "MATIC" || s === "POL") return 0.45;
  if (s === "AVAX") return 25;
  if (s === "BNB" || s === "TBNB") return 600;
  if (s === "MON") return 0.05;
  return 1;
}

function toViemChain(entry: CatalogEntry): Chain {
  return {
    id: entry.chainId,
    name: entry.name,
    nativeCurrency: {
      name: entry.symbol,
      symbol: entry.symbol,
      decimals: entry.decimals || 18,
    },
    rpcUrls: {
      default: { http: entry.rpc ? [entry.rpc] : [] },
      public: { http: entry.rpc ? [entry.rpc] : [] },
    },
    blockExplorers: entry.explorer
      ? {
          default: {
            name: "Explorer",
            url: entry.explorer,
          },
        }
      : undefined,
    testnet: entry.testnet,
  };
}

/** ~1000 EVM chains from Chainlist — selectable only when treasury is funded. */
export const CATALOG_CHAINS: ChainData[] = entries.map((entry) => ({
  id: entry.id,
  name: entry.name,
  symbol: entry.symbol,
  logo: chainLogoUrl(entry.chainId, entry.name, entry.logoSlug, entry.icon),
  avgTxCost: estimateAvgTxCost(entry.symbol),
  nativePrice: estimateNativePrice(entry.symbol),
  viemChain: toViemChain(entry),
}));

export const CATALOG_BY_NUMERIC_ID = new Map(
  CATALOG_CHAINS.map((c) => [c.viemChain.id, c])
);
