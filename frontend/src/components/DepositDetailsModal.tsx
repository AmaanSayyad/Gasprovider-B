import React, { useState, useEffect } from "react";
import { X, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { getDepositDetails, withdrawDeposit, LiquidityDeposit } from "../utils/api";
import { chains } from "../data/chains";

interface DepositDetailsModalProps {
  deposit: LiquidityDeposit;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const DepositDetailsModal: React.FC<DepositDetailsModalProps> = ({
  deposit,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const { address } = useAccount();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "usage" | "earnings">("overview");

  useEffect(() => {
    if (isOpen && deposit) {
      loadDetails();
    }
  }, [isOpen, deposit]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const data = await getDepositDetails(deposit.id);
      setDetails(data);
    } catch (error) {
      console.error("Failed to load deposit details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!address || !confirm("Are you sure you want to withdraw this deposit?")) return;
    try {
      await withdrawDeposit(deposit.id, address);
      onUpdate();
      onClose();
      alert("Withdrawal successful!");
    } catch (error: any) {
      alert(`Failed to withdraw: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  const chain = chains.find((c) => c.id === deposit.chainId);
  const available = details
    ? parseFloat(details.available || "0")
    : parseFloat(deposit.amount) - parseFloat(deposit.totalUsed);
  const availableUsd = details
    ? parseFloat(details.availableUsd || "0")
    : parseFloat(deposit.amountUsd) - parseFloat(deposit.totalUsedUsd);

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
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl glass-card border border-theme rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-theme flex items-center justify-between sticky top-0 bg-theme-muted z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[rgba(230,32,88,0.15)] rounded-2xl">
                <TrendingUp className="w-5 h-5 text-[#E62058]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-theme">{deposit.tokenSymbol} Deposit</h2>
                <p className="text-sm text-secondary">{chain?.name || `Chain ${deposit.chainId}`}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Stats */}
          <div className="p-6 border-b border-theme grid grid-cols-4 gap-4">
            <div className="bg-theme-muted rounded-xl p-4">
              <div className="text-xs text-secondary mb-1">Deposited</div>
              <div className="text-xl font-bold text-theme">
                ${parseFloat(deposit.amountUsd).toFixed(2)}
              </div>
            </div>
            <div className="bg-theme-muted rounded-xl p-4">
              <div className="text-xs text-secondary mb-1">Available</div>
              <div className="text-xl font-bold text-theme">
                ${availableUsd.toFixed(2)}
              </div>
            </div>
            <div className="bg-theme-muted rounded-xl p-4">
              <div className="text-xs text-secondary mb-1">Earned</div>
              <div className="text-xl font-bold text-[#E62058]">
                ${parseFloat(deposit.totalEarned).toFixed(2)}
              </div>
            </div>
            <div className="bg-theme-muted rounded-xl p-4">
              <div className="text-xs text-secondary mb-1">Yield</div>
              <div className="text-xl font-bold text-theme">
                {details?.yieldRate || "0.00"}%
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-theme px-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                activeTab === "overview"
                  ? "text-primary border-primary"
                  : "text-secondary border-transparent hover:text-theme"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("usage")}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                activeTab === "usage"
                  ? "text-primary border-primary"
                  : "text-secondary border-transparent hover:text-theme"
              }`}
            >
              Usage ({details?.usages?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                activeTab === "earnings"
                  ? "text-primary border-primary"
                  : "text-secondary border-transparent hover:text-theme"
              }`}
            >
              Earnings ({details?.earnings?.length || 0})
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-secondary">Loading...</p>
              </div>
            ) : (
              <>
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-theme-muted rounded-xl p-4">
                        <div className="text-xs text-secondary mb-1">Utilization Rate</div>
                        <div className="text-2xl font-bold text-theme">
                          {details?.utilizationRate || "0.00"}%
                        </div>
                      </div>
                      <div className="bg-theme-muted rounded-xl p-4">
                        <div className="text-xs text-secondary mb-1">Status</div>
                        <div className="text-2xl font-bold text-theme capitalize">
                          {deposit.status}
                        </div>
                      </div>
                    </div>

                    <div className="bg-theme-muted rounded-xl p-4 border border-theme">
                      <div className="text-sm font-semibold text-theme mb-3">Deposit Info</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-secondary">Token Address:</span>
                          <span className="text-theme font-mono text-xs">
                            {deposit.tokenAddress.slice(0, 8)}...{deposit.tokenAddress.slice(-6)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary">Deposited At:</span>
                          <span className="text-theme">
                            {new Date(deposit.depositedAt).toLocaleString()}
                          </span>
                        </div>
                        {deposit.txHash && (
                          <div className="flex justify-between">
                            <span className="text-secondary">Transaction:</span>
                            <a
                              href={`${chain?.explorerUrl}/tx/${deposit.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View on Explorer
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {deposit.status === "active" && (
                      <button
                        onClick={handleWithdraw}
                        className="w-full px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors font-semibold"
                      >
                        Withdraw Deposit
                      </button>
                    )}
                  </div>
                )}

                {activeTab === "usage" && (
                  <div className="space-y-3">
                    {details?.usages && details.usages.length > 0 ? (
                      details.usages.map((usage: any) => (
                        <div
                          key={usage.id}
                          className="p-4 bg-theme-muted rounded-xl border border-theme"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-theme flex items-center gap-2">
                                <ArrowDownRight className="w-4 h-4 text-red-400" />
                                ${parseFloat(usage.amountUsd).toFixed(2)} Used
                              </div>
                              <div className="text-xs text-secondary mt-1 font-mono">
                                {usage.recipientAddress.slice(0, 8)}...{usage.recipientAddress.slice(-6)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-[#E62058]">
                                +${parseFloat(usage.providerFee).toFixed(2)} earned
                              </div>
                              <div className="text-xs text-secondary">
                                {new Date(usage.usedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-secondary">No usage yet</div>
                    )}
                  </div>
                )}

                {activeTab === "earnings" && (
                  <div className="space-y-3">
                    {details?.earnings && details.earnings.length > 0 ? (
                      details.earnings.map((earning: any) => (
                        <div
                          key={earning.id}
                          className="p-4 bg-theme-muted rounded-xl border border-theme"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-theme flex items-center gap-2">
                                <ArrowUpRight className="w-4 h-4 text-[#E62058]" />
                                ${parseFloat(earning.amount).toFixed(2)} Earned
                              </div>
                              <div className="text-xs text-secondary mt-1">
                                {earning.feeType === "provider_fee" ? "Provider Fee" : "Platform Fee"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-[#E62058]">
                                {parseFloat(earning.amountTokens).toFixed(6)} {deposit.tokenSymbol}
                              </div>
                              <div className="text-xs text-secondary">
                                {new Date(earning.earnedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-secondary">No earnings yet</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DepositDetailsModal;

