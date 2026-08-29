/**
 * Resolve operator/relayer private keys from environment only.
 * Never hardcode keys — set them in backend/.env (gitignored).
 */

const ZERO_KEY = /^0x0+$/i;

function isUsablePrivateKey(key: string | undefined): key is string {
  return (
    typeof key === "string" &&
    /^0x[a-fA-F0-9]{64}$/.test(key) &&
    !ZERO_KEY.test(key)
  );
}

/**
 * Distributor / treasury operator key.
 * Prefers DISTRIBUTOR_PRIVATE_KEY, then PRIVATE_KEY, then RELAYER_PRIVATE_KEY.
 */
export function getDistributorPrivateKey(): string | undefined {
  const candidates = [
    process.env.DISTRIBUTOR_PRIVATE_KEY,
    process.env.PRIVATE_KEY,
    process.env.RELAYER_PRIVATE_KEY,
  ];
  return candidates.find(isUsablePrivateKey);
}

/**
 * Relayer / FDC / FAssets / Smart Account key.
 * Prefers RELAYER_PRIVATE_KEY, then PRIVATE_KEY, then DISTRIBUTOR_PRIVATE_KEY.
 */
export function getRelayerPrivateKey(): string | undefined {
  const candidates = [
    process.env.RELAYER_PRIVATE_KEY,
    process.env.PRIVATE_KEY,
    process.env.DISTRIBUTOR_PRIVATE_KEY,
  ];
  return candidates.find(isUsablePrivateKey);
}

/**
 * Generic Hardhat / deploy key.
 * Prefers PRIVATE_KEY, then DISTRIBUTOR, then RELAYER.
 */
export function getPrivateKey(): string | undefined {
  const candidates = [
    process.env.PRIVATE_KEY,
    process.env.DISTRIBUTOR_PRIVATE_KEY,
    process.env.RELAYER_PRIVATE_KEY,
  ];
  return candidates.find(isUsablePrivateKey);
}
