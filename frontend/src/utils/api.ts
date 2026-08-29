import { GetStatusResponse, GetHistoryResponse, IntentStatus } from "../types";
import { retryWithBackoff, classifyError, logError } from "./errorHandler";

// Use localhost when running on localhost, otherwise use environment variable or Railway URL
export const getApiBaseUrl = () => {
  // If running on localhost, always use local backend
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:3000";
  }
  // Otherwise use environment variable or default
  return import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
};

const API_BASE_URL = getApiBaseUrl();

// Log API URL in development
if (import.meta.env.DEV) {
  console.log("🔗 API Base URL:", API_BASE_URL);
}

export async function fetchIntentStatus(
  intentId: string
): Promise<GetStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/status/${intentId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Intent not found: ${intentId}`);
    }
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(
      error.error || `Failed to fetch intent status: ${response.statusText}`
    );
  }

  return response.json();
}

export interface FetchHistoryOptions {
  userAddress?: string;
  status?: IntentStatus;
  limit?: number;
  cursor?: string;
}

export async function fetchHistory(
  options: FetchHistoryOptions = {}
): Promise<GetHistoryResponse> {
  const params = new URLSearchParams();

  if (options.userAddress) {
    params.append("userAddress", options.userAddress);
  }
  if (options.status) {
    params.append("status", options.status);
  }
  if (options.limit) {
    params.append("limit", options.limit.toString());
  }
  if (options.cursor) {
    params.append("cursor", options.cursor);
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/history${queryString ? `?${queryString}` : ""}`;

  console.log("🔍 Fetching history from:", url);
  console.log("📋 Options:", options);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Try to parse error, but don't fail if it's not JSON
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("❌ History fetch error:", error);
      throw new Error(
        error.error || `Failed to fetch history: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ History response:", {
      itemsCount: data.items?.length || 0,
      items: data.items,
      nextCursor: data.nextCursor,
    });
    // Ensure we always return a valid response with items array
    return {
      items: data.items || [],
      nextCursor: data.nextCursor,
    };
  } catch (err) {
    // Handle network errors (CORS, connection refused, etc.)
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error(
        "Failed to connect to server. Please check your connection."
      );
    }
    throw err;
  }
}

// Schedule API functions
export interface Schedule {
  id: string;
  userAddress: string;
  name?: string;
  sourceChainId: number;
  tokenAddress: string;
  tokenSymbol?: string;
  amountInUsd: string;
  allocations: Array<{ destChainId: number; amountUsd: string }>;
  scheduleType: "one_time" | "recurring" | "auto_balance";
  scheduledAt?: string;
  recurrencePattern?: string;
  timezone: string;
  autoDisperseEnabled: boolean;
  monitorChainId?: number;
  balanceThreshold?: string;
  checkInterval?: number;
  status: string;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
  executionCount: number;
  lastIntentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleRequest {
  userAddress: string;
  name?: string;
  sourceChainId: number;
  tokenAddress: string;
  tokenSymbol?: string;
  amountInUsd: string;
  allocations: Array<{ destChainId: number; amountUsd: string }>;
  scheduleType: "one_time" | "recurring" | "auto_balance";
  scheduledAt?: string;
  recurrencePattern?: "daily" | "weekly" | "monthly";
  timezone?: string;
  autoDisperseEnabled?: boolean;
  monitorChainId?: number;
  balanceThreshold?: string;
  checkInterval?: number;
}

export async function fetchSchedules(userAddress: string): Promise<{ schedules: Schedule[] }> {
  const response = await fetch(`${API_BASE_URL}/schedules?userAddress=${userAddress}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to fetch schedules: ${response.statusText}`);
  }

  return response.json();
}

export async function createSchedule(schedule: CreateScheduleRequest): Promise<Schedule> {
  const response = await fetch(`${API_BASE_URL}/schedules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(schedule),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to create schedule: ${response.statusText}`);
  }

  return response.json();
}

export async function pauseSchedule(id: string): Promise<Schedule> {
  const response = await fetch(`${API_BASE_URL}/schedules/${id}/pause`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to pause schedule: ${response.statusText}`);
  }

  return response.json();
}

export async function resumeSchedule(id: string): Promise<Schedule> {
  const response = await fetch(`${API_BASE_URL}/schedules/${id}/resume`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to resume schedule: ${response.statusText}`);
  }

  return response.json();
}

export async function cancelSchedule(id: string): Promise<Schedule> {
  const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to cancel schedule: ${response.statusText}`);
  }

  return response.json();
}

// Referral API functions
export interface ReferralStats {
  totalReferrals: number;
  totalRewards: string;
  activeReferrals: number;
  referralCode: string;
  referralLink: string;
}

export interface LeaderboardEntry {
  userAddress: string;
  totalReferrals: number;
  totalRewards: string;
  rank: number;
}

export async function getReferralStats(userAddress: string): Promise<ReferralStats> {
  const response = await fetch(`${API_BASE_URL}/referrals/stats?userAddress=${userAddress}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to get referral stats: ${response.statusText}`);
  }

  return response.json();
}

export async function useReferralCode(
  referralCode: string,
  referredAddress: string,
  intentId?: string
): Promise<{ success: boolean; rewardAmount?: string }> {
  const response = await fetch(`${API_BASE_URL}/referrals/use`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ referralCode, referredAddress, intentId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to use referral code: ${response.statusText}`);
  }

  return response.json();
}

export async function getReferralLeaderboard(limit: number = 100): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const response = await fetch(`${API_BASE_URL}/referrals/leaderboard?limit=${limit}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to get leaderboard: ${response.statusText}`);
  }

  return response.json();
}

// Gamification API functions
export interface GamificationStats {
  totalPoints: number;
  totalAchievements: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  rank: number;
}

export async function getGamificationStats(userAddress: string): Promise<GamificationStats> {
  const response = await fetch(`${API_BASE_URL}/gamification/stats?userAddress=${userAddress}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to get gamification stats: ${response.statusText}`);
  }

  return response.json();
}

export async function updateStreak(
  userAddress: string,
  streakType: string = "dispersal"
): Promise<{ currentStreak: number; longestStreak: number }> {
  const response = await fetch(`${API_BASE_URL}/gamification/update-streak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userAddress, streakType }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to update streak: ${response.statusText}`);
  }

  return response.json();
}

export async function getLeaderboard(
  category: string,
  period: string = "all_time",
  limit: number = 100
): Promise<{ leaderboard: Array<{ userAddress: string; score: string; rank: number }> }> {
  const response = await fetch(
    `${API_BASE_URL}/gamification/leaderboard?category=${category}&period=${period}&limit=${limit}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to get leaderboard: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Gas Pool API Functions
// ============================================================================

export interface GasPool {
  id: string;
  name: string;
  description?: string;
  creatorAddress: string;
  poolCode: string;
  minContribution: string;
  maxMembers?: number;
  isPublic: boolean;
  autoDistribute: boolean;
  status: string;
  totalContributed: string;
  totalDistributed: string;
  currentBalance: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  members?: any[];
}

export async function createGasPool(data: {
  name: string;
  description?: string;
  creatorAddress: string;
  minContribution: string;
  maxMembers?: number;
  isPublic?: boolean;
  autoDistribute?: boolean;
}): Promise<GasPool> {
  const response = await fetch(`${API_BASE_URL}/gas-pools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to create pool: ${response.statusText}`);
  }

  return response.json();
}

export async function getPublicPools(limit: number = 20): Promise<{ pools: GasPool[] }> {
  const response = await fetch(`${API_BASE_URL}/gas-pools/public?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch public pools: ${response.statusText}`);
  }
  return response.json();
}

export async function getUserPools(userAddress: string): Promise<{ pools: GasPool[] }> {
  const response = await fetch(`${API_BASE_URL}/gas-pools/user/${userAddress}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user pools: ${response.statusText}`);
  }
  return response.json();
}

export async function getPoolById(poolId: string, userAddress?: string): Promise<GasPool> {
  const url = userAddress
    ? `${API_BASE_URL}/gas-pools/${poolId}?userAddress=${userAddress}`
    : `${API_BASE_URL}/gas-pools/${poolId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch pool: ${response.statusText}`);
  }
  return response.json();
}

export async function getPoolByCode(poolCode: string): Promise<GasPool> {
  const response = await fetch(`${API_BASE_URL}/gas-pools/code/${poolCode}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch pool: ${response.statusText}`);
  }
  return response.json();
}

export async function joinPool(poolCode: string, userAddress: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/gas-pools/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ poolCode, userAddress }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to join pool: ${response.statusText}`);
  }

  return response.json();
}

export async function contributeToPool(data: {
  poolId: string;
  userAddress: string;
  amount: string;
  intentId?: string;
  txHash?: string;
}): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/gas-pools/contribute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to contribute: ${response.statusText}`);
  }

  return response.json();
}

export async function distributeFromPool(data: {
  poolId: string;
  recipientAddress: string;
  amount: string;
  intentId?: string;
  reason?: string;
}): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/gas-pools/distribute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to distribute: ${response.statusText}`);
  }

  return response.json();
}

export async function getPoolActivity(poolId: string, limit: number = 50): Promise<{ activity: any[] }> {
  const response = await fetch(`${API_BASE_URL}/gas-pools/${poolId}/activity?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch pool activity: ${response.statusText}`);
  }
  return response.json();
}

export async function leavePool(poolId: string, userAddress: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/gas-pools/${poolId}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userAddress }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to leave pool: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Liquidity Provider API Functions
// ============================================================================

export interface LiquidityDeposit {
  id: string;
  userAddress: string;
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  amountUsd: string;
  totalEarned: string;
  totalEarnedTokens: string;
  totalUsed: string;
  totalUsedUsd: string;
  status: string;
  isActive: boolean;
  depositedAt: string;
}

export interface LiquidityStats {
  totalDeposited: string;
  totalEarned: string;
  totalUsed: string;
  activeDeposits: number;
  totalEarningsUsd: string;
  averageYield: string;
}

export async function depositLiquidity(data: {
  userAddress: string;
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  amountUsd: string;
  txHash?: string;
}): Promise<LiquidityDeposit> {
  const response = await fetch(`${API_BASE_URL}/liquidity/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to deposit: ${response.statusText}`);
  }

  return response.json();
}

export async function getLiquidityStats(userAddress: string): Promise<LiquidityStats> {
  const response = await fetch(`${API_BASE_URL}/liquidity/stats/${userAddress}`);
  if (!response.ok) {
    throw new Error(`Failed to get stats: ${response.statusText}`);
  }
  return response.json();
}

export async function getUserDeposits(userAddress: string): Promise<{ deposits: LiquidityDeposit[] }> {
  const response = await fetch(`${API_BASE_URL}/liquidity/deposits/${userAddress}`);
  if (!response.ok) {
    throw new Error(`Failed to get deposits: ${response.statusText}`);
  }
  return response.json();
}

export async function getDepositDetails(depositId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/liquidity/deposit/${depositId}`);
  if (!response.ok) {
    throw new Error(`Failed to get deposit details: ${response.statusText}`);
  }
  return response.json();
}

export async function getLiquidityPools(): Promise<{ pools: any[] }> {
  const response = await fetch(`${API_BASE_URL}/liquidity/pools`);
  if (!response.ok) {
    throw new Error(`Failed to get pools: ${response.statusText}`);
  }
  return response.json();
}

export async function withdrawDeposit(depositId: string, userAddress: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/liquidity/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ depositId, userAddress }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Failed to withdraw: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Treasury API Functions
// ============================================================================

export interface TreasuryChain {
  chainId: number;
  name: string;
  nativeSymbol: string;
  nativeTokenUsdPrice: number;
  isSource: boolean;
  isDestination: boolean;
  icon: string;
}

export interface TreasurySupportedToken {
  symbol: string;
  name: string;
  decimals: number;
  usdPrice: number;
}

export interface TreasurySupportedChainsResponse {
  chains: TreasuryChain[];
  supportedTokens: TreasurySupportedToken[];
}

export interface TreasuryEstimateRequest {
  sourceToken: string;
  amount: string;
  destinationChains: number[];
  allocationPercentages: number[];
}

export interface TreasuryEstimate {
  chainId: number;
  chainName: string;
  nativeSymbol: string;
  estimatedAmount: string;
  estimatedAmountFormatted: string;
  usdValue: string;
  exchangeRateUsed: number;
}

export interface TreasuryEstimateResponse {
  sourceToken: string;
  sourceAmount: string;
  totalUsdValue: string;
  estimates: TreasuryEstimate[];
  exchangeRatesVersion: number;
  exchangeRatesTimestamp: string;
}

export interface TreasuryDepositRequest {
  userAddress: string;
  sourceChain: number;
  sourceToken: string;
  amount: string;
  destinationChains: number[];
  allocationPercentages: number[];
  sourceTxHash?: string; // Optional: actual transaction hash from on-chain deposit
}

export interface TreasuryDepositResponse {
  intentId: string;
  status: string;
  message: string;
}

export interface TreasuryIntentDistribution {
  chainId: number;
  chainName: string;
  amount: string;
  amountFormatted: string;
  usdValue: string;
  status: "pending" | "processing" | "confirmed" | "failed";
  txHash?: string;
  confirmations?: number;
  error?: string;
}

export interface TreasuryIntentStatusResponse {
  intentId: string;
  userAddress: string;
  sourceChain: number;
  sourceToken: string;
  sourceAmount: string;
  sourceTxHash?: string | null;
  usdValue: number;
  status: "created" | "validating" | "distributing" | "completed" | "failed";
  distributions: TreasuryIntentDistribution[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TreasuryUserIntent {
  intentId: string;
  sourceChain: number;
  sourceToken: string;
  sourceAmount: string;
  usdValue: number;
  status: string;
  distributionCount: number;
  distributions: Array<{
    chainId: number;
    chainName: string;
    status: string;
    txHash?: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

export interface TreasuryUserHistoryResponse {
  userAddress: string;
  intents: TreasuryUserIntent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface TreasuryBalanceDetail {
  chainId: number;
  chainName: string;
  nativeSymbol: string;
  nativeBalance: string;
  nativeBalanceFormatted: string;
  nativeUsdValue: string;
  tokens: Array<{
    address: string;
    balance: string;
    balanceFormatted: string;
  }>;
}

export interface TreasuryBalancesResponse {
  balances: TreasuryBalanceDetail[];
  totalValueLocked: string;
  timestamp: string;
}

/**
 * Get list of supported chains and tokens for Treasury system
 * Requirements: 10.1
 */
export async function getTreasurySupportedChains(): Promise<TreasurySupportedChainsResponse> {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/api/chains/supported`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      const errorMessage = error.error || `Failed to get supported chains: ${response.statusText}`;
      logError(new Error(errorMessage), { endpoint: "/api/chains/supported" });
      throw new Error(errorMessage);
    }

    return response.json();
  });
}

/**
 * Get gas estimates for Treasury distribution
 * Requirements: 10.2
 */
export async function getTreasuryEstimate(request: TreasuryEstimateRequest): Promise<TreasuryEstimateResponse> {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/api/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      const errorMessage = error.error || `Failed to get estimate: ${response.statusText}`;
      logError(new Error(errorMessage), { endpoint: "/api/estimate", request });
      throw new Error(errorMessage);
    }

    return response.json();
  });
}

/**
 * Submit a Treasury deposit request
 * Requirements: 10.3
 */
export async function submitTreasuryDeposit(request: TreasuryDepositRequest): Promise<TreasuryDepositResponse> {
  // Don't retry deposit submissions to avoid duplicate intents
  const response = await fetch(`${API_BASE_URL}/api/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    const errorMessage = error.error || `Failed to submit deposit: ${response.statusText}`;
    logError(new Error(errorMessage), { endpoint: "/api/deposit", request });
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Get Treasury intent status with transaction hashes
 * Requirements: 10.4
 */
export async function getTreasuryIntentStatus(intentId: string): Promise<TreasuryIntentStatusResponse> {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/api/intent/${intentId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      const errorMessage = error.error || `Failed to get intent status: ${response.statusText}`;
      logError(new Error(errorMessage), { endpoint: `/api/intent/${intentId}` });
      throw new Error(errorMessage);
    }

    return response.json();
  });
}

/**
 * Get user's Treasury intent history
 * Requirements: 10.5
 */
export async function getTreasuryUserHistory(
  userAddress: string,
  page: number = 1,
  limit: number = 20
): Promise<TreasuryUserHistoryResponse> {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/api/user/${userAddress}/intents?page=${page}&limit=${limit}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      const errorMessage = error.error || `Failed to get user history: ${response.statusText}`;
      logError(new Error(errorMessage), { endpoint: `/api/user/${userAddress}/intents`, page, limit });
      throw new Error(errorMessage);
    }

    return response.json();
  });
}

/**
 * Get Treasury balances across all chains
 * Requirements: 7.2, 7.5
 */
export async function getTreasuryBalances(): Promise<TreasuryBalancesResponse> {
  return retryWithBackoff(async () => {
    const response = await fetch(`${API_BASE_URL}/api/treasury/balances`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      const errorMessage = error.error || `Failed to get Treasury balances: ${response.statusText}`;
      logError(new Error(errorMessage), { endpoint: "/api/treasury/balances" });
      throw new Error(errorMessage);
    }

    return response.json();
  });
}
