/**
 * Token configuration for Treasury system
 * Requirements: 9.2, 13.3
 */

export interface TokenInfo {
  symbol: string;
  name: string;
  address?: string; // undefined for native tokens
  decimals: number;
  logo?: string;
  isNative?: boolean;
}

// Supported tokens per chain for Treasury system
export const SUPPORTED_TOKENS: Record<number, TokenInfo[]> = {
  // Coston2
  114: [
    {
      symbol: "C2FLR",
      name: "Coston2 Flare",
      decimals: 18,
      isNative: true,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x...", // TODO: Add actual USDC address on Coston2
      decimals: 6,
    },
    // FAssets (will be populated from environment or contract)
    {
      symbol: "FBTC",
      name: "Flare Bitcoin",
      address: "0x...", // Will be resolved from environment
      decimals: 8,
    },
    {
      symbol: "FXRP",
      name: "Flare XRP",
      address: "0x0b6A3645c240605887a5532109323A3E12273dc7",
      decimals: 6,
    },
    {
      symbol: "FDOGE",
      name: "Flare Dogecoin",
      address: "0x...", // Will be resolved from environment
      decimals: 8,
    },
    {
      symbol: "FLTC",
      name: "Flare Litecoin",
      address: "0x...", // Will be resolved from environment
      decimals: 8,
    },
  ],
  // Ethereum Sepolia
  11155111: [
    {
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      isNative: true,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x...", // TODO: Add actual USDC address on Sepolia
      decimals: 6,
    },
  ],
  // Polygon Amoy
  80002: [
    {
      symbol: "MATIC",
      name: "MATIC",
      decimals: 18,
      isNative: true,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x...", // TODO: Add actual USDC address on Amoy
      decimals: 6,
    },
  ],
  // Arbitrum Sepolia
  421614: [
    {
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      isNative: true,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x...", // TODO: Add actual USDC address on Arbitrum Sepolia
      decimals: 6,
    },
  ],
  // Optimism Sepolia
  11155420: [
    {
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      isNative: true,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x...", // TODO: Add actual USDC address on Optimism Sepolia
      decimals: 6,
    },
  ],
  // Base Sepolia
  84532: [
    {
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      isNative: true,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x...", // TODO: Add actual USDC address on Base Sepolia
      decimals: 6,
    },
  ],
  // World Sepolia
  4801: [
    {
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      isNative: true,
    },
  ],
  // Zora Sepolia
  999999999: [
    {
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      isNative: true,
    },
  ],
  // Scroll Sepolia
  534351: [
    {
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      isNative: true,
    },
  ],
  // Avalanche Fuji
  43113: [
    {
      symbol: "AVAX",
      name: "Avalanche",
      decimals: 18,
      isNative: true,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x...", // TODO: Add actual USDC address on Fuji
      decimals: 6,
    },
  ],
  // BSC Testnet
  97: [
    {
      symbol: "tBNB",
      name: "Test BNB",
      decimals: 18,
      isNative: true,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x...", // TODO: Add actual USDC address on BSC Testnet
      decimals: 6,
    },
  ],
  // Monad Testnet
  10143: [
    {
      symbol: "MON",
      name: "Monad",
      decimals: 18,
      isNative: true,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x...", // TODO: Add actual USDC address on Monad Testnet
      decimals: 6,
    },
  ],
  300: [{ symbol: "ETH", name: "Ether", decimals: 18, isNative: true }],
  314159: [{ symbol: "tFIL", name: "testnet FIL", decimals: 18, isNative: true }],
  1301: [{ symbol: "ETH", name: "Ether", decimals: 18, isNative: true }],
  48898: [{ symbol: "ETH", name: "Ether", decimals: 18, isNative: true }],
  5115: [{ symbol: "cBTC", name: "Citrea Bitcoin", decimals: 18, isNative: true }],
  545: [{ symbol: "FLOW", name: "Flow", decimals: 18, isNative: true }],
  44787: [{ symbol: "CELO", name: "CELO", decimals: 18, isNative: true }],
};

// Get supported tokens for a chain
export const getSupportedTokens = (chainId: number): TokenInfo[] => {
  return SUPPORTED_TOKENS[chainId] || [];
};

// Get token info by symbol and chain
export const getTokenInfo = (chainId: number, symbol: string): TokenInfo | undefined => {
  const tokens = getSupportedTokens(chainId);
  return tokens.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
};

// Get native token for a chain
export const getNativeToken = (chainId: number): TokenInfo | undefined => {
  const tokens = getSupportedTokens(chainId);
  return tokens.find((t) => t.isNative);
};

// Common stablecoins
export const STABLECOINS = ["USDC", "USDT", "DAI", "USDC.e"];

// Check if token is a stablecoin
export const isStablecoin = (symbol: string): boolean => {
  return STABLECOINS.includes(symbol.toUpperCase());
};

// Import Token type and chain utilities
import { Token } from "../types";
import { getNumericChainId } from "./chains";

// Token addresses for testnet chains only
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  // Coston2
  "114": {
    USDC: "0x...", // TODO: optional USDC on Coston2
    // Real FXRP on Coston2 (resolved via Flare Contract Registry → AssetManagerFXRP.fAsset)
    FXRP: "0x0b6A3645c240605887a5532109323A3E12273dc7",
    FBTC: "0x...",
    FDOGE: "0x...",
    FLTC: "0x...",
  },
  // Base Sepolia
  "84532": {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  // Arbitrum Sepolia
  "421614": {
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58cE45AF0F",
  },
  // Optimism Sepolia
  "11155420": {
    USDC: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
  },
  // Ethereum Sepolia
  "11155111": {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  },
  // BSC Testnet
  "97": {
    USDC: "0x64544969ed7EBf5f083679AA3252b7A6a4D4b77E",
  },
  // Avalanche Fuji
  "43113": {
    USDC: "0x5425890298aed601595a70AB815c96711a31Bc65",
  },
  // Scroll Sepolia
  "534351": {
    USDC: "0x02a3e7E0480B668bD46b42852C58363F93e3bE5a",
  },
  // Zora Sepolia
  "999999999": {
    USDC: "0x...", // TODO: Add actual USDC address on Zora Sepolia
  },
  // World Sepolia
  "4801": {
    USDC: "0x...", // TODO: Add actual USDC address on World Sepolia
  },
  // Polygon Amoy
  "80002": {
    USDC: "0x...", // TODO: Add actual USDC address on Polygon Amoy
  },
  // Monad Testnet
  "10143": {
    USDC: "0x...", // TODO: Add actual USDC address on Monad Testnet
  },
};

// Get token address for a chain and symbol
export const getTokenAddress = (
  chainId: string | number,
  symbol: string
): string | null => {
  const numericId = typeof chainId === "string" ? getNumericChainId(chainId) : chainId;
  if (!numericId) return null;

  const chainIdStr = String(numericId);
  const addresses = TOKEN_ADDRESSES[chainIdStr];
  if (!addresses) return null;

  const address = addresses[symbol.toUpperCase()];
  return address && address !== "0x..." ? address : null;
};

// Logo mapping for tokens
const TOKEN_LOGO_MAP: Record<string, string> = {
  ETH: "/web3icons/tokens/eth.svg",
  C2FLR: "/flarelogo.png",
  FLR: "/flarelogo.png",
  MATIC: "/web3icons/tokens/matic.svg",
  POL: "/web3icons/tokens/pol.svg",
  AVAX: "/web3icons/tokens/avax.svg",
  tBNB: "/web3icons/tokens/bnb.svg",
  BNB: "/web3icons/tokens/bnb.svg",
  MON: "/monad_logo.png",
  USDC: "/web3icons/tokens/usdc.svg",
  USDT: "/web3icons/tokens/usdt.svg",
  FBTC: "/web3icons/tokens/btc.svg",
  FXRP: "/web3icons/tokens/xrp.svg",
  FDOGE: "/web3icons/tokens/doge.svg",
  FLTC: "/web3icons/tokens/ltc.svg",
  tFIL: "/web3icons/networks/filecoin.svg",
  FIL: "/web3icons/networks/filecoin.svg",
  FLOW: "/chains/flow-llama.jpg",
  CELO: "/web3icons/networks/celo.svg",
  cBTC: "/web3icons/networks/citrea.svg",
};

// Get tokens for a specific chain (returns Token[] format)
export const getTokensForChain = (chainId: string | number): Token[] => {
  const numericId = typeof chainId === "string" ? getNumericChainId(chainId) : chainId;
  if (!numericId) return [];

  const tokenInfos = getSupportedTokens(numericId);
  return tokenInfos.map((tokenInfo) => ({
    symbol: tokenInfo.symbol,
    name: tokenInfo.name,
    balance: 0, // Balance will be fetched separately
    logo: tokenInfo.logo || TOKEN_LOGO_MAP[tokenInfo.symbol] || "",
    isNative: tokenInfo.isNative || false,
    address: tokenInfo.address || getTokenAddress(numericId, tokenInfo.symbol),
    isLoading: false,
  }));
};

// All available tokens across all chains (flattened)
// This is used by components that need a list of all possible tokens
export const tokens: Token[] = [
  // Native tokens
  {
    symbol: "ETH",
    name: "Ethereum",
    balance: 0,
    logo: "/web3icons/tokens/eth.svg",
    isNative: true,
    address: null,
    isLoading: false,
  },
  {
    symbol: "C2FLR",
    name: "Coston2 Flare",
    balance: 0,
    logo: "/flarelogo.png",
    isNative: true,
    address: null,
    isLoading: false,
  },
  {
    symbol: "FLR",
    name: "Flare",
    balance: 0,
    logo: "/flarelogo.png",
    isNative: true,
    address: null,
    isLoading: false,
  },
  {
    symbol: "MATIC",
    name: "MATIC",
    balance: 0,
    logo: "/web3icons/tokens/matic.svg",
    isNative: true,
    address: null,
    isLoading: false,
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    balance: 0,
    logo: "/web3icons/tokens/avax.svg",
    isNative: true,
    address: null,
    isLoading: false,
  },
  {
    symbol: "tBNB",
    name: "Test BNB",
    balance: 0,
    logo: "/web3icons/tokens/bnb.svg",
    isNative: true,
    address: null,
    isLoading: false,
  },
  {
    symbol: "MON",
    name: "Monad",
    balance: 0,
    logo: "/monad_logo.png",
    isNative: true,
    address: null,
    isLoading: false,
  },
  // Stablecoins
  {
    symbol: "USDC",
    name: "USD Coin",
    balance: 0,
    logo: "/web3icons/tokens/usdc.svg",
    isNative: false,
    address: null, // Address will be resolved per chain
    isLoading: false,
  },
  // FAssets (Flare Wrapped Assets)
  {
    symbol: "FBTC",
    name: "Flare Bitcoin",
    balance: 0,
    logo: "/web3icons/tokens/btc.svg",
    isNative: false,
    address: null, // Address will be resolved per chain
    isLoading: false,
    isFAsset: true,
    underlyingAsset: "BTC",
    underlyingLogo: "/web3icons/tokens/btc.svg",
  },
  {
    symbol: "FXRP",
    name: "Flare XRP",
    balance: 0,
    logo: "/web3icons/tokens/xrp.svg",
    isNative: false,
    address: null, // Address will be resolved per chain
    isLoading: false,
    isFAsset: true,
    underlyingAsset: "XRP",
    underlyingLogo: "/web3icons/tokens/xrp.svg",
  },
  {
    symbol: "FDOGE",
    name: "Flare Dogecoin",
    balance: 0,
    logo: "/web3icons/tokens/doge.svg",
    isNative: false,
    address: null, // Address will be resolved per chain
    isLoading: false,
    isFAsset: true,
    underlyingAsset: "DOGE",
    underlyingLogo: "/web3icons/tokens/doge.svg",
  },
  {
    symbol: "FLTC",
    name: "Flare Litecoin",
    balance: 0,
    logo: "/web3icons/tokens/ltc.svg",
    isNative: false,
    address: null, // Address will be resolved per chain
    isLoading: false,
    isFAsset: true,
    underlyingAsset: "LTC",
    underlyingLogo: "/web3icons/tokens/ltc.svg",
  },
];
