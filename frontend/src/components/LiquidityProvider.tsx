import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Activity, Plus, ArrowUpRight, ArrowDownRight, Zap, PieChart } from "lucide-react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  depositLiquidity,
  getLiquidityStats,
  getUserDeposits,
  getLiquidityPools,
  LiquidityDeposit,
  LiquidityStats,
} from "../utils/api";
import DepositModal from "./DepositModal";
import DepositDetailsModal from "./DepositDetailsModal";
import { chains } from "../data/chains";

const LiquidityProvider: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<LiquidityStats | null>(null);
  const [deposits, setDeposits] = useState<LiquidityDeposit[]>([]);
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<LiquidityDeposit | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "deposits" | "pools">("overview");

  useEffect(() => {
    if (isConnected && address) {
      loadData();
    }
  }, [isConnected, address]);

  const loadData = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [statsData, depositsData, poolsData] = await Promise.all([
        getLiquidityStats(address),
        getUserDeposits(address),
        getLiquidityPools(),
      ]);
      setStats(statsData);
      setDeposits(depositsData.deposits || []);
      setPools(poolsData.pools || []);
    } catch (error) {
      console.error("Failed to load liquidity data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (data: any) => {
    if (!address) return;
    try {
      await depositLiquidity({
        ...data,
        userAddress: address,
      });
      await loadData();
      setShowDepositModal(false);
      alert("Deposit successful! Your tokens are now earning fees.");
    } catch (error: any) {
      alert(`Failed to deposit: ${error.message}`);
    }
  };

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-12 text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-primary" />
        </div>
        <p className="text-theme text-lg">Connect your wallet to start earning</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(230,32,88,0.14)] via-transparent to-[rgba(228,99,137,0.08)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[rgba(230,32,88,0.06)] rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="p-4 bg-gradient-to-br from-[rgba(230,32,88,0.28)] to-[rgba(228,99,137,0.22)] rounded-2xl backdrop-blur-sm border border-[rgba(230,32,88,0.25)] shadow-lg shadow-[rgba(230,32,88,0.18)]"
              >
                <TrendingUp className="w-6 h-6 text-[#E62058]" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-theme mb-1">Liquidity Provider</h2>
                <p className="text-secondary">Put your tokens to work and earn passive income</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDepositModal(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E62058] to-[#E46389] text-white font-bold hover:shadow-lg hover:shadow-[rgba(230,32,88,0.35)] transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Deposit Tokens
            </motion.button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-theme-muted rounded-xl p-4 border border-theme">
                <div className="text-xs text-secondary mb-1">Total Deposited</div>
                <div className="text-2xl font-bold text-theme flex items-center gap-1">
                  <DollarSign className="w-5 h-5" />
                  ${parseFloat(stats.totalDeposited).toFixed(2)}
                </div>
              </div>
              <div className="bg-theme-muted rounded-xl p-4 border border-theme">
                <div className="text-xs text-secondary mb-1">Total Earned</div>
                <div className="text-2xl font-bold text-[#E62058] flex items-center gap-1">
                  <TrendingUp className="w-5 h-5" />
                  ${parseFloat(stats.totalEarned).toFixed(2)}
                </div>
              </div>
              <div className="bg-theme-muted rounded-xl p-4 border border-theme">
                <div className="text-xs text-secondary mb-1">Average Yield</div>
                <div className="text-2xl font-bold text-theme">
                  {stats.averageYield}%
                </div>
              </div>
              <div className="bg-theme-muted rounded-xl p-4 border border-theme">
                <div className="text-xs text-secondary mb-1">Active Deposits</div>
                <div className="text-2xl font-bold text-theme">
                  {stats.activeDeposits}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-theme">
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
          onClick={() => setActiveTab("deposits")}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === "deposits"
              ? "text-primary border-primary"
              : "text-secondary border-transparent hover:text-theme"
          }`}
        >
          My Deposits ({deposits.length})
        </button>
        <button
          onClick={() => setActiveTab("pools")}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === "pools"
              ? "text-primary border-primary"
              : "text-secondary border-transparent hover:text-theme"
          }`}
        >
          Liquidity Pools
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-secondary">Loading...</p>
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="glass-card rounded-3xl p-6">
                <h3 className="text-lg font-bold text-theme mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  How It Works
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <div>
                      <div className="font-semibold text-theme mb-1">Deposit Tokens</div>
                      <div className="text-sm text-secondary">
                        Deposit your tokens (USDC, OP, etc.) to the liquidity pool
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <div>
                      <div className="font-semibold text-theme mb-1">Tokens Are Used</div>
                      <div className="text-sm text-secondary">
                        Your tokens are used to fund other users' gas transactions
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <div>
                      <div className="font-semibold text-theme mb-1">Earn Fees</div>
                      <div className="text-sm text-secondary">
                        Earn 3% provider fees on every transaction your tokens fund
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">4</span>
                    </div>
                    <div>
                      <div className="font-semibold text-theme mb-1">Tokens Grow</div>
                      <div className="text-sm text-secondary">
                        Your remaining tokens continue to grow in value as they're used
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {deposits.length > 0 && (
                <div className="glass-card rounded-3xl p-6">
                  <h3 className="text-lg font-bold text-theme mb-4">Recent Deposits</h3>
                  <div className="space-y-3">
                    {deposits.slice(0, 3).map((deposit) => (
                      <motion.div
                        key={deposit.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedDeposit(deposit)}
                        className="p-4 bg-theme-muted rounded-xl border border-theme hover:border-primary/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-theme">
                              {deposit.tokenSymbol} on {chains.find((c) => c.id === deposit.chainId)?.name || `Chain ${deposit.chainId}`}
                            </div>
                            <div className="text-sm text-secondary">
                              Deposited: ${parseFloat(deposit.amountUsd).toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#E62058]">
                              +${parseFloat(deposit.totalEarned).toFixed(2)}
                            </div>
                            <div className="text-xs text-secondary">Earned</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "deposits" && (
            <div className="space-y-4">
              {deposits.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-20 text-secondary" />
                  <p className="text-theme text-lg mb-2">No deposits yet</p>
                  <p className="text-secondary text-sm mb-4">
                    Start earning by depositing your tokens
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDepositModal(true)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E62058] to-[#E46389] text-white font-semibold hover:shadow-lg hover:shadow-[rgba(230,32,88,0.3)] transition-all"
                  >
                    Deposit Tokens
                  </motion.button>
                </div>
              ) : (
                deposits.map((deposit) => (
                  <motion.div
                    key={deposit.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => setSelectedDeposit(deposit)}
                    className="glass-card rounded-2xl p-6 border border-theme hover:border-primary/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-theme mb-1">
                          {deposit.tokenSymbol}
                        </h3>
                        <p className="text-sm text-secondary">
                          {chains.find((c) => c.id === deposit.chainId)?.name || `Chain ${deposit.chainId}`}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        deposit.status === "active"
                          ? "bg-[rgba(230,32,88,0.15)] text-[#E62058]"
                          : deposit.status === "depleted"
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}>
                        {deposit.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-secondary mb-1">Deposited</div>
                        <div className="text-lg font-bold text-theme">
                          ${parseFloat(deposit.amountUsd).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary mb-1">Used</div>
                        <div className="text-lg font-bold text-theme">
                          ${parseFloat(deposit.totalUsedUsd).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary mb-1">Earned</div>
                        <div className="text-lg font-bold text-[#E62058]">
                          ${parseFloat(deposit.totalEarned).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-theme">
                      <div className="text-xs text-secondary">
                        Deposited {new Date(deposit.depositedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-secondary">
                        Yield: {parseFloat(deposit.amountUsd) > 0
                          ? ((parseFloat(deposit.totalEarned) / parseFloat(deposit.amountUsd)) * 100).toFixed(2)
                          : "0.00"}%
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === "pools" && (
            <div className="space-y-4">
              {pools.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <Zap className="w-16 h-16 mx-auto mb-4 opacity-20 text-secondary" />
                  <p className="text-theme text-lg">No liquidity pools available</p>
                </div>
              ) : (
                pools.map((pool) => (
                  <motion.div
                    key={pool.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-6 border border-theme"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-theme mb-1">
                          {pool.tokenSymbol}
                        </h3>
                        <p className="text-sm text-secondary">
                          {chains.find((c) => c.id === pool.chainId)?.name || `Chain ${pool.chainId}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-theme">
                          ${parseFloat(pool.totalAvailable).toFixed(2)}
                        </div>
                        <div className="text-xs text-secondary">Available</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-secondary mb-1">Total Deposited</div>
                        <div className="text-sm font-semibold text-theme">
                          ${parseFloat(pool.totalDeposited).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary mb-1">Total Used</div>
                        <div className="text-sm font-semibold text-theme">
                          ${parseFloat(pool.totalUsed).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary mb-1">Providers</div>
                        <div className="text-sm font-semibold text-theme">
                          {pool.providerCount}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showDepositModal && (
          <DepositModal
            isOpen={showDepositModal}
            onClose={() => setShowDepositModal(false)}
            onDeposit={handleDeposit}
          />
        )}
        {selectedDeposit && (
          <DepositDetailsModal
            deposit={selectedDeposit}
            isOpen={!!selectedDeposit}
            onClose={() => setSelectedDeposit(null)}
            onUpdate={loadData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiquidityProvider;

