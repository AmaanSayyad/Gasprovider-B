import React, { useState, useEffect } from "react";
import { Gift, X, CheckCircle, Sparkles } from "lucide-react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { useReferral } from "../hooks/useReferral";

const ReferralBanner: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { referralCode } = useReferral();
  const [dismissed, setDismissed] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed for this referral code
    const dismissedCode = localStorage.getItem("dismissedReferralCode");
    if (dismissedCode === referralCode) {
      setDismissed(true);
    }
  }, [referralCode]);

  const handleDismiss = () => {
    if (referralCode) {
      localStorage.setItem("dismissedReferralCode", referralCode);
      setDismissed(true);
    }
  };

  if (!referralCode || dismissed || applied || !isConnected) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="relative z-50"
      >
        <div className="mx-4 mt-4 mb-6 glass-card rounded-2xl p-5 border border-primary/30 bg-gradient-to-r from-primary/20 to-blue-600/20 backdrop-blur-sm shadow-lg shadow-primary/20">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="p-3 bg-primary/30 rounded-xl"
            >
              <Gift className="w-6 h-6 text-primary" />
            </motion.div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-white text-lg">Referral Code Detected!</h3>
              </div>
              <p className="text-white/80 text-sm">
                You're using referral code <span className="font-mono font-bold text-primary">{referralCode}</span>. 
                Complete a deposit to activate rewards for you and your referrer!
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDismiss}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReferralBanner;

