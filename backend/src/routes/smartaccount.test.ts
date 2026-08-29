import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { registerRoutes } from "./index";
import { PrismaClient } from "@prisma/client";
import { PrismaIntentStore, PrismaSmartAccountStorageAdapter } from "../store/prisma";
import { DispersalService } from "../services/dispersal";
import { SmartAccountManager } from "../services/smartaccount";
import { RelayerService } from "../services/relayer";
import { ethers } from "ethers";

/**
 * Integration tests for Smart Account API routes
 * Tests the Smart Account endpoints added in task 9.6
 */
describe("Smart Account API Routes", () => {
  let fastify: FastifyInstance;
  let prisma: PrismaClient;
  let store: PrismaIntentStore;
  let dispersalService: DispersalService;
  let smartAccountManager: SmartAccountManager | undefined;
  let relayerService: RelayerService | undefined;

  beforeAll(async () => {
    // Initialize Prisma client
    prisma = new PrismaClient();

    // Initialize store and services
    store = new PrismaIntentStore(prisma);
    dispersalService = new DispersalService(store);

    // Initialize Smart Account services if configuration is available
    const flareRpcUrl = process.env.COSTON2_RPC_URL;
    const smartAccountFactoryAddress = process.env.SMART_ACCOUNT_FACTORY_ADDRESS_COSTON2;
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;

    if (flareRpcUrl && smartAccountFactoryAddress && relayerPrivateKey) {
      const storageAdapter = new PrismaSmartAccountStorageAdapter(prisma);
      
      smartAccountManager = new SmartAccountManager(
        flareRpcUrl,
        smartAccountFactoryAddress,
        storageAdapter
      );

      relayerService = new RelayerService(
        flareRpcUrl,
        relayerPrivateKey,
        "10.0"
      );
    }

    // Initialize Fastify
    fastify = Fastify();

    // Register routes
    registerRoutes(
      fastify,
      store,
      dispersalService,
      undefined, // eventProcessor
      smartAccountManager,
      relayerService
    );

    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
    await prisma.$disconnect();
  });

  describe("GET /smart-account/:eoaAddress", () => {
    it("should return 503 if Smart Account functionality is not available", async () => {
      if (smartAccountManager) {
        // Skip this test if Smart Account is available
        return;
      }

      const response = await fastify.inject({
        method: "GET",
        url: "/smart-account/0x1234567890123456789012345678901234567890",
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("SERVICE_UNAVAILABLE");
    });

    it("should return 400 for invalid address format", async () => {
      if (!smartAccountManager) {
        // Skip if Smart Account is not available
        return;
      }

      const response = await fastify.inject({
        method: "GET",
        url: "/smart-account/invalid-address",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should return null for non-existent Smart Account", async () => {
      if (!smartAccountManager) {
        // Skip if Smart Account is not available
        return;
      }

      // Use a random address that likely doesn't have a Smart Account
      const randomAddress = ethers.Wallet.createRandom().address;

      const response = await fastify.inject({
        method: "GET",
        url: `/smart-account/${randomAddress}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.exists).toBe(false);
      expect(body.smartAccountAddress).toBeNull();
    });
  });

  describe("POST /smart-account/create", () => {
    it("should return 503 if Smart Account functionality is not available", async () => {
      if (smartAccountManager) {
        // Skip this test if Smart Account is available
        return;
      }

      const response = await fastify.inject({
        method: "POST",
        url: "/smart-account/create",
        payload: {
          eoaAddress: "0x1234567890123456789012345678901234567890",
        },
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("SERVICE_UNAVAILABLE");
    });

    it("should return 400 for invalid address format", async () => {
      if (!smartAccountManager) {
        // Skip if Smart Account is not available
        return;
      }

      const response = await fastify.inject({
        method: "POST",
        url: "/smart-account/create",
        payload: {
          eoaAddress: "invalid-address",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /smart-account/gasless-transaction", () => {
    it("should return 503 if gasless transaction functionality is not available", async () => {
      if (smartAccountManager && relayerService) {
        // Skip this test if services are available
        return;
      }

      const response = await fastify.inject({
        method: "POST",
        url: "/smart-account/gasless-transaction",
        payload: {
          smartAccountAddress: "0x1234567890123456789012345678901234567890",
          calls: [
            {
              to: "0x1234567890123456789012345678901234567890",
              value: "0",
              data: "0x",
            },
          ],
          signature: "0x" + "00".repeat(65),
        },
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("SERVICE_UNAVAILABLE");
    });

    it("should return 400 for invalid payload", async () => {
      if (!smartAccountManager || !relayerService) {
        // Skip if services are not available
        return;
      }

      const response = await fastify.inject({
        method: "POST",
        url: "/smart-account/gasless-transaction",
        payload: {
          smartAccountAddress: "invalid-address",
          calls: [],
          signature: "invalid",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /deposit/smart-account", () => {
    it("should return 503 if Smart Account deposit functionality is not available", async () => {
      if (smartAccountManager && relayerService) {
        // Skip this test if services are available
        return;
      }

      const response = await fastify.inject({
        method: "POST",
        url: "/deposit/smart-account",
        payload: {
          eoaAddress: "0x1234567890123456789012345678901234567890",
          tokenAddress: "0x1234567890123456789012345678901234567890",
          amount: "1000000",
          chainIds: [1],
          chainAmounts: ["1000000"],
        },
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("SERVICE_UNAVAILABLE");
    });

    it("should return 400 for mismatched chain IDs and amounts", async () => {
      if (!smartAccountManager || !relayerService) {
        // Skip if services are not available
        return;
      }

      const response = await fastify.inject({
        method: "POST",
        url: "/deposit/smart-account",
        payload: {
          eoaAddress: "0x1234567890123456789012345678901234567890",
          tokenAddress: "0x1234567890123456789012345678901234567890",
          amount: "1000000",
          chainIds: [1, 2],
          chainAmounts: ["1000000"], // Mismatched length
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid address format", async () => {
      if (!smartAccountManager || !relayerService) {
        // Skip if services are not available
        return;
      }

      const response = await fastify.inject({
        method: "POST",
        url: "/deposit/smart-account",
        payload: {
          eoaAddress: "invalid-address",
          tokenAddress: "0x1234567890123456789012345678901234567890",
          amount: "1000000",
          chainIds: [1],
          chainAmounts: ["1000000"],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });
});
