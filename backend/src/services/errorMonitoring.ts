/**
 * Error Monitoring Service
 * 
 * Tracks error rates, patterns, and provides alerting for critical issues.
 * Integrates with the error handler to provide comprehensive monitoring.
 * 
 * Requirements: 8.5
 */

import {
  getErrorHandler,
  StructuredError,
  ErrorCategory,
  ErrorSeverity,
} from "../utils/errorHandler";

/**
 * Error pattern detection
 */
interface ErrorPattern {
  category: ErrorCategory;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedChains?: Set<number>;
  affectedUsers?: Set<string>;
}

/**
 * Alert configuration
 */
interface AlertConfig {
  enabled: boolean;
  criticalThreshold: number; // Errors per minute
  errorThreshold: number;
  warningThreshold: number;
  alertCooldown: number; // Milliseconds between alerts
}

/**
 * Monitoring metrics
 */
export interface MonitoringMetrics {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorRate: number; // Errors per minute
  topErrors: Array<{
    category: ErrorCategory;
    count: number;
    lastOccurrence: Date;
  }>;
  affectedChains: number[];
  affectedUsers: number;
  uptime: number; // Seconds
}

/**
 * Error Monitoring Service
 */
export class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private recentErrors: StructuredError[] = [];
  private readonly MAX_RECENT_ERRORS = 100;
  private startTime: Date = new Date();
  private lastAlertTime: Map<string, number> = new Map();

  private alertConfig: AlertConfig = {
    enabled: true,
    criticalThreshold: 10,
    errorThreshold: 20,
    warningThreshold: 50,
    alertCooldown: 300000, // 5 minutes
  };

  private constructor() {
    // Register with error handler
    const errorHandler = getErrorHandler();
    errorHandler.onAlert((error) => this.handleError(error));

    // Start periodic cleanup
    setInterval(() => this.cleanup(), 60000); // Every minute

    console.log("✅ Error Monitoring Service initialized");
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  /**
   * Handle an error from the error handler
   */
  private handleError(error: StructuredError): void {
    // Add to recent errors
    this.recentErrors.push(error);
    if (this.recentErrors.length > this.MAX_RECENT_ERRORS) {
      this.recentErrors.shift();
    }

    // Track error pattern
    this.trackErrorPattern(error);

    // Check if we should send an alert
    this.checkAlertThresholds(error);
  }

  /**
   * Track error patterns
   */
  private trackErrorPattern(error: StructuredError): void {
    const key = `${error.category}:${error.severity}`;
    let pattern = this.errorPatterns.get(key);

    if (!pattern) {
      pattern = {
        category: error.category,
        count: 0,
        firstOccurrence: error.timestamp,
        lastOccurrence: error.timestamp,
        affectedChains: new Set(),
        affectedUsers: new Set(),
      };
      this.errorPatterns.set(key, pattern);
    }

    pattern.count++;
    pattern.lastOccurrence = error.timestamp;

    // Track affected chains and users
    if (error.context?.chainId) {
      pattern.affectedChains?.add(error.context.chainId);
    }
    if (error.context?.userAddress) {
      pattern.affectedUsers?.add(error.context.userAddress);
    }
  }

  /**
   * Check if alert thresholds are exceeded
   */
  private checkAlertThresholds(error: StructuredError): void {
    if (!this.alertConfig.enabled) {
      return;
    }

    const metrics = this.getMetrics();
    const alertKey = error.category;
    const lastAlert = this.lastAlertTime.get(alertKey) || 0;
    const now = Date.now();

    // Check cooldown
    if (now - lastAlert < this.alertConfig.alertCooldown) {
      return;
    }

    // Check thresholds
    let shouldAlert = false;
    let alertMessage = "";

    if (
      error.severity === ErrorSeverity.CRITICAL &&
      metrics.errorRate > this.alertConfig.criticalThreshold
    ) {
      shouldAlert = true;
      alertMessage = `🚨 CRITICAL: High error rate detected (${metrics.errorRate.toFixed(1)}/min) for ${error.category}`;
    } else if (
      error.severity === ErrorSeverity.ERROR &&
      metrics.errorRate > this.alertConfig.errorThreshold
    ) {
      shouldAlert = true;
      alertMessage = `❌ ERROR: Elevated error rate (${metrics.errorRate.toFixed(1)}/min) for ${error.category}`;
    } else if (metrics.errorRate > this.alertConfig.warningThreshold) {
      shouldAlert = true;
      alertMessage = `⚠️ WARNING: High error rate (${metrics.errorRate.toFixed(1)}/min) for ${error.category}`;
    }

    if (shouldAlert) {
      this.sendAlert(alertMessage, error, metrics);
      this.lastAlertTime.set(alertKey, now);
    }
  }

  /**
   * Send an alert
   */
  private sendAlert(
    message: string,
    error: StructuredError,
    metrics: MonitoringMetrics
  ): void {
    console.error(message, {
      error: {
        category: error.category,
        severity: error.severity,
        message: error.message,
        context: error.context,
      },
      metrics: {
        totalErrors: metrics.totalErrors,
        errorRate: metrics.errorRate,
        affectedChains: metrics.affectedChains,
        affectedUsers: metrics.affectedUsers,
      },
    });

    // In production, send to alerting service (e.g., PagerDuty, Slack, email)
    if (process.env.NODE_ENV === "production") {
      // TODO: Integrate with alerting service
      // - Send to Slack webhook
      // - Send to PagerDuty
      // - Send email notification
      // - Trigger incident response
    }
  }

  /**
   * Get monitoring metrics
   */
  public getMetrics(): MonitoringMetrics {
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const affectedChainsSet = new Set<number>();
    const affectedUsersSet = new Set<string>();

    // Aggregate from patterns
    for (const pattern of this.errorPatterns.values()) {
      errorsByCategory[pattern.category] =
        (errorsByCategory[pattern.category] || 0) + pattern.count;

      // Add affected chains and users
      if (pattern.affectedChains) {
        for (const chainId of pattern.affectedChains) {
          affectedChainsSet.add(chainId);
        }
      }
      if (pattern.affectedUsers) {
        for (const user of pattern.affectedUsers) {
          affectedUsersSet.add(user);
        }
      }
    }

    // Aggregate from recent errors
    for (const error of this.recentErrors) {
      errorsBySeverity[error.severity] =
        (errorsBySeverity[error.severity] || 0) + 1;
    }

    // Calculate error rate (errors per minute)
    const uptimeMinutes = (Date.now() - this.startTime.getTime()) / 60000;
    const totalErrors = this.recentErrors.length;
    const errorRate = uptimeMinutes > 0 ? totalErrors / uptimeMinutes : 0;

    // Get top errors
    const topErrors = Array.from(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((pattern) => ({
        category: pattern.category,
        count: pattern.count,
        lastOccurrence: pattern.lastOccurrence,
      }));

    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      errorRate,
      topErrors,
      affectedChains: Array.from(affectedChainsSet),
      affectedUsers: affectedUsersSet.size,
      uptime: (Date.now() - this.startTime.getTime()) / 1000,
    };
  }

  /**
   * Get recent errors
   */
  public getRecentErrors(limit: number = 50): StructuredError[] {
    return this.recentErrors.slice(-limit);
  }

  /**
   * Get error patterns
   */
  public getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values()).sort(
      (a, b) => b.count - a.count
    );
  }

  /**
   * Configure alerts
   */
  public configureAlerts(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    console.log("✅ Alert configuration updated:", this.alertConfig);
  }

  /**
   * Reset monitoring data (for testing)
   */
  public reset(): void {
    this.errorPatterns.clear();
    this.recentErrors = [];
    this.lastAlertTime.clear();
    this.startTime = new Date();
    console.log("🔄 Error monitoring data reset");
  }

  /**
   * Cleanup old error patterns
   */
  private cleanup(): void {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    // Remove patterns older than 1 hour with no recent activity
    for (const [key, pattern] of this.errorPatterns.entries()) {
      if (now - pattern.lastOccurrence.getTime() > ONE_HOUR) {
        this.errorPatterns.delete(key);
      }
    }

    // Keep only recent errors from last hour
    const oneHourAgo = new Date(now - ONE_HOUR);
    this.recentErrors = this.recentErrors.filter(
      (error) => error.timestamp > oneHourAgo
    );
  }

  /**
   * Generate monitoring report
   */
  public generateReport(): string {
    const metrics = this.getMetrics();
    const patterns = this.getErrorPatterns();

    let report = "📊 Error Monitoring Report\n";
    report += "=".repeat(50) + "\n\n";

    report += `Uptime: ${(metrics.uptime / 60).toFixed(1)} minutes\n`;
    report += `Total Errors: ${metrics.totalErrors}\n`;
    report += `Error Rate: ${metrics.errorRate.toFixed(2)} errors/min\n`;
    report += `Affected Chains: ${metrics.affectedChains.length}\n`;
    report += `Affected Users: ${metrics.affectedUsers}\n\n`;

    report += "Errors by Category:\n";
    for (const [category, count] of Object.entries(metrics.errorsByCategory)) {
      report += `  ${category}: ${count}\n`;
    }
    report += "\n";

    report += "Errors by Severity:\n";
    for (const [severity, count] of Object.entries(metrics.errorsBySeverity)) {
      report += `  ${severity}: ${count}\n`;
    }
    report += "\n";

    if (patterns.length > 0) {
      report += "Top Error Patterns:\n";
      for (const pattern of patterns.slice(0, 5)) {
        report += `  ${pattern.category}: ${pattern.count} occurrences\n`;
        report += `    Last: ${pattern.lastOccurrence.toISOString()}\n`;
      }
    }

    return report;
  }
}

/**
 * Get singleton instance
 */
export function getErrorMonitoringService(): ErrorMonitoringService {
  return ErrorMonitoringService.getInstance();
}

/**
 * Initialize error monitoring
 */
export function initializeErrorMonitoring(config?: Partial<AlertConfig>): void {
  const service = getErrorMonitoringService();
  if (config) {
    service.configureAlerts(config);
  }
  console.log("✅ Error monitoring initialized");
}
