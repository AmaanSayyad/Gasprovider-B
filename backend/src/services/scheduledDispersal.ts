import { PrismaClient } from "@prisma/client";
import { DestinationAllocation } from "../types";
import { DispersalService } from "./dispersal";
import { BlockchainService } from "./blockchain";
import { ethers } from "ethers";

export interface ScheduledDispersalConfig {
  userAddress: string;
  name?: string;
  sourceChainId: number;
  tokenAddress: string;
  tokenSymbol?: string;
  amountInUsd: string;
  allocations: DestinationAllocation[];
  scheduleType: "one_time" | "recurring" | "auto_balance";
  scheduledAt?: Date;
  recurrencePattern?: string; // 'daily' | 'weekly' | 'monthly' | cron
  timezone?: string;
  autoDisperseEnabled?: boolean;
  monitorChainId?: number;
  balanceThreshold?: string;
  checkInterval?: number;
}

export interface ScheduledDispersal {
  id: string;
  userAddress: string;
  name?: string;
  sourceChainId: number;
  tokenAddress: string;
  tokenSymbol?: string;
  amountInUsd: string;
  allocations: DestinationAllocation[];
  scheduleType: string;
  scheduledAt?: Date;
  recurrencePattern?: string;
  timezone: string;
  autoDisperseEnabled: boolean;
  monitorChainId?: number;
  balanceThreshold?: string;
  checkInterval?: number;
  status: string;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  executionCount: number;
  lastIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ScheduledDispersalService {
  constructor(
    private prisma: PrismaClient,
    private dispersalService: DispersalService,
    private blockchainService: BlockchainService
  ) {}

  /**
   * Create a new scheduled dispersal
   */
  async createSchedule(config: ScheduledDispersalConfig): Promise<ScheduledDispersal> {
    // Calculate next execution time
    const nextExecutionAt = this.calculateNextExecution(config);

    const schedule = await this.prisma.scheduledDispersal.create({
      data: {
        userAddress: config.userAddress,
        name: config.name,
        sourceChainId: config.sourceChainId,
        tokenAddress: config.tokenAddress,
        tokenSymbol: config.tokenSymbol,
        amountInUsd: config.amountInUsd,
        allocations: config.allocations as any,
        scheduleType: config.scheduleType,
        scheduledAt: config.scheduledAt,
        recurrencePattern: config.recurrencePattern,
        timezone: config.timezone || "UTC",
        autoDisperseEnabled: config.autoDisperseEnabled || false,
        monitorChainId: config.monitorChainId,
        balanceThreshold: config.balanceThreshold,
        checkInterval: config.checkInterval || 60,
        status: "active",
        nextExecutionAt,
      },
    });

    return this.prismaToScheduledDispersal(schedule);
  }

  /**
   * Calculate next execution time based on schedule type
   */
  private calculateNextExecution(config: ScheduledDispersalConfig): Date | null {
    if (config.scheduleType === "one_time") {
      return config.scheduledAt || null;
    }

    if (config.scheduleType === "recurring") {
      const now = new Date();
      const pattern = config.recurrencePattern || "daily";

      switch (pattern) {
        case "daily":
          return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case "weekly":
          return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case "monthly":
          const nextMonth = new Date(now);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          return nextMonth;
        default:
          // Try to parse as cron or return daily
          return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    // For auto_balance, check immediately
    if (config.scheduleType === "auto_balance") {
      return new Date();
    }

    return null;
  }

  /**
   * Get all active schedules for a user
   */
  async getUserSchedules(userAddress: string): Promise<ScheduledDispersal[]> {
    const schedules = await this.prisma.scheduledDispersal.findMany({
      where: {
        userAddress: userAddress.toLowerCase(),
        status: {
          in: ["active", "paused"],
        },
      },
      orderBy: {
        nextExecutionAt: "asc",
      },
    });

    return schedules.map((s) => this.prismaToScheduledDispersal(s));
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: string): Promise<ScheduledDispersal | null> {
    const schedule = await this.prisma.scheduledDispersal.findUnique({
      where: { id },
    });

    return schedule ? this.prismaToScheduledDispersal(schedule) : null;
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    id: string,
    updates: Partial<ScheduledDispersalConfig>
  ): Promise<ScheduledDispersal> {
    const existing = await this.prisma.scheduledDispersal.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Schedule not found: ${id}`);
    }

    // Recalculate next execution if schedule changed
    const config: ScheduledDispersalConfig = {
      ...existing,
      ...updates,
      scheduleType: (updates.scheduleType || existing.scheduleType) as any,
    };
    const nextExecutionAt = this.calculateNextExecution(config);

    const updated = await this.prisma.scheduledDispersal.update({
      where: { id },
      data: {
        ...updates,
        nextExecutionAt,
        updatedAt: new Date(),
      },
    });

    return this.prismaToScheduledDispersal(updated);
  }

  /**
   * Pause a schedule
   */
  async pauseSchedule(id: string): Promise<ScheduledDispersal> {
    const updated = await this.prisma.scheduledDispersal.update({
      where: { id },
      data: {
        status: "paused",
        pausedAt: new Date(),
      },
    });

    return this.prismaToScheduledDispersal(updated);
  }

  /**
   * Resume a paused schedule
   */
  async resumeSchedule(id: string): Promise<ScheduledDispersal> {
    const schedule = await this.prisma.scheduledDispersal.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new Error(`Schedule not found: ${id}`);
    }

    const nextExecutionAt = this.calculateNextExecution({
      scheduleType: schedule.scheduleType as any,
      scheduledAt: schedule.scheduledAt || undefined,
      recurrencePattern: schedule.recurrencePattern || undefined,
    });

    const updated = await this.prisma.scheduledDispersal.update({
      where: { id },
      data: {
        status: "active",
        pausedAt: null,
        nextExecutionAt,
      },
    });

    return this.prismaToScheduledDispersal(updated);
  }

  /**
   * Cancel a schedule
   */
  async cancelSchedule(id: string): Promise<ScheduledDispersal> {
    const updated = await this.prisma.scheduledDispersal.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    });

    return this.prismaToScheduledDispersal(updated);
  }

  /**
   * Get schedules ready for execution
   */
  async getSchedulesReadyForExecution(): Promise<ScheduledDispersal[]> {
    const now = new Date();

    // Get time-based schedules ready for execution
    const timeBasedSchedules = await this.prisma.scheduledDispersal.findMany({
      where: {
        status: "active",
        scheduleType: {
          in: ["one_time", "recurring"],
        },
        nextExecutionAt: {
          lte: now,
        },
      },
    });

    // Get auto-balance schedules that need checking
    const autoBalanceSchedules = await this.prisma.scheduledDispersal.findMany({
      where: {
        status: "active",
        scheduleType: "auto_balance",
        autoDisperseEnabled: true,
      },
    });

    // Filter auto-balance schedules by check interval
    const readyAutoBalance = [];
    for (const schedule of autoBalanceSchedules) {
      const checkInterval = schedule.checkInterval || 60;
      const lastCheck = schedule.lastExecutedAt || schedule.createdAt;
      const nextCheckTime = new Date(
        lastCheck.getTime() + checkInterval * 60 * 1000
      );

      if (now >= nextCheckTime) {
        readyAutoBalance.push(schedule);
      }
    }

    const allSchedules = [...timeBasedSchedules, ...readyAutoBalance];

    return allSchedules.map((s) => this.prismaToScheduledDispersal(s));
  }

  /**
   * Execute a scheduled dispersal
   */
  async executeSchedule(scheduleId: string): Promise<string | null> {
    const schedule = await this.prisma.scheduledDispersal.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || schedule.status !== "active") {
      throw new Error(`Schedule not found or not active: ${scheduleId}`);
    }

    // For auto-balance schedules, check if balance threshold is met
    if (schedule.scheduleType === "auto_balance" && schedule.autoDisperseEnabled) {
      const shouldExecute = await this.checkBalanceThreshold(schedule);
      if (!shouldExecute) {
        // Update last checked time but don't execute
        await this.prisma.scheduledDispersal.update({
          where: { id: scheduleId },
          data: {
            updatedAt: new Date(),
          },
        });
        return null;
      }
    }

    try {
      // Create a deposit event payload from the schedule
      const depositEvent = this.scheduleToDepositEvent(schedule);

      // Check user balance before executing
      const hasBalance = await this.checkUserBalance(
        schedule.userAddress,
        schedule.sourceChainId,
        schedule.tokenAddress,
        schedule.amountInUsd
      );

      if (!hasBalance) {
        console.log(`Insufficient balance for schedule ${scheduleId}`);
        // Update next execution time for retry
        const nextCheck = new Date(
          Date.now() + (schedule.checkInterval || 60) * 60 * 1000
        );
        await this.prisma.scheduledDispersal.update({
          where: { id: scheduleId },
          data: {
            nextExecutionAt: nextCheck,
            updatedAt: new Date(),
          },
        });
        return null;
      }

      // Execute the dispersal (this would need to be integrated with the deposit flow)
      // For now, we'll simulate by creating an intent
      // In production, this would trigger the actual deposit transaction

      // Update schedule with execution info
      const nextExecutionAt = this.calculateNextExecution({
        scheduleType: schedule.scheduleType as any,
        scheduledAt: schedule.scheduledAt || undefined,
        recurrencePattern: schedule.recurrencePattern || undefined,
      });

      await this.prisma.scheduledDispersal.update({
        where: { id: scheduleId },
        data: {
          lastExecutedAt: new Date(),
          nextExecutionAt,
          executionCount: schedule.executionCount + 1,
          updatedAt: new Date(),
        },
      });

      // Return a placeholder intent ID (in production, this would be the actual intent ID)
      return `scheduled-${scheduleId}-${Date.now()}`;
    } catch (error: any) {
      console.error(`Error executing schedule ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Check if balance threshold is met for auto-disperse
   */
  private async checkBalanceThreshold(
    schedule: any
  ): Promise<boolean> {
    if (!schedule.monitorChainId || !schedule.balanceThreshold) {
      return false;
    }

    try {
      const provider = this.blockchainService.getProvider(schedule.monitorChainId);
      const balance = await provider.getBalance(schedule.userAddress);
      const threshold = ethers.parseEther(schedule.balanceThreshold);

      return balance < threshold;
    } catch (error) {
      console.error(`Error checking balance threshold:`, error);
      return false;
    }
  }

  /**
   * Check if user has sufficient balance
   */
  private async checkUserBalance(
    userAddress: string,
    chainId: number,
    tokenAddress: string,
    amountUsd: string
  ): Promise<boolean> {
    try {
      // This is a simplified check - in production, you'd check token balance
      // For now, we'll assume balance is sufficient if we can't check
      return true;
    } catch (error) {
      console.error(`Error checking user balance:`, error);
      return false;
    }
  }

  /**
   * Convert schedule to deposit event payload
   */
  private scheduleToDepositEvent(schedule: any): any {
    return {
      chainId: schedule.sourceChainId,
      txHash: `0x${"0".repeat(64)}`, // Placeholder - will be set when actual transaction happens
      logIndex: 0,
      blockNumber: 0,
      eventName: "Deposited",
      data: {
        user: schedule.userAddress,
        token: schedule.tokenAddress,
        amountTokenRaw: "0", // Would need to convert from USD
        amountUsd: schedule.amountInUsd,
        allocations: schedule.allocations,
      },
    };
  }


  /**
   * Convert Prisma model to ScheduledDispersal
   */
  private prismaToScheduledDispersal(schedule: any): ScheduledDispersal {
    return {
      id: schedule.id,
      userAddress: schedule.userAddress,
      name: schedule.name || undefined,
      sourceChainId: schedule.sourceChainId,
      tokenAddress: schedule.tokenAddress,
      tokenSymbol: schedule.tokenSymbol || undefined,
      amountInUsd: schedule.amountInUsd,
      allocations: Array.isArray(schedule.allocations)
        ? schedule.allocations
        : JSON.parse(schedule.allocations),
      scheduleType: schedule.scheduleType,
      scheduledAt: schedule.scheduledAt || undefined,
      recurrencePattern: schedule.recurrencePattern || undefined,
      timezone: schedule.timezone,
      autoDisperseEnabled: schedule.autoDisperseEnabled,
      monitorChainId: schedule.monitorChainId || undefined,
      balanceThreshold: schedule.balanceThreshold || undefined,
      checkInterval: schedule.checkInterval || undefined,
      status: schedule.status,
      lastExecutedAt: schedule.lastExecutedAt || undefined,
      nextExecutionAt: schedule.nextExecutionAt || undefined,
      executionCount: schedule.executionCount,
      lastIntentId: schedule.lastIntentId || undefined,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }
}

