import { useAccount, useBalance, useReadContracts } from "wagmi";
import { formatUnits, Address } from "viem";
import { getTokenAddress, tokens } from "../data/tokens";
import { getViemChain } from "../data/chains";
import { useMemo } from "react";
import { Token } from "../types";

// ERC20 ABI for balanceOf and decimals
const ERC20_ABI = [
  {
    stateMutability: "view",
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "_owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

interface UseTokenBalancesReturn {
  balances: Token[];
  isLoading: boolean;
}

export const useTokenBalances = (chainId: string): UseTokenBalancesReturn => {
  const { address, isConnected } = useAccount();
  const viemChain = getViemChain(chainId);

  // Get native token balance
  const { data: nativeBalance, isLoading: nativeLoading } = useBalance({
    address,
    chainId: viemChain?.id,
    query: {
      enabled: isConnected && !!address && !!viemChain,
    },
  });

  // Filter tokens that are available on this chain
  const availableTokens = useMemo(() => {
    const isFlareChain = chainId === 'coston2' || chainId === 'flare' || 
                         (viemChain && (viemChain.id === 114 || viemChain.id === 14));
    
    return tokens.filter((token: Token) => {
      const tokenAddress = getTokenAddress(chainId, token.symbol);
      // Include token if it's native OR has an address on this chain
      // OR if it's an FAsset on a Flare chain (even without address yet)
      const isFAssetOnFlare = token.isFAsset && isFlareChain;
      return token.isNative || tokenAddress !== null || isFAssetOnFlare;
    });
  }, [chainId, viemChain]);

  // Prepare contract calls for ERC20 tokens
  const contracts = useMemo(() => {
    if (!address || !viemChain) return [];

    return availableTokens
      .filter((token: Token) => {
        const tokenAddress = getTokenAddress(chainId, token.symbol);
        return !token.isNative && tokenAddress;
      })
      .flatMap((token: Token) => {
        const tokenAddress = getTokenAddress(chainId, token.symbol);
        if (!tokenAddress) return [];

        return [
          {
            address: tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: "balanceOf" as const,
            args: [address],
            chainId: viemChain.id,
          },
          {
            address: tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: "decimals" as const,
            chainId: viemChain.id,
          },
        ];
      });
  }, [address, chainId, viemChain, availableTokens]);

  // Fetch all ERC20 balances and decimals in parallel
  const { data: contractData, isLoading: contractsLoading } = useReadContracts({
    contracts,
    query: {
      enabled: isConnected && !!address && !!viemChain && contracts.length > 0,
    },
  });

  // Process the results - only for tokens available on this chain
  const tokenBalances = useMemo(() => {
    return availableTokens.map((token: Token, index: number): Token | null => {
      const tokenAddress = getTokenAddress(chainId, token.symbol);
      const isNative = token.isNative || !tokenAddress;

      if (isNative) {
        // Check if this is the correct native token for this chain
        const isCorrectNative = 
          (chainId === 'coston2' && token.symbol === 'C2FLR') ||
          (chainId === 'flare' && token.symbol === 'FLR') ||
          (chainId === 'monadTestnet' && token.symbol === 'MON') ||
          (chainId !== 'coston2' && chainId !== 'flare' && chainId !== 'monadTestnet' && token.symbol === 'ETH');

        if (!isCorrectNative) {
          // Skip this native token if it's not for this chain
          return null as any;
        }

        return {
          ...token,
          balance: nativeBalance
            ? parseFloat(
                formatUnits(nativeBalance.value, nativeBalance.decimals)
              )
            : 0,
          address: null,
          isLoading: nativeLoading,
        };
      }

      // For ERC20 tokens, find the corresponding contract results
      // Each token has 2 contracts (balanceOf and decimals)
      const contractIndex =
        availableTokens.slice(0, index).filter((t: Token) => {
          const addr = getTokenAddress(chainId, t.symbol);
          return !t.isNative && addr;
        }).length * 2;

      const balanceResult = contractData?.[contractIndex];
      const decimalsResult = contractData?.[contractIndex + 1];

      const balance =
        balanceResult?.result && decimalsResult?.result
          ? parseFloat(
              formatUnits(
                balanceResult.result as bigint,
                decimalsResult.result as number
              )
            )
          : 0;

      // For FAssets without addresses, show balance as 0 (will be fetched separately if needed)
      return {
        ...token,
        balance: tokenAddress ? balance : (token.isFAsset ? 0 : balance),
        address: tokenAddress,
        isLoading: tokenAddress ? contractsLoading : false,
      };
    }).filter((t: Token | null): t is Token => t !== null); // Remove null entries
  }, [chainId, availableTokens, nativeBalance, nativeLoading, contractData, contractsLoading]);

  return {
    balances: tokenBalances,
    isLoading: nativeLoading || contractsLoading,
  };
};
