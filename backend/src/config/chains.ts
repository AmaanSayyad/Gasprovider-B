/**
 * Chain configuration with RPC URLs and contract addresses
 * TODO: Move RPC URLs to environment variables for production
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress?: string; // Escrow contract address on this chain
  explorerUrl: string;
  nativeSymbol: string;
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Coston2 Testnet
  114: {
    chainId: 114,
    name: "Coston2",
    rpcUrl:
      process.env.COSTON2_RPC_URL ||
      "https://coston2-api.flare.network/ext/C/rpc",
    explorerUrl: "https://coston2-explorer.flare.network",
    nativeSymbol: "C2FLR",
    contractAddress: process.env.CONTRACT_ADDRESS_114,
  },
  // BSC Testnet
  97: {
    chainId: 97,
    name: "BSC Testnet",
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com",
    explorerUrl: "https://testnet.bscscan.com",
    nativeSymbol: "tBNB",
    contractAddress: process.env.TREASURY_BSC_TESTNET_ADDRESS || "0x5b402676535a3ba75c851c14e1e249a4257d2265",
  },
  // Treasury Demo System - Testnets
  // Ethereum Sepolia
  11155111: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
    nativeSymbol: "ETH",
    contractAddress: process.env.TREASURY_SEPOLIA_ADDRESS,
  },
  // Polygon Amoy (Mumbai replacement)
  80002: {
    chainId: 80002,
    name: "Polygon Amoy",
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
    explorerUrl: "https://amoy.polygonscan.com",
    nativeSymbol: "MATIC",
    contractAddress: process.env.TREASURY_POLYGON_AMOY_ADDRESS,
  },
  // Arbitrum Sepolia
  421614: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    nativeSymbol: "ETH",
    contractAddress: process.env.TREASURY_ARBITRUM_SEPOLIA_ADDRESS,
  },
  // Optimism Sepolia
  11155420: {
    chainId: 11155420,
    name: "Optimism Sepolia",
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL || "https://sepolia.optimism.io",
    explorerUrl: "https://sepolia-optimism.etherscan.io",
    nativeSymbol: "ETH",
    contractAddress: process.env.TREASURY_OPTIMISM_SEPOLIA_ADDRESS,
  },
  // Avalanche Fuji Testnet
  43113: {
    chainId: 43113,
    name: "Avalanche Fuji",
    rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
    explorerUrl: "https://testnet.snowtrace.io",
    nativeSymbol: "AVAX",
    contractAddress: process.env.TREASURY_AVALANCHE_FUJI_ADDRESS,
  },
  // Base Sepolia
  84532: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    nativeSymbol: "ETH",
    contractAddress: process.env.TREASURY_BASE_SEPOLIA_ADDRESS,
  },
  // World Sepolia
  4801: {
    chainId: 4801,
    name: "World Sepolia",
    rpcUrl: process.env.WORLD_SEPOLIA_RPC_URL || "https://worldchain-sepolia.g.alchemy.com/public",
    explorerUrl: "https://worldchain-sepolia.explorer.alchemy.com",
    nativeSymbol: "ETH",
    contractAddress: process.env.TREASURY_WORLD_SEPOLIA_ADDRESS,
  },
  // Zora Sepolia
  999999999: {
    chainId: 999999999,
    name: "Zora Sepolia",
    rpcUrl: process.env.ZORA_SEPOLIA_RPC_URL || "https://sepolia.rpc.zora.energy",
    explorerUrl: "https://sepolia.explorer.zora.energy",
    nativeSymbol: "ETH",
    contractAddress: process.env.TREASURY_ZORA_SEPOLIA_ADDRESS,
  },
  // Scroll Sepolia
  534351: {
    chainId: 534351,
    name: "Scroll Sepolia",
    rpcUrl: process.env.SCROLL_SEPOLIA_RPC_URL || "https://sepolia-rpc.scroll.io",
    explorerUrl: "https://sepolia.scrollscan.com",
    nativeSymbol: "ETH",
    contractAddress: process.env.TREASURY_SCROLL_SEPOLIA_ADDRESS,
  },
  // Monad Testnet
  10143: {
    chainId: 10143,
    name: "Monad Testnet",
    rpcUrl: process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz",
    explorerUrl: "https://testnet.monadvision.com",
    nativeSymbol: "MON",
    contractAddress: process.env.TREASURY_MONAD_TESTNET_ADDRESS,
  },
  // zkSync Sepolia
  300: {
    chainId: 300,
    name: "zkSync Sepolia",
    rpcUrl: process.env.ZKSYNC_SEPOLIA_RPC_URL || "https://sepolia.era.zksync.dev",
    explorerUrl: "https://sepolia.explorer.zksync.io",
    nativeSymbol: "ETH",
    contractAddress: process.env.TREASURY_ZKSYNC_SEPOLIA_ADDRESS || "0x5b402676535a3ba75c851c14e1e249a4257d2265",
  },
  // Filecoin Calibration
  314159: {
    chainId: 314159,
    name: "Filecoin Calibration",
    rpcUrl: process.env.FILECOIN_CALIBRATION_RPC_URL || "https://api.calibration.node.glif.io/rpc/v1",
    explorerUrl: "https://calibration.filfox.info/en",
    nativeSymbol: "tFIL",
    contractAddress: process.env.TREASURY_FILECOIN_CALIBRATION_ADDRESS || "0x5b402676535a3ba75c851c14e1e249a4257d2265",
  },
  // Unichain Sepolia
  1301: {
    chainId: 1301,
    name: "Unichain Sepolia",
    rpcUrl: process.env.UNICHAIN_SEPOLIA_RPC_URL || "https://sepolia.unichain.org",
    explorerUrl: "https://sepolia.uniscan.xyz",
    nativeSymbol: "ETH",
    contractAddress: process.env.TREASURY_UNICHAIN_SEPOLIA_ADDRESS || "0x5b402676535a3ba75c851c14e1e249a4257d2265",
  },
  // Zircuit Garfield Testnet
  48898: {
    chainId: 48898,
    name: "Zircuit Garfield",
    rpcUrl: process.env.ZIRCUIT_GARFIELD_RPC_URL || "https://garfield-testnet.zircuit.com",
    explorerUrl: "https://explorer.garfield-testnet.zircuit.com",
    nativeSymbol: "ETH",
    contractAddress: process.env.TREASURY_ZIRCUIT_GARFIELD_ADDRESS || "0x5b402676535a3ba75c851c14e1e249a4257d2265",
  },
  // Citrea Testnet
  5115: {
    chainId: 5115,
    name: "Citrea Testnet",
    rpcUrl: process.env.CITREA_TESTNET_RPC_URL || "https://rpc.testnet.citrea.xyz",
    explorerUrl: "https://explorer.testnet.citrea.xyz",
    nativeSymbol: "cBTC",
    contractAddress: process.env.TREASURY_CITREA_TESTNET_ADDRESS || "0x5b402676535a3ba75c851c14e1e249a4257d2265",
  },
  // Flow EVM Testnet
  545: {
    chainId: 545,
    name: "Flow EVM Testnet",
    rpcUrl: process.env.FLOW_EVM_TESTNET_RPC_URL || "https://testnet.evm.nodes.onflow.org",
    explorerUrl: "https://evm-testnet.flowscan.io",
    nativeSymbol: "FLOW",
    contractAddress: process.env.TREASURY_FLOW_EVM_TESTNET_ADDRESS || "0x5b402676535a3ba75c851c14e1e249a4257d2265",
  },
  // Celo Alfajores
  44787: {
    chainId: 44787,
    name: "Celo Alfajores",
    rpcUrl: process.env.CELO_ALFAJORES_RPC_URL || "https://alfajores-forno.celo-testnet.org",
    explorerUrl: "https://alfajores.celoscan.io",
    nativeSymbol: "CELO",
    contractAddress: process.env.TREASURY_CELO_ALFAJORES_ADDRESS || "0x5b402676535a3ba75c851c14e1e249a4257d2265",
  },
};

/**
 * Get chain configuration by chain ID
 */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

/**
 * Get contract address for a chain
 * TODO: Load from environment variables or a registry
 */
export function getContractAddress(chainId: number): string | undefined {
  const config = getChainConfig(chainId);
  return config?.contractAddress || process.env[`CONTRACT_ADDRESS_${chainId}`];
}
