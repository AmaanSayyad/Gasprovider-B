import React, { useState } from "react";
import { X, TrendingUp, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { chains } from "../data/chains";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (data: any) => void;
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onDeposit }) => {
  const [chainId, setChainId] = useState<number>(8453); // Base default
  const [tokenSymbol, setTokenSymbol] = useState("USDC");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [amountUsd, setAmountUsd] = useState("");

  const selectedChain = chains.find((c) => c.id === chainId);

  const handleChainChange = (newChainId: number) => {
    setChainId(newChainId);
    const chain = chains.find((c) => c.id === newChainId);
    if (chain) {
      // Set default token for chain
      setTokenSymbol("USDC");
      setTokenAddress(""); // Will need to be set based on chain
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    // For now, assume 1:1 with USD (in production, use price feed)
    setAmountUsd(value);
  };

  const handleSubmit = () => {
    if (!amount || !amountUsd || !tokenAddress) {
      alert("Please fill in all required fields");
      return;
    }

    onDeposit({
      chainId,
      tokenAddress,
      tokenSymbol,
      amount,
      amountUsd,
    });

    // Reset form
    setAmount("");
    setAmountUsd("");
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
          className="relative w-full max-w-2xl glass-card border border-theme rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-theme flex items-center justify-between sticky top-0 bg-theme-muted z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[rgba(230,32,88,0.15)] rounded-2xl">
                <TrendingUp className="w-5 h-5 text-[#E62058]" />
              </div>
              <h2 className="text-xl font-bold text-theme">Deposit Tokens</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            <div className="bg-[rgba(230,32,88,0.08)] rounded-xl p-4 border border-[rgba(230,32,88,0.2)]">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-[#E62058] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-theme mb-1">Earn Passive Income</div>
                  <div className="text-sm text-secondary">
                    Deposit your tokens to earn 3% provider fees on every transaction they fund.
                    Your tokens continue to grow in value while earning.
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                Select Chain *
              </label>
              <select
                value={chainId}
                onChange={(e) => handleChainChange(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme focus:outline-none focus:border-primary transition-colors"
              >
                {chains.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                Token Symbol *
              </label>
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                placeholder="USDC"
                className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                Token Address *
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="100.00"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <p className="text-xs text-secondary mt-1">
                Estimated USD value: ${amountUsd || "0.00"}
              </p>
            </div>

            <div className="bg-theme-muted rounded-xl p-4 border border-theme">
              <div className="text-sm font-semibold text-theme mb-2">Fee Structure</div>
              <div className="space-y-2 text-xs text-secondary">
                <div className="flex justify-between">
                  <span>Provider Fee (You Earn):</span>
                  <span className="text-[#E62058] font-semibold">3%</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee:</span>
                  <span className="text-theme font-semibold">5%</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-theme">
                  <span>Total Fee:</span>
                  <span className="text-theme font-semibold">8%</span>
                </div>
              </div>
            </div>
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
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E62058] to-[#E46389] text-white hover:shadow-lg hover:shadow-[rgba(230,32,88,0.35)] transition-all font-semibold"
            >
              Deposit & Start Earning
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DepositModal;

