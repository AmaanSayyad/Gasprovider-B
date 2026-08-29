import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Zap, Copy, CheckCircle, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useAccount } from "wagmi";

interface SmartAccountInfo {
  eoaAddress: string;
  smartAccountAddress: string;
  chainId: number;
  deploymentTxHash: string;
  createdAt: string;
}

interface SmartAccountManagerProps {
  className?: string;
}

const SmartAccountManager: React.FC<SmartAccountManagerProps> = ({ className }) => {
  const { address, chainId, isConnected } = useAccount();
  const [smartAccount, setSmartAccount] = useState<SmartAccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [eoaBalance, setEoaBalance] = useState<string>("0");
  const [smartAccountBalance, setSmartAccountBalance] = useState<string>("0");
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if Smart Account exists
  useEffect(() => {
    if (isConnected && address && chainId) {
      checkSmartAccount();
    }
  }, [isConnected, address, chainId]);

  const checkSmartAccount = async () => {
    if (!address || !chainId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual backend call
      const response = await fetch(`/api/smart-account/${address}?chainId=${chainId}`);
      
      if (response.ok) {
        const data = await response.json();
        setSmartAccount(data.smartAccount);
        setEoaBalance(data.eoaBalance || "0");
        setSmartAccountBalance(data.smartAccountBalance || "0");
      } else if (response.status === 404) {
        // No Smart Account exists
        setSmartAccount(null);
        setShowPrompt(true);
      }
    } catch (err) {
      // Fallback to mock data for development
      setSmartAccount(null);
      setShowPrompt(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSmartAccount = async () => {
    if (!address || !chainId) return;

    setIsCreating(true);
    setError(null);

    try {
      // Mock API call - replace with actual backend call
      const response = await fetch("/api/smart-account/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eoaAddress: address, chainId }),
      });

      if (response.ok) {
        const data = await response.json();
        setSmartAccount(data.smartAccount);
        setShowPrompt(false);
      } else {
        throw new Error("Failed to create Smart Account");
      }
    } catch (err) {
      setError("Failed to create Smart Account. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatAddress = (addr: string): string => {
    if (addr.length <= 13) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    if (num === 0) return "0";
    if (num < 0.0001) return "< 0.0001";
    return num.toFixed(4);
  };

  const getExplorerUrl = (txHash: string): string => {
    // Adjust based on chainId
    if (chainId === 14) {
      return `https://flare-explorer.flare.network/tx/${txHash}`;
    } else if (chainId === 114) {
      return `https://coston2-explorer.flare.network/tx/${txHash}`;
    }
    return `https://etherscan.io/tx/${txHash}`;
  };

  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={clsx("p-4 rounded-xl bg-white/5 border border-white/10", className)}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Show creation prompt
  if (showPrompt && !smartAccount) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx("p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30", className)}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/20">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">Enable Gasless Transactions</h3>
            <p className="text-sm text-secondary mb-4">
              Create a Smart Account to make deposits without holding FLR for gas fees. 
              Our relayer will cover the gas costs for you.
            </p>
            <button
              onClick={handleCreateSmartAccount}
              disabled={isCreating}
              className="px-6 py-3 rounded-xl font-medium transition-all bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Create Smart Account
                </>
              )}
            </button>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Show Smart Account info
  if (smartAccount) {
    return (
      <div className={clsx("space-y-4", className)}>
        {/* Smart Account Card */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Smart Account</h3>
              <p className="text-sm text-secondary">Gasless transactions enabled</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Smart Account Address
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm">
                  {formatAddress(smartAccount.smartAccountAddress)}
                </div>
                <button
                  onClick={() => handleCopy(smartAccount.smartAccountAddress, "smart")}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {copiedField === "smart" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-secondary" />
                  )}
                </button>
                <a
                  href={getExplorerUrl(smartAccount.deploymentTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-secondary" />
                </a>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                EOA Address
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm">
                  {formatAddress(smartAccount.eoaAddress)}
                </div>
                <button
                  onClick={() => handleCopy(smartAccount.eoaAddress, "eoa")}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {copiedField === "eoa" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-secondary" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-secondary" />
              <span className="text-xs font-medium text-secondary">EOA Balance</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatBalance(eoaBalance)}
            </div>
            <div className="text-xs text-secondary mt-1">
              {chainId === 14 ? "FLR" : chainId === 114 ? "C2FLR" : "ETH"}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-secondary">Smart Account Balance</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatBalance(smartAccountBalance)}
            </div>
            <div className="text-xs text-secondary mt-1">
              {chainId === 14 ? "FLR" : chainId === 114 ? "C2FLR" : "ETH"}
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
          <div className="flex items-start gap-2">
            <Zap className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm text-primary">
              <p className="font-medium mb-1">Gasless Transactions Active</p>
              <p className="text-primary/80">
                Your deposits will automatically use your Smart Account when you have insufficient gas.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SmartAccountManager;
