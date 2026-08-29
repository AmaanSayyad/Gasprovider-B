import { PrismaClient } from "@prisma/client";
import { ethers } from "ethers";

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
  depositedAt: Date;
}

export interface LiquidityStats {
  totalDeposited: string;
  totalEarned: string;
  totalUsed: string;
  activeDeposits: number;
  totalEarningsUsd: string;
  averageYield: string; // Percentage
}

export interface DepositInput {
  userAddress: string;
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  amountUsd: string;
  txHash?: string;
}

export interface UseLiquidityInput {
  chainId: number;
  tokenAddress: string;
  amount: string;
  amountUsd: string;
  recipientAddress: string;
  intentId?: string;
}

// Platform fee configuration
const PLATFORM_FEE_PERCENTAGE = 0.05; // 5% platform fee
const PROVIDER_FEE_PERCENTAGE = 0.03; // 3% provider fee (goes to liquidity providers)
const TOTAL_FEE_PERCENTAGE = PLATFORM_FEE_PERCENTAGE + PROVIDER_FEE_PERCENTAGE; // 8% total

export class LiquidityService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Deposit tokens to liquidity pool
   */
  async deposit(input: DepositInput): Promise<LiquidityDeposit> {
    const normalizedAddress = input.userAddress.toLowerCase();

    // Create or update liquidity pool
    await this.upsertLiquidityPool({
      chainId: input.chainId,
      tokenAddress: input.tokenAddress,
      tokenSymbol: input.tokenSymbol || "NATIVE",
      amount: input.amount,
    });

    // Create deposit record
    const deposit = await this.prisma.liquidityDeposit.create({
      data: {
        userAddress: normalizedAddress,
        chainId: input.chainId,
        tokenAddress: input.tokenAddress,
        tokenSymbol: input.tokenSymbol || "NATIVE",
        amount: input.amount,
        amountUsd: input.amountUsd,
        txHash: input.txHash,
        status: "active",
        isActive: true,
      },
    });

    return deposit;
  }

  /**
   * Use liquidity from pool (when funding user transactions)
   */
  async useLiquidity(input: UseLiquidityInput): Promise<{
    success: boolean;
    depositId?: string;
    platformFee: string;
    providerFee: string;
  }> {
    const amount = parseFloat(input.amountUsd);
    const platformFee = (amount * PLATFORM_FEE_PERCENTAGE).toFixed(2);
    const providerFee = (amount * PROVIDER_FEE_PERCENTAGE).toFixed(2);

    // Find available deposits for this chain/token
    const availableDeposits = await this.prisma.liquidityDeposit.findMany({
      where: {
        chainId: input.chainId,
        tokenAddress: input.tokenAddress,
        isActive: true,
        status: "active",
      },
      orderBy: { depositedAt: "asc" }, // FIFO - use oldest first
    });

    if (availableDeposits.length === 0) {
      throw new Error("No liquidity available for this chain/token");
    }

    let remainingAmount = parseFloat(input.amount);
    let remainingAmountUsd = parseFloat(input.amountUsd);
    let usedDepositId: string | undefined;

    // Use from deposits (FIFO)
    for (const deposit of availableDeposits) {
      if (remainingAmountUsd <= 0) break;

      const depositAvailable = parseFloat(deposit.amount) - parseFloat(deposit.totalUsed);
      const depositAvailableUsd = parseFloat(deposit.amountUsd) - parseFloat(deposit.totalUsedUsd);

      if (depositAvailableUsd <= 0) continue;

      const useAmount = Math.min(remainingAmount, depositAvailable);
      const useAmountUsd = Math.min(remainingAmountUsd, depositAvailableUsd);

      // Calculate fees for this deposit's portion
      const depositProviderFee = (useAmountUsd * PROVIDER_FEE_PERCENTAGE).toFixed(2);
      const depositPlatformFee = (useAmountUsd * PLATFORM_FEE_PERCENTAGE).toFixed(2);

      // Record usage
      await this.prisma.liquidityUsage.create({
        data: {
          depositId: deposit.id,
          intentId: input.intentId,
          recipientAddress: input.recipientAddress.toLowerCase(),
          amount: useAmount.toFixed(6),
          amountUsd: useAmountUsd.toFixed(2),
          platformFee: depositPlatformFee,
          providerFee: depositProviderFee,
          feePercentage: (TOTAL_FEE_PERCENTAGE * 100).toFixed(2),
        },
      });

      // Update deposit
      const newTotalUsed = (parseFloat(deposit.totalUsed) + useAmount).toFixed(6);
      const newTotalUsedUsd = (parseFloat(deposit.totalUsedUsd) + useAmountUsd).toFixed(2);
      const newTotalEarned = (parseFloat(deposit.totalEarned) + parseFloat(depositProviderFee)).toFixed(2);
      
      // Calculate token earnings (approximate)
      const tokenPrice = parseFloat(deposit.amountUsd) / parseFloat(deposit.amount);
      const earnedTokens = (parseFloat(depositProviderFee) / tokenPrice).toFixed(6);
      const newTotalEarnedTokens = (parseFloat(deposit.totalEarnedTokens) + parseFloat(earnedTokens)).toFixed(6);

      await this.prisma.liquidityDeposit.update({
        where: { id: deposit.id },
        data: {
          totalUsed: newTotalUsed,
          totalUsedUsd: newTotalUsedUsd,
          totalEarned: newTotalEarned,
          totalEarnedTokens: newTotalEarnedTokens,
          status: parseFloat(newTotalUsed) >= parseFloat(deposit.amount) * 0.99 ? "depleted" : "active",
        },
      });

      // Record earnings
      await this.prisma.liquidityEarning.create({
        data: {
          depositId: deposit.id,
          amount: depositProviderFee,
          amountTokens: earnedTokens,
          feeType: "provider_fee",
        },
      });

      remainingAmount -= useAmount;
      remainingAmountUsd -= useAmountUsd;
      usedDepositId = deposit.id;

      // Update liquidity pool
      await this.updateLiquidityPool({
        chainId: input.chainId,
        tokenAddress: input.tokenAddress,
        amountUsed: useAmountUsd.toFixed(2),
      });
    }

    if (remainingAmountUsd > 0.01) {
      throw new Error(`Insufficient liquidity. Remaining: $${remainingAmountUsd.toFixed(2)}`);
    }

    return {
      success: true,
      depositId: usedDepositId,
      platformFee,
      providerFee,
    };
  }

  /**
   * Get user's liquidity stats
   */
  async getUserStats(userAddress: string): Promise<LiquidityStats> {
    const normalizedAddress = userAddress.toLowerCase();

    const deposits = await this.prisma.liquidityDeposit.findMany({
      where: { userAddress: normalizedAddress },
    });

    const totalDeposited = deposits.reduce((sum, d) => sum + parseFloat(d.amountUsd), 0).toFixed(2);
    const totalEarned = deposits.reduce((sum, d) => sum + parseFloat(d.totalEarned), 0).toFixed(2);
    const totalUsed = deposits.reduce((sum, d) => sum + parseFloat(d.totalUsedUsd), 0).toFixed(2);
    const activeDeposits = deposits.filter((d) => d.isActive && d.status === "active").length;

    // Calculate average yield
    const totalDepositedNum = parseFloat(totalDeposited);
    const averageYield = totalDepositedNum > 0
      ? ((parseFloat(totalEarned) / totalDepositedNum) * 100).toFixed(2)
      : "0.00";

    return {
      totalDeposited,
      totalEarned,
      totalUsed,
      activeDeposits,
      totalEarningsUsd: totalEarned,
      averageYield,
    };
  }

  /**
   * Get user's deposits
   */
  async getUserDeposits(userAddress: string): Promise<LiquidityDeposit[]> {
    const normalizedAddress = userAddress.toLowerCase();
    return await this.prisma.liquidityDeposit.findMany({
      where: { userAddress: normalizedAddress },
      orderBy: { depositedAt: "desc" },
    });
  }

  /**
   * Get deposit details with earnings
   */
  async getDepositDetails(depositId: string): Promise<any> {
    const deposit = await this.prisma.liquidityDeposit.findUnique({
      where: { id: depositId },
      include: {
        usages: {
          orderBy: { usedAt: "desc" },
          take: 50,
        },
        earnings: {
          orderBy: { earnedAt: "desc" },
          take: 50,
        },
      },
    });

    if (!deposit) return null;

    const available = (parseFloat(deposit.amount) - parseFloat(deposit.totalUsed)).toFixed(6);
    const availableUsd = (parseFloat(deposit.amountUsd) - parseFloat(deposit.totalUsedUsd)).toFixed(2);
    const utilizationRate = parseFloat(deposit.amountUsd) > 0
      ? ((parseFloat(deposit.totalUsedUsd) / parseFloat(deposit.amountUsd)) * 100).toFixed(2)
      : "0.00";
    const yieldRate = parseFloat(deposit.amountUsd) > 0
      ? ((parseFloat(deposit.totalEarned) / parseFloat(deposit.amountUsd)) * 100).toFixed(2)
      : "0.00";

    return {
      ...deposit,
      available,
      availableUsd,
      utilizationRate,
      yieldRate,
    };
  }

  /**
   * Get liquidity pools (available liquidity per chain/token)
   */
  async getLiquidityPools(): Promise<any[]> {
    return await this.prisma.liquidityPool.findMany({
      orderBy: { totalAvailable: "desc" },
    });
  }

  /**
   * Get pool liquidity for a specific chain/token
   */
  async getPoolLiquidity(chainId: number, tokenAddress: string): Promise<any | null> {
    return await this.prisma.liquidityPool.findFirst({
      where: {
        chainId,
        tokenAddress,
      },
    });
  }

  /**
   * Upsert liquidity pool
   */
  private async upsertLiquidityPool(data: {
    chainId: number;
    tokenAddress: string;
    tokenSymbol: string;
    amount: string;
  }): Promise<void> {
    const pool = await this.prisma.liquidityPool.findUnique({
      where: { chainId: data.chainId },
    });

    const amountUsd = parseFloat(data.amount); // Simplified - should use price feed

    if (pool) {
      const newTotalDeposited = (parseFloat(pool.totalDeposited) + amountUsd).toFixed(2);
      const newTotalAvailable = (parseFloat(pool.totalAvailable) + amountUsd).toFixed(2);
      const newProviderCount = pool.providerCount + 1;

      await this.prisma.liquidityPool.update({
        where: { id: pool.id },
        data: {
          totalDeposited: newTotalDeposited,
          totalAvailable: newTotalAvailable,
          providerCount: newProviderCount,
        },
      });
    } else {
      await this.prisma.liquidityPool.create({
        data: {
          chainId: data.chainId,
          tokenAddress: data.tokenAddress,
          tokenSymbol: data.tokenSymbol,
          totalDeposited: amountUsd.toFixed(2),
          totalAvailable: amountUsd.toFixed(2),
          providerCount: 1,
        },
      });
    }
  }

  /**
   * Update liquidity pool after usage
   */
  private async updateLiquidityPool(data: {
    chainId: number;
    tokenAddress: string;
    amountUsed: string;
  }): Promise<void> {
    const pool = await this.prisma.liquidityPool.findFirst({
      where: {
        chainId: data.chainId,
        tokenAddress: data.tokenAddress,
      },
    });

    if (pool) {
      const newTotalUsed = (parseFloat(pool.totalUsed) + parseFloat(data.amountUsed)).toFixed(2);
      const newTotalAvailable = Math.max(0, parseFloat(pool.totalAvailable) - parseFloat(data.amountUsed)).toFixed(2);

      await this.prisma.liquidityPool.update({
        where: { id: pool.id },
        data: {
          totalUsed: newTotalUsed,
          totalAvailable: newTotalAvailable,
        },
      });
    }
  }

  /**
   * Withdraw deposit (mark as withdrawn)
   */
  async withdrawDeposit(depositId: string, userAddress: string): Promise<void> {
    const normalizedAddress = userAddress.toLowerCase();

    const deposit = await this.prisma.liquidityDeposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new Error("Deposit not found");
    }

    if (deposit.userAddress.toLowerCase() !== normalizedAddress) {
      throw new Error("Unauthorized");
    }

    if (deposit.status === "withdrawn") {
      throw new Error("Deposit already withdrawn");
    }

    await this.prisma.liquidityDeposit.update({
      where: { id: depositId },
      data: {
        status: "withdrawn",
        isActive: false,
        withdrawnAt: new Date(),
      },
    });
  }
}

