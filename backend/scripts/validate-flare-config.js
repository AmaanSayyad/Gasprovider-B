#!/usr/bin/env node

/**
 * Validate Flare Network configuration
 * 
 * This script checks that all required Flare environment variables are set
 * and validates their format.
 * 
 * Usage:
 *   node scripts/validate-flare-config.js
 */

require('dotenv').config({ path: '.env.flare.local' });

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkRequired(name, value, validator = null) {
  if (!value) {
    log(`✗ ${name}: MISSING`, 'red');
    return false;
  }
  
  if (validator && !validator(value)) {
    log(`✗ ${name}: INVALID FORMAT`, 'red');
    return false;
  }
  
  log(`✓ ${name}: OK`, 'green');
  return true;
}

function checkOptional(name, value, validator = null) {
  if (!value) {
    log(`○ ${name}: Not set (optional)`, 'yellow');
    return true;
  }
  
  if (validator && !validator(value)) {
    log(`⚠ ${name}: INVALID FORMAT`, 'yellow');
    return false;
  }
  
  log(`✓ ${name}: OK`, 'green');
  return true;
}

function isValidPrivateKey(key) {
  return /^0x[0-9a-fA-F]{64}$/.test(key);
}

function isValidAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidFeedId(feedId) {
  return /^0x[0-9a-fA-F]{42}$/.test(feedId);
}

console.log('\n' + '='.repeat(70));
log('FLARE NETWORK CONFIGURATION VALIDATION', 'bold');
console.log('='.repeat(70) + '\n');

let errors = 0;
let warnings = 0;

// Network Configuration
log('Network Configuration:', 'blue');
if (!checkRequired('FLARE_RPC_URL', process.env.FLARE_RPC_URL, isValidUrl)) errors++;
if (!checkRequired('COSTON2_RPC_URL', process.env.COSTON2_RPC_URL, isValidUrl)) errors++;
console.log();

// FTSOv2 Configuration
log('FTSOv2 Configuration:', 'blue');
const useTestnet = process.env.USE_TESTNET !== 'false';
if (useTestnet) {
  if (!checkRequired('FTSO_FAST_UPDATER_ADDRESS_COSTON2', process.env.FTSO_FAST_UPDATER_ADDRESS_COSTON2, isValidAddress)) errors++;
  if (!checkOptional('FTSO_CONFIG_ADDRESS_COSTON2', process.env.FTSO_CONFIG_ADDRESS_COSTON2, isValidAddress)) warnings++;
} else {
  if (!checkRequired('FTSO_FAST_UPDATER_ADDRESS_MAINNET', process.env.FTSO_FAST_UPDATER_ADDRESS_MAINNET, isValidAddress)) errors++;
  if (!checkOptional('FTSO_CONFIG_ADDRESS_MAINNET', process.env.FTSO_CONFIG_ADDRESS_MAINNET, isValidAddress)) warnings++;
}

// Check feed IDs
if (!checkOptional('FTSO_FEED_ID_FLR_USD', process.env.FTSO_FEED_ID_FLR_USD, isValidFeedId)) warnings++;
if (!checkOptional('FTSO_FEED_ID_BTC_USD', process.env.FTSO_FEED_ID_BTC_USD, isValidFeedId)) warnings++;
console.log();

// FDC Configuration
log('FDC Configuration:', 'blue');
if (useTestnet) {
  if (!checkRequired('FDC_HUB_ADDRESS_COSTON2', process.env.FDC_HUB_ADDRESS_COSTON2, isValidAddress)) errors++;
  if (!checkRequired('STATE_CONNECTOR_ADDRESS_COSTON2', process.env.STATE_CONNECTOR_ADDRESS_COSTON2, isValidAddress)) errors++;
  if (!checkOptional('FDC_VERIFIER_URL_COSTON2', process.env.FDC_VERIFIER_URL_COSTON2, isValidUrl)) warnings++;
} else {
  if (!checkRequired('FDC_HUB_ADDRESS_MAINNET', process.env.FDC_HUB_ADDRESS_MAINNET, isValidAddress)) errors++;
  if (!checkRequired('STATE_CONNECTOR_ADDRESS_MAINNET', process.env.STATE_CONNECTOR_ADDRESS_MAINNET, isValidAddress)) errors++;
  if (!checkOptional('FDC_VERIFIER_URL_MAINNET', process.env.FDC_VERIFIER_URL_MAINNET, isValidUrl)) warnings++;
}
console.log();

// Smart Accounts & Relayer
log('Smart Accounts & Relayer:', 'blue');
const enableSmartAccounts = process.env.ENABLE_SMART_ACCOUNTS !== 'false';
const enableRelayer = process.env.ENABLE_RELAYER !== 'false';

if (enableSmartAccounts || enableRelayer) {
  const operatorKey =
    process.env.RELAYER_PRIVATE_KEY ||
    process.env.PRIVATE_KEY ||
    process.env.DISTRIBUTOR_PRIVATE_KEY;
  if (!checkRequired('RELAYER_PRIVATE_KEY (or PRIVATE_KEY / DISTRIBUTOR_PRIVATE_KEY)', operatorKey, isValidPrivateKey)) {
    errors++;
    log('  → Generate a key with: node scripts/generate-relayer-key.js', 'yellow');
    log('  → Put it in backend/.env only (never commit)', 'yellow');
  }
  
  if (useTestnet) {
    if (!checkOptional('SMART_ACCOUNT_FACTORY_ADDRESS_COSTON2', process.env.SMART_ACCOUNT_FACTORY_ADDRESS_COSTON2, isValidAddress)) warnings++;
  } else {
    if (!checkOptional('SMART_ACCOUNT_FACTORY_ADDRESS_MAINNET', process.env.SMART_ACCOUNT_FACTORY_ADDRESS_MAINNET, isValidAddress)) warnings++;
  }
}
console.log();

// FAssets Configuration
log('FAssets Configuration:', 'blue');
const enableFAssets = process.env.ENABLE_FASSETS !== 'false';
if (enableFAssets) {
  if (useTestnet) {
    if (!checkOptional('FASSETS_ASSET_MANAGER_ADDRESS_COSTON2', process.env.FASSETS_ASSET_MANAGER_ADDRESS_COSTON2, isValidAddress)) warnings++;
    if (!checkOptional('FASSET_FBTC_ADDRESS_COSTON2', process.env.FASSET_FBTC_ADDRESS_COSTON2, isValidAddress)) warnings++;
  } else {
    if (!checkOptional('FASSETS_ASSET_MANAGER_ADDRESS_MAINNET', process.env.FASSETS_ASSET_MANAGER_ADDRESS_MAINNET, isValidAddress)) warnings++;
    if (!checkOptional('FASSET_FBTC_ADDRESS_MAINNET', process.env.FASSET_FBTC_ADDRESS_MAINNET, isValidAddress)) warnings++;
  }
}
console.log();

// GasStation Contracts
log('GasStation Contracts:', 'blue');
if (useTestnet) {
  if (!checkOptional('CONTRACT_ADDRESS_114', process.env.CONTRACT_ADDRESS_114, isValidAddress)) {
    warnings++;
    log('  → Deploy contract with: cd contracts && npx hardhat run scripts/deploy-usdc-gas-drip.ts --network coston2', 'yellow');
  }
} else {
  if (!checkOptional('CONTRACT_ADDRESS_14', process.env.CONTRACT_ADDRESS_14, isValidAddress)) {
    warnings++;
    log('  → Deploy contract to Flare Mainnet', 'yellow');
  }
}
console.log();

// Feature Flags
log('Feature Flags:', 'blue');
log(`  ENABLE_FTSO: ${process.env.ENABLE_FTSO !== 'false' ? 'Enabled' : 'Disabled'}`, 'reset');
log(`  ENABLE_FDC: ${process.env.ENABLE_FDC !== 'false' ? 'Enabled' : 'Disabled'}`, 'reset');
log(`  ENABLE_FASSETS: ${process.env.ENABLE_FASSETS !== 'false' ? 'Enabled' : 'Disabled'}`, 'reset');
log(`  ENABLE_SMART_ACCOUNTS: ${enableSmartAccounts ? 'Enabled' : 'Disabled'}`, 'reset');
log(`  ENABLE_RELAYER: ${enableRelayer ? 'Enabled' : 'Disabled'}`, 'reset');
log(`  USE_TESTNET: ${useTestnet ? 'Yes (Coston2)' : 'No (Mainnet)'}`, 'reset');
console.log();

// Summary
console.log('='.repeat(70));
log('VALIDATION SUMMARY', 'bold');
console.log('='.repeat(70));

if (errors === 0 && warnings === 0) {
  log('✓ All checks passed! Configuration is valid.', 'green');
} else {
  if (errors > 0) {
    log(`✗ ${errors} error(s) found. Please fix required configuration.`, 'red');
  }
  if (warnings > 0) {
    log(`⚠ ${warnings} warning(s). Some optional features may not work.`, 'yellow');
  }
}

console.log();

// Next Steps
if (errors === 0) {
  log('Next Steps:', 'blue');
  console.log('1. Fund your relayer wallet with FLR/C2FLR');
  console.log('   → Visit: https://faucet.flare.network/ (for Coston2)');
  console.log('2. Deploy GasStation contract (if not done)');
  console.log('   → cd contracts && npx hardhat run scripts/deploy-usdc-gas-drip.ts --network coston2');
  console.log('3. Start the backend');
  console.log('   → npm run dev');
  console.log('4. Test FTSO integration');
  console.log('   → See QUICK_START_FLARE.md for test scripts');
  console.log();
}

// Exit with error code if validation failed
process.exit(errors > 0 ? 1 : 0);
