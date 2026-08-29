#!/usr/bin/env node

/**
 * Generate a new private key for the Flare relayer service
 * 
 * Usage:
 *   node scripts/generate-relayer-key.js
 * 
 * This script generates a cryptographically secure random private key
 * that can be used for the RELAYER_PRIVATE_KEY environment variable.
 * 
 * SECURITY WARNING:
 * - Keep this private key secure
 * - Never commit it to version control
 * - Store it in .env.flare.local (which should be in .gitignore)
 * - Fund the corresponding address with FLR for gas payments
 */

const crypto = require('crypto');
const { ethers } = require('ethers');

function generateRelayerKey() {
  // Generate 32 random bytes
  const privateKeyBytes = crypto.randomBytes(32);
  
  // Convert to hex string with 0x prefix
  const privateKey = '0x' + privateKeyBytes.toString('hex');
  
  // Derive the public address from the private key
  const wallet = new ethers.Wallet(privateKey);
  const address = wallet.address;
  
  return { privateKey, address };
}

// Generate the key
const { privateKey, address } = generateRelayerKey();

console.log('\n='.repeat(70));
console.log('FLARE RELAYER KEY GENERATED');
console.log('='.repeat(70));
console.log('\nPrivate Key:');
console.log(privateKey);
console.log('\nPublic Address:');
console.log(address);
console.log('\n' + '='.repeat(70));
console.log('\nIMPORTANT NEXT STEPS:');
console.log('='.repeat(70));
console.log('1. Add this to your .env.flare.local file:');
console.log(`   RELAYER_PRIVATE_KEY=${privateKey}`);
console.log('\n2. Fund this address with FLR tokens:');
console.log(`   Address: ${address}`);
console.log('   - Coston2 Testnet: https://faucet.flare.network/');
console.log('   - Flare Mainnet: Transfer FLR from your wallet');
console.log('\n3. Monitor the relayer balance regularly');
console.log('   - Set RELAYER_BALANCE_THRESHOLD in .env.flare.local');
console.log('   - The system will warn when balance is low');
console.log('\n' + '='.repeat(70));
console.log('SECURITY WARNING:');
console.log('='.repeat(70));
console.log('- NEVER commit this private key to version control');
console.log('- Store it securely in .env.flare.local');
console.log('- Ensure .env.flare.local is in .gitignore');
console.log('- Use a separate key for production vs development');
console.log('='.repeat(70) + '\n');
