"use client";
import React, { memo, useMemo, useState, useEffect, useCallback } from "react";
import { useNexus } from "../nexus/NexusProvider";
import { useAccount } from "wagmi";
import { DollarSign, RefreshCw, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Separator } from "../ui/separator";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTokenBalances } from "../../hooks/useTokenBalances";
import { getViemChain, getChainIdFromNumeric, chains } from "../../data/chains";
import { useFtsoPrices, getTokenUsdPrice } from "../../hooks/useFtsoPrices";
import type { UserAsset } from "@avail-project/nexus-core";
import ChainLogo from "../ChainLogo";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatBalance(value: string | number, decimals = 4): string {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(Math.min(4, decimals));
  return n.toFixed(Math.min(6, decimals));
}

const UnifiedBalance = ({ className }: { className?: string }) => {
  const { unifiedBalance, fetchUnifiedBalance } = useNexus();
  const { chainId, isConnected, address } = useAccount();
  const [refreshing, setRefreshing] = useState(false);
  const { prices: ftsoPrices } = useFtsoPrices();

  const currentChainIdString = chainId ? getChainIdFromNumeric(chainId) : undefined;
  const chainMeta = useMemo(
    () => chains.find((c) => c.id === currentChainIdString) || chains.find((c) => c.viemChain?.id === chainId),
    [currentChainIdString, chainId]
  );
  const { balances: wagmiBalances, isLoading: wagmiLoading } = useTokenBalances(
    currentChainIdString || ""
  );

  const handleRefresh = useCallback(async (): Promise<void> => {
    try {
      setRefreshing(true);
      await fetchUnifiedBalance?.();
    } catch (err) {
      console.error("Balance refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUnifiedBalance]);

  // Build assets from live wagmi balances (always available when wallet connected)
  const wagmiAssets = useMemo((): UserAsset[] => {
    if (!isConnected || !wagmiBalances?.length) return [];
    const viemChain = currentChainIdString ? getViemChain(currentChainIdString) : undefined;
    const chainName = chainMeta?.name || viemChain?.name || `Chain ${chainId}`;
    const chainLogo = chainMeta?.logo || "/flarelogo.png";

    return wagmiBalances
      .filter((t) => (t.balance ?? 0) > 0)
      .map((t) => {
        const bal = Number(t.balance) || 0;
        const usd = bal * getTokenUsdPrice(t.symbol, ftsoPrices);
        return {
          symbol: t.symbol,
          balance: String(bal),
          decimals: 18,
          balanceInFiat: usd,
          icon: t.logo || chainLogo,
          breakdown: [
            {
              chain: {
                id: viemChain?.id ?? chainId ?? 0,
                name: chainName,
                logo: chainLogo,
              },
              balance: String(bal),
              balanceInFiat: usd,
              contractAddress: (t.address ||
                "0x0000000000000000000000000000000000000000") as `0x${string}`,
              decimals: 18,
              universe: "evm" as any,
            },
          ],
        } as UserAsset;
      });
  }, [
    isConnected,
    wagmiBalances,
    currentChainIdString,
    chainMeta,
    chainId,
    ftsoPrices,
  ]);

  const tokens = useMemo(() => {
    const nexusPositive = (unifiedBalance ?? []).filter(
      (token) => Number.parseFloat(String(token.balance)) > 0
    );

    // Prefer Nexus multi-chain view when it has data; otherwise show live wagmi balances
    if (nexusPositive.length > 0) return nexusPositive;
    return wagmiAssets;
  }, [unifiedBalance, wagmiAssets]);

  const totalFiat = useMemo(() => {
    if (!tokens.length) return "0.00";
    const total = tokens.reduce((acc, token) => acc + (Number(token.balanceInFiat) || 0), 0);
    return total.toFixed(2);
  }, [tokens]);

  useEffect(() => {
    if (isConnected && fetchUnifiedBalance) {
      fetchUnifiedBalance().catch(() => {
        /* Nexus often fails; wagmi fallback still works */
      });
    }
  }, [isConnected, address, chainId, fetchUnifiedBalance]);

  const emptyMessage = !isConnected
    ? "Connect your wallet to see balances."
    : wagmiLoading || refreshing
    ? "Loading balances…"
    : "No positive balances on this chain.";

  return (
    <div className={cn("glass-card rounded-3xl p-6 mb-6 w-full max-w-4xl mx-auto", className)}>
      <div className="flex items-center justify-between w-full mb-3">
        <div className="text-xs font-semibold text-secondary uppercase tracking-wider">
          Total Balance
        </div>
        <div className="inline-flex items-center gap-3">
          <div className="inline-flex items-center gap-1 text-theme font-bold text-lg">
            <DollarSign className="w-4 h-4 text-primary" strokeWidth={3} />
            <span>{totalFiat}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || wagmiLoading}
            className="p-2 rounded-full border border-theme bg-theme-muted hover:bg-muted text-theme transition-colors disabled:opacity-50"
            aria-label="Refresh balances"
            title="Refresh balances"
          >
            {refreshing || wagmiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {tokens.length === 0 ? (
        <div className="text-center py-8 text-secondary">
          <p>{emptyMessage}</p>
          {isConnected && (
            <p className="text-xs mt-2">
              {chainMeta?.name || `Chain ${chainId}`}
              {address ? ` · ${address.slice(0, 6)}…${address.slice(-4)}` : ""}
            </p>
          )}
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full space-y-3">
          {tokens.map((token) => {
            const positiveBreakdown = (token.breakdown || []).filter(
              (chain) => Number.parseFloat(String(chain.balance)) > 0
            );
            const chainsCount = positiveBreakdown.length || 1;
            const chainsLabel = chainsCount > 1 ? `${chainsCount} chains` : `${chainsCount} chain`;
            return (
              <AccordionItem
                key={token.symbol}
                value={token.symbol}
                className="bg-theme-muted border border-theme rounded-2xl"
              >
                <AccordionTrigger
                  className="hover:no-underline cursor-pointer items-center px-4 py-3 rounded-2xl hover:bg-muted"
                  hideChevron={false}
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-7">
                        {token.icon && (
                          <img
                            src={token.icon}
                            alt={token.symbol}
                            className="rounded-full size-full ring-1 ring-theme object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-theme">{token.symbol}</h3>
                        <p className="text-xs text-secondary">{chainsLabel}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end pr-2">
                      <p className="text-sm font-semibold text-theme">
                        {formatBalance(token.balance)} {token.symbol}
                      </p>
                      <p className="text-xs text-secondary">
                        ${(Number(token.balanceInFiat) || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 px-4 pb-3">
                    {positiveBreakdown.map((chain, index) => (
                      <React.Fragment key={`${chain.chain.id}-${index}`}>
                        <div className="flex items-center justify-between px-1 py-1.5 rounded-md">
                          <div className="flex items-center gap-2">
                            <div className="relative size-5">
                              {(() => {
                                const match = chains.find(
                                  (c) =>
                                    c.viemChain?.id === chain?.chain?.id ||
                                    c.name.toLowerCase() ===
                                      String(chain?.chain?.name || "").toLowerCase()
                                );
                                if (match) {
                                  return (
                                    <ChainLogo
                                      chainId={match.viemChain.id}
                                      name={match.name}
                                      src={match.logo}
                                      size={20}
                                    />
                                  );
                                }
                                return (
                                  <img
                                    src={chain?.chain?.logo || "/flarelogo.png"}
                                    alt={chain.chain.name}
                                    className="rounded-full size-full ring-1 ring-theme object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                );
                              })()}
                            </div>
                            <span className="text-xs text-theme">{chain.chain.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-theme">
                              {formatBalance(chain.balance)} {token.symbol}
                            </p>
                            <p className="text-[11px] text-secondary">
                              ${(Number(chain.balanceInFiat) || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {index < positiveBreakdown.length - 1 && (
                          <Separator className="my-1 opacity-10" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

UnifiedBalance.displayName = "UnifiedBalance";
export default memo(UnifiedBalance);
