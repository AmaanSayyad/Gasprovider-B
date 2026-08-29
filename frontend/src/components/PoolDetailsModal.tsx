import React, { useState, useEffect } from "react";
import { X, Users, DollarSign, TrendingUp, Activity, Copy, Check, Plus, Zap } from "lucide-react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  GasPool,
  getPoolActivity,
  contributeToPool,
  distributeFromPool,
  leavePool,
} from "../utils/api";

interface PoolDetailsModalProps {
  pool: GasPool;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const PoolDetailsModal: React.FC<PoolDetailsModalProps> = ({ pool, isOpen, onClose, onUpdate }) => {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "activity">("overview");
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [contributeAmount, setContributeAmount] = useState("");
  const [showContribute, setShowContribute] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen && pool) {
      loadActivity();
    }
  }, [isOpen, pool]);

  const loadActivity = async () => {
    try {
      const data = await getPoolActivity(pool.id, 50);
      setActivity(data.activity);
    } catch (error) {
      console.error("Failed to load activity:", error);
    }
  };

  const handleContribute = async () => {
    if (!address || !contributeAmount) return;
    setLoading(true);
    try {
      await contributeToPool({
        poolId: pool.id,
        userAddress: address,
        amount: contributeAmount,
      });
      setContributeAmount("");
      setShowContribute(false);
      await loadActivity();
      onUpdate();
      alert("Contribution successful!");
    } catch (error: any) {
      alert(`Failed to contribute: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async (recipientAddress: string, amount: string) => {
    if (!address) return;
    if (!confirm(`Distribute $${amount} to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}?`)) {
      return;
    }
    setLoading(true);
    try {
      await distributeFromPool({
        poolId: pool.id,
        recipientAddress,
        amount,
        reason: "Manual distribution",
      });
      await loadActivity();
      onUpdate();
      alert("Distribution successful!");
    } catch (error: any) {
      alert(`Failed to distribute: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!address || !confirm("Are you sure you want to leave this pool?")) return;
    try {
      await leavePool(pool.id, address);
      onUpdate();
      onClose();
      alert("Left pool successfully");
    } catch (error: any) {
      alert(`Failed to leave pool: ${error.message}`);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pool.poolCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const userMember = pool.members?.find((m) => m.userAddress.toLowerCase() === address?.toLowerCase());
  const isCreator = pool.creatorAddress.toLowerCase() === address?.toLowerCase();

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
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl glass-card border border-theme rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-theme flex items-center justify-between sticky top-0 bg-theme-muted z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-2xl">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-theme">{pool.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-secondary font-mono">{pool.poolCode}</span>
                  <button
                    onClick={copyCode}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Copy pool code"
                  >
                    {copiedCode ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-secondary" />
                    )}
                  </button>
                </div>
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
          <div className="p-6 border-b border-theme grid grid-cols-3 gap-4">
            <div className="bg-theme-muted rounded-xl p-4">
              <div className="text-xs text-secondary mb-1">Total Balance</div>
              <div className="text-2xl font-bold text-theme flex items-center gap-1">
                <DollarSign className="w-5 h-5" />
                ${parseFloat(pool.currentBalance).toFixed(2)}
              </div>
            </div>
            <div className="bg-theme-muted rounded-xl p-4">
              <div className="text-xs text-secondary mb-1">Members</div>
              <div className="text-2xl font-bold text-theme flex items-center gap-1">
                <Users className="w-5 h-5" />
                {pool.memberCount || 0}
                {pool.maxMembers && ` / ${pool.maxMembers}`}
              </div>
            </div>
            <div className="bg-theme-muted rounded-xl p-4">
              <div className="text-xs text-secondary mb-1">Total Contributed</div>
              <div className="text-2xl font-bold text-theme flex items-center gap-1">
                <TrendingUp className="w-5 h-5" />
                ${parseFloat(pool.totalContributed).toFixed(2)}
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
              onClick={() => setActiveTab("members")}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                activeTab === "members"
                  ? "text-primary border-primary"
                  : "text-secondary border-transparent hover:text-theme"
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                activeTab === "activity"
                  ? "text-primary border-primary"
                  : "text-secondary border-transparent hover:text-theme"
              }`}
            >
              Activity
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {pool.description && (
                  <div>
                    <h3 className="font-semibold text-theme mb-2">Description</h3>
                    <p className="text-secondary">{pool.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-theme-muted rounded-xl p-4">
                    <div className="text-xs text-secondary mb-1">Min Contribution</div>
                    <div className="text-lg font-bold text-theme">${pool.minContribution}</div>
                  </div>
                  <div className="bg-theme-muted rounded-xl p-4">
                    <div className="text-xs text-secondary mb-1">Status</div>
                    <div className="text-lg font-bold text-theme capitalize">{pool.status}</div>
                  </div>
                </div>

                {userMember && (
                  <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                    <h3 className="font-semibold text-theme mb-3">Your Pool Stats</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-secondary mb-1">Contributed</div>
                        <div className="text-lg font-bold text-theme">
                          ${parseFloat(userMember.contribution).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary mb-1">Received</div>
                        <div className="text-lg font-bold text-theme">
                          ${parseFloat(userMember.received).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary mb-1">Balance</div>
                        <div className="text-lg font-bold text-theme">
                          ${parseFloat(userMember.balance).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {userMember && (
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowContribute(!showContribute)}
                      className="flex-1 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Contribute
                    </motion.button>
                    {!isCreator && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLeave}
                        className="px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/30 transition-colors"
                      >
                        Leave Pool
                      </motion.button>
                    )}
                  </div>
                )}

                {showContribute && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-theme-muted rounded-xl p-4 border border-theme space-y-3"
                  >
                    <label className="block text-sm font-semibold text-theme">Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={contributeAmount}
                      onChange={(e) => setContributeAmount(e.target.value)}
                      placeholder={`Min: $${pool.minContribution}`}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowContribute(false)}
                        className="flex-1 px-4 py-2 rounded-xl bg-theme-muted border border-theme text-theme hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleContribute}
                        disabled={loading || !contributeAmount || parseFloat(contributeAmount) < parseFloat(pool.minContribution)}
                        className="flex-1 px-4 py-2 rounded-xl bg-primary text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        {loading ? "Processing..." : "Contribute"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {activeTab === "members" && (
              <div className="space-y-3">
                {pool.members && pool.members.length > 0 ? (
                  pool.members.map((member: any) => (
                    <div
                      key={member.id}
                      className="p-4 bg-theme-muted rounded-xl border border-theme flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-theme">
                          {member.userAddress.slice(0, 8)}...{member.userAddress.slice(-6)}
                        </div>
                        <div className="text-xs text-secondary">
                          Balance: ${parseFloat(member.balance).toFixed(2)}
                        </div>
                      </div>
                      {isCreator && member.userAddress.toLowerCase() !== address?.toLowerCase() && parseFloat(member.balance) > 0 && (
                        <button
                          onClick={() => handleDistribute(member.userAddress, member.balance)}
                          className="px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-semibold"
                        >
                          Distribute
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-secondary">No members yet</div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-3">
                {activity.length > 0 ? (
                  activity.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-4 bg-theme-muted rounded-xl border border-theme"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-theme capitalize">{item.activityType}</div>
                          {item.description && (
                            <div className="text-sm text-secondary">{item.description}</div>
                          )}
                          {item.userAddress && (
                            <div className="text-xs text-secondary font-mono mt-1">
                              {item.userAddress.slice(0, 8)}...{item.userAddress.slice(-6)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {item.amount && (
                            <div className="font-bold text-theme">${parseFloat(item.amount).toFixed(2)}</div>
                          )}
                          <div className="text-xs text-secondary">
                            {new Date(item.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-secondary">No activity yet</div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PoolDetailsModal;

