import { DepositIntent, ChainDispersal, ChainDispersalStatus, IntentStatus, GlobalPhase } from "../types";
import { IntentStore } from "../store";
import { BlockchainService } from "./blockchain";
import { FTSOPriceService } from "./ftso";
import { FAssetsService } from "./fassets";
import { FAssetConfig } from "../types/fassets";
import { ethers } from "ethers";

/**
 * Service for managing dispersal status transitions and business logic
 */
export class DispersalService {
  private blockchainService: BlockchainService;
  private ftsoService: FTSOPriceService | null = null;
  private fAssetsService: FAssetsService | null = null;

  constructor(private store: IntentStore) {
    this.blockchainService = new BlockchainService();
    
    // Prefer Coston2 when USE_TESTNET (docs: dApp path is Coston2 → Mainnet)
    const useTestnet = process.env.USE_TESTNET !== "false";
    const flareRpcUrl = useTestnet
      ? process.env.COSTON2_RPC_URL ||
        process.env.FLARE_RPC_URL ||
        "https://coston2-api.flare.network/ext/C/rpc"
      : process.env.FLARE_RPC_URL ||
        process.env.COSTON2_RPC_URL ||
        "https://flare-api.flare.network/ext/C/rpc";
    // Use FtsoV2 address (preferred) or fallback to FastUpdater
    const ftsoAddress = process.env.FTSO_V2_ADDRESS_COSTON2 || 
                       process.env.FTSO_V2_ADDRESS_MAINNET ||
                       process.env.FTSO_FAST_UPDATER_ADDRESS_COSTON2 ||
                       process.env.FTSO_FAST_UPDATER_ADDRESS;
    
    if (flareRpcUrl && ftsoAddress) {
      try {
        this.ftsoService = new FTSOPriceService(flareRpcUrl, ftsoAddress);
        console.log('✅ FTSO Price Service initialized with address:', ftsoAddress);
      } catch (error) {
        console.warn('⚠️ Failed to initialize FTSO Price Service:', error);
      }
    } else {
      console.warn('⚠️ FTSO configuration not found, price queries will be skipped');
      console.warn('   Missing:', !flareRpcUrl ? 'RPC URL' : 'FTSO Address');
    }

    // Initialize FAssets service if configuration is available
    const enableFAssets = process.env.ENABLE_FASSETS === 'true';
    
    if (flareRpcUrl && enableFAssets) {
      try {
        const fAssetConfigs = this.loadFAssetConfigs();
        if (fAssetConfigs.length > 0) {
          this.fAssetsService = new FAssetsService(flareRpcUrl, fAssetConfigs);
          console.log('✅ FAssets Service initialized in dispersal service');
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

  /**
   * Enqueue dispersal for all destination chains
   * This transitions the intent from DEPOSIT_CONFIRMED to DISPERSE_QUEUED
   */
  async enqueueDispersal(intentId: string): Promise<DepositIntent> {
    const intent = await this.store.getIntentById(intentId);
    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }
    console.log("Enqueuing dispersal for intent", intent);
    // Transition all chain statuses from NOT_STARTED to QUEUED
    const updatedChainStatuses: ChainDispersal[] = intent.chainStatuses.map((chain) => ({
      ...chain,
      status: chain.status === "NOT_STARTED" ? "QUEUED" : chain.status,
      updatedAt: new Date().toISOString(),
    }));

    const updated = await this.store.updateIntent(intentId, {
      status: "DISPERSE_QUEUED",
      globalPhase: "PREPARING_SWAP",
      chainStatuses: updatedChainStatuses,
    });

    console.log(
      `📋 Dispersal enqueued for ${intentId}: ${updated.chainStatuses.length} chains -> [${updated.chainStatuses
        .map((c) => c.chainId)
        .join(", ")}]`
    );

    // Start actual dispersal for each destination chain
    this.startDispersal(intentId).catch((err) => {
      console.error(`Error starting dispersal for ${intentId}:`, err);
      // Update status to failed if we can't start dispersal
      this.store
        .updateIntent(intentId, {
          status: "FAILED",
          globalPhase: "FAILED",
          completedAt: new Date().toISOString(),
        })
        .catch((updateErr) => {
          console.error(`Error updating intent status:`, updateErr);
        });
    });

    return updated;
  }

  /**
   * Update the status of a specific chain's dispersal
   * This is called when a destination chain transaction is broadcast or confirmed
   */
  async updateChainDispersalStatus(
    intentId: string,
    chainId: number,
    update: {
      status: ChainDispersalStatus;
      txHash?: string;
      explorerUrl?: string;
      gasUsed?: string;
      errorMessage?: string;
    }
  ): Promise<DepositIntent> {
    const intent = await this.store.getIntentById(intentId);
    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    const updatedChainStatuses = intent.chainStatuses.map((chain) => {
      if (chain.chainId === chainId) {
        return {
          ...chain,
          ...update,
          updatedAt: new Date().toISOString(),
        };
      }
      return chain;
    });

    // Determine new intent status and global phase based on chain statuses
    const allConfirmed = updatedChainStatuses.every((chain) => chain.status === "CONFIRMED");
    const anyFailed = updatedChainStatuses.some((chain) => chain.status === "FAILED");
    const anyBroadcasted = updatedChainStatuses.some((chain) => chain.status === "BROADCASTED");
    const anyInProgress = updatedChainStatuses.some(
      (chain) => chain.status === "BROADCASTED" || chain.status === "QUEUED"
    );

    let newStatus: IntentStatus = intent.status;
    let newGlobalPhase: GlobalPhase = intent.globalPhase;
    let completedAt: string | undefined = intent.completedAt;

    if (allConfirmed) {
      newStatus = "DISPERSED";
      newGlobalPhase = "COMPLETED";
      completedAt = new Date().toISOString();
    } else if (anyFailed) {
      newStatus = "FAILED";
      newGlobalPhase = "FAILED";
      completedAt = new Date().toISOString();
    } else if (anyBroadcasted) {
      newStatus = "DISPERSE_IN_PROGRESS";
      newGlobalPhase = "DISPERSING"; // or "SWAPPING" depending on where we are
    } else if (anyInProgress) {
      newStatus = "DISPERSE_IN_PROGRESS";
      newGlobalPhase = "PREPARING_SWAP";
    }

    const updatedIntent = await this.store.updateIntent(intentId, {
      status: newStatus,
      globalPhase: newGlobalPhase,
      chainStatuses: updatedChainStatuses,
      completedAt,
    });

    // Aggregate progress log
    const total = updatedIntent.chainStatuses.length;
    const counts = updatedIntent.chainStatuses.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<ChainDispersalStatus, number>);
    const confirmed = counts.CONFIRMED || 0;
    const failed = counts.FAILED || 0;
    const broadcasted = counts.BROADCASTED || 0;
    const queued = counts.QUEUED || 0;
    const notStarted = counts.NOT_STARTED || 0;
    const percent = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    console.log(
      `📈 Progress for ${intentId}: ${confirmed}/${total} confirmed (${percent}%), broadcasted: ${broadcasted}, queued: ${queued}, not_started: ${notStarted}, failed: ${failed}`
    );

    return updatedIntent;
  }

  /**
   * Start dispersal for all destination chains
   * Calls the drip function on each destination chain's escrow contract
   */
  private async startDispersal(intentId: string): Promise<void> {
    const intent = await this.store.getIntentById(intentId);
    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    console.log(`🚀 Starting dispersal for intent ${intentId}`);

    // Process each destination chain in parallel
    const dispersalPromises = intent.chainStatuses.map((chain) =>
      this.disperseToChain(intentId, intent.userAddress, chain)
    );

    // Wait for all dispersals to start (they'll continue in background)
    await Promise.allSettled(dispersalPromises);
  }

  /**
   * Disperse tokens to a specific destination chain
   */
  private async disperseToChain(intentId: string, userAddress: string, chain: ChainDispersal): Promise<void> {
    try {
      // Query FTSO for current prices before dispersal
      const intent = await this.store.getIntentById(intentId);
      if (!intent) {
        throw new Error(`Intent not found: ${intentId}`);
      }

      // Get FTSO price snapshots for this dispersal
      const priceSnapshots = await this.getFTSOPriceSnapshots(intent, chain.chainId);
      
      // Update intent with FTSO price snapshots
      await this.store.updateIntent(intentId, {
        ftsoPrices: priceSnapshots,
        ftsoFeedIds: priceSnapshots.map(p => p.feedId),
      });

      // Convert USD amount to USDC raw units (USDC has 6 decimals)
      // amountUsd is a decimal string like "20.00"
      const usdcAmountRaw = ethers.parseUnits(chain.amountUsd, 6).toString();

      console.log(`💧 Dispensing to chain ${chain.chainId}: ${chain.amountUsd} USD (${usdcAmountRaw} raw USDC)`);
      console.log(`📊 FTSO prices used:`, priceSnapshots.map(p => `${p.symbol}: ${p.value} (${p.source})`).join(', '));

      // Call the drip function on the destination chain
      const result = await this.blockchainService.drip(chain.chainId, usdcAmountRaw, userAddress);

      // Update status to BROADCASTED
      await this.updateChainDispersalStatus(intentId, chain.chainId, {
        status: "BROADCASTED",
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
      });

      // Start polling for confirmation in the background
      this.waitForChainConfirmation(intentId, chain.chainId, result.txHash).catch((err) => {
        console.error(`Error waiting for confirmation on chain ${chain.chainId}:`, err);
        // Update status to failed
        this.updateChainDispersalStatus(intentId, chain.chainId, {
          status: "FAILED",
          errorMessage: err.message || "Transaction confirmation failed",
        }).catch((updateErr) => {
          console.error(`Error updating chain status:`, updateErr);
        });
      });
    } catch (error: any) {
      console.error(`❌ Error dispersing to chain ${chain.chainId}:`, error);

      // Update status to failed
      await this.updateChainDispersalStatus(intentId, chain.chainId, {
        status: "FAILED",
        errorMessage: error.message || "Failed to broadcast transaction",
      });
    }
  }

  /**
   * Wait for a transaction to be confirmed and update status
   */
  private async waitForChainConfirmation(intentId: string, chainId: number, txHash: string): Promise<void> {
    try {
      // Wait for confirmation (1 confirmation is usually enough for most chains)
      const receipt = await this.blockchainService.waitForConfirmation(
        chainId,
        txHash,
        1, // confirmations
        10 * 60 * 1000 // 10 minute timeout
      );

      if (receipt.status === 0) {
        // Transaction failed
        throw new Error("Transaction reverted");
      }

      // Update status to CONFIRMED
      await this.updateChainDispersalStatus(intentId, chainId, {
        status: "CONFIRMED",
        gasUsed: receipt.gasUsed.toString(),
      });

      console.log(`✅ Chain ${chainId} confirmed: ${txHash} (gas: ${receipt.gasUsed})`);
    } catch (error: any) {
      console.error(`❌ Confirmation failed for chain ${chainId}, tx ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Get FTSO price snapshots for source token and destination chain native token
   */
  private async getFTSOPriceSnapshots(intent: DepositIntent, destChainId: number): Promise<import("../types").FTSOPriceSnapshot[]> {
    const snapshots: import("../types").FTSOPriceSnapshot[] = [];

    // Skip if FTSO service is not available
    if (!this.ftsoService) {
      return snapshots;
    }

    try {
      // If this is a FAsset deposit, query the underlying asset price
      if (intent.isFAsset && this.fAssetsService) {
        const underlyingFeedId = this.fAssetsService.getUnderlyingFeed(intent.tokenAddress);
        
        if (underlyingFeedId) {
          try {
            console.log(`📊 Querying FTSO for FAsset underlying price: ${intent.underlyingAsset}/USD`);
            const underlyingPrice = await this.ftsoService.getPrice(underlyingFeedId);
            
            snapshots.push({
              feedId: underlyingPrice.feedId,
              symbol: `${intent.underlyingAsset}/USD`,
              value: underlyingPrice.value.toString(),
              decimals: underlyingPrice.decimals,
              timestamp: underlyingPrice.timestamp,
              source: underlyingPrice.source,
            });
            
            console.log(`✅ Got ${intent.underlyingAsset}/USD price: ${underlyingPrice.value} (source: ${underlyingPrice.source})`);
          } catch (error) {
            console.warn(`Failed to get ${intent.underlyingAsset}/USD price from FTSO:`, error);
          }
        } else {
          console.warn(`⚠️ No FTSO feed ID found for FAsset ${intent.tokenSymbol}`);
        }
      }
      
      // Query destination chain native token price
      // Example: Query FLR/USD for Flare destination chains
      if (destChainId === 14 || destChainId === 114) {
        try {
          const flrPrice = await this.ftsoService.getPrice('FLR/USD');
          snapshots.push({
            feedId: flrPrice.feedId,
            symbol: 'FLR/USD',
            value: flrPrice.value.toString(),
            decimals: flrPrice.decimals,
            timestamp: flrPrice.timestamp,
            source: flrPrice.source,
          });
        } catch (error) {
          console.warn('Failed to get FLR/USD price from FTSO, continuing without it:', error);
        }
      }

      // Add more price feeds as needed based on source token and destination chain
      // This is a simplified implementation
      
    } catch (error) {
      console.error('Error getting FTSO price snapshots:', error);
      // Continue without FTSO prices rather than failing the dispersal
    }

    return snapshots;
  }
}
