/**
 * Fallback price source types
 */

export interface FallbackPriceSource {
  /**
   * Get price for a token pair
   * @param symbol Token pair symbol (e.g., "FLR/USD", "BTC/USD")
   * @returns Price data
   */
  getPrice(symbol: string): Promise<FallbackPrice>;

  /**
   * Get name of the fallback source
   */
  getName(): string;
}

export interface FallbackPrice {
  symbol: string;
  value: bigint;
  decimals: number;
  timestamp: number;
  source: string;
}

/**
 * Chainlink fallback provider
 * Uses Chainlink price feeds as fallback
 */
export class ChainlinkFallbackProvider implements FallbackPriceSource {
  getName(): string {
    return "chainlink";
  }

  async getPrice(symbol: string): Promise<FallbackPrice> {
    // Placeholder implementation
    // In production, this would query Chainlink price feeds
    throw new Error("Chainlink fallback not yet implemented");
  }
}

/**
 * CoinGecko API fallback provider
 * Uses CoinGecko API as fallback
 */
export class CoinGeckoFallbackProvider implements FallbackPriceSource {
  private apiKey?: string;
  private baseUrl = "https://api.coingecko.com/api/v3";

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  getName(): string {
    return "coingecko";
  }

  async getPrice(symbol: string): Promise<FallbackPrice> {
    // Placeholder implementation
    // In production, this would query CoinGecko API
    throw new Error("CoinGecko fallback not yet implemented");
  }
}
