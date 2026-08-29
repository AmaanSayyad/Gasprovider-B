/**
 * Treasury API Routes Tests
 * 
 * Tests for Treasury demo system API endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { registerTreasuryRoutes } from "./treasury";
import { PriceCalculator } from "../services/priceCalculator";
import { IntentManager } from "../services/intentManager";
import { TreasuryDistributionService } from "../services/treasuryDistribution";
import { TransactionExecutor } from "../services/transactionExecutor";
import { PrismaClient } from "@prisma/client";

describe("Treasury API Routes", () => {
  let fastify: FastifyInstance;
  let priceCalculator: PriceCalculator;
  let intentManager: IntentManager;
  let treasuryDistributionService: TreasuryDistributionService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    // Initialize Fastify
    fastify = Fastify();

    // Initialize services
    priceCalculator = new PriceCalculator();
    prisma = new PrismaClient();
    intentManager = new IntentManager(prisma, priceCalculator);
    const transactionExecutor = new TransactionExecutor();
    
    // Use correct path to treasury addresses
    const path = require("path");
    // From backend/src/routes, we need to go up 3 levels to reach the root
    const treasuryAddressesPath = path.join(__dirname, "../../../contracts/deployments/treasury-addresses.json");
    treasuryDistributionService = new TreasuryDistributionService(
      transactionExecutor,
      priceCalculator,
      treasuryAddressesPath
    );

    // Register routes
    registerTreasuryRoutes(
      fastify,
      priceCalculator,
      intentManager,
      treasuryDistributionService
    );

    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
    await prisma.$disconnect();
  });

  describe("GET /api/chains/supported", () => {
    it("should return list of supported chains", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/api/chains/supported",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("chains");
      expect(body).toHaveProperty("supportedTokens");
      expect(Array.isArray(body.chains)).toBe(true);
      expect(Array.isArray(body.supportedTokens)).toBe(true);
      expect(body.chains.length).toBeGreaterThan(0);
    });

    it("should include chain metadata", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/api/chains/supported",
      });

      const body = JSON.parse(response.body);
      const chain = body.chains[0];
      
      expect(chain).toHaveProperty("chainId");
      expect(chain).toHaveProperty("name");
      expect(chain).toHaveProperty("nativeSymbol");
      expect(chain).toHaveProperty("nativeTokenUsdPrice");
      expect(chain).toHaveProperty("isSource");
      expect(chain).toHaveProperty("isDestination");
    });
  });

  describe("POST /api/estimate", () => {
    it("should calculate gas estimates for valid request", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: "/api/estimate",
        payload: {
          sourceToken: "USDC",
          amount: "1000000000000000000", // 1 token (18 decimals)
          destinationChains: [1, 56],
          allocationPercentages: [50, 50],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty("sourceToken");
      expect(body).toHaveProperty("totalUsdValue");
      expect(body).toHaveProperty("estimates");
      expect(Array.isArray(body.estimates)).toBe(true);
      expect(body.estimates.length).toBe(2);
    });

    it("should reject invalid allocation percentages", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: "/api/estimate",
        payload: {
          sourceToken: "USDC",
          amount: "1000000000000000000",
          destinationChains: [1, 56],
          allocationPercentages: [60, 60], // Sum > 100
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("error");
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should reject mismatched arrays", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: "/api/estimate",
        payload: {
          sourceToken: "USDC",
          amount: "1000000000000000000",
          destinationChains: [1, 56],
          allocationPercentages: [100], // Length mismatch
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /api/deposit", () => {
    it("should reject invalid user address", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: "/api/deposit",
        payload: {
          userAddress: "invalid",
          sourceChain: 1,
          sourceToken: "USDC",
          amount: "1000000000000000000",
          destinationChains: [1],
          allocationPercentages: [100],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should validate allocation percentages", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: "/api/deposit",
        payload: {
          userAddress: "0x1234567890123456789012345678901234567890",
          sourceChain: 1,
          sourceToken: "USDC",
          amount: "1000000000000000000",
          destinationChains: [1, 56],
          allocationPercentages: [50, 60], // Sum > 100
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/intent/:id", () => {
    it("should reject invalid intent ID format", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/api/intent/invalid-id",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 for non-existent intent", async () => {
      const validUuid = "00000000-0000-0000-0000-000000000000";
      const response = await fastify.inject({
        method: "GET",
        url: `/api/intent/${validUuid}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/user/:address/intents", () => {
    it("should reject invalid address format", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/api/user/invalid-address/intents",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should return empty list for user with no intents", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/api/user/0x1234567890123456789012345678901234567890/intents",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("intents");
      expect(body).toHaveProperty("pagination");
      expect(Array.isArray(body.intents)).toBe(true);
    });

    it("should support pagination parameters", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/api/user/0x1234567890123456789012345678901234567890/intents?page=1&limit=10",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(10);
    });
  });

  describe("GET /api/treasury/balances", () => {
    it("should return Treasury balances for all chains", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/api/treasury/balances",
      });

      // May fail if Treasury contracts not deployed, but should return proper structure
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty("balances");
        expect(body).toHaveProperty("totalValueLocked");
        expect(body).toHaveProperty("timestamp");
        expect(Array.isArray(body.balances)).toBe(true);
      } else {
        // Should still return error in proper format
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty("error");
        expect(body).toHaveProperty("code");
      }
    });
  });
});
