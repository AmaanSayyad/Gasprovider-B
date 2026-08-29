/**
 * Types for Smart Account functionality
 */

/**
 * Call structure for multi-call transactions
 */
export interface Call {
  to: string;
  value: bigint;
  data: string;
}

/**
 * Gasless transaction structure
 */
export interface GaslessTransaction {
  smartAccountAddress: string;
  calls: Call[];
  nonce: number;
  signature: string;
}

/**
 * Smart Account record stored in database
 */
export interface SmartAccountRecord {
  id: string; // UUID
  eoaAddress: string; // Owner EOA
  smartAccountAddress: string;
  chainId: number;
  deploymentTxHash: string;
  createdAt: Date;
  lastUsedAt: Date;
}

/**
 * Smart Account deployment result
 */
export interface SmartAccountDeployment {
  smartAccountAddress: string;
  deploymentTxHash: string;
  eoaAddress: string;
  chainId: number;
}
