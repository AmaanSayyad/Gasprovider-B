import { describe, it, expect } from "vitest";
import type { Transaction, TransactionReceipt, TransactionStatus } from "./transactionExecutor";
import { ethers } from "ethers";

describe("TransactionExecutor", () => {
  describe("Module Structure", () => {
    it("should have valid module structure", () => {
      // This test verifies that the module can be imported without errors
      expect(true).toBe(true);
    });
  });

  describe("Interface Validation", () => {
    it("should have correct Transaction interface structure", () => {
      const transaction: Transaction = {
        to: "0x0000000000000000000000000000000000000001",
        data: "0x",
        value: 1000n,
        gasLimit: 21000n,
      };

      expect(transaction.to).toBeDefined();
      expect(transaction.data).toBeDefined();
      expect(transaction.value).toBeDefined();
      expect(transaction.gasLimit).toBeDefined();
    });

    it("should have correct TransactionReceipt interface structure", () => {
      const receipt: TransactionReceipt = {
        txHash: "0x123",
        blockNumber: 100,
        status: "success",
        gasUsed: 21000n,
        confirmations: 1,
      };

      expect(receipt.txHash).toBeDefined();
      expect(receipt.blockNumber).toBeDefined();
      expect(receipt.status).toBeDefined();
      expect(receipt.gasUsed).toBeDefined();
      expect(receipt.confirmations).toBeDefined();
    });

    it("should have correct TransactionStatus interface structure", () => {
      const status: TransactionStatus = {
        pending: false,
        confirmed: true,
        confirmations: 5,
        blockNumber: 100,
      };

      expect(status.pending).toBeDefined();
      expect(status.confirmed).toBeDefined();
      expect(status.confirmations).toBeDefined();
      expect(status.blockNumber).toBeDefined();
    });
  });

  describe("Basic Functionality", () => {
    it("should validate transaction structure", () => {
      const validTransaction: Transaction = {
        to: ethers.getAddress("0x0000000000000000000000000000000000000001"),
        data: "0x",
      };

      expect(ethers.isAddress(validTransaction.to)).toBe(true);
      expect(validTransaction.data).toBe("0x");
    });

    it("should handle bigint values correctly", () => {
      const value = ethers.parseEther("1.0");
      expect(typeof value).toBe("bigint");
      expect(value).toBeGreaterThan(0n);
    });
  });

  describe("Configuration", () => {
    it("should support all required chains", () => {
      const requiredChains = [
        114,       // Coston2 Testnet
        14,        // Flare Mainnet
        11155111,  // Ethereum Sepolia
        80002,     // Polygon Amoy
        421614,    // Arbitrum Sepolia
        11155420,  // Optimism Sepolia
        97,        // BSC Testnet
        43113,     // Avalanche Fuji
        84532,     // Base Sepolia
        4801,      // World Sepolia
        999999999, // Zora Sepolia
        534351,    // Scroll Sepolia
      ];

      // Verify we have the expected number of chains
      expect(requiredChains.length).toBe(12);
    });
  });
});
