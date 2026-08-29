import { FDCAttestationClient } from './fdc';
import { IntentStore } from '../store';
import { DepositEventPayload } from '../types';
import { getFdcEvmSourceId } from '../utils/flareRegistry';

/**
 * Service for processing deposit events and requesting FDC attestations
 */
export class EventProcessor {
  private fdcClient: FDCAttestationClient | null = null;
  private relayerService: any = null;
  private smartAccountManager: any = null;

  constructor(
    private store: IntentStore,
    relayerService?: any,
    smartAccountManager?: any
  ) {
    this.relayerService = relayerService;
    this.smartAccountManager = smartAccountManager;
    // Initialize FDC client — resolve unsuffixed or _COSTON2 / _MAINNET env names
    const useTestnet = process.env.USE_TESTNET !== 'false';
    const suffix = useTestnet ? '_COSTON2' : '_MAINNET';
    const flareRpcUrl =
      process.env.FLARE_RPC_URL ||
      process.env.COSTON2_RPC_URL ||
      (useTestnet
        ? 'https://coston2-api.flare.network/ext/C/rpc'
        : 'https://flare-api.flare.network/ext/C/rpc');
    const fdcHubAddress =
      process.env.FDC_HUB_ADDRESS ||
      process.env[`FDC_HUB_ADDRESS${suffix}`] ||
      (useTestnet
        ? '0x48aC463d7975828989331F4De43341627b9c5f1D'
        : '0xc25c749DC27Efb1864Cb3DADa8845B7687eB2d44');
    const fdcVerificationAddress =
      process.env.FDC_VERIFICATION_ADDRESS ||
      process.env[`FDC_VERIFICATION_ADDRESS${suffix}`] ||
      (useTestnet
        ? '0x906507E0B64bcD494Db73bd0459d1C667e14B933'
        : '0x5C14FE9D73Ab763F4d4a76f334bf7029DDD20Ecc');
    const stateConnectorAddress =
      process.env.STATE_CONNECTOR_ADDRESS ||
      process.env[`STATE_CONNECTOR_ADDRESS${suffix}`] ||
      fdcVerificationAddress;
    const verifierUrl =
      process.env.FDC_VERIFIER_URL ||
      process.env[`FDC_VERIFIER_URL${suffix}`] ||
      (useTestnet
        ? 'https://fdc-verifiers-testnet.flare.network'
        : 'https://fdc-verifiers-mainnet.flare.network');
    const daLayerUrl =
      process.env.FDC_DA_LAYER_URL ||
      process.env[`FDC_DA_LAYER_URL${suffix}`] ||
      (useTestnet
        ? 'https://ctn2-data-availability.flare.network'
        : 'https://flr-data-availability.flare.network');

    const fdcEnabled = process.env.ENABLE_FDC !== 'false';

    if (fdcEnabled && flareRpcUrl && fdcHubAddress && fdcVerificationAddress && stateConnectorAddress) {
      try {
        this.fdcClient = new FDCAttestationClient(
          flareRpcUrl,
          fdcHubAddress,
          fdcVerificationAddress,
          stateConnectorAddress,
          verifierUrl,
          daLayerUrl
        );
        console.log('✅ FDC Attestation Client initialized', {
          hub: fdcHubAddress,
          verification: fdcVerificationAddress,
          network: useTestnet ? 'Coston2' : 'Flare',
        });
      } catch (error) {
        console.warn('⚠️ Failed to initialize FDC Attestation Client:', error);
      }
    } else {
      console.warn('⚠️ FDC configuration not found or disabled, attestation verification will be skipped');
    }
  }

  /**
   * Process a deposit event and request FDC attestation
   */
  async processDepositEvent(payload: DepositEventPayload): Promise<void> {
    // Check if this deposit was made through a Smart Account
    await this.detectSmartAccountDeposit(payload);

    // Skip if FDC client is not available
    if (!this.fdcClient) {
      console.log('⚠️ FDC client not available, skipping attestation for', payload.txHash);
      return;
    }

    try {
      console.log(`📝 Requesting FDC attestation for deposit ${payload.txHash}`);

      // Determine attestation type based on source chain
      const attestationType = this.getAttestationType(payload.chainId);

      // Request attestation
      const attestationResponse = await this.fdcClient.requestAttestation({
        attestationType,
        sourceChain: this.getSourceChainIdentifier(payload.chainId),
        transactionHash: payload.txHash,
        requiredConfirmations: 1,
      });

      // Update intent with attestation request info
      await this.store.updateIntent(payload.txHash, {
        fdcAttestationRound: attestationResponse.roundId,
        fdcAttestationStatus: 'pending',
      });

      console.log(`✅ FDC attestation requested for ${payload.txHash}, round ${attestationResponse.roundId}`);

      // Start background process to wait for finalization and verify proof
      this.waitForAttestationFinalization(payload.txHash, attestationResponse.roundId, attestationResponse.abiEncodedRequest)
        .catch((error) => {
          console.error(`❌ Error waiting for attestation finalization for ${payload.txHash}:`, error);
          // Mark attestation as failed
          this.store.updateIntent(payload.txHash, {
            fdcAttestationStatus: 'failed',
          }).catch((updateErr) => {
            console.error(`Error updating intent status:`, updateErr);
          });
        });

    } catch (error) {
      console.error(`❌ Error requesting FDC attestation for ${payload.txHash}:`, error);
      // Mark attestation as failed
      await this.store.updateIntent(payload.txHash, {
        fdcAttestationStatus: 'failed',
      });
    }
  }

  /**
   * Detect if a deposit was made through a Smart Account and track relayer transaction
   */
  private async detectSmartAccountDeposit(payload: DepositEventPayload): Promise<void> {
    if (!this.smartAccountManager || !this.relayerService) {
      return;
    }

    try {
      // Check if the user address is a Smart Account
      const smartAccountAddress = await this.smartAccountManager.getSmartAccount(payload.data.user);
      
      if (smartAccountAddress) {
        console.log(`🔍 Detected Smart Account deposit from ${payload.data.user} via Smart Account ${smartAccountAddress}`);
        
        // Update intent to mark it as a Smart Account transaction
        await this.store.updateIntent(payload.txHash, {
          smartAccountUsed: true,
          relayerTxHash: payload.txHash, // The deposit tx itself was relayed
        });

        // Start tracking the relayer transaction status
        this.trackRelayerTransaction(payload.txHash).catch((error) => {
          console.error(`❌ Error tracking relayer transaction for ${payload.txHash}:`, error);
        });
      }
    } catch (error) {
      console.error(`❌ Error detecting Smart Account deposit for ${payload.txHash}:`, error);
      // Continue processing even if Smart Account detection fails
    }
  }

  /**
   * Track relayer transaction status and update intent
   */
  private async trackRelayerTransaction(intentId: string): Promise<void> {
    if (!this.relayerService) {
      return;
    }

    try {
      const intent = await this.store.getIntentById(intentId);
      if (!intent || !intent.relayerTxHash) {
        return;
      }

      console.log(`📊 Tracking relayer transaction ${intent.relayerTxHash} for intent ${intentId}`);

      // Wait for transaction confirmation
      const status = await this.relayerService.waitForConfirmation(
        intent.relayerTxHash,
        1, // 1 confirmation
        120000 // 2 minute timeout
      );

      if (status.status === 'confirmed') {
        console.log(`✅ Relayer transaction confirmed for intent ${intentId}`);
        // Intent status is already updated by the deposit event processing
      } else if (status.status === 'failed') {
        console.error(`❌ Relayer transaction failed for intent ${intentId}: ${status.error}`);
        // Mark intent as failed
        await this.store.updateIntent(intentId, {
          status: 'FAILED',
          globalPhase: 'FAILED',
          completedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`❌ Error tracking relayer transaction for intent ${intentId}:`, error);
      // Don't fail the intent just because tracking failed
    }
  }

  /**
   * Wait for attestation round finalization and verify proof
   */
  private async waitForAttestationFinalization(
    intentId: string,
    roundId: number,
    requestBytes: string
  ): Promise<void> {
    if (!this.fdcClient) {
      throw new Error('FDC client not available');
    }

    try {
      console.log(`⏳ Waiting for attestation round ${roundId} to finalize...`);

      // Wait for round finalization (with 180 second timeout)
      await this.fdcClient.waitForFinalization(roundId);

      console.log(`✅ Round ${roundId} finalized, retrieving proof...`);

      // Get proof from DA Layer
      const proof = await this.fdcClient.getProof(roundId, requestBytes);

      console.log(`📜 Proof retrieved for round ${roundId}, verifying...`);

      // Verify proof against State Connector
      const isValid = await this.fdcClient.verifyProof(proof);

      if (isValid) {
        console.log(`✅ Proof verified for intent ${intentId}`);

        // Calculate proof hash for storage
        const proofHash = this.calculateProofHash(proof);

        // Update intent with verified attestation
        await this.store.updateIntent(intentId, {
          fdcAttestationStatus: 'verified',
          fdcProofHash: proofHash,
        });
      } else {
        console.error(`❌ Proof verification failed for intent ${intentId}`);

        // Mark attestation as failed
        await this.store.updateIntent(intentId, {
          fdcAttestationStatus: 'failed',
        });
      }
    } catch (error) {
      console.error(`❌ Error in attestation finalization for intent ${intentId}:`, error);
      throw error;
    }
  }

  /**
   * Determine attestation type based on chain ID
   */
  private getAttestationType(chainId: number): 'EVMTransaction' | 'Payment' {
    // BTC, DOGE, XRP, LTC use Payment attestation type
    // For now, we'll use EVMTransaction for all EVM chains
    // In a real implementation, we'd have a mapping of chain IDs to types
    return 'EVMTransaction';
  }

  private getSourceChainIdentifier(chainId: number): string {
    const useTestnet = process.env.USE_TESTNET !== 'false';
    return getFdcEvmSourceId(chainId, useTestnet);
  }

  /**
   * Calculate proof hash for storage
   */
  private calculateProofHash(proof: any): string {
    // Simple hash calculation - in production, use proper hashing
    const proofString = JSON.stringify(proof);
    // For now, return a placeholder hash
    // In production, use ethers.keccak256 or similar
    return '0x' + Buffer.from(proofString).toString('hex').slice(0, 64).padEnd(64, '0');
  }
}
