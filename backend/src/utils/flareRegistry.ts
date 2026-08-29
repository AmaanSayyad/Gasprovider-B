/**
 * Resolve Flare protocol contracts via FlareContractRegistry.
 * Docs: https://dev.flare.network/network/guides/flare-contracts-registry
 *
 * Registry address is identical on Flare, Coston2, Songbird, and Coston.
 * Never hardcode FtsoV2 / FdcHub / AssetManagerFXRP in production paths —
 * resolve them here (env overrides still allowed for emergencies).
 */

import { ethers } from "ethers";

/** Same address on all Flare networks */
export const FLARE_CONTRACT_REGISTRY =
  "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

const REGISTRY_ABI = [
  "function getContractAddressByName(string calldata _name) external view returns (address)",
] as const;

const ASSET_MANAGER_ABI = [
  "function fAsset() external view returns (address)",
] as const;

const cache = new Map<string, string>();

function cacheKey(rpcUrl: string, name: string): string {
  return `${rpcUrl}::${name}`;
}

/**
 * Resolve a named contract from FlareContractRegistry.
 */
export async function getContractAddressByName(
  rpcUrl: string,
  name: string
): Promise<string> {
  const key = cacheKey(rpcUrl, name);
  const hit = cache.get(key);
  if (hit) return hit;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const registry = new ethers.Contract(
    FLARE_CONTRACT_REGISTRY,
    REGISTRY_ABI,
    provider
  );
  const address: string = await registry.getContractAddressByName(name);
  if (!address || address === ethers.ZeroAddress) {
    throw new Error(
      `FlareContractRegistry returned zero address for "${name}" on ${rpcUrl}`
    );
  }
  cache.set(key, address);
  return address;
}

/**
 * Resolve FtsoV2 (on Coston2 this is the TestFtsoV2 interface).
 * Prefer registry; allow env override.
 */
export async function resolveFtsoV2Address(rpcUrl: string): Promise<string> {
  const envOverride =
    process.env.FTSO_V2_ADDRESS ||
    process.env.FTSO_V2_ADDRESS_COSTON2 ||
    process.env.FTSO_V2_ADDRESS_MAINNET;
  // If env is set AND looks real, still prefer registry when RESOLVE_VIA_REGISTRY !== false
  if (
    process.env.RESOLVE_VIA_REGISTRY === "false" &&
    envOverride &&
    !/^0x0+$/i.test(envOverride)
  ) {
    return envOverride;
  }

  try {
    const address = await getContractAddressByName(rpcUrl, "FtsoV2");
    console.log("✅ FtsoV2 resolved via FlareContractRegistry:", address);
    return address;
  } catch (error) {
    if (envOverride && !/^0x0+$/i.test(envOverride)) {
      console.warn(
        "⚠️ Registry FtsoV2 lookup failed, using env override:",
        (error as Error).message
      );
      return envOverride;
    }
    throw error;
  }
}

/**
 * Resolve FXRP ERC-20: AssetManagerFXRP → fAsset().
 * Docs: https://dev.flare.network/fxrp/token-interactions/fxrp-address
 */
export async function resolveFxrpAddress(rpcUrl: string): Promise<{
  assetManager: string;
  fxrp: string;
}> {
  const assetManager = await getContractAddressByName(rpcUrl, "AssetManagerFXRP");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const am = new ethers.Contract(assetManager, ASSET_MANAGER_ABI, provider);
  const fxrp: string = await am.fAsset();
  if (!fxrp || fxrp === ethers.ZeroAddress) {
    throw new Error("AssetManagerFXRP.fAsset() returned zero address");
  }
  console.log("✅ FXRP resolved via registry → AssetManagerFXRP.fAsset():", {
    assetManager,
    fxrp,
  });
  return { assetManager, fxrp };
}

/**
 * FDC source IDs for EVMTransaction attestations (docs / FDC getting-started).
 * Testnets use testETH / testFLR / testSGB — not chainId strings.
 */
export function getFdcEvmSourceId(chainId: number, useTestnet: boolean): string {
  // Coston2 deposit path: attesting txs on destination EVM testnets → testETH
  // Flare-native txs on Coston2 → testFLR
  if (chainId === 114 || chainId === 14) {
    return useTestnet ? "testFLR" : "FLR";
  }
  if (chainId === 19 || chainId === 16) {
    return useTestnet ? "testSGB" : "SGB";
  }
  // Sepolia / OP / Base / Arb / World / Monad testnets → testETH
  return useTestnet ? "testETH" : "ETH";
}

/** Official Coston2 FDC endpoints (dev.flare.network/network/overview#api-resources) */
export const FDC_DEFAULTS = {
  verifierTestnet: "https://fdc-verifiers-testnet.flare.network",
  daLayerCoston2: "https://ctn2-data-availability.flare.network",
  verifierMainnet: "https://fdc-verifiers-mainnet.flare.network",
  daLayerMainnet: "https://flr-data-availability.flare.network",
  /** Public rate-limited key from Flare docs */
  publicApiKey: "00000000-0000-0000-0000-000000000000",
} as const;
