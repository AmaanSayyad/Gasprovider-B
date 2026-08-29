"use client";
import {
  type EthereumProvider,
  type NexusNetwork,
  NexusSDK,
  type OnAllowanceHookData,
  type OnIntentHookData,
  type SupportedChainsResult,
  type UserAsset,
  type OnSwapIntentHookData,
  type SupportedChainsAndTokensResult,
} from "@avail-project/nexus-core";

import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount, useAccountEffect } from "wagmi";

interface NexusContextType {
  nexusSDK: NexusSDK | null;
  unifiedBalance: UserAsset[] | null;
  intent: RefObject<OnIntentHookData | null>;
  allowance: RefObject<OnAllowanceHookData | null>;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  exchangeRate: Record<string, number> | null;
  supportedChainsAndTokens: SupportedChainsAndTokensResult | null;
  swapSupportedChainsAndTokens: SupportedChainsResult | null;
  network?: NexusNetwork;
  loading: boolean;
  handleInit: (provider: EthereumProvider) => Promise<void>;
  fetchUnifiedBalance: () => Promise<void>;
  getFiatValue: (amount: number, token: string) => number;
  initializeNexus: (provider: EthereumProvider) => Promise<void>;
  deinitializeNexus: () => Promise<void>;
  attachEventHooks: () => void;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

type NexusProviderProps = {
  children: React.ReactNode;
  config?: {
    network?: NexusNetwork;
    debug?: boolean;
  };
};

const NexusProvider = ({
  children,
  config = {
    network: "mainnet",
    debug: true,
  },
}: NexusProviderProps) => {
  const sdk = useMemo(() => new NexusSDK(config), [config]);
  const [nexusSDK, setNexusSDK] = useState<NexusSDK | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const supportedChainsAndTokens =
    useRef<SupportedChainsAndTokensResult | null>(null);
  const swapSupportedChainsAndTokens = useRef<SupportedChainsResult | null>(
    null
  );
  const unifiedBalance = useRef<UserAsset[] | null>(null);
  const [unifiedBalanceState, setUnifiedBalanceState] = useState<UserAsset[] | null>(null);
  const exchangeRate = useRef<Record<string, number> | null>(null);

  const intent = useRef<OnIntentHookData | null>(null);
  const allowance = useRef<OnAllowanceHookData | null>(null);
  const swapIntent = useRef<OnSwapIntentHookData | null>(null);

  const initChainsAndTokens = useCallback(() => {
    const list = sdk?.utils?.getSupportedChains(
      config?.network === "testnet" ? 0 : undefined
    );
    supportedChainsAndTokens.current = list ?? null;
    const swapList = sdk?.utils?.getSwapSupportedChainsAndTokens();
    swapSupportedChainsAndTokens.current = swapList ?? null;
  }, [sdk, config?.network]);

  const initializeNexus = async (provider: EthereumProvider) => {
    setLoading(true);
    try {
      if (sdk.isInitialized()) throw new Error("Nexus is already initialized");
      await sdk.initialize(provider);
      setNexusSDK(sdk);
      initChainsAndTokens();
      const [unifiedBalanceResult, rates] = await Promise.allSettled([
        sdk?.getUnifiedBalances(true),
        sdk?.utils?.getCoinbaseRates(),
      ]);

      if (unifiedBalanceResult.status === "fulfilled") {
        unifiedBalance.current = unifiedBalanceResult.value;
        setUnifiedBalanceState(unifiedBalanceResult.value);
      }

      if (rates?.status === "fulfilled") {
        // Coinbase returns "units per USD" (e.g., 1 USD = 0.00028 ETH).
        // Convert to "USD per unit" (e.g., 1 ETH = ~$3514) for straightforward UI calculations.

        const usdPerUnit: Record<string, number> = {};

        for (const [symbol, value] of Object.entries(rates ?? {})) {
          const unitsPerUsd = Number.parseFloat(String(value));
          if (Number.isFinite(unitsPerUsd) && unitsPerUsd > 0) {
            usdPerUnit[symbol.toUpperCase()] = 1 / unitsPerUsd;
          }
        }

        for (const token of ["ETH", "USDC", "USDT"]) {
          usdPerUnit[token] ??= 1;
        }
        exchangeRate.current = usdPerUnit;
      }
    } catch (error) {
      console.error("Error initializing Nexus:", error);
    } finally {
      setLoading(false);
    }
  };

  const deinitializeNexus = async () => {
    try {
      if (!nexusSDK) throw new Error("Nexus is not initialized");
      await nexusSDK?.deinit();
      setNexusSDK(null);
      supportedChainsAndTokens.current = null;
      swapSupportedChainsAndTokens.current = null;
      unifiedBalance.current = null;
      setUnifiedBalanceState(null);
      exchangeRate.current = null;
      intent.current = null;
      swapIntent.current = null;
      allowance.current = null;
      setLoading(false);
    } catch (error) {
      console.error("Error deinitializing Nexus:", error);
    }
  };

  const attachEventHooks = () => {
    sdk.setOnAllowanceHook((data: OnAllowanceHookData) => {
      allowance.current = data;
    });

    sdk.setOnIntentHook((data: OnIntentHookData) => {
      intent.current = data;
    });

    sdk.setOnSwapIntentHook((data: OnSwapIntentHookData) => {
      swapIntent.current = data;
    });
  };

  const handleInit = useCallback(
    async (provider: EthereumProvider) => {
      if (loading) {
        return;
      }
      if (sdk.isInitialized()) {
        console.log("Nexus already initialized");
        return;
      }
      if (!provider || typeof provider.request !== "function") {
        throw new Error("Invalid EIP-1193 provider");
      }
      await initializeNexus(provider);
      attachEventHooks();
    },
    [sdk, loading, initializeNexus]
  );

  const fetchUnifiedBalance = async () => {
    try {
      if (!sdk?.isInitialized()) {
        console.warn("Nexus SDK not initialized, cannot fetch balances");
        return;
      }
      console.log("Fetching unified balances from all chains...");
      const updatedBalance = await sdk?.getUnifiedBalances(true);
      console.log("Raw unified balance response:", updatedBalance);
      
      // Log breakdown of balances per chain
      if (updatedBalance && Array.isArray(updatedBalance)) {
        updatedBalance.forEach((token) => {
          console.log(`Token ${token.symbol}:`, {
            totalBalance: token.balance,
            breakdown: token.breakdown?.map((b: any) => ({
              chain: b.chain?.name || b.chain?.id,
              balance: b.balance,
            })),
          });
        });
      }
      
      unifiedBalance.current = updatedBalance;
      setUnifiedBalanceState(updatedBalance);
      console.log("Unified balance updated:", updatedBalance);
    } catch (error) {
      console.error("Error fetching unified balance:", error);
    }
  };

  function getFiatValue(amount: number, token: string) {
    const key = token.toUpperCase();
    const rate = Number.parseFloat(String(exchangeRate.current?.[key] ?? "0"));
    const isValid = Number.isFinite(amount) && Number.isFinite(rate);
    const approx = isValid ? rate * amount : 0;

    return approx;
  }

  const { chainId, isConnected } = useAccount();
  const prevChainIdRef = useRef<number | undefined>(undefined);

  // Auto-refresh balances when chain changes
  useEffect(() => {
    if (isConnected && chainId && chainId !== prevChainIdRef.current && sdk?.isInitialized()) {
      console.log("Chain changed in NexusProvider, refreshing balances...", { from: prevChainIdRef.current, to: chainId });
      prevChainIdRef.current = chainId;
      // Add a small delay to ensure chain switch is complete
      const timeoutId = setTimeout(() => {
        fetchUnifiedBalance().catch((error) => {
          console.error("Error refreshing balances on chain change:", error);
        });
      }, 1000); // Wait 1 second for chain switch to complete
      
      return () => clearTimeout(timeoutId);
    } else if (chainId) {
      prevChainIdRef.current = chainId;
    }
  }, [chainId, isConnected, sdk, fetchUnifiedBalance]);

  useAccountEffect({
    onDisconnect() {
      deinitializeNexus();
      prevChainIdRef.current = undefined;
    },
  });

  const value = useMemo(
    () => ({
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      intent,
      allowance,
      handleInit,
      supportedChainsAndTokens: supportedChainsAndTokens.current,
      swapSupportedChainsAndTokens: swapSupportedChainsAndTokens.current,
      unifiedBalance: unifiedBalanceState,
      network: config?.network,
      loading,
      fetchUnifiedBalance,
      swapIntent,
      exchangeRate: exchangeRate.current,
      getFiatValue,
    }),
    [
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      intent.current,
      allowance.current,
      handleInit,
      supportedChainsAndTokens.current,
      swapSupportedChainsAndTokens.current,
      unifiedBalanceState,
      config,
      loading,
      fetchUnifiedBalance,
      swapIntent.current,
      exchangeRate.current,
      getFiatValue,
    ]
  );
  return (
    <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
  );
};

export function useNexus() {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error("useNexus must be used within a NexusProvider");
  }
  return context;
}

export default NexusProvider;
