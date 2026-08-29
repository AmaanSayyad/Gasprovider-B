/**
 * Error Handler Utility
 * 
 * Centralized error handling with logging, monitoring, and alerting.
 * Provides consistent error responses and detailed logging for debugging.
 * 
 * Requirements: 8.1, 8.5
 */

import { FastifyReply } from "fastify";

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  VALIDATION = "validation",
  DATABASE = "database",
  RPC = "rpc",
  TRANSACTION = "transaction",
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  RATE_LIMIT = "rate_limit",
  INTERNAL = "internal",
  EXTERNAL_API = "external_api",
}

/**
 * Structured error with context
 */
export interface StructuredError {
  message: string;
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
  originalError?: Error;
}

/**
 * Error alert callback type
 */
export type ErrorAlertCallback = (error: StructuredError) => void | Promise<void>;

/**
 * Error Handler Class
 * Manages error logging, monitoring, and alerting
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private alertCallbacks: ErrorAlertCallback[] = [];
  private errorCounts: Map<string, number> = new Map();
  private errorRates: Map<string, { count: number; windowStart: number }> = new Map();
  private readonly RATE_WINDOW_MS = 60000; // 1 minute
  private readonly RATE_THRESHOLD = 10; // 10 errors per minute triggers alert

  private constructor() {
    // Start periodic cleanup of error rate tracking
    setInterval(() => this.cleanupErrorRates(), this.RATE_WINDOW_MS);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Register an alert callback
   */
  public onAlert(callback: ErrorAlertCallback): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Log and handle an error
   */
  public async handleError(
    error: Error | StructuredError,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: Record<string, any>
  ): Promise<StructuredError> {
    const structuredError: StructuredError = this.isStructuredError(error)
      ? error
      : {
          message: error.message,
          code: this.generateErrorCode(category),
          category,
          severity,
          timestamp: new Date(),
          context,
          stack: error.stack,
          originalError: error,
        };

    // Log error with appropriate level
    this.logError(structuredError);

    // Track error counts and rates
    this.trackError(structuredError);

    // Check if we should alert
    if (this.shouldAlert(structuredError)) {
      await this.emitAlert(structuredError);
    }

    return structuredError;
  }

  /**
   * Handle error and send HTTP response
   */
  public async handleHttpError(
    reply: FastifyReply,
    error: Error | StructuredError,
    category: ErrorCategory,
    severity: ErrorSeverity,
    statusCode: number = 500,
    context?: Record<string, any>
  ): Promise<void> {
    const structuredError = await this.handleError(error, category, severity, context);

    // Send appropriate HTTP response
    reply.code(statusCode).send({
      error: structuredError.message,
      code: structuredError.code,
      details: context,
    });
  }

  /**
   * Wrap database operations with error handling
   */
  public async wrapDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      throw await this.handleError(
        error,
        ErrorCategory.DATABASE,
        ErrorSeverity.ERROR,
        {
          operation: operationName,
          ...context,
        }
      );
    }
  }

  /**
   * Wrap RPC operations with retry logic
   */
  public async wrapRpcOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Log retry attempt
        console.warn(
          `RPC operation "${operationName}" failed (attempt ${attempt + 1}/${maxRetries}):`,
          error.message
        );

        // Wait before retry with exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw await this.handleError(
      lastError || new Error("RPC operation failed"),
      ErrorCategory.RPC,
      ErrorSeverity.ERROR,
      {
        operation: operationName,
        attempts: maxRetries,
        ...context,
      }
    );
  }

  /**
   * Wrap transaction operations with timeout handling
   */
  public async wrapTransactionOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    timeout: number = 300000, // 5 minutes
    context?: Record<string, any>
  ): Promise<T> {
    try {
      return await Promise.race([
        operation(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Transaction timeout after ${timeout}ms`)),
            timeout
          )
        ),
      ]);
    } catch (error: any) {
      throw await this.handleError(
        error,
        ErrorCategory.TRANSACTION,
        error.message.includes("timeout") ? ErrorSeverity.WARNING : ErrorSeverity.ERROR,
        {
          operation: operationName,
          timeout,
          ...context,
        }
      );
    }
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: StructuredError[];
  } {
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    for (const [key, count] of this.errorCounts.entries()) {
      const [category, severity] = key.split(":");
      errorsByCategory[category] = (errorsByCategory[category] || 0) + count;
      errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + count;
    }

    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: [], // Could implement a circular buffer for recent errors
    };
  }

  /**
   * Reset error statistics (for testing)
   */
  public resetStatistics(): void {
    this.errorCounts.clear();
    this.errorRates.clear();
  }

  // Private helper methods

  private isStructuredError(error: any): error is StructuredError {
    return (
      error &&
      typeof error === "object" &&
      "code" in error &&
      "category" in error &&
      "severity" in error
    );
  }

  private generateErrorCode(category: ErrorCategory): string {
    const prefix = category.toUpperCase().replace("_", "");
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}_${timestamp}`;
  }

  private logError(error: StructuredError): void {
    const emoji = this.getSeverityEmoji(error.severity);
    const logMessage = `${emoji} [${error.category.toUpperCase()}] ${error.message}`;

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.ERROR:
        console.error(logMessage, {
          code: error.code,
          context: error.context,
          stack: error.stack,
        });
        break;
      case ErrorSeverity.WARNING:
        console.warn(logMessage, {
          code: error.code,
          context: error.context,
        });
        break;
      case ErrorSeverity.INFO:
        console.info(logMessage, {
          code: error.code,
          context: error.context,
        });
        break;
    }
  }

  private trackError(error: StructuredError): void {
    // Track total counts by category and severity
    const key = `${error.category}:${error.severity}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    // Track error rate
    const rateKey = error.category;
    const now = Date.now();
    const rateData = this.errorRates.get(rateKey);

    if (!rateData || now - rateData.windowStart > this.RATE_WINDOW_MS) {
      // Start new window
      this.errorRates.set(rateKey, { count: 1, windowStart: now });
    } else {
      // Increment count in current window
      rateData.count++;
    }
  }

  private shouldAlert(error: StructuredError): boolean {
    // Always alert on critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      return true;
    }

    // Check error rate
    const rateData = this.errorRates.get(error.category);
    if (rateData && rateData.count >= this.RATE_THRESHOLD) {
      return true;
    }

    return false;
  }

  private async emitAlert(error: StructuredError): Promise<void> {
    for (const callback of this.alertCallbacks) {
      try {
        await callback(error);
      } catch (callbackError) {
        console.error("Error in alert callback:", callbackError);
      }
    }
  }

  private cleanupErrorRates(): void {
    const now = Date.now();
    for (const [key, data] of this.errorRates.entries()) {
      if (now - data.windowStart > this.RATE_WINDOW_MS * 2) {
        this.errorRates.delete(key);
      }
    }
  }

  private getSeverityEmoji(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "🚨";
      case ErrorSeverity.ERROR:
        return "❌";
      case ErrorSeverity.WARNING:
        return "⚠️";
      case ErrorSeverity.INFO:
        return "ℹ️";
      default:
        return "❓";
    }
  }
}

/**
 * Get global error handler instance
 */
export function getErrorHandler(): ErrorHandler {
  return ErrorHandler.getInstance();
}

/**
 * Convenience function to wrap database operations
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, any>
): Promise<T> {
  return getErrorHandler().wrapDatabaseOperation(operation, operationName, context);
}

/**
 * Convenience function to wrap RPC operations with retry
 */
export async function withRpcRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3,
  context?: Record<string, any>
): Promise<T> {
  return getErrorHandler().wrapRpcOperation(operation, operationName, maxRetries, context);
}

/**
 * Convenience function to wrap transaction operations with timeout
 */
export async function withTransactionTimeout<T>(
  operation: () => Promise<T>,
  operationName: string,
  timeout: number = 300000,
  context?: Record<string, any>
): Promise<T> {
  return getErrorHandler().wrapTransactionOperation(
    operation,
    operationName,
    timeout,
    context
  );
}
