# Frontend — Gas Provider

Vite + React UI for **Flare Summer Signal Track 1**.

Pay **FXRP / C2FLR** on Coston2 → receive native gas on funded destination chains.

## Run locally

```bash
npm install
# .env.local
# VITE_API_URL=http://localhost:3000
# VITE_REOWN_PROJECT_ID=<reown project id>
npm run dev
```

Open http://127.0.0.1:5173

## Production (Vercel)

Project: `gas-provider` → https://gas-provider.vercel.app  
API: https://backend-production-6f62.up.railway.app  
Demo video: https://youtu.be/XTCR6daMmE0  
Pitch deck: https://docs.google.com/presentation/d/1dcDHlryNzrDfVudiqPB-xnrNiIX9w971PFaoAP4Jztk/edit?usp=sharing

Required production env:

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | `https://backend-production-6f62.up.railway.app` |
| `VITE_REOWN_PROJECT_ID` | Reown / AppKit |
| `VITE_TREASURY_*_ADDRESS` | Optional overrides; defaults live in `src/data/chains.ts` |

```bash
vercel link --project gas-provider
vercel env pull
vercel --prod
```

## Stack

React 19, wagmi, Reown AppKit, Tailwind, Framer Motion, `@web3icons` chain marks.
