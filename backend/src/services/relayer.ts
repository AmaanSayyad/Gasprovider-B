import { ethers } from "ethers";
import {
  GaslessTransaction,
  Call,
} from "../types/smartaccount";
import {
  TransactionValidationResult,
  TransactionSubmissionResult,
  TransactionStatus,
  RelayerBalanceInfo,
} from "../types/relayer";

/**
 * Service for executing gasless transactions on behalf of users
 * Handles transaction validation, submission, tracking, and balance monitoring
 */
export class RelayerService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private loggingEnabled: boolean;
  private balanceThreshold: bigint;
  private chainId: number;

  // Smart Account ABI (minimal interface for execution)
  private readonly smartAccountAbi = [
    "function execute(address to, uint256 value, bytes calldata data) external",
    "function executeBatch(address[] calldata to, uint256[] calldata value, bytes[] calldata data) external",
    "function getNonce() external view returns (uint256)",
    "function owner() external view returns (address)",
  ];

  constructor(
    rpcUrl: string,
    relayerPrivateKey: string,
    balanceThresholdFLR: string = "10.0"
  ) {
    if (!relayerPrivateKey || relayerPrivateKey === "0x" + "0".repeat(64)) {
      throw new Error("RELAYER_PRIVATE_KEY not configured or is placeholder");
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(relayerPrivateKey, this.provider);
    this.balanceThreshold = ethers.parseEther(balanceThresholdFLR);
    this.loggingEnabled = process.env.RELAYER_ENABLE_LOGGING === "true";
    this.chainId = 0; // Will be set during initialization

    this.log("✅ RelayerService initialized", {
      relayerAddress: this.wallet.address,
      rpcUrl,
      balanceThreshold: balanceThresholdFLR + " FLR",
    });

    // Initialize chain ID
    this.initializeChainId();
  }

  /**
   * Initialize chain ID from provider
   */
  private async initializeChainId(): Promise<void> {
    try {
      const network = await this.provider.getNetwork();
      this.chainId = Number(network.chainId);
      this.log(`🔗 Connected to chain ID: ${this.chainId}`);
    } catch (error: any) {
      console.error("❌ Error initializing chain ID:", error);
    }
  }

  /**
   * Get relayer address
   * @returns Relayer wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get relayer balance
   * @returns Balance in wei
   */
  async getBalance(): Promise<bigint> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);

      this.log(`💰 Relayer balance: ${ethers.formatEther(balance)} FLR`);

      // Check if below threshold
      if (balance < this.balanceThreshold) {
        console.warn(
          `⚠️ WARNING: Relayer balance (${ethers.formatEther(balance)} FLR) is below threshold (${ethers.formatEther(this.balanceThreshold)} FLR)`
        );
      }

      return balance;
    } catch (error: any) {
      console.error("❌ Error getting relayer balance:", error);
      throw new Error(`Failed to get relayer balance: ${error.message}`);
    }
  }

  /**
   * Get detailed relayer balance information
   * @returns Balance info including threshold check
   */
  async getBalanceInfo(): Promise<RelayerBalanceInfo> {
    const balance = await this.getBalance();
    const belowThreshold = balance < this.balanceThreshold;

    return {
      address: this.wallet.address,
      balance,
      balanceFormatted: ethers.formatEther(balance) + " FLR",
      chainId: this.chainId,
      belowThreshold,
      threshold: this.balanceThreshold,
    };
  }

  /**
   * Validate a gasless transaction before submission
   * @param tx Gasless transaction to validate
   * @returns Validation result
   */
  async validateTransaction(
    tx: GaslessTransaction
  ): Promise<TransactionValidationResult> {
    try {
      this.log(`🔍 Validating gasless transaction for Smart Account ${tx.smartAccountAddress}`);

      // Step 1: Validate Smart Account address format
      try {
        ethers.getAddress(tx.smartAccountAddress);
      } catch (error) {
        return {
          valid: false,
          error: "Invalid Smart Account address format",
        };
      }

      // Step 2: Validate calls array (structural check before network calls)
      if (!tx.calls || tx.calls.length === 0) {
        return {
          valid: false,
          error: "Transaction must contain at least one call",
        };
      }

      // Step 3: Validate each call (structural checks before network calls)
      for (let i = 0; i < tx.calls.length; i++) {
        const call = tx.calls[i];

        // Validate target address
        try {
          ethers.getAddress(call.to);
        } catch (error) {
          return {
            valid: false,
            error: `Invalid target address in call ${i}`,
          };
        }

        // Validate value
        if (typeof call.value !== "bigint") {
          return {
            valid: false,
            error: `Invalid value type in call ${i}`,
          };
        }

        // Validate data
        if (!call.data || !call.data.startsWith("0x")) {
          return {
            valid: false,
            error: `Invalid call data in call ${i}`,
          };
        }
      }

      // Step 4: Verify user signature (structural check before network calls)
      // Note: In a real implementation, this would verify the signature
      // against the Smart Account owner's address
      // For now, we check that a signature is present
      if (!tx.signature || tx.signature.length < 132) {
        // 0x + 130 hex chars (65 bytes)
        return {
          valid: false,
          error: "Invalid or missing signature",
        };
      }

      // Step 5: Check if Smart Account is deployed (network call)
      const code = await this.provider.getCode(tx.smartAccountAddress);
      if (code === "0x") {
        return {
          valid: false,
          error: "Smart Account is not deployed",
        };
      }

      // Step 6: Get Smart Account contract instance and verify nonce (network call)
      const smartAccount = new ethers.Contract(
        tx.smartAccountAddress,
        this.smartAccountAbi,
        this.provider
      );

      try {
        const currentNonce = await smartAccount.getNonce();
        if (BigInt(tx.nonce) !== currentNonce) {
          return {
            valid: false,
            error: `Invalid nonce: expected ${currentNonce}, got ${tx.nonce}`,
          };
        }
      } catch (error: any) {
        return {
          valid: false,
          error: `Failed to verify nonce: ${error.message}`,
        };
      }

      this.log(`✅ Transaction validation passed`, {
        smartAccountAddress: tx.smartAccountAddress,
        numCalls: tx.calls.length,
        nonce: tx.nonce,
      });

      return {
        valid: true,
      };
    } catch (error: any) {
      console.error("❌ Error validating transaction:", error);
      return {
        valid: false,
        error: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Submit a gasless transaction onchain
   * @param tx Gasless transaction to submit
   * @returns Transaction submission result with hash and gas info
   */
  async submitTransaction(
    tx: GaslessTransaction
  ): Promise<TransactionSubmissionResult> {
    try {
      this.log(`📤 Submitting gasless transaction for Smart Account ${tx.smartAccountAddress}`);

      // Validate transaction first
      const validation = await this.validateTransaction(tx);
      if (!validation.valid) {
        throw new Error(`Transaction validation failed: ${validation.error}`);
      }

      // Get Smart Account contract instance
      const smartAccount = new ethers.Contract(
        tx.smartAccountAddress,
        this.smartAccountAbi,
        this.wallet // Connect with relayer wallet to pay gas
      );

      // Prepare transaction based on number of calls
      let txResponse: ethers.ContractTransactionResponse;

      if (tx.calls.length === 1) {
        // Single call - use execute()
        const call = tx.calls[0];
        this.log(`📝 Executing single call to ${call.to}`);

        // Estimate gas
        const gasEstimate = await smartAccount.execute.estimateGas(
          call.to,
          call.value,
          call.data
        );

        this.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);

        // Submit transaction
        txResponse = await smartAccount.execute(
          call.to,
          call.value,
          call.data,
          {
            gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
          }
        );
      } else {
        // Multiple calls - use executeBatch()
        const targets = tx.calls.map(c => c.to);
        const values = tx.calls.map(c => c.value);
        const datas = tx.calls.map(c => c.data);

        this.log(`📝 Executing batch of ${tx.calls.length} calls`);

        // Estimate gas
        const gasEstimate = await smartAccount.executeBatch.estimateGas(
          targets,
          values,
          datas
        );

        this.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);

        // Submit transaction
        txResponse = await smartAccount.executeBatch(
          targets,
          values,
          datas,
          {
            gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
          }
        );
      }

      this.log(`⏳ Transaction submitted, waiting for confirmation...`, {
        txHash: txResponse.hash,
      });

      // Wait for transaction confirmation
      const receipt = await txResponse.wait();

      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }

      if (receipt.status === 0) {
        throw new Error("Transaction reverted");
      }

      const result: TransactionSubmissionResult = {
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.gasPrice,
      };

      this.log(`✅ Transaction confirmed`, {
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasPrice.toString(),
        gasCost: ethers.formatEther(receipt.gasUsed * receipt.gasPrice) + " FLR",
      });

      return result;
    } catch (error: any) {
      console.error("❌ Error submitting transaction:", error);
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction status
   * @param txHash Transaction hash to track
   * @returns Transaction status information
   */
  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    try {
      this.log(`🔍 Checking transaction status for ${txHash}`);

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        // Transaction not yet mined
        return {
          txHash,
          status: "pending",
          confirmations: 0,
        };
      }

      // Get current block number to calculate confirmations
      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      // Check if transaction succeeded or failed
      if (receipt.status === 0) {
        return {
          txHash,
          status: "failed",
          confirmations,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          error: "Transaction reverted",
        };
      }

      return {
        txHash,
        status: "confirmed",
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      };
    } catch (error: any) {
      console.error(`❌ Error getting transaction status for ${txHash}:`, error);
      throw new Error(`Failed to get transaction status: ${error.message}`);
    }
  }

  /**
   * Wait for transaction confirmation
   * @param txHash Transaction hash to wait for
   * @param confirmations Number of confirmations to wait for (default: 1)
   * @param timeout Timeout in milliseconds (default: 120000 = 2 minutes)
   * @returns Transaction status when confirmed
   */
  async waitForConfirmation(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 120000
  ): Promise<TransactionStatus> {
    try {
      this.log(`⏳ Waiting for ${confirmations} confirmation(s) for ${txHash}`);

      const startTime = Date.now();

      while (true) {
        // Check if timeout exceeded
        if (Date.now() - startTime > timeout) {
          throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
        }

        const status = await this.getTransactionStatus(txHash);

        if (status.status === "failed") {
          throw new Error(`Transaction failed: ${status.error}`);
        }

        if (status.status === "confirmed" && status.confirmations >= confirmations) {
          this.log(`✅ Transaction confirmed with ${status.confirmations} confirmation(s)`);
          return status;
        }

        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: any) {
      console.error(`❌ Error waiting for transaction confirmation:`, error);
      throw error;
    }
  }

  /**
   * Log message if logging is enabled
   * @param message Message to log
   * @param data Optional data to log
   */
  private log(message: string, data?: any): void {
    if (this.loggingEnabled) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }
}
