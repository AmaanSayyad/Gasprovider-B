/**
 * RPC endpoint configuration with fallback support
 * Supports multiple RPC endpoints per chain for automatic failover
 */

export interface RpcEndpoint {
  url: string;
  priority: number; // Lower number = higher priority
  healthCheckUrl?: string; // Optional custom health check endpoint
}

export interface ChainRpcConfig {
  chainId: number;
  endpoints: RpcEndpoint[];
  healthCheckInterval?: number; // Milliseconds between health checks
}

/**
 * RPC endpoint configurations for all supported chains
 * Primary endpoints are loaded from environment variables
 * Fallback endpoints are public RPC providers
 */
export const RPC_CONFIGS: Record<number, ChainRpcConfig> = {
  // Coston2 Testnet
  114: {
    chainId: 114,
    endpoints: [
      {
        url: process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc",
        priority: 1,
      },
      {
        url: "https://coston2-api.flare.network/ext/C/rpc",
        priority: 2,
      },
    ],
    healthCheckInterval: 60000, // 1 minute
  },
  // Flare Mainnet (disabled for testnet-only mode)
  // 14: {
  //   chainId: 14,
  //   endpoints: [
  //     {
  //       url: process.env.FLARE_RPC_URL || "https://flare-api.flare.network/ext/C/rpc",
  //       priority: 1,
  //     },
  //     {
  //       url: "https://flare-api.flare.network/ext/C/rpc",
  //       priority: 2,
  //     },
  //   ],
  //   healthCheckInterval: 60000,
  // },
  // Ethereum Sepolia
  11155111: {
    chainId: 11155111,
    endpoints: [
      {
        url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
        priority: 1,
      },
      {
        url: "https://ethereum-sepolia-rpc.publicnode.com",
        priority: 2,
      },
    ],
    healthCheckInterval: 60000,
  },
  // Polygon Amoy
  80002: {
    chainId: 80002,
    endpoints: [
      {
        url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
        priority: 1,
      },
      {
        url: "https://rpc-amoy.polygon.technology",
        priority: 2,
      },
      {
        url: "https://polygon-amoy.drpc.org",
        priority: 3,
      },
    ],
    healthCheckInterval: 60000,
  },
  // Arbitrum Sepolia
  421614: {
    chainId: 421614,
    endpoints: [
      {
        url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
        priority: 1,
      },
      {
        url: "https://sepolia-rollup.arbitrum.io/rpc",
        priority: 2,
      },
    ],
    healthCheckInterval: 60000,
  },
  // Optimism Sepolia
  11155420: {
    chainId: 11155420,
    endpoints: [
      {
        url: process.env.OPTIMISM_SEPOLIA_RPC_URL || "https://sepolia.optimism.io",
        priority: 1,
      },
      {
        url: "https://sepolia.optimism.io",
        priority: 2,
      },
    ],
    healthCheckInterval: 60000,
  },
  // BSC Testnet
  97: {
    chainId: 97,
    endpoints: [
      {
        url: process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com",
        priority: 1,
      },
      {
        url: "https://bsc-testnet-rpc.publicnode.com",
        priority: 2,
      },
      {
        url: "https://data-seed-prebsc-1-s1.binance.org:8545",
        priority: 3,
      },
      {
        url: "https://bsc-testnet.drpc.org",
        priority: 4,
      },
    ],
    healthCheckInterval: 60000,
  },
  // BSC Mainnet (disabled for testnet-only mode)
  // 56: {
  //   chainId: 56,
  //   endpoints: [
  //     {
  //       url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
  //       priority: 1,
  //     },
  //     {
  //       url: "https://bsc-dataseed.binance.org",
  //       priority: 2,
  //     },
  //     {
  //       url: "https://bsc-dataseed1.defibit.io",
  //       priority: 3,
  //     },
  //     {
  //       url: "https://bsc-dataseed1.ninicoin.io",
  //       priority: 4,
  //     },
  //   ],
  //   healthCheckInterval: 60000,
  // },
  // Avalanche Mainnet (disabled for testnet-only mode)
  // 43114: {
  //   chainId: 43114,
  //   endpoints: [
  //     {
  //       url: process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
  //       priority: 1,
  //     },
  //     {
  //       url: "https://api.avax.network/ext/bc/C/rpc",
  //       priority: 2,
  //     },
  //     {
  //       url: "https://avalanche-c-chain-rpc.publicnode.com",
  //       priority: 3,
  //     },
  //   ],
  //   healthCheckInterval: 60000,
  // },
  // Avalanche Fuji Testnet
  43113: {
    chainId: 43113,
    endpoints: [
      {
        url: process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
        priority: 1,
      },
      {
        url: "https://api.avax-test.network/ext/bc/C/rpc",
        priority: 2,
      },
      {
        url: "https://avalanche-fuji-c-chain-rpc.publicnode.com",
        priority: 3,
      },
    ],
    healthCheckInterval: 60000,
  },
  // Base Sepolia
  84532: {
    chainId: 84532,
    endpoints: [
      {
        url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
        priority: 1,
      },
      {
        url: "https://sepolia.base.org",
        priority: 2,
      },
      {
        url: "https://base-sepolia-rpc.publicnode.com",
        priority: 3,
      },
    ],
    healthCheckInterval: 60000,
  },
  // World Sepolia
  4801: {
    chainId: 4801,
    endpoints: [
      {
        url: process.env.WORLD_SEPOLIA_RPC_URL || "https://worldchain-sepolia.g.alchemy.com/public",
        priority: 1,
      },
      {
        url: "https://worldchain-sepolia.g.alchemy.com/public",
        priority: 2,
      },
    ],
    healthCheckInterval: 60000,
  },
  // Zora Sepolia
  999999999: {
    chainId: 999999999,
    endpoints: [
      {
        url: process.env.ZORA_SEPOLIA_RPC_URL || "https://sepolia.rpc.zora.energy",
        priority: 1,
      },
      {
        url: "https://sepolia.rpc.zora.energy",
        priority: 2,
      },
    ],
    healthCheckInterval: 60000,
  },
  // Scroll Sepolia
  534351: {
    chainId: 534351,
    endpoints: [
      {
        url: process.env.SCROLL_SEPOLIA_RPC_URL || "https://sepolia-rpc.scroll.io",
        priority: 1,
      },
      {
        url: "https://sepolia-rpc.scroll.io",
        priority: 2,
      },
    ],
    healthCheckInterval: 60000,
  },
  // Monad Testnet
  10143: {
    chainId: 10143,
    endpoints: [
      {
        url: process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz",
        priority: 1,
      },
      {
        url: "https://testnet-rpc.monad.xyz",
        priority: 2,
      },
      {
        url: "https://rpc.ankr.com/monad_testnet",
        priority: 3,
      },
    ],
    healthCheckInterval: 60000,
  },
  300: {
    chainId: 300,
    endpoints: [
      { url: process.env.ZKSYNC_SEPOLIA_RPC_URL || "https://sepolia.era.zksync.dev", priority: 1 },
      { url: "https://sepolia.era.zksync.dev", priority: 2 },
    ],
    healthCheckInterval: 60000,
  },
  314159: {
    chainId: 314159,
    endpoints: [
      { url: process.env.FILECOIN_CALIBRATION_RPC_URL || "https://api.calibration.node.glif.io/rpc/v1", priority: 1 },
      { url: "https://api.calibration.node.glif.io/rpc/v1", priority: 2 },
    ],
    healthCheckInterval: 60000,
  },
  1301: {
    chainId: 1301,
    endpoints: [
      { url: process.env.UNICHAIN_SEPOLIA_RPC_URL || "https://sepolia.unichain.org", priority: 1 },
      { url: "https://sepolia.unichain.org", priority: 2 },
    ],
    healthCheckInterval: 60000,
  },
  48898: {
    chainId: 48898,
    endpoints: [
      { url: process.env.ZIRCUIT_GARFIELD_RPC_URL || "https://garfield-testnet.zircuit.com", priority: 1 },
      { url: "https://garfield-testnet.zircuit.com", priority: 2 },
    ],
    healthCheckInterval: 60000,
  },
  5115: {
    chainId: 5115,
    endpoints: [
      { url: process.env.CITREA_TESTNET_RPC_URL || "https://rpc.testnet.citrea.xyz", priority: 1 },
      { url: "https://rpc.testnet.citrea.xyz", priority: 2 },
    ],
    healthCheckInterval: 60000,
  },
  545: {
    chainId: 545,
    endpoints: [
      { url: process.env.FLOW_EVM_TESTNET_RPC_URL || "https://testnet.evm.nodes.onflow.org", priority: 1 },
      { url: "https://testnet.evm.nodes.onflow.org", priority: 2 },
    ],
    healthCheckInterval: 60000,
  },
  44787: {
    chainId: 44787,
    endpoints: [
      { url: process.env.CELO_ALFAJORES_RPC_URL || "https://alfajores-forno.celo-testnet.org", priority: 1 },
      { url: "https://alfajores-forno.celo-testnet.org", priority: 2 },
    ],
    healthCheckInterval: 60000,
  },
};

/**
 * Get RPC configuration for a chain
 */
export function getRpcConfig(chainId: number): ChainRpcConfig | undefined {
  return RPC_CONFIGS[chainId];
}

/**
 * Get all configured chain IDs
 */
export function getConfiguredChainIds(): number[] {
  return Object.keys(RPC_CONFIGS).map(Number);
}
