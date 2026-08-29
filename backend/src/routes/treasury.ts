/**
 * Treasury API Routes
 * 
 * Provides REST API endpoints for the Treasury demo system.
 * Handles chain information, gas estimates, deposits, intent status, and user history.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 7.2, 7.5, 8.1, 8.5
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PriceCalculator } from "../services/priceCalculator";
import { IntentManager } from "../services/intentManager";
import { TreasuryDistributionService } from "../services/treasuryDistribution";
import { ApiError } from "../types";
import { DISABLED_DESTINATION_CHAIN_IDS } from "../config/activeChains";
import {
  getErrorHandler,
  ErrorCategory,
  ErrorSeverity,
} from "../utils/errorHandler";

// ============================================================================
// Validation Schemas
// ============================================================================

const EstimateRequestSchema = z.object({
  sourceToken: z.string().min(1, "Source token is required"),
  amount: z.string().regex(/^\d+$/, "Amount must be a positive integer string"),
  destinationChains: z.array(z.number().int().positive()).min(1, "At least one destination chain required"),
  allocationPercentages: z.array(z.number().min(0).max(100)).min(1, "At least one allocation percentage required"),
});

const DepositRequestSchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
  sourceChain: z.number().int().positive(),
  sourceToken: z.string().min(1, "Source token is required"),
  amount: z.string().regex(/^\d+$/, "Amount must be a positive integer string"),
  destinationChains: z.array(z.number().int().positive()).min(1, "At least one destination chain required"),
  allocationPercentages: z.array(z.number().min(0).max(100)).min(1, "At least one allocation percentage required"),
  sourceTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash format").optional(),
});

const UserHistoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default("20"),
});

function assertDestinationsEnabled(destinationChains: number[]): ApiError | null {
  const blocked = destinationChains.filter((id) => DISABLED_DESTINATION_CHAIN_IDS.has(id));
  if (blocked.length === 0) return null;
  return {
    error: `Destination chain(s) disabled: ${blocked.join(", ")}`,
    code: "VALIDATION_ERROR",
  };
}

// ============================================================================
// Route Registration
// ============================================================================

export function registerTreasuryRoutes(
  fastify: FastifyInstance,
  priceCalculator: PriceCalculator,
  intentManager: IntentManager,
  treasuryDistributionService: TreasuryDistributionService
) {
  // ==========================================================================
  // GET /api/chains/supported
  // Get list of supported source and destination chains
  // Requirements: 10.1
  // ==========================================================================
  fastify.get("/api/chains/supported", async (request, reply) => {
    const errorHandler = getErrorHandler();

    try {
      // Prefer live FTSO prices for Track 1 demo accuracy
      await priceCalculator.refreshFromFtso().catch(() => undefined);
      const exchangeRates = priceCalculator.getAllExchangeRates();
      
      // Build chain list from exchange rates configuration
      const chains = Object.entries(exchangeRates.chains).map(([chainIdStr, config]) => ({
        chainId: config.chainId,
        name: config.name,
        nativeSymbol: config.nativeSymbol,
        nativeTokenUsdPrice: config.usdPrice,
        isSource: true, // All chains can be source in demo (cosmetic)
        isDestination: true, // All chains can be destination
        icon: getChainIcon(config.chainId), // Helper function for chain icons
      }));

      return reply.code(200).send({
        chains,
        supportedTokens: priceCalculator.getSupportedTokens(),
        priceSource: priceCalculator.getLastPriceSource(),
        poweredBy:
          priceCalculator.getLastPriceSource() === "ftso"
            ? "Flare FTSO"
            : "fallback rates",
      });
    } catch (error: any) {
      await errorHandler.handleHttpError(
        reply,
        error,
        ErrorCategory.INTERNAL,
        ErrorSeverity.ERROR,
        500,
        { endpoint: "/api/chains/supported" }
      );
    }
  });

  // ==========================================================================
  // GET /api/prices/ftso
  // Live Flare FTSO-backed prices for hackathon UI
  // ==========================================================================
  fastify.get("/api/prices/ftso", async (_request, reply) => {
    try {
      const source = await priceCalculator.refreshFromFtso(true);
      const rates = priceCalculator.getAllExchangeRates();
      return reply.code(200).send({
        priceSource: source,
        poweredBy: source === "ftso" ? "Flare FTSO" : "fallback rates",
        tokens: rates.tokens,
        chains: Object.fromEntries(
          Object.entries(rates.chains).map(([id, c]) => [
            id,
            { symbol: c.nativeSymbol, usdPrice: c.usdPrice, name: c.name },
          ])
        ),
        updatedAt: rates.lastUpdated,
      });
    } catch (error: any) {
      return reply.code(500).send({
        error: "Failed to refresh FTSO prices",
        details: error?.message || String(error),
      });
    }
  });

  // ==========================================================================
  // POST /api/estimate
  // Calculate estimated gas amounts for destination chains
  // Requirements: 10.2
  // ==========================================================================
  fastify.post<{ Body: z.infer<typeof EstimateRequestSchema> }>(
    "/api/estimate",
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        const payload = EstimateRequestSchema.parse(request.body);

        const disabled = assertDestinationsEnabled(payload.destinationChains);
        if (disabled) {
          return reply.code(400).send(disabled);
        }

        // Validate allocation percentages sum to 100
        const totalPercentage = payload.allocationPercentages.reduce((sum, pct) => sum + pct, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          const error: ApiError = {
            error: `Allocation percentages must sum to 100, got ${totalPercentage}`,
            code: "VALIDATION_ERROR",
          };
          return reply.code(400).send(error);
        }

        // Validate arrays have same length
        if (payload.destinationChains.length !== payload.allocationPercentages.length) {
          const error: ApiError = {
            error: "Destination chains and allocation percentages must have same length",
            code: "VALIDATION_ERROR",
          };
          return reply.code(400).send(error);
        }

        // Refresh FTSO prices (Flare Summer Signal — live Flare oracle pricing)
        const priceSource = await priceCalculator.refreshFromFtso();

        // Calculate USD value of source amount
        const sourceAmount = BigInt(payload.amount);
        const usdValue = priceCalculator.getUsdValue(payload.sourceToken, sourceAmount);

        // Calculate distributions
        const distributions = priceCalculator.calculateDistributions(
          payload.sourceToken,
          sourceAmount,
          payload.destinationChains,
          payload.allocationPercentages
        );

        // Get exchange rates used
        const exchangeRates = priceCalculator.getAllExchangeRates();

        // Build response with estimates for each chain
        const estimates = distributions.map((dist) => {
          const chainConfig = exchangeRates.chains[dist.chainId.toString()];
          const chainUsdValue = (usdValue * payload.allocationPercentages[payload.destinationChains.indexOf(dist.chainId)]) / 100;

          return {
            chainId: dist.chainId,
            chainName: chainConfig?.name || `Chain ${dist.chainId}`,
            nativeSymbol: chainConfig?.nativeSymbol || "ETH",
            estimatedAmount: dist.amount.toString(),
            estimatedAmountFormatted: formatTokenAmount(dist.amount, 18),
            usdValue: chainUsdValue.toFixed(2),
            exchangeRateUsed: chainConfig?.usdPrice || 0,
          };
        });

        return reply.code(200).send({
          sourceToken: payload.sourceToken.toUpperCase(),
          sourceAmount: payload.amount,
          totalUsdValue: usdValue.toFixed(2),
          estimates,
          exchangeRatesVersion: exchangeRates.version,
          exchangeRatesTimestamp: exchangeRates.lastUpdated,
          priceSource,
          poweredBy: priceSource === "ftso" ? "Flare FTSO" : "fallback rates",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const apiError: ApiError = {
            error: "Invalid request payload",
            code: "VALIDATION_ERROR",
            details: error.errors,
          };
          return reply.code(400).send(apiError);
        }

        const apiError: ApiError = {
          error: "Failed to calculate gas estimates",
          code: "ESTIMATE_ERROR",
          details: error instanceof Error ? error.message : String(error),
        };
        return reply.code(500).send(apiError);
      }
    }
  );

  // ==========================================================================
  // POST /api/deposit
  // Submit a deposit request and create intent
  // Requirements: 10.3
  // ==========================================================================
  fastify.post<{ Body: z.infer<typeof DepositRequestSchema> }>(
    "/api/deposit",
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        const payload = DepositRequestSchema.parse(request.body);

        const disabled = assertDestinationsEnabled(payload.destinationChains);
        if (disabled) {
          return reply.code(400).send(disabled);
        }

        // Validate allocation percentages sum to 100
        const totalPercentage = payload.allocationPercentages.reduce((sum, pct) => sum + pct, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          const error: ApiError = {
            error: `Allocation percentages must sum to 100, got ${totalPercentage}`,
            code: "VALIDATION_ERROR",
          };
          return reply.code(400).send(error);
        }

        // Validate arrays have same length
        if (payload.destinationChains.length !== payload.allocationPercentages.length) {
          const error: ApiError = {
            error: "Destination chains and allocation percentages must have same length",
            code: "VALIDATION_ERROR",
          };
          return reply.code(400).send(error);
        }

        // Refresh FTSO before creating intent (Track 1 — interoperable asset pricing)
        await priceCalculator.refreshFromFtso();

        // Create intent
        const intent = await intentManager.createIntent({
          userAddress: payload.userAddress,
          sourceChain: payload.sourceChain,
          sourceToken: payload.sourceToken,
          sourceAmount: BigInt(payload.amount),
          destinationChains: payload.destinationChains,
          allocationPercentages: payload.allocationPercentages,
          sourceTxHash: payload.sourceTxHash, // Include actual transaction hash if provided
        });

        // Log distribution amounts before submitting transactions
        console.log("\n" + "=".repeat(80));
        console.log("💰 BACKEND: PRE-TRANSACTION DISTRIBUTION SUMMARY");
        console.log("=".repeat(80));
        console.log(`📤 Intent ID: ${intent.id}`);
        console.log(`👤 User Address: ${payload.userAddress}`);
        console.log(`🔗 Source Chain: ${payload.sourceChain}`);
        console.log(`💵 Source Amount: ${payload.amount} ${payload.sourceToken} (${intent.usdValue.toFixed(2)} USD)`);
        console.log(`📋 Number of Destination Chains: ${intent.distributions.length}`);
        console.log("-".repeat(80));
        
        intent.distributions.forEach((dist, index) => {
          const amountInEth = Number(formatTokenAmount(BigInt(dist.amount), 18));
          const exchangeRates = priceCalculator.getAllExchangeRates();
          const chainConfig = exchangeRates.chains[dist.chainId.toString()];
          const usdValue = chainConfig ? amountInEth * chainConfig.usdPrice : 0;
          const allocationPct = payload.allocationPercentages[index] || 0;
          
          console.log(`📍 ${dist.chainName} (Chain ID: ${dist.chainId})`);
          console.log(`   └─ Allocation: ${allocationPct.toFixed(2)}%`);
          console.log(`   └─ Native Amount: ${amountInEth.toFixed(6)} ${chainConfig?.nativeSymbol || "ETH"}`);
          console.log(`   └─ USD Value: $${usdValue.toFixed(2)}`);
          console.log(`   └─ Raw Amount (wei): ${dist.amount}`);
        });
        console.log("=".repeat(80) + "\n");

        // Validate Treasury has sufficient liquidity
        const distributions = intent.distributions.map((d) => ({
          chainId: d.chainId,
          recipient: payload.userAddress,
          amount: BigInt(d.amount),
        }));

        const hasLiquidity = await treasuryDistributionService.validateLiquidity(distributions);

        if (!hasLiquidity) {
          // Update intent to failed
          await intentManager.updateIntentStatus(intent.id, "failed", {
            error: "Insufficient Treasury liquidity",
          });

          const error: ApiError = {
            error: "Insufficient Treasury liquidity for this distribution",
            code: "INSUFFICIENT_LIQUIDITY",
          };
          return reply.code(400).send(error);
        }

        // Update intent status to validating
        await intentManager.updateIntentStatus(intent.id, "validating");

        // Request Flare FDC attestation when we have an on-chain deposit tx (async)
        if (payload.sourceTxHash && process.env.ENABLE_FDC !== "false") {
          try {
            const { EventProcessor } = await import("../services/eventProcessor");
            // Lightweight store adapter for FDC status updates on treasury intents
            const storeAdapter = {
              updateIntent: async (txOrId: string, data: Record<string, unknown>) => {
                const id = txOrId === payload.sourceTxHash ? intent.id : txOrId;
                await intentManager.updateIntentStatus(id, "validating", data as any);
              },
            } as any;
            const processor = new EventProcessor(storeAdapter);
            processor
              .processDepositEvent({
                chainId: payload.sourceChain,
                txHash: payload.sourceTxHash,
                logIndex: 0,
                blockNumber: 0,
                eventName: "Deposited",
                data: {
                  user: payload.userAddress,
                  token: payload.sourceToken,
                  amountTokenRaw: payload.amount,
                  amountUsd: intent.usdValue.toFixed(2),
                  allocations: payload.destinationChains.map((chainId, i) => ({
                    chainId,
                    weightBps: Math.round((payload.allocationPercentages[i] || 0) * 100),
                  })),
                },
              } as any)
              .catch((err: Error) =>
                console.warn("FDC attestation request failed (non-blocking):", err.message)
              );
          } catch (err) {
            console.warn("FDC wiring skipped:", err);
          }
        }

        // Trigger distributions (async, don't wait)
        triggerDistributions(
          intent.id,
          distributions,
          intentManager,
          treasuryDistributionService,
          priceCalculator
        ).catch((error) => {
          console.error(`Failed to trigger distributions for intent ${intent.id}:`, error);
        });

        return reply.code(201).send({
          intentId: intent.id,
          status: "validating",
          message: "Deposit request accepted, distributions will be processed",
          priceSource: priceCalculator.getLastPriceSource(),
          fdcRequested: Boolean(payload.sourceTxHash && process.env.ENABLE_FDC !== "false"),
          flareIntegration: {
            ftso: true,
            fdc: process.env.ENABLE_FDC !== "false",
            fassets: ["FXRP", "C2FLR", "FLR"].includes(payload.sourceToken.toUpperCase()),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const apiError: ApiError = {
            error: "Invalid request payload",
            code: "VALIDATION_ERROR",
            details: error.errors,
          };
          return reply.code(400).send(apiError);
        }

        const apiError: ApiError = {
          error: "Failed to process deposit request",
          code: "DEPOSIT_ERROR",
          details: error instanceof Error ? error.message : String(error),
        };
        return reply.code(500).send(apiError);
      }
    }
  );

  // ==========================================================================
  // GET /api/intent/:id
  // Get intent status with transaction hashes and confirmations
  // Requirements: 10.4
  // ==========================================================================
  fastify.get<{ Params: { id: string } }>(
    "/api/intent/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        // Validate intent ID format (UUID)
        if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          const error: ApiError = {
            error: "Invalid intent ID format",
            code: "VALIDATION_ERROR",
          };
          return reply.code(400).send(error);
        }

        // Get intent
        const intent = await intentManager.getIntent(id);

        if (!intent) {
          const error: ApiError = {
            error: `Intent not found: ${id}`,
            code: "NOT_FOUND",
          };
          return reply.code(404).send(error);
        }

        // Get source transaction hash from database
        // The Intent model doesn't include sourceTxHash, so we fetch it from DB
        let sourceTxHash: string | null = null;
        try {
          // Access prisma through IntentManager (it's a private property, but we need it)
          const prisma = (intentManager as any).prisma;
          if (prisma) {
            const dbIntent = await prisma.intent.findUnique({
              where: { id: intent.id },
              select: { sourceTxHash: true },
            });
            sourceTxHash = dbIntent?.sourceTxHash || null;
          }
        } catch (error) {
          console.warn(`Failed to fetch sourceTxHash for intent ${intent.id}:`, error);
        }

        // Build response with detailed status
        const response = {
          intentId: intent.id,
          userAddress: intent.userAddress,
          sourceChain: intent.sourceChain,
          sourceToken: intent.sourceToken,
          sourceAmount: intent.sourceAmount,
          sourceTxHash: sourceTxHash,
          usdValue: intent.usdValue,
          status: intent.status,
          distributions: intent.distributions.map((d) => {
            // Calculate USD value for this distribution
            // Get chain config to get USD price
            const exchangeRates = priceCalculator.getAllExchangeRates();
            const chainConfig = Object.values(exchangeRates.chains).find(c => c.chainId === d.chainId);
            const amountInEth = Number(formatTokenAmount(BigInt(d.amount), 18));
            const usdValue = chainConfig ? amountInEth * chainConfig.usdPrice : 0;
            
            return {
              chainId: d.chainId,
              chainName: d.chainName,
              amount: d.amount,
              amountFormatted: formatTokenAmount(BigInt(d.amount), 18),
              usdValue: usdValue.toFixed(2),
              status: d.status,
              txHash: d.txHash,
              confirmations: d.confirmations || 0,
              error: d.error,
            };
          }),
          createdAt: intent.createdAt.toISOString(),
          updatedAt: intent.updatedAt.toISOString(),
          completedAt: intent.completedAt?.toISOString(),
        };

        return reply.code(200).send(response);
      } catch (error: any) {
        const apiError: ApiError = {
          error: "Failed to get intent status",
          code: "INTENT_ERROR",
          details: error?.message ?? String(error),
        };
        return reply.code(500).send(apiError);
      }
    }
  );

  // ==========================================================================
  // GET /api/user/:address/intents
  // Get all intents for a user with pagination
  // Requirements: 10.5
  // ==========================================================================
  fastify.get<{ Params: { address: string }; Querystring: z.infer<typeof UserHistoryQuerySchema> }>(
    "/api/user/:address/intents",
    async (request: FastifyRequest<{ Params: { address: string }; Querystring: any }>, reply: FastifyReply) => {
      try {
        const { address } = request.params;

        // Validate address format
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
          const error: ApiError = {
            error: "Invalid address format",
            code: "VALIDATION_ERROR",
          };
          return reply.code(400).send(error);
        }

        const query = UserHistoryQuerySchema.parse(request.query);

        // Get all intents for user
        const allIntents = await intentManager.getUserIntents(address);

        // Apply pagination
        const startIndex = (query.page - 1) * query.limit;
        const endIndex = startIndex + query.limit;
        const paginatedIntents = allIntents.slice(startIndex, endIndex);

        // Build response
        const intents = paginatedIntents.map((intent) => ({
          intentId: intent.id,
          sourceChain: intent.sourceChain,
          sourceToken: intent.sourceToken,
          sourceAmount: intent.sourceAmount,
          usdValue: intent.usdValue,
          status: intent.status,
          distributionCount: intent.distributions.length,
          distributions: intent.distributions.map((d) => ({
            chainId: d.chainId,
            chainName: d.chainName,
            status: d.status,
            txHash: d.txHash,
          })),
          createdAt: intent.createdAt.toISOString(),
          completedAt: intent.completedAt?.toISOString(),
        }));

        return reply.code(200).send({
          userAddress: address,
          intents,
          pagination: {
            page: query.page,
            limit: query.limit,
            total: allIntents.length,
            totalPages: Math.ceil(allIntents.length / query.limit),
            hasMore: endIndex < allIntents.length,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const apiError: ApiError = {
            error: "Invalid query parameters",
            code: "VALIDATION_ERROR",
            details: error.errors,
          };
          return reply.code(400).send(apiError);
        }

        const apiError: ApiError = {
          error: "Failed to get user history",
          code: "HISTORY_ERROR",
          details: error instanceof Error ? error.message : String(error),
        };
        return reply.code(500).send(apiError);
      }
    }
  );

  // ==========================================================================
  // GET /api/treasury/balances
  // Get Treasury balances for all chains with total value locked
  // Requirements: 7.2, 7.5
  // ==========================================================================
  fastify.get("/api/treasury/balances", async (request, reply) => {
    try {
      // Get all Treasury balances
      const balances = await treasuryDistributionService.getAllTreasuryBalances();

      // Calculate total value locked
      let totalValueLocked = 0;
      const exchangeRates = priceCalculator.getAllExchangeRates();

      const balanceDetails = Object.values(balances).map((balance) => {
        const chainConfig = exchangeRates.chains[balance.chainId.toString()];
        const nativeUsdValue = Number(balance.native) / 1e18 * (chainConfig?.usdPrice || 0);
        totalValueLocked += nativeUsdValue;

        return {
          chainId: balance.chainId,
          chainName: balance.chainName,
          nativeSymbol: balance.nativeSymbol,
          nativeBalance: balance.native.toString(),
          nativeBalanceFormatted: formatTokenAmount(balance.native, 18),
          nativeUsdValue: nativeUsdValue.toFixed(2),
          tokens: Object.entries(balance.tokens).map(([tokenAddress, tokenBalance]) => ({
            address: tokenAddress,
            balance: tokenBalance.toString(),
            balanceFormatted: formatTokenAmount(tokenBalance, 18),
          })),
        };
      });

      return reply.code(200).send({
        balances: balanceDetails,
        totalValueLocked: totalValueLocked.toFixed(2),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const apiError: ApiError = {
        error: "Failed to get Treasury balances",
        code: "BALANCE_ERROR",
        details: error?.message ?? String(error),
      };
      return reply.code(500).send(apiError);
    }
  });

  console.log("✅ Treasury API routes registered");
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Trigger distributions asynchronously
 * Updates intent status as distributions progress
 */
async function triggerDistributions(
  intentId: string,
  distributions: Array<{ chainId: number; recipient: string; amount: bigint }>,
  intentManager: IntentManager,
  treasuryDistributionService: TreasuryDistributionService,
  priceCalculator: PriceCalculator
): Promise<void> {
  try {
    // Log distribution details before executing transactions
    console.log("\n" + "🚀".repeat(40));
    console.log(`🚀 EXECUTING DISTRIBUTIONS FOR INTENT: ${intentId}`);
    console.log("🚀".repeat(40));
    const exchangeRates = priceCalculator.getAllExchangeRates();
    distributions.forEach((dist, index) => {
      const amountInEth = Number(formatTokenAmount(dist.amount, 18));
      const chainConfig = exchangeRates.chains[dist.chainId.toString()];
      const usdValue = chainConfig ? amountInEth * chainConfig.usdPrice : 0;
      const nativeSymbol = chainConfig?.nativeSymbol || "ETH";
      console.log(`   ${index + 1}. ${chainConfig?.name || `Chain ${dist.chainId}`} (${dist.chainId})`);
      console.log(`      └─ Amount: ${amountInEth.toFixed(6)} ${nativeSymbol} ($${usdValue.toFixed(2)} USD)`);
      console.log(`      └─ Recipient: ${dist.recipient}`);
    });
    console.log("🚀".repeat(40) + "\n");

    // Update status to distributing
    await intentManager.updateIntentStatus(intentId, "distributing");

    // Execute distributions
    const results = await treasuryDistributionService.distributeMultiChain(
      distributions,
      intentId
    );

    // Update intent with transaction hashes (already receipt-confirmed by distributor)
    for (const result of results) {
      if (result.success && result.txHash) {
        await intentManager.addTransactionHash(intentId, result.chainId, result.txHash, {
          confirmed: true,
        });
      }
    }

    // Check if all distributions succeeded
    const allSucceeded = results.every((r) => r.success);

    if (allSucceeded) {
      // Mark intent as completed
      await intentManager.completeIntent(intentId);
    } else {
      // Mark intent as failed
      await intentManager.updateIntentStatus(intentId, "failed", {
        error: "One or more distributions failed",
      });
    }
  } catch (error) {
    console.error(`Error in triggerDistributions for intent ${intentId}:`, error);
    
    // Mark intent as failed
    await intentManager.updateIntentStatus(intentId, "failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Format token amount with decimals
 */
function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  // Format fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  
  // Trim trailing zeros
  const trimmed = fractionalStr.replace(/0+$/, "");
  
  if (trimmed.length === 0) {
    return integerPart.toString();
  }
  
  return `${integerPart}.${trimmed}`;
}

/**
 * Get chain icon URL or emoji
 */
function getChainIcon(chainId: number): string {
  const icons: Record<number, string> = {
    1: "⟠", // Ethereum
    56: "🔶", // BSC
    137: "🟣", // Polygon
    43114: "🔺", // Avalanche
    42161: "🔵", // Arbitrum
    10: "🔴", // Optimism
    14: "🔥", // Flare
    114: "🔥", // Coston2
  };

  return icons[chainId] || "⛓️";
}
