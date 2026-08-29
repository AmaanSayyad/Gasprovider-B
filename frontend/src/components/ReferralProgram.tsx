import React, { useState, useEffect } from "react";
import { Share2, Copy, Check, Trophy, Users, DollarSign, Sparkles, TrendingUp, Gift, RefreshCw } from "lucide-react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";

interface ReferralStats {
  totalReferrals: number;
  totalRewards: string;
  activeReferrals: number;
  referralCode: string;
  referralLink: string;
}

interface LeaderboardEntry {
  userAddress: string;
  totalReferrals: number;
  totalRewards: string;
  rank: number;
}

const ReferralProgram: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadStats();
      loadLeaderboard();
    }
  }, [isConnected, address]);

  const loadStats = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const { getReferralStats } = await import("../utils/api");
      const data = await getReferralStats(address);
      setStats(data);
    } catch (error) {
      console.error("Failed to load referral stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { getReferralLeaderboard } = await import("../utils/api");
      const data = await getReferralLeaderboard(10);
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareReferral = async () => {
    if (!stats) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Gas Provider - Get Rewarded!",
          text: `Use my referral code ${stats.referralCode} and we both get rewards!`,
          url: stats.referralLink,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      copyToClipboard(stats.referralLink, "link");
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
          <Share2 className="w-10 h-10 text-primary" />
        </div>
        <p className="text-white/60 text-lg">Connect your wallet to access referral program</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-8 relative overflow-hidden"
      >
        {/* Background gradient — Flare brand */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(230,32,88,0.14)] via-transparent to-[rgba(228,99,137,0.08)]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[rgba(230,32,88,0.06)] rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="p-4 bg-gradient-to-br from-[rgba(230,32,88,0.28)] to-[rgba(228,99,137,0.22)] rounded-2xl backdrop-blur-sm border border-[rgba(230,32,88,0.25)] shadow-lg shadow-[rgba(230,32,88,0.18)]"
            >
              <Share2 className="w-6 h-6 text-[#E62058]" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Referral Program</h2>
              <p className="text-white/60">Invite friends and earn rewards together</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-white/60">Loading your stats...</p>
            </div>
          ) : stats && stats.referralLink ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm shadow-lg"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">Referrals</span>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-3xl font-bold text-white mb-1"
                  >
                    {stats.totalReferrals}
                  </motion.div>
                  <div className="text-xs text-white/40">Total users referred</div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm shadow-lg"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-[rgba(230,32,88,0.15)] rounded-lg">
                      <DollarSign className="w-4 h-4 text-[#E62058]" />
                    </div>
                    <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">Rewards</span>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-3xl font-bold text-white mb-1"
                  >
                    ${stats.totalRewards}
                  </motion.div>
                  <div className="text-xs text-white/40">Total earned</div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm shadow-lg"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-[rgba(228,99,137,0.18)] rounded-lg">
                      <Trophy className="w-4 h-4 text-[#E46389]" />
                    </div>
                    <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">Active</span>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-3xl font-bold text-white mb-1"
                  >
                    {stats.activeReferrals}
                  </motion.div>
                  <div className="text-xs text-white/40">Paid referrals</div>
                </motion.div>
              </div>

              {/* Referral Code Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[rgba(230,32,88,0.12)] to-[rgba(228,99,137,0.1)] rounded-2xl p-6 border border-[rgba(230,32,88,0.25)] backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    <label className="text-sm font-bold text-white uppercase tracking-wider">
                      Your Referral Code
                    </label>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadStats}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh referral code"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </motion.button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-6 py-4 rounded-xl bg-black/30 border border-white/20 text-white font-mono text-xl font-bold tracking-wider backdrop-blur-sm">
                    {stats.referralCode || "No code generated"}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => stats.referralCode && copyToClipboard(stats.referralCode, "code")}
                    disabled={!stats.referralCode}
                    className={`px-6 py-4 rounded-xl font-semibold transition-all ${
                      copied === "code"
                        ? "bg-[#E62058] text-white"
                        : "bg-gradient-to-r from-[#E62058] to-[#E46389] text-white"
                    } shadow-lg shadow-[rgba(230,32,88,0.25)] disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {copied === "code" ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        <span>Copied!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Copy className="w-5 h-5" />
                        <span>Copy</span>
                      </div>
                    )}
                  </motion.button>
                </div>
                {!stats.referralCode && (
                  <div className="mt-3 p-3 bg-[rgba(230,32,88,0.08)] border border-[rgba(230,32,88,0.2)] rounded-lg">
                    <p className="text-xs text-[#E62058]">
                      Click "Refresh" to generate your referral code
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Referral Link Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-white uppercase tracking-wider">
                    Your Referral Link
                  </label>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadStats}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Regenerate referral link"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </motion.button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white text-sm break-all font-mono">
                    {stats.referralLink || "No link generated yet"}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => stats.referralLink && copyToClipboard(stats.referralLink, "link")}
                    disabled={!stats.referralLink}
                    className={`px-4 py-3 rounded-xl transition-all ${
                      copied === "link"
                        ? "bg-[#E62058] text-white"
                        : "bg-theme-muted hover:bg-[rgba(230,32,88,0.1)] text-theme border border-theme disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {copied === "link" ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </motion.button>
                </div>
                {!stats.referralLink && (
                  <div className="mt-3 p-3 bg-[rgba(230,32,88,0.08)] border border-[rgba(230,32,88,0.2)] rounded-lg">
                    <p className="text-xs text-[#E62058]">
                      Click "Refresh" to generate your referral link
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Share Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={shareReferral}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#E62058] to-[#E46389] text-white font-bold text-lg hover:shadow-2xl hover:shadow-[rgba(230,32,88,0.3)] transition-all flex items-center justify-center gap-3"
              >
                <Share2 className="w-6 h-6" />
                <span>Share Referral Link</span>
                <Sparkles className="w-5 h-5" />
              </motion.button>

              {/* How It Works Info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 p-5 bg-gradient-to-r from-white/5 to-white/5 rounded-2xl border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-white text-lg">How Referrals Work</h3>
                </div>
                <ul className="space-y-2 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Share your referral link or code with friends</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>When they visit your link, their referral code is automatically detected</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>When they complete their first deposit, you both earn rewards!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Track your referrals and earnings in real-time</span>
                  </li>
                </ul>
              </motion.div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Share2 className="w-8 h-8 text-primary" />
              </div>
              <p className="text-white/60 text-lg mb-2">No referral link found</p>
              <p className="text-white/40 text-sm mb-6">Generate your referral link to start earning rewards</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadStats}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E62058] to-[#E46389] text-white font-semibold hover:shadow-lg hover:shadow-[rgba(230,32,88,0.3)] transition-all flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                <span>Generate Referral Link</span>
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-3xl p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-[rgba(230,32,88,0.2)] to-[rgba(228,99,137,0.18)] rounded-2xl border border-[rgba(230,32,88,0.3)]">
              <Trophy className="w-6 h-6 text-[#E62058]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-theme">Referral Leaderboard</h2>
              <p className="text-secondary text-sm">Top referrers this month</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadLeaderboard}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm font-semibold"
          >
            Refresh
          </motion.button>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20 text-white/60" />
            <p className="text-white/60 text-lg">No leaderboard data yet</p>
            <p className="text-white/40 text-sm mt-2">Be the first to refer someone!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <motion.div
                key={entry.userAddress}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 4 }}
                className={`p-5 rounded-2xl border backdrop-blur-sm transition-all ${
                  index === 0
                    ? "bg-gradient-to-r from-[rgba(230,32,88,0.14)] to-[rgba(228,99,137,0.08)] border-[rgba(230,32,88,0.3)] shadow-lg shadow-[rgba(230,32,88,0.12)]"
                    : index === 1
                    ? "bg-gradient-to-r from-[rgba(36,41,46,0.08)] to-[rgba(36,41,46,0.04)] border-[rgba(36,41,46,0.18)]"
                    : index === 2
                    ? "bg-gradient-to-r from-[rgba(228,99,137,0.12)] to-[rgba(228,99,137,0.06)] border-[rgba(228,99,137,0.25)]"
                    : "bg-theme-muted border-theme hover:border-[rgba(230,32,88,0.25)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${
                        index === 0
                          ? "bg-gradient-to-br from-[#E62058] to-[#E46389] text-white"
                          : index === 1
                          ? "bg-gradient-to-br from-[#24292E] to-[#3d444b] text-white"
                          : index === 2
                          ? "bg-gradient-to-br from-[#E46389] to-[#E62058] text-white"
                          : "bg-theme-muted text-theme border border-theme"
                      }`}
                    >
                      {index + 1}
                    </motion.div>
                    <div>
                      <div className="font-bold text-theme text-lg mb-1">
                        {entry.userAddress.slice(0, 8)}...{entry.userAddress.slice(-6)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-secondary">
                        <Users className="w-3 h-3" />
                        <span>{entry.totalReferrals} referrals</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-[#E62058]" />
                      <div className="font-bold text-theme text-xl">${entry.totalRewards}</div>
                    </div>
                    <div className="text-xs text-secondary">Total Rewards</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ReferralProgram;
