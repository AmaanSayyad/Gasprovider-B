# Backend — Gas Provider

Fastify API for BOT Chain deposits: quotes, `Deposited` event intents, and treasury gas distribution on destination chains.

## Run

```bash
cp .env.example .env
# CONTRACT_ADDRESS_677=0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c
# BOTCHAIN_RPC_URL=https://rpc.botchain.ai
# DISTRIBUTOR_PRIVATE_KEY / DATABASE_URL
npm install
npx prisma migrate deploy
npm run dev   # :3000
```

Health: `GET /health`

## Production

Deploy with Railway (`railway.json` + Dockerfile).

**Production:** https://backend-production-6f62.up.railway.app  
Point frontend `VITE_API_URL` at that URL (already set on Vercel Production).

## Key services

- `priceCalculator` — USD quotes from `exchangeRates.json`
- `eventProcessor` — BOT Chain deposit → intent pipeline
- `treasuryDistribution` — native gas payouts on destination chains
- `smartaccount` / `relayer` — optional gasless path on BOT Chain

See [../docs/ENVIRONMENT_VARIABLES.md](../docs/ENVIRONMENT_VARIABLES.md).
