/**
 * Component to display Treasury transaction hashes with explorer links
 * Requirements: 2.5, 6.4, 9.4
 */

import React, { useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";

interface TreasuryTransactionHashProps {
  chainId: number;
  chainName: string;
  txHash?: string;
  status: "pending" | "processing" | "confirmed" | "failed";
  confirmations?: number;
  className?: string;
}

const TreasuryTransactionHash: React.FC<TreasuryTransactionHashProps> = ({
  chainId,
  chainName,
  txHash,
  status,
  confirmations = 0,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const getExplorerUrl = (chainId: number, txHash: string): string => {
    const explorers: Record<number, string> = {
      114: "https://coston2-explorer.flare.network",
      11155111: "https://sepolia.etherscan.io",
      80002: "https://amoy.polygonscan.com",
      421614: "https://sepolia.arbiscan.io",
      11155420: "https://sepolia-optimism.etherscan.io",
      84532: "https://sepolia.basescan.org",
      4801: "https://worldchain-sepolia.explorer.alchemy.com",
      999999999: "https://sepolia.explorer.zora.energy",
      534351: "https://sepolia.scrollscan.com",
      43113: "https://testnet.snowtrace.io",
      97: "https://testnet.bscscan.com",
      10143: "https://testnet.monadvision.com",
      300: "https://sepolia.explorer.zksync.io",
      314159: "https://calibration.filfox.info/en",
      1301: "https://sepolia.uniscan.xyz",
      48898: "https://explorer.garfield-testnet.zircuit.com",
      5115: "https://explorer.testnet.citrea.xyz",
      545: "https://evm-testnet.flowscan.io",
      44787: "https://alfajores.celoscan.io",
    };

    const baseUrl = explorers[chainId] || "https://etherscan.io";
    return `${baseUrl}/tx/${txHash}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = () => {
    switch (status) {
      case "confirmed":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      case "processing":
        return "text-yellow-500";
      default:
        return "text-secondary";
    }
  };

  if (!txHash) {
    return (
      <div className={`text-xs ${getStatusColor()} ${className}`}>
        {status === "pending" ? "Waiting..." : status === "processing" ? "Processing..." : "No transaction"}
      </div>
    );
  }

  const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`text-xs font-mono ${getStatusColor()}`}>
        {shortHash}
      </span>
      
      {confirmations > 0 && (
        <span className="text-xs text-secondary">
          ({confirmations} conf)
        </span>
      )}

      <button
        onClick={() => copyToClipboard(txHash)}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        title="Copy transaction hash"
      >
        {copied ? (
          <Check className="w-3 h-3 text-green-500" />
        ) : (
          <Copy className="w-3 h-3 text-secondary" />
        )}
      </button>

      <a
        href={getExplorerUrl(chainId, txHash)}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1 hover:bg-white/10 rounded transition-colors"
        title={`View on ${chainName} explorer`}
      >
        <ExternalLink className="w-3 h-3 text-primary" />
      </a>
    </div>
  );
};

export default TreasuryTransactionHash;
