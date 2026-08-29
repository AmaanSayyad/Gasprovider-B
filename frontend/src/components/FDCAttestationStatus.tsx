import React from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle, Loader2, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

interface FDCAttestationStatusProps {
  status: "pending" | "requested" | "finalized" | "verified" | "failed";
  roundId?: number;
  attestationType?: "EVMTransaction" | "Payment";
  sourceChain?: string;
  transactionHash?: string;
  errorMessage?: string;
  className?: string;
}

const FDCAttestationStatus: React.FC<FDCAttestationStatusProps> = ({
  status,
  roundId,
  attestationType,
  sourceChain,
  transactionHash,
  errorMessage,
  className,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return {
          icon: Clock,
          color: "text-secondary",
          bgColor: "bg-white/5",
          borderColor: "border-white/10",
          label: "Pending Attestation",
          description: "Waiting to request attestation",
        };
      case "requested":
        return {
          icon: Loader2,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          label: "Attestation Requested",
          description: "Waiting for round finalization",
          animate: true,
        };
      case "finalized":
        return {
          icon: Loader2,
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/30",
          label: "Round Finalized",
          description: "Verifying attestation proof",
          animate: true,
        };
      case "verified":
        return {
          icon: CheckCircle,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          label: "Verified",
          description: "Transaction verified via FDC",
        };
      case "failed":
        return {
          icon: AlertCircle,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          label: "Verification Failed",
          description: errorMessage || "Failed to verify transaction",
        };
      default:
        return {
          icon: Shield,
          color: "text-secondary",
          bgColor: "bg-white/5",
          borderColor: "border-white/10",
          label: "Unknown",
          description: "Status unknown",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getExplorerUrl = (): string | null => {
    if (!transactionHash || !sourceChain) return null;

    const explorers: Record<string, string> = {
      ETH: "https://etherscan.io/tx/",
      BTC: "https://blockstream.info/tx/",
      DOGE: "https://dogechain.info/tx/",
      XRP: "https://xrpscan.com/tx/",
      FLARE: "https://flare-explorer.flare.network/tx/",
      COSTON2: "https://coston2-explorer.flare.network/tx/",
    };

    const baseUrl = explorers[sourceChain.toUpperCase()];
    return baseUrl ? baseUrl + transactionHash : null;
  };

  const explorerUrl = getExplorerUrl();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "p-4 rounded-xl border transition-all",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={clsx("p-2 rounded-lg", config.bgColor)}>
          <Icon
            className={clsx("w-5 h-5", config.color, config.animate && "animate-spin")}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={clsx("font-bold text-sm", config.color)}>
              {config.label}
            </h4>
            {roundId !== undefined && (
              <span className="text-xs text-secondary font-mono">
                Round #{roundId}
              </span>
            )}
          </div>

          <p className="text-sm text-secondary mb-2">{config.description}</p>

          {/* Details */}
          {(attestationType || sourceChain || transactionHash) && (
            <div className="space-y-1">
              {attestationType && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-secondary">Type:</span>
                  <span className="text-white font-medium">{attestationType}</span>
                </div>
              )}
              {sourceChain && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-secondary">Chain:</span>
                  <span className="text-white font-medium">{sourceChain}</span>
                </div>
              )}
              {transactionHash && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-secondary">TX:</span>
                  <span className="text-white font-mono">
                    {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                  </span>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress indicator for active states */}
          {(status === "requested" || status === "finalized") && (
            <div className="mt-3">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={clsx("h-full", status === "requested" ? "bg-blue-500" : "bg-primary")}
                  initial={{ width: "0%" }}
                  animate={{ width: status === "requested" ? "50%" : "75%" }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default FDCAttestationStatus;
