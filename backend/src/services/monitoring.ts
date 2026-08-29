import { FTSOPriceService } from "./ftso";
import { RelayerService } from "./relayer";
import { ethers } from "ethers";

/**
 * Monitoring and alerting service for Flare integrations
 * Tracks health metrics and emits alerts for critical errors
 */

export interface HealthMetrics {
  ftso: FTSOHealthMetrics;
  fdc: FDCHealthMetrics;
  relayer: RelayerHealthMetrics;
  smartAccount: SmartAccountHealthMetrics;
  timestamp: number;
}

export interface FTSOHealthMetrics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  fallbackUsageCount: number;
  averageResponseTime: number;
  lastQueryTimestamp: number;
  healthStatus: "healthy" | "degraded" | "unhealthy";
}

export interface FDCHealthMetrics {
  totalAttestations: number;
  successfulAttestations: number;
  failedAttestations: number;
  averageAttestationTime: number;
  lastAttestationTimestamp: number;
  healthStatus: "healthy" | "degraded" | "unhealthy";
}

export interface RelayerHealthMetrics {
  balance: bigint;
  balanceFormatted: string;
  belowThreshold: boolean;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  lastTransactionTimestamp: number;
  healthStatus: "healthy" | "degraded" | "unhealthy";
}

export interface SmartAccountHealthMetrics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  totalGaslessTransactions: number;
  lastDeploymentTimestamp: number;
  healthStatus: "healthy" | "degraded" | "unhealthy";
}

export interface Alert {
  severity: "info" | "warning" | "critical";
  component: "ftso" | "fdc" | "relayer" | "smartAccount";
  message: string;
  timestamp: number;
  metadata?: any;
}

/**
 * Monitoring service for tracking health and emitting alerts
 */
export class MonitoringService {
  private ftsoService?: FTSOPriceService;
  private relayerService?: RelayerService;
  private alerts: Alert[] = [];
  private maxAlerts: number = 1000;
  private alertCallbacks: Array<(alert: Alert) => void> = [];
  
  // Metrics tracking
  private fdcMetrics = {
    totalAttestations: 0,
    successfulAttestations: 0,
    failedAttestations: 0,
    attestationTimes: [] as number[],
    lastAttestationTimestamp: 0,
  };

  private smartAccountMetrics = {
    totalDeployments: 0,
    successfulDeployments: 0,
    failedDeployments: 0,
    totalGaslessTransactions: 0,
    lastDeploymentTimestamp: 0,
  };

  private relayerMetrics = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    lastTransactionTimestamp: 0,
  };

  constructor(
    ftsoService?: FTSOPriceService,
    relayerService?: RelayerService
  ) {
    this.ftsoService = ftsoService;
    this.relayerService = relayerService;

    console.log("✅ MonitoringService initialized");
  }

  /**
   * Register a callback to be called when alerts are emitted
   * @param callback Function to call with alert data
   */
  onAlert(callback: (alert: Alert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Emit an alert
   * @param alert Alert to emit
   */
  private emitAlert(alert: Alert): void {
    this.alerts.push(alert);

    // Keep only last N alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    // Log alert
    const emoji = alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️";
    console.log(`${emoji} [${alert.component.toUpperCase()}] ${alert.message}`, alert.metadata || "");

    // Call registered callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        console.error("Error in alert callback:", error);
      }
    }
  }

  /**
   * Get all health metrics
   * @returns Current health metrics for all components
   */
  async getHealthMetrics(): Promise<HealthMetrics> {
    const ftsoHealth = await this.getFTSOHealth();
    const fdcHealth = this.getFDCHealth();
    const relayerHealth = await this.getRelayerHealth();
    const smartAccountHealth = this.getSmartAccountHealth();

    return {
      ftso: ftsoHealth,
      fdc: fdcHealth,
      relayer: relayerHealth,
      smartAccount: smartAccountHealth,
      timestamp: Date.now(),
    };
  }

  /**
   * Get FTSO health metrics
   * @returns FTSO health metrics
   */
  async getFTSOHealth(): Promise<FTSOHealthMetrics> {
    if (!this.ftsoService) {
      return {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        fallbackUsageCount: 0,
        averageResponseTime: 0,
        lastQueryTimestamp: 0,
        healthStatus: "unhealthy",
      };
    }

    const metrics = this.ftsoService.getMetrics();

    const totalQueries = metrics.length;
    const successfulQueries = metrics.filter((m) => m.success).length;
    const failedQueries = metrics.filter((m) => !m.success).length;
    const fallbackUsageCount = metrics.filter((m) => m.source === "fallback").length;

    const responseTimes = metrics.map((m) => m.responseTime);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const lastQueryTimestamp =
      metrics.length > 0 ? metrics[metrics.length - 1].queryTimestamp : 0;

    // Determine health status
    let healthStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (totalQueries === 0) {
      healthStatus = "unhealthy";
    } else {
      const successRate = successfulQueries / totalQueries;
      const fallbackRate = fallbackUsageCount / totalQueries;

      if (successRate < 0.5) {
        healthStatus = "unhealthy";
        this.emitAlert({
          severity: "critical",
          component: "ftso",
          message: `FTSO success rate critically low: ${(successRate * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          metadata: { successRate, totalQueries },
        });
      } else if (successRate < 0.9 || fallbackRate > 0.3) {
        healthStatus = "degraded";
        this.emitAlert({
          severity: "warning",
          component: "ftso",
          message: `FTSO performance degraded: ${(successRate * 100).toFixed(1)}% success, ${(fallbackRate * 100).toFixed(1)}% fallback`,
          timestamp: Date.now(),
          metadata: { successRate, fallbackRate, totalQueries },
        });
      }
    }

    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      fallbackUsageCount,
      averageResponseTime,
      lastQueryTimestamp,
      healthStatus,
    };
  }

  /**
   * Get FDC health metrics
   * @returns FDC health metrics
   */
  getFDCHealth(): FDCHealthMetrics {
    const { totalAttestations, successfulAttestations, failedAttestations, attestationTimes, lastAttestationTimestamp } = this.fdcMetrics;

    const averageAttestationTime =
      attestationTimes.length > 0
        ? attestationTimes.reduce((a, b) => a + b, 0) / attestationTimes.length
        : 0;

    // Determine health status
    let healthStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (totalAttestations > 0) {
      const successRate = successfulAttestations / totalAttestations;

      if (successRate < 0.5) {
        healthStatus = "unhealthy";
        this.emitAlert({
          severity: "critical",
          component: "fdc",
          message: `FDC attestation success rate critically low: ${(successRate * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          metadata: { successRate, totalAttestations },
        });
      } else if (successRate < 0.9) {
        healthStatus = "degraded";
        this.emitAlert({
          severity: "warning",
          component: "fdc",
          message: `FDC attestation success rate degraded: ${(successRate * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          metadata: { successRate, totalAttestations },
        });
      }
    }

    return {
      totalAttestations,
      successfulAttestations,
      failedAttestations,
      averageAttestationTime,
      lastAttestationTimestamp,
      healthStatus,
    };
  }

  /**
   * Get relayer health metrics
   * @returns Relayer health metrics
   */
  async getRelayerHealth(): Promise<RelayerHealthMetrics> {
    if (!this.relayerService) {
      return {
        balance: 0n,
        balanceFormatted: "0 FLR",
        belowThreshold: true,
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        lastTransactionTimestamp: 0,
        healthStatus: "unhealthy",
      };
    }

    const balanceInfo = await this.relayerService.getBalanceInfo();
    const { totalTransactions, successfulTransactions, failedTransactions, lastTransactionTimestamp } = this.relayerMetrics;

    // Determine health status
    let healthStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (balanceInfo.belowThreshold) {
      healthStatus = "degraded";
      this.emitAlert({
        severity: "warning",
        component: "relayer",
        message: `Relayer balance below threshold: ${balanceInfo.balanceFormatted}`,
        timestamp: Date.now(),
        metadata: { balance: balanceInfo.balance.toString(), threshold: balanceInfo.threshold.toString() },
      });
    }

    // Check if balance is critically low (less than 1 FLR)
    if (balanceInfo.balance < ethers.parseEther("1.0")) {
      healthStatus = "unhealthy";
      this.emitAlert({
        severity: "critical",
        component: "relayer",
        message: `Relayer balance critically low: ${balanceInfo.balanceFormatted}`,
        timestamp: Date.now(),
        metadata: { balance: balanceInfo.balance.toString() },
      });
    }

    return {
      balance: balanceInfo.balance,
      balanceFormatted: balanceInfo.balanceFormatted,
      belowThreshold: balanceInfo.belowThreshold,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      lastTransactionTimestamp,
      healthStatus,
    };
  }

  /**
   * Get Smart Account health metrics
   * @returns Smart Account health metrics
   */
  getSmartAccountHealth(): SmartAccountHealthMetrics {
    const { totalDeployments, successfulDeployments, failedDeployments, totalGaslessTransactions, lastDeploymentTimestamp } = this.smartAccountMetrics;

    // Determine health status
    let healthStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (totalDeployments > 0) {
      const successRate = successfulDeployments / totalDeployments;

      if (successRate < 0.5) {
        healthStatus = "unhealthy";
        this.emitAlert({
          severity: "critical",
          component: "smartAccount",
          message: `Smart Account deployment success rate critically low: ${(successRate * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          metadata: { successRate, totalDeployments },
        });
      } else if (successRate < 0.9) {
        healthStatus = "degraded";
        this.emitAlert({
          severity: "warning",
          component: "smartAccount",
          message: `Smart Account deployment success rate degraded: ${(successRate * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          metadata: { successRate, totalDeployments },
        });
      }
    }

    return {
      totalDeployments,
      successfulDeployments,
      failedDeployments,
      totalGaslessTransactions,
      lastDeploymentTimestamp,
      healthStatus,
    };
  }

  /**
   * Record FDC attestation attempt
   * @param success Whether the attestation was successful
   * @param attestationTime Time taken for attestation in milliseconds
   */
  recordFDCAttestation(success: boolean, attestationTime: number): void {
    this.fdcMetrics.totalAttestations++;
    if (success) {
      this.fdcMetrics.successfulAttestations++;
    } else {
      this.fdcMetrics.failedAttestations++;
    }
    this.fdcMetrics.attestationTimes.push(attestationTime);
    this.fdcMetrics.lastAttestationTimestamp = Date.now();

    // Keep only last 100 attestation times
    if (this.fdcMetrics.attestationTimes.length > 100) {
      this.fdcMetrics.attestationTimes.shift();
    }
  }

  /**
   * Record Smart Account deployment
   * @param success Whether the deployment was successful
   */
  recordSmartAccountDeployment(success: boolean): void {
    this.smartAccountMetrics.totalDeployments++;
    if (success) {
      this.smartAccountMetrics.successfulDeployments++;
    } else {
      this.smartAccountMetrics.failedDeployments++;
    }
    this.smartAccountMetrics.lastDeploymentTimestamp = Date.now();
  }

  /**
   * Record gasless transaction
   */
  recordGaslessTransaction(): void {
    this.smartAccountMetrics.totalGaslessTransactions++;
  }

  /**
   * Record relayer transaction
   * @param success Whether the transaction was successful
   */
  recordRelayerTransaction(success: boolean): void {
    this.relayerMetrics.totalTransactions++;
    if (success) {
      this.relayerMetrics.successfulTransactions++;
    } else {
      this.relayerMetrics.failedTransactions++;
    }
    this.relayerMetrics.lastTransactionTimestamp = Date.now();
  }

  /**
   * Get recent alerts
   * @param limit Maximum number of alerts to return
   * @returns Recent alerts
   */
  getRecentAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Start periodic health checks
   * @param intervalMs Interval in milliseconds (default: 60000 = 1 minute)
   */
  startPeriodicHealthChecks(intervalMs: number = 60000): NodeJS.Timeout {
    console.log(`🔄 Starting periodic health checks every ${intervalMs}ms`);

    const interval = setInterval(async () => {
      try {
        const metrics = await this.getHealthMetrics();
        
        // Log overall health status
        const components = [
          { name: "FTSO", status: metrics.ftso.healthStatus },
          { name: "FDC", status: metrics.fdc.healthStatus },
          { name: "Relayer", status: metrics.relayer.healthStatus },
          { name: "Smart Account", status: metrics.smartAccount.healthStatus },
        ];

        const unhealthyComponents = components.filter((c) => c.status === "unhealthy");
        const degradedComponents = components.filter((c) => c.status === "degraded");

        if (unhealthyComponents.length > 0) {
          console.error(
            `🚨 Health Check: ${unhealthyComponents.length} component(s) unhealthy: ${unhealthyComponents.map((c) => c.name).join(", ")}`
          );
        } else if (degradedComponents.length > 0) {
          console.warn(
            `⚠️ Health Check: ${degradedComponents.length} component(s) degraded: ${degradedComponents.map((c) => c.name).join(", ")}`
          );
        } else {
          console.log("✅ Health Check: All components healthy");
        }
      } catch (error) {
        console.error("❌ Error during health check:", error);
      }
    }, intervalMs);

    return interval;
  }

  /**
   * Stop periodic health checks
   * @param interval Interval to stop
   */
  stopPeriodicHealthChecks(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    console.log("🛑 Stopped periodic health checks");
  }
}
