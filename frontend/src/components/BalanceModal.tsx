import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UnifiedBalance from "./unified-balance/unified-balance";
import { useNexus } from "./nexus/NexusProvider";

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BalanceModal: React.FC<BalanceModalProps> = ({ isOpen, onClose }) => {
  const { fetchUnifiedBalance } = useNexus();

  useEffect(() => {
    if (isOpen && fetchUnifiedBalance) {
      const timeoutId = setTimeout(() => {
        fetchUnifiedBalance().catch((error) => {
          console.error("Error refreshing balances when opening modal:", error);
        });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, fetchUnifiedBalance]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="balances-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#24292E]/55 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 flex w-full max-w-3xl max-h-[min(85vh,760px)] flex-col overflow-hidden rounded-3xl border border-[rgba(36,41,46,0.12)] bg-white shadow-[0_24px_80px_rgba(36,41,46,0.18)] dark:border-white/10 dark:bg-[#24292E]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[rgba(36,41,46,0.08)] px-5 py-4 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[rgba(230,32,88,0.2)] bg-[rgba(230,32,88,0.08)] p-2.5">
                  <Wallet className="h-5 w-5 text-[#E62058]" />
                </div>
                <h2 id="balances-title" className="font-display text-xl font-bold text-[#24292E] dark:text-white">
                  Balances
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[#5c656d] transition-colors hover:bg-[rgba(36,41,46,0.06)] dark:text-white/70 dark:hover:bg-white/10"
                aria-label="Close balances"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
              <UnifiedBalance className="mx-0 mb-0 max-w-full" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BalanceModal;
