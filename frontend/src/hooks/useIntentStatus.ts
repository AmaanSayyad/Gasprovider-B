import { useState, useEffect, useRef } from "react";
import { GetStatusResponse, DepositIntent, ChainDispersalStatus } from "../types";
import { fetchIntentStatus } from "../utils/api";
import { getChainIdFromNumeric, getExplorerUrl } from "../data/chains";

interface UseIntentStatusOptions {
  intentId?: string;
  enabled?: boolean;
  pollInterval?: number; // in milliseconds
}

interface UseIntentStatusReturn {
  data: GetStatusResponse | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch and poll intent status from the backend API.
 * Set enabled to false to use mock data instead.
 */
export function useIntentStatus({
  intentId,
  enabled = true,
  pollInterval = 3000,
}: UseIntentStatusOptions): UseIntentStatusReturn {
  const [data, setData] = useState<GetStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!intentId || !enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Try Treasury API first (UUID format), fallback to old API (tx hash format)
        let response: GetStatusResponse;
        
        if (intentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          // UUID format - use Treasury API
          const { getTreasuryIntentStatus } = await import("../utils/api");
          const treasuryResponse = await getTreasuryIntentStatus(intentId);
          
          // Convert Treasury response to GetStatusResponse format
          response = {
            intent: {
              id: treasuryResponse.intentId,
              userAddress: treasuryResponse.userAddress,
              sourceChainId: treasuryResponse.sourceChain,
              sourceTxHash: treasuryResponse.sourceTxHash || intentId, // Use actual sourceTxHash if available, fallback to intentId
              tokenAddress: treasuryResponse.sourceToken,
              totalAmount: treasuryResponse.sourceAmount,
              amountInUsd: treasuryResponse.usdValue.toString(),
              // Map status properly
              status: treasuryResponse.status === "completed" ? "DISPERSED" :
                      treasuryResponse.status === "failed" ? "FAILED" :
                      treasuryResponse.status === "distributing" ? "DISPERSING" :
                      treasuryResponse.status === "validating" ? "VALIDATING" :
                      "PENDING" as any,
              globalPhase: treasuryResponse.status === "completed" ? "COMPLETED" : 
                          treasuryResponse.status === "distributing" ? "DISPERSING" :
                          treasuryResponse.status === "validating" ? "VALIDATING" :
                          "PENDING",
              chainStatuses: treasuryResponse.distributions.map((d) => {
                const chainId = getChainIdFromNumeric(d.chainId);
                const explorerUrl = d.txHash && chainId 
                  ? `${getExplorerUrl(chainId)}/tx/${d.txHash}`
                  : undefined;
                
                // Determine status with priority:
                // 1. Failed status always takes precedence
                // 2. If global status is "completed" and txHash exists, it's CONFIRMED
                // 3. If backend says "confirmed", it's CONFIRMED
                // 4. If txHash exists and has confirmations > 0, it's CONFIRMED
                // 5. If txHash exists, it's BROADCASTED
                // 6. Otherwise, map based on backend status
                let status: ChainDispersalStatus;
                const isGlobalCompleted = treasuryResponse.status === "completed";
                
                if (d.status === "failed") {
                  status = "FAILED";
                } else if (d.status === "confirmed") {
                  status = "CONFIRMED";
                } else if (isGlobalCompleted && d.txHash && d.status !== "failed") {
                  // Global status is completed and transaction has hash - it's confirmed
                  // This handles cases where backend status is still "processing" but intent is completed
                  status = "CONFIRMED";
                } else if (d.txHash && (d.confirmations !== undefined && d.confirmations > 0)) {
                  // Transaction has confirmations - it's confirmed regardless of backend status
                  status = "CONFIRMED";
                } else if (d.txHash || d.status === "processing") {
                  // Transaction is broadcasted but not confirmed yet
                  status = "BROADCASTED";
                } else {
                  status = "PENDING";
                }
                
                return {
                  chainId: d.chainId,
                  chainName: d.chainName,
                  nativeSymbol: "ETH",
                  amountUsd: d.usdValue,
                  status,
                  txHash: d.txHash,
                  explorerUrl,
                  confirmations: d.confirmations,
                  errorMessage: d.error,
                  updatedAt: treasuryResponse.updatedAt,
                };
              }),
              createdAt: treasuryResponse.createdAt,
              updatedAt: treasuryResponse.updatedAt,
              completedAt: treasuryResponse.completedAt,
            },
          };
        } else {
          // Transaction hash format - use old API
          response = await fetchIntentStatus(intentId);
        }
        
        setData(response);
        
        // Stop polling only when everything is terminal:
        // - global COMPLETED/DISPERSED, or
        // - all chainStatuses are terminal (CONFIRMED or FAILED)
        const chainStatuses = response.intent?.chainStatuses ?? [];
        const hasChains = chainStatuses.length > 0;
        const allChainsTerminal = hasChains
          ? chainStatuses.every((c) => c.status === "CONFIRMED" || c.status === "FAILED")
          : false;

        // Also check if all chains have txHash (meaning they're at least broadcasted)
        // and if the global status is completed, mark as terminal
        const allChainsHaveTxHash = hasChains
          ? chainStatuses.every((c) => c.txHash || c.status === "FAILED")
          : false;

        const terminal =
          response.intent?.globalPhase === "COMPLETED" ||
          response.intent?.status === "DISPERSED" ||
          allChainsTerminal;
        
        // Stop polling when terminal, but continue if not
        if (terminal && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling
    intervalRef.current = setInterval(fetchStatus, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intentId, enabled, pollInterval]);

  return { data, isLoading, error };
}

