#!/usr/bin/env tsx
/**
 * Test Listener Configuration
 * Verifies listener can connect to Coston2 and contract
 */

import "dotenv/config";
import { ethers } from "ethers";

async function testListenerConfig() {
  console.log('🧪 Testing Listener Configuration\n');

  // Test 1: Check environment variables
  console.log('1️⃣ Checking environment variables...');
  const activeChain = process.env.ACTIVE_CHAIN || 'base';
  const rpcUrl = process.env.COSTON2_RPC_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS_COSTON2;
  const backendUrl = process.env.BACKEND_URL;
  const pollingInterval = process.env.POLLING_INTERVAL_MS;

  console.log(`   Active Chain: ${activeChain}`);
  console.log(`   RPC URL: ${rpcUrl || '❌ Not set'}`);
  console.log(`   Contract: ${contractAddress || '❌ Not set'}`);
  console.log(`   Backend URL: ${backendUrl || '❌ Not set'}`);
  console.log(`   Polling Interval: ${pollingInterval || '4000'}ms`);
  console.log();

  if (!rpcUrl || !contractAddress) {
    console.error('❌ Missing required configuration');
    process.exit(1);
  }

  // Test 2: Test RPC connection
  console.log('2️⃣ Testing RPC connection...');
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    console.log(`   ✅ Connected to network`);
    console.log(`   Chain ID: ${network.chainId}`);
    console.log(`   Block: ${blockNumber}`);
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
    process.exit(1);
  }
  console.log();

  // Test 3: Test contract exists
  console.log('3️⃣ Testing contract deployment...');
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const code = await provider.getCode(contractAddress);
    
    if (code === '0x') {
      console.error(`   ❌ No contract at address ${contractAddress}`);
      process.exit(1);
    }
    
    console.log(`   ✅ Contract deployed at ${contractAddress}`);
    console.log(`   Code size: ${code.length} bytes`);
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
    process.exit(1);
  }
  console.log();

  // Test 4: Test contract ABI
  console.log('4️⃣ Testing contract interface...');
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const ABI = [
      "event Deposited(address indexed user, uint256 totalAmount, uint256[] chainIds, uint256[] chainAmounts)",
      "function usdc() view returns (address)",
    ];
    const contract = new ethers.Contract(contractAddress, ABI, provider);
    
    // Try to call usdc() function
    const usdcAddress = await contract.usdc();
    console.log(`   ✅ Contract interface working`);
    console.log(`   USDC Token: ${usdcAddress}`);
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
    console.error(`   Note: This might be OK if contract doesn't have usdc() function`);
  }
  console.log();

  // Test 5: Test backend connectivity
  console.log('5️⃣ Testing backend connectivity...');
  if (!backendUrl) {
    console.log(`   ⚠️  Backend URL not configured`);
  } else {
    try {
      // Try to ping backend (without sending actual event)
      const healthUrl = backendUrl.replace('/event', '/health');
      const response = await fetch(healthUrl, { method: 'GET' });
      
      if (response.ok) {
        console.log(`   ✅ Backend reachable at ${backendUrl}`);
      } else {
        console.log(`   ⚠️  Backend returned status ${response.status}`);
        console.log(`   Note: Backend might not be running yet`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  Cannot reach backend: ${error.message}`);
      console.log(`   Note: Start backend with: cd backend && npm run dev`);
    }
  }
  console.log();

  // Test 6: Check for recent events
  console.log('6️⃣ Checking for recent Deposited events...');
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks
    
    const topic = ethers.id("Deposited(address,uint256,uint256[],uint256[])");
    const logs = await provider.getLogs({
      address: contractAddress,
      topics: [topic],
      fromBlock,
      toBlock: currentBlock,
    });
    
    console.log(`   Searched blocks ${fromBlock} to ${currentBlock}`);
    console.log(`   Found ${logs.length} Deposited events`);
    
    if (logs.length > 0) {
      console.log(`   Latest event at block ${logs[logs.length - 1].blockNumber}`);
    }
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
  }
  console.log();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Listener configuration test complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log();
  console.log('To start the listener:');
  console.log('  npm start');
  console.log();
}

testListenerConfig().catch(console.error);
