import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Loader2, CheckCircle, AlertCircle, ExternalLink, Copy } from "lucide-react";
import { clsx } from "clsx";

interface RedemptionEstimate {
  fAssetAmount: string;
  underlyingAmount: string;
  fee: string;
  estimatedTime: string;
}

interface RedemptionStatus {
  ticketId: string;
  status: "pending" | "processing" | "completed" | "failed";
  underlyingTxHash?: string;
  underlyingAddress?: string;
  completedAt?: number;
  errorMessage?: string;
}

interface FAssetsRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetType: "BTC" | "DOGE" | "XRP" | "LTC";
  fAssetBalance: number;
  onRedemptionComplete?: (txHash: string) => void;
}

const FAssetsRedemptionModal: React.FC<FAssetsRedemptionModalProps> = ({
  isOpen,
  onClose,
  assetType,
  fAssetBalance,
  onRedemptionComplete,
}) => {
  const [amount, setAmount] = useState<string>("");
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [estimate, setEstimate] = useState<RedemptionEstimate | null>(null);
  const [redemptionStatus, setRedemptionStatus] = useState<RedemptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "confirm" | "processing" | "complete">("form");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGetEstimate = async () => {
    if (!amount) return;

    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual backend call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const fAssetAmt = parseFloat(amount);
      const fee = fAssetAmt * 0.001; // 0.1% fee
      const underlyingAmt = fAssetAmt - fee;

      setEstimate({
        fAssetAmount: amount,
        underlyingAmount: underlyingAmt.toFixed(8),
        fee: fee.toFixed(8),
        estimatedTime: "~30 minutes",
      });

      setStep("confirm");
    } catch (err) {
      setError("Failed to get redemption estimate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateRedemption = async () => {
    if (!estimate || !destinationAddress) return;

    setIsLoading(true);
    setError(null);
    setStep("processing");

    try {
      // Mock API call - replace with actual backend call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const ticketId = "RED-" + Math.random().toString(36).substr(2, 9).toUpperCase();

      setRedemptionStatus({
        ticketId,
        status: "pending",
      });

      // Simulate status updates
      setTimeout(() => {
        setRedemptionStatus((prev) => prev ? { ...prev, status: "processing" } : null);
      }, 3000);

      setTimeout(() => {
        const txHash = "0x" + Math.random().toString(36).substr(2, 64);
        setRedemptionStatus((prev) => prev ? {
          ...prev,
          status: "completed",
          underlyingTxHash: txHash,
          underlyingAddress: destinationAddress,
          completedAt: Date.now(),
        } : null);
        setStep("complete");
        if (onRedemptionComplete) {
          onRedemptionComplete(txHash);
        }
      }, 8000);
    } catch (err) {
      setError("Failed to initiate redemption. Please try again.");
      setRedemptionStatus((prev) => prev ? {
        ...prev,
        status: "failed",
        errorMessage: "Transaction failed",
      } : null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleMaxAmount = () => {
    setAmount(fAssetBalance.toString());
  };

  const getExplorerUrl = (txHash: string): string => {
    const explorers: Record<string, string> = {
      BTC: "https://blockstream.info/tx/",
      DOGE: "https://dogechain.info/tx/",
      XRP: "https://xrpscan.com/tx/",
      LTC: "https://blockchair.com/litecoin/transaction/",
    };
    return explorers[assetType] + txHash;
  };

  const renderForm = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-secondary mb-2">
          Amount to Redeem
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            max={fAssetBalance}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={handleMaxAmount}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              MAX
            </button>
            <div className="text-secondary font-medium">F{assetType}</div>
          </div>
        </div>
        <div className="mt-2 text-sm text-secondary">
          Balance: {fAssetBalance.toFixed(8)} F{assetType}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary mb-2">
          {assetType} Destination Address
        </label>
        <input
          type="text"
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
          placeholder={`Enter your ${assetType} address`}
          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-mono"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-500">{error}</span>
        </div>
      )}

      <button
        onClick={handleGetEstimate}
        disabled={!amount || !destinationAddress || isLoading || parseFloat(amount) > fAssetBalance}
        className="w-full py-4 rounded-xl font-medium transition-all bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Getting Estimate...
          </>
        ) : (
          <>
            Get Redemption Estimate
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  );

  const renderConfirm = () => {
    if (!estimate) return null;

    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-secondary">You Redeem</span>
            <span className="text-white font-bold">{estimate.fAssetAmount} F{assetType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary">Redemption Fee</span>
            <span className="text-white">{estimate.fee} F{assetType}</span>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="text-secondary">You Receive</span>
            <span className="text-white font-bold text-lg">{estimate.underlyingAmount} {assetType}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Destination</span>
            <span className="text-white font-mono text-xs break-all">{destinationAddress}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Estimated Time</span>
            <span className="text-white">{estimate.estimatedTime}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
            <div className="text-sm text-orange-500">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Redemption is irreversible once initiated</li>
                <li>Ensure your destination address is correct</li>
                <li>Processing time may vary based on network conditions</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("form")}
            className="flex-1 py-4 rounded-xl font-medium transition-all bg-white/5 border border-white/10 text-white hover:bg-white/10"
          >
            Back
          </button>
          <button
            onClick={handleInitiateRedemption}
            disabled={isLoading}
            className="flex-1 py-4 rounded-xl font-medium transition-all bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm Redemption"
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderProcessing = () => {
    if (!redemptionStatus) return null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-8">
          {redemptionStatus.status === "pending" && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Initiating Redemption</h3>
              <p className="text-secondary text-center">
                Creating redemption ticket...
              </p>
            </>
          )}
          {redemptionStatus.status === "processing" && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Processing Redemption</h3>
              <p className="text-secondary text-center">
                Waiting for agent to process your redemption...
              </p>
            </>
          )}
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Ticket ID</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-mono">{redemptionStatus.ticketId}</span>
              <button
                onClick={() => handleCopy(redemptionStatus.ticketId, "ticket")}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                {copiedField === "ticket" ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-secondary" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComplete = () => {
    if (!redemptionStatus || redemptionStatus.status !== "completed") return null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Redemption Complete!</h3>
          <p className="text-secondary text-center">
            Your {assetType} has been sent to your address
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Amount Received</span>
            <span className="text-white font-bold">{estimate?.underlyingAmount} {assetType}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Destination</span>
            <span className="text-white font-mono text-xs break-all">{redemptionStatus.underlyingAddress}</span>
          </div>
          {redemptionStatus.underlyingTxHash && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Transaction</span>
              <a
                href={getExplorerUrl(redemptionStatus.underlyingTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
              >
                <span className="font-mono text-xs">
                  {redemptionStatus.underlyingTxHash.slice(0, 8)}...{redemptionStatus.underlyingTxHash.slice(-6)}
                </span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 rounded-xl font-medium transition-all bg-primary text-white hover:bg-primary/90"
        >
          Done
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-[#1c1c1e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Redeem F{assetType}</h2>
              <p className="text-sm text-secondary mt-1">
                Convert F{assetType} back to {assetType}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === "form" && renderForm()}
                {step === "confirm" && renderConfirm()}
                {step === "processing" && renderProcessing()}
                {step === "complete" && renderComplete()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FAssetsRedemptionModal;
