/**
 * Tests for TreasuryDistributionService
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TreasuryDistributionService, ChainDistribution } from "./treasuryDistribution";
import { TransactionExecutor, TransactionReceipt } from "./transactionExecutor";
import { PriceCalculator } from "./priceCalculator";
import { ethers } from "ethers";
import * as path from "path";

describe("TreasuryDistributionService", () => {
  let service: TreasuryDistributionService;
  let mockExecutor: TransactionExecutor;
  let mockCalculator: PriceCalculator;

  beforeEach(() => {
    // Create mock transaction executor
    mockExecutor = {
      executeTransaction: vi.fn(),
      getProvider: vi.fn(),
    } as any;

    // Create mock price calculator
    mockCalculator = {
      getAllExchangeRates: vi.fn().mockReturnValue({
        chains: {
          "114": { chainId: 114, name: "Coston2", nativeSymbol: "C2FLR", usdPrice: 0.02 },
          "11155111": { chainId: 11155111, name: "Sepolia", nativeSymbol: "ETH", usdPrice: 2000 },
        },
      }),
    } as any;

    // Create service with mocks - use absolute path to treasury addresses
    // The contracts folder is at the root level, not inside backend
    // From backend/src/services, we need to go up 3 levels to reach the root
    const treasuryAddressesPath = path.join(__dirname, "../../../contracts/deployments/treasury-addresses.json");
    service = new TreasuryDistributionService(
      mockExecutor,
      mockCalculator,
      treasuryAddressesPath
    );
  });

  describe("distributeToChain", () => {
    it("should successfully distribute to a chain", async () => {
      const mockReceipt: TransactionReceipt = {
        txHash: "0x123",
        blockNumber: 100,
        status: "success",
        gasUsed: 50000n,
        confirmations: 1,
      };

      vi.mocked(mockExecutor.executeTransaction).mockResolvedValue(mockReceipt);

      const result = await service.distributeToChain(
        114,
        "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
        ethers.parseEther("1.0"),
        "test-intent-1"
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBe("0x123");
      expect(result.gasUsed).toBe(50000n);
      expect(mockExecutor.executeTransaction).toHaveBeenCalledOnce();
    });

    it("should handle distribution failure", async () => {
      vi.mocked(mockExecutor.executeTransaction).mockRejectedValue(
        new Error("Insufficient balance")
      );

      const result = await service.distributeToChain(
        114,
        "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
        ethers.parseEther("1.0"),
        "test-intent-1"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient balance");
    });

    it("should update metrics on success", async () => {
      const mockReceipt: TransactionReceipt = {
        txHash: "0x123",
        blockNumber: 100,
        status: "success",
        gasUsed: 50000n,
        confirmations: 1,
      };

      vi.mocked(mockExecutor.executeTransaction).mockResolvedValue(mockReceipt);

      await service.distributeToChain(
        114,
        "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
        ethers.parseEther("1.0"),
        "test-intent-1"
      );

      const metrics = service.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.successfulDistributions).toBe(1);
      expect(metrics.failedDistributions).toBe(0);
    });

    it("should update metrics on failure", async () => {
      vi.mocked(mockExecutor.executeTransaction).mockRejectedValue(
        new Error("Network error")
      );

      await service.distributeToChain(
        114,
        "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
        ethers.parseEther("1.0"),
        "test-intent-1"
      );

      const metrics = service.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.successfulDistributions).toBe(0);
      expect(metrics.failedDistributions).toBe(1);
    });
  });

  describe("distributeMultiChain", () => {
    it("should distribute to multiple chains in parallel", async () => {
      const mockReceipt: TransactionReceipt = {
        txHash: "0x123",
        blockNumber: 100,
        status: "success",
        gasUsed: 50000n,
        confirmations: 1,
      };

      vi.mocked(mockExecutor.executeTransaction).mockResolvedValue(mockReceipt);

      const distributions: ChainDistribution[] = [
        {
          chainId: 114,
          recipient: "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
          amount: ethers.parseEther("1.0"),
        },
        {
          chainId: 11155111,
          recipient: "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
          amount: ethers.parseEther("0.5"),
        },
      ];

      const results = await service.distributeMultiChain(distributions, "test-intent-1");

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockExecutor.executeTransaction).toHaveBeenCalledTimes(2);
    });

    it("should handle partial failures", async () => {
      vi.mocked(mockExecutor.executeTransaction)
        .mockResolvedValueOnce({
          txHash: "0x123",
          blockNumber: 100,
          status: "success",
          gasUsed: 50000n,
          confirmations: 1,
        })
        .mockRejectedValueOnce(new Error("Network error"));

      const distributions: ChainDistribution[] = [
        {
          chainId: 114,
          recipient: "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
          amount: ethers.parseEther("1.0"),
        },
        {
          chainId: 11155111,
          recipient: "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
          amount: ethers.parseEther("0.5"),
        },
      ];

      const results = await service.distributeMultiChain(distributions, "test-intent-1");

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe("getTreasuryBalance", () => {
    it("should query native token balance", async () => {
      const mockProvider = {
        call: vi.fn().mockResolvedValue(
          ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [ethers.parseEther("100")])
        ),
      };

      vi.mocked(mockExecutor as any).getProvider = vi.fn().mockResolvedValue(mockProvider);

      const balance = await service.getTreasuryBalance(114);

      expect(balance).toBe(ethers.parseEther("100"));
      expect(mockProvider.call).toHaveBeenCalledOnce();
    });

    it("should handle balance query errors", async () => {
      const mockProvider = {
        call: vi.fn().mockRejectedValue(new Error("RPC error")),
      };

      vi.mocked(mockExecutor as any).getProvider = vi.fn().mockResolvedValue(mockProvider);

      await expect(service.getTreasuryBalance(114)).rejects.toThrow("RPC error");
    });
  });

  describe("validateLiquidity", () => {
    it("should validate sufficient liquidity", async () => {
      const mockProvider = {
        call: vi.fn().mockResolvedValue(
          ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [ethers.parseEther("100")])
        ),
      };

      vi.mocked(mockExecutor as any).getProvider = vi.fn().mockResolvedValue(mockProvider);

      const distributions: ChainDistribution[] = [
        {
          chainId: 114,
          recipient: "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
          amount: ethers.parseEther("1.0"),
        },
      ];

      const isValid = await service.validateLiquidity(distributions);

      expect(isValid).toBe(true);
    });

    it("should detect insufficient liquidity", async () => {
      const mockProvider = {
        call: vi.fn().mockResolvedValue(
          ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [ethers.parseEther("0.5")])
        ),
      };

      vi.mocked(mockExecutor as any).getProvider = vi.fn().mockResolvedValue(mockProvider);

      const distributions: ChainDistribution[] = [
        {
          chainId: 114,
          recipient: "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
          amount: ethers.parseEther("1.0"),
        },
      ];

      const isValid = await service.validateLiquidity(distributions);

      expect(isValid).toBe(false);
    });

    it("should aggregate amounts for same chain", async () => {
      const mockProvider = {
        call: vi.fn().mockResolvedValue(
          ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [ethers.parseEther("10")])
        ),
      };

      vi.mocked(mockExecutor as any).getProvider = vi.fn().mockResolvedValue(mockProvider);

      const distributions: ChainDistribution[] = [
        {
          chainId: 114,
          recipient: "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
          amount: ethers.parseEther("1.0"),
        },
        {
          chainId: 114,
          recipient: "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
          amount: ethers.parseEther("2.0"),
        },
      ];

      const isValid = await service.validateLiquidity(distributions);

      expect(isValid).toBe(true);
      // Should only call once per chain
      expect(mockProvider.call).toHaveBeenCalledOnce();
    });
  });

  describe("metrics", () => {
    it("should track distribution metrics", async () => {
      const mockReceipt: TransactionReceipt = {
        txHash: "0x123",
        blockNumber: 100,
        status: "success",
        gasUsed: 50000n,
        confirmations: 1,
      };

      vi.mocked(mockExecutor.executeTransaction).mockResolvedValue(mockReceipt);

      // Perform multiple distributions
      await service.distributeToChain(
        114,
        "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
        ethers.parseEther("1.0"),
        "intent-1"
      );

      await service.distributeToChain(
        114,
        "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
        ethers.parseEther("1.0"),
        "intent-2"
      );

      const metrics = service.getMetrics();

      expect(metrics.totalAttempts).toBe(2);
      expect(metrics.successfulDistributions).toBe(2);
      expect(metrics.totalGasUsed).toBe(100000n);
      expect(metrics.averageGasUsed).toBe(50000);
    });

    it("should calculate success rate by chain", async () => {
      vi.mocked(mockExecutor.executeTransaction)
        .mockResolvedValueOnce({
          txHash: "0x123",
          blockNumber: 100,
          status: "success",
          gasUsed: 50000n,
          confirmations: 1,
        })
        .mockRejectedValueOnce(new Error("Error"));

      await service.distributeToChain(
        114,
        "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
        ethers.parseEther("1.0"),
        "intent-1"
      );

      await service.distributeToChain(
        114,
        "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
        ethers.parseEther("1.0"),
        "intent-2"
      );

      const metrics = service.getMetrics();

      expect(metrics.successRateByChain[114]).toBe(0.5);
    });

    it("should reset metrics", () => {
      service.resetMetrics();
      const metrics = service.getMetrics();

      expect(metrics.totalAttempts).toBe(0);
      expect(metrics.successfulDistributions).toBe(0);
      expect(metrics.failedDistributions).toBe(0);
    });
  });

  describe("alerts", () => {
    it("should emit alerts on distribution events", async () => {
      const alertCallback = vi.fn();
      service.onAlert(alertCallback);

      const mockReceipt: TransactionReceipt = {
        txHash: "0x123",
        blockNumber: 100,
        status: "success",
        gasUsed: 50000n,
        confirmations: 1,
      };

      vi.mocked(mockExecutor.executeTransaction).mockResolvedValue(mockReceipt);

      await service.distributeToChain(
        114,
        "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
        ethers.parseEther("1.0"),
        "test-intent-1"
      );

      expect(alertCallback).toHaveBeenCalled();
      const alert = alertCallback.mock.calls[0][0];
      expect(alert.severity).toBe("info");
      expect(alert.chainId).toBe(114);
    });

    it("should emit critical alerts on failures", async () => {
      const alertCallback = vi.fn();
      service.onAlert(alertCallback);

      vi.mocked(mockExecutor.executeTransaction).mockRejectedValue(
        new Error("Network error")
      );

      await service.distributeToChain(
        114,
        "0x742D35CC6634c0532925A3b844BC9E7595F0BEb0",
        ethers.parseEther("1.0"),
        "test-intent-1"
      );

      expect(alertCallback).toHaveBeenCalled();
      const alert = alertCallback.mock.calls[0][0];
      expect(alert.severity).toBe("critical");
      expect(alert.message).toContain("failed");
    });
  });
});
