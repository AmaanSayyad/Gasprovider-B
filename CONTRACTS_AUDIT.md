# Smart contracts — Gas Provider on BOT Chain

> **BOT Chain** — Pay USDT on BOT Chain → native gas on destination chains (GasStation escrow + pre-funded treasuries).

## Contracts in this repo

### 1. GasStation (`GasProvider.sol`)

**Location:** `contracts/src/GasProvider.sol`  
**Role:** Source-chain escrow on BOT Chain. Users deposit USDT with per-destination allocations. The listener indexes `Deposited`.

**Features:**
- USDT deposit + on-chain chain split
- Owner `drip()` (USDT → native via a Uniswap-style router) — unused in production; BOT Chain has no DEX, so deploy uses mocks
- Owner-controlled token management

**Deploys:**
- Mainnet 677: `0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c` — [scan.botchain.ai](https://scan.botchain.ai/address/0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c)
- Testnet 968: `0xE329210534a500Fa7AC6DA1C15Ae73132836E35d` — [scan.bohr.life](https://scan.bohr.life/address/0xE329210534a500Fa7AC6DA1C15Ae73132836E35d)

---

### 2. Treasury / DestinationTreasury

**Location:** `contracts/src/Treasury.sol`, `contracts/src/DestinationTreasury.sol`  
**Role:** Pre-funded payouts on destination chains (OP Sepolia, Base Sepolia, …).

**Features:**
- Native + ERC20 deposits
- Single and batch `distribute`
- Owner withdraw + balance queries

Default demo treasury: `0x5b402676535a3ba75c851c14e1e249a4257d2265`  
Full list: [docs/TREASURY_ADDRESSES.md](docs/TREASURY_ADDRESSES.md)

---

### 3. SmartAccount + SmartAccountFactory

**Location:** `contracts/src/SmartAccount.sol`, `contracts/src/SmartAccountFactory.sol`  
**Role:** Optional ERC-4337-style accounts for gasless flows on BOT Chain.

---

### 4. Mocks

**Location:** `contracts/src/mocks/`

- `MockERC20.sol`
- `MockWETH.sol` / `MockSwapRouter.sol` — required by the GasStation constructor; BOT Chain has no live DEX

---

## External tokens (not in this repo)

| Asset | Chain | Address |
|-------|-------|---------|
| USDT (6 decimals) | BOT Chain 677 | `0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c` |
| USDT | BOT Chain 968 | `0x75edC9335175Fc0552D51D48439F229c10420fe3` |

---

## Summary

| Contract | Status | Notes |
|----------|--------|-------|
| GasStation | Deployed on BOT Chain | Source escrow |
| Treasury / DestinationTreasury | Deployed on dest testnets | Native gas out |
| SmartAccount + Factory | In repo | Optional gasless path |
| Mocks | In repo | Constructor + tests |

See [contracts/DEPLOYED_ADDRESSES.md](contracts/DEPLOYED_ADDRESSES.md) and [contracts/README.md](contracts/README.md).
