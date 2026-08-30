# Contracts — Gas Provider on BOT Chain

Hardhat project for the **GasStation** escrow on BOT Chain and **Treasury** contracts on destination chains.

Users deposit **USDT** into GasStation on BOT Chain (677 / 968). The listener indexes `Deposited`; destination treasuries send native gas. Nothing on the source chain calls `drip()` in production.

## Networks

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| BOT Chain | 677 | https://rpc.botchain.ai | https://scan.botchain.ai |
| BOT Chain Testnet | 968 | https://rpc.bohr.life | https://scan.bohr.life |

Deployed addresses: [DEPLOYED_ADDRESSES.md](./DEPLOYED_ADDRESSES.md)

## Layout

- `src/GasProvider.sol` — `GasStation` escrow (USDT in, allocations on-chain)
- `src/Treasury.sol` / `src/DestinationTreasury.sol` — pre-funded payouts on destinations
- `src/SmartAccount.sol` / `src/SmartAccountFactory.sol` — optional ERC-4337 path
- `src/mocks/` — MockWETH + MockSwapRouter (BOT Chain has no DEX; constructor still needs them)
- `scripts/deploy-botchain.mjs` — deploy GasStation to 677 or 968
- `scripts/e2e-botchain.mjs` — dust USDT deposit + event asserts
- `scripts/deploy-destination-treasury.mjs` — destination treasuries

## Tests

```bash
npx hardhat test
npx hardhat test solidity
npx hardhat test nodejs
```

## Deploy / e2e

```bash
BOTCHAIN_NETWORK=testnet PRIVATE_KEY=0x... node scripts/deploy-botchain.mjs
BOTCHAIN_NETWORK=testnet PRIVATE_KEY=0x... node scripts/e2e-botchain.mjs

BOTCHAIN_NETWORK=mainnet PRIVATE_KEY=0x... node scripts/deploy-botchain.mjs
```

Writes `deployments/botchain-<chainId>.json`.
