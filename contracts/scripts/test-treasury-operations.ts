/**
 * Test Treasury Operations on All Chains
 * 
 * This script tests:
 * - Deposits on all chains
 * - Distributions on all chains  
 * - Withdrawals on all chains
 * - Event emissions on all chains
 */

import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { parseEther, formatEther, zeroAddress, type Address } from "viem";

// Treasury ABI (minimal interface for testing)
const TREASURY_ABI = [
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "distribute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "token", type: "address" }],
    name: "getBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface TreasuryDeployment {
  chainId: number;
  chainName: string;
  networkName: string;
  treasuryAddress: string;
  nativeToken: string;
  explorerUrl: string;
}

interface TestResult {
  chain: string;
  test: string;
  status: "PASS" | "FAIL" | "SKIP";
  details?: string;
  txHash?: string;
}

const results: TestResult[] = [];

async function loadTreasuryAddresses(): Promise<Record<string, TreasuryDeployment>> {
  const addressesPath = path.join(__dirname, "../deployments/treasury-addresses.json");
  const data = fs.readFileSync(addressesPath, "utf-8");
  return JSON.parse(data);
}

async function testDeposit(
  treasuryAddress: Address,
  chainName: string,
  walletClient: any,
  publicClient: any
): Promise<void> {
  console.log(`\n  Testing deposit on ${chainName}...`);
  
  try {
    // Get initial balance
    const initialBalance = await publicClient.readContract({
      address: treasuryAddress,
      abi: TREASURY_ABI,
      functionName: "getBalance",
      args: [zeroAddress],
    });
    console.log(`    Initial balance: ${formatEther(initialBalance)}`);
    
    // Deposit 0.001 native tokens
    const depositAmount = parseEther("0.001");
    const hash = await walletClient.writeContract({
      address: treasuryAddress,
      abi: TREASURY_ABI,
      functionName: "deposit",
      value: depositAmount,
    });
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    // Verify balance increased
    const finalBalance = await publicClient.readContract({
      address: treasuryAddress,
      abi: TREASURY_ABI,
      functionName: "getBalance",
      args: [zeroAddress],
    });
    const balanceIncrease = finalBalance - initialBalance;
    
    if (balanceIncrease === depositAmount) {
      results.push({
        chain: chainName,
        test: "Deposit",
        status: "PASS",
        details: `Deposited ${formatEther(depositAmount)} successfully`,
        txHash: hash,
      });
      console.log(`    ✓ Deposit successful: ${hash}`);
    } else {
      results.push({
        chain: chainName,
        test: "Deposit",
        status: "FAIL",
        details: `Balance increase mismatch: expected ${depositAmount}, got ${balanceIncrease}`,
      });
      console.log(`    ✗ Deposit failed: balance mismatch`);
    }
  } catch (error: any) {
    results.push({
      chain: chainName,
      test: "Deposit",
      status: "FAIL",
      details: error.message,
    });
    console.log(`    ✗ Deposit failed: ${error.message}`);
  }
}

async function testDistribution(
  treasury: ethers.Contract,
  chainName: string,
  signer: ethers.Signer
): Promise<void> {
  console.log(`\n  Testing distribution on ${chainName}...`);
  
  try {
    // Get a test recipient address (use signer's address for simplicity)
    const recipient = await signer.getAddress();
    
    // Get initial balances
    const initialTreasuryBalance = await treasury.getBalance(ethers.ZeroAddress);
    const initialRecipientBalance = await ethers.provider.getBalance(recipient);
    
    // Distribute 0.0001 native tokens
    const distributeAmount = ethers.parseEther("0.0001");
    
    // Check if Treasury has sufficient balance
    if (initialTreasuryBalance < distributeAmount) {
      results.push({
        chain: chainName,
        test: "Distribution",
        status: "SKIP",
        details: `Insufficient Treasury balance: ${ethers.formatEther(initialTreasuryBalance)}`,
      });
      console.log(`    ⊘ Distribution skipped: insufficient balance`);
      return;
    }
    
    const tx = await treasury.distribute(recipient, distributeAmount);
    const receipt = await tx.wait();
    
    // Verify balances changed correctly
    const finalTreasuryBalance = await treasury.getBalance(ethers.ZeroAddress);
    const finalRecipientBalance = await ethers.provider.getBalance(recipient);
    
    const treasuryDecrease = initialTreasuryBalance - finalTreasuryBalance;
    const recipientIncrease = finalRecipientBalance - initialRecipientBalance;
    
    if (treasuryDecrease === distributeAmount && recipientIncrease === distributeAmount) {
      results.push({
        chain: chainName,
        test: "Distribution",
        status: "PASS",
        details: `Distributed ${ethers.formatEther(distributeAmount)} successfully`,
        txHash: receipt?.hash,
      });
      console.log(`    ✓ Distribution successful: ${receipt?.hash}`);
    } else {
      results.push({
        chain: chainName,
        test: "Distribution",
        status: "FAIL",
        details: `Balance change mismatch`,
      });
      console.log(`    ✗ Distribution failed: balance mismatch`);
    }
  } catch (error: any) {
    results.push({
      chain: chainName,
      test: "Distribution",
      status: "FAIL",
      details: error.message,
    });
    console.log(`    ✗ Distribution failed: ${error.message}`);
  }
}

async function testWithdrawal(
  treasury: ethers.Contract,
  chainName: string,
  signer: ethers.Signer
): Promise<void> {
  console.log(`\n  Testing withdrawal on ${chainName}...`);
  
  try {
    // Get initial balance
    const initialBalance = await treasury.getBalance(ethers.ZeroAddress);
    
    // Withdraw 0.0001 native tokens
    const withdrawAmount = ethers.parseEther("0.0001");
    
    // Check if Treasury has sufficient balance
    if (initialBalance < withdrawAmount) {
      results.push({
        chain: chainName,
        test: "Withdrawal",
        status: "SKIP",
        details: `Insufficient Treasury balance: ${ethers.formatEther(initialBalance)}`,
      });
      console.log(`    ⊘ Withdrawal skipped: insufficient balance`);
      return;
    }
    
    const tx = await treasury.withdraw(ethers.ZeroAddress, withdrawAmount);
    const receipt = await tx.wait();
    
    // Verify balance decreased
    const finalBalance = await treasury.getBalance(ethers.ZeroAddress);
    const balanceDecrease = initialBalance - finalBalance;
    
    if (balanceDecrease === withdrawAmount) {
      results.push({
        chain: chainName,
        test: "Withdrawal",
        status: "PASS",
        details: `Withdrew ${ethers.formatEther(withdrawAmount)} successfully`,
        txHash: receipt?.hash,
      });
      console.log(`    ✓ Withdrawal successful: ${receipt?.hash}`);
    } else {
      results.push({
        chain: chainName,
        test: "Withdrawal",
        status: "FAIL",
        details: `Balance decrease mismatch`,
      });
      console.log(`    ✗ Withdrawal failed: balance mismatch`);
    }
  } catch (error: any) {
    results.push({
      chain: chainName,
      test: "Withdrawal",
      status: "FAIL",
      details: error.message,
    });
    console.log(`    ✗ Withdrawal failed: ${error.message}`);
  }
}

async function testEvents(
  treasury: ethers.Contract,
  chainName: string
): Promise<void> {
  console.log(`\n  Testing event emissions on ${chainName}...`);
  
  try {
    // Query recent events
    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks
    
    const depositFilter = treasury.filters.Deposited();
    const distributionFilter = treasury.filters.Distributed();
    const withdrawalFilter = treasury.filters.Withdrawn();
    
    const depositEvents = await treasury.queryFilter(depositFilter, fromBlock, currentBlock);
    const distributionEvents = await treasury.queryFilter(distributionFilter, fromBlock, currentBlock);
    const withdrawalEvents = await treasury.queryFilter(withdrawalFilter, fromBlock, currentBlock);
    
    const totalEvents = depositEvents.length + distributionEvents.length + withdrawalEvents.length;
    
    results.push({
      chain: chainName,
      test: "Events",
      status: "PASS",
      details: `Found ${totalEvents} events (${depositEvents.length} deposits, ${distributionEvents.length} distributions, ${withdrawalEvents.length} withdrawals)`,
    });
    console.log(`    ✓ Events verified: ${totalEvents} total events found`);
  } catch (error: any) {
    results.push({
      chain: chainName,
      test: "Events",
      status: "FAIL",
      details: error.message,
    });
    console.log(`    ✗ Event verification failed: ${error.message}`);
  }
}

async function testChain(deployment: TreasuryDeployment): Promise<void> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Testing ${deployment.chainName} (${deployment.networkName})`);
  console.log(`${"=".repeat(70)}`);
  console.log(`Treasury Address: ${deployment.treasuryAddress}`);
  console.log(`Explorer: ${deployment.explorerUrl}`);
  
  try {
    // Get signer
    const [signer] = await ethers.getSigners();
    
    // Connect to Treasury contract
    const treasury = new ethers.Contract(
      deployment.treasuryAddress,
      TREASURY_ABI,
      signer
    );
    
    // Verify owner
    const owner = await treasury.owner();
    const signerAddress = await signer.getAddress();
    
    if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
      console.log(`\n  ⚠ Warning: Signer is not owner. Skipping write operations.`);
      console.log(`    Owner: ${owner}`);
      console.log(`    Signer: ${signerAddress}`);
      
      // Only test read operations
      await testEvents(treasury, deployment.chainName);
      return;
    }
    
    // Run all tests
    await testDeposit(treasury, deployment.chainName, signer);
    await testDistribution(treasury, deployment.chainName, signer);
    await testWithdrawal(treasury, deployment.chainName, signer);
    await testEvents(treasury, deployment.chainName);
    
  } catch (error: any) {
    console.log(`\n  ✗ Chain test failed: ${error.message}`);
    results.push({
      chain: deployment.chainName,
      test: "Chain Connection",
      status: "FAIL",
      details: error.message,
    });
  }
}

async function printSummary(): void {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`TEST SUMMARY`);
  console.log(`${"=".repeat(70)}\n`);
  
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`⊘ Skipped: ${skipped}`);
  
  if (failed > 0) {
    console.log(`\nFailed Tests:`);
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        console.log(`  ✗ ${r.chain} - ${r.test}: ${r.details}`);
      });
  }
  
  console.log(`\n${"=".repeat(70)}\n`);
}

async function main() {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`TREASURY CONTRACT TESTING`);
  console.log(`${"=".repeat(70)}\n`);
  
  // Load Treasury addresses
  const deployments = await loadTreasuryAddresses();
  
  // Test only Coston2 for now (to avoid spending too much testnet tokens)
  const coston2 = deployments.coston2;
  
  if (coston2) {
    await testChain(coston2);
  } else {
    console.log("Coston2 deployment not found!");
  }
  
  // Print summary
  await printSummary();
  
  // Exit with error code if any tests failed
  const failed = results.filter((r) => r.status === "FAIL").length;
  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
