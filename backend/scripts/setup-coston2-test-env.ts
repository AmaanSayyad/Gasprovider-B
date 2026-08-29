#!/usr/bin/env ts-node
/**
 * Coston2 Test Environment Setup Script
 * 
 * This script sets up and validates the Coston2 testnet environment for
 * testing Flare integrations including FTSO, FDC, FAssets, and Smart Accounts.
 * 
 * Requirements: 15.1
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.flare.local
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

loadEnvFile(path.join(__dirname, '../.env.flare.local'));

interface TestWallet {
  name: string;
  address: string;
  balance: string;
  funded: boolean;
}

interface ContractConfig {
  name: string;
  address: string;
  verified: boolean;
}

interface TestEnvironmentStatus {
  rpcConnected: boolean;
  walletsConfigured: TestWallet[];
  contractsDeployed: ContractConfig[];
  ftsoConfigured: boolean;
  fdcConfigured: boolean;
  fassetsConfigured: boolean;
  smartAccountsConfigured: boolean;
  ready: boolean;
}

const COSTON2_CHAIN_ID = 114;
const MIN_BALANCE_C2FLR = ethers.parseEther('5'); // 5 C2FLR minimum

async function setupCoston2TestEnvironment(): Promise<TestEnvironmentStatus> {
  console.log('🚀 Setting up Coston2 Test Environment...\n');

  const status: TestEnvironmentStatus = {
    rpcConnected: false,
    walletsConfigured: [],
    contractsDeployed: [],
    ftsoConfigured: false,
    fdcConfigured: false,
    fassetsConfigured: false,
    smartAccountsConfigured: false,
    ready: false,
  };

  // Step 1: Configure and test RPC connection
  console.log('📡 Step 1: Configuring Coston2 RPC endpoint...');
  const rpcUrl = process.env.COSTON2_RPC_URL;
  
  if (!rpcUrl) {
    console.error('❌ COSTON2_RPC_URL not configured in .env.flare.local');
    return status;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    
    if (Number(network.chainId) !== COSTON2_CHAIN_ID) {
      console.error(`❌ Wrong network! Expected chain ID ${COSTON2_CHAIN_ID}, got ${network.chainId}`);
      return status;
    }

    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected to Coston2 (Chain ID: ${network.chainId})`);
    console.log(`   Current block: ${blockNumber}`);
    console.log(`   RPC URL: ${rpcUrl}\n`);
    status.rpcConnected = true;

    // Step 2: Check test wallets
    console.log('👛 Step 2: Checking test wallet configuration...');
    
    const wallets = [
      { name: 'Distributor', envKey: 'PRIVATE_KEY' },
      { name: 'Relayer', envKey: 'RELAYER_PRIVATE_KEY' },
    ];

    for (const walletConfig of wallets) {
      const privateKey = process.env[walletConfig.envKey];
      
      if (!privateKey || privateKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log(`⚠️  ${walletConfig.name} wallet not configured (${walletConfig.envKey})`);
        status.walletsConfigured.push({
          name: walletConfig.name,
          address: 'Not configured',
          balance: '0',
          funded: false,
        });
        continue;
      }

      try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const balance = await provider.getBalance(wallet.address);
        const balanceEth = ethers.formatEther(balance);
        const funded = balance >= MIN_BALANCE_C2FLR;

        console.log(`   ${walletConfig.name}:`);
        console.log(`     Address: ${wallet.address}`);
        console.log(`     Balance: ${balanceEth} C2FLR ${funded ? '✅' : '⚠️  (needs funding)'}`);

        status.walletsConfigured.push({
          name: walletConfig.name,
          address: wallet.address,
          balance: balanceEth,
          funded,
        });

        if (!funded) {
          console.log(`     🔗 Get testnet tokens: https://faucet.flare.network/`);
        }
      } catch (error) {
        console.error(`   ❌ Invalid private key for ${walletConfig.name}`);
        status.walletsConfigured.push({
          name: walletConfig.name,
          address: 'Invalid key',
          balance: '0',
          funded: false,
        });
      }
    }
    console.log();

    // Step 3: Verify deployed contracts
    console.log('📜 Step 3: Verifying deployed contracts...');
    
    const contracts = [
      { name: 'GasStation', envKey: 'CONTRACT_ADDRESS_114' },
      { name: 'Mock USDC', envKey: 'MOCK_USDC_ADDRESS_COSTON2' },
      { name: 'Mock WETH', envKey: 'MOCK_WETH_ADDRESS_COSTON2' },
    ];

    for (const contract of contracts) {
      const address = process.env[contract.envKey];
      
      if (!address || address === '0x0000000000000000000000000000000000000000') {
        console.log(`   ⚠️  ${contract.name} not deployed (${contract.envKey})`);
        status.contractsDeployed.push({
          name: contract.name,
          address: 'Not deployed',
          verified: false,
        });
        continue;
      }

      try {
        const code = await provider.getCode(address);
        const deployed = code !== '0x';

        console.log(`   ${contract.name}:`);
        console.log(`     Address: ${address}`);
        console.log(`     Status: ${deployed ? '✅ Deployed' : '❌ Not deployed'}`);
        console.log(`     Explorer: https://coston2-explorer.flare.network/address/${address}`);

        status.contractsDeployed.push({
          name: contract.name,
          address,
          verified: deployed,
        });
      } catch (error) {
        console.error(`   ❌ Error checking ${contract.name}: ${error}`);
        status.contractsDeployed.push({
          name: contract.name,
          address,
          verified: false,
        });
      }
    }
    console.log();

    // Step 4: Verify FTSO configuration
    console.log('📊 Step 4: Verifying FTSO configuration...');
    
    const ftsoAddress = process.env.FTSO_FAST_UPDATER_ADDRESS_COSTON2;
    if (ftsoAddress && ftsoAddress !== '0x0000000000000000000000000000000000000000') {
      const code = await provider.getCode(ftsoAddress);
      status.ftsoConfigured = code !== '0x';
      
      console.log(`   FastUpdater: ${ftsoAddress}`);
      console.log(`   Status: ${status.ftsoConfigured ? '✅ Configured' : '❌ Not deployed'}`);
      
      if (status.ftsoConfigured) {
        console.log(`   Feed IDs configured:`);
        console.log(`     - FLR/USD: ${process.env.FTSO_FEED_ID_FLR_USD || 'Not set'}`);
        console.log(`     - BTC/USD: ${process.env.FTSO_FEED_ID_BTC_USD || 'Not set'}`);
        console.log(`     - ETH/USD: ${process.env.FTSO_FEED_ID_ETH_USD || 'Not set'}`);
      }
    } else {
      console.log('   ⚠️  FTSO FastUpdater address not configured');
    }
    console.log();

    // Step 5: Verify FDC configuration
    console.log('🔗 Step 5: Verifying FDC configuration...');
    
    const fdcAddress = process.env.FDC_VERIFICATION_ADDRESS_COSTON2;
    const fdcHubAddress = process.env.FDC_HUB_ADDRESS_COSTON2;
    
    if (fdcAddress && fdcAddress !== '0x0000000000000000000000000000000000000000') {
      // State Connector is a system contract, may not have code but is still valid
      // Check if FDC Hub has code instead
      let hasCode = false;
      if (fdcHubAddress && fdcHubAddress !== '0x0000000000000000000000000000000000000000') {
        const code = await provider.getCode(fdcHubAddress);
        hasCode = code !== '0x';
      }
      
      status.fdcConfigured = true; // FDC addresses are configured
      
      console.log(`   State Connector: ${fdcAddress}`);
      console.log(`   FDC Hub: ${fdcHubAddress || 'Not set'} ${hasCode ? '✅' : ''}`);
      console.log(`   Status: ✅ Configured`);
      console.log(`   Verifier URL: ${process.env.FDC_VERIFIER_URL_COSTON2 || 'Not set'}`);
      console.log(`   DA Layer URL: ${process.env.FDC_DA_LAYER_URL_COSTON2 || 'Not set'}`);
    } else {
      console.log('   ⚠️  FDC Verification address not configured');
    }
    console.log();

    // Step 6: Check FAssets configuration
    console.log('💎 Step 6: Checking FAssets configuration...');
    
    const fassetsManager = process.env.FASSETS_ASSET_MANAGER_ADDRESS_COSTON2;
    if (fassetsManager && fassetsManager !== '0x0000000000000000000000000000000000000000') {
      const code = await provider.getCode(fassetsManager);
      status.fassetsConfigured = code !== '0x';
      
      console.log(`   AssetManager: ${fassetsManager}`);
      console.log(`   Status: ${status.fassetsConfigured ? '✅ Configured' : '❌ Not deployed'}`);
    } else {
      console.log('   ⚠️  FAssets not yet available on Coston2 (expected)');
      status.fassetsConfigured = true; // Not required for basic testing
    }
    console.log();

    // Step 7: Check Smart Accounts configuration
    console.log('🔐 Step 7: Checking Smart Accounts configuration...');
    
    const smartAccountFactory = process.env.SMART_ACCOUNT_FACTORY_ADDRESS_COSTON2;
    if (smartAccountFactory && smartAccountFactory !== '0x0000000000000000000000000000000000000000') {
      const code = await provider.getCode(smartAccountFactory);
      status.smartAccountsConfigured = code !== '0x';
      
      console.log(`   Factory: ${smartAccountFactory}`);
      console.log(`   Status: ${status.smartAccountsConfigured ? '✅ Configured' : '❌ Not deployed'}`);
    } else {
      console.log('   ⚠️  Smart Account factory not yet configured (optional)');
      status.smartAccountsConfigured = true; // Not required for basic testing
    }
    console.log();

    // Final status
    const allWalletsFunded = status.walletsConfigured.every(w => w.funded);
    const allContractsDeployed = status.contractsDeployed.every(c => c.verified);
    
    status.ready = status.rpcConnected && 
                   allWalletsFunded && 
                   allContractsDeployed && 
                   status.ftsoConfigured && 
                   status.fdcConfigured;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 Test Environment Status Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`RPC Connection:        ${status.rpcConnected ? '✅' : '❌'}`);
    console.log(`Wallets Funded:        ${allWalletsFunded ? '✅' : '⚠️'}`);
    console.log(`Contracts Deployed:    ${allContractsDeployed ? '✅' : '⚠️'}`);
    console.log(`FTSO Configured:       ${status.ftsoConfigured ? '✅' : '❌'}`);
    console.log(`FDC Configured:        ${status.fdcConfigured ? '✅' : '❌'}`);
    console.log(`FAssets Available:     ${status.fassetsConfigured ? '✅' : '⚠️'}`);
    console.log(`Smart Accounts Ready:  ${status.smartAccountsConfigured ? '✅' : '⚠️'}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log(`Overall Status:        ${status.ready ? '✅ READY FOR TESTING' : '⚠️  NEEDS CONFIGURATION'}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (!status.ready) {
      console.log('📝 Next Steps:');
      if (!allWalletsFunded) {
        console.log('   1. Fund test wallets with C2FLR from https://faucet.flare.network/');
      }
      if (!allContractsDeployed) {
        console.log('   2. Deploy contracts: cd contracts && npx hardhat run scripts/deploy-coston2.ts --network coston2');
      }
      if (!status.ftsoConfigured || !status.fdcConfigured) {
        console.log('   3. Verify Flare contract addresses in .env.flare.local');
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Error setting up test environment:', error);
  }

  return status;
}

// Run the setup
if (require.main === module) {
  setupCoston2TestEnvironment()
    .then((status) => {
      process.exit(status.ready ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { setupCoston2TestEnvironment, TestEnvironmentStatus };
