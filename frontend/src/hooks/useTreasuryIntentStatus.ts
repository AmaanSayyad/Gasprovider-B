/**
 * Hook for fetching and polling Treasury intent status
 * Requirements: 10.4, 2.4, 6.3, 6.4
 */

import { useState, useEffect, useRef } from "react";
import { getTreasuryIntentStatus, TreasuryIntentStatusResponse } from "../utils/api";

interface UseTreasuryIntentStatusOptions {
  intentId: string;
  enabled?: boolean;
  pollingInterval?: number; // milliseconds
}

interface UseTreasuryIntentStatusResult {
  data: TreasuryIntentStatusResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and poll Treasury intent status from the backend API
 */
export function useTreasuryIntentStatus({
  intentId,
  enabled = true,
  pollingInterval = 5000, // Poll every 5 seconds by default
}: UseTreasuryIntentStatusOptions): UseTreasuryIntentStatusResult {
  const [data, setData] = useState<TreasuryIntentStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    if (!enabled || !intentId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await getTreasuryIntentStatus(intentId);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled || !intentId) {
      return;
    }

    // Initial fetch
    fetchData();

    // Set up polling if intent is not completed or failed
    if (data?.status !== "completed" && data?.status !== "failed") {
      intervalRef.current = setInterval(fetchData, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [intentId, enabled, pollingInterval, data?.status]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
