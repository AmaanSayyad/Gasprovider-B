import { useCallback, useEffect, useState } from "react";

export type FtsoPrices = {
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

/** Fallback when FTSO API is unreachable — keep close to recent market. */
export const FALLBACK_TOKEN_USD: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  FXRP: 1,
  XRP: 1,
  C2FLR: 0.006,
  FLR: 0.006,
  WFLR: 0.006,
  ETH: 1900,
  BTC: 64000,
  FBTC: 64000,
  MON: 0.05,
  MATIC: 0.45,
  POL: 0.45,
  AVAX: 25,
  BNB: 600,
  TBNB: 600,
  TFIL: 4,
  FIL: 4,
  FLOW: 0.4,
  CELO: 0.35,
  CBTC: 64000,
};

export function getTokenUsdPrice(
  symbol: string | undefined,
  prices?: FtsoPrices | null
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
  prices?: FtsoPrices | null
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

export function useFtsoPrices(pollMs = 30_000) {
  const [prices, setPrices] = useState<FtsoPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/prices/ftso`);
      if (!res.ok) throw new Error(`FTSO HTTP ${res.status}`);
      const data = await res.json();
      setPrices({
        tokens: data.tokens || {},
        chains: data.chains || {},
        poweredBy: data.poweredBy,
        priceSource: data.priceSource,
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load FTSO prices");
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
