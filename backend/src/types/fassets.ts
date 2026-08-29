/**
 * FAssets type definitions
 */

export type AssetType = "BTC" | "DOGE" | "XRP" | "LTC";

export interface Agent {
  address: string;
  collateralRatio: number;
  mintingFee: number;
  availableLots: number;
  status: "active" | "full" | "liquidating";
}

export interface Reservation {
  reservationId: string;
  agentAddress: string;
  lots: number;
  paymentAddress: string;
  paymentReference: string;
  expiresAt: number;
}

export interface RedemptionTicket {
  ticketId: string;
  amount: bigint;
  underlyingAddress: string;
  estimatedTime: number;
}

export interface FAssetConfig {
  address: string;
  assetType: AssetType;
  symbol: string;
  underlyingSymbol: string;
  ftsoFeedId: string;
  assetManagerAddress: string;
}
