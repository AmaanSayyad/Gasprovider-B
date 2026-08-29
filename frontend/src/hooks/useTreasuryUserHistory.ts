/**
 * Hook for fetching Treasury user history
 * Requirements: 10.5, 6.1, 6.2
 */

import { useState, useEffect } from "react";
import { getTreasuryUserHistory, TreasuryUserHistoryResponse } from "../utils/api";

interface UseTreasuryUserHistoryOptions {
  userAddress?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number; // milliseconds, 0 to disable polling
}

interface UseTreasuryUserHistoryResult {
  data: TreasuryUserHistoryResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch Treasury user history from the backend API
 */
export function useTreasuryUserHistory({
  userAddress,
  page = 1,
  limit = 20,
  enabled = true,
  refetchInterval = 0, // No polling by default
}: UseTreasuryUserHistoryOptions): UseTreasuryUserHistoryResult {
  const [data, setData] = useState<TreasuryUserHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!enabled || !userAddress) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await getTreasuryUserHistory(userAddress, page, limit);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled || !userAddress) {
      return;
    }

    // Initial fetch
    fetchData();

    // Set up polling if enabled
    if (refetchInterval > 0) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [userAddress, page, limit, enabled, refetchInterval]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
