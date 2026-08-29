import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { SOURCE_CHAINS, DESTINATION_CHAINS, DEFAULT_DESTINATION_CHAINS } from "../data/chains";
import { useAccount, useSwitchChain } from "wagmi";
import { useTokenBalances } from "../hooks/useTokenBalances";
import { getViemChain } from "../data/chains";
import { useNexus } from "../components/nexus/NexusProvider";
import { tokens, getTokenAddress } from "../data/tokens";
import { getTreasuryBalances } from "../utils/api";
import {
  GasFountainContextType,
  GasFountainProviderProps,
  ChainData,
  HistoryItem,
  Token,
} from "../types";

const GasFountainContext = createContext<GasFountainContextType | undefined>(
  undefined
);

export const useGasFountain = (): GasFountainContextType => {
  const context = useContext(GasFountainContext);
  if (!context) {
    throw new Error("useGasFountain must be used within a GasFountainProvider");
  }
  return context;
};

export const GasFountainProvider: React.FC<GasFountainProviderProps> = ({
  children,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedChains, setSelectedChains] = useState<ChainData[]>([]);
  const [transactionCounts, setTransactionCounts] = useState<
    Record<string, number>
  >({});
  const [sourceChain, setSourceChainState] = useState<ChainData | null>(null);
  const [sourceToken, setSourceToken] = useState<
    import("../types").Token | null
  >(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  // History is now fetched from backend via ActivityLog component
  // Keeping this for backward compatibility with Step2Execution
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [depositTxHash, setDepositTxHash] = useState<string | undefined>(
    undefined
  );

  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const sourceChainId = sourceChain?.id || "coston2";
  
  // Try to use unified balances from Nexus SDK first, fallback to wagmi balances
  const { unifiedBalance } = useNexus();
  const { balances: wagmiBalances, isLoading: wagmiLoading } = useTokenBalances(sourceChainId);
  
  // Extract balances for the selected source chain from unified balance
  const tokenBalances = useMemo(() => {
    // If we have unified balance, try to extract balances for the selected chain
    if (unifiedBalance && Array.isArray(unifiedBalance) && unifiedBalance.length > 0 && sourceChain) {
      const viemChain = getViemChain(sourceChain.id);
      if (viemChain) {
        const chainBalances: Token[] = tokens.map((token) => {
          try {
            // Find this token in unified balance
            const unifiedToken = unifiedBalance.find((ut: any) => 
              ut.symbol?.toUpperCase() === token.symbol.toUpperCase()
            );
            
            if (unifiedToken && unifiedToken.breakdown && Array.isArray(unifiedToken.breakdown)) {
              // Find the balance for this specific chain
              const chainBalance = unifiedToken.breakdown.find((bd: any) => {
                const chainIdMatch = bd.chain?.id === viemChain.id;
                const chainNameMatch = bd.chain?.name?.toLowerCase() === sourceChain.name.toLowerCase();
                // Also check numeric chain ID as string
                const chainIdStringMatch = String(bd.chain?.id) === String(viemChain.id);
                return chainIdMatch || chainNameMatch || chainIdStringMatch;
              });
              
              if (chainBalance && chainBalance.balance) {
                const balanceValue = typeof chainBalance.balance === 'string' 
                  ? parseFloat(chainBalance.balance) 
                  : (typeof chainBalance.balance === 'number' ? chainBalance.balance : 0);
                
                return {
                  ...token,
                  balance: balanceValue || 0,
                  address: getTokenAddress(sourceChain.id, token.symbol) || null,
                  isLoading: false,
                };
              }
            }
          } catch (error) {
            console.warn(`Error extracting balance for token ${token.symbol}:`, error);
          }
          
          // Fallback to wagmi balance if not found in unified balance
          const wagmiToken = wagmiBalances.find((wt) => wt.symbol === token.symbol);
          
          // Include FAssets on Flare chains even without address
          const isFlareChain = sourceChain && (sourceChain.id === 'coston2' || sourceChain.id === 'flare');
          const tokenAddress = getTokenAddress(sourceChain.id, token.symbol);
          const shouldInclude = token.isNative || tokenAddress !== null || (token.isFAsset && isFlareChain);
          
          if (wagmiToken) {
            return wagmiToken;
          }
          
          if (!shouldInclude) {
            return null as any;
          }
          
          return { ...token, balance: 0, address: tokenAddress || null, isLoading: false };
        }).filter((t: Token | null): t is Token => t !== null);
        
        return chainBalances;
      }
    }
    
    // Fallback to wagmi balances if unified balance not available
    // Filter to include FAssets on Flare chains
    const isFlareChain = sourceChain && (sourceChain.id === 'coston2' || sourceChain.id === 'flare');
    const filteredWagmiBalances = (wagmiBalances || []).filter((token: Token) => {
      const tokenAddress = getTokenAddress(sourceChain?.id || '', token.symbol);
      return token.isNative || tokenAddress !== null || (token.isFAsset && isFlareChain);
    });
    
    return filteredWagmiBalances;
  }, [unifiedBalance, sourceChain, wagmiBalances]);
  
  const balancesLoading = wagmiLoading;

  // Initialize destination chains + realistic default tx counts (5 each)
  useEffect(() => {
    // Start from a safe default set — unfunded destinations break multi-chain disperse.
    const byId = new Map(DESTINATION_CHAINS.map((c) => [c.id, c]));
    const allowed = new Set(byId.keys());
    const defaults = DEFAULT_DESTINATION_CHAINS.length
      ? DEFAULT_DESTINATION_CHAINS
      : DESTINATION_CHAINS.slice(0, 5);
    setSelectedChains((prev) => {
      const refreshed = prev
        .filter((c) => allowed.has(c.id))
        .map((c) => byId.get(c.id) || c);
      if (refreshed.length === 0) return defaults;
      return refreshed;
    });
    setTransactionCounts((prev) => {
      const next: Record<string, number> = { ...prev };
      DESTINATION_CHAINS.forEach((c) => {
        if (next[c.id] === undefined || next[c.id] === 10) {
          next[c.id] = 5;
        }
      });
      Object.keys(next).forEach((id) => {
        if (!allowed.has(id)) delete next[id];
      });
      return next;
    });
  }, []);

  // Drop selected destinations whose treasuries are empty (live check)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getTreasuryBalances();
        const funded = new Set<number>();
        for (const row of res.balances || []) {
          try {
            if (BigInt(row.nativeBalance || "0") > 10n ** 12n) {
              funded.add(row.chainId);
            }
          } catch {
            /* ignore */
          }
        }
        if (cancelled || funded.size === 0) return;
        setSelectedChains((prev) => {
          const next = prev.filter((c) => funded.has(c.viemChain.id));
          return next.length > 0 ? next : prev;
        });
      } catch {
        /* keep defaults if balance API fails */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize source chain to Coston2 (Flare Summer Signal — Flare-first)
  useEffect(() => {
    if (!sourceChain && SOURCE_CHAINS.length > 0) {
      const coston2 = SOURCE_CHAINS.find((chain) => chain.id === "coston2");
      setSourceChainState(coston2 || SOURCE_CHAINS[0]);
    }
  }, [sourceChain]);

  // Prefer FXRP (then C2FLR) when source is Coston2 / Flare
  useEffect(() => {
    if (!sourceChain || sourceToken) return;
    const isFlare =
      sourceChain.id === "coston2" || sourceChain.id === "flare";
    if (!isFlare || tokenBalances.length === 0) return;
    const fxrp = tokenBalances.find((t) => t.symbol.toUpperCase() === "FXRP");
    const c2flr = tokenBalances.find((t) => t.symbol.toUpperCase() === "C2FLR");
    const flr = tokenBalances.find((t) => t.symbol.toUpperCase() === "FLR");
    if (fxrp) setSourceToken(fxrp);
    else if (c2flr) setSourceToken(c2flr);
    else if (flr) setSourceToken(flr);
  }, [sourceChain, sourceToken, tokenBalances, setSourceToken]);

  // Keep selected token balance in sync when wagmi/Nexus balances refresh
  useEffect(() => {
    if (!sourceToken || tokenBalances.length === 0) return;
    const updated = tokenBalances.find(
      (t) => t.symbol.toUpperCase() === sourceToken.symbol.toUpperCase()
    );
    if (
      updated &&
      (updated.balance !== sourceToken.balance ||
        updated.address !== sourceToken.address)
    ) {
      setSourceToken(updated);
    }
  }, [tokenBalances, sourceToken, setSourceToken]);

  // Handle chain switching
  const handleSwitchChain = useCallback(
    async (chain: ChainData): Promise<void> => {
      if (!isConnected || !address) {
        // If not connected, just set the chain (will prompt on connect)
        setSourceChainState(chain);
        return;
      }

      const viemChain = getViemChain(chain.id);
      if (!viemChain) return;

      // If already on the correct chain, just update state
      if (chainId === viemChain.id) {
        setSourceChainState(chain);
        return;
      }

      // Switch to the new chain
      try {
        await switchChain({ chainId: viemChain.id });
        setSourceChainState(chain);
      } catch (error) {
        console.error("Failed to switch chain:", error);
      }
    },
    [isConnected, address, chainId, switchChain]
  );

  // Update token balances when chain or connection changes
  useEffect(() => {
    if (isConnected && tokenBalances.length > 0) {
      // Update token balances in context
      // This will be used by components to display real balances
    }
  }, [isConnected, tokenBalances, sourceChainId]);

  const value: GasFountainContextType = {
    currentStep,
    setCurrentStep,
    selectedChains,
    setSelectedChains,
    transactionCounts,
    setTransactionCounts,
    sourceChain,
    setSourceChain: handleSwitchChain,
    sourceToken,
    setSourceToken,
    depositAmount,
    setDepositAmount,
    history,
    setHistory,
    // Wallet state
    isConnected,
    address,
    chainId,
    // Token balances
    tokenBalances,
    balancesLoading,
    // Deposit transaction
    depositTxHash,
    setDepositTxHash,
  };

  return (
    <GasFountainContext.Provider value={value}>
      {children}
    </GasFountainContext.Provider>
  );
};
