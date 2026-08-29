import React, { useState, useEffect, useMemo } from "react";
import { useGasFountain } from "../context/GasFountainContext";
import { DESTINATION_CHAINS, SOURCE_CHAINS, chains, DEFAULT_DESTINATION_IDS } from "../data/chains";
import { Search, Settings2, ChevronDown, Wallet, AlertCircle, ChevronRight, Calendar, FolderOpen } from "lucide-react";
import { clsx } from "clsx";
import ChainSelectorModal from "./ChainSelectorModal";
import TokenSelectorModal from "./TokenSelectorModal";
import ScheduleModal from "./ScheduleModal";
import DispersalTemplates from "./DispersalTemplates";
import FAssetsMintingWizard from "./FAssetsMintingWizard";
import { createSchedule } from "../utils/api";
import { ChainData } from "../types";
import {
  useFtsoPrices,
  getTokenUsdPrice,
  usdToTokenAmount,
  protocolFeeUsd,
} from "../hooks/useFtsoPrices";
import { useTreasuryFunding } from "../hooks/useTreasuryFunding";
import ChainLogo from "./ChainLogo";
const Step1Destinations: React.FC = () => {
  const {
    selectedChains,
    setSelectedChains,
    transactionCounts,
    setTransactionCounts,
    setCurrentStep,
    setDepositAmount,
    sourceChain,
    setSourceChain,
    sourceToken,
    setSourceToken,
    depositAmount,
    tokenBalances,
    balancesLoading,
    isConnected,
  } = useGasFountain();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isChainModalOpen, setIsChainModalOpen] = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isMintWizardOpen, setIsMintWizardOpen] = useState<boolean>(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const { prices: ftsoPrices } = useFtsoPrices();
  const { fundedChainIds } = useTreasuryFunding();

  // Get available tokens with balances for current chain
  const availableTokens = useMemo(() => {
    return tokenBalances || [];
  }, [tokenBalances]);

  const destCatalogIds = useMemo(
    () => new Set(DESTINATION_CHAINS.map((c) => c.id)),
    []
  );
  const defaultIds = useMemo(
    () => new Set<string>(DEFAULT_DESTINATION_IDS as readonly string[]),
    []
  );

  const isChainFunded = (chain: ChainData): boolean => {
    if (!destCatalogIds.has(chain.id)) return false;
    // While balances load, keep the demo defaults selectable
    if (fundedChainIds === null) return defaultIds.has(chain.id);
    return fundedChainIds.has(chain.viemChain.id);
  };

  // Initialize defaults
  useEffect(() => {
    if (!sourceChain) {
      // Find Base chain, or default to first available source chain
      const baseChain = SOURCE_CHAINS.find((chain) => chain.id === "base");
      setSourceChain(baseChain || SOURCE_CHAINS[0]);
    }
    if (!sourceToken && availableTokens.length > 0) {
      // Default to first token with balance, or USDC if available
      const usdc = availableTokens.find((t) => t.symbol === "USDC");
      setSourceToken(usdc || availableTokens[0]);
    }
  }, [availableTokens, sourceChain, sourceToken, setSourceChain, setSourceToken]);

  const toggleChain = (chain: ChainData): void => {
    const fresh =
      DESTINATION_CHAINS.find((c) => c.id === chain.id) ||
      chains.find((c) => c.id === chain.id) ||
      chain;
    if (selectedChains.find((c) => c.id === fresh.id)) {
      setSelectedChains(selectedChains.filter((c) => c.id !== fresh.id));
    } else {
      setSelectedChains([...selectedChains, fresh]);
    }
  };

  const updateTransactionCount = (chainId: string, count: number): void => {
    setTransactionCounts((prev) => ({
      ...prev,
      [chainId]: count,
    }));
  };

  const totalCost = selectedChains.reduce((sum, chain) => {
    const count = transactionCounts[chain.id] || 10;
    return sum + count * chain.avgTxCost;
  }, 0);

  // Update deposit amount in context whenever total cost changes
  useEffect(() => {
    setDepositAmount(totalCost);
  }, [totalCost, setDepositAmount]);

  // ~1000-chain catalog: search the full set, but only render a window so the list stays snappy
  const [showAllResults, setShowAllResults] = useState(false);
  const q = searchTerm.trim().toLowerCase();

  const rankedDestinations = useMemo(() => {
    const matched = DESTINATION_CHAINS.filter((chain) => {
      if (!q) return true;
      return (
        chain.name.toLowerCase().includes(q) ||
        chain.symbol.toLowerCase().includes(q) ||
        String(chain.viemChain.id).includes(q)
      );
    }).map((chain) => {
      const funded = isChainFunded(chain);
      return {
        ...chain,
        isAvailable: funded,
        isUnfunded: !funded,
      };
    });

    matched.sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      if (!q) {
        // Without search: curated / funded first by original catalog order
        return 0;
      }
      return a.name.localeCompare(b.name);
    });
    return matched;
  }, [q, fundedChainIds]);

  const LIST_WINDOW = q ? (showAllResults ? 200 : 80) : showAllResults ? 200 : 60;
  const filteredChains = rankedDestinations.slice(0, LIST_WINDOW);
  const hiddenCount = Math.max(0, rankedDestinations.length - filteredChains.length);

  const isInsufficient = depositAmount < totalCost;
  // Use live balances from availableTokens (sourceToken can be stale until sync runs)
  const liveBalance =
    availableTokens.find(
      (t) => t.symbol.toUpperCase() === (sourceToken?.symbol || "").toUpperCase()
    )?.balance ??
    sourceToken?.balance ??
    0;
  const tokenUsdPrice = getTokenUsdPrice(sourceToken?.symbol, ftsoPrices);
  const balanceUsd = liveBalance * tokenUsdPrice;
  const tokensNeeded = usdToTokenAmount(depositAmount, sourceToken?.symbol, ftsoPrices);
  const feeUsd = protocolFeeUsd(depositAmount);
  const isBalanceInsufficient =
    !!sourceToken && isConnected && !balancesLoading && depositAmount > balanceUsd * 0.98;

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <ChainSelectorModal
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
        onSelect={(chain) => {
          setSourceChain(chain);
          setIsChainModalOpen(false);
        }}
        selectedChainId={sourceChain?.id}
      />
      <TokenSelectorModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onSelect={setSourceToken}
        selectedTokenSymbol={sourceToken?.symbol}
        tokens={availableTokens}
        sourceChain={sourceChain}
      />

      {/* Summary Card */}
      <div className="glass-card relative mb-6 overflow-hidden rounded-3xl border border-theme p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-95"
          style={{
            background:
              "linear-gradient(135deg, #E62058 0%, #E46389 55%, #24292E 160%)",
          }}
        />
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display mb-2 text-5xl font-bold tracking-tight text-white">
              ${totalCost.toFixed(2)}
            </h1>
            <p className="text-lg font-medium text-white/90">
              Total estimated cost for{" "}
              <span className="font-bold text-white">{selectedChains.length} chains</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-white/25 bg-black/10 px-2.5 py-1 font-semibold text-white/95">
                Flare Summer Signal · Track 1
              </span>
              <span className="rounded-full border border-white/25 bg-black/10 px-2.5 py-1 text-white/85">
                Pay FXRP / C2FLR → gas everywhere
              </span>
              <a
                href="https://faucet.flare.network/coston2"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/25"
              >
                Get C2FLR + FXRP faucet →
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMintWizardOpen(true);
                }}
                className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-white/25"
              >
                Mint FXRP wizard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chain + tx configuration (always expanded) */}
      <div className="pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Chain Selector */}
              <div className="glass-card rounded-3xl p-6 h-[500px] flex flex-col border-white/10 bg-black/20">
                <div className="mb-4">
                  <h2 className="text-lg font-bold mb-1 text-white">Select Chains</h2>
                  <p className="text-xs text-white/60">
                    {DESTINATION_CHAINS.length.toLocaleString()} EVM destinations · funded treasuries only
                  </p>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                  <input
                    type="text"
                    placeholder="Search 1000+ chains (name, symbol, id)..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowAllResults(false);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                  {filteredChains.map((chain) => {
                    const isSelected = selectedChains.find((c) => c.id === chain.id);
                    const isAvailable = chain.isAvailable;
                    const statusLabel = isAvailable
                      ? null
                      : chain.isUnfunded
                      ? "(Unfunded)"
                      : "(Coming Soon)";
                    return (
                      <div
                        key={`${chain.viemChain.id}-${chain.id}`}
                        onClick={() => isAvailable && toggleChain(chain)}
                        className={clsx(
                          "p-3 rounded-xl border transition-all flex items-center justify-between group",
                          isAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-40",
                          isSelected
                            ? "bg-white/20 border-white/40 shadow-lg"
                            : isAvailable
                            ? "bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10"
                            : "bg-transparent border-white/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <ChainLogo
                            chainId={chain.viemChain.id}
                            name={chain.name}
                            src={chain.logo}
                            size={32}
                            className={clsx(!isAvailable && "grayscale opacity-50")}
                          />
                          <div>
                            <div className="font-bold text-sm text-white flex items-center gap-2">
                              {chain.name}
                              {statusLabel && (
                                <span className="text-[10px] text-white/40 font-normal">{statusLabel}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-white/60">
                              {chain.symbol} · {chain.viemChain.id}
                            </div>
                          </div>
                        </div>
                        <div
                          className={clsx(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-white border-white"
                              : isAvailable
                              ? "border-white/20 group-hover:border-white/40"
                              : "border-white/10"
                          )}
                        >
                          {isSelected && <div className="w-2 h-2 bg-black rounded-full" />}
                        </div>
                      </div>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllResults(true)}
                      className="w-full py-3 text-xs font-semibold text-white/70 hover:text-white border border-white/10 rounded-xl"
                    >
                      Show more ({hiddenCount.toLocaleString()} more in catalog
                      {q ? " matching search" : ""})
                    </button>
                  )}
                  {q && rankedDestinations.length === 0 && (
                    <p className="text-xs text-white/50 text-center py-6">No chains match “{searchTerm}”</p>
                  )}
                </div>
              </div>

              {/* Right Column: Gas amount per destination */}
              <div className="glass-card rounded-3xl p-6 h-[500px] flex flex-col border-white/10 bg-black/20">
                <div className="mb-4">
                  <h2 className="text-lg font-bold mb-1 text-white">Gas amount</h2>
                  <p className="text-xs text-white/60">
                    How much gas you need on each destination — enough for about N typical future transactions.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                  {selectedChains.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/40 text-center p-4">
                      <Settings2 className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">Select chains to set gas amounts.</p>
                    </div>
                  ) : (
                    selectedChains.map((chain) => {
                      const txCount = transactionCounts[chain.id] || 5;
                      const gasUsd = txCount * chain.avgTxCost;
                      return (
                      <div key={chain.id} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ChainLogo
                              chainId={chain.viemChain.id}
                              name={chain.name}
                              src={chain.logo}
                              size={20}
                            />
                            <span className="font-bold text-sm text-white">{chain.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-white">
                              ${gasUsd.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-white/60">gas budget</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-white/60">
                              Gas amount:{" "}
                              <span className="text-white font-bold">${gasUsd.toFixed(2)}</span>
                            </span>
                            <span className="text-white/40" title="Estimated typical transactions this gas can cover">
                              covers ~{txCount} future txs
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="50"
                            value={txCount}
                            onChange={(e) => updateTransactionCount(chain.id, parseInt(e.target.value))}
                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                          />
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
      </div>

      {/* Source Selection Card */}
      <div className="glass-card rounded-3xl p-8 mb-8 border-theme bg-theme-muted">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 text-theme">Fund & Disperse</h2>
          <p className="text-secondary text-sm">Select your source chain and token.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source Chain */}
          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 block">Source Chain</label>
            <button
              onClick={() => setIsChainModalOpen(true)}
              className="w-full bg-theme-muted border border-theme rounded-2xl p-4 flex items-center justify-between hover:bg-muted hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                {sourceChain ? (
                  <ChainLogo
                    chainId={sourceChain.viemChain.id}
                    name={sourceChain.name}
                    src={sourceChain.logo}
                    size={40}
                    className="bg-theme-muted p-0.5 shadow-md group-hover:scale-110 transition-transform"
                  />
                ) : (
                  <ChainLogo
                    chainId={SOURCE_CHAINS[0]?.viemChain.id || 114}
                    name={SOURCE_CHAINS[0]?.name || "Coston2"}
                    src={SOURCE_CHAINS[0]?.logo}
                    size={40}
                    className="bg-theme-muted p-0.5 shadow-md"
                  />
                )}
                <div className="text-left">
                  <div className="font-bold text-lg text-theme">{sourceChain?.name || "Select Chain"}</div>
                  <div className="text-xs text-secondary font-medium">{sourceChain?.symbol}</div>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-secondary group-hover:text-theme transition-colors" />
            </button>
          </div>

          {/* Token */}
          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
              Token to Deposit
            </label>
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                {sourceToken ? (
                  <>
                    {sourceToken.logo && !imageErrors.has(sourceToken.symbol) ? (
                      <img
                        src={sourceToken.logo}
                        alt={sourceToken.symbol}
                        className="w-10 h-10 rounded-full bg-white p-0.5 shadow-md"
                        onError={() => {
                          setImageErrors((prev) => new Set([...prev, sourceToken.symbol]));
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-base font-bold">
                        {sourceToken.symbol.charAt(0)}
                      </div>
                    )}
                    <div className="text-left">
                      <div className="font-bold text-lg text-theme">{sourceToken.name}</div>
                      <div className="text-xs text-secondary font-medium">{sourceToken.symbol}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-theme-muted flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-lg text-theme">Select token</div>
                      <div className="text-xs text-secondary font-medium">Choose a token</div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {sourceToken && (
                  <div className="text-right mr-2">
                    <div className="text-sm font-bold text-theme">{liveBalance.toFixed(4)}</div>
                    <div className="text-[10px] text-secondary">Balance</div>
                  </div>
                )}
                <ChevronDown className="w-5 h-5 text-secondary group-hover:text-theme transition-colors" />
              </div>
            </button>
          </div>
        </div>

        {/* Amount Display */}
        <div className="mt-6">
          <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
            Required Deposit (USD)
          </label>
          <div className="bg-background/50 p-4 rounded-xl border border-border backdrop-blur-sm relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold text-secondary">$</span>
              <span className="text-3xl font-bold">{depositAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-secondary">
              <Wallet className="w-3 h-3" />
              <span>
                {balancesLoading
                  ? "Loading..."
                  : isConnected
                  ? `Wallet: ${liveBalance.toFixed(4)} ${sourceToken?.symbol || ""} ($${balanceUsd.toFixed(2)} @ $${tokenUsdPrice.toFixed(4)})`
                  : "Connect wallet to see balance"}
              </span>
            </div>
            {isConnected && sourceToken && (
              <div className="mt-2 text-xs text-secondary">
                Need ≈ <span className="text-theme font-semibold">{tokensNeeded.toFixed(4)} {sourceToken.symbol}</span>
                {" · "}
                Protocol fee ≈ ${feeUsd.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Validation Messages */}
        <div className="mt-4 space-y-2">
          {isInsufficient && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs text-red-200">
                <span className="font-bold block text-red-500">Insufficient Deposit</span>
                Minimum required: ${totalCost.toFixed(2)}
              </div>
            </div>
          )}

          {isBalanceInsufficient && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs text-red-200">
                <span className="font-bold block text-red-500">Insufficient Balance</span>
                You need more {sourceToken?.symbol}.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setIsTemplatesOpen(true)}
          className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <FolderOpen className="w-5 h-5" />
          Templates
        </button>
        <button
          onClick={() => setIsScheduleModalOpen(true)}
          disabled={isInsufficient || isBalanceInsufficient || selectedChains.length === 0}
          className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Calendar className="w-5 h-5" />
          Schedule
        </button>
      <button
        onClick={() => setCurrentStep(2)}
        disabled={isInsufficient || isBalanceInsufficient || selectedChains.length === 0}
          className="flex-1 py-4 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-lg"
      >
        Review & Deposit
        <ChevronRight className="w-5 h-5" />
      </button>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={async (schedule) => {
          try {
            await createSchedule(schedule);
            alert("Schedule created successfully!");
            setIsScheduleModalOpen(false);
          } catch (error: any) {
            alert(`Failed to create schedule: ${error.message}`);
          }
        }}
      />

      {/* Templates Modal */}
      {isTemplatesOpen && <DispersalTemplates onClose={() => setIsTemplatesOpen(false)} />}

      {/* FAssets mint wizard (demo / Track 1 education) */}
      <FAssetsMintingWizard
        isOpen={isMintWizardOpen}
        onClose={() => setIsMintWizardOpen(false)}
        assetType="XRP"
      />
    </div>
  );
};

export default Step1Destinations;
