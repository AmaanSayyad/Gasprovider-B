console.log("🚀 Starting Gas Provider Backend...");
console.log("📍 Node version:", process.version);
console.log("📍 Current directory:", process.cwd());

import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaIntentStore } from "./store/prisma";
import { DispersalService } from "./services/dispersal";
import { ScheduledDispersalService } from "./services/scheduledDispersal";
import { BlockchainService } from "./services/blockchain";
import { registerRoutes } from "./routes";
import { initPrisma, closePrisma, testPrismaConnection } from "./db/prisma";
import { initializeErrorMonitoring, getErrorMonitoringService } from "./services/errorMonitoring";

console.log("✅ Imports completed");

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || "0.0.0.0";

/**
 * Start periodic relayer balance monitoring
 * Checks balance every 5 minutes and emits warnings if below threshold
 */
function startRelayerBalanceMonitoring(relayerService: any): void {
  const checkInterval = parseInt(process.env.RELAYER_BALANCE_CHECK_INTERVAL_MS || "300000", 10); // Default: 5 minutes

  console.log(`🔍 Starting relayer balance monitoring (interval: ${checkInterval}ms)`);

  // Check balance immediately on startup
  relayerService.getBalance().catch((error: any) => {
    console.error('❌ Error checking relayer balance on startup:', error);
  });

  // Set up periodic balance checks
  setInterval(async () => {
    try {
      await relayerService.getBalance();
    } catch (error: any) {
      console.error('❌ Error checking relayer balance:', error);
    }
  }, checkInterval);
}

/**
 * Start scheduled dispersal processor
 * Checks for schedules ready to execute every minute
 */
function startScheduledDispersalProcessor(scheduledDispersalService: ScheduledDispersalService): void {
  const checkInterval = parseInt(process.env.SCHEDULED_DISPERSAL_CHECK_INTERVAL_MS || "60000", 10); // Default: 1 minute

  console.log(`⏰ Starting scheduled dispersal processor (interval: ${checkInterval}ms)`);

  // Process schedules immediately on startup
  processScheduledDispersals(scheduledDispersalService).catch((error: any) => {
    console.error('❌ Error processing scheduled dispersals on startup:', error);
  });

  // Set up periodic schedule processing
  setInterval(async () => {
    try {
      await processScheduledDispersals(scheduledDispersalService);
    } catch (error: any) {
      console.error('❌ Error processing scheduled dispersals:', error);
    }
  }, checkInterval);
}

/**
 * Process all schedules ready for execution
 */
async function processScheduledDispersals(
  scheduledDispersalService: ScheduledDispersalService
): Promise<void> {
  try {
    const readySchedules = await scheduledDispersalService.getSchedulesReadyForExecution();

    if (readySchedules.length === 0) {
      return;
    }

    console.log(`📅 Processing ${readySchedules.length} scheduled dispersal(s)...`);

    for (const schedule of readySchedules) {
      try {
        console.log(`⏳ Executing schedule ${schedule.id}...`);
        const intentId = await scheduledDispersalService.executeSchedule(schedule.id);
        
        if (intentId) {
          console.log(`✅ Schedule ${schedule.id} executed successfully, intent: ${intentId}`);
        } else {
          console.log(`⏸️ Schedule ${schedule.id} skipped (conditions not met)`);
        }
      } catch (error: any) {
        console.error(`❌ Error executing schedule ${schedule.id}:`, error);
        // Continue processing other schedules even if one fails
      }
    }
  } catch (error: any) {
    console.error('❌ Error in scheduled dispersal processor:', error);
  }
}

async function main() {
  console.log("🔄 main() function started");
  
  // Initialize error monitoring
  console.log("📊 Initializing error monitoring...");
  initializeErrorMonitoring({
    enabled: true,
    criticalThreshold: 10,
    errorThreshold: 20,
    warningThreshold: 50,
    alertCooldown: 300000, // 5 minutes
  });

  // Initialize Prisma client
  console.log("🔌 Connecting to database with Prisma...");

  // Set DATABASE_URL if not provided (for compatibility with existing env vars)
  if (!process.env.DATABASE_URL) {
    const dbHost = process.env.DB_HOST || "localhost";
    const dbPort = process.env.DB_PORT || "5432";
    const dbUser = process.env.DB_USER || "gasfountain";
    const dbPassword = process.env.DB_PASSWORD || "gasfountain123";
    const dbName = process.env.DB_NAME || "gasfountain";

    process.env.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
  }

  const prisma = await initPrisma();

  // Test database connection
  const dbConnected = await testPrismaConnection();
  if (!dbConnected) {
    console.error("❌ Failed to connect to database");
    process.exit(1);
  }
  console.log("✅ Database connected successfully");

  // Initialize Fastify
  const fastify = Fastify({
    logger: true,
  });

  // Register CORS plugin
  await fastify.register(cors, {
    origin: true, // Allow all origins in development (change to specific origins in production)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Indexer-Secret"],
  });

  // Register rate limiting plugin (optional - requires @fastify/rate-limit package)
  try {
    const rateLimit = await import("@fastify/rate-limit").catch(() => null);
    if (rateLimit) {
      await fastify.register(rateLimit.default, {
        max: 100, // Maximum 100 requests
        timeWindow: "1 minute", // Per minute
        cache: 10000, // Cache size
        allowList: [], // Whitelist IPs if needed
        redis: undefined, // Use in-memory cache (can be configured with Redis)
        skipOnError: true, // Skip rate limiting on errors
        keyGenerator: (request: any) => {
          // Use IP address as key
          return request.ip;
        },
        errorResponseBuilder: (request: any, context: any) => {
          return {
            error: "Too many requests",
            code: "RATE_LIMIT_EXCEEDED",
            details: `Rate limit exceeded, retry in ${context.after}`,
          };
        },
      });
      console.log("✅ Rate limiting enabled");
    } else {
      console.log("ℹ️ Rate limiting not available (install @fastify/rate-limit to enable)");
    }
  } catch (error) {
    console.warn("⚠️ Failed to enable rate limiting:", error);
  }

  // Initialize store and services with Prisma
  const store = new PrismaIntentStore(prisma);
  const dispersalService = new DispersalService(store);
  const blockchainService = new BlockchainService();
  const scheduledDispersalService = new ScheduledDispersalService(
    prisma,
    dispersalService,
    blockchainService
  );
  
  // Initialize referral, gamification, gas pool, and liquidity services
  const referralService = new (await import('./services/referral')).ReferralService(prisma);
  const gamificationService = new (await import('./services/gamification')).GamificationService(prisma);
  const gasPoolService = new (await import('./services/gasPool')).GasPoolService(prisma);
  const liquidityService = new (await import('./services/liquidity')).LiquidityService(prisma);
  
  // Initialize default achievements
  await gamificationService.initializeAchievements().catch((err) => {
    console.warn('Failed to initialize achievements:', err);
  });

  // Initialize Smart Account Manager and Relayer Service if Flare is enabled
  let smartAccountManager: any = undefined;
  let relayerService: any = undefined;

  const enableSmartAccounts = process.env.ENABLE_SMART_ACCOUNTS === 'true';
  const flareRpcUrl = process.env.FLARE_RPC_URL || process.env.COSTON2_RPC_URL;
  const smartAccountFactoryAddress = process.env.SMART_ACCOUNT_FACTORY_ADDRESS_COSTON2 || process.env.SMART_ACCOUNT_FACTORY_ADDRESS_MAINNET;
  const { getRelayerPrivateKey } = await import('./utils/keys');
  const relayerPrivateKey = getRelayerPrivateKey();

  if (enableSmartAccounts && flareRpcUrl && smartAccountFactoryAddress && relayerPrivateKey) {
    try {
      const { SmartAccountManager } = await import('./services/smartaccount');
      const { RelayerService } = await import('./services/relayer');
      const { PrismaSmartAccountStorageAdapter } = await import('./store/prisma');

      // Initialize storage adapter
      const storageAdapter = new PrismaSmartAccountStorageAdapter(prisma);

      // Initialize Smart Account Manager
      smartAccountManager = new SmartAccountManager(
        flareRpcUrl,
        smartAccountFactoryAddress,
        storageAdapter
      );

      // Initialize Relayer Service
      const balanceThreshold = process.env.RELAYER_BALANCE_THRESHOLD_FLR || "10.0";
      relayerService = new RelayerService(
        flareRpcUrl,
        relayerPrivateKey,
        balanceThreshold
      );

      console.log('✅ Smart Account Manager and Relayer Service initialized');

      // Start relayer balance monitoring
      startRelayerBalanceMonitoring(relayerService);
    } catch (error) {
      console.warn('⚠️ Failed to initialize Smart Account services:', error);
    }
  } else {
    console.log('ℹ️ Smart Account functionality disabled (set ENABLE_SMART_ACCOUNTS=true to enable)');
  }

  // Initialize Event Processor with relayer and smart account services
  const eventProcessor = new (await import('./services/eventProcessor')).EventProcessor(
    store,
    relayerService,
    smartAccountManager
  );

  // Register routes
  registerRoutes(
    fastify,
    store,
    dispersalService,
    eventProcessor,
    smartAccountManager,
    relayerService,
    scheduledDispersalService,
    referralService,
    gamificationService,
    gasPoolService,
    liquidityService
  );

  // Start scheduled dispersal processor
  startScheduledDispersalProcessor(scheduledDispersalService);

  // Health check endpoint
  fastify.get("/health", async (request, reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Error monitoring endpoint
  fastify.get("/api/monitoring/metrics", async (request, reply) => {
    const monitoringService = getErrorMonitoringService();
    const metrics = monitoringService.getMetrics();
    return reply.code(200).send(metrics);
  });

  // Error monitoring report endpoint
  fastify.get("/api/monitoring/report", async (request, reply) => {
    const monitoringService = getErrorMonitoringService();
    const report = monitoringService.generateReport();
    return reply.code(200).type("text/plain").send(report);
  });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(
      `🚀 Gas Fountain backend server listening on http://${HOST}:${PORT}`
    );
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📈 Status endpoint: http://${HOST}:${PORT}/status/:intentId`);
    console.log(`📜 History endpoint: http://${HOST}:${PORT}/history`);
    console.log(`📥 Event endpoint: http://${HOST}:${PORT}/event`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await closePrisma();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await closePrisma();
  process.exit(0);
});

console.log("🎯 Calling main()...");
main().catch((err) => {
  console.error("❌ Fatal error starting server:", err);
  console.error("Stack trace:", err.stack);
  process.exit(1);
});
