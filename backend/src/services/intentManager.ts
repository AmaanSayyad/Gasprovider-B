/**
 * Intent Manager Service
 * 
 * Manages user deposit intents and tracks distribution status for the Treasury demo system.
 * Provides CRUD operations for intents and coordinates with the database layer.
 * 
 * Requirements: 3.2, 3.3, 3.5, 6.1, 6.2, 10.3, 10.4, 10.5
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { PriceCalculator } from "./priceCalculator";
import {
  withDatabaseErrorHandling,
  getErrorHandler,
  ErrorCategory,
  ErrorSeverity,
} from "../utils/errorHandler";

/**
 * Intent request from user
 */
export interface IntentRequest {
  userAddress: string;
  sourceChain: number; // Cosmetic only for demo
  sourceToken: string;
  sourceAmount: bigint;
  destinationChains: number[];
  allocationPercentages: number[];
  sourceTxHash?: string; // Optional: actual transaction hash from on-chain deposit
}

/**
 * Distribution details for a specific chain
 */
export interface IntentDistribution {
  chainId: number;
  chainName: string;
  amount: string; // BigInt as string
  status: 'pending' | 'processing' | 'confirmed' | 'failed';
  txHash?: string;
  confirmations?: number;
  error?: string;
}

/**
 * Intent status enum
 */
export type IntentStatus = 
  | 'created'
  | 'validating'
  | 'distributing'
  | 'completed'
  | 'failed';

/**
 * Intent record
 */
export interface Intent {
  id: string; // UUID
  userAddress: string;
  sourceChain: number;
  sourceToken: string;
  sourceAmount: string; // BigInt as string
  usdValue: number;
  status: IntentStatus;
  distributions: IntentDistribution[];
  exchangeRatesUsed: any; // Exchange rates snapshot
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Intent Manager Service
 * Manages the lifecycle of user deposit intents
 */
export class IntentManager {
  private prisma: PrismaClient;
  private priceCalculator: PriceCalculator;

  constructor(prisma: PrismaClient, priceCalculator: PriceCalculator) {
    this.prisma = prisma;
    this.priceCalculator = priceCalculator;
    console.log("✅ IntentManager initialized");
  }

  /**
   * Create a new intent from user request
   * 
   * @param request - Intent request from user
   * @returns Created intent
   * 
   * Requirements: 3.2, 3.3, 10.3
   */
  async createIntent(request: IntentRequest): Promise<Intent> {
    // Validate request
    this.validateIntentRequest(request);

    // Calculate USD value
    const usdValue = this.priceCalculator.getUsdValue(
      request.sourceToken,
      request.sourceAmount
    );

    // Calculate distributions for each destination chain
    const distributions = this.priceCalculator.calculateDistributions(
      request.sourceToken,
      request.sourceAmount,
      request.destinationChains,
      request.allocationPercentages
    );

    // Get chain names from price calculator
    const exchangeRates = this.priceCalculator.getAllExchangeRates();

    // Create intent distributions with chain metadata
    const intentDistributions: IntentDistribution[] = distributions.map((dist) => {
      const chainConfig = exchangeRates.chains[dist.chainId.toString()];
      return {
        chainId: dist.chainId,
        chainName: chainConfig?.name || `Chain ${dist.chainId}`,
        amount: dist.amount.toString(),
        status: 'pending',
      };
    });

    // Generate unique ID
    const intentId = randomUUID();

    // Store in database with error handling
    const now = new Date();
    const dbIntent = await withDatabaseErrorHandling(
      () =>
        this.prisma.intent.create({
          data: {
            id: intentId,
            userAddress: request.userAddress.toLowerCase(),
            sourceChainId: request.sourceChain,
            sourceTxHash: request.sourceTxHash || intentId, // Use provided txHash or intentId as fallback
            tokenAddress: request.sourceToken,
            tokenSymbol: request.sourceToken.toUpperCase(),
            amountInTokenRaw: request.sourceAmount.toString(),
            amountInUsd: usdValue.toFixed(2),
            status: 'DEPOSIT_CONFIRMED', // Map to existing status
            globalPhase: 'DEPOSIT_CONFIRMED',
            allocations: intentDistributions.map((d) => ({
              chainId: d.chainId,
              chainName: d.chainName,
              nativeSymbol: exchangeRates.chains[d.chainId.toString()]?.nativeSymbol,
              amountUsd: (parseFloat(d.amount) / 1e18 * exchangeRates.chains[d.chainId.toString()]?.usdPrice).toFixed(2),
            })),
            chainStatuses: intentDistributions.map((d) => ({
              chainId: d.chainId,
              chainName: d.chainName,
              nativeSymbol: exchangeRates.chains[d.chainId.toString()]?.nativeSymbol,
              amountUsd: (parseFloat(d.amount) / 1e18 * exchangeRates.chains[d.chainId.toString()]?.usdPrice).toFixed(2),
              status: 'NOT_STARTED',
              updatedAt: now.toISOString(),
            })),
            createdAt: now,
            updatedAt: now,
          },
        }),
      "createIntent",
      { intentId, userAddress: request.userAddress }
    );

    console.log(`✅ Created intent ${intentId} for user ${request.userAddress}`);

    return this.mapDbIntentToIntent(dbIntent, intentDistributions, usdValue, exchangeRates);
  }

  /**
   * Validate intent request
   * 
   * @param request - Intent request to validate
   * @throws Error if validation fails
   * 
   * Requirements: 3.2
   */
  private validateIntentRequest(request: IntentRequest): void {
    // Validate user address format
    if (!request.userAddress || !/^0x[a-fA-F0-9]{40}$/.test(request.userAddress)) {
      throw new Error(`Invalid user address format: ${request.userAddress}`);
    }

    // Validate source amount
    if (request.sourceAmount <= 0n) {
      throw new Error(`Invalid source amount: ${request.sourceAmount}`);
    }

    // Validate destination chains
    if (!request.destinationChains || request.destinationChains.length === 0) {
      throw new Error('At least one destination chain is required');
    }

    // Validate allocation percentages
    if (request.destinationChains.length !== request.allocationPercentages.length) {
      throw new Error('Destination chains and allocation percentages must have same length');
    }

    const totalPercentage = request.allocationPercentages.reduce((sum, pct) => sum + pct, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`Allocation percentages must sum to 100, got ${totalPercentage}`);
    }

    // Validate all percentages are positive
    if (request.allocationPercentages.some((pct) => pct <= 0)) {
      throw new Error('All allocation percentages must be positive');
    }

    // Validate token is supported
    if (!this.priceCalculator.isTokenSupported(request.sourceToken)) {
      throw new Error(`Unsupported token: ${request.sourceToken}`);
    }

    // Validate all chains are supported
    for (const chainId of request.destinationChains) {
      if (!this.priceCalculator.isChainSupported(chainId)) {
        throw new Error(`Unsupported chain: ${chainId}`);
      }
    }
  }

  /**
   * Update intent status
   * 
   * @param intentId - Intent ID
   * @param status - New status
   * @param updates - Optional partial updates
   * 
   * Requirements: 6.3
   */
  async updateIntentStatus(
    intentId: string,
    status: IntentStatus,
    updates?: Partial<Intent>
  ): Promise<void> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Map demo status to database status
    const statusMap: Record<IntentStatus, string> = {
      'created': 'DEPOSIT_CONFIRMED',
      'validating': 'DEPOSIT_CONFIRMED',
      'distributing': 'DISPERSE_IN_PROGRESS',
      'completed': 'DISPERSED',
      'failed': 'FAILED',
    };

    updateData.status = statusMap[status];

    // Map to global phase
    const phaseMap: Record<IntentStatus, string> = {
      'created': 'DEPOSIT_CONFIRMED',
      'validating': 'DEPOSIT_CONFIRMED',
      'distributing': 'DISPERSING',
      'completed': 'COMPLETED',
      'failed': 'FAILED',
    };

    updateData.globalPhase = phaseMap[status];

    // Handle completion
    if (status === 'completed' && !updates?.completedAt) {
      updateData.completedAt = new Date();
    }

    // Apply additional updates if provided
    if (updates?.distributions) {
      // Update chain statuses
      const chainStatuses = updates.distributions.map((d) => ({
        chainId: d.chainId,
        chainName: d.chainName,
        amountUsd: (parseFloat(d.amount) / 1e18 * this.priceCalculator.getChainExchangeRate(d.chainId)).toFixed(2),
        status: this.mapDistributionStatusToChainStatus(d.status),
        txHash: d.txHash,
        errorMessage: d.error,
        updatedAt: new Date().toISOString(),
      }));

      updateData.chainStatuses = chainStatuses;
    }

    // Flare FDC / FTSO fields for hackathon attestation UI
    if ((updates as any)?.fdcAttestationStatus !== undefined) {
      updateData.fdcAttestationStatus = (updates as any).fdcAttestationStatus;
    }
    if ((updates as any)?.fdcAttestationRound !== undefined) {
      updateData.fdcAttestationRound = (updates as any).fdcAttestationRound;
    }
    // Intent schema has no errorMessage column — keep failure text only in logs/chainStatuses
    if ((updates as any)?.error !== undefined) {
      console.warn(`Intent ${intentId} error:`, (updates as any).error);
    }

    await withDatabaseErrorHandling(
      () =>
        this.prisma.intent.update({
          where: { id: intentId },
          data: updateData,
        }),
      "updateIntentStatus",
      { intentId, status }
    );

    console.log(`✅ Updated intent ${intentId} status to ${status}`);
  }

  /**
   * Map distribution status to chain dispersal status
   */
  private mapDistributionStatusToChainStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'NOT_STARTED',
      'processing': 'BROADCASTED',
      'confirmed': 'CONFIRMED',
      'failed': 'FAILED',
    };

    return statusMap[status] || 'NOT_STARTED';
  }

  /**
   * Add transaction hash to a specific chain distribution
   * 
   * @param intentId - Intent ID
   * @param chainId - Chain ID
   * @param txHash - Transaction hash
   * 
   * Requirements: 5.4, 6.4, 11.2
   */
  async addTransactionHash(
    intentId: string,
    chainId: number,
    txHash: string,
    options?: { confirmed?: boolean }
  ): Promise<void> {
    const chainStatus = options?.confirmed === false ? 'BROADCASTED' : 'CONFIRMED';

    await withDatabaseErrorHandling(
      async () => {
        // Get current intent
        const dbIntent = await this.prisma.intent.findUnique({
          where: { id: intentId },
        });

        if (!dbIntent) {
          throw new Error(`Intent not found: ${intentId}`);
        }

        // Parse chain statuses
        const chainStatuses = Array.isArray(dbIntent.chainStatuses)
          ? dbIntent.chainStatuses
          : JSON.parse(dbIntent.chainStatuses as any);

        // Update the specific chain status
        // Treasury drip waits for receipt before returning success, so default to CONFIRMED
        const updatedStatuses = chainStatuses.map((status: any) => {
          if (status.chainId === chainId) {
            return {
              ...status,
              txHash,
              status: chainStatus,
              updatedAt: new Date().toISOString(),
            };
          }
          return status;
        });

        // Update in database
        await this.prisma.intent.update({
          where: { id: intentId },
          data: {
            chainStatuses: updatedStatuses as any,
            updatedAt: new Date(),
          },
        });
      },
      "addTransactionHash",
      { intentId, chainId, txHash }
    );

    console.log(`✅ Added transaction hash ${txHash} for chain ${chainId} to intent ${intentId} (${chainStatus})`);
  }

  /**
   * Get intent by ID
   * 
   * @param intentId - Intent ID
   * @returns Intent or null if not found
   * 
   * Requirements: 10.4
   */
  async getIntent(intentId: string): Promise<Intent | null> {
    const dbIntent = await withDatabaseErrorHandling(
      () =>
        this.prisma.intent.findUnique({
          where: { id: intentId },
        }),
      "getIntent",
      { intentId }
    );

    if (!dbIntent) {
      return null;
    }

    // Parse distributions from chain statuses
    const chainStatuses = Array.isArray(dbIntent.chainStatuses)
      ? dbIntent.chainStatuses
      : JSON.parse(dbIntent.chainStatuses as any);

    const distributions: IntentDistribution[] = chainStatuses.map((status: any) => ({
      chainId: status.chainId,
      chainName: status.chainName || `Chain ${status.chainId}`,
      amount: (parseFloat(status.amountUsd) / this.priceCalculator.getChainExchangeRate(status.chainId) * 1e18).toFixed(0),
      status: this.mapChainStatusToDistributionStatus(status.status),
      txHash: status.txHash,
      confirmations: status.confirmations,
      error: status.errorMessage,
    }));

    const usdValue = parseFloat(dbIntent.amountInUsd);
    const exchangeRates = this.priceCalculator.getAllExchangeRates();

    return this.mapDbIntentToIntent(dbIntent, distributions, usdValue, exchangeRates);
  }

  /**
   * Map chain dispersal status to distribution status
   */
  private mapChainStatusToDistributionStatus(status: string): 'pending' | 'processing' | 'confirmed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'processing' | 'confirmed' | 'failed'> = {
      'NOT_STARTED': 'pending',
      'QUEUED': 'pending',
      'BROADCASTED': 'processing',
      'CONFIRMED': 'confirmed',
      'FAILED': 'failed',
    };

    return statusMap[status] || 'pending';
  }

  /**
   * Get all intents for a user
   * 
   * @param userAddress - User address
   * @returns Array of intents
   * 
   * Requirements: 6.1, 10.5
   */
  async getUserIntents(userAddress: string): Promise<Intent[]> {
    const dbIntents = await withDatabaseErrorHandling(
      () =>
        this.prisma.intent.findMany({
          where: {
            userAddress: {
              equals: userAddress.toLowerCase(),
              mode: 'insensitive',
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
      "getUserIntents",
      { userAddress }
    );

    const exchangeRates = this.priceCalculator.getAllExchangeRates();

    return dbIntents.map((dbIntent) => {
      // Parse distributions from chain statuses
      const chainStatuses = Array.isArray(dbIntent.chainStatuses)
        ? dbIntent.chainStatuses
        : JSON.parse(dbIntent.chainStatuses as any);

      const distributions: IntentDistribution[] = chainStatuses.map((status: any) => {
        let amount = "0";
        try {
          const rate = this.priceCalculator.getChainExchangeRate(status.chainId);
          const amountUsd = parseFloat(status.amountUsd || "0");
          if (rate > 0 && Number.isFinite(amountUsd)) {
            amount = (amountUsd / rate * 1e18).toFixed(0);
          }
        } catch {
          // Unknown/legacy chain IDs in history — keep amount 0 rather than 500
          amount = status.amount || "0";
        }
        return {
          chainId: status.chainId,
          chainName: status.chainName || `Chain ${status.chainId}`,
          amount,
          status: this.mapChainStatusToDistributionStatus(status.status),
          txHash: status.txHash,
          confirmations: status.confirmations,
          error: status.errorMessage,
        };
      });

      const usdValue = parseFloat(dbIntent.amountInUsd);

      return this.mapDbIntentToIntent(dbIntent, distributions, usdValue, exchangeRates);
    });
  }

  /**
   * Mark intent as completed
   * 
   * @param intentId - Intent ID
   * 
   * Requirements: 3.5, 5.5
   */
  async completeIntent(intentId: string): Promise<void> {
    await withDatabaseErrorHandling(
      () =>
        this.prisma.intent.update({
          where: { id: intentId },
          data: {
            status: 'DISPERSED',
            globalPhase: 'COMPLETED',
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        }),
      "completeIntent",
      { intentId }
    );

    console.log(`✅ Marked intent ${intentId} as completed`);
  }

  /**
   * Map database intent to Intent interface
   */
  private mapDbIntentToIntent(
    dbIntent: any,
    distributions: IntentDistribution[],
    usdValue: number,
    exchangeRates: any
  ): Intent {
    // Map database status to demo status
    const statusMap: Record<string, IntentStatus> = {
      'DEPOSIT_CONFIRMED': 'created',
      'DISPERSE_QUEUED': 'validating',
      'DISPERSE_IN_PROGRESS': 'distributing',
      'DISPERSED': 'completed',
      'FAILED': 'failed',
    };

    return {
      id: dbIntent.id,
      userAddress: dbIntent.userAddress,
      sourceChain: dbIntent.sourceChainId,
      sourceToken: dbIntent.tokenSymbol || dbIntent.tokenAddress,
      sourceAmount: dbIntent.amountInTokenRaw,
      usdValue,
      status: statusMap[dbIntent.status] || 'created',
      distributions,
      exchangeRatesUsed: exchangeRates,
      createdAt: dbIntent.createdAt,
      updatedAt: dbIntent.updatedAt,
      completedAt: dbIntent.completedAt || undefined,
    };
  }

  /**
   * Get intent statistics for monitoring
   * 
   * @returns Intent statistics
   */
  async getIntentStatistics(): Promise<{
    total: number;
    byStatus: Record<IntentStatus, number>;
    last24Hours: number;
    totalUsdValue: number;
  }> {
    const [total, intents] = await Promise.all([
      this.prisma.intent.count(),
      this.prisma.intent.findMany({
        select: {
          status: true,
          amountInUsd: true,
          createdAt: true,
        },
      }),
    ]);

    const byStatus: Record<IntentStatus, number> = {
      created: 0,
      validating: 0,
      distributing: 0,
      completed: 0,
      failed: 0,
    };

    let last24Hours = 0;
    let totalUsdValue = 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const intent of intents) {
      // Map status
      const statusMap: Record<string, IntentStatus> = {
        'DEPOSIT_CONFIRMED': 'created',
        'DISPERSE_QUEUED': 'validating',
        'DISPERSE_IN_PROGRESS': 'distributing',
        'DISPERSED': 'completed',
        'FAILED': 'failed',
      };

      const mappedStatus = statusMap[intent.status] || 'created';
      byStatus[mappedStatus]++;

      // Count last 24 hours
      if (intent.createdAt >= oneDayAgo) {
        last24Hours++;
      }

      // Sum USD value
      totalUsdValue += parseFloat(intent.amountInUsd);
    }

    return {
      total,
      byStatus,
      last24Hours,
      totalUsdValue,
    };
  }
}

// Export singleton instance
let intentManagerInstance: IntentManager | null = null;

/**
 * Get singleton instance of IntentManager
 */
export function getIntentManager(
  prisma?: PrismaClient,
  priceCalculator?: PriceCalculator
): IntentManager {
  if (!intentManagerInstance) {
    if (!prisma || !priceCalculator) {
      throw new Error('PrismaClient and PriceCalculator required for first initialization');
    }
    intentManagerInstance = new IntentManager(prisma, priceCalculator);
  }
  return intentManagerInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetIntentManager(): void {
  intentManagerInstance = null;
}
