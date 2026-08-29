# Deployed Contract Addresses

> **Flare Summer Signal · Track 1** — Pay FXRP/C2FLR on Coston2 → native gas on destination chains (FTSO + FDC + treasuries).


## Coston2 Testnet (Chain ID: 114)

### Deployment Date
December 6, 2024

### Deployer Address
`0x56b9768f769b88c861955ca2ea3ec1f91870d61c`

### Deployed Contracts

#### GasProvider (Main Contract)
- **Address**: `0x0df12f3eb5131f004d2378d0b265415386dfb97a`
- **Explorer**: https://coston2-explorer.flare.network/address/0x0df12f3eb5131f004d2378d0b265415386dfb97a
- **Features**: 
  - FTSO price feed integration
  - FDC attestation verification
  - FAsset token support
  - Smart Account compatibility

#### Mock USDC (Test Token)
- **Address**: `0x5b402676535a3ba75c851c14e1e249a4257d2265`
- **Symbol**: USDC
- **Decimals**: 6
- **Explorer**: https://coston2-explorer.flare.network/address/0x5b402676535a3ba75c851c14e1e249a4257d2265

#### Mock WETH (Wrapped FLR)
- **Address**: `0x945b176b7f9505f7541eb3c219bd91efbfc33699`
- **Symbol**: WETH
- **Decimals**: 18
- **Explorer**: https://coston2-explorer.flare.network/address/0x945b176b7f9505f7541eb3c219bd91efbfc33699

#### Mock Swap Router
- **Address**: `0x9ee30c1ad4b02e6ac981cf03ae9e37565117e179`
- **Explorer**: https://coston2-explorer.flare.network/address/0x9ee30c1ad4b02e6ac981cf03ae9e37565117e179

### Flare Integration Addresses

#### FTSO FastUpdater
- **Address**: `0x58fb598EC6DB6901aA6F26a9A2087E9274128E59`
- **Purpose**: Real-time price feed queries
- **Documentation**: https://docs.flare.network/ftso/

#### FDC Verification
- **Address**: `0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3`
- **Purpose**: Cross-chain attestation verification
- **Documentation**: https://docs.flare.network/fdc/

### Configuration

Add these to your `backend/.env.flare.local`:

```bash
# GasStation Contract
CONTRACT_ADDRESS_114=0x0df12f3eb5131f004d2378d0b265415386dfb97a

# Flare Integrations
FTSO_FAST_UPDATER_ADDRESS_COSTON2=0x58fb598EC6DB6901aA6F26a9A2087E9274128E59
FDC_VERIFICATION_ADDRESS_COSTON2=0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3
STATE_CONNECTOR_ADDRESS_COSTON2=0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3

# Test Tokens
MOCK_USDC_ADDRESS_COSTON2=0x5b402676535a3ba75c851c14e1e249a4257d2265
MOCK_WETH_ADDRESS_COSTON2=0x945b176b7f9505f7541eb3c219bd91efbfc33699
```

### Verification Command

To verify the GasStation contract on the block explorer:

```bash
npx hardhat verify --network coston2 0x0df12f3eb5131f004d2378d0b265415386dfb97a \
  "0x5b402676535a3ba75c851c14e1e249a4257d2265" \
  "0x9ee30c1ad4b02e6ac981cf03ae9e37565117e179" \
  "0x945b176b7f9505f7541eb3c219bd91efbfc33699" \
  3000 \
  "0x58fb598EC6DB6901aA6F26a9A2087E9274128E59" \
  "0x0c13aDA1C7143Cf0a0795FFaB93eEBb6FAD6e4e3"
```

### Next Steps

1. ✅ Contracts deployed successfully
2. ✅ Configuration updated in backend/.env.flare.local
3. ⏳ Verify contracts on block explorer
4. ⏳ Test FTSO price queries
5. ⏳ Test FDC attestation verification
6. ⏳ Test deposits through frontend

### Testing

Test the deployment:

```bash
# Test FTSO integration
npx hardhat run scripts/test-ftso-coston2.ts --network coston2

# Test deposit flow
npx hardhat run scripts/test-deposit-coston2.ts --network coston2
```

### Notes

- All contracts are deployed on Coston2 testnet
- Use C2FLR for gas fees
- Mock tokens are for testing only
- FAsset support is ready but requires real FAsset addresses
- Smart Account factory address needs to be configured when available
