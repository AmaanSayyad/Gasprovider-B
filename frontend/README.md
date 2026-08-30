# Frontend — Gas Provider

Vite + React UI settled on **[BOT Chain](https://scan.botchain.ai)**.

Pay **USDT** on BOT Chain → receive native gas on funded destination chains.

## Run locally

```bash
npm install
# .env.local
# VITE_API_URL=http://localhost:3000
# VITE_REOWN_PROJECT_ID=<reown project id>
# Optional: VITE_BOTCHAIN_NETWORK=testnet
# Optional: VITE_BOTCHAIN_CONTRACT_ADDRESS=0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c
npm run dev
```

Open http://127.0.0.1:5173 and connect a wallet on **BOT Chain** (chain ID 677, RPC `https://rpc.botchain.ai`).

## Production (Vercel)

Project: `gasprovider-botchain` → https://gasprovider-botchain.vercel.app  
GitHub: https://github.com/AmaanSayyad/Gasprovider-B  
Deck: https://docs.google.com/presentation/d/1mmxMZ9Qfk29cvl5lYj2tROQIoB11mhDirAgToFWXZeg/edit?usp=sharing  
API: https://backend-production-6f62.up.railway.app  
Explorer: https://scan.botchain.ai

Required production env:

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | `https://backend-production-6f62.up.railway.app` |
| `VITE_REOWN_PROJECT_ID` | Reown / AppKit |
| `VITE_BOTCHAIN_NETWORK` | `mainnet` (677) or `testnet` (968) |
| `VITE_BOTCHAIN_CONTRACT_ADDRESS` | GasStation on BOT Chain (defaults to mainnet deploy) |
| `VITE_TREASURY_*_ADDRESS` | Optional destination overrides; defaults live in `src/data/chains.ts` |

```bash
vercel link --project gasprovider-botchain
vercel env pull
vercel --prod
```

## Stack

React 19, wagmi, Reown AppKit, Tailwind, Framer Motion, `@web3icons` chain marks.  
Source-chain config: `src/data/botchain.ts`.
