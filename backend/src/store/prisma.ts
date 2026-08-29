import { PrismaClient } from "@prisma/client";
import {
  DepositIntent,
  DepositEventPayload,
  IntentStatus,
  DestinationAllocation,
  ChainDispersal,
} from "../types";
import { IntentStore } from "./index";
import { FAssetsService } from "../services/fassets";
import { FAssetConfig } from "../types/fassets";
import { SmartAccountStorageAdapter } from "../services/smartaccount";
import { SmartAccountRecord } from "../types/smartaccount";

/**
 * Prisma-based implementation of IntentStore
 * Uses Prisma ORM for type-safe database operations
 */
export class PrismaIntentStore implements IntentStore {
  private fAssetsService: FAssetsService | null = null;

  constructor(private prisma: PrismaClient) {
    // Initialize FAssets service if configuration is available
    const flareRpcUrl = process.env.FLARE_RPC_URL || process.env.COSTON2_RPC_URL;
    const enableFAssets = process.env.ENABLE_FASSETS === 'true';
    
    if (flareRpcUrl && enableFAssets) {
      try {
        const fAssetConfigs = this.loadFAssetConfigs();
        if (fAssetConfigs.length > 0) {
          this.fAssetsService = new FAssetsService(flareRpcUrl, fAssetConfigs);
          console.log('✅ FAssets Service initialized in store');
        }
      } catch (error) {
        console.warn('⚠️ Failed to initialize FAssets Service:', error);
      }
    }
  }

  /**
   * Load FAsset configurations from environment variables
   */
  private loadFAssetConfigs(): FAssetConfig[] {
    const configs: FAssetConfig[] = [];
    const useTestnet = process.env.USE_TESTNET === 'true';
    const suffix = useTestnet ? 'COSTON2' : 'MAINNET';

    // FBTC configuration
    const fbtcAddress = process.env[`FASSET_FBTC_ADDRESS_${suffix}`];
    const fbtcAssetManager = process.env[`FASSETS_ASSET_MANAGER_ADDRESS_${suffix}`];
    if (fbtcAddress && fbtcAddress !== '0x0000000000000000000000000000000000000000' && fbtcAssetManager) {
      configs.push({
        address: fbtcAddress,
        assetType: 'BTC',
        symbol: 'FBTC',
        underlyingSymbol: 'BTC',
        ftsoFeedId: process.env.FTSO_FEED_ID_BTC_USD || '0x014254432f55534400000000000000000000000000',
        assetManagerAddress: fbtcAssetManager,
      });
    }

    // FXRP configuration
    const fxrpAddress = process.env[`FASSET_FXRP_ADDRESS_${suffix}`];
    if (fxrpAddress && fxrpAddress !== '0x0000000000000000000000000000000000000000' && fbtcAssetManager) {
      configs.push({
        address: fxrpAddress,
        assetType: 'XRP',
        symbol: 'FXRP',
        underlyingSymbol: 'XRP',
        ftsoFeedId: process.env.FTSO_FEED_ID_XRP_USD || '0x015852502f55534400000000000000000000000000',
        assetManagerAddress: fbtcAssetManager,
      });
    }

    // FDOGE configuration
    const fdogeAddress = process.env[`FASSET_FDOGE_ADDRESS_${suffix}`];
    if (fdogeAddress && fdogeAddress !== '0x0000000000000000000000000000000000000000' && fbtcAssetManager) {
      configs.push({
        address: fdogeAddress,
        assetType: 'DOGE',
        symbol: 'FDOGE',
        underlyingSymbol: 'DOGE',
        ftsoFeedId: process.env.FTSO_FEED_ID_DOGE_USD || '0x01444f47452f555344000000000000000000000000',
        assetManagerAddress: fbtcAssetManager,
      });
    }

    // FLTC configuration
    const fltcAddress = process.env[`FASSET_FLTC_ADDRESS_${suffix}`];
    if (fltcAddress && fltcAddress !== '0x0000000000000000000000000000000000000000' && fbtcAssetManager) {
      configs.push({
        address: fltcAddress,
        assetType: 'LTC',
        symbol: 'FLTC',
        underlyingSymbol: 'LTC',
        ftsoFeedId: process.env.FTSO_FEED_ID_LTC_USD || '0x014c54432f55534400000000000000000000000000',
        assetManagerAddress: fbtcAssetManager,
      });
    }

    return configs;
  }

  async upsertFromDepositEvent(
    payload: DepositEventPayload
  ): Promise<DepositIntent> {
    // Check if intent already exists (idempotent)
    const existing = await this.getIntentById(payload.txHash);
    if (existing) {
      return existing;
    }

    // Create new intent from event payload
    const now = new Date();
    const allocations: DestinationAllocation[] = payload.data.allocations.map(
      (alloc) => ({
        chainId: alloc.destChainId,
        chainName: undefined,
        nativeSymbol: undefined,
        amountUsd: alloc.amountUsd,
      })
    );

    const chainStatuses: ChainDispersal[] = payload.data.allocations.map(
      (alloc) => ({
        chainId: alloc.destChainId,
        chainName: undefined,
        nativeSymbol: undefined,
        amountUsd: alloc.amountUsd,
        status: "NOT_STARTED",
        updatedAt: now.toISOString(),
      })
    );

    // Detect if this is a FAsset deposit
    let isFAsset = false;
    let underlyingAsset: string | undefined = undefined;
    let tokenSymbol: string | null = null;

    if (this.fAssetsService) {
      isFAsset = this.fAssetsService.isFAsset(payload.data.token);
      
      if (isFAsset) {
        const config = this.fAssetsService.getFAssetConfig(payload.data.token);
        if (config) {
          underlyingAsset = config.assetType;
          tokenSymbol = config.symbol;
          console.log(`✅ Detected FAsset deposit: ${tokenSymbol} (underlying: ${underlyingAsset})`);
        }
      }
    }

    const intent = await this.prisma.intent.create({
      data: {
        id: payload.txHash,
        userAddress: payload.data.user,
        sourceChainId: payload.chainId,
        sourceTxHash: payload.txHash,
        sourceBlockNumber: payload.blockNumber,
        tokenAddress: payload.data.token,
        tokenSymbol: tokenSymbol,
        amountInTokenRaw: payload.data.amountTokenRaw,
        amountInUsd: payload.data.amountUsd,
        status: "DEPOSIT_CONFIRMED",
        globalPhase: "DEPOSIT_CONFIRMED",
        allocations: allocations as any,
        chainStatuses: chainStatuses as any,
        isFAsset: isFAsset,
        underlyingAsset: underlyingAsset,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.prismaRowToIntent(intent);
  }

  async getIntentById(id: string): Promise<DepositIntent | null> {
    const intent = await this.prisma.intent.findUnique({
      where: { id },
    });

    if (!intent) {
      // If not found by ID, try searching by sourceTxHash (for backward compatibility)
      // This handles cases where the ID is a transaction hash but the intent has a UUID as ID
      if (id.startsWith("0x") && id.length === 66) {
        const intentByTxHash = await this.prisma.intent.findFirst({
          where: { sourceTxHash: id },
        });
        if (intentByTxHash) {
          return this.prismaRowToIntent(intentByTxHash);
        }
      }
      return null;
    }

    return this.prismaRowToIntent(intent);
  }

  async listHistory(opts: {
    userAddress?: string;
    status?: IntentStatus;
    limit: number;
    cursor?: string;
  }): Promise<{ items: DepositIntent[]; nextCursor?: string }> {
    // Build where clause
    const where: any = {};

    if (opts.userAddress) {
      where.userAddress = {
        equals: opts.userAddress,
        mode: "insensitive",
      };
    }

    if (opts.status) {
      where.status = opts.status;
    }

    // Cursor-based pagination
    if (opts.cursor) {
      const cursorIntent = await this.getIntentById(opts.cursor);
      if (cursorIntent) {
        where.createdAt = {
          lt: new Date(cursorIntent.createdAt),
        };
      }
    }

    const intents = await this.prisma.intent.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: opts.limit + 1, // Take one extra to check if there's a next page
    });

    const hasNextPage = intents.length > opts.limit;
    const items = hasNextPage ? intents.slice(0, opts.limit) : intents;

    return {
      items: items.map((intent) => this.prismaRowToIntent(intent)),
      nextCursor: hasNextPage ? items[items.length - 1].id : undefined,
    };
  }

  async updateIntent(
    id: string,
    patch: Partial<DepositIntent>
  ): Promise<DepositIntent> {
    // Build update data object
    const updateData: any = {};

    if (patch.status !== undefined) {
      updateData.status = patch.status;
    }

    if (patch.globalPhase !== undefined) {
      updateData.globalPhase = patch.globalPhase;
    }

    if (patch.chainStatuses !== undefined) {
      updateData.chainStatuses = patch.chainStatuses as any;
    }

    if (patch.allocations !== undefined) {
      updateData.allocations = patch.allocations as any;
    }

    if (patch.completedAt !== undefined) {
      updateData.completedAt = patch.completedAt
        ? new Date(patch.completedAt)
        : null;
    }

    // Flare-specific fields
    if (patch.fdcAttestationRound !== undefined) {
      updateData.fdcAttestationRound = patch.fdcAttestationRound;
    }

    if (patch.fdcAttestationStatus !== undefined) {
      updateData.fdcAttestationStatus = patch.fdcAttestationStatus;
    }

    if (patch.fdcProofHash !== undefined) {
      updateData.fdcProofHash = patch.fdcProofHash;
    }

    if (patch.isFAsset !== undefined) {
      updateData.isFAsset = patch.isFAsset;
    }

    if (patch.underlyingAsset !== undefined) {
      updateData.underlyingAsset = patch.underlyingAsset;
    }

    if (patch.ftsoFeedIds !== undefined) {
      updateData.ftsoFeedIds = patch.ftsoFeedIds as any;
    }

    if (patch.ftsoPrices !== undefined) {
      updateData.ftsoPrices = patch.ftsoPrices as any;
    }

    if (patch.smartAccountUsed !== undefined) {
      updateData.smartAccountUsed = patch.smartAccountUsed;
    }

    if (patch.relayerTxHash !== undefined) {
      updateData.relayerTxHash = patch.relayerTxHash;
    }

    // Always update updatedAt
    updateData.updatedAt = new Date();

    const intent = await this.prisma.intent.update({
      where: { id },
      data: updateData,
    });

    return this.prismaRowToIntent(intent);
  }

  /**
   * Convert Prisma Intent model to DepositIntent
   */
  private prismaRowToIntent(intent: any): DepositIntent {
    return {
      id: intent.id,
      userAddress: intent.userAddress,
      sourceChainId: intent.sourceChainId,
      sourceTxHash: intent.sourceTxHash,
      sourceBlockNumber: intent.sourceBlockNumber ?? undefined,
      tokenAddress: intent.tokenAddress,
      tokenSymbol: intent.tokenSymbol ?? undefined,
      amountInTokenRaw: intent.amountInTokenRaw,
      amountInUsd: intent.amountInUsd,
      status: intent.status as IntentStatus,
      globalPhase: intent.globalPhase as any,
      allocations: Array.isArray(intent.allocations)
        ? (intent.allocations as DestinationAllocation[])
        : (typeof intent.allocations === "string"
            ? JSON.parse(intent.allocations)
            : intent.allocations) as DestinationAllocation[],
      chainStatuses: Array.isArray(intent.chainStatuses)
        ? (intent.chainStatuses as ChainDispersal[])
        : (typeof intent.chainStatuses === "string"
            ? JSON.parse(intent.chainStatuses)
            : intent.chainStatuses) as ChainDispersal[],
      createdAt: intent.createdAt.toISOString(),
      updatedAt: intent.updatedAt.toISOString(),
      completedAt: intent.completedAt
        ? intent.completedAt.toISOString()
        : undefined,
      
      // Flare-specific fields
      fdcAttestationRound: intent.fdcAttestationRound ?? undefined,
      fdcAttestationStatus: intent.fdcAttestationStatus ?? undefined,
      fdcProofHash: intent.fdcProofHash ?? undefined,
      isFAsset: intent.isFAsset ?? undefined,
      underlyingAsset: intent.underlyingAsset ?? undefined,
      ftsoFeedIds: Array.isArray(intent.ftsoFeedIds)
        ? intent.ftsoFeedIds
        : (typeof intent.ftsoFeedIds === "string"
            ? JSON.parse(intent.ftsoFeedIds)
            : intent.ftsoFeedIds) ?? undefined,
      ftsoPrices: Array.isArray(intent.ftsoPrices)
        ? intent.ftsoPrices
        : (typeof intent.ftsoPrices === "string"
            ? JSON.parse(intent.ftsoPrices)
            : intent.ftsoPrices) ?? undefined,
      smartAccountUsed: intent.smartAccountUsed ?? undefined,
      relayerTxHash: intent.relayerTxHash ?? undefined,
    };
  }
}


/**
 * Prisma-based implementation of SmartAccountStorageAdapter
 * Provides database persistence for Smart Account records
 */
export class PrismaSmartAccountStorageAdapter implements SmartAccountStorageAdapter {
  constructor(private prisma: PrismaClient) {}

  /**
   * Store Smart Account record
   */
  async storeSmartAccount(record: SmartAccountRecord): Promise<void> {
    await this.prisma.smartAccount.create({
      data: {
        id: record.id,
        eoaAddress: record.eoaAddress,
        smartAccountAddress: record.smartAccountAddress,
        chainId: record.chainId,
        deploymentTxHash: record.deploymentTxHash,
        createdAt: record.createdAt,
        lastUsedAt: record.lastUsedAt,
      },
    });
  }

  /**
   * Get Smart Account record by EOA and chain ID
   */
  async getSmartAccount(eoaAddress: string, chainId: number): Promise<SmartAccountRecord | null> {
    const record = await this.prisma.smartAccount.findUnique({
      where: {
        eoaAddress_chainId: {
          eoaAddress,
          chainId,
        },
      },
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      eoaAddress: record.eoaAddress,
      smartAccountAddress: record.smartAccountAddress,
      chainId: record.chainId,
      deploymentTxHash: record.deploymentTxHash,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
    };
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(eoaAddress: string, chainId: number): Promise<void> {
    await this.prisma.smartAccount.update({
      where: {
        eoaAddress_chainId: {
          eoaAddress,
          chainId,
        },
      },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }
}
