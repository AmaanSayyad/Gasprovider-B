import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

interface Agent {
  address: string;
  collateralRatio: number;
  mintingFee: number;
  availableLots: number;
  status: "active" | "full" | "liquidating";
}

interface Reservation {
  reservationId: string;
  agentAddress: string;
  lots: number;
  paymentAddress: string;
  paymentReference: string;
  expiresAt: number;
}

interface FAssetsMintingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  assetType: "BTC" | "DOGE" | "XRP" | "LTC";
  onMintingComplete?: (txHash: string) => void;
}

const FAssetsMintingWizard: React.FC<FAssetsMintingWizardProps> = ({
  isOpen,
  onClose,
  assetType,
  onMintingComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [amount, setAmount] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mintingStatus, setMintingStatus] = useState<"pending" | "confirmed" | "failed">("pending");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Mock data - replace with actual API calls
  useEffect(() => {
    if (isOpen && step === 1) {
      // Fetch available agents
      setIsLoading(true);
      setTimeout(() => {
        setAgents([
          {
            address: "0x1234...5678",
            collateralRatio: 2.5,
            mintingFee: 0.1,
            availableLots: 100,
            status: "active",
          },
          {
            address: "0xabcd...ef01",
            collateralRatio: 3.0,
            mintingFee: 0.05,
            availableLots: 50,
            status: "active",
          },
          {
            address: "0x9876...5432",
            collateralRatio: 2.0,
            mintingFee: 0.15,
            availableLots: 200,
            status: "active",
          },
        ]);
        setIsLoading(false);
      }, 1000);
    }
  }, [isOpen, step]);

  const handleReserveCollateral = async () => {
    if (!selectedAgent || !amount) return;

    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual backend call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setReservation({
        reservationId: "RES-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
        agentAddress: selectedAgent.address,
        lots: Math.floor(parseFloat(amount) * 10),
        paymentAddress: `${assetType}:mock-payment-address-${Math.random().toString(36).substr(2, 9)}`,
        paymentReference: "0x" + Math.random().toString(36).substr(2, 16),
        expiresAt: Date.now() + 3600000, // 1 hour
      });

      setStep(3);
    } catch (err) {
      setError("Failed to reserve collateral. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatAddress = (address: string): string => {
    if (address.length <= 13) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTimeRemaining = (): string => {
    if (!reservation) return "";
    const remaining = reservation.expiresAt - Date.now();
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-secondary mb-2">
          Amount to Mint
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary font-medium">
            F{assetType}
          </div>
        </div>
        <div className="mt-2 text-sm text-secondary">
          ≈ {amount || "0"} {assetType} required
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-secondary mb-3">Select Agent</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {agents.map((agent) => (
              <button
                key={agent.address}
                onClick={() => setSelectedAgent(agent)}
                className={clsx(
                  "w-full p-4 rounded-xl border transition-all text-left",
                  selectedAgent?.address === agent.address
                    ? "bg-primary/10 border-primary"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-sm text-white">
                    {formatAddress(agent.address)}
                  </div>
                  <div className={clsx(
                    "text-xs px-2 py-1 rounded-full",
                    agent.status === "active" && "bg-green-500/20 text-green-500"
                  )}>
                    {agent.status}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-secondary">Collateral</div>
                    <div className="text-white font-medium">{agent.collateralRatio}x</div>
                  </div>
                  <div>
                    <div className="text-secondary">Fee</div>
                    <div className="text-white font-medium">{agent.mintingFee}%</div>
                  </div>
                  <div>
                    <div className="text-secondary">Available</div>
                    <div className="text-white font-medium">{agent.availableLots} lots</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-500">{error}</span>
        </div>
      )}

      <button
        onClick={handleReserveCollateral}
        disabled={!selectedAgent || !amount || isLoading}
        className="w-full py-4 rounded-xl font-medium transition-all bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Reserving...
          </>
        ) : (
          <>
            Reserve Collateral
            <ChevronRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-2">Reserving Collateral</h3>
        <p className="text-secondary">Please wait while we reserve collateral with the agent...</p>
      </div>
    </div>
  );

  const renderStep3 = () => {
    if (!reservation) return null;

    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="font-bold text-white">Collateral Reserved</h3>
          </div>
          <p className="text-sm text-secondary">
            Send {assetType} to the address below within {getTimeRemaining()}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Payment Address
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm break-all">
                {reservation.paymentAddress}
              </div>
              <button
                onClick={() => handleCopy(reservation.paymentAddress, "address")}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                {copiedField === "address" ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-secondary" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Payment Reference
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm break-all">
                {reservation.paymentReference}
              </div>
              <button
                onClick={() => handleCopy(reservation.paymentReference, "reference")}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                {copiedField === "reference" ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-secondary" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Amount to Send
            </label>
            <div className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-lg">
              {amount} {assetType}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
            <div className="text-sm text-orange-500">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Include the payment reference in your transaction</li>
                <li>Send the exact amount specified</li>
                <li>Complete payment before the timer expires</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={() => setStep(4)}
          className="w-full py-4 rounded-xl font-medium transition-all bg-primary text-white hover:bg-primary/90 flex items-center justify-center gap-2"
        >
          I've Sent the Payment
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-8">
        {mintingStatus === "pending" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Verifying Payment</h3>
            <p className="text-secondary text-center">
              Waiting for payment confirmation on the {assetType} network...
            </p>
          </>
        )}
        {mintingStatus === "confirmed" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Minting Complete!</h3>
            <p className="text-secondary text-center">
              Your F{assetType} tokens have been minted successfully
            </p>
          </>
        )}
        {mintingStatus === "failed" && (
          <>
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Minting Failed</h3>
            <p className="text-secondary text-center">
              Payment verification failed. Please contact support.
            </p>
          </>
        )}
      </div>

      {mintingStatus === "confirmed" && (
        <button
          onClick={onClose}
          className="w-full py-4 rounded-xl font-medium transition-all bg-primary text-white hover:bg-primary/90"
        >
          Done
        </button>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            // Use mousedown + target check so open-button click doesn't instantly close
            if (e.target === e.currentTarget) onClose();
          }}
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
              <h2 className="text-xl font-bold text-white">Mint F{assetType}</h2>
              <p className="text-sm text-secondary mt-1">
                Step {step} of 4
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={clsx(
                    "flex-1 h-1 rounded-full transition-all",
                    s <= step ? "bg-primary" : "bg-white/10"
                  )}
                />
              ))}
            </div>
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
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FAssetsMintingWizard;
