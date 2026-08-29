import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { FTSOPrice, FeedConfig, FTSOQueryMetrics, CachedPrice } from "../types/ftso";
import { FallbackPriceSource, ChainlinkFallbackProvider, CoinGeckoFallbackProvider } from "../types/fallback";

// Load FtsoV2 ABI
const ftsoV2AbiPath = path.join(__dirname, "../contracts/FtsoV2.abi.json");
const ftsoV2Abi = JSON.parse(fs.readFileSync(ftsoV2AbiPath, "utf-8"));

// Feed ID to symbol mapping for fallback
const FEED_ID_TO_SYMBOL: Record<string, string> = {
  "0x01464c522f55534400000000000000000000000000": "FLR/USD",
  "0x014254432f55534400000000000000000000000000": "BTC/USD",
  "0x014554482f55534400000000000000000000000000": "ETH/USD",
  "0x015852502f55534400000000000000000000000000": "XRP/USD",
  "0x01444f47452f555344000000000000000000000000": "DOGE/USD",
  "0x014c54432f55534400000000000000000000000000": "LTC/USD",
  "0x01555344432f555344000000000000000000000000": "USDC/USD",
  "0x01555344542f555344000000000000000000000000": "USDT/USD",
};

/**
 * Service for querying FTSOv2 price feeds
 * Provides real-time, decentralized price data with block-latency updates
 */
export class FTSOPriceService {
  private provider: ethers.JsonRpcProvider;
  private ftsoV2Contract: ethers.Contract;
  private priceCache: Map<string, CachedPrice> = new Map();
  private cacheTTL: number;
  private metricsEnabled: boolean;
  private metrics: FTSOQueryMetrics[] = [];
  private fallbackSource?: FallbackPriceSource;
  private fallbackEnabled: boolean;
  private maxRetries: number;
  private retryBackoffMs: number;

  constructor(
    rpcUrl: string,
    ftsoV2Address: string,
    cacheTTL: number = 30000, // 30 seconds default
    fallbackSource?: FallbackPriceSource
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl, 114, {
      staticNetwork: true,
      polling: false,
    });
    this.ftsoV2Contract = new ethers.Contract(
      ftsoV2Address,
      ftsoV2Abi,
      this.provider
    );
    this.cacheTTL = cacheTTL;
    this.metricsEnabled = process.env.FTSO_ENABLE_METRICS === "true";
    this.fallbackSource = fallbackSource;
    this.fallbackEnabled = process.env.FTSO_ENABLE_FALLBACK === "true";
    this.maxRetries = parseInt(process.env.FTSO_MAX_RETRIES || "3");
    this.retryBackoffMs = parseInt(process.env.FTSO_RETRY_BACKOFF_MS || "1000");

    console.log("✅ FTSOPriceService initialized", {
      rpcUrl,
      ftsoV2Address,
      cacheTTL: `${cacheTTL}ms`,
      metricsEnabled: this.metricsEnabled,
      fallbackEnabled: this.fallbackEnabled,
      fallbackSource: fallbackSource?.getName(),
      maxRetries: this.maxRetries,
      retryBackoffMs: this.retryBackoffMs,
    });
  }

  /**
   * Hot-swap FtsoV2 address after FlareContractRegistry resolution.
   */
  public setFtsoV2Address(ftsoV2Address: string): void {
    this.ftsoV2Contract = new ethers.Contract(
      ftsoV2Address,
      ftsoV2Abi,
      this.provider
    );
    console.log("✅ FTSOPriceService FtsoV2 address updated:", ftsoV2Address);
  }

  /**
   * Query current price for a single feed
   * @param feedId The 21-byte feed ID (e.g., "0x01464c522f55534400000000000000000000000000" for FLR/USD)
   * @returns Price data including value, decimals, and timestamp
   */
  async getPrice(feedId: string): Promise<FTSOPrice> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = this.getCachedPrice(feedId);
      if (cached) {
        console.log(`📦 Cache hit for feed ${feedId}`);
        this.recordMetrics({
          feedId,
          queryTimestamp: Date.now(),
          responseTime: Date.now() - startTime,
          success: true,
          source: cached.source,
        });
        return cached;
      }

      // Try FTSO with retries
      const ftsoPrice = await this.getPriceWithRetry(feedId);
      if (ftsoPrice) {
        return ftsoPrice;
      }

      // If FTSO fails and fallback is enabled, try fallback
      if (this.fallbackEnabled && this.fallbackSource) {
        console.log(`⚠️ FTSO unavailable for ${feedId}, using fallback source: ${this.fallbackSource.getName()}`);
        return await this.getPriceFromFallback(feedId);
      }

      throw new Error(`Failed to query FTSO feed ${feedId} after ${this.maxRetries} retries and no fallback available`);
    } catch (error: any) {
      console.error(`❌ Error querying price for feed ${feedId}:`, error);
      throw new Error(`Failed to query price for feed ${feedId}: ${error.message}`);
    }
  }

  /**
   * Query FTSO with retry logic and exponential backoff
   * @param feedId Feed ID to query
   * @returns Price data or null if all retries fail
   */
  private async getPriceWithRetry(feedId: string): Promise<FTSOPrice | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const startTime = Date.now();

      try {
        console.log(`🔍 Querying FTSO for feed ${feedId} (attempt ${attempt + 1}/${this.maxRetries})`);

        // Prefer single-feed getFeedById (docs); fall back to getFeedsById
        let value: bigint;
        let decimals: number;
        let timestampNum: number;

        try {
          const single = await this.ftsoV2Contract.getFeedById(feedId);
          value = single[0];
          decimals = Number(single[1]);
          timestampNum = Number(single[2]);
        } catch {
          const result = await this.ftsoV2Contract.getFeedsById([feedId]);
          if (!result || result.length !== 3) {
            throw new Error("Invalid response structure from FtsoV2");
          }
          const [feedValues, decimalsArray, timestamp] = result;
          if (!feedValues?.length || !decimalsArray?.length) {
            throw new Error("No feed values returned");
          }
          value = feedValues[0];
          decimals = Number(decimalsArray[0]);
          timestampNum = Number(timestamp);
        }

        // Validate data
        this.validatePriceData(value, decimals, timestampNum);

        const price: FTSOPrice = {
          feedId,
          value: BigInt(value),
          decimals,
          timestamp: timestampNum,
          source: "ftso",
        };

        // Cache the price
        this.cachePrice(feedId, price);

        // Record metrics
        this.recordMetrics({
          feedId,
          queryTimestamp: Date.now(),
          responseTime: Date.now() - startTime,
          success: true,
          source: "ftso",
        });

        console.log(`✅ FTSO price retrieved for ${feedId}:`, {
          value: value.toString(),
          decimals,
          timestamp: timestampNum,
          responseTime: `${Date.now() - startTime}ms`,
          attempt: attempt + 1,
        });

        return price;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ FTSO query attempt ${attempt + 1} failed for feed ${feedId}:`, error.message);

        // Record error metrics
        this.recordMetrics({
          feedId,
          queryTimestamp: Date.now(),
          responseTime: Date.now() - startTime,
          success: false,
          source: "ftso",
          error: error.message,
        });

        // If not the last attempt, wait with exponential backoff
        if (attempt < this.maxRetries - 1) {
          const backoffMs = this.retryBackoffMs * Math.pow(2, attempt);
          console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    console.error(`❌ All ${this.maxRetries} FTSO query attempts failed for feed ${feedId}`);
    return null;
  }

  /**
   * Get price from fallback source
   * @param feedId Feed ID
   * @returns Price data from fallback
   */
  private async getPriceFromFallback(feedId: string): Promise<FTSOPrice> {
    const startTime = Date.now();

    try {
      const symbol = FEED_ID_TO_SYMBOL[feedId];
      if (!symbol) {
        throw new Error(`No symbol mapping for feed ID ${feedId}`);
      }

      if (!this.fallbackSource) {
        throw new Error("No fallback source configured");
      }

      console.log(`🔄 Querying fallback source ${this.fallbackSource.getName()} for ${symbol}`);

      const fallbackPrice = await this.fallbackSource.getPrice(symbol);

      const price: FTSOPrice = {
        feedId,
        value: fallbackPrice.value,
        decimals: fallbackPrice.decimals,
        timestamp: fallbackPrice.timestamp,
        source: "fallback",
      };

      // Cache the fallback price
      this.cachePrice(feedId, price);

      // Record metrics
      this.recordMetrics({
        feedId,
        queryTimestamp: Date.now(),
        responseTime: Date.now() - startTime,
        success: true,
        source: "fallback",
      });

      // Log warning about fallback usage
      console.warn(`⚠️ Using fallback price source for ${feedId}: ${this.fallbackSource.getName()}`);

      return price;
    } catch (error: any) {
      console.error(`❌ Fallback query failed for feed ${feedId}:`, error);

      // Record error metrics
      this.recordMetrics({
        feedId,
        queryTimestamp: Date.now(),
        responseTime: Date.now() - startTime,
        success: false,
        source: "fallback",
        error: error.message,
      });

      throw new Error(`Fallback query failed for feed ${feedId}: ${error.message}`);
    }
  }

  /**
   * Query prices for multiple feeds in a single call
   * @param feedIds Array of 21-byte feed IDs
   * @returns Array of price data for each feed
   */
  async getPrices(feedIds: string[]): Promise<FTSOPrice[]> {
    const startTime = Date.now();

    try {
      console.log(`🔍 Querying FTSO for ${feedIds.length} feeds`);

      // Query FtsoV2 contract with all feed IDs
      const result = await this.ftsoV2Contract.getFeedsById(feedIds);

      // Validate response structure
      if (!result || result.length !== 3) {
        throw new Error("Invalid response structure from FtsoV2");
      }

      const [feedValues, decimalsArray, timestamp] = result;

      // Validate arrays match feed count
      if (feedValues.length !== feedIds.length) {
        throw new Error(
          `Feed values count mismatch: expected ${feedIds.length}, got ${feedValues.length}`
        );
      }

      if (decimalsArray.length !== feedIds.length) {
        throw new Error(
          `Decimals count mismatch: expected ${feedIds.length}, got ${decimalsArray.length}`
        );
      }

      const timestampNum = Number(timestamp);
      const prices: FTSOPrice[] = [];

      // Process each feed
      for (let i = 0; i < feedIds.length; i++) {
        const feedId = feedIds[i];
        const value = feedValues[i];
        const decimals = Number(decimalsArray[i]);

        try {
          // Validate individual feed data
          this.validatePriceData(value, decimals, timestampNum);

          const price: FTSOPrice = {
            feedId,
            value: BigInt(value),
            decimals,
            timestamp: timestampNum,
            source: "ftso",
          };

          // Cache the price
          this.cachePrice(feedId, price);

          prices.push(price);

          // Record metrics for successful feed
          this.recordMetrics({
            feedId,
            queryTimestamp: Date.now(),
            responseTime: Date.now() - startTime,
            success: true,
            source: "ftso",
          });
        } catch (error: any) {
          console.error(`❌ Error processing feed ${feedId}:`, error);

          // Record error metrics for failed feed
          this.recordMetrics({
            feedId,
            queryTimestamp: Date.now(),
            responseTime: Date.now() - startTime,
            success: false,
            source: "ftso",
            error: error.message,
          });

          // Continue processing other feeds
          // Individual feed failures don't fail the entire batch
        }
      }

      console.log(`✅ FTSO batch query completed:`, {
        totalFeeds: feedIds.length,
        successfulFeeds: prices.length,
        failedFeeds: feedIds.length - prices.length,
        timestamp: timestampNum,
        responseTime: `${Date.now() - startTime}ms`,
      });

      return prices;
    } catch (error: any) {
      console.error(`❌ Error in batch FTSO query:`, error);

      // Record error metrics for all feeds
      feedIds.forEach((feedId) => {
        this.recordMetrics({
          feedId,
          queryTimestamp: Date.now(),
          responseTime: Date.now() - startTime,
          success: false,
          source: "ftso",
          error: error.message,
        });
      });

      throw new Error(`Failed to query FTSO feeds: ${error.message}`);
    }
  }

  /**
   * Get feed configuration (placeholder for future implementation)
   * @param symbol Token symbol (e.g., "FLR/USD")
   * @returns Feed configuration
   */
  getFeedConfig(symbol: string): FeedConfig {
    // This would typically query a database or configuration file
    // For now, return a basic config
    throw new Error("getFeedConfig not yet implemented");
  }

  /**
   * Check if a feed is healthy (placeholder for future implementation)
   * @param feedId Feed ID to check
   * @returns True if feed is healthy
   */
  async isFeedHealthy(feedId: string): Promise<boolean> {
    try {
      const price = await this.getPrice(feedId);
      // Check if price is recent (within 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const age = now - price.timestamp;
      return age < 300; // 5 minutes
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cached price if available and not expired
   * @param feedId Feed ID
   * @returns Cached price or null
   */
  private getCachedPrice(feedId: string): FTSOPrice | null {
    const cached = this.priceCache.get(feedId);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const age = now - cached.cachedAt;

    if (age > this.cacheTTL) {
      // Cache expired
      this.priceCache.delete(feedId);
      return null;
    }

    return cached.price;
  }

  /**
   * Cache a price
   * @param feedId Feed ID
   * @param price Price data
   */
  private cachePrice(feedId: string, price: FTSOPrice): void {
    this.priceCache.set(feedId, {
      price,
      cachedAt: Date.now(),
    });
  }

  /**
   * Validate price data
   * @param value Price value
   * @param decimals Decimals
   * @param timestamp Timestamp
   */
  private validatePriceData(value: any, decimals: number, timestamp: number): void {
    // Validate value is a valid number
    if (value === undefined || value === null) {
      throw new Error("Price value is undefined or null");
    }

    // Validate decimals is reasonable
    if (decimals < -18 || decimals > 18) {
      throw new Error(`Invalid decimals: ${decimals}`);
    }

    // Validate timestamp is recent (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;

    if (age > 300) {
      throw new Error(`Stale price data: ${age} seconds old (max 300 seconds)`);
    }

    if (age < -60) {
      throw new Error(`Future timestamp: ${age} seconds in the future`);
    }
  }

  /**
   * Record query metrics
   * @param metrics Metrics data
   */
  private recordMetrics(metrics: FTSOQueryMetrics): void {
    if (!this.metricsEnabled) {
      return;
    }

    this.metrics.push(metrics);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  /**
   * Get recorded metrics
   * @returns Array of metrics
   */
  getMetrics(): FTSOQueryMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
  }
}
