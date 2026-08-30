/**
 * Deploy DestinationTreasury to a destination chain.
 *
 * The treasuries the backend used to call are owned by a key this project does
 * not have, so `drip` (onlyOwner) could never succeed. This deploys one we own,
 * funds it, and prints the env var to point the backend at.
 *
 * Compiles with solc directly for the same reason deploy-botchain.mjs does:
 * SmartAccount.sol targets OpenZeppelin v5 while v4 is installed, which breaks
 * `hardhat compile` for the whole source directory.
 *
 * Usage:
 *   RELAYER_KEY=0x... node scripts/deploy-destination-treasury.mjs baseSepolia
 *   RELAYER_KEY=0x... node scripts/deploy-destination-treasury.mjs optimismSepolia
 *
 * Writes deployments/destination-<chainId>.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ethers } from 'ethers';
import solc from 'solc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const NETWORKS = {
  baseSepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpc: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    envVar: 'TREASURY_BASE_SEPOLIA_ADDRESS',
  },
  optimismSepolia: {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    rpc: process.env.OP_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    explorer: 'https://sepolia-optimism.etherscan.io',
    envVar: 'TREASURY_OPTIMISM_SEPOLIA_ADDRESS',
  },
  worldSepolia: {
    chainId: 4801,
    name: 'World Sepolia',
    rpc: process.env.WORLD_SEPOLIA_RPC_URL || 'https://worldchain-sepolia.g.alchemy.com/public',
    explorer: 'https://worldchain-sepolia.explorer.alchemy.com',
    envVar: 'TREASURY_WORLD_SEPOLIA_ADDRESS',
  },
};

const key = process.argv[2];
const net = NETWORKS[key];
if (!net) {
  console.error(`Usage: node scripts/deploy-destination-treasury.mjs <${Object.keys(NETWORKS).join('|')}>`);
  process.exit(1);
}

const privateKey = process.env.RELAYER_KEY;
if (!privateKey) {
  console.error('RELAYER_KEY is required');
  process.exit(1);
}

// These chains all use ETH for gas.
const ETH_USD = Number(process.env.ETH_USD || 2450);
const PRICE_USD6 = BigInt(Math.round(ETH_USD * 1e6));

// Bound a single payout. A user asking for $1 of gas at $2450/ETH gets
// 0.0004 ETH, so 0.01 ETH leaves generous headroom while capping a bad price.
const MAX_DRIP_WEI = ethers.parseEther(process.env.MAX_DRIP_ETH || '0.01');

// Native left in the treasury to actually pay users with.
const FUND_ETH = process.env.FUND_ETH || '0.02';

console.log(`Deploying DestinationTreasury to ${net.name} (${net.chainId})`);

// ── compile ─────────────────────────────────────────────────────────────────
const source = readFileSync(join(root, 'src/DestinationTreasury.sol'), 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'DestinationTreasury.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (out.errors || []).filter((e) => e.severity === 'error');
if (errors.length) {
  errors.forEach((e) => console.error(e.formattedMessage));
  process.exit(1);
}
const artifact = out.contracts['DestinationTreasury.sol'].DestinationTreasury;
console.log('  compiled');

// ── deploy ──────────────────────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(net.rpc, { chainId: net.chainId, name: net.name }, { staticNetwork: true });
const wallet = new ethers.Wallet(privateKey, provider);
console.log(`  deployer ${wallet.address}`);
console.log(`  balance  ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH`);

const factory = new ethers.ContractFactory(artifact.abi, artifact.evm.bytecode.object, wallet);
const contract = await factory.deploy(PRICE_USD6, MAX_DRIP_WEI, wallet.address, {
  value: ethers.parseEther(FUND_ETH),
});
await contract.waitForDeployment();
const address = await contract.getAddress();
const deployTx = contract.deploymentTransaction();

console.log(`  deployed ${address}`);
console.log(`  tx       ${deployTx.hash}`);
console.log(`  funded   ${FUND_ETH} ETH`);
console.log(`  price    $${ETH_USD} / ETH`);
console.log(`  maxDrip  ${ethers.formatEther(MAX_DRIP_WEI)} ETH`);

const dir = join(root, 'deployments');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, `destination-${net.chainId}.json`),
  JSON.stringify(
    {
      chainId: net.chainId,
      network: net.name,
      destinationTreasury: address,
      owner: wallet.address,
      relayer: wallet.address,
      priceUsd6: PRICE_USD6.toString(),
      maxDripWei: MAX_DRIP_WEI.toString(),
      fundedEth: FUND_ETH,
      txHash: deployTx.hash,
      deployedAt: new Date().toISOString(),
      explorer: `${net.explorer}/address/${address}`,
    },
    null,
    2
  ) + '\n'
);
writeFileSync(join(dir, 'DestinationTreasury.abi.json'), JSON.stringify(artifact.abi, null, 2) + '\n');

console.log(`\nSet on the backend:\n  ${net.envVar}=${address}`);
