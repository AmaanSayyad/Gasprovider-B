import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

export interface ReferralStats {
  totalReferrals: number;
  totalRewards: string;
  activeReferrals: number;
  referralCode: string;
  referralLink: string;
}

export interface ReferralLeaderboardEntry {
  userAddress: string;
  totalReferrals: number;
  totalRewards: string;
  rank: number;
}

export class ReferralService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a unique referral code for a user
   */
  private generateReferralCode(userAddress: string): string {
    // Use first 6 chars of address + random 4 chars
    const addressPart = userAddress.slice(2, 8).toUpperCase();
    const randomPart = randomBytes(2).toString("hex").toUpperCase();
    return `${addressPart}-${randomPart}`;
  }

  /**
   * Get or create a referral for a user
   */
  async getOrCreateReferral(userAddress: string, baseUrl?: string): Promise<ReferralStats> {
    const normalizedAddress = userAddress.toLowerCase();

    let referral = await this.prisma.referral.findFirst({
      where: { referrerAddress: normalizedAddress },
    });

    if (!referral) {
      let referralCode = this.generateReferralCode(normalizedAddress);
      
      // Ensure uniqueness
      let exists = await this.prisma.referral.findUnique({
        where: { referralCode },
      });
      
      while (exists) {
        referralCode = this.generateReferralCode(normalizedAddress);
        exists = await this.prisma.referral.findUnique({
          where: { referralCode },
        });
      }

      const referralLink = baseUrl
        ? `${baseUrl}?ref=${referralCode}`
        : `?ref=${referralCode}`;

      referral = await this.prisma.referral.create({
        data: {
          referrerAddress: normalizedAddress,
          referralCode,
          referralLink,
        },
      });
    } else {
      // Always update the referral link with the current baseUrl to ensure it's correct
      if (baseUrl) {
        const updatedLink = `${baseUrl}?ref=${referral.referralCode}`;
        if (referral.referralLink !== updatedLink) {
          referral = await this.prisma.referral.update({
            where: { id: referral.id },
            data: { referralLink: updatedLink },
          });
        }
      }
    }

    return {
      totalReferrals: referral.totalReferrals,
      totalRewards: referral.totalRewards,
      activeReferrals: await this.prisma.referralUsage.count({
        where: {
          referralId: referral.id,
          rewardStatus: "paid",
        },
      }),
      referralCode: referral.referralCode,
      referralLink: referral.referralLink,
    };
  }

  /**
   * Record a referral usage
   */
  async recordReferral(
    referralCode: string,
    referredAddress: string,
    intentId?: string
  ): Promise<{ success: boolean; rewardAmount?: string }> {
    const normalizedReferred = referredAddress.toLowerCase();

    // Find the referral
    const referral = await this.prisma.referral.findUnique({
      where: { referralCode },
    });

    if (!referral) {
      return { success: false };
    }

    // Don't allow self-referrals
    if (referral.referrerAddress.toLowerCase() === normalizedReferred) {
      return { success: false };
    }

    // Check if this address already used this referral
    const existing = await this.prisma.referralUsage.findFirst({
      where: {
        referralId: referral.id,
        referredAddress: normalizedReferred,
      },
    });

    if (existing) {
      return { success: false };
    }

    // Calculate reward (e.g., 5% of first deposit, or fixed amount)
    const rewardAmount = "5.00"; // $5 reward for referrer

    // Create referral usage record
    await this.prisma.referralUsage.create({
      data: {
        referralId: referral.id,
        referredAddress: normalizedReferred,
        rewardAmount,
        rewardStatus: "pending",
        intentId,
      },
    });

    // Update referral stats
    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        totalReferrals: { increment: 1 },
        totalRewards: (
          parseFloat(referral.totalRewards) + parseFloat(rewardAmount)
        ).toFixed(2),
      },
    });

    return { success: true, rewardAmount };
  }

  /**
   * Get referral leaderboard
   */
  async getLeaderboard(limit: number = 100): Promise<ReferralLeaderboardEntry[]> {
    const referrals = await this.prisma.referral.findMany({
      where: { isActive: true },
      orderBy: { totalReferrals: "desc" },
      take: limit,
    });

    const leaderboard: ReferralLeaderboardEntry[] = [];
    
    for (let i = 0; i < referrals.length; i++) {
      leaderboard.push({
        userAddress: referrals[i].referrerAddress,
        totalReferrals: referrals[i].totalReferrals,
        totalRewards: referrals[i].totalRewards,
        rank: i + 1,
      });
    }

    return leaderboard;
  }

  /**
   * Get user's referral stats
   */
  async getUserStats(userAddress: string): Promise<ReferralStats | null> {
    const normalizedAddress = userAddress.toLowerCase();
    const referral = await this.prisma.referral.findFirst({
      where: { referrerAddress: normalizedAddress },
      include: {
        referrals: {
          where: { rewardStatus: "paid" },
        },
      },
    });

    if (!referral) {
      return null;
    }

    return {
      totalReferrals: referral.totalReferrals,
      totalRewards: referral.totalRewards,
      activeReferrals: referral.referrals.length,
      referralCode: referral.referralCode,
      referralLink: referral.referralLink,
    };
  }

  /**
   * Process referral rewards (called when referred user completes deposit)
   */
  async processReward(referralUsageId: string, txHash: string): Promise<void> {
    await this.prisma.referralUsage.update({
      where: { id: referralUsageId },
      data: {
        rewardStatus: "paid",
        rewardTxHash: txHash,
        rewardedAt: new Date(),
      },
    });
  }
}

