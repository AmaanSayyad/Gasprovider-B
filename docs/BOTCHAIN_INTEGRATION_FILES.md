# BOT Chain integration — important files

> **BOT Chain** — Pay USDT on BOT Chain → native gas on destination chains (GasStation escrow + pre-funded treasuries).

This map lists the files that implement the BOT Chain source-chain path:

- **GasStation** (USDT escrow on chain ID 677 / 968)
- **Listener** (`Deposited` indexer)
- **Treasuries** (native gas payouts on destinations)
- **Quotes** (USD rates → USDT needed)
- **Smart accounts** (optional gasless path)

---

## Source chain (BOT Chain)

### Config
- **`frontend/src/data/botchain.ts`** — viem chain, RPC, explorer, USDT address
- **`backend/src/config/chains.ts`** — chain IDs 677 / 968
- **`backend/src/config/rpcEndpoints.ts`** — `BOTCHAIN_RPC_URL`
- **`frontend/src/data/chains.ts`** — `SOURCE_CHAINS = ["botchain"]`

### Escrow
- **`contracts/src/GasProvider.sol`** — `GasStation` contract
- **`contracts/scripts/deploy-botchain.mjs`** — deploy to mainnet or testnet
- **`contracts/scripts/e2e-botchain.mjs`** — dust USDT deposit + event asserts
- **`contracts/deployments/botchain-677.json`** — mainnet addresses
- **`contracts/deployments/botchain-968.json`** — testnet addresses
- **`contracts/DEPLOYED_ADDRESSES.md`** — operator notes

### Frontend deposit
- **`frontend/src/contracts/gasFountain.ts`** — GasStation ABI + `VITE_BOTCHAIN_CONTRACT_ADDRESS`
- **`frontend/src/hooks/useDeposit.ts`** — USDT approve + deposit
- **`frontend/src/config/wagmiConfig.ts`** — AppKit includes `botChain`

---

## Listener

- **`listener/src/index.ts`** — watches `Deposited` on BOT Chain
- **`listener/env.example`** — `BOTCHAIN_RPC_URL`, `CONTRACT_ADDRESS_677`, `BACKEND_URL`

---

## Quotes and payouts

- **`backend/src/services/priceCalculator.ts`** — USD budgets → native amounts
- **`backend/src/config/exchangeRates.json`** — token and destination prices
- **`backend/src/services/eventProcessor.ts`** — deposit event → intent
- **`backend/src/services/treasuryDistribution.ts`** — destination `Treasury.distribute()`
- **`backend/src/services/dispersal.ts`** — multi-destination orchestration
- **`contracts/src/Treasury.sol`** / **`DestinationTreasury.sol`** — payout contracts

---

## Smart accounts (optional)

- **`backend/src/services/smartaccount.ts`** — SmartAccountManager
- **`backend/src/services/relayer.ts`** — pays gas on BOT Chain
- **`frontend/src/components/SmartAccountManager.tsx`** — UI
- **`contracts/src/SmartAccount.sol`** / **`SmartAccountFactory.sol`**

---

## Configuration

| Component | Key env |
|-----------|---------|
| Backend / listener | `BOTCHAIN_RPC_URL`, `CONTRACT_ADDRESS_677` |
| Frontend | `VITE_BOTCHAIN_NETWORK`, `VITE_BOTCHAIN_RPC_URL`, `VITE_BOTCHAIN_CONTRACT_ADDRESS` |
| Distributor | `DISTRIBUTOR_PRIVATE_KEY`, `TREASURY_*_ADDRESS` |

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md).

---

## Flow

```
Wallet on BOT Chain
  → approve USDT
  → GasStation.deposit (allocations on-chain)
  → listener Deposited
  → backend intent
  → destination treasuries send native gas
```

---

## Quick reference

**Want the source-chain path?**  
Start with `frontend/src/data/botchain.ts` and `listener/src/index.ts`.

**Want to redeploy escrow?**  
`contracts/scripts/deploy-botchain.mjs` then update `CONTRACT_ADDRESS_677`.

**Want payouts?**  
`backend/src/services/treasuryDistribution.ts` + [TREASURY_ADDRESSES.md](./TREASURY_ADDRESSES.md).
