# Gas Provider — BOT Chain deployment

> **BOT Chain** — Pay USDT on BOT Chain → native gas on destination chains (GasStation escrow + pre-funded treasuries).

## Status

**Source chain:** BOT Chain mainnet (677)  
**Escrow:** GasStation  
**Deposit asset:** USDT (6 decimals)  
**Live app:** https://gasprovider-botchain.vercel.app  
**GitHub:** https://github.com/AmaanSayyad/Gasprovider-B  
**Pitch deck:** https://docs.google.com/presentation/d/1mmxMZ9Qfk29cvl5lYj2tROQIoB11mhDirAgToFWXZeg/edit?usp=sharing  
**Explorer:** https://scan.botchain.ai  
**RPC:** https://rpc.botchain.ai

Full address table: [contracts/DEPLOYED_ADDRESSES.md](contracts/DEPLOYED_ADDRESSES.md)

---

## BOT Chain mainnet (677)

| Contract | Address |
|----------|---------|
| GasStation | [`0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c`](https://scan.botchain.ai/address/0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c) |
| USDT | `0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c` |
| MockWETH | `0xA318dCFa9bb24c83357F5AB170c32dEd02C17De2` |
| MockSwapRouter | `0xfd025D625d93ed39C9a7a6F24E1eDCD1Ab8fBcb7` |

Deployer: `0x562d89c9709B5F51dDAcABafC8e0e7A074186428`  
Deploy tx: `0x16566ee8c08d643dd5727c47a5e5d69bcf004942ababf447825e9f9f078d8f07`  
Artifact: `contracts/deployments/botchain-677.json`

## BOT Chain testnet (968)

| Contract | Address |
|----------|---------|
| GasStation | [`0xE329210534a500Fa7AC6DA1C15Ae73132836E35d`](https://scan.bohr.life/address/0xE329210534a500Fa7AC6DA1C15Ae73132836E35d) |
| USDT | `0x75edC9335175Fc0552D51D48439F229c10420fe3` |
| MockWETH | `0xD8F69A3E5227f871994Fa64B848A31e3826c0d30` |
| MockSwapRouter | `0x43531ca25679d518Db72B02a5781f8C1143A63f2` |

`e2e-botchain.mjs` passes 9/9 on testnet (dust USDT deposit + rejection paths).

## Destination treasuries

Pre-funded testnet treasuries (OP, Base, World, …). Default demo address: `0x5b402676535a3ba75c851c14e1e249a4257d2265`.  
See [docs/TREASURY_ADDRESSES.md](docs/TREASURY_ADDRESSES.md).

---

## Env after deploy

```bash
# backend/.env and listener/.env
CONTRACT_ADDRESS_677=0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c
BOTCHAIN_RPC_URL=https://rpc.botchain.ai

# frontend
VITE_BOTCHAIN_NETWORK=mainnet
VITE_BOTCHAIN_CONTRACT_ADDRESS=0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c
```

---

## Redeploy / e2e

```bash
cd contracts
BOTCHAIN_NETWORK=testnet PRIVATE_KEY=0x... node scripts/deploy-botchain.mjs
BOTCHAIN_NETWORK=testnet PRIVATE_KEY=0x... node scripts/e2e-botchain.mjs
```

---

## Links

- [scan.botchain.ai](https://scan.botchain.ai)
- [rpc.botchain.ai](https://rpc.botchain.ai)
- Testnet explorer: [scan.bohr.life](https://scan.bohr.life)
- [docs/BOTCHAIN_INTEGRATION_FILES.md](docs/BOTCHAIN_INTEGRATION_FILES.md)
