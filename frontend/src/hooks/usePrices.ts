import { useCallback, useEffect, useState } from "react";

export type Prices = {
  tokens: Record<string, number>;
  chains: Record<
    string,
    { symbol: string; usdPrice: number; name: string }
  >;
  poweredBy?: string;
  priceSource?: string;
};

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

/** Used when the price API is unreachable — keep close to recent market. */
export const FALLBACK_TOKEN_USD: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  ETH: 2450,
  BTC: 78000,
  BNB: 600,
  TBNB: 600,
  MATIC: 0.45,
  POL: 0.45,
  AVAX: 25,
  TFIL: 4,
  FIL: 4,
  FLOW: 0.4,
  CELO: 0.35,
  CBTC: 78000,
};

export function getTokenUsdPrice(
  symbol: string | undefined,
  prices?: Prices | null
): number {
  if (!symbol) return 1;
  const key = symbol.toUpperCase();
  const live = prices?.tokens?.[key];
  if (typeof live === "number" && live > 0) return live;
  return FALLBACK_TOKEN_USD[key] ?? 1;
}

export function usdToTokenAmount(
  usd: number,
  symbol: string | undefined,
  prices?: Prices | null
): number {
  const px = getTokenUsdPrice(symbol, prices);
  if (px <= 0) return usd;
  return usd / px;
}

/** Protocol fee: 2% of deposit, min $0.02, max $0.25 */
export function protocolFeeUsd(depositUsd: number): number {
  if (depositUsd <= 0) return 0;
  return Math.min(0.25, Math.max(0.02, depositUsd * 0.02));
}

export function usePrices(pollMs = 30_000) {
  const [prices, setPrices] = useState<Prices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/prices`);
      if (!res.ok) throw new Error(`Prices HTTP ${res.status}`);
      const data = await res.json();
      setPrices({
        tokens: data.tokens || {},
        chains: data.chains || {},
        poweredBy: data.poweredBy,
        priceSource: data.priceSource,
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load prices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollMs <= 0) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { prices, loading, error, refresh };
}
