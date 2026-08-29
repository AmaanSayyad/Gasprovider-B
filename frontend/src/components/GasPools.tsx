import React, { useState, useEffect } from "react";
import { Users, Plus, Search, Copy, Check, TrendingUp, DollarSign, Zap, Eye, LogOut } from "lucide-react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  createGasPool,
  getPublicPools,
  getUserPools,
  getPoolByCode,
  joinPool,
  leavePool,
  GasPool,
} from "../utils/api";
import CreatePoolModal from "./CreatePoolModal";
import PoolDetailsModal from "./PoolDetailsModal";
import JoinPoolModal from "./JoinPoolModal";

const GasPools: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [pools, setPools] = useState<GasPool[]>([]);
  const [userPools, setUserPools] = useState<GasPool[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<GasPool | null>(null);
  const [activeTab, setActiveTab] = useState<"my-pools" | "discover">("my-pools");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      loadPools();
    }
  }, [isConnected, address]);

  const loadPools = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [publicPoolsData, userPoolsData] = await Promise.all([
        getPublicPools(20),
        getUserPools(address),
      ]);
      setPools(publicPoolsData.pools);
      setUserPools(userPoolsData.pools);
    } catch (error) {
      console.error("Failed to load pools:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async (data: any) => {
    if (!address) return;
    try {
      const pool = await createGasPool({
        ...data,
        creatorAddress: address,
      });
      await loadPools();
      setShowCreateModal(false);
      setSelectedPool(pool);
    } catch (error: any) {
      alert(`Failed to create pool: ${error.message}`);
    }
  };

  const handleJoinPool = async (poolCode: string) => {
    if (!address) return;
    try {
      await joinPool(poolCode, address);
      await loadPools();
      setShowJoinModal(false);
      alert("Successfully joined pool!");
    } catch (error: any) {
      alert(`Failed to join pool: ${error.message}`);
    }
  };

  const handleLeavePool = async (poolId: string) => {
    if (!address || !confirm("Are you sure you want to leave this pool?")) return;
    try {
      await leavePool(poolId, address);
      await loadPools();
      alert("Left pool successfully");
    } catch (error: any) {
      alert(`Failed to leave pool: ${error.message}`);
    }
  };

  const copyPoolCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredPools = (activeTab === "my-pools" ? userPools : pools).filter((pool) =>
    pool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pool.poolCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-12 text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="w-10 h-10 text-primary" />
        </div>
        <p className="text-theme text-lg">Connect your wallet to access gas pools</p>
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-purple-600/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="p-4 bg-gradient-to-br from-primary/30 to-purple-600/30 rounded-2xl backdrop-blur-sm border border-primary/20 shadow-lg shadow-primary/20"
              >
                <Users className="w-6 h-6 text-primary" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-theme mb-1">Gas Pools</h2>
                <p className="text-secondary">Pool funds with friends for better gas rates</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Pool
            </motion.button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-theme mb-6">
            <button
              onClick={() => setActiveTab("my-pools")}
              className={`px-6 py-3 font-bold transition-all border-b-2 ${
                activeTab === "my-pools"
                  ? "text-primary border-primary"
                  : "text-secondary border-transparent hover:text-theme"
              }`}
            >
              My Pools ({userPools.length})
            </button>
            <button
              onClick={() => setActiveTab("discover")}
              className={`px-6 py-3 font-bold transition-all border-b-2 ${
                activeTab === "discover"
                  ? "text-primary border-primary"
                  : "text-secondary border-transparent hover:text-theme"
              }`}
            >
              Discover ({pools.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
            <input
              type="text"
              placeholder="Search pools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </motion.div>

      {/* Pools List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-secondary">Loading pools...</p>
        </div>
      ) : filteredPools.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-20 text-secondary" />
          <p className="text-theme text-lg mb-2">
            {activeTab === "my-pools" ? "No pools yet" : "No pools found"}
          </p>
          <p className="text-secondary text-sm">
            {activeTab === "my-pools"
              ? "Create your first pool or join an existing one!"
              : "Try adjusting your search"}
          </p>
          {activeTab === "discover" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowJoinModal(true)}
              className="mt-4 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-blue-600 transition-colors"
            >
              Join Pool
            </motion.button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPools.map((pool) => (
            <motion.div
              key={pool.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="glass-card rounded-2xl p-6 border border-theme hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setSelectedPool(pool)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-theme mb-1">{pool.name}</h3>
                  {pool.description && (
                    <p className="text-sm text-secondary mb-2">{pool.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <span>Code: {pool.poolCode}</span>
                    {pool.isPublic && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                        Public
                      </span>
                    )}
                  </div>
                </div>
                {activeTab === "my-pools" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeavePool(pool.id);
                    }}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-secondary hover:text-red-400 transition-colors"
                    title="Leave pool"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-theme-muted rounded-xl p-3">
                  <div className="text-xs text-secondary mb-1">Members</div>
                  <div className="text-lg font-bold text-theme flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {pool.memberCount || 0}
                    {pool.maxMembers && ` / ${pool.maxMembers}`}
                  </div>
                </div>
                <div className="bg-theme-muted rounded-xl p-3">
                  <div className="text-xs text-secondary mb-1">Balance</div>
                  <div className="text-lg font-bold text-theme flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    ${parseFloat(pool.currentBalance).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-theme">
                <div className="text-xs text-secondary">
                  Min: ${pool.minContribution}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    copyPoolCode(pool.poolCode);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-theme-muted hover:bg-muted text-theme text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  {copiedCode === pool.poolCode ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Code
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreatePoolModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreatePool}
          />
        )}
        {showJoinModal && (
          <JoinPoolModal
            isOpen={showJoinModal}
            onClose={() => setShowJoinModal(false)}
            onJoin={handleJoinPool}
          />
        )}
        {selectedPool && (
          <PoolDetailsModal
            pool={selectedPool}
            isOpen={!!selectedPool}
            onClose={() => setSelectedPool(null)}
            onUpdate={loadPools}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default GasPools;

