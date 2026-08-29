import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

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
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  members?: GasPoolMember[];
}

export interface GasPoolMember {
  id: string;
  poolId: string;
  userAddress: string;
  contribution: string;
  received: string;
  balance: string;
  joinedAt: Date;
  isActive: boolean;
}

export interface GasPoolContribution {
  id: string;
  poolId: string;
  userAddress: string;
  amount: string;
  intentId?: string;
  txHash?: string;
  createdAt: Date;
}

export interface GasPoolDistribution {
  id: string;
  poolId: string;
  recipientAddress: string;
  amount: string;
  intentId?: string;
  reason?: string;
  createdAt: Date;
}

export interface CreatePoolInput {
  name: string;
  description?: string;
  creatorAddress: string;
  minContribution: string;
  maxMembers?: number;
  isPublic?: boolean;
  autoDistribute?: boolean;
}

export interface JoinPoolInput {
  poolCode: string;
  userAddress: string;
}

export interface ContributeInput {
  poolId: string;
  userAddress: string;
  amount: string;
  intentId?: string;
  txHash?: string;
}

export interface DistributeInput {
  poolId: string;
  recipientAddress: string;
  amount: string;
  intentId?: string;
  reason?: string;
}

export class GasPoolService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a unique pool code
   */
  private generatePoolCode(): string {
    return randomBytes(4).toString("hex").toUpperCase();
  }

  /**
   * Create a new gas pool
   */
  async createPool(input: CreatePoolInput): Promise<GasPool> {
    const normalizedAddress = input.creatorAddress.toLowerCase();
    
    let poolCode = this.generatePoolCode();
    // Ensure uniqueness
    let exists = await this.prisma.gasPool.findUnique({
      where: { poolCode },
    });
    
    while (exists) {
      poolCode = this.generatePoolCode();
      exists = await this.prisma.gasPool.findUnique({
        where: { poolCode },
      });
    }

    const pool = await this.prisma.gasPool.create({
      data: {
        name: input.name,
        description: input.description,
        creatorAddress: normalizedAddress,
        poolCode,
        minContribution: input.minContribution,
        maxMembers: input.maxMembers,
        isPublic: input.isPublic ?? true,
        autoDistribute: input.autoDistribute ?? true,
        members: {
          create: {
            userAddress: normalizedAddress,
            contribution: "0",
            received: "0",
            balance: "0",
          },
        },
        activities: {
          create: {
            activityType: "pool_created",
            userAddress: normalizedAddress,
            description: `Pool "${input.name}" created`,
          },
        },
      },
      include: {
        members: true,
        _count: {
          select: { members: true },
        },
      },
    });

    return {
      ...pool,
      memberCount: pool._count.members,
    };
  }

  /**
   * Join a gas pool
   */
  async joinPool(input: JoinPoolInput): Promise<GasPoolMember> {
    const normalizedAddress = input.userAddress.toLowerCase();
    
    const pool = await this.prisma.gasPool.findUnique({
      where: { poolCode: input.poolCode },
      include: { members: true },
    });

    if (!pool) {
      throw new Error("Pool not found");
    }

    if (pool.status !== "active") {
      throw new Error("Pool is not active");
    }

    if (pool.maxMembers && pool.members.length >= pool.maxMembers) {
      throw new Error("Pool is full");
    }

    const existingMember = await this.prisma.gasPoolMember.findUnique({
      where: {
        poolId_userAddress: {
          poolId: pool.id,
          userAddress: normalizedAddress,
        },
      },
    });

    if (existingMember) {
      if (existingMember.isActive) {
        throw new Error("Already a member of this pool");
      }
      // Reactivate member
      return await this.prisma.gasPoolMember.update({
        where: { id: existingMember.id },
        data: { isActive: true },
      });
    }

    const member = await this.prisma.gasPoolMember.create({
      data: {
        poolId: pool.id,
        userAddress: normalizedAddress,
        contribution: "0",
        received: "0",
        balance: "0",
      },
    });

    await this.prisma.gasPoolActivity.create({
      data: {
        poolId: pool.id,
        activityType: "member_joined",
        userAddress: normalizedAddress,
        description: `User joined the pool`,
      },
    });

    return member;
  }

  /**
   * Contribute to a pool
   */
  async contribute(input: ContributeInput): Promise<GasPoolContribution> {
    const normalizedAddress = input.userAddress.toLowerCase();
    const amount = parseFloat(input.amount);

    const pool = await this.prisma.gasPool.findUnique({
      where: { id: input.poolId },
      include: { members: true },
    });

    if (!pool) {
      throw new Error("Pool not found");
    }

    if (pool.status !== "active") {
      throw new Error("Pool is not active");
    }

    const member = await this.prisma.gasPoolMember.findUnique({
      where: {
        poolId_userAddress: {
          poolId: input.poolId,
          userAddress: normalizedAddress,
        },
      },
    });

    if (!member || !member.isActive) {
      throw new Error("Not a member of this pool");
    }

    if (amount < parseFloat(pool.minContribution)) {
      throw new Error(`Contribution must be at least $${pool.minContribution}`);
    }

    const contribution = await this.prisma.gasPoolContribution.create({
      data: {
        poolId: input.poolId,
        userAddress: normalizedAddress,
        amount: input.amount,
        intentId: input.intentId,
        txHash: input.txHash,
      },
    });

    // Update member and pool balances
    const newMemberContribution = (parseFloat(member.contribution) + amount).toFixed(2);
    const newMemberBalance = (parseFloat(member.balance) + amount).toFixed(2);
    
    await this.prisma.gasPoolMember.update({
      where: { id: member.id },
      data: {
        contribution: newMemberContribution,
        balance: newMemberBalance,
      },
    });

    const newTotalContributed = (parseFloat(pool.totalContributed) + amount).toFixed(2);
    const newCurrentBalance = (parseFloat(pool.currentBalance) + amount).toFixed(2);

    await this.prisma.gasPool.update({
      where: { id: input.poolId },
      data: {
        totalContributed: newTotalContributed,
        currentBalance: newCurrentBalance,
      },
    });

    await this.prisma.gasPoolActivity.create({
      data: {
        poolId: input.poolId,
        activityType: "contribution",
        userAddress: normalizedAddress,
        amount: input.amount,
        description: `Contributed $${input.amount}`,
      },
    });

    return contribution;
  }

  /**
   * Distribute gas from pool to a member
   */
  async distribute(input: DistributeInput): Promise<GasPoolDistribution> {
    const pool = await this.prisma.gasPool.findUnique({
      where: { id: input.poolId },
    });

    if (!pool) {
      throw new Error("Pool not found");
    }

    if (pool.status !== "active") {
      throw new Error("Pool is not active");
    }

    const amount = parseFloat(input.amount);
    if (amount > parseFloat(pool.currentBalance)) {
      throw new Error("Insufficient pool balance");
    }

    const member = await this.prisma.gasPoolMember.findUnique({
      where: {
        poolId_userAddress: {
          poolId: input.poolId,
          userAddress: input.recipientAddress.toLowerCase(),
        },
      },
    });

    if (!member || !member.isActive) {
      throw new Error("Recipient is not an active member");
    }

    const distribution = await this.prisma.gasPoolDistribution.create({
      data: {
        poolId: input.poolId,
        recipientAddress: input.recipientAddress.toLowerCase(),
        amount: input.amount,
        intentId: input.intentId,
        reason: input.reason,
      },
    });

    // Update member and pool balances
    const newMemberReceived = (parseFloat(member.received) + amount).toFixed(2);
    const newMemberBalance = Math.max(0, parseFloat(member.balance) - amount).toFixed(2);

    await this.prisma.gasPoolMember.update({
      where: { id: member.id },
      data: {
        received: newMemberReceived,
        balance: newMemberBalance,
      },
    });

    const newTotalDistributed = (parseFloat(pool.totalDistributed) + amount).toFixed(2);
    const newCurrentBalance = (parseFloat(pool.currentBalance) - amount).toFixed(2);

    await this.prisma.gasPool.update({
      where: { id: input.poolId },
      data: {
        totalDistributed: newTotalDistributed,
        currentBalance: newCurrentBalance,
      },
    });

    await this.prisma.gasPoolActivity.create({
      data: {
        poolId: input.poolId,
        activityType: "distribution",
        userAddress: input.recipientAddress.toLowerCase(),
        amount: input.amount,
        description: input.reason || `Distributed $${input.amount}`,
      },
    });

    return distribution;
  }

  /**
   * Get pool by ID
   */
  async getPoolById(poolId: string, userAddress?: string): Promise<GasPool | null> {
    const pool = await this.prisma.gasPool.findUnique({
      where: { id: poolId },
      include: {
        members: {
          where: userAddress ? { userAddress: userAddress.toLowerCase() } : undefined,
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!pool) return null;

    return {
      ...pool,
      memberCount: pool._count.members,
    };
  }

  /**
   * Get pool by code
   */
  async getPoolByCode(poolCode: string): Promise<GasPool | null> {
    const pool = await this.prisma.gasPool.findUnique({
      where: { poolCode },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!pool) return null;

    return {
      ...pool,
      memberCount: pool._count.members,
    };
  }

  /**
   * Get user's pools
   */
  async getUserPools(userAddress: string): Promise<GasPool[]> {
    const normalizedAddress = userAddress.toLowerCase();
    
    const pools = await this.prisma.gasPool.findMany({
      where: {
        members: {
          some: {
            userAddress: normalizedAddress,
            isActive: true,
          },
        },
      },
      include: {
        members: {
          where: { userAddress: normalizedAddress },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return pools.map((pool) => ({
      ...pool,
      memberCount: pool._count.members,
    }));
  }

  /**
   * Get public pools
   */
  async getPublicPools(limit: number = 20): Promise<GasPool[]> {
    const pools = await this.prisma.gasPool.findMany({
      where: {
        isPublic: true,
        status: "active",
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return pools.map((pool) => ({
      ...pool,
      memberCount: pool._count.members,
    }));
  }

  /**
   * Get pool activity
   */
  async getPoolActivity(poolId: string, limit: number = 50) {
    return await this.prisma.gasPoolActivity.findMany({
      where: { poolId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Leave a pool
   */
  async leavePool(poolId: string, userAddress: string): Promise<void> {
    const normalizedAddress = userAddress.toLowerCase();
    
    const member = await this.prisma.gasPoolMember.findUnique({
      where: {
        poolId_userAddress: {
          poolId,
          userAddress: normalizedAddress,
        },
      },
    });

    if (!member) {
      throw new Error("Not a member of this pool");
    }

    await this.prisma.gasPoolMember.update({
      where: { id: member.id },
      data: { isActive: false },
    });

    await this.prisma.gasPoolActivity.create({
      data: {
        poolId,
        activityType: "member_left",
        userAddress: normalizedAddress,
        description: "User left the pool",
      },
    });
  }
}

