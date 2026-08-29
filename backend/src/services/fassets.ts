import { ethers } from "ethers";
import {
  Agent,
  Reservation,
  RedemptionTicket,
  AssetType,
  FAssetConfig,
} from "../types/fassets";
import { AttestationProof } from "../types/fdc";
import { getRelayerPrivateKey } from "../utils/keys";

/**
 * Service for managing FAssets integration
 * Handles minting, redemption, and FAsset validation
 */
export class FAssetsService {
  private provider: ethers.JsonRpcProvider;
  private fAssetConfigs: Map<string, FAssetConfig> = new Map();
  private assetManagerContracts: Map<string, ethers.Contract> = new Map();
  private loggingEnabled: boolean;

  // AssetManager ABI (minimal interface for required functions)
  private readonly assetManagerAbi = [
    "function getAgents() external view returns (address[] memory)",
    "function getAgentInfo(address agent) external view returns (tuple(uint256 collateralRatio, uint256 mintingFee, uint256 availableLots, uint8 status))",
    "function reserveCollateral(address agent, uint256 lots) external payable returns (uint256 reservationId, string memory paymentAddress, string memory paymentReference, uint256 expiresAt)",
    "function executeMinting(uint256 reservationId, bytes memory proof) external returns (uint256 mintedAmount)",
    "function redeem(uint256 amount, string memory underlyingAddress) external returns (uint256 ticketId)",
    "function getRedemptionTicket(uint256 ticketId) external view returns (tuple(uint256 amount, string memory underlyingAddress, uint256 estimatedTime, uint8 status))",
  ];

  constructor(
    rpcUrl: string,
    fAssetConfigs: FAssetConfig[]
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl, 114, {
      staticNetwork: true,
      polling: false,
    });
    this.loggingEnabled = process.env.FASSETS_ENABLE_LOGGING === "true";

    // Initialize FAsset configurations
    for (const config of fAssetConfigs) {
      this.fAssetConfigs.set(config.address.toLowerCase(), config);
      
      // Initialize AssetManager contract for each FAsset
      const assetManagerContract = new ethers.Contract(
        config.assetManagerAddress,
        this.assetManagerAbi,
        this.provider
      );
      this.assetManagerContracts.set(config.address.toLowerCase(), assetManagerContract);
    }

    this.log("✅ FAssetsService initialized", {
      rpcUrl,
      fAssetCount: fAssetConfigs.length,
      fAssets: fAssetConfigs.map(c => ({ symbol: c.symbol, address: c.address })),
    });
  }

  /**
   * Check if a token address is a registered FAsset
   * @param tokenAddress Token address to check
   * @returns True if the address is a registered FAsset
   */
  isFAsset(tokenAddress: string): boolean {
    const normalized = tokenAddress.toLowerCase();
    const isFAsset = this.fAssetConfigs.has(normalized);
    
    this.log(`🔍 Checking if ${tokenAddress} is FAsset: ${isFAsset}`);
    
    return isFAsset;
  }

  /**
   * Get FAsset configuration by token address
   * @param tokenAddress FAsset token address
   * @returns FAsset configuration
   */
  getFAssetConfig(tokenAddress: string): FAssetConfig | undefined {
    const normalized = tokenAddress.toLowerCase();
    return this.fAssetConfigs.get(normalized);
  }

  /**
   * Get underlying asset type for a FAsset
   * @param fAssetAddress FAsset token address
   * @returns Underlying asset type (BTC, DOGE, XRP, LTC)
   */
  getUnderlyingAsset(fAssetAddress: string): AssetType | undefined {
    const config = this.getFAssetConfig(fAssetAddress);
    return config?.assetType;
  }

  /**
   * Get FTSO feed ID for the underlying asset of a FAsset
   * @param fAssetAddress FAsset token address
   * @returns FTSO feed ID for the underlying asset (e.g., BTC/USD for FBTC)
   */
  getUnderlyingFeed(fAssetAddress: string): string | undefined {
    const config = this.getFAssetConfig(fAssetAddress);
    if (!config) {
      this.log(`❌ No config found for FAsset ${fAssetAddress}`);
      return undefined;
    }

    this.log(`✅ Found underlying feed for ${config.symbol}: ${config.ftsoFeedId}`);
    return config.ftsoFeedId;
  }

  /**
   * Get all registered FAsset addresses
   * @returns Array of FAsset token addresses
   */
  getAllFAssetAddresses(): string[] {
    return Array.from(this.fAssetConfigs.keys());
  }

  /**
   * Get all registered FAsset configurations
   * @returns Array of FAsset configurations
   */
  getAllFAssetConfigs(): FAssetConfig[] {
    return Array.from(this.fAssetConfigs.values());
  }

  /**
   * Get available agents for a specific asset type
   * @param assetType Asset type (BTC, DOGE, XRP, LTC)
   * @returns Array of active agents sorted by fees and availability
   */
  async getAgents(assetType: AssetType): Promise<Agent[]> {
    try {
      this.log(`🔍 Querying agents for ${assetType}`);

      // Find the FAsset config for this asset type
      const config = Array.from(this.fAssetConfigs.values()).find(
        c => c.assetType === assetType
      );

      if (!config) {
        throw new Error(`No FAsset configuration found for asset type ${assetType}`);
      }

      const assetManager = this.assetManagerContracts.get(config.address.toLowerCase());
      if (!assetManager) {
        throw new Error(`No AssetManager contract found for ${assetType}`);
      }

      // Get list of agent addresses
      const agentAddresses: string[] = await assetManager.getAgents();

      this.log(`📋 Found ${agentAddresses.length} agents for ${assetType}`);

      // Query info for each agent
      const agents: Agent[] = [];
      for (const agentAddress of agentAddresses) {
        try {
          const agentInfo = await assetManager.getAgentInfo(agentAddress);
          
          // Parse agent info
          const agent: Agent = {
            address: agentAddress,
            collateralRatio: Number(agentInfo.collateralRatio) / 10000, // Convert basis points to percentage
            mintingFee: Number(agentInfo.mintingFee) / 10000, // Convert basis points to percentage
            availableLots: Number(agentInfo.availableLots),
            status: this.parseAgentStatus(Number(agentInfo.status)),
          };

          agents.push(agent);
        } catch (error: any) {
          console.error(`❌ Error querying agent ${agentAddress}:`, error.message);
          // Continue with other agents
        }
      }

      // Filter active agents with available lots
      const activeAgents = agents.filter(
        a => a.status === "active" && a.availableLots > 0
      );

      // Sort by minting fee (ascending) and then by available lots (descending)
      activeAgents.sort((a, b) => {
        if (a.mintingFee !== b.mintingFee) {
          return a.mintingFee - b.mintingFee;
        }
        return b.availableLots - a.availableLots;
      });

      this.log(`✅ Found ${activeAgents.length} active agents for ${assetType}`);

      return activeAgents;
    } catch (error: any) {
      console.error(`❌ Error getting agents for ${assetType}:`, error);
      throw new Error(`Failed to get agents: ${error.message}`);
    }
  }

  /**
   * Reserve collateral with an agent for minting
   * @param agentAddress Agent address
   * @param lots Number of lots to mint
   * @param assetType Asset type
   * @returns Reservation details including payment instructions
   */
  async reserveCollateral(
    agentAddress: string,
    lots: number,
    assetType: AssetType
  ): Promise<Reservation> {
    try {
      this.log(`📝 Reserving ${lots} lots with agent ${agentAddress} for ${assetType}`);

      // Find the FAsset config for this asset type
      const config = Array.from(this.fAssetConfigs.values()).find(
        c => c.assetType === assetType
      );

      if (!config) {
        throw new Error(`No FAsset configuration found for asset type ${assetType}`);
      }

      const assetManager = this.assetManagerContracts.get(config.address.toLowerCase());
      if (!assetManager) {
        throw new Error(`No AssetManager contract found for ${assetType}`);
      }

      // Get signer from env (RELAYER_PRIVATE_KEY / PRIVATE_KEY / DISTRIBUTOR_PRIVATE_KEY)
      const privateKey = getRelayerPrivateKey();
      if (!privateKey) {
        throw new Error("RELAYER_PRIVATE_KEY (or PRIVATE_KEY / DISTRIBUTOR_PRIVATE_KEY) not configured");
      }

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const assetManagerWithSigner = assetManager.connect(wallet);

      // Call reserveCollateral (may require payment for reservation fee)
      const tx = await assetManagerWithSigner.reserveCollateral(agentAddress, lots, {
        value: ethers.parseEther("0.1"), // Reservation fee (adjust as needed)
      });

      this.log(`⏳ Waiting for reservation transaction confirmation...`);
      const receipt = await tx.wait();

      // Parse the return values from the transaction
      // Note: This is a simplified version - actual implementation would need to parse events
      const reservationId = receipt!.logs[0]?.topics[1] || "0x0";
      
      // For now, return placeholder values - actual implementation would parse from events
      const reservation: Reservation = {
        reservationId: reservationId,
        agentAddress,
        lots,
        paymentAddress: "placeholder_payment_address", // Would be parsed from event
        paymentReference: "placeholder_reference", // Would be parsed from event
        expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      this.log(`✅ Collateral reserved successfully`, {
        reservationId: reservation.reservationId,
        txHash: receipt!.hash,
      });

      return reservation;
    } catch (error: any) {
      console.error(`❌ Error reserving collateral:`, error);
      throw new Error(`Failed to reserve collateral: ${error.message}`);
    }
  }

  /**
   * Execute minting after underlying payment is confirmed
   * @param reservationId Reservation ID
   * @param paymentProof FDC attestation proof of underlying payment
   * @param assetType Asset type
   * @returns Minted amount
   */
  async executeMinting(
    reservationId: string,
    paymentProof: AttestationProof,
    assetType: AssetType
  ): Promise<bigint> {
    try {
      this.log(`🏭 Executing minting for reservation ${reservationId}`);

      // Find the FAsset config for this asset type
      const config = Array.from(this.fAssetConfigs.values()).find(
        c => c.assetType === assetType
      );

      if (!config) {
        throw new Error(`No FAsset configuration found for asset type ${assetType}`);
      }

      const assetManager = this.assetManagerContracts.get(config.address.toLowerCase());
      if (!assetManager) {
        throw new Error(`No AssetManager contract found for ${assetType}`);
      }

      // Get signer from env
      const privateKey = getRelayerPrivateKey();
      if (!privateKey) {
        throw new Error("RELAYER_PRIVATE_KEY (or PRIVATE_KEY / DISTRIBUTOR_PRIVATE_KEY) not configured");
      }

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const assetManagerWithSigner = assetManager.connect(wallet);

      // Encode the proof
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(bytes32 attestationType, bytes32 sourceId, uint64 votingRound, uint64 lowestUsedTimestamp, bytes requestBody, bytes responseBody)", "bytes32[]"],
        [paymentProof.response, paymentProof.proof]
      );

      // Execute minting
      const tx = await assetManagerWithSigner.executeMinting(reservationId, encodedProof);

      this.log(`⏳ Waiting for minting transaction confirmation...`);
      const receipt = await tx.wait();

      // Parse minted amount from events (simplified)
      const mintedAmount = BigInt(receipt!.logs[0]?.data || "0");

      this.log(`✅ Minting executed successfully`, {
        reservationId,
        mintedAmount: mintedAmount.toString(),
        txHash: receipt!.hash,
      });

      return mintedAmount;
    } catch (error: any) {
      console.error(`❌ Error executing minting:`, error);
      throw new Error(`Failed to execute minting: ${error.message}`);
    }
  }

  /**
   * Initiate redemption of FAssets for underlying assets
   * @param amount Amount of FAssets to redeem
   * @param underlyingAddress Address to receive underlying assets
   * @param assetType Asset type
   * @returns Redemption ticket
   */
  async redeemFAssets(
    amount: bigint,
    underlyingAddress: string,
    assetType: AssetType
  ): Promise<RedemptionTicket> {
    try {
      this.log(`🔄 Initiating redemption of ${amount} ${assetType}`);

      // Find the FAsset config for this asset type
      const config = Array.from(this.fAssetConfigs.values()).find(
        c => c.assetType === assetType
      );

      if (!config) {
        throw new Error(`No FAsset configuration found for asset type ${assetType}`);
      }

      const assetManager = this.assetManagerContracts.get(config.address.toLowerCase());
      if (!assetManager) {
        throw new Error(`No AssetManager contract found for ${assetType}`);
      }

      // Get signer from env
      const privateKey = getRelayerPrivateKey();
      if (!privateKey) {
        throw new Error("RELAYER_PRIVATE_KEY (or PRIVATE_KEY / DISTRIBUTOR_PRIVATE_KEY) not configured");
      }

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const assetManagerWithSigner = assetManager.connect(wallet);

      // Initiate redemption
      const tx = await assetManagerWithSigner.redeem(amount, underlyingAddress);

      this.log(`⏳ Waiting for redemption transaction confirmation...`);
      const receipt = await tx.wait();

      // Parse ticket ID from events (simplified)
      const ticketId = receipt!.logs[0]?.topics[1] || "0x0";

      const ticket: RedemptionTicket = {
        ticketId,
        amount,
        underlyingAddress,
        estimatedTime: Math.floor(Date.now() / 1000) + 3600, // Estimate 1 hour
      };

      this.log(`✅ Redemption initiated successfully`, {
        ticketId,
        amount: amount.toString(),
        txHash: receipt!.hash,
      });

      return ticket;
    } catch (error: any) {
      console.error(`❌ Error initiating redemption:`, error);
      throw new Error(`Failed to initiate redemption: ${error.message}`);
    }
  }

  /**
   * Get redemption ticket status
   * @param ticketId Redemption ticket ID
   * @param assetType Asset type
   * @returns Redemption ticket details
   */
  async getRedemptionTicket(
    ticketId: string,
    assetType: AssetType
  ): Promise<RedemptionTicket> {
    try {
      this.log(`🔍 Querying redemption ticket ${ticketId}`);

      // Find the FAsset config for this asset type
      const config = Array.from(this.fAssetConfigs.values()).find(
        c => c.assetType === assetType
      );

      if (!config) {
        throw new Error(`No FAsset configuration found for asset type ${assetType}`);
      }

      const assetManager = this.assetManagerContracts.get(config.address.toLowerCase());
      if (!assetManager) {
        throw new Error(`No AssetManager contract found for ${assetType}`);
      }

      const ticketInfo = await assetManager.getRedemptionTicket(ticketId);

      const ticket: RedemptionTicket = {
        ticketId,
        amount: BigInt(ticketInfo.amount),
        underlyingAddress: ticketInfo.underlyingAddress,
        estimatedTime: Number(ticketInfo.estimatedTime),
      };

      this.log(`✅ Redemption ticket retrieved`, ticket);

      return ticket;
    } catch (error: any) {
      console.error(`❌ Error getting redemption ticket:`, error);
      throw new Error(`Failed to get redemption ticket: ${error.message}`);
    }
  }

  /**
   * Parse agent status code to string
   * @param statusCode Status code from contract
   * @returns Agent status string
   */
  private parseAgentStatus(statusCode: number): "active" | "full" | "liquidating" {
    switch (statusCode) {
      case 0:
        return "active";
      case 1:
        return "full";
      case 2:
        return "liquidating";
      default:
        return "active";
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
