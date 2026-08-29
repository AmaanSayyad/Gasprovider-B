/**
 * Types for Relayer Service functionality
 */

import { GaslessTransaction } from "./smartaccount";

/**
 * Transaction validation result
 */
export interface TransactionValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Transaction submission result
 */
export interface TransactionSubmissionResult {
  txHash: string;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
}

/**
 * Transaction tracking status
 */
export interface TransactionStatus {
  txHash: string;
  status: "pending" | "confirmed" | "failed";
  confirmations: number;
  blockNumber?: number;
  gasUsed?: bigint;
  error?: string;
}

/**
 * Relayer balance info
 */
export interface RelayerBalanceInfo {
  address: string;
  balance: bigint;
  balanceFormatted: string;
  chainId: number;
  belowThreshold: boolean;
  threshold: bigint;
}
