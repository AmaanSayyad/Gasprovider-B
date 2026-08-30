# Gas Provider documentation

**Settled on [BOT Chain](https://scan.botchain.ai)** — the source chain for every deposit.

Pay **USDT** on BOT Chain → native gas on destination chains via the GasStation escrow, the deposit listener, and pre-funded treasuries.

## Index

### Users
- [USER_GUIDE.md](./USER_GUIDE.md) — wallet, deposit, tracking

### Developers
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) — contracts, backend, frontend
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) — env reference
- [BOTCHAIN_INTEGRATION_FILES.md](./BOTCHAIN_INTEGRATION_FILES.md) — GasStation / listener / treasury map

### Operators
- [TREASURY_ADDRESSES.md](./TREASURY_ADDRESSES.md) — destination treasuries
- [EXCHANGE_RATE_CONFIGURATION.md](./EXCHANGE_RATE_CONFIGURATION.md) — quote rates

### Context
- [BRIDGE_COMPARISON.md](./BRIDGE_COMPARISON.md) — why treasury dispersal ≠ DEX bridge

## Quick addresses

- **BOT Chain GasStation (677):** `0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c`
- **BOT Chain USDT:** `0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c`
- **Destination demo treasuries:** `0x5b402676535a3ba75c851c14e1e249a4257d2265`

Source-chain deploy notes: [../contracts/DEPLOYED_ADDRESSES.md](../contracts/DEPLOYED_ADDRESSES.md)

## Live links

- Frontend: https://gasprovider-botchain.vercel.app
- GitHub: https://github.com/AmaanSayyad/Gasprovider-B
- Pitch deck: https://docs.google.com/presentation/d/1mmxMZ9Qfk29cvl5lYj2tROQIoB11mhDirAgToFWXZeg/edit?usp=sharing
- Backend API: https://backend-production-6f62.up.railway.app
- Explorer: https://scan.botchain.ai
- RPC: https://rpc.botchain.ai
