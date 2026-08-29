import React, { useState, useMemo } from "react";
import { Search, X, Check, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Token } from "../types";
import { ChainData } from "../types";

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  selectedTokenSymbol?: string;
  tokens: Token[];
  sourceChain?: ChainData | null;
}

const TokenSelectorModal: React.FC<TokenSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedTokenSymbol,
  tokens,
  sourceChain,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Separate FAssets from regular tokens
  const regularTokens = tokens.filter((token) => !token.isFAsset);
  const fAssetTokens = tokens.filter((token) => token.isFAsset);

  // Popular tokens - prioritize native token for the selected chain, then first 4 tokens
  const popularTokens = useMemo(() => {
    if (!sourceChain) {
      return regularTokens.slice(0, 4);
    }

    // Determine native token symbol for the chain
    let nativeTokenSymbol: string | null = null;
    if (sourceChain.id === "monadTestnet") {
      nativeTokenSymbol = "MON";
    } else if (sourceChain.id === "coston2") {
      nativeTokenSymbol = "C2FLR";
    } else if (sourceChain.id === "flare") {
      nativeTokenSymbol = "FLR";
    } else {
      nativeTokenSymbol = "ETH"; // Default for EVM chains
    }

    // Find native token
    const nativeToken = regularTokens.find(
      (token) => token.symbol.toUpperCase() === nativeTokenSymbol?.toUpperCase()
    );

    // Get other tokens (excluding native)
    const otherTokens = regularTokens.filter(
      (token) => token.symbol.toUpperCase() !== nativeTokenSymbol?.toUpperCase()
    );

    // Combine: native token first (if found), then up to 3 more tokens
    const popular: Token[] = [];
    if (nativeToken) {
      popular.push(nativeToken);
    }
    popular.push(...otherTokens.slice(0, 4 - popular.length));

    return popular;
  }, [regularTokens, sourceChain]);

  // Filter tokens based on search
  const filteredRegularTokens = regularTokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFAssetTokens = fAssetTokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.underlyingAsset?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl glass-card border border-theme rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-theme flex items-center justify-between sticky top-0 bg-theme-muted z-10">
            <h2 className="text-xl font-bold text-theme">Select a token</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-theme bg-theme-muted/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Search tokens"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full bg-theme-muted border border-theme rounded-xl pl-12 pr-4 py-4 text-lg text-theme focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-secondary"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Popular Tokens Section */}
            {searchTerm === "" && (
              <div className="p-4 border-b border-theme">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">
                    Popular Tokens
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {popularTokens.map((token) => {
                    const isSelected = selectedTokenSymbol === token.symbol;
                    return (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          onSelect(token);
                          onClose();
                        }}
                        className={clsx(
                          "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 group",
                          isSelected
                            ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(41,151,255,0.2)]"
                            : "bg-theme-muted border-theme hover:bg-muted hover:border-primary/30 hover:scale-[1.02]"
                        )}
                      >
                        <div className="relative">
                          {token.logo && !imageErrors.has(token.symbol) ? (
                            <img
                              src={token.logo}
                              alt={token.symbol}
                              className="w-12 h-12 rounded-full bg-theme-muted p-0.5 shadow-md"
                              onError={() => {
                                setImageErrors(
                                  (prev) => new Set([...prev, token.symbol])
                                );
                              }}
                            />
                          ) : (
                            <div
                              className={clsx(
                                "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold backdrop-blur-sm",
                                isSelected
                                  ? "bg-primary/20 text-primary"
                                  : "bg-theme-muted text-theme"
                              )}
                            >
                              {token.symbol.charAt(0)}
                            </div>
                          )}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5 border-2 border-theme-muted"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </div>
                        <div className="text-center w-full">
                          <div
                            className={clsx(
                              "text-xs font-bold truncate",
                              isSelected ? "text-primary" : "text-theme"
                            )}
                          >
                            {token.symbol}
                          </div>
                          <div className="text-[10px] text-secondary mt-0.5 truncate">
                            {token.balance.toFixed(4)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Regular Token List */}
            {filteredRegularTokens.length > 0 && (
              <div className="p-4 border-b border-theme">
                {searchTerm === "" && (
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">
                      Tokens
                    </h3>
                  </div>
                )}

                <div className="space-y-1">
                  {filteredRegularTokens.map((token) => {
                    const isSelected = selectedTokenSymbol === token.symbol;
                    return (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          onSelect(token);
                          onClose();
                        }}
                        className={clsx(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group",
                          isSelected
                            ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(41,151,255,0.2)]"
                            : "bg-theme-muted border-theme hover:bg-muted hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative shrink-0">
                            {token.logo && !imageErrors.has(token.symbol) ? (
                              <img
                                src={token.logo}
                                alt={token.symbol}
                                className="w-10 h-10 rounded-full bg-theme-muted p-0.5 shadow-md"
                                onError={() => {
                                  setImageErrors(
                                    (prev) => new Set([...prev, token.symbol])
                                  );
                                }}
                              />
                            ) : (
                              <div
                                className={clsx(
                                  "w-10 h-10 rounded-full flex items-center justify-center text-base font-bold backdrop-blur-sm",
                                  isSelected
                                    ? "bg-primary/20 text-primary"
                                    : "bg-theme-muted text-theme"
                                )}
                              >
                                {token.symbol.charAt(0)}
                              </div>
                            )}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5 border-2 border-theme-muted"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div
                              className={clsx(
                                "font-bold text-base truncate",
                                isSelected ? "text-primary" : "text-theme"
                              )}
                            >
                              {token.name}
                            </div>
                            <div className="text-sm text-secondary font-medium truncate">
                              {token.symbol}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div
                            className={clsx(
                              "font-bold text-base",
                              isSelected ? "text-primary" : "text-theme"
                            )}
                          >
                            {token.balance.toFixed(4)}
                          </div>
                          <div className="text-xs text-secondary">Balance</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FAssets Token List */}
            {filteredFAssetTokens.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-primary/10 border border-primary/30">
                    <span className="text-xs font-bold text-primary">FAssets</span>
                  </div>
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">
                    Cross-Chain Assets
                  </h3>
                </div>

                <div className="space-y-1">
                  {filteredFAssetTokens.map((token) => {
                    const isSelected = selectedTokenSymbol === token.symbol;
                    return (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          onSelect(token);
                          onClose();
                        }}
                        className={clsx(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group",
                          isSelected
                            ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(41,151,255,0.2)]"
                            : "bg-theme-muted border-theme hover:bg-muted hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative shrink-0">
                            {/* Underlying asset icon */}
                            {token.underlyingLogo && !imageErrors.has(token.symbol) ? (
                              <div className="relative">
                                <img
                                  src={token.underlyingLogo}
                                  alt={token.underlyingAsset}
                                  className="w-10 h-10 rounded-full bg-theme-muted p-0.5 shadow-md"
                                  onError={() => {
                                    setImageErrors(
                                      (prev) => new Set([...prev, token.symbol])
                                    );
                                  }}
                                />
                                {/* FAsset badge */}
                                <div className="absolute -bottom-1 -right-1 bg-theme-muted rounded-full p-0.5 border-2 border-theme-muted shadow-md">
                                  <img
                                    src="/flarelogo.png"
                                    alt="Flare"
                                    className="w-4 h-4 rounded-full"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div
                                className={clsx(
                                  "w-10 h-10 rounded-full flex items-center justify-center text-base font-bold backdrop-blur-sm",
                                  isSelected
                                    ? "bg-primary/20 text-primary"
                                    : "bg-theme-muted text-theme"
                                )}
                              >
                                {token.symbol.charAt(0)}
                              </div>
                            )}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -left-1 bg-primary rounded-full p-0.5 border-2 border-theme-muted"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div
                                className={clsx(
                                  "font-bold text-base truncate",
                                  isSelected ? "text-primary" : "text-theme"
                                )}
                              >
                                {token.name}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm text-secondary font-medium truncate">
                                {token.symbol}
                              </div>
                              {token.underlyingAsset && (
                                <div className="text-xs text-secondary/70">
                                  • Backed by {token.underlyingAsset}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div
                            className={clsx(
                              "font-bold text-base",
                              isSelected ? "text-primary" : "text-theme"
                            )}
                          >
                            {token.balance.toFixed(4)}
                          </div>
                          <div className="text-xs text-secondary">Balance</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No results */}
            {filteredRegularTokens.length === 0 && filteredFAssetTokens.length === 0 && (
              <div className="p-4">
                <div className="flex flex-col items-center justify-center py-12 text-secondary">
                  <Search className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-lg font-medium">No tokens found</p>
                  <p className="text-sm">Try searching for something else</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TokenSelectorModal;
