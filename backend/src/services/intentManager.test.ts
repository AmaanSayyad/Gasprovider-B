/**
 * Tests for IntentManager service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntentManager, IntentRequest, resetIntentManager } from './intentManager';
import { PriceCalculator } from './priceCalculator';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

// Mock Prisma Client
const mockPrisma = {
  intent: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
} as unknown as PrismaClient;

describe('IntentManager', () => {
  let intentManager: IntentManager;
  let priceCalculator: PriceCalculator;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    resetIntentManager();

    // Initialize price calculator with test config
    const configPath = path.join(__dirname, '../config/exchangeRates.json');
    priceCalculator = new PriceCalculator(configPath);

    // Initialize intent manager
    intentManager = new IntentManager(mockPrisma, priceCalculator);
  });

  afterEach(() => {
    resetIntentManager();
  });

  describe('createIntent', () => {
    it('should create a valid intent successfully', async () => {
      const request: IntentRequest = {
        userAddress: '0x1234567890123456789012345678901234567890',
        sourceChain: 14, // Flare
        sourceToken: 'USDC',
        sourceAmount: BigInt('100000000000000000000'), // 100 USDC
        destinationChains: [1, 137], // Ethereum, Polygon
        allocationPercentages: [60, 40],
      };

      // Mock database response
      const mockDbIntent = {
        id: 'test-intent-id',
        userAddress: request.userAddress.toLowerCase(),
        sourceChainId: request.sourceChain,
        sourceTxHash: 'test-intent-id',
        tokenAddress: request.sourceToken,
        tokenSymbol: 'USDC',
        amountInTokenRaw: request.sourceAmount.toString(),
        amountInUsd: '100.00',
        status: 'DEPOSIT_CONFIRMED',
        globalPhase: 'DEPOSIT_CONFIRMED',
        allocations: [],
        chainStatuses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.intent.create as any).mockResolvedValue(mockDbIntent);

      const intent = await intentManager.createIntent(request);

      expect(intent).toBeDefined();
      expect(intent.userAddress).toBe(request.userAddress.toLowerCase());
      expect(intent.sourceChain).toBe(request.sourceChain);
      expect(intent.sourceToken).toBe('USDC');
      expect(intent.usdValue).toBe(100);
      expect(intent.status).toBe('created');
      expect(intent.distributions).toHaveLength(2);

      // Verify database was called
      expect(mockPrisma.intent.create).toHaveBeenCalledOnce();
    });

    it('should validate user address format', async () => {
      const request: IntentRequest = {
        userAddress: 'invalid-address',
        sourceChain: 14,
        sourceToken: 'USDC',
        sourceAmount: BigInt('100000000000000000000'),
        destinationChains: [1],
        allocationPercentages: [100],
      };

      await expect(intentManager.createIntent(request)).rejects.toThrow(
        'Invalid user address format'
      );
    });

    it('should validate source amount is positive', async () => {
      const request: IntentRequest = {
        userAddress: '0x1234567890123456789012345678901234567890',
        sourceChain: 14,
        sourceToken: 'USDC',
        sourceAmount: BigInt('0'),
        destinationChains: [1],
        allocationPercentages: [100],
      };

      await expect(intentManager.createIntent(request)).rejects.toThrow(
        'Invalid source amount'
      );
    });

    it('should validate at least one destination chain', async () => {
      const request: IntentRequest = {
        userAddress: '0x1234567890123456789012345678901234567890',
        sourceChain: 14,
        sourceToken: 'USDC',
        sourceAmount: BigInt('100000000000000000000'),
        destinationChains: [],
        allocationPercentages: [],
      };

      await expect(intentManager.createIntent(request)).rejects.toThrow(
        'At least one destination chain is required'
      );
    });

    it('should validate allocation percentages sum to 100', async () => {
      const request: IntentRequest = {
        userAddress: '0x1234567890123456789012345678901234567890',
        sourceChain: 14,
        sourceToken: 'USDC',
        sourceAmount: BigInt('100000000000000000000'),
        destinationChains: [1, 137],
        allocationPercentages: [50, 40], // Only 90%
      };

      await expect(intentManager.createIntent(request)).rejects.toThrow(
        'Allocation percentages must sum to 100'
      );
    });

    it('should validate token is supported', async () => {
      const request: IntentRequest = {
        userAddress: '0x1234567890123456789012345678901234567890',
        sourceChain: 14,
        sourceToken: 'INVALID_TOKEN',
        sourceAmount: BigInt('100000000000000000000'),
        destinationChains: [1],
        allocationPercentages: [100],
      };

      await expect(intentManager.createIntent(request)).rejects.toThrow(
        'Unsupported token'
      );
    });

    it('should validate all chains are supported', async () => {
      const request: IntentRequest = {
        userAddress: '0x1234567890123456789012345678901234567890',
        sourceChain: 14,
        sourceToken: 'USDC',
        sourceAmount: BigInt('100000000000000000000'),
        destinationChains: [999999], // Invalid chain
        allocationPercentages: [100],
      };

      await expect(intentManager.createIntent(request)).rejects.toThrow(
        'Unsupported chain'
      );
    });
  });

  describe('updateIntentStatus', () => {
    it('should update intent status successfully', async () => {
      const intentId = 'test-intent-id';

      (mockPrisma.intent.update as any).mockResolvedValue({});

      await intentManager.updateIntentStatus(intentId, 'distributing');

      expect(mockPrisma.intent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: expect.objectContaining({
          status: 'DISPERSE_IN_PROGRESS',
          globalPhase: 'DISPERSING',
        }),
      });
    });

    it('should set completedAt when status is completed', async () => {
      const intentId = 'test-intent-id';

      (mockPrisma.intent.update as any).mockResolvedValue({});

      await intentManager.updateIntentStatus(intentId, 'completed');

      expect(mockPrisma.intent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: expect.objectContaining({
          status: 'DISPERSED',
          globalPhase: 'COMPLETED',
          completedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('addTransactionHash', () => {
    it('should add transaction hash to specific chain', async () => {
      const intentId = 'test-intent-id';
      const chainId = 1;
      const txHash = '0xabcdef1234567890';

      const mockIntent = {
        id: intentId,
        chainStatuses: [
          {
            chainId: 1,
            chainName: 'Ethereum',
            amountUsd: '50.00',
            status: 'NOT_STARTED',
            updatedAt: new Date().toISOString(),
          },
          {
            chainId: 137,
            chainName: 'Polygon',
            amountUsd: '50.00',
            status: 'NOT_STARTED',
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      (mockPrisma.intent.findUnique as any).mockResolvedValue(mockIntent);
      (mockPrisma.intent.update as any).mockResolvedValue({});

      await intentManager.addTransactionHash(intentId, chainId, txHash);

      expect(mockPrisma.intent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: expect.objectContaining({
          chainStatuses: expect.arrayContaining([
            expect.objectContaining({
              chainId: 1,
              txHash,
              status: 'CONFIRMED',
            }),
          ]),
        }),
      });
    });

    it('should keep BROADCASTED when confirmed is false', async () => {
      const intentId = 'test-intent-id';
      const chainId = 1;
      const txHash = '0xabcdef1234567890';

      const mockIntent = {
        id: intentId,
        chainStatuses: [
          {
            chainId: 1,
            chainName: 'Ethereum',
            amountUsd: '50.00',
            status: 'NOT_STARTED',
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      (mockPrisma.intent.findUnique as any).mockResolvedValue(mockIntent);
      (mockPrisma.intent.update as any).mockResolvedValue({});

      await intentManager.addTransactionHash(intentId, chainId, txHash, { confirmed: false });

      expect(mockPrisma.intent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: expect.objectContaining({
          chainStatuses: expect.arrayContaining([
            expect.objectContaining({
              chainId: 1,
              txHash,
              status: 'BROADCASTED',
            }),
          ]),
        }),
      });
    });

    it('should throw error if intent not found', async () => {
      (mockPrisma.intent.findUnique as any).mockResolvedValue(null);

      await expect(
        intentManager.addTransactionHash('invalid-id', 1, '0xabc')
      ).rejects.toThrow('Intent not found');
    });
  });

  describe('getIntent', () => {
    it('should retrieve intent by ID', async () => {
      const intentId = 'test-intent-id';

      const mockIntent = {
        id: intentId,
        userAddress: '0x1234567890123456789012345678901234567890',
        sourceChainId: 14,
        sourceTxHash: intentId,
        tokenAddress: 'USDC',
        tokenSymbol: 'USDC',
        amountInTokenRaw: '100000000000000000000',
        amountInUsd: '100.00',
        status: 'DEPOSIT_CONFIRMED',
        globalPhase: 'DEPOSIT_CONFIRMED',
        allocations: [],
        chainStatuses: [
          {
            chainId: 1,
            chainName: 'Ethereum',
            amountUsd: '100.00',
            status: 'NOT_STARTED',
            updatedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      (mockPrisma.intent.findUnique as any).mockResolvedValue(mockIntent);

      const intent = await intentManager.getIntent(intentId);

      expect(intent).toBeDefined();
      expect(intent?.id).toBe(intentId);
      expect(intent?.status).toBe('created');
      expect(intent?.distributions).toHaveLength(1);
    });

    it('should return null if intent not found', async () => {
      (mockPrisma.intent.findUnique as any).mockResolvedValue(null);

      const intent = await intentManager.getIntent('invalid-id');

      expect(intent).toBeNull();
    });
  });

  describe('getUserIntents', () => {
    it('should retrieve all intents for a user', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';

      const mockIntents = [
        {
          id: 'intent-1',
          userAddress: userAddress.toLowerCase(),
          sourceChainId: 14,
          sourceTxHash: 'intent-1',
          tokenAddress: 'USDC',
          tokenSymbol: 'USDC',
          amountInTokenRaw: '100000000000000000000',
          amountInUsd: '100.00',
          status: 'DISPERSED',
          globalPhase: 'COMPLETED',
          allocations: [],
          chainStatuses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
        },
        {
          id: 'intent-2',
          userAddress: userAddress.toLowerCase(),
          sourceChainId: 14,
          sourceTxHash: 'intent-2',
          tokenAddress: 'USDC',
          tokenSymbol: 'USDC',
          amountInTokenRaw: '50000000000000000000',
          amountInUsd: '50.00',
          status: 'DISPERSE_IN_PROGRESS',
          globalPhase: 'DISPERSING',
          allocations: [],
          chainStatuses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
        },
      ];

      (mockPrisma.intent.findMany as any).mockResolvedValue(mockIntents);

      const intents = await intentManager.getUserIntents(userAddress);

      expect(intents).toHaveLength(2);
      expect(intents[0].status).toBe('completed');
      expect(intents[1].status).toBe('distributing');
    });

    it('should handle case-insensitive user address', async () => {
      const userAddress = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';

      (mockPrisma.intent.findMany as any).mockResolvedValue([]);

      await intentManager.getUserIntents(userAddress);

      expect(mockPrisma.intent.findMany).toHaveBeenCalledWith({
        where: {
          userAddress: {
            equals: userAddress.toLowerCase(),
            mode: 'insensitive',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('completeIntent', () => {
    it('should mark intent as completed', async () => {
      const intentId = 'test-intent-id';

      (mockPrisma.intent.update as any).mockResolvedValue({});

      await intentManager.completeIntent(intentId);

      expect(mockPrisma.intent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: {
          status: 'DISPERSED',
          globalPhase: 'COMPLETED',
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getIntentStatistics', () => {
    it('should calculate intent statistics correctly', async () => {
      const mockIntents = [
        {
          status: 'DEPOSIT_CONFIRMED',
          amountInUsd: '100.00',
          createdAt: new Date(),
        },
        {
          status: 'DISPERSED',
          amountInUsd: '50.00',
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        },
        {
          status: 'DISPERSE_IN_PROGRESS',
          amountInUsd: '75.00',
          createdAt: new Date(),
        },
      ];

      (mockPrisma.intent.count as any).mockResolvedValue(3);
      (mockPrisma.intent.findMany as any).mockResolvedValue(mockIntents);

      const stats = await intentManager.getIntentStatistics();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.created).toBe(1);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byStatus.distributing).toBe(1);
      expect(stats.last24Hours).toBe(2);
      expect(stats.totalUsdValue).toBe(225);
    });
  });
});
