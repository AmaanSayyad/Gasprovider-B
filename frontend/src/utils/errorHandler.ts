/**
 * Frontend Error Handler
 * 
 * Provides error handling utilities for the frontend including:
 * - API request retry logic
 * - Wallet connection error handling
 * - Network mismatch detection
 * - User-friendly error messages
 * 
 * Requirements: 8.1
 */

/**
 * Error types for classification
 */
export enum ErrorType {
  WALLET_CONNECTION = "wallet_connection",
  NETWORK_MISMATCH = "network_mismatch",
  TRANSACTION_REJECTED = "transaction_rejected",
  API_ERROR = "api_error",
  NETWORK_ERROR = "network_error",
  VALIDATION_ERROR = "validation_error",
  UNKNOWN = "unknown",
}

/**
 * Structured error with user-friendly message
 */
export interface UserFacingError {
  type: ErrorType;
  title: string;
  message: string;
  details?: string;
  action?: string;
  originalError?: Error;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Classify error and create user-friendly message
 */
export function classifyError(error: any): UserFacingError {
  // Wallet connection errors
  if (
    error?.code === 4001 ||
    error?.message?.includes("User rejected") ||
    error?.message?.includes("User denied")
  ) {
    return {
      type: ErrorType.TRANSACTION_REJECTED,
      title: "Transaction Rejected",
      message: "You rejected the transaction in your wallet.",
      action: "Please try again and approve the transaction in your wallet.",
      originalError: error,
    };
  }

  if (
    error?.code === -32002 ||
    error?.message?.includes("already pending") ||
    error?.message?.includes("Request of type")
  ) {
    return {
      type: ErrorType.WALLET_CONNECTION,
      title: "Wallet Request Pending",
      message: "Please check your wallet for a pending request.",
      action: "Open your wallet and approve or reject the pending request.",
      originalError: error,
    };
  }

  if (
    error?.message?.includes("No provider") ||
    error?.message?.includes("wallet not found") ||
    error?.message?.includes("MetaMask")
  ) {
    return {
      type: ErrorType.WALLET_CONNECTION,
      title: "Wallet Not Found",
      message: "No wallet detected. Please install MetaMask or another Web3 wallet.",
      action: "Install a wallet extension and refresh the page.",
      originalError: error,
    };
  }

  // Network errors
  if (
    error?.message?.includes("network") ||
    error?.message?.includes("Failed to fetch") ||
    error?.message?.includes("NetworkError") ||
    error instanceof TypeError
  ) {
    return {
      type: ErrorType.NETWORK_ERROR,
      title: "Network Error",
      message: "Failed to connect to the server. Please check your internet connection.",
      action: "Check your connection and try again.",
      originalError: error,
    };
  }

  // Network mismatch
  if (
    error?.message?.includes("wrong network") ||
    error?.message?.includes("chain") ||
    error?.message?.includes("network mismatch")
  ) {
    return {
      type: ErrorType.NETWORK_MISMATCH,
      title: "Wrong Network",
      message: "Please switch to the correct network in your wallet.",
      action: "Open your wallet and switch to the required network.",
      originalError: error,
    };
  }

  // API errors
  if (error?.message?.includes("API") || error?.response) {
    return {
      type: ErrorType.API_ERROR,
      title: "API Error",
      message: error?.message || "An error occurred while communicating with the server.",
      details: error?.response?.data?.details || error?.details,
      action: "Please try again. If the problem persists, contact support.",
      originalError: error,
    };
  }

  // Validation errors
  if (
    error?.message?.includes("Invalid") ||
    error?.message?.includes("validation") ||
    error?.message?.includes("required")
  ) {
    return {
      type: ErrorType.VALIDATION_ERROR,
      title: "Validation Error",
      message: error?.message || "Please check your input and try again.",
      action: "Correct the highlighted fields and submit again.",
      originalError: error,
    };
  }

  // Unknown errors
  return {
    type: ErrorType.UNKNOWN,
    title: "Unexpected Error",
    message: error?.message || "An unexpected error occurred.",
    details: error?.stack,
    action: "Please try again. If the problem persists, contact support.",
    originalError: error,
  };
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = finalConfig.initialDelay;

  for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on user rejection or validation errors
      const classified = classifyError(error);
      if (
        classified.type === ErrorType.TRANSACTION_REJECTED ||
        classified.type === ErrorType.VALIDATION_ERROR
      ) {
        throw error;
      }

      // Log retry attempt
      console.warn(
        `Retry attempt ${attempt + 1}/${finalConfig.maxRetries} failed:`,
        error.message
      );

      // Wait before retry
      if (attempt < finalConfig.maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelay);
      }
    }
  }

  // All retries failed
  throw lastError || new Error("Operation failed after retries");
}

/**
 * Detect current network from wallet
 */
export async function detectCurrentNetwork(): Promise<number | null> {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }

  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    return parseInt(chainId, 16);
  } catch (error) {
    console.error("Failed to detect network:", error);
    return null;
  }
}

/**
 * Check if user is on the correct network
 */
export async function checkNetwork(expectedChainId: number): Promise<boolean> {
  const currentChainId = await detectCurrentNetwork();
  return currentChainId === expectedChainId;
}

/**
 * Request network switch in wallet
 */
export async function requestNetworkSwitch(chainId: number): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet detected");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return true;
  } catch (error: any) {
    // Chain not added to wallet
    if (error.code === 4902) {
      throw new Error(
        "This network is not added to your wallet. Please add it manually."
      );
    }
    throw error;
  }
}

/**
 * Handle wallet connection errors
 */
export async function handleWalletConnection(
  connectFunction: () => Promise<void>
): Promise<void> {
  try {
    await retryWithBackoff(connectFunction, { maxRetries: 2 });
  } catch (error: any) {
    const userError = classifyError(error);
    throw new Error(userError.message);
  }
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: any): string {
  const classified = classifyError(error);
  
  let message = `${classified.title}: ${classified.message}`;
  
  if (classified.action) {
    message += `\n\n${classified.action}`;
  }
  
  if (classified.details && process.env.NODE_ENV === "development") {
    message += `\n\nDetails: ${classified.details}`;
  }
  
  return message;
}

/**
 * Log error for monitoring
 */
export function logError(error: any, context?: Record<string, any>): void {
  const classified = classifyError(error);
  
  console.error(`[${classified.type.toUpperCase()}] ${classified.title}:`, {
    message: classified.message,
    context,
    originalError: classified.originalError,
  });

  // In production, you could send this to a monitoring service
  if (process.env.NODE_ENV === "production") {
    // TODO: Send to monitoring service (e.g., Sentry, LogRocket)
  }
}

/**
 * Create a safe async handler for React components
 */
export function createSafeAsyncHandler<T extends any[]>(
  handler: (...args: T) => Promise<void>,
  onError?: (error: UserFacingError) => void
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await handler(...args);
    } catch (error: any) {
      const userError = classifyError(error);
      logError(error, { handler: handler.name, args });
      
      if (onError) {
        onError(userError);
      } else {
        // Default error handling - could show a toast notification
        console.error("Unhandled error:", userError);
      }
    }
  };
}

// Type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
