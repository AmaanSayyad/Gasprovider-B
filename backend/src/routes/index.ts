import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { IntentStore } from "../store";
import { DispersalService } from "../services/dispersal";
import { EventProcessor } from "../services/eventProcessor";
import {
  DepositEventPayload,
  GetStatusResponse,
  GetHistoryResponse,
  PostEventResponse,
  ApiError,
  HistoryEntry,
} from "../types";
import { CHAIN_CONFIGS } from "../config/chains";
import { SmartAccountManager } from "../services/smartaccount";
import { RelayerService } from "../services/relayer";
import { ScheduledDispersalService } from "../services/scheduledDispersal";
import { ReferralService } from "../services/referral";
import { GamificationService } from "../services/gamification";
import { GasPoolService } from "../services/gasPool";
import { LiquidityService } from "../services/liquidity";
import { Call } from "../types/smartaccount";
import { ethers } from "ethers";
import { registerTreasuryRoutes } from "./treasury";
import { PriceCalculator, getPriceCalculator } from "../services/priceCalculator";
import { IntentManager, getIntentManager } from "../services/intentManager";
import { TreasuryDistributionService, getTreasuryDistributionService } from "../services/treasuryDistribution";
import { TransactionExecutor } from "../services/transactionExecutor";
import { PrismaClient } from "@prisma/client";
import { getDistributorPrivateKey } from "../utils/keys";

// Validation schemas
const DepositEventSchema = z.object({
  chainId: z.number().int().positive(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid tx hash format"),
  logIndex: z.number().int().nonnegative(),
  blockNumber: z.number().int().positive(),
  blockTimestamp: z.number().int().nonnegative().optional(),
  eventName: z.literal("Deposited"),
  data: z.object({
    user: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
    token: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token address format"),
    amountTokenRaw: z.string(),
    amountUsd: z.string(),
    allocations: z
      .array(
        z.object({
          destChainId: z.number().int().positive(),
          amountUsd: z.string(),
        })
      )
      .min(1, "At least one allocation is required"),
  }),
});

const HistoryQuerySchema = z.object({
  userAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format")
    .optional(),
  status: z.enum(["DEPOSIT_CONFIRMED", "DISPERSE_QUEUED", "DISPERSE_IN_PROGRESS", "DISPERSED", "FAILED"]).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default("20"),
  cursor: z.string().optional(),
});

export function registerRoutes(
  fastify: FastifyInstance, 
  store: IntentStore, 
  dispersalService: DispersalService, 
  eventProcessor?: EventProcessor,
  smartAccountManager?: SmartAccountManager,
  relayerService?: RelayerService,
  scheduledDispersalService?: ScheduledDispersalService,
  referralService?: ReferralService,
  gamificationService?: GamificationService,
  gasPoolService?: GasPoolService,
  liquidityService?: LiquidityService
) {
  // GET /status/:intentId
  fastify.get<{ Params: { intentId: string } }>(
    "/status/:intentId",
    async (request: FastifyRequest<{ Params: { intentId: string } }>, reply: FastifyReply) => {
      const { intentId } = request.params;

      // Basic validation
      if (!intentId || intentId.length !== 66 || !intentId.startsWith("0x")) {
        const error: ApiError = {
          error: "Invalid intentId format. Expected a 0x-prefixed 64-character hex string.",
          code: "VALIDATION_ERROR",
        };
        return reply.code(400).send(error);
      }

      const intent = await store.getIntentById(intentId);

      if (!intent) {
        const error: ApiError = {
          error: `Intent not found: ${intentId}`,
          code: "NOT_FOUND",
        };
        return reply.code(404).send(error);
      }

      const response: GetStatusResponse = {
        intent,
      };

      return reply.code(200).send(response);
    }
  );

  fastify.post("/webhook", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload: any = request.body;
      console.log("Received webhook", JSON.stringify(payload, null, 2));

      // Webhook can be an array of events; take the first Deposited event
      const eventsArray: any[] = Array.isArray(payload) ? payload : [payload];
      const first = eventsArray.find((e) => e?.data?.event?.name === "Deposited") ?? eventsArray[0];
      if (!first || !first.data || !first.data.event) {
        const apiError: ApiError = { error: "Malformed webhook payload", code: "WEBHOOK_ERROR" };
        return reply.code(400).send(apiError);
      }

      const evt = first.data.event;
      const tx = first.data.transaction;

      // Extract txHash (prefer transaction, fallback to rawFields)
      let txHash: string | undefined = tx?.txHash;
      let blockNumber: number | undefined = tx?.blockNumber;
      let blockTimestamp: number | undefined;
      try {
        if (!txHash && typeof evt?.rawFields === "string") {
          const raw = JSON.parse(evt.rawFields);
          txHash = raw?.transactionHash || txHash;
          if (!blockNumber && raw?.blockNumber) {
            blockNumber =
              typeof raw.blockNumber === "string" && raw.blockNumber.startsWith("0x")
                ? parseInt(raw.blockNumber, 16)
                : Number(raw.blockNumber);
          }
          if (raw?.blockTimestamp) {
            blockTimestamp =
              typeof raw.blockTimestamp === "string" && raw.blockTimestamp.startsWith("0x")
                ? parseInt(raw.blockTimestamp, 16)
                : Number(raw.blockTimestamp);
          }
        }
      } catch (_) {
        // ignore rawFields parse errors
      }

      // Inputs can appear in either event.inputs or method.inputs
      const findInput = (name: string): any => {
        const fromEvent = Array.isArray(evt?.inputs) ? evt.inputs.find((i: any) => i?.name === name) : undefined;
        if (fromEvent && "value" in fromEvent) return fromEvent.value;
        const fromMethod = Array.isArray(tx?.method?.inputs)
          ? tx.method.inputs.find((i: any) => i?.name === name)
          : undefined;
        return fromMethod && "value" in fromMethod ? fromMethod.value : undefined;
      };

      const user: string | undefined = findInput("user");
      const totalAmountRawStr: string | undefined = findInput("totalAmount");
      const chainIdsRaw: any[] | undefined = findInput("chainIds");
      const chainAmountsRaw: any[] | undefined = findInput("chainAmounts");

      // Try to infer source chain by matching the contract address to our known configs
      const contractAddress: string | undefined = evt?.contract?.address;
      let inferredSourceChainId: number | undefined;
      if (contractAddress) {
        const lower = contractAddress.toLowerCase();
        for (const [idStr, cfg] of Object.entries(CHAIN_CONFIGS)) {
          const cfgAddr = cfg.contractAddress?.toLowerCase();
          if (cfgAddr && cfgAddr === lower) {
            inferredSourceChainId = Number(idStr);
            break;
          }
        }
      }

      // Build allocations (assume USDC 6 decimals; treat amounts as USD-equivalent)
      const allocations =
        Array.isArray(chainIdsRaw) && Array.isArray(chainAmountsRaw)
          ? chainIdsRaw.map((cid: any, idx: number) => {
              const amtRawStr = String(chainAmountsRaw[idx] ?? "0");
              const amountUsd = (Number(amtRawStr) / 1e6).toFixed(2);
              return {
                destChainId: Number(cid),
                amountUsd,
              };
            })
          : [];

      // Sum amountUsd
      const totalAmountUsd = allocations.reduce((acc, a) => acc + Number(a.amountUsd), 0);

      // Construct DepositEventPayload to reuse existing flow
      const converted: DepositEventPayload = {
        chainId: inferredSourceChainId ?? allocations[0]?.destChainId ?? 1,
        txHash: txHash && typeof txHash === "string" ? txHash : "0x" + "0".repeat(64),
        logIndex: Number(evt?.indexInLog ?? 0),
        blockNumber: Number(blockNumber ?? 0),
        blockTimestamp,
        eventName: "Deposited",
        data: {
          user: user && typeof user === "string" ? user : "0x" + "0".repeat(40),
          // Unknown at this layer; use zero address placeholder
          token: "0x0000000000000000000000000000000000000000",
          amountTokenRaw: String(totalAmountRawStr ?? "0"),
          amountUsd: totalAmountUsd.toFixed(2),
          allocations,
        },
      };

      // Idempotency check
      const existing = await store.getIntentById(converted.txHash);
      if (existing) {
        const response: PostEventResponse = {
          ok: true,
          intentId: existing.id,
          newStatus: existing.status,
        };
        return reply.code(200).send(response);
      }

      // Create intent and enqueue dispersal
      const intent = await store.upsertFromDepositEvent(converted);
      const updatedIntent = await dispersalService.enqueueDispersal(intent.id);

      const response: PostEventResponse = {
        ok: true,
        intentId: updatedIntent.id,
        newStatus: updatedIntent.status,
      };
      return reply.code(200).send(response);
    } catch (error: any) {
      const apiError: ApiError = {
        error: "Failed to process webhook payload",
        code: "WEBHOOK_ERROR",
        details: error?.message ?? String(error),
      };
      return reply.code(400).send(apiError);
    }
  });
  // GET /history
  fastify.get<{ Querystring: z.infer<typeof HistoryQuerySchema> }>(
    "/history",
    async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
      try {
        const query = HistoryQuerySchema.parse(request.query);

        const result = await store.listHistory({
          userAddress: query.userAddress,
          status: query.status,
          limit: query.limit,
          cursor: query.cursor,
        });

        // Convert DepositIntent[] to HistoryEntry[]
        const items: HistoryEntry[] = result.items.map((intent) => ({
          id: intent.id,
          userAddress: intent.userAddress,
          sourceChainId: intent.sourceChainId,
          sourceTxHash: intent.sourceTxHash,
          tokenSymbol: intent.tokenSymbol,
          amountInUsd: intent.amountInUsd,
          status: intent.status,
          createdAt: intent.createdAt,
          completedAt: intent.completedAt,
          numChains: intent.chainStatuses.length,
          chains: intent.chainStatuses.map((chain) => ({
            chainId: chain.chainId,
            chainName: chain.chainName,
            amountUsd: chain.amountUsd,
            status: chain.status,
          })),
        }));

        const response: GetHistoryResponse = {
          items,
          nextCursor: result.nextCursor,
        };

        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const apiError: ApiError = {
            error: "Invalid query parameters",
            code: "VALIDATION_ERROR",
            details: error.errors,
          };
          return reply.code(400).send(apiError);
        }
        throw error;
      }
    }
  );

  // POST /event
  fastify.post<{ Body: DepositEventPayload }>(
    "/event",
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      // TODO: Validate X-Indexer-Secret header
      // const indexerSecret = request.headers['x-indexer-secret'];
      // if (indexerSecret !== process.env.INDEXER_SECRET) {
      //   const error: ApiError = {
      //     error: "Invalid or missing indexer secret",
      //     code: "UNAUTHORIZED",
      //   };
      //   return reply.code(401).send(error);
      // }

      try {
        const payload = DepositEventSchema.parse(request.body);
        console.log("Received deposit event", payload);
        // Check if intent already exists (idempotent)
        const existing = await store.getIntentById(payload.txHash);
        console.log("Existing intent", existing);
        if (existing) {
          const response: PostEventResponse = {
            ok: true,
            intentId: existing.id,
            newStatus: existing.status,
          };
          return reply.code(200).send(response);
        }
        console.log("Creating new intent");
        // Create new intent from event
        const intent = await store.upsertFromDepositEvent(payload);
        console.log("Created new intent", intent);
        
        // Request FDC attestation if event processor is available
        if (eventProcessor) {
          eventProcessor.processDepositEvent(payload).catch((err) => {
            console.error('Error processing FDC attestation:', err);
            // Continue even if attestation fails
          });
        }
        
        // Enqueue dispersal for all destination chains
        // This will transition status to DISPERSE_QUEUED and globalPhase to PREPARING_SWAP
        const updatedIntent = await dispersalService.enqueueDispersal(intent.id);
        console.log("Enqueued dispersal", updatedIntent);
        const response: PostEventResponse = {
          ok: true,
          intentId: updatedIntent.id,
          newStatus: updatedIntent.status,
        };

        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const apiError: ApiError = {
            error: "Invalid event payload",
            code: "VALIDATION_ERROR",
            details: error.errors,
          };
          return reply.code(400).send(apiError);
        }

        // Re-throw unexpected errors
        throw error;
      }
    }
  );

  // ============================================================================
  // Relayer Endpoints
  // ============================================================================

  // GET /relayer/status
  // Get relayer balance and status information
  fastify.get("/relayer/status", async (request, reply) => {
    if (!relayerService) {
      const error: ApiError = {
        error: "Relayer service not available",
        code: "SERVICE_UNAVAILABLE",
      };
      return reply.code(503).send(error);
    }

    try {
      const balanceInfo = await relayerService.getBalanceInfo();

      return reply.code(200).send({
        address: balanceInfo.address,
        balance: balanceInfo.balance.toString(),
        balanceFormatted: balanceInfo.balanceFormatted,
        chainId: balanceInfo.chainId,
        belowThreshold: balanceInfo.belowThreshold,
        threshold: balanceInfo.threshold.toString(),
        thresholdFormatted: ethers.formatEther(balanceInfo.threshold) + " FLR",
      });
    } catch (error: any) {
      const apiError: ApiError = {
        error: "Failed to get relayer status",
        code: "RELAYER_ERROR",
        details: error?.message ?? String(error),
      };
      return reply.code(500).send(apiError);
    }
  });

  // ============================================================================
  // Smart Account Endpoints
  // ============================================================================

  // GET /smart-account/:eoaAddress
  // Query Smart Account for an EOA address
  fastify.get<{ Params: { eoaAddress: string } }>(
    "/smart-account/:eoaAddress",
    async (request: FastifyRequest<{ Params: { eoaAddress: string } }>, reply: FastifyReply) => {
      if (!smartAccountManager) {
        const error: ApiError = {
          error: "Smart Account functionality not available",
          code: "SERVICE_UNAVAILABLE",
        };
        return reply.code(503).send(error);
      }

      const { eoaAddress } = request.params;

      // Validate address format
      if (!eoaAddress || !eoaAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        const error: ApiError = {
          error: "Invalid EOA address format",
          code: "VALIDATION_ERROR",
        };
        return reply.code(400).send(error);
      }

      try {
        const smartAccountAddress = await smartAccountManager.getSmartAccount(eoaAddress);

        if (!smartAccountAddress) {
          return reply.code(200).send({
            eoaAddress,
            smartAccountAddress: null,
            exists: false,
          });
        }

        // Get Smart Account balance
        const balance = await smartAccountManager.getBalance(smartAccountAddress);

        return reply.code(200).send({
          eoaAddress,
          smartAccountAddress,
          exists: true,
          balance: balance.toString(),
          balanceFormatted: ethers.formatEther(balance) + " FLR",
        });
      } catch (error: any) {
        const apiError: ApiError = {
          error: "Failed to query Smart Account",
          code: "SMART_ACCOUNT_ERROR",
          details: error?.message ?? String(error),
        };
        return reply.code(500).send(apiError);
      }
    }
  );

  // POST /smart-account/create
  // Create a new Smart Account for an EOA
  const CreateSmartAccountSchema = z.object({
    eoaAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EOA address format"),
  });

  fastify.post<{ Body: z.infer<typeof CreateSmartAccountSchema> }>(
    "/smart-account/create",
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      if (!smartAccountManager) {
        const error: ApiError = {
          error: "Smart Account functionality not available",
          code: "SERVICE_UNAVAILABLE",
        };
        return reply.code(503).send(error);
      }

      try {
        const payload = CreateSmartAccountSchema.parse(request.body);

        // Create Smart Account
        const deployment = await smartAccountManager.createSmartAccount(payload.eoaAddress);

        return reply.code(201).send({
          success: true,
          eoaAddress: deployment.eoaAddress,
          smartAccountAddress: deployment.smartAccountAddress,
          deploymentTxHash: deployment.deploymentTxHash,
          chainId: deployment.chainId,
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
          error: "Failed to create Smart Account",
          code: "SMART_ACCOUNT_ERROR",
          details: error instanceof Error ? error.message : String(error),
        };
        return reply.code(500).send(apiError);
      }
    }
  );

  // POST /smart-account/gasless-transaction
  // Submit a gasless transaction through the relayer
  const GaslessTransactionSchema = z.object({
    smartAccountAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Smart Account address format"),
    calls: z.array(
      z.object({
        to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid target address format"),
        value: z.string().regex(/^\d+$/, "Invalid value format"),
        data: z.string().regex(/^0x[a-fA-F0-9]*$/, "Invalid data format"),
      })
    ).min(1, "At least one call is required"),
    signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, "Invalid signature format"),
  });

  fastify.post<{ Body: z.infer<typeof GaslessTransactionSchema> }>(
    "/smart-account/gasless-transaction",
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      if (!smartAccountManager || !relayerService) {
        const error: ApiError = {
          error: "Gasless transaction functionality not available",
          code: "SERVICE_UNAVAILABLE",
        };
        return reply.code(503).send(error);
      }

      try {
        const payload = GaslessTransactionSchema.parse(request.body);

        // Convert calls to proper format
        const calls: Call[] = payload.calls.map(call => ({
          to: call.to,
          value: BigInt(call.value),
          data: call.data,
        }));

        // Prepare gasless transaction
        const gaslessTransaction = await smartAccountManager.prepareGaslessTransaction(
          payload.smartAccountAddress,
          calls
        );

        // Override signature with user-provided signature
        gaslessTransaction.signature = payload.signature;

        // Submit transaction through relayer
        const result = await relayerService.submitTransaction(gaslessTransaction);

        return reply.code(200).send({
          success: true,
          txHash: result.txHash,
          gasUsed: result.gasUsed?.toString(),
          effectiveGasPrice: result.effectiveGasPrice?.toString(),
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
          error: "Failed to submit gasless transaction",
          code: "GASLESS_TRANSACTION_ERROR",
          details: error instanceof Error ? error.message : String(error),
        };
        return reply.code(500).send(apiError);
      }
    }
  );

  // POST /deposit/smart-account
  // Enhanced deposit endpoint that supports Smart Account deposits
  const SmartAccountDepositSchema = z.object({
    eoaAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EOA address format"),
    tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token address format"),
    amount: z.string().regex(/^\d+$/, "Invalid amount format"),
    chainIds: z.array(z.number().int().positive()).min(1, "At least one destination chain required"),
    chainAmounts: z.array(z.string().regex(/^\d+$/, "Invalid chain amount format")),
    useSmartAccount: z.boolean().optional().default(false),
    signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, "Invalid signature format").optional(),
  });

  fastify.post<{ Body: z.infer<typeof SmartAccountDepositSchema> }>(
    "/deposit/smart-account",
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      if (!smartAccountManager || !relayerService) {
        const error: ApiError = {
          error: "Smart Account deposit functionality not available",
          code: "SERVICE_UNAVAILABLE",
        };
        return reply.code(503).send(error);
      }

      try {
        const payload = SmartAccountDepositSchema.parse(request.body);

        // Validate chain amounts match chain IDs
        if (payload.chainIds.length !== payload.chainAmounts.length) {
          const error: ApiError = {
            error: "Chain IDs and amounts arrays must have the same length",
            code: "VALIDATION_ERROR",
          };
          return reply.code(400).send(error);
        }

        // Check if user should use Smart Account
        let shouldUseSmartAccount = payload.useSmartAccount;
        
        if (!shouldUseSmartAccount) {
          // Auto-detect if Smart Account should be used based on balance
          shouldUseSmartAccount = await smartAccountManager.shouldUseSmartAccount(
            payload.eoaAddress,
            ethers.parseEther("0.01") // Require at least 0.01 FLR for gas
          );
        }

        if (shouldUseSmartAccount) {
          // Get or create Smart Account
          let smartAccountAddress = await smartAccountManager.getSmartAccount(payload.eoaAddress);
          
          if (!smartAccountAddress) {
            // Create Smart Account if it doesn't exist
            const deployment = await smartAccountManager.createSmartAccount(payload.eoaAddress);
            smartAccountAddress = deployment.smartAccountAddress;
          }

          // Get GasStation contract address from environment
          const gasStationAddress = process.env.FLARE_GAS_STATION_ADDRESS || process.env.COSTON2_GAS_STATION_ADDRESS;
          
          if (!gasStationAddress) {
            const error: ApiError = {
              error: "GasStation contract address not configured",
              code: "CONFIGURATION_ERROR",
            };
            return reply.code(500).send(error);
          }

          // Prepare calls for gasless transaction
          // 1. Approve token spending
          // 2. Call deposit on GasStation
          const calls: Call[] = [];

          // ERC20 approve call
          const approveData = new ethers.Interface([
            "function approve(address spender, uint256 amount) external returns (bool)"
          ]).encodeFunctionData("approve", [gasStationAddress, BigInt(payload.amount)]);

          calls.push({
            to: payload.tokenAddress,
            value: 0n,
            data: approveData,
          });

          // GasStation deposit call
          const depositData = new ethers.Interface([
            "function deposit(uint256 totalAmount, uint256[] calldata chainIds, uint256[] calldata chainAmounts) external"
          ]).encodeFunctionData("deposit", [
            BigInt(payload.amount),
            payload.chainIds,
            payload.chainAmounts.map(a => BigInt(a)),
          ]);

          calls.push({
            to: gasStationAddress,
            value: 0n,
            data: depositData,
          });

          // Prepare gasless transaction
          const gaslessTransaction = await smartAccountManager.prepareGaslessTransaction(
            smartAccountAddress,
            calls
          );

          // If signature provided, use it; otherwise use placeholder
          if (payload.signature) {
            gaslessTransaction.signature = payload.signature;
          }

          // Submit transaction through relayer
          const result = await relayerService.submitTransaction(gaslessTransaction);

          return reply.code(200).send({
            success: true,
            usedSmartAccount: true,
            smartAccountAddress,
            txHash: result.txHash,
            gasUsed: result.gasUsed?.toString(),
            effectiveGasPrice: result.effectiveGasPrice?.toString(),
          });
        } else {
          // Regular EOA deposit - return instructions for user to submit directly
          return reply.code(200).send({
            success: true,
            usedSmartAccount: false,
            message: "User has sufficient balance for regular deposit",
            eoaAddress: payload.eoaAddress,
          });
        }
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
          error: "Failed to process Smart Account deposit",
          code: "SMART_ACCOUNT_DEPOSIT_ERROR",
          details: error instanceof Error ? error.message : String(error),
        };
        return reply.code(500).send(apiError);
      }
    }
  );

  // ============================================================================
  // Scheduled Dispersal Endpoints
  // ============================================================================

  if (!scheduledDispersalService) {
    console.warn("⚠️ ScheduledDispersalService not available - scheduled dispersal endpoints disabled");
  } else {
    // POST /schedules - Create a new scheduled dispersal
    const CreateScheduleSchema = z.object({
      userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
      name: z.string().optional(),
      sourceChainId: z.number().int().positive(),
      tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token address"),
      tokenSymbol: z.string().optional(),
      amountInUsd: z.string(),
      allocations: z.array(
        z.object({
          destChainId: z.number().int().positive(),
          amountUsd: z.string(),
        })
      ).min(1),
      scheduleType: z.enum(["one_time", "recurring", "auto_balance"]),
      scheduledAt: z.string().datetime().optional(),
      recurrencePattern: z.enum(["daily", "weekly", "monthly"]).optional(),
      timezone: z.string().optional().default("UTC"),
      autoDisperseEnabled: z.boolean().optional().default(false),
      monitorChainId: z.number().int().positive().optional(),
      balanceThreshold: z.string().optional(),
      checkInterval: z.number().int().positive().optional(),
    });

    fastify.post<{ Body: z.infer<typeof CreateScheduleSchema> }>(
      "/schedules",
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const payload = CreateScheduleSchema.parse(request.body);

          const schedule = await scheduledDispersalService.createSchedule({
            userAddress: payload.userAddress.toLowerCase(),
            name: payload.name,
            sourceChainId: payload.sourceChainId,
            tokenAddress: payload.tokenAddress,
            tokenSymbol: payload.tokenSymbol,
            amountInUsd: payload.amountInUsd,
            allocations: payload.allocations.map(a => ({ chainId: a.destChainId, amountUsd: a.amountUsd })),
            scheduleType: payload.scheduleType,
            scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : undefined,
            recurrencePattern: payload.recurrencePattern,
            timezone: payload.timezone,
            autoDisperseEnabled: payload.autoDisperseEnabled,
            monitorChainId: payload.monitorChainId,
            balanceThreshold: payload.balanceThreshold,
            checkInterval: payload.checkInterval,
          });

          return reply.code(201).send(schedule);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const apiError: ApiError = {
              error: "Invalid request payload",
              code: "VALIDATION_ERROR",
              details: error.errors,
            };
            return reply.code(400).send(apiError);
          }
          throw error;
        }
      }
    );

    // GET /schedules - Get all schedules for a user
    fastify.get<{ Querystring: { userAddress: string } }>(
      "/schedules",
      async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
        try {
          const { userAddress } = request.query;

          if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid user address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const schedules = await scheduledDispersalService.getUserSchedules(
            userAddress.toLowerCase()
          );

          return reply.code(200).send({ schedules });
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get schedules",
            code: "SCHEDULE_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // GET /schedules/:id - Get schedule by ID
    fastify.get<{ Params: { id: string } }>(
      "/schedules/:id",
      async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        try {
          const { id } = request.params;
          const schedule = await scheduledDispersalService.getScheduleById(id);

          if (!schedule) {
            const error: ApiError = {
              error: `Schedule not found: ${id}`,
              code: "NOT_FOUND",
            };
            return reply.code(404).send(error);
          }

          return reply.code(200).send(schedule);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get schedule",
            code: "SCHEDULE_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // PATCH /schedules/:id - Update schedule
    const UpdateScheduleSchema = CreateScheduleSchema.partial();

    fastify.patch<{ Params: { id: string }; Body: z.infer<typeof UpdateScheduleSchema> }>(
      "/schedules/:id",
      async (request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) => {
        try {
          const { id } = request.params;
          const payload = UpdateScheduleSchema.parse(request.body);

          const updates: any = { ...payload };
          if (payload.scheduledAt) {
            updates.scheduledAt = new Date(payload.scheduledAt);
          }

          const schedule = await scheduledDispersalService.updateSchedule(id, updates);

          return reply.code(200).send(schedule);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const apiError: ApiError = {
              error: "Invalid request payload",
              code: "VALIDATION_ERROR",
              details: error.errors,
            };
            return reply.code(400).send(apiError);
          }
          throw error;
        }
      }
    );

    // POST /schedules/:id/pause - Pause a schedule
    fastify.post<{ Params: { id: string } }>(
      "/schedules/:id/pause",
      async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        try {
          const { id } = request.params;
          const schedule = await scheduledDispersalService.pauseSchedule(id);
          return reply.code(200).send(schedule);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to pause schedule",
            code: "SCHEDULE_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // POST /schedules/:id/resume - Resume a paused schedule
    fastify.post<{ Params: { id: string } }>(
      "/schedules/:id/resume",
      async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        try {
          const { id } = request.params;
          const schedule = await scheduledDispersalService.resumeSchedule(id);
          return reply.code(200).send(schedule);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to resume schedule",
            code: "SCHEDULE_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // DELETE /schedules/:id - Cancel a schedule
    fastify.delete<{ Params: { id: string } }>(
      "/schedules/:id",
      async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        try {
          const { id } = request.params;
          const schedule = await scheduledDispersalService.cancelSchedule(id);
          return reply.code(200).send(schedule);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to cancel schedule",
            code: "SCHEDULE_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
      }
    }
  );

  // ============================================================================
  // Referral Program Endpoints
  // ============================================================================

  if (referralService) {
    // GET /referrals/stats - Get user's referral stats
    fastify.get<{ Querystring: { userAddress: string } }>(
      "/referrals/stats",
      async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
        try {
          const { userAddress } = request.query;
          if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid user address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const baseUrl = request.headers.origin || `http://${request.headers.host}`;
          const stats = await referralService.getOrCreateReferral(
            userAddress.toLowerCase(),
            baseUrl as string
          );
          return reply.code(200).send(stats);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get referral stats",
            code: "REFERRAL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // POST /referrals/use - Record a referral usage
    const UseReferralSchema = z.object({
      referralCode: z.string(),
      referredAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
      intentId: z.string().optional(),
    });

    fastify.post<{ Body: z.infer<typeof UseReferralSchema> }>(
      "/referrals/use",
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const payload = UseReferralSchema.parse(request.body);
          const result = await referralService.recordReferral(
            payload.referralCode,
            payload.referredAddress.toLowerCase(),
            payload.intentId
          );

          if (!result.success) {
            const error: ApiError = {
              error: "Invalid referral code or already used",
              code: "REFERRAL_ERROR",
            };
            return reply.code(400).send(error);
          }

          return reply.code(200).send(result);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const apiError: ApiError = {
              error: "Invalid request payload",
              code: "VALIDATION_ERROR",
              details: error.errors,
            };
            return reply.code(400).send(apiError);
          }
          throw error;
        }
      }
    );

    // GET /referrals/leaderboard - Get referral leaderboard
    fastify.get<{ Querystring: { limit?: string } }>(
      "/referrals/leaderboard",
      async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
        try {
          const limit = request.query.limit
            ? parseInt(request.query.limit, 10)
            : 100;
          const leaderboard = await referralService.getLeaderboard(limit);
          return reply.code(200).send({ leaderboard });
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get leaderboard",
            code: "REFERRAL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );
  }

  // ============================================================================
  // Gamification Endpoints
  // ============================================================================

  if (gamificationService) {
    // GET /gamification/stats - Get user's gamification stats
    fastify.get<{ Querystring: { userAddress: string } }>(
      "/gamification/stats",
      async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
        try {
          const { userAddress } = request.query;
          if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid user address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const stats = await gamificationService.getUserStats(
            userAddress.toLowerCase()
          );
          return reply.code(200).send(stats);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get gamification stats",
            code: "GAMIFICATION_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // GET /gamification/achievements - Get all achievements
    fastify.get("/gamification/achievements", async (request, reply) => {
      try {
        const achievements = await gamificationService.prisma.achievement.findMany({
          where: { isActive: true },
          orderBy: { points: "desc" },
        });
        return reply.code(200).send({ achievements });
      } catch (error: any) {
        const apiError: ApiError = {
          error: "Failed to get achievements",
          code: "GAMIFICATION_ERROR",
          details: error?.message ?? String(error),
        };
        return reply.code(500).send(apiError);
      }
    });

    // GET /gamification/leaderboard - Get leaderboard
    fastify.get<{ Querystring: { category: string; period?: string; limit?: string } }>(
      "/gamification/leaderboard",
      async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
        try {
          const { category, period = "all_time", limit = "100" } = request.query;
          const leaderboard = await gamificationService.getLeaderboard(
            category,
            period,
            parseInt(limit, 10)
          );
          return reply.code(200).send({ leaderboard });
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get leaderboard",
            code: "GAMIFICATION_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // POST /gamification/update-streak - Update user streak
    const UpdateStreakSchema = z.object({
      userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
      streakType: z.string().optional().default("dispersal"),
    });

    fastify.post<{ Body: z.infer<typeof UpdateStreakSchema> }>(
      "/gamification/update-streak",
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const payload = UpdateStreakSchema.parse(request.body);
          const streak = await gamificationService.updateStreak(
            payload.userAddress.toLowerCase(),
            payload.streakType
          );
          return reply.code(200).send(streak);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const apiError: ApiError = {
              error: "Invalid request payload",
              code: "VALIDATION_ERROR",
              details: error.errors,
            };
            return reply.code(400).send(apiError);
          }
          throw error;
        }
      }
    );
  }

  // ============================================================================
  // Gas Pool Endpoints
  // ============================================================================

  if (gasPoolService) {
    // POST /gas-pools - Create a new gas pool
    fastify.post<{ Body: any }>(
      "/gas-pools",
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const {
            name,
            description,
            creatorAddress,
            minContribution,
            maxMembers,
            isPublic,
            autoDistribute,
          } = request.body;

          if (!name || !creatorAddress || !minContribution) {
            const error: ApiError = {
              error: "Missing required fields: name, creatorAddress, minContribution",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          if (!creatorAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid creator address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const pool = await gasPoolService.createPool({
            name,
            description,
            creatorAddress,
            minContribution,
            maxMembers,
            isPublic,
            autoDistribute,
          });

          return reply.code(201).send(pool);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to create gas pool",
            code: "GAS_POOL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // GET /gas-pools/public - Get public pools
    fastify.get<{ Querystring: { limit?: string } }>(
      "/gas-pools/public",
      async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
        try {
          const limit = request.query.limit
            ? parseInt(request.query.limit, 10)
            : 20;
          const pools = await gasPoolService.getPublicPools(limit);
          return reply.code(200).send({ pools });
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get public pools",
            code: "GAS_POOL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // GET /gas-pools/user/:userAddress - Get user's pools
    fastify.get<{ Params: { userAddress: string } }>(
      "/gas-pools/user/:userAddress",
      async (request: FastifyRequest<{ Params: { userAddress: string } }>, reply: FastifyReply) => {
        try {
          const { userAddress } = request.params;
          if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid user address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const pools = await gasPoolService.getUserPools(userAddress);
          return reply.code(200).send({ pools });
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get user pools",
            code: "GAS_POOL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // GET /gas-pools/:poolId - Get pool by ID
    fastify.get<{ Params: { poolId: string }; Querystring: { userAddress?: string } }>(
      "/gas-pools/:poolId",
      async (request: FastifyRequest<{ Params: { poolId: string }; Querystring: any }>, reply: FastifyReply) => {
        try {
          const { poolId } = request.params;
          const { userAddress } = request.query;
          const pool = await gasPoolService.getPoolById(poolId, userAddress);
          if (!pool) {
            return reply.code(404).send({ error: "Pool not found" });
          }
          return reply.code(200).send(pool);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get pool",
            code: "GAS_POOL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // GET /gas-pools/code/:poolCode - Get pool by code
    fastify.get<{ Params: { poolCode: string } }>(
      "/gas-pools/code/:poolCode",
      async (request: FastifyRequest<{ Params: { poolCode: string } }>, reply: FastifyReply) => {
        try {
          const { poolCode } = request.params;
          const pool = await gasPoolService.getPoolByCode(poolCode);
          if (!pool) {
            return reply.code(404).send({ error: "Pool not found" });
          }
          return reply.code(200).send(pool);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get pool",
            code: "GAS_POOL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // POST /gas-pools/join - Join a pool
    fastify.post<{ Body: any }>(
      "/gas-pools/join",
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const { poolCode, userAddress } = request.body;

          if (!poolCode || !userAddress) {
            const error: ApiError = {
              error: "Missing required fields: poolCode, userAddress",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid user address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const member = await gasPoolService.joinPool({ poolCode, userAddress });
          return reply.code(200).send(member);
        } catch (error: any) {
          const apiError: ApiError = {
            error: error?.message || "Failed to join pool",
            code: "GAS_POOL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(400).send(apiError);
        }
      }
    );

    // POST /gas-pools/contribute - Contribute to a pool
    fastify.post<{ Body: any }>(
      "/gas-pools/contribute",
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const { poolId, userAddress, amount, intentId, txHash } = request.body;

          if (!poolId || !userAddress || !amount) {
            const error: ApiError = {
              error: "Missing required fields: poolId, userAddress, amount",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid user address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const contribution = await gasPoolService.contribute({
            poolId,
            userAddress,
            amount,
            intentId,
            txHash,
          });

          return reply.code(200).send(contribution);
        } catch (error: any) {
          const apiError: ApiError = {
            error: error?.message || "Failed to contribute",
            code: "GAS_POOL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(400).send(apiError);
        }
      }
    );

    // POST /gas-pools/distribute - Distribute from pool
    fastify.post<{ Body: any }>(
      "/gas-pools/distribute",
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const { poolId, recipientAddress, amount, intentId, reason } = request.body;

          if (!poolId || !recipientAddress || !amount) {
            const error: ApiError = {
              error: "Missing required fields: poolId, recipientAddress, amount",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          if (!recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid recipient address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const distribution = await gasPoolService.distribute({
            poolId,
            recipientAddress,
            amount,
            intentId,
            reason,
          });

          return reply.code(200).send(distribution);
        } catch (error: any) {
          const apiError: ApiError = {
            error: error?.message || "Failed to distribute",
            code: "GAS_POOL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(400).send(apiError);
        }
      }
    );

    // GET /gas-pools/:poolId/activity - Get pool activity
    fastify.get<{ Params: { poolId: string }; Querystring: { limit?: string } }>(
      "/gas-pools/:poolId/activity",
      async (request: FastifyRequest<{ Params: { poolId: string }; Querystring: any }>, reply: FastifyReply) => {
        try {
          const { poolId } = request.params;
          const limit = request.query.limit
            ? parseInt(request.query.limit, 10)
            : 50;
          const activity = await gasPoolService.getPoolActivity(poolId, limit);
          return reply.code(200).send({ activity });
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get pool activity",
            code: "GAS_POOL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // POST /gas-pools/:poolId/leave - Leave a pool
    fastify.post<{ Params: { poolId: string }; Body: { userAddress: string } }>(
      "/gas-pools/:poolId/leave",
      async (request: FastifyRequest<{ Params: { poolId: string }; Body: any }>, reply: FastifyReply) => {
        try {
          const { poolId } = request.params;
          const { userAddress } = request.body;

          if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid user address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          await gasPoolService.leavePool(poolId, userAddress);
          return reply.code(200).send({ success: true });
        } catch (error: any) {
          const apiError: ApiError = {
            error: error?.message || "Failed to leave pool",
            code: "GAS_POOL_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(400).send(apiError);
        }
      }
    );
  }

  // ============================================================================
  // Voice Commands Endpoints
  // ============================================================================

  // POST /voice/command - Process voice command
  const VoiceCommandSchema = z.object({
    userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
    command: z.string(),
    language: z.string().optional().default("en"),
  });

  fastify.post<{ Body: z.infer<typeof VoiceCommandSchema> }>(
    "/voice/command",
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        const payload = VoiceCommandSchema.parse(request.body);
        
        // Process voice command (this would integrate with voice recognition)
        // For now, return a simple response
        return reply.code(200).send({
          success: true,
          message: "Voice command processed",
          command: payload.command,
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
        throw error;
      }
      }
    );
  }

  // ============================================================================
  // Liquidity Provider Endpoints
  // ============================================================================

  if (liquidityService) {
    // POST /liquidity/deposit - Deposit tokens to earn
    fastify.post<{ Body: any }>(
      "/liquidity/deposit",
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const {
            userAddress,
            chainId,
            tokenAddress,
            tokenSymbol,
            amount,
            amountUsd,
            txHash,
          } = request.body;

          if (!userAddress || !chainId || !tokenAddress || !amount || !amountUsd) {
            const error: ApiError = {
              error: "Missing required fields",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid user address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const deposit = await liquidityService.deposit({
            userAddress,
            chainId,
            tokenAddress,
            tokenSymbol: tokenSymbol || (tokenAddress === "0x0000000000000000000000000000000000000000" ? "NATIVE" : "TOKEN"),
            amount,
            amountUsd,
            txHash,
          });

          return reply.code(201).send(deposit);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to deposit liquidity",
            code: "LIQUIDITY_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // GET /liquidity/stats/:userAddress - Get user's liquidity stats
    fastify.get<{ Params: { userAddress: string } }>(
      "/liquidity/stats/:userAddress",
      async (request: FastifyRequest<{ Params: { userAddress: string } }>, reply: FastifyReply) => {
        try {
          const { userAddress } = request.params;
          if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid user address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const stats = await liquidityService.getUserStats(userAddress);
          return reply.code(200).send(stats);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get liquidity stats",
            code: "LIQUIDITY_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // GET /liquidity/deposits/:userAddress - Get user's deposits
    fastify.get<{ Params: { userAddress: string } }>(
      "/liquidity/deposits/:userAddress",
      async (request: FastifyRequest<{ Params: { userAddress: string } }>, reply: FastifyReply) => {
        try {
          const { userAddress } = request.params;
          if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            const error: ApiError = {
              error: "Invalid user address format",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          const deposits = await liquidityService.getUserDeposits(userAddress);
          return reply.code(200).send({ deposits });
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get deposits",
            code: "LIQUIDITY_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // GET /liquidity/deposit/:depositId - Get deposit details
    fastify.get<{ Params: { depositId: string } }>(
      "/liquidity/deposit/:depositId",
      async (request: FastifyRequest<{ Params: { depositId: string } }>, reply: FastifyReply) => {
        try {
          const { depositId } = request.params;
          const deposit = await liquidityService.getDepositDetails(depositId);
          if (!deposit) {
            return reply.code(404).send({ error: "Deposit not found" });
          }
          return reply.code(200).send(deposit);
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get deposit details",
            code: "LIQUIDITY_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // GET /liquidity/pools - Get all liquidity pools
    fastify.get(
      "/liquidity/pools",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const pools = await liquidityService.getLiquidityPools();
          return reply.code(200).send({ pools });
        } catch (error: any) {
          const apiError: ApiError = {
            error: "Failed to get liquidity pools",
            code: "LIQUIDITY_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(500).send(apiError);
        }
      }
    );

    // POST /liquidity/withdraw - Withdraw deposit
    fastify.post<{ Body: { depositId: string; userAddress: string } }>(
      "/liquidity/withdraw",
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const { depositId, userAddress } = request.body;

          if (!depositId || !userAddress) {
            const error: ApiError = {
              error: "Missing required fields",
              code: "VALIDATION_ERROR",
            };
            return reply.code(400).send(error);
          }

          await liquidityService.withdrawDeposit(depositId, userAddress);
          return reply.code(200).send({ success: true });
        } catch (error: any) {
          const apiError: ApiError = {
            error: error?.message || "Failed to withdraw",
            code: "LIQUIDITY_ERROR",
            details: error?.message ?? String(error),
          };
          return reply.code(400).send(apiError);
        }
      }
    );
  }

  // ============================================================================
  // Treasury Demo System API Routes
  // ============================================================================

  // Initialize Treasury services if not already initialized
  try {
    const priceCalculator = getPriceCalculator();
    const prisma = new PrismaClient();
    const intentManager = getIntentManager(prisma, priceCalculator);
    
    // Initialize TransactionExecutor with distributor private key from env only
    const distributorPrivateKey = getDistributorPrivateKey();
    if (!distributorPrivateKey) {
      console.warn("⚠️ No DISTRIBUTOR_PRIVATE_KEY / PRIVATE_KEY / RELAYER_PRIVATE_KEY found - transactions will fail");
    }
    const transactionExecutor = new TransactionExecutor(distributorPrivateKey);
    
    const treasuryDistributionService = getTreasuryDistributionService(
      transactionExecutor,
      priceCalculator
    );

    // Register Treasury routes
    registerTreasuryRoutes(
      fastify,
      priceCalculator,
      intentManager,
      treasuryDistributionService
    );

    console.log("✅ Treasury demo system routes registered");
  } catch (error) {
    console.warn("⚠️ Failed to initialize Treasury routes:", error);
  }

  // ============================================================================
  // Global Error Handler
  // Requirements: 8.1, 8.5
  // ============================================================================

  fastify.setErrorHandler(async (error, request, reply) => {
    // Log error with context
    console.error("API Error:", {
      method: request.method,
      url: request.url,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Handle specific error types
    if (error.validation) {
      const apiError: ApiError = {
        error: "Validation error",
        code: "VALIDATION_ERROR",
        details: error.validation,
      };
      return reply.code(400).send(apiError);
    }

    // Handle rate limiting errors
    if (error.statusCode === 429) {
      const apiError: ApiError = {
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        details: "Please try again later",
      };
      return reply.code(429).send(apiError);
    }

    // Handle not found errors
    if (error.statusCode === 404) {
      const apiError: ApiError = {
        error: "Resource not found",
        code: "NOT_FOUND",
      };
      return reply.code(404).send(apiError);
    }

    // Default error response
    const apiError: ApiError = {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    };
    return reply.code(error.statusCode || 500).send(apiError);
  });
}
