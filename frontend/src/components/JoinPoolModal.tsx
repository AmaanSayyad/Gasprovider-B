import React, { useState } from "react";
import { X, Search, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPoolByCode, GasPool } from "../utils/api";

interface JoinPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (poolCode: string) => void;
}

const JoinPoolModal: React.FC<JoinPoolModalProps> = ({ isOpen, onClose, onJoin }) => {
  const [poolCode, setPoolCode] = useState("");
  const [pool, setPool] = useState<GasPool | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!poolCode.trim()) {
      setError("Please enter a pool code");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const foundPool = await getPoolByCode(poolCode.toUpperCase());
      setPool(foundPool);
    } catch (err: any) {
      setError(err.message || "Pool not found");
      setPool(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (pool) {
      onJoin(pool.poolCode);
      setPoolCode("");
      setPool(null);
      setError(null);
    }
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
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md glass-card border border-theme rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-theme flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-2xl">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-theme">Join Pool</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                Pool Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={poolCode}
                  onChange={(e) => setPoolCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter pool code"
                  className="flex-1 px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors font-mono"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-primary text-white hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50"
                >
                  {loading ? "..." : <Search className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {pool && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-theme-muted rounded-xl border border-theme"
              >
                <h3 className="font-bold text-theme mb-2">{pool.name}</h3>
                {pool.description && (
                  <p className="text-sm text-secondary mb-3">{pool.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">Members:</span>
                  <span className="font-semibold text-theme">
                    {pool.memberCount || 0}
                    {pool.maxMembers && ` / ${pool.maxMembers}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-secondary">Min Contribution:</span>
                  <span className="font-semibold text-theme">${pool.minContribution}</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-theme flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-theme-muted border border-theme text-theme hover:bg-muted transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={!pool}
              className="flex-1 px-6 py-3 rounded-xl bg-primary text-white hover:bg-blue-600 transition-colors font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Pool
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JoinPoolModal;

