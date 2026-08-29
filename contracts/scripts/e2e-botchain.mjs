/**
 * On-chain check for the GasStation escrow on BOT Chain.
 *
 * BOT Chain is the source chain, so what has to work here is the deposit path:
 * a user approves USDT, deposits it with a per-destination split, and the
 * contract emits the Deposited event the listener consumes.
 *
 * Amounts are tiny (0.00001 USDT) so a run costs almost nothing.
 *
 * Usage:
 *   BOTCHAIN_NETWORK=testnet node scripts/e2e-botchain.mjs
 *   BOTCHAIN_NETWORK=mainnet node scripts/e2e-botchain.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const NETWORKS = {
  mainnet: { chainId: 677, name: 'BOT Chain', rpc: process.env.BOTCHAIN_RPC_URL || 'https://rpc.botchain.ai' },
  testnet: { chainId: 968, name: 'BOT Chain Testnet', rpc: process.env.BOTCHAIN_TESTNET_RPC_URL || 'https://rpc.bohr.life' },
};

const netKey = (process.env.BOTCHAIN_NETWORK || 'testnet').toLowerCase();
const net = NETWORKS[netKey];
assert.ok(net, `Unknown BOTCHAIN_NETWORK "${netKey}"`);

const deployment = JSON.parse(
  readFileSync(resolve(root, `deployments/botchain-${net.chainId}.json`), 'utf8')
);

const GAS_STATION_ABI = [
  'event Deposited(address indexed user, uint256 totalAmount, uint256[] chainIds, uint256[] chainAmounts)',
  'function deposit(uint256 totalAmount, uint256[] chainIds, uint256[] chainAmounts) external',
  'function usdc() view returns (address)',
  'function weth() view returns (address)',
  'function swapRouter() view returns (address)',
  'function poolFee() view returns (uint24)',
  'function owner() view returns (address)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const provider = new ethers.JsonRpcProvider(net.rpc, { chainId: net.chainId, name: net.name });
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const escrow = new ethers.Contract(deployment.gasProvider, GAS_STATION_ABI, wallet);
const usdt = new ethers.Contract(deployment.usdt, ERC20_ABI, wallet);

let failures = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL ${name}: ${err.shortMessage || err.message}`);
  }
};

console.log(`GasStation e2e on ${net.name} (${net.chainId})`);
console.log(`Escrow   ${deployment.gasProvider}`);
console.log(`Signer   ${wallet.address}\n`);

const DECIMALS = Number(await usdt.decimals());
const AMOUNT = ethers.parseUnits('0.00001', DECIMALS);

await check('escrow reports the configured USDT, router, wrapped-native and fee', async () => {
  assert.equal((await escrow.usdc()).toLowerCase(), deployment.usdt.toLowerCase());
  assert.equal((await escrow.swapRouter()).toLowerCase(), deployment.mockSwapRouter.toLowerCase());
  assert.equal((await escrow.weth()).toLowerCase(), deployment.mockWeth.toLowerCase());
  assert.equal(Number(await escrow.poolFee()), deployment.poolFee);
});

await check('deployer owns the escrow', async () => {
  assert.equal((await escrow.owner()).toLowerCase(), deployment.deployer.toLowerCase());
});

await check('the signer holds enough USDT to deposit', async () => {
  const balance = await usdt.balanceOf(wallet.address);
  assert.ok(balance >= AMOUNT, `need ${AMOUNT} USDT base units, have ${balance}`);
});

await check('approve lets the escrow move the deposit', async () => {
  const tx = await usdt.approve(deployment.gasProvider, AMOUNT);
  await tx.wait();
  const allowance = await usdt.allowance(wallet.address, deployment.gasProvider);
  assert.ok(allowance >= AMOUNT);
});

let depositReceipt;
await check('deposit splits across destinations and emits Deposited', async () => {
  const escrowBefore = await usdt.balanceOf(deployment.gasProvider);

  // Two destination chains, splitting the total.
  const chainIds = [8453, 10]; // Base, Optimism
  const half = AMOUNT / 2n;
  const chainAmounts = [half, AMOUNT - half];

  const tx = await escrow.deposit(AMOUNT, chainIds, chainAmounts);
  depositReceipt = await tx.wait();
  assert.equal(depositReceipt.status, 1);

  const escrowAfter = await usdt.balanceOf(deployment.gasProvider);
  assert.equal(escrowAfter - escrowBefore, AMOUNT, 'escrow did not receive the deposit');

  const parsed = depositReceipt.logs
    .map((log) => {
      try {
        return escrow.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === 'Deposited');

  assert.ok(parsed, 'no Deposited event emitted');
  assert.equal(parsed.args.user.toLowerCase(), wallet.address.toLowerCase());
  assert.equal(parsed.args.totalAmount, AMOUNT);
  assert.deepEqual(
    parsed.args.chainIds.map(Number),
    chainIds,
    'destination chain ids do not round-trip'
  );
  assert.deepEqual(
    parsed.args.chainAmounts.map((x) => x.toString()),
    chainAmounts.map((x) => x.toString()),
    'per-chain amounts do not round-trip'
  );
});

await check('a split that does not sum to the total is rejected', async () => {
  await assert.rejects(() =>
    escrow.deposit.staticCall(AMOUNT, [8453, 10], [AMOUNT, AMOUNT])
  );
});

await check('mismatched array lengths are rejected', async () => {
  await assert.rejects(() => escrow.deposit.staticCall(AMOUNT, [8453, 10], [AMOUNT]));
});

await check('a zero deposit is rejected', async () => {
  await assert.rejects(() => escrow.deposit.staticCall(0, [8453], [0]));
});

await check('a non-owner cannot drip escrow funds out', async () => {
  const stranger = ethers.Wallet.createRandom().connect(provider);
  const asStranger = new ethers.Contract(deployment.gasProvider, GAS_STATION_ABI, stranger);
  await assert.rejects(() =>
    asStranger.deposit.staticCall(AMOUNT, [8453], [AMOUNT], { from: stranger.address })
  );
});

if (depositReceipt) {
  console.log(`\nDeposit tx ${depositReceipt.hash}`);
}
console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
