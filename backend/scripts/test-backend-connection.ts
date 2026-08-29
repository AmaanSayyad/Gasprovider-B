#!/usr/bin/env tsx
/**
 * Quick Backend Connection Test
 * Tests Flare and Coston2 connectivity
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
function loadEnvFile(filePath: string): void {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not load ${filePath}`);
  }
}

loadEnvFile(path.join(__dirname, '../.env'));

async function testConnections() {
  console.log('🧪 Testing Backend Connections\n');

  // Test 1: Coston2 RPC
  console.log('1️⃣ Testing Coston2 RPC Connection...');
  const coston2Rpc = process.env.COSTON2_RPC_URL;
  if (!coston2Rpc) {
    console.log('   ❌ COSTON2_RPC_URL not configured');
  } else {
    try {
      const provider = new ethers.JsonRpcProvider(coston2Rpc);
      const blockNumber = await provider.getBlockNumber();
      console.log(`   ✅ Connected to Coston2`);
      console.log(`   Block: ${blockNumber}`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error}`);
    }
  }
  console.log();

  // Test 2: FTSO Configuration
  console.log('2️⃣ Testing FTSO Configuration...');
  const ftsoAddress = process.env.FTSO_V2_ADDRESS_COSTON2;
  if (!ftsoAddress) {
    console.log('   ❌ FTSO_V2_ADDRESS_COSTON2 not configured');
  } else {
    console.log(`   ✅ FTSO Address: ${ftsoAddress}`);
    
    // Try to query a price
    try {
      const provider = new ethers.JsonRpcProvider(coston2Rpc!);
      const abi = ['function getFeedsById(bytes21[] calldata _feedIds) external view returns (uint256[] memory, int8[] memory, uint64)'];
      const contract = new ethers.Contract(ftsoAddress, abi, provider);
      
      const feedId = process.env.FTSO_FEED_ID_FLR_USD || '0x01464c522f55534400000000000000000000000000';
      const [values, decimals, timestamp] = await contract.getFeedsById.staticCall([feedId]);
      
      const price = Number(values[0]) / Math.pow(10, Math.abs(Number(decimals[0])));
      console.log(`   ✅ FLR/USD Price: $${price.toFixed(6)}`);
    } catch (error: any) {
      console.log(`   ❌ Failed to query price: ${error.message}`);
    }
  }
  console.log();

  // Test 3: FDC Configuration
  console.log('3️⃣ Testing FDC Configuration...');
  const fdcHub = process.env.FDC_HUB_ADDRESS_COSTON2;
  const fdcVerification = process.env.FDC_VERIFICATION_ADDRESS_COSTON2;
  
  if (!fdcHub || !fdcVerification) {
    console.log('   ❌ FDC addresses not configured');
  } else {
    console.log(`   ✅ FDC Hub: ${fdcHub}`);
    console.log(`   ✅ FDC Verification: ${fdcVerification}`);
  }
  console.log();

  // Test 4: Relayer Configuration (env only)
  console.log('4️⃣ Testing Relayer Configuration...');
  const relayerKey =
    process.env.RELAYER_PRIVATE_KEY ||
    process.env.PRIVATE_KEY ||
    process.env.DISTRIBUTOR_PRIVATE_KEY;
  
  if (!relayerKey || /^0x0+$/.test(relayerKey)) {
    console.log('   ❌ No operator key in env (RELAYER_PRIVATE_KEY / PRIVATE_KEY / DISTRIBUTOR_PRIVATE_KEY)');
  } else {
    try {
      const wallet = new ethers.Wallet(relayerKey);
      console.log(`   ✅ Relayer Address: ${wallet.address}`);
      
      if (coston2Rpc) {
        const provider = new ethers.JsonRpcProvider(coston2Rpc);
        const balance = await provider.getBalance(wallet.address);
        console.log(`   Balance: ${ethers.formatEther(balance)} C2FLR`);
      }
    } catch (error) {
      console.log(`   ❌ Invalid relayer key`);
    }
  }
  console.log();

  // Test 5: Contract Addresses
  console.log('5️⃣ Testing Contract Addresses...');
  const gasStationAddress = process.env.CONTRACT_ADDRESS_114;
  
  if (!gasStationAddress || gasStationAddress === '0x0000000000000000000000000000000000000000') {
    console.log('   ❌ CONTRACT_ADDRESS_114 not configured');
  } else {
    console.log(`   ✅ GasStation: ${gasStationAddress}`);
    
    if (coston2Rpc) {
      try {
        const provider = new ethers.JsonRpcProvider(coston2Rpc);
        const code = await provider.getCode(gasStationAddress);
        if (code !== '0x') {
          console.log(`   ✅ Contract deployed`);
        } else {
          console.log(`   ❌ No contract at address`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to check contract`);
      }
    }
  }
  console.log();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Connection test complete!');
  console.log('═══════════════════════════════════════════════════════════');
}

testConnections().catch(console.error);
