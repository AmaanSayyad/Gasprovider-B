import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import {
  GAS_FOUNDATION_ABI,
  getContractAddress,
  USDC_DECIMALS,
} from "../contracts/gasFountain";
import { ERC20_ABI } from "../contracts/erc20";
import { getNumericChainId } from "../data/chains";
import { getEscrowTokenAddress } from "../data/tokens";
import { ChainData } from "../types";
import { useAccount } from "wagmi";

interface UseDepositOptions {
  totalAmountUsd: number; // Total amount in USD
  selectedChains: ChainData[];
  transactionCounts: Record<string, number>;
  sourceChain: ChainData | null; // Source chain to determine contract address
}

interface UseDepositReturn {
  deposit: () => void;
  approve: () => void;
  isLoading: boolean;
  isPending: boolean;
  isApproving: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  approvalTxHash: `0x${string}` | undefined;
  needsApproval: boolean;
  hasSufficientBalance: boolean;
  isApprovalSuccess: boolean;
}

/**
 * Hook to interact with the Gas Foundation deposit contract.
 * Converts USD amounts to the escrow token (6 decimals) and deposits them.
 */
export function useDeposit({
  totalAmountUsd,
  selectedChains,
  transactionCounts,
  sourceChain,
}: UseDepositOptions): UseDepositReturn {
  const { address } = useAccount();
  const [error, setError] = useState<Error | null>(null);

  // Get contract address based on source chain.
  // No cross-chain fallback: defaulting to Base's address on a chain that has
  // no contract there would send the deposit into a dead address.
  const contractAddress = sourceChain ? getContractAddress(sourceChain.id) : undefined;

  // Shown in messages so they name the token the user is actually spending.
  const tokenLabel = sourceChain?.id === "botchain" ? "USDT" : "USDC";

  // The stablecoin this chain's escrow accepts (USDT on BOT Chain).
  const usdcAddress = (
    sourceChain ? getEscrowTokenAddress(sourceChain.id) : getEscrowTokenAddress("base")
  ) as `0x${string}` | null;

  // Prepare chain IDs and amounts
  const chainIds = selectedChains
    .map((chain) => getNumericChainId(chain.id))
    .filter((id): id is number => id !== undefined)
    .map((id) => BigInt(id));

  const chainAmounts = selectedChains.map((chain) => {
    const amountUsd = (transactionCounts[chain.id] || 10) * chain.avgTxCost;
    // Convert USD to the escrow token (6 decimals)
    return parseUnits(amountUsd.toFixed(6), USDC_DECIMALS);
  });

  // Convert total amount to the escrow token
  const totalAmount = parseUnits(totalAmountUsd.toFixed(6), USDC_DECIMALS);

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress || undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && usdcAddress && contractAddress
        ? [address, contractAddress]
        : undefined,
    query: {
      enabled: !!address && !!usdcAddress && !!contractAddress,
    },
  });

  // What the wallet actually holds of the escrow token. Without this the app
  // happily walked the user through an approval and a deposit signature for a
  // transfer that could only revert, then showed the raw chain error.
  const { data: tokenBalance } = useReadContract({
    address: usdcAddress || undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdcAddress,
    },
  });

  // Approval transaction
  const {
    writeContract: writeApprove,
    data: approvalHash,
    isPending: isApprovingPending,
    error: approveError,
  } = useWriteContract();

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

  // Check if approval is needed
  // Approval is needed if allowance is less than totalAmount
  // If allowance is sufficient, we don't need approval regardless of isApprovalSuccess
  const needsApproval =
    !!address &&
    !!usdcAddress &&
    !!contractAddress &&
    totalAmount > 0n &&
    (allowance === undefined || allowance < totalAmount);

  // Debug logging
  useEffect(() => {
    if (address && usdcAddress && contractAddress) {
    }
  }, [
    needsApproval,
    allowance,
    totalAmount,
    address,
    usdcAddress,
    contractAddress,
  ]);

  // Deposit transaction
  const {
    writeContract: writeDeposit,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isTxError,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Refetch allowance after approval succeeds to verify it was updated
  useEffect(() => {
    if (isApprovalSuccess && approvalHash) {
      // Refetch allowance after a short delay to ensure it's updated on-chain
      setTimeout(() => {
        refetchAllowance();
      }, 2000);
    }
  }, [isApprovalSuccess, approvalHash, refetchAllowance]);

  const approve = () => {
    setError(null);

    if (!usdcAddress) {
      const err = new Error("No deposit token configured for this chain");
      setError(err);
      console.error("Approval error:", err);
      return;
    }

    if (!contractAddress) {
      const err = new Error("Contract address not found");
      setError(err);
      console.error("Approval error:", err);
      return;
    }


    try {
      writeApprove({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [contractAddress, maxUint256], // Approve max for convenience
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      console.error("Approval error:", error);
    }
  };

  const deposit = () => {
    setError(null);

    if (chainIds.length === 0) {
      const err = new Error("No destination chains selected");
      setError(err);
      console.error("Deposit error:", err);
      return;
    }

    if (chainIds.length !== chainAmounts.length) {
      const err = new Error("Chain IDs and amounts mismatch");
      setError(err);
      console.error("Deposit error:", err);
      return;
    }

    // Refuse before asking for a signature: the escrow reverts on an
    // insufficient balance, and a raw revert is not something a user can act on.
    if (typeof tokenBalance === "bigint" && tokenBalance < totalAmount) {
      const short = formatUnits(totalAmount - tokenBalance, USDC_DECIMALS);
      const held = formatUnits(tokenBalance, USDC_DECIMALS);
      const err = new Error(
        `Not enough ${tokenLabel} to deposit. You hold ${held} and need ${short} more.`
      );
      setError(err);
      console.error("Deposit error:", err);
      return;
    }

    // CRITICAL: Always check if approval is needed before depositing
    if (needsApproval) {
      if (!isApprovalSuccess) {
        const err = new Error(
          "Token approval required. Please approve spending first."
        );
        setError(err);
        console.error("Deposit error:", err);
        return;
      }
      // If approval was successful but allowance hasn't updated yet, wait
      if (allowance === undefined || allowance < totalAmount) {
        const err = new Error(
          "Waiting for approval to be confirmed. Please try again in a moment."
        );
        setError(err);
        console.error("Deposit error:", err);
        return;
      }
    }

    // Calculate sum of chain amounts to verify it matches totalAmount
    const sumOfChainAmounts = chainAmounts.reduce(
      (sum, amount) => sum + amount,
      0n
    );



    // Verify sum matches total
    if (sumOfChainAmounts !== totalAmount) {
      const err = new Error(
        `Amounts do not sum to totalAmount. Sum: ${sumOfChainAmounts.toString()}, Total: ${totalAmount.toString()}`
      );
      setError(err);
      console.error("Deposit validation error:", err);
      return;
    }

    if (!contractAddress) {
      const err = new Error(
        `No escrow contract is configured for ${sourceChain?.name || "this chain"}`
      );
      setError(err);
      console.error("Deposit error:", err);
      return;
    }

    // Final contract call payload

    try {
      writeDeposit({
        address: contractAddress,
        abi: GAS_FOUNDATION_ABI,
        functionName: "deposit",
        args: [totalAmount, chainIds, chainAmounts],
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      console.error("Deposit error:", error);
    }
  };

  const finalError = error || writeError || txError || approveError || null;

  return {
    deposit,
    approve,
    isLoading:
      isPending || isConfirming || isApprovingPending || isApprovalConfirming,
    isPending,
    isApproving: isApprovingPending || isApprovalConfirming,
    isSuccess,
    isError: isTxError || !!finalError,
    error:
      finalError instanceof Error
        ? finalError
        : finalError
        ? new Error(String(finalError))
        : null,
    txHash: hash,
    approvalTxHash: approvalHash,
    needsApproval: needsApproval ?? false,
    hasSufficientBalance:
      typeof tokenBalance === "bigint" ? tokenBalance >= totalAmount : true,
    isApprovalSuccess: isApprovalSuccess ?? false,
  };
}
