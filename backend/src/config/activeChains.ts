/**
 * Chains the production backend is allowed to open RPC connections for.
 * Keep this small on Railway trial memory (~512MB). Dead RPCs + ethers
 * auto-detect retries were OOMing the service.
 */
export const ACTIVE_CHAIN_IDS: readonly number[] = [
  114, // Coston2
  11155420, // Optimism Sepolia
  84532, // Base Sepolia
  4801, // World Sepolia
  10143, // Monad Testnet
];

export const DISABLED_DESTINATION_CHAIN_IDS: ReadonlySet<number> = new Set([
  11155111, // Ethereum Sepolia
  421614, // Arbitrum Sepolia
]);

export function isActiveChain(chainId: number): boolean {
  return ACTIVE_CHAIN_IDS.includes(chainId) && !DISABLED_DESTINATION_CHAIN_IDS.has(chainId);
}
