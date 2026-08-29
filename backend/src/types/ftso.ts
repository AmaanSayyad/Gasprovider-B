/**
 * FTSO (Flare Time Series Oracle) type definitions
 */

export interface FTSOPrice {
  feedId: string;
  value: bigint;
  decimals: number;
  timestamp: number;
  source: 'ftso' | 'fallback';
}

export interface FeedConfig {
  feedId: string;
  symbol: string;
  decimals: number;
  updateFrequency: number;
  fallbackSource?: string;
}

export interface FTSOQueryMetrics {
  feedId: string;
  queryTimestamp: number;
  responseTime: number;
  success: boolean;
  source: 'ftso' | 'fallback';
  error?: string;
}

export interface CachedPrice {
  price: FTSOPrice;
  cachedAt: number;
}
