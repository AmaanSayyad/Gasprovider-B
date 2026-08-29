# Flare Integration - Important Code Files

> **Flare Summer Signal · Track 1** — Pay FXRP/C2FLR on Coston2 → native gas on destination chains (FTSO + FDC + treasuries).


This document lists all important files that implement Flare Network integrations:
- **FAssets** (Wrapped BTC/XRP/DOGE/LTC)
- **FDC** (Flare Data Connector - Cryptographic Verification)
- **FTSO** (Flare Time Series Oracle - Price Feeds)
- **Smart Accounts** (Gasless Transactions)

---

## 🔷 FAssets (Wrapped Assets)

### Backend Services
- **`backend/src/services/fassets.ts`** ⭐ **MAIN IMPLEMENTATION**
  - FAssetsService class
  - Minting, redemption, agent management
  - Reservation and ticket handling
  - ~479 lines

- **`backend/src/types/fassets.ts`** ⭐ **TYPE DEFINITIONS**
  - FAssetConfig interface
  - Agent, Reservation, RedemptionTicket types
  - AssetType enum

- **`backend/src/services/fassets.test.ts`**
  - Unit tests for FAssets service

### Frontend Components
- **`frontend/src/components/FAssetsMintingWizard.tsx`** ⭐ **MAIN UI**
  - User interface for minting FAssets
  - Step-by-step wizard for BTC/XRP/DOGE/LTC minting

- **`frontend/src/components/FAssetsRedemptionModal.tsx`** ⭐ **REDEMPTION UI**
  - Modal for redeeming FAssets back to underlying assets
  - Ticket tracking and status

### Integration Points
- **`backend/src/services/dispersal.ts`**
  - Uses FAssetsService to detect and handle FAsset deposits
  - Lines: ~280-290 (FTSO price snapshots for FAssets)

- **`backend/src/store/prisma.ts`**
  - Stores FAsset metadata in database
  - Lines: ~158-170 (FAsset detection and storage)

---

## 🔷 FDC (Flare Data Connector)

### Backend Services
- **`backend/src/services/fdc.ts`** ⭐ **MAIN IMPLEMENTATION**
  - FDCAttestationClient class
  - Attestation requests and proof retrieval
  - Merkle proof verification
  - ~494 lines

- **`backend/src/types/fdc.ts`** ⭐ **TYPE DEFINITIONS**
  - AttestationRequest, AttestationResponse interfaces
  - AttestationProof, PreparedRequest types
  - AttestationType enum

- **`backend/src/services/fdc.test.ts`**
  - Unit tests for FDC service

### Frontend Components
- **`frontend/src/components/FDCAttestationStatus.tsx`** ⭐ **UI COMPONENT**
  - Displays FDC attestation status
  - Shows verification progress and proofs

### Integration Points
- **`backend/src/services/eventProcessor.ts`** ⭐ **KEY INTEGRATION**
  - Uses FDC to verify deposits before processing
  - Lines: ~150-200 (FDC attestation flow)

- **`backend/src/services/dispersal.ts`**
  - Uses FDC proofs for deposit verification
  - Lines: ~280-290 (FDC verification before dispersal)

---

## 🔷 FTSO (Flare Time Series Oracle)

### Backend Services
- **`backend/src/services/ftso.ts`** ⭐ **MAIN IMPLEMENTATION**
  - FTSOPriceService class
  - Real-time price feed queries
  - Price caching and fallback mechanisms
  - ~518 lines

- **`backend/src/types/ftso.ts`** ⭐ **TYPE DEFINITIONS**
  - FTSOPrice, FeedConfig interfaces
  - FTSOQueryMetrics, CachedPrice types

- **`backend/src/services/ftso.test.ts`**
  - Unit tests for FTSO service

- **`backend/src/contracts/FtsoV2.abi.json`** ⭐ **CONTRACT ABI**
  - FTSOv2 contract ABI for on-chain queries

### Frontend Components
- **`frontend/src/components/FTSOPriceDisplay.tsx`** ⭐ **PRICE DISPLAY**
  - Shows real-time FTSO prices
  - Multiple feed support

- **`frontend/src/components/FTSOPriceBadge.tsx`** ⭐ **PRICE BADGE**
  - Compact price display component
  - Used in various UI elements

- **`frontend/src/components/TreasuryPriceDisplay.tsx`**
  - Displays prices used for Treasury calculations

### Integration Points
- **`backend/src/services/dispersal.ts`** ⭐ **KEY INTEGRATION**
  - Uses FTSO for price conversion before dispersal
  - Lines: ~280-300 (FTSO price snapshots)

- **`backend/src/services/priceCalculator.ts`**
  - Can use FTSO as price source
  - Fallback to hardcoded rates if FTSO unavailable

---

## 🔷 Smart Accounts (Gasless Transactions)

### Backend Services
- **`backend/src/services/smartaccount.ts`** ⭐ **MAIN IMPLEMENTATION**
  - SmartAccountManager class
  - Smart Account creation and deployment
  - Gasless transaction preparation
  - ~379 lines

- **`backend/src/services/relayer.ts`** ⭐ **RELAYER SERVICE**
  - RelayerService class
  - Executes gasless transactions on behalf of users
  - Pays gas fees for Smart Account transactions
  - Balance monitoring
  - ~462 lines

- **`backend/src/types/smartaccount.ts`** ⭐ **TYPE DEFINITIONS**
  - Call, GaslessTransaction interfaces
  - SmartAccountRecord, SmartAccountDeployment types

- **`backend/src/types/relayer.ts`** ⭐ **RELAYER TYPES**
  - TransactionValidationResult, TransactionSubmissionResult
  - TransactionStatus, RelayerBalanceInfo

- **`backend/src/services/smartaccount.test.ts`**
  - Unit tests for Smart Account service

- **`backend/src/services/relayer.test.ts`**
  - Unit tests for Relayer service

### Frontend Components
- **`frontend/src/components/SmartAccountManager.tsx`** ⭐ **MAIN UI**
  - User interface for Smart Account management
  - Shows account status, balance, transactions
  - Gasless transaction initiation

### Integration Points
- **`backend/src/services/eventProcessor.ts`** ⭐ **KEY INTEGRATION**
  - Uses Smart Accounts for gasless deposits
  - Lines: ~200-250 (Smart Account routing)

- **`backend/src/index.ts`**
  - Initializes SmartAccountManager and RelayerService
  - Lines: ~200-250 (Service initialization)

---

## 🔷 Configuration Files

### Environment Configuration
- **`backend/env.flare.local`** ⭐ **CONFIGURATION TEMPLATE**
  - All Flare-related environment variables
  - FAssets, FDC, FTSO, Smart Account configs
  - ~410 lines

### Validation Scripts
- **`backend/scripts/validate-flare-config.js`** ⭐ **VALIDATION**
  - Validates Flare configuration
  - Checks all required environment variables

- **`backend/scripts/test-ftso-coston2.ts`**
  - Tests FTSO integration on Coston2 testnet

- **`backend/scripts/setup-coston2-test-env.ts`**
  - Sets up test environment for Flare features

---

## 🔷 Main Integration Points

### Backend Entry Point
- **`backend/src/index.ts`** ⭐ **MAIN INITIALIZATION**
  - Initializes all Flare services
  - Conditionally enables based on env vars
  - Lines: ~100-250 (Service initialization)

### Event Processing
- **`backend/src/services/eventProcessor.ts`** ⭐ **CORE INTEGRATION**
  - Orchestrates FDC, FAssets, Smart Accounts
  - Main flow: Deposit → FDC Verify → FTSO Price → Dispersal
  - ~500+ lines

### Dispersal Service
- **`backend/src/services/dispersal.ts`** ⭐ **USES ALL FLARE FEATURES**
  - Uses FTSO for price conversion
  - Uses FDC for verification
  - Handles FAsset deposits
  - ~430 lines

---

## 📊 File Summary by Feature

### FAssets
1. `backend/src/services/fassets.ts` - Main service
2. `backend/src/types/fassets.ts` - Types
3. `frontend/src/components/FAssetsMintingWizard.tsx` - Minting UI
4. `frontend/src/components/FAssetsRedemptionModal.tsx` - Redemption UI

### FDC
1. `backend/src/services/fdc.ts` - Main service
2. `backend/src/types/fdc.ts` - Types
3. `frontend/src/components/FDCAttestationStatus.tsx` - Status UI
4. `backend/src/services/eventProcessor.ts` - Integration

### FTSO
1. `backend/src/services/ftso.ts` - Main service
2. `backend/src/types/ftso.ts` - Types
3. `backend/src/contracts/FtsoV2.abi.json` - Contract ABI
4. `frontend/src/components/FTSOPriceDisplay.tsx` - Price UI
5. `frontend/src/components/FTSOPriceBadge.tsx` - Badge UI

### Smart Accounts
1. `backend/src/services/smartaccount.ts` - Main service
2. `backend/src/services/relayer.ts` - Relayer service
3. `backend/src/types/smartaccount.ts` - Types
4. `backend/src/types/relayer.ts` - Relayer types
5. `frontend/src/components/SmartAccountManager.tsx` - Management UI

---

## 🎯 Quick Reference

**Want to understand how Flare features work?**
- Start with: `backend/src/services/eventProcessor.ts` (shows how all features integrate)
- Then read individual service files for details

**Want to modify Flare integration?**
- Service files: `backend/src/services/{fassets|fdc|ftso|smartaccount|relayer}.ts`
- Type definitions: `backend/src/types/{fassets|fdc|ftso|smartaccount|relayer}.ts`

**Want to see UI components?**
- Frontend: `frontend/src/components/{FAssets*|FDC*|FTSO*|SmartAccount*}.tsx`

**Configuration:**
- All config: `backend/env.flare.local`
- Validation: `backend/scripts/validate-flare-config.js`

---

## 📝 Notes

- All Flare features are **conditionally initialized** based on environment variables
- If env vars are missing, features gracefully degrade
- See `backend/src/index.ts` for initialization logic
- All services have comprehensive error handling and logging

