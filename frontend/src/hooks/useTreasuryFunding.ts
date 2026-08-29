import { useEffect, useState } from "react";
import { getTreasuryBalances } from "../utils/api";

/** Dust threshold: ~0.000001 native — below this the chain is treated as unfunded. */
const MIN_FUNDED_WEI = 10n ** 12n;

/**
 * Live set of destination chain IDs whose treasury currently holds native gas.
 * `null` means the first fetch has not completed yet.
 */
export function useTreasuryFunding() {
  const [fundedChainIds, setFundedChainIds] = useState<Set<number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getTreasuryBalances();
        const funded = new Set<number>();
        for (const row of res.balances || []) {
          try {
            const wei = BigInt(row.nativeBalance || "0");
            if (wei > MIN_FUNDED_WEI) funded.add(row.chainId);
          } catch {
            /* skip malformed */
          }
        }
        if (!cancelled) setFundedChainIds(funded);
      } catch {
        if (!cancelled) setFundedChainIds(new Set());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { fundedChainIds, loading };
}
