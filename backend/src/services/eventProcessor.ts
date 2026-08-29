import { IntentStore } from '../store';
import { DepositEventPayload } from '../types';

/**
 * Service for processing deposit events.
 */
export class EventProcessor {
  private relayerService: any = null;
  private smartAccountManager: any = null;

  constructor(
    private store: IntentStore,
    relayerService?: any,
    smartAccountManager?: any
  ) {
    this.relayerService = relayerService;
    this.smartAccountManager = smartAccountManager;
  }

  /**
   * Process a deposit event.
   */
  async processDepositEvent(payload: DepositEventPayload): Promise<void> {
    // Check if this deposit was made through a Smart Account
    await this.detectSmartAccountDeposit(payload);
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

}
