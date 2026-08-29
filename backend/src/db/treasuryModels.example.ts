/**
 * Treasury Demo System - Database Models Usage Examples
 * 
 * This file demonstrates how to use the Treasury demo system database models.
 * These examples show common operations for each model.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Example 1: Creating a Treasury Intent
 */
export async function createTreasuryIntent() {
  const intent = await prisma.treasuryIntent.create({
    data: {
      userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      sourceChain: 1, // Ethereum
      sourceToken: 'USDC',
      sourceAmount: '1000000', // 1 USDC (6 decimals)
      usdValue: '1.00',
      status: 'created',
      globalPhase: 'created',
      distributions: [
        {
          chainId: 10,
          chainName: 'Optimism',
          amount: '100000000000000000', // 0.1 ETH
          status: 'pending'
        },
        {
          chainId: 42161,
          chainName: 'Arbitrum',
          amount: '100000000000000000', // 0.1 ETH
          status: 'pending'
        }
      ],
      exchangeRatesUsed: {
        tokens: {
          USDC: 1.0,
          USDT: 1.0
        },
        chains: {
          1: 2500,    // ETH
          10: 2500,   // OP (uses ETH)
          42161: 2500 // ARB (uses ETH)
        }
      },
      retryCount: 0
    }
  });

  console.log('Created intent:', intent.id);
  return intent;
}

/**
 * Example 2: Updating Intent Status
 */
export async function updateIntentStatus(intentId: string, status: string) {
  const intent = await prisma.treasuryIntent.update({
    where: { id: intentId },
    data: {
      status,
      globalPhase: status,
      updatedAt: new Date()
    }
  });

  return intent;
}

/**
 * Example 3: Completing an Intent
 */
export async function completeIntent(intentId: string) {
  const intent = await prisma.treasuryIntent.update({
    where: { id: intentId },
    data: {
      status: 'completed',
      globalPhase: 'completed',
      completedAt: new Date()
    }
  });

  return intent;
}

/**
 * Example 4: Getting User Intents
 */
export async function getUserIntents(userAddress: string) {
  const intents = await prisma.treasuryIntent.findMany({
    where: { userAddress },
    orderBy: { createdAt: 'desc' },
    include: {
      operations: {
        orderBy: { timestamp: 'desc' }
      }
    }
  });

  return intents;
}

/**
 * Example 5: Updating Treasury Balance
 */
export async function updateTreasuryBalance(chainId: number, chainName: string) {
  const balance = await prisma.treasuryBalance.upsert({
    where: { chainId },
    create: {
      chainId,
      chainName,
      nativeBalance: '5000000000000000000', // 5 ETH
      nativeSymbol: 'ETH',
      tokenBalances: [
        {
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          tokenSymbol: 'USDC',
          balance: '10000000000', // 10,000 USDC
          decimals: 6
        }
      ],
      blockNumber: 12345678
    },
    update: {
      nativeBalance: '5000000000000000000',
      tokenBalances: [
        {
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          tokenSymbol: 'USDC',
          balance: '10000000000',
          decimals: 6
        }
      ],
      lastUpdated: new Date(),
      blockNumber: 12345678
    }
  });

  return balance;
}

/**
 * Example 6: Getting All Treasury Balances
 */
export async function getAllTreasuryBalances() {
  const balances = await prisma.treasuryBalance.findMany({
    orderBy: { chainId: 'asc' }
  });

  return balances;
}

/**
 * Example 7: Logging a Treasury Operation
 */
export async function logTreasuryOperation(
  chainId: number,
  operationType: 'deposit' | 'distribute' | 'withdraw',
  txHash: string,
  amount: string,
  intentId?: string
) {
  const operation = await prisma.treasuryOperation.create({
    data: {
      chainId,
      operationType,
      txHash,
      blockNumber: 12345678,
      amount,
      intentId,
      status: 'pending',
      confirmations: 0
    }
  });

  return operation;
}

/**
 * Example 8: Updating Operation Status
 */
export async function updateOperationStatus(
  operationId: string,
  status: 'pending' | 'confirmed' | 'failed',
  confirmations: number
) {
  const operation = await prisma.treasuryOperation.update({
    where: { id: operationId },
    data: {
      status,
      confirmations
    }
  });

  return operation;
}

/**
 * Example 9: Getting Operations for an Intent
 */
export async function getIntentOperations(intentId: string) {
  const operations = await prisma.treasuryOperation.findMany({
    where: { intentId },
    orderBy: { timestamp: 'desc' }
  });

  return operations;
}

/**
 * Example 10: Creating Exchange Rate Config
 */
export async function createExchangeRateConfig() {
  const config = await prisma.exchangeRateConfig.create({
    data: {
      tokenRates: {
        USDC: 1.0,
        USDT: 1.0,
        FLR: 0.025,
        WFLR: 0.025
      },
      chainRates: {
        1: 2500,      // ETH
        56: 320,      // BNB
        137: 0.85,    // MATIC
        43114: 25,    // AVAX
        42161: 2500,  // ARB
        10: 2500,     // OP
        14: 0.025     // FLR
      },
      version: 1,
      isActive: true
    }
  });

  return config;
}

/**
 * Example 11: Getting Active Exchange Rate Config
 */
export async function getActiveExchangeRateConfig() {
  const config = await prisma.exchangeRateConfig.findFirst({
    where: { isActive: true },
    orderBy: { version: 'desc' }
  });

  return config;
}

/**
 * Example 12: Deactivating Old Configs and Creating New One
 */
export async function updateExchangeRates(newRates: {
  tokenRates: Record<string, number>;
  chainRates: Record<number, number>;
}) {
  // Deactivate all existing configs
  await prisma.exchangeRateConfig.updateMany({
    where: { isActive: true },
    data: { isActive: false }
  });

  // Get the latest version
  const latestConfig = await prisma.exchangeRateConfig.findFirst({
    orderBy: { version: 'desc' }
  });

  const newVersion = (latestConfig?.version || 0) + 1;

  // Create new active config
  const config = await prisma.exchangeRateConfig.create({
    data: {
      tokenRates: newRates.tokenRates,
      chainRates: newRates.chainRates,
      version: newVersion,
      isActive: true
    }
  });

  return config;
}

/**
 * Example 13: Complete Flow - Create Intent with Operations
 */
export async function createIntentWithOperations() {
  // Create intent
  const intent = await createTreasuryIntent();

  // Log distribution operations for each chain
  const operations = await Promise.all([
    logTreasuryOperation(
      10, // Optimism
      'distribute',
      '0xabc123...',
      '100000000000000000', // 0.1 ETH
      intent.id
    ),
    logTreasuryOperation(
      42161, // Arbitrum
      'distribute',
      '0xdef456...',
      '100000000000000000', // 0.1 ETH
      intent.id
    )
  ]);

  // Update intent status
  await updateIntentStatus(intent.id, 'distributing');

  // Simulate confirmations
  for (const op of operations) {
    await updateOperationStatus(op.id, 'confirmed', 12);
  }

  // Complete intent
  await completeIntent(intent.id);

  return { intent, operations };
}

// Export all functions
export const TreasuryModelsExamples = {
  createTreasuryIntent,
  updateIntentStatus,
  completeIntent,
  getUserIntents,
  updateTreasuryBalance,
  getAllTreasuryBalances,
  logTreasuryOperation,
  updateOperationStatus,
  getIntentOperations,
  createExchangeRateConfig,
  getActiveExchangeRateConfig,
  updateExchangeRates,
  createIntentWithOperations
};
