/**
 * Deploy the GasProvider escrow to BOT Chain.
 *
 * BOT Chain is the source chain: users deposit USDT here and the listener picks
 * up the Deposited event. Compiles with solc directly rather than through
 * Hardhat, because SmartAccount.sol in this package targets OpenZeppelin v5
 * while the installed version is v4 — that mismatch breaks `hardhat compile`
 * for the whole source directory, and none of it is needed here.
 *
 * Usage:
 *   BOTCHAIN_NETWORK=testnet node scripts/deploy-botchain.mjs
 *   BOTCHAIN_NETWORK=mainnet node scripts/deploy-botchain.mjs
 *
 * Writes deployments/botchain-<chainId>.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ethers } from 'ethers';
import solc from 'solc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const NETWORKS = {
  mainnet: {
    chainId: 677,
    name: 'BOT Chain',
    rpc: process.env.BOTCHAIN_RPC_URL || 'https://rpc.botchain.ai',
    explorer: 'https://scan.botchain.ai',
    usdt: '0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c',
  },
  testnet: {
    chainId: 968,
    name: 'BOT Chain Testnet',
    rpc: process.env.BOTCHAIN_TESTNET_RPC_URL || 'https://rpc.bohr.life',
    explorer: 'https://scan.bohr.life',
    usdt: '0x75edC9335175Fc0552D51D48439F229c10420fe3',
  },
};

const netKey = (process.env.BOTCHAIN_NETWORK || 'testnet').toLowerCase();
const net = NETWORKS[netKey];
if (!net) throw new Error(`Unknown BOTCHAIN_NETWORK "${netKey}"`);

/** Resolves imports out of node_modules for solc. */
function findImport(path) {
  const candidates = [
    join(root, 'node_modules', path),
    join(root, 'src', path),
    join(root, path),
  ];
  for (const file of candidates) {
    if (existsSync(file)) return { contents: readFileSync(file, 'utf8') };
  }
  return { error: `File not found: ${path}` };
}

function compile(sources) {
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));
  const fatal = (output.errors || []).filter((e) => e.severity === 'error');
  if (fatal.length) {
    for (const e of fatal) console.error(e.formattedMessage);
    throw new Error('Solidity compilation failed');
  }
  return output.contracts;
}

async function main() {
  const key = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error('PRIVATE_KEY is not set');

  const provider = new ethers.JsonRpcProvider(net.rpc, {
    chainId: net.chainId,
    name: net.name,
  });
  const wallet = new ethers.Wallet(key, provider);
  const balance = await provider.getBalance(wallet.address);

  console.log(`Network   ${net.name} (${net.chainId})`);
  console.log(`Deployer  ${wallet.address}`);
  console.log(`Balance   ${ethers.formatEther(balance)} BOT`);
  if (balance === 0n) throw new Error('Deployer has no BOT to pay for gas');

  const sources = {
    'GasProvider.sol': { content: readFileSync(resolve(root, 'src/GasProvider.sol'), 'utf8') },
    'MockWETH.sol': { content: readFileSync(resolve(root, 'src/mocks/MockWETH.sol'), 'utf8') },
    'MockSwapRouter.sol': {
      content: readFileSync(resolve(root, 'src/mocks/MockSwapRouter.sol'), 'utf8'),
    },
  };
  const contracts = compile(sources);

  const deploy = async (file, name, args) => {
    const artifact = contracts[file][name];
    const factory = new ethers.ContractFactory(
      artifact.abi,
      `0x${artifact.evm.bytecode.object}`,
      wallet
    );
    const instance = await factory.deploy(...args);
    await instance.waitForDeployment();
    const receipt = await instance.deploymentTransaction().wait();
    const address = await instance.getAddress();
    console.log(`  ${name.padEnd(16)} ${address}  (${receipt.gasUsed} gas)`);
    return { address, gasUsed: receipt.gasUsed, txHash: receipt.hash };
  };

  console.log('\nDeploying…');

  // GasProvider.drip() swaps USDT for the native coin through a DEX. BOT Chain
  // has none, so the router and wrapped-native are mocks: deposits (the source
  // chain's job) work regardless, and dispersal happens through the Treasury
  // contracts on the destination chains.
  const weth = await deploy('MockWETH.sol', 'MockWETH', []);
  const router = await deploy('MockSwapRouter.sol', 'MockSwapRouter', [
    net.usdt,
    weth.address,
  ]);

  const POOL_FEE = 3000;
  const gasProvider = await deploy('GasProvider.sol', 'GasStation', [
    net.usdt,
    router.address,
    weth.address,
    POOL_FEE,
    ethers.ZeroAddress, // FTSO fast updater — Flare only
    ethers.ZeroAddress, // FDC verification — Flare only
  ]);

  const outDir = resolve(root, 'deployments');
  mkdirSync(outDir, { recursive: true });
  const out = {
    chainId: net.chainId,
    network: net.name,
    gasProvider: gasProvider.address,
    mockWeth: weth.address,
    mockSwapRouter: router.address,
    usdt: net.usdt,
    poolFee: POOL_FEE,
    deployer: wallet.address,
    txHash: gasProvider.txHash,
    deployedAt: new Date().toISOString(),
    explorer: `${net.explorer}/address/${gasProvider.address}`,
  };
  writeFileSync(join(outDir, `botchain-${net.chainId}.json`), JSON.stringify(out, null, 2) + '\n');

  const totalGas = weth.gasUsed + router.gasUsed + gasProvider.gasUsed;
  console.log(`\nTotal gas ${totalGas}`);
  console.log(`Explorer  ${out.explorer}`);
  console.log(`\nSet CONTRACT_ADDRESS_677=${gasProvider.address} in backend/.env and listener/.env`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
