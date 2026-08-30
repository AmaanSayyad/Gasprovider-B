# Gas Provider deposit listener

Indexes `Deposited` events from the **GasStation** escrow on **BOT Chain** and forwards them to the backend.

Event: `Deposited(address indexed user, uint256 totalAmount, uint256[] chainIds, uint256[] chainAmounts)`

Default escrow (mainnet 677): `0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c`  
Explorer: https://scan.botchain.ai/address/0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c

### Setup

```bash
cd listener
cp env.example .env
# BOTCHAIN_RPC_URL=https://rpc.botchain.ai
# CONTRACT_ADDRESS_677=0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c
# BACKEND_URL=http://localhost:3000/event
# Optional: BOTCHAIN_WS_URL=
npm i
```

### Run

```bash
npx --yes tsx src/index.ts
# or
npm run start
```

### Notes

- HTTP JSON-RPC polling is the default (`POLLING_INTERVAL_MS`, default 4000).
- Set `BOTCHAIN_WS_URL` when the node supports WebSockets — preferred over `eth_newFilter`.
- After `BOTCHAIN_NETWORK=testnet node scripts/deploy-botchain.mjs` in `contracts/`, point `CONTRACT_ADDRESS_677` (or the 968 equivalent) at the new GasStation.
