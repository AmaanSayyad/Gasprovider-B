import React, { useState, useEffect } from "react";
import { Trophy, Award, Flame, Target, TrendingUp, Medal, Star, Zap, Crown, Sparkles, Check } from "lucide-react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";

interface UserStats {
  totalPoints: number;
  totalAchievements: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  rank: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  points: number;
  icon?: string;
  isCompleted: boolean;
  progress: any;
}

const Gamification: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeTab, setActiveTab] = useState<"achievements" | "badges" | "leaderboard">("achievements");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadStats();
      loadAchievements();
    }
  }, [isConnected, address]);

  const loadStats = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const { getGamificationStats } = await import("../utils/api");
      const data = await getGamificationStats(address);
      setStats(data);
    } catch (error) {
      console.error("Failed to load gamification stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAchievements = async () => {
    try {
      const response = await fetch(`http://localhost:3000/gamification/achievements`);
      if (response.ok) {
        const data = await response.json();
        // Map achievements and check completion status for current user
        const mappedAchievements = (data.achievements || []).map((ach: any) => ({
          ...ach,
          isCompleted: false, // Would need to check user achievements
          progress: { count: 0 },
        }));
        setAchievements(mappedAchievements);
      }
    } catch (error) {
      console.error("Failed to load achievements:", error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "dispersal":
        return <Zap className="w-5 h-5" />;
      case "streak":
        return <Flame className="w-5 h-5" />;
      case "volume":
        return <TrendingUp className="w-5 h-5" />;
      case "social":
        return <Star className="w-5 h-5" />;
      default:
        return <Award className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "dispersal":
        return "from-blue-500/20 to-cyan-500/20 border-blue-500/30";
      case "streak":
        return "from-orange-500/20 to-red-500/20 border-orange-500/30";
      case "volume":
        return "from-green-500/20 to-emerald-500/20 border-green-500/30";
      case "social":
        return "from-purple-500/20 to-pink-500/20 border-purple-500/30";
      default:
        return "from-primary/20 to-blue-600/20 border-primary/30";
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
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <p className="text-white/60 text-lg">Connect your wallet to view achievements</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Stats Card */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 relative overflow-hidden"
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-purple-600/10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="p-4 bg-gradient-to-br from-primary/30 to-purple-600/30 rounded-2xl backdrop-blur-sm border border-primary/20 shadow-lg shadow-primary/20"
              >
                <Crown className="w-6 h-6 text-primary" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Your Achievements</h2>
                <p className="text-white/60">Track your progress and unlock rewards</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm shadow-lg"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">Points</span>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-3xl font-bold text-white mb-1"
                >
                  {stats.totalPoints}
                </motion.div>
                <div className="text-xs text-white/40">Total earned</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm shadow-lg"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Award className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">Achievements</span>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-3xl font-bold text-white mb-1"
                >
                  {stats.totalAchievements}
                </motion.div>
                <div className="text-xs text-white/40">Unlocked</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm shadow-lg"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">Streak</span>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-3xl font-bold text-white mb-1"
                >
                  {stats.currentStreak}
                </motion.div>
                <div className="text-xs text-white/40">Days active</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm shadow-lg"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Target className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">Rank</span>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-3xl font-bold text-white mb-1"
                >
                  #{stats.rank}
                </motion.div>
                <div className="text-xs text-white/40">Global position</div>
              </motion.div>
            </div>

            {/* Streak Progress Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl p-6 border border-orange-500/30 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-500/30 rounded-xl">
                    <Flame className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Current Streak</div>
                    <div className="text-3xl font-bold text-orange-400">{stats.currentStreak} days</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/60 mb-1">Longest Streak</div>
                  <div className="text-2xl font-bold text-white">{stats.longestStreak} days</div>
                </div>
              </div>
              <div className="mt-4 h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min((stats.currentStreak / Math.max(stats.longestStreak, 7)) * 100, 100)}%`,
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg shadow-orange-500/50"
                />
              </div>
              {stats.currentStreak > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-orange-300">
                  <Sparkles className="w-3 h-3" />
                  <span>Keep it going! You're on fire! 🔥</span>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-3xl p-8"
      >
        <div className="flex gap-2 border-b border-white/10 mb-8 overflow-x-auto">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("achievements")}
            className={`px-6 py-3 font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === "achievements"
                ? "text-primary border-primary"
                : "text-white/60 border-transparent hover:text-white"
            }`}
          >
            Achievements
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("badges")}
            className={`px-6 py-3 font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === "badges"
                ? "text-primary border-primary"
                : "text-white/60 border-transparent hover:text-white"
            }`}
          >
            Badges
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("leaderboard")}
            className={`px-6 py-3 font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === "leaderboard"
                ? "text-primary border-primary"
                : "text-white/60 border-transparent hover:text-white"
            }`}
          >
            Leaderboard
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "achievements" && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {achievements.length === 0 ? (
                <div className="text-center py-16">
                  <Award className="w-16 h-16 mx-auto mb-4 opacity-20 text-white/60" />
                  <p className="text-white/60 text-lg">No achievements available</p>
                </div>
              ) : (
                achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className={`p-6 rounded-2xl border backdrop-blur-sm transition-all ${
                      achievement.isCompleted
                        ? `bg-gradient-to-r ${getCategoryColor(achievement.category)} shadow-lg`
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className={`p-4 rounded-xl ${
                            achievement.isCompleted
                              ? "bg-white/20"
                              : "bg-white/10"
                          }`}
                        >
                          {getCategoryIcon(achievement.category)}
                        </motion.div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-white text-lg">{achievement.name}</h3>
                            {achievement.isCompleted && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-green-400"
                              >
                                <Check className="w-5 h-5" />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-sm text-white/70 mb-2">{achievement.description}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 bg-white/10 rounded-lg text-white/60 capitalize">
                              {achievement.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="text-2xl font-bold text-primary mb-1"
                        >
                          +{achievement.points}
                        </motion.div>
                        <div className="text-xs text-white/60">points</div>
                        {achievement.isCompleted && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-2 text-xs text-green-400 font-semibold flex items-center gap-1"
                          >
                            <Star className="w-3 h-3" />
                            Completed
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "badges" && (
            <motion.div
              key="badges"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {stats?.badges && stats.badges.length > 0 ? (
                stats.badges.map((badgeId, index) => (
                  <motion.div
                    key={badgeId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="p-6 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-2xl border border-primary/30 text-center backdrop-blur-sm shadow-lg"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-primary/30 to-purple-600/30 rounded-full flex items-center justify-center"
                    >
                      <Medal className="w-8 h-8 text-primary" />
                    </motion.div>
                    <div className="text-sm font-bold text-white">Badge #{badgeId}</div>
                    <div className="text-xs text-white/60 mt-1">Earned</div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-16">
                  <Medal className="w-16 h-16 mx-auto mb-4 opacity-20 text-white/60" />
                  <p className="text-white/60 text-lg">No badges earned yet</p>
                  <p className="text-white/40 text-sm mt-2">Complete achievements to earn badges!</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-16"
            >
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20 text-white/60" />
              <p className="text-white/60 text-lg">Leaderboard coming soon</p>
              <p className="text-white/40 text-sm mt-2">Compete with other users!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Gamification;
