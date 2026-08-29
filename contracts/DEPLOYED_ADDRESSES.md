# Deployed Contract Addresses

> BOT Chain is the **source chain**: users deposit USDT into the GasStation
> escrow here, and the listener forwards the `Deposited` event to the backend,
> which disperses native gas on the destination chains.

## BOT Chain mainnet (chainId 677)

| Contract | Address |
|----------|---------|
| GasStation (escrow) | `0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c` |
| USDT (deposit asset, 6 decimals) | `0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c` |
| MockWETH | `0xA318dCFa9bb24c83357F5AB170c32dEd02C17De2` |
| MockSwapRouter | `0xfd025D625d93ed39C9a7a6F24E1eDCD1Ab8fBcb7` |

Explorer: https://scan.botchain.ai/address/0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c
Deployer: `0x562d89c9709B5F51dDAcABafC8e0e7A074186428` · 3,301,188 gas total

## BOT Chain testnet (chainId 968)

| Contract | Address |
|----------|---------|
| GasStation (escrow) | `0xE329210534a500Fa7AC6DA1C15Ae73132836E35d` |
| USDT | `0x75edC9335175Fc0552D51D48439F229c10420fe3` |
| MockWETH | `0xD8F69A3E5227f871994Fa64B848A31e3826c0d30` |
| MockSwapRouter | `0x43531ca25679d518Db72B02a5781f8C1143A63f2` |

Explorer: https://scan.bohr.life/address/0xE329210534a500Fa7AC6DA1C15Ae73132836E35d

### Why the router and wrapped-native are mocks

`GasStation.drip()` swaps USDT for the native coin through a Uniswap-style
router. BOT Chain has no DEX, and the constructor rejects zero addresses for
those two, so they are mocks. Nothing on the source chain calls `drip()` —
deposits only need `usdc`, and dispersal runs against the Treasury contracts on
the destination chains.

## Configuration

```bash
# backend/.env and listener/.env
CONTRACT_ADDRESS_677=0x418ccA81E0c19d2F49Eee4D34274b29cfF59C85c
BOTCHAIN_RPC_URL=https://rpc.botchain.ai
```

## Commands

```bash
cd contracts
BOTCHAIN_NETWORK=testnet PRIVATE_KEY=0x... node scripts/deploy-botchain.mjs
BOTCHAIN_NETWORK=testnet PRIVATE_KEY=0x... node scripts/e2e-botchain.mjs
```

`e2e-botchain.mjs` deposits 0.00001 USDT and asserts the `Deposited` event
round-trips, plus the rejection paths. It passes 9/9 on testnet. On mainnet the
two deposit checks need the signer to hold USDT.

## Destination chains

Unchanged — see the treasury addresses in `frontend/src/data/chains.ts` and the
`TREASURY_*_ADDRESS` variables in `backend/.env`.
