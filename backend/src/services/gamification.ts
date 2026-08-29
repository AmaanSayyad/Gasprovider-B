import { PrismaClient } from "@prisma/client";

export interface AchievementProgress {
  achievementId: string;
  progress: any;
  isCompleted: boolean;
  pointsEarned: number;
}

export interface UserStats {
  totalPoints: number;
  totalAchievements: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  rank: number;
}

export interface LeaderboardEntry {
  userAddress: string;
  score: string;
  rank: number;
  metadata?: any;
}

export class GamificationService {
  constructor(public prisma: PrismaClient) {}

  /**
   * Initialize default achievements
   */
  async initializeAchievements(): Promise<void> {
    const defaultAchievements = [
      {
        name: "First Dispersal",
        description: "Complete your first gas dispersal",
        category: "dispersal",
        points: 10,
        requirementType: "count",
        requirementValue: { type: "dispersal_count", value: 1 },
      },
      {
        name: "Multi-Chain Master",
        description: "Disperse gas to 5 different chains",
        category: "dispersal",
        points: 50,
        requirementType: "count",
        requirementValue: { type: "unique_chains", value: 5 },
      },
      {
        name: "Volume King",
        description: "Disperse $1000 worth of gas",
        category: "volume",
        points: 100,
        requirementType: "amount",
        requirementValue: { type: "total_volume", value: 1000 },
      },
      {
        name: "Week Warrior",
        description: "Maintain a 7-day streak",
        category: "streak",
        points: 75,
        requirementType: "streak",
        requirementValue: { type: "days", value: 7 },
      },
      {
        name: "Social Butterfly",
        description: "Refer 10 users",
        category: "social",
        points: 150,
        requirementType: "count",
        requirementValue: { type: "referrals", value: 10 },
      },
    ];

    for (const achievement of defaultAchievements) {
      await this.prisma.achievement.upsert({
        where: { name: achievement.name },
        update: {},
        create: achievement,
      });
    }
  }

  /**
   * Update user achievement progress
   */
  async updateAchievementProgress(
    userAddress: string,
    achievementId: string,
    progress: any
  ): Promise<AchievementProgress | null> {
    const normalizedAddress = userAddress.toLowerCase();
    
    const achievement = await this.prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      return null;
    }

    const userAchievement = await this.prisma.userAchievement.upsert({
      where: {
        userAddress_achievementId: {
          userAddress: normalizedAddress,
          achievementId,
        },
      },
      update: {
        progress,
      },
      create: {
        userAddress: normalizedAddress,
        achievementId,
        progress,
      },
    });

    // Check if achievement is completed
    const isCompleted = this.checkAchievementCompletion(
      achievement,
      progress
    );

    if (isCompleted && !userAchievement.isCompleted) {
      await this.prisma.userAchievement.update({
        where: { id: userAchievement.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          pointsEarned: achievement.points,
        },
      });

      // Award badge if linked
      if (achievement.badgeId) {
        await this.awardBadge(normalizedAddress, achievement.badgeId);
      }
    }

    return {
      achievementId,
      progress: userAchievement.progress as any,
      isCompleted: userAchievement.isCompleted,
      pointsEarned: userAchievement.pointsEarned,
    };
  }

  /**
   * Check if achievement requirements are met
   */
  private checkAchievementCompletion(achievement: any, progress: any): boolean {
    if (!achievement.requirementValue) return false;

    const req = achievement.requirementValue as any;
    const prog = progress as any;

    switch (achievement.requirementType) {
      case "count":
        return (prog.count || 0) >= (req.value || 0);
      case "amount":
        return parseFloat(prog.amount || "0") >= parseFloat(req.value || "0");
      case "streak":
        return (prog.days || 0) >= (req.value || 0);
      default:
        return false;
    }
  }

  /**
   * Award a badge to a user
   */
  async awardBadge(userAddress: string, badgeId: string): Promise<void> {
    const normalizedAddress = userAddress.toLowerCase();

    await this.prisma.userBadge.upsert({
      where: {
        userAddress_badgeId: {
          userAddress: normalizedAddress,
          badgeId,
        },
      },
      update: {},
      create: {
        userAddress: normalizedAddress,
        badgeId,
      },
    });
  }

  /**
   * Update user streak
   */
  async updateStreak(
    userAddress: string,
    streakType: string = "dispersal"
  ): Promise<{ currentStreak: number; longestStreak: number }> {
    const normalizedAddress = userAddress.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = await this.prisma.userStreak.findUnique({
      where: { userAddress: normalizedAddress },
    });

    if (!streak) {
      streak = await this.prisma.userStreak.create({
        data: {
          userAddress: normalizedAddress,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: today,
          streakType,
        },
      });
      return {
        currentStreak: 1,
        longestStreak: 1,
      };
    }

    const lastActivity = streak.lastActivityDate
      ? new Date(streak.lastActivityDate)
      : null;
    
    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
    }

    const daysDiff = lastActivity
      ? Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let newStreak = streak.currentStreak;
    let newLongest = streak.longestStreak;

    if (daysDiff === 0) {
      // Already updated today
      return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      };
    } else if (daysDiff === 1) {
      // Consecutive day
      newStreak = streak.currentStreak + 1;
      newLongest = Math.max(newStreak, streak.longestStreak);
    } else {
      // Streak broken, reset to 1
      newStreak = 1;
    }

    const updated = await this.prisma.userStreak.update({
      where: { userAddress: normalizedAddress },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActivityDate: today,
      },
    });

    return {
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
    };
  }

  /**
   * Record a milestone
   */
  async recordMilestone(
    userAddress: string,
    milestoneType: string,
    milestoneValue: string,
    rewardAmount?: string
  ): Promise<void> {
    const normalizedAddress = userAddress.toLowerCase();

    await this.prisma.milestone.create({
      data: {
        userAddress: normalizedAddress,
        milestoneType,
        milestoneValue,
        rewardAmount,
        rewardStatus: rewardAmount ? "pending" : "none",
      },
    });
  }

  /**
   * Get user stats
   */
  async getUserStats(userAddress: string): Promise<UserStats> {
    const normalizedAddress = userAddress.toLowerCase();

    const [achievements, badges, streak, points] = await Promise.all([
      this.prisma.userAchievement.findMany({
        where: {
          userAddress: normalizedAddress,
          isCompleted: true,
        },
      }),
      this.prisma.userBadge.findMany({
        where: { userAddress: normalizedAddress },
      }),
      this.prisma.userStreak.findUnique({
        where: { userAddress: normalizedAddress },
      }),
      this.prisma.userAchievement.aggregate({
        where: { userAddress: normalizedAddress, isCompleted: true },
        _sum: { pointsEarned: true },
      }),
    ]);

    // Calculate rank (simplified - would need proper leaderboard calculation)
    const rank = 1; // TODO: Calculate actual rank

    return {
      totalPoints: points._sum.pointsEarned || 0,
      totalAchievements: achievements.length,
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      badges: badges.map((b) => b.badgeId).filter(Boolean),
      rank,
    };
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    category: string,
    period: string = "all_time",
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    const entries = await this.prisma.leaderboard.findMany({
      where: {
        category,
        period,
      },
      orderBy: { score: "desc" },
      take: limit,
    });

    return entries.map((entry, index) => ({
      userAddress: entry.userAddress,
      score: entry.score,
      rank: entry.rank || index + 1,
    }));
  }

  /**
   * Update leaderboard entry
   */
  async updateLeaderboard(
    userAddress: string,
    category: string,
    score: string,
    period: string = "all_time"
  ): Promise<void> {
    const normalizedAddress = userAddress.toLowerCase();

    // Calculate period dates
    const now = new Date();
    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;

    if (period === "daily") {
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (period === "weekly") {
      const dayOfWeek = now.getDay();
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - dayOfWeek);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else if (period === "monthly") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    await this.prisma.leaderboard.upsert({
      where: {
        userAddress_category_period_periodStart: {
          userAddress: normalizedAddress,
          category,
          period,
          periodStart: periodStart || now,
        },
      },
      update: {
        score,
        periodEnd,
      },
      create: {
        userAddress: normalizedAddress,
        category,
        score,
        period,
        periodStart: periodStart || now,
        periodEnd,
      },
    });

    // Recalculate ranks
    await this.recalculateRanks(category, period);
  }

  /**
   * Recalculate ranks for a leaderboard
   */
  private async recalculateRanks(category: string, period: string): Promise<void> {
    const entries = await this.prisma.leaderboard.findMany({
      where: { category, period },
      orderBy: { score: "desc" },
    });

    for (let i = 0; i < entries.length; i++) {
      await this.prisma.leaderboard.update({
        where: { id: entries[i].id },
        data: { rank: i + 1 },
      });
    }
  }
}

