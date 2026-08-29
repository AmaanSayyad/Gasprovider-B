import React, { useState } from "react";
import { X, CheckCircle, XCircle, Loader2, ExternalLink, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIntentStatus } from "../hooks/useIntentStatus";
import { DepositIntent, ChainDispersalStatus } from "../types";
import { getChainIdFromNumeric, getExplorerUrl, chains } from "../data/chains";
import ChainLogo from "./ChainLogo";

interface IntentDetailModalProps {
  intentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const IntentDetailModal: React.FC<IntentDetailModalProps> = ({
  intentId,
  isOpen,
  onClose,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  
  // Use the useIntentStatus hook which handles both UUID and tx hash formats
  const { data, isLoading, error } = useIntentStatus({
    intentId,
    enabled: isOpen && !!intentId,
    pollInterval: 3000,
  });
  
  const intent = data?.intent || null;

  const copyToClipboard = (text: string, hash: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getStatusIcon = (status: ChainDispersalStatus) => {
    switch (status) {
      case "CONFIRMED":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "FAILED":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "BROADCASTED":
      case "QUEUED":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      default:
        return <Loader2 className="w-5 h-5 text-secondary animate-spin" />;
    }
  };

  const getStatusColor = (status: ChainDispersalStatus) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "FAILED":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "BROADCASTED":
      case "QUEUED":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-secondary/10 text-secondary border-secondary/20";
    }
  };

  const getGlobalStatusColor = (status: string) => {
    if (status === "DISPERSED") {
      return "bg-green-500/10 text-green-500 border-green-500/20";
    } else if (status === "FAILED") {
      return "bg-red-500/10 text-red-500 border-red-500/20";
    }
    return "bg-primary/10 text-primary border-primary/20";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-4xl glass-card border border-theme rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-theme flex items-center justify-between sticky top-0 glass-card z-10">
            <h2 className="text-2xl font-bold text-theme">Intent Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-theme-muted rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-secondary">Loading intent details...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <XCircle className="w-8 h-8 text-red-500 mb-4" />
                <p className="text-red-500 font-semibold mb-2">Error</p>
                <p className="text-secondary text-sm">{error.message}</p>
              </div>
            ) : intent ? (
              <div className="space-y-6">
                {/* Overview Card */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 text-theme">Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                        Status
                      </div>
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${getGlobalStatusColor(
                          intent.status
                        )}`}
                      >
                        {intent.status === "DISPERSED" ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : intent.status === "FAILED" ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {intent.status.replace(/_/g, " ")}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                        Total Amount
                      </div>
                      <div className="text-2xl font-bold text-theme">
                        ${parseFloat(intent.amountInUsd).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                        Source Chain
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const chainId = getChainIdFromNumeric(intent.sourceChainId);
                          const chain = chainId
                            ? chains.find((c) => c.id === chainId)
                            : null;
                          return (
                            <>
                              {chain && (
                                <ChainLogo
                                  chainId={chain.viemChain.id}
                                  name={chain.name}
                                  src={chain.logo}
                                  size={24}
                                />
                              )}
                              <span className="font-medium text-theme">
                                {chain?.name || `Chain ${intent.sourceChainId}`}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                        Destination Chains
                      </div>
                      <div className="text-xl font-bold text-theme">
                        {intent.chainStatuses.length}
                      </div>
                    </div>
                  </div>

                  {/* Source UUID */}
                  <div className="mt-6 pt-6 border-t border-theme">
                    <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                      Source UUID
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-theme-muted px-3 py-2 rounded-lg text-sm font-mono break-all text-theme">
                        {intent.sourceTxHash}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(intent.sourceTxHash, intent.sourceTxHash)
                        }
                        className="p-2 hover:bg-theme-muted rounded-lg transition-colors"
                        title="Copy transaction hash"
                      >
                        {copiedHash === intent.sourceTxHash ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-secondary" />
                        )}
                      </button>
                      {/* Only show explorer link if sourceTxHash is a valid transaction hash (starts with 0x and is 66 chars) */}
                      {intent.sourceTxHash && 
                       intent.sourceTxHash.startsWith('0x') && 
                       intent.sourceTxHash.length === 66 && (
                        <a
                          href={`${getExplorerUrl(
                            getChainIdFromNumeric(intent.sourceChainId) || "base"
                          )}/tx/${intent.sourceTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-theme-muted rounded-lg transition-colors"
                          title="View on explorer"
                        >
                          <ExternalLink className="w-4 h-4 text-primary" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-secondary mb-1">Created</div>
                      <div className="text-secondary">
                        {new Date(intent.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {intent.completedAt && (
                      <div>
                        <div className="text-xs text-secondary mb-1">Completed</div>
                        <div className="text-secondary">
                          {new Date(intent.completedAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination Chains */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 text-theme">Destination Chains</h3>
                  <div className="space-y-3">
                    {intent.chainStatuses.map((chain, index) => {
                      const chainId = getChainIdFromNumeric(chain.chainId);
                      const chainConfig = chainId
                        ? chains.find((c) => c.id === chainId)
                        : null;
                      return (
                        <div
                          key={index}
                          className="bg-theme-muted rounded-xl p-4 border border-theme"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {chainConfig?.logo && (
                                <img
                                  src={chainConfig.logo}
                                  alt={chainConfig.name}
                                  className="w-8 h-8 rounded-full"
                                />
                              )}
                              <div>
                                <div className="font-semibold text-theme">
                                  {chainConfig?.name ||
                                    chain.chainName ||
                                    `Chain ${chain.chainId}`}
                                </div>
                                <div className="text-sm text-secondary">
                                  {chain.nativeSymbol || "ETH"}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${getStatusColor(
                                chain.status
                              )}`}
                            >
                              {getStatusIcon(chain.status)}
                              {chain.status.replace(/_/g, " ")}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <div className="text-xs text-secondary mb-1">
                                Amount
                              </div>
                              <div className="font-semibold text-theme">
                                ${parseFloat(chain.amountUsd).toFixed(2)}
                              </div>
                            </div>
                            {chain.txHash && (
                              <div>
                                <div className="text-xs text-secondary mb-1">
                                  Transaction
                                </div>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 bg-theme-muted px-2 py-1 rounded text-xs font-mono truncate text-theme">
                                    {chain.txHash.slice(0, 10)}...
                                    {chain.txHash.slice(-8)}
                                  </code>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(chain.txHash!, chain.txHash!)
                                    }
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                    title="Copy"
                                  >
                                    {copiedHash === chain.txHash ? (
                                      <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-secondary" />
                                    )}
                                  </button>
                                  {chain.explorerUrl && (
                                    <a
                                      href={chain.explorerUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 hover:bg-muted rounded transition-colors"
                                      title="View on explorer"
                                    >
                                      <ExternalLink className="w-3 h-3 text-primary" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {chain.errorMessage && (
                            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
                              {chain.errorMessage}
                            </div>
                          )}

                          {chain.updatedAt && (
                            <div className="mt-2 text-xs text-secondary">
                              Updated: {new Date(chain.updatedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default IntentDetailModal;

