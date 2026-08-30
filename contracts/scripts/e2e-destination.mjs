/**
 * On-chain check for DestinationTreasury.
 *
 * Uses tiny amounts and sweeps nothing: the recipients are throwaway addresses
 * that keep what they receive, which at $0.000005 a drip is dust.
 *
 * Usage:
 *   RELAYER_KEY=0x... node scripts/e2e-destination.mjs baseSepolia
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const NETWORKS = {
  baseSepolia: { chainId: 84532, name: 'Base Sepolia', rpc: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org' },
  optimismSepolia: { chainId: 11155420, name: 'Optimism Sepolia', rpc: process.env.OP_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io' },
  worldSepolia: { chainId: 4801, name: 'World Sepolia', rpc: process.env.WORLD_SEPOLIA_RPC_URL || 'https://worldchain-sepolia.g.alchemy.com/public' },
};

const key = process.argv[2];
const net = NETWORKS[key];
assert.ok(net, `Usage: node scripts/e2e-destination.mjs <${Object.keys(NETWORKS).join('|')}>`);

const deployment = JSON.parse(readFileSync(join(root, `deployments/destination-${net.chainId}.json`), 'utf8'));
const abi = JSON.parse(readFileSync(join(root, 'deployments/DestinationTreasury.abi.json'), 'utf8'));

const provider = new ethers.JsonRpcProvider(net.rpc, { chainId: net.chainId, name: net.name }, { staticNetwork: true });
const wallet = new ethers.Wallet(process.env.RELAYER_KEY, provider);
const treasury = new ethers.Contract(deployment.destinationTreasury, abi, wallet);

/**
 * Public testnet RPCs are load balanced, so a read straight after `wait()` can
 * land on a node that has not applied the block yet. Poll until it agrees.
 */
const settled = async (read, expected, what) => {
  for (let i = 0; i < 20; i += 1) {
    if ((await read()) === expected) return;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`${what} never reached ${expected}`);
};

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

console.log(`DestinationTreasury e2e on ${net.name} (${net.chainId})`);
console.log(`Treasury ${deployment.destinationTreasury}`);
console.log(`Signer   ${wallet.address}\n`);

// The USD amount the backend sends for a $0.000005 allocation.
const USD6 = 5n;

await check('deployed with the expected owner, relayer and price', async () => {
  assert.equal((await treasury.owner()).toLowerCase(), wallet.address.toLowerCase());
  assert.equal((await treasury.relayer()).toLowerCase(), wallet.address.toLowerCase());
  assert.equal(await treasury.priceUsd6(), BigInt(deployment.priceUsd6));
  assert.equal(await treasury.paused(), false);
});

await check('it holds the native it was funded with', async () => {
  const balance = await provider.getBalance(deployment.destinationTreasury);
  assert.ok(balance > 0n, 'treasury is empty');
});

await check('quote converts USD to native at the configured price', async () => {
  const quoted = await treasury.quote(USD6);
  // 5 / 2_450_000_000 * 1e18
  const expected = (USD6 * 10n ** 18n) / BigInt(deployment.priceUsd6);
  assert.equal(quoted, expected);
  assert.ok(quoted > 0n, 'quote rounds to zero');
});

await check('drip pays the recipient exactly what quote promised', async () => {
  const to = ethers.Wallet.createRandom().address;
  const expected = await treasury.quote(USD6);

  const receipt = await (await treasury.drip(USD6, to)).wait();
  assert.equal(receipt.status, 1);
  await settled(() => provider.getBalance(to), expected, 'recipient balance');

  const event = receipt.logs
    .map((l) => { try { return treasury.interface.parseLog(l); } catch { return null; } })
    .find((e) => e && e.name === 'Dripped');
  assert.ok(event, 'no Dripped event');
  assert.equal(event.args.recipient.toLowerCase(), to.toLowerCase());
  assert.equal(event.args.usdAmount6, USD6);
  assert.equal(event.args.nativeAmount, expected);
});

await check('a zero amount is refused', async () => {
  await assert.rejects(() => treasury.drip.staticCall(0, wallet.address));
});

await check('the zero address is refused', async () => {
  await assert.rejects(() => treasury.drip.staticCall(USD6, ethers.ZeroAddress));
});

await check('a payout beyond maxDrip is refused', async () => {
  // maxDrip is 0.01 ETH; at $2450/ETH that is about $24.50, so ask for $1000.
  await assert.rejects(() => treasury.drip.staticCall(1_000_000_000n, wallet.address));
});

await check('a stranger cannot drip, set the price, or withdraw', async () => {
  const stranger = ethers.Wallet.createRandom().connect(provider);
  const asStranger = new ethers.Contract(deployment.destinationTreasury, abi, stranger);
  await assert.rejects(() => asStranger.drip.staticCall(USD6, stranger.address));
  await assert.rejects(() => asStranger.setPrice.staticCall(1n));
  await assert.rejects(() => asStranger.withdraw.staticCall(stranger.address, 1n));
});

await check('pause stops drips, unpause restores them', async () => {
  await (await treasury.setPaused(true)).wait();
  await settled(() => treasury.paused(), true, 'paused');
  await assert.rejects(() => treasury.drip.staticCall(USD6, wallet.address));

  await (await treasury.setPaused(false)).wait();
  await settled(() => treasury.paused(), false, 'paused');
  await treasury.drip.staticCall(USD6, wallet.address);
});

await check('the owner can change the price and drips follow it', async () => {
  const original = await treasury.priceUsd6();
  const halved = original / 2n;

  await (await treasury.setPrice(halved)).wait();
  await settled(() => treasury.priceUsd6(), halved, 'price');
  // Half the price means the same USD buys twice the native.
  assert.equal(await treasury.quote(USD6), (USD6 * 10n ** 18n) / halved);

  await (await treasury.setPrice(original)).wait();
  await settled(() => treasury.priceUsd6(), original, 'price');
});

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
