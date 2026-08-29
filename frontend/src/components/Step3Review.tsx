import React, { useState, useEffect } from "react";
import { useGasFountain } from "../context/GasFountainContext";
import VisualizationCanvas from "./VisualizationCanvas";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { useDeposit } from "../hooks/useDeposit";
import { useAccount } from "wagmi";
import { getExplorerUrl } from "../data/chains";
import { useReferral } from "../hooks/useReferral";
import { updateStreak } from "../utils/api";
import {
  usePrices,
  getTokenUsdPrice,
  usdToTokenAmount,
  protocolFeeUsd,
} from "../hooks/usePrices";
import ChainLogo from "./ChainLogo";

type Status = "idle" | "dispersing" | "error";


const Step3Review: React.FC = () => {
  const {
    setCurrentStep,
    selectedChains,
    sourceChain,
    sourceToken,
    depositAmount,
    transactionCounts,
    setDepositTxHash,
  } = useGasFountain();

  const { address, chainId } = useAccount();
  const { applyReferral } = useReferral();
  const { prices: prices } = usePrices();
  const estimatedFees = protocolFeeUsd(depositAmount);
  const tokenUsdPrice = getTokenUsdPrice(sourceToken?.symbol, prices);
  const tokensNeeded = usdToTokenAmount(
    depositAmount,
    sourceToken?.symbol,
    prices
  );
  const [status, setStatus] = useState<Status>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const tokenSymbol = (sourceToken?.symbol || "USDT").toUpperCase();


  const {
    deposit,
    approve,
    isLoading,
    isPending,
    isApproving,
    isSuccess,
    isError,
    error,
    txHash: depositTxHash,
    approvalTxHash,
    needsApproval,
    isApprovalSuccess,
  } = useDeposit({
    totalAmountUsd: depositAmount,
    selectedChains,
    transactionCounts,
    sourceChain,
  });

  // Update status based on deposit hook state
  useEffect(() => {
    console.log("Deposit state:", {
      isLoading,
      isPending,
      isApproving,
      isSuccess,
      isError,
      depositTxHash,
      error: error?.message,
    });

    if (isLoading || isPending || isApproving) {
      setStatus("dispersing");
    } else if (isSuccess && depositTxHash) {
      // Deposit transaction confirmed - submit to backend and navigate
      const submitToBackend = async () => {
        try {
          if (!address || !sourceChain) {
            console.error("Missing address or sourceChain");
            return;
          }

          // Calculate allocation percentages based on transaction counts
          const totalTxCount = selectedChains.reduce(
            (sum, chain) => sum + (transactionCounts[chain.id] || 10),
            0
          );
          
          const allocationPercentages = selectedChains.map((chain) => {
            const txCount = transactionCounts[chain.id] || 10;
            return (txCount / totalTxCount) * 100;
          });

          // Get numeric chain IDs
          const destinationChainIds = selectedChains
            .map((chain) => chain.viemChain?.id)
            .filter((id): id is number => id !== undefined);

          // Calculate and log amounts per destination chain before submitting
          const sourceAmountUsd = depositAmount;
          console.log("💰 PRE-TRANSACTION DISTRIBUTION SUMMARY");
          console.log("=".repeat(60));
          console.log(`📤 Source Chain: ${sourceChain?.name} (${sourceChain?.viemChain?.id})`);
          console.log(`💵 Total Deposit Amount: $${sourceAmountUsd.toFixed(2)} USD`);
          console.log(`📋 Number of Destination Chains: ${selectedChains.length}`);
          console.log("-".repeat(60));
          
          selectedChains.forEach((chain, index) => {
            const percentage = allocationPercentages[index];
            const amountUsd = (sourceAmountUsd * percentage) / 100;
            const txCount = transactionCounts[chain.id] || 10;
            console.log(`📍 ${chain.name} (Chain ID: ${chain.viemChain?.id})`);
            console.log(`   └─ Allocation: ${percentage.toFixed(2)}%`);
            console.log(`   └─ Amount: $${amountUsd.toFixed(2)} USD`);
            console.log(`   └─ Transaction Count: ${txCount}`);
          });
          console.log("=".repeat(60));

          // Submit deposit to backend using the selected source token
          const { submitTreasuryDeposit } = await import("../utils/api");
          const decimals =
            tokenSymbol === "USDC" || tokenSymbol === "USDT" ? 6 : 18;
          const amountBase = BigInt(
            Math.floor(depositAmount * 10 ** decimals)
          ).toString();

          const response = await submitTreasuryDeposit({
            userAddress: address,
            sourceChain: sourceChain.viemChain?.id || 677, // BOT Chain
            sourceToken: tokenSymbol,
            amount: amountBase,
            destinationChains: destinationChainIds,
            allocationPercentages,
            sourceTxHash: depositTxHash,
          });

          console.log("Backend response:", response);
          
          // Store the intent ID from backend response
          if (response.intentId) {
            setDepositTxHash(response.intentId); // Use intentId instead of txHash
          } else {
            setDepositTxHash(depositTxHash); // Fallback to txHash
          }
        } catch (err) {
          console.error("Failed to submit to backend:", err);
          // Still proceed with txHash as fallback
          setDepositTxHash(depositTxHash);
        }
      };

      setTxHash(depositTxHash);
      submitToBackend();
      
      // Navigate to execution step immediately to start polling
      setCurrentStep(3);
      
      // Apply referral code if present
      if (address) {
        applyReferral(depositTxHash).catch(console.error);
        
        // Update gamification streak
        updateStreak(address, "dispersal").catch(console.error);
      }
    } else if (isError) {
      setStatus("error");
      console.error("Deposit error:", error);
    }
  }, [
    isLoading,
    isPending,
    isApproving,
    isSuccess,
    isError,
    depositTxHash,
    setCurrentStep,
    setDepositTxHash,
    error,
    address,
    sourceChain,
    sourceToken,
    selectedChains,
    depositAmount,
    transactionCounts,
  ]);

  const handleBack = (): void => setCurrentStep(1);

  const handleDisperse = (): void => {
    if (!address) {
      setStatus("error");
      return;
    }
    const requiredChainId = sourceChain?.viemChain?.id;
    if (!requiredChainId) {
      setStatus("error");
      return;
    }
    if (chainId !== requiredChainId) {
      setStatus("error");
      return;
    }

    console.log("Disperse clicked", {
      needsApproval,
      approvalTxHash,
      selectedChains,
      depositAmount,
      address,
      chainId,
      requiredChainId: sourceChain?.viemChain?.id,
    });

    if (needsApproval) {
      if (!approvalTxHash) {
        console.log("Approval needed - calling approve...");
        approve();
      } else {
        console.log(
          "Approval transaction pending, waiting for confirmation..."
        );
      }
    } else {
      console.log(
        "Approval not needed or already approved - calling deposit...",
        {
          totalAmountUsd: depositAmount,
          selectedChains: selectedChains.length,
          isApprovalSuccess,
        }
      );
      deposit();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <>
        {/* Review Summary - Compact at Top */}
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">Review Dispersion</h2>
            <p className="text-secondary text-sm">
              Confirm details before sending.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-secondary font-medium">
                Source: {tokenSymbol} on {sourceChain?.name || "BOT Chain"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Source Info */}
            <div className="bg-background/30 p-4 rounded-xl border border-border backdrop-blur-sm">
              <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                Source
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {sourceChain && (
                    <ChainLogo
                      chainId={sourceChain.viemChain.id}
                      name={sourceChain.name}
                      src={sourceChain.logo}
                      size={24}
                    />
                  )}
                  <span className="font-medium">{sourceChain?.name}</span>
                </div>
                <div className="font-bold text-sm text-right">
                  <div>${depositAmount.toFixed(2)}</div>
                  <div className="text-xs text-secondary font-medium">
                    ≈ {tokensNeeded.toFixed(4)} {sourceToken?.symbol || ""} @ $
                    {tokenUsdPrice.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Destinations Summary */}
            <div className="bg-background/30 p-4 rounded-xl border border-border backdrop-blur-sm">
              <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                Destinations
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {selectedChains.length} chains
                </span>
                <div className="flex gap-1">
                  {selectedChains.slice(0, 3).map((chain) => (
                    <ChainLogo
                      key={chain.id}
                      chainId={chain.viemChain.id}
                      name={chain.name}
                      src={chain.logo}
                      size={20}
                    />
                  ))}
                  {selectedChains.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">
                      +{selectedChains.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Total Cost */}
            <div className="bg-background/30 p-4 rounded-xl border border-border backdrop-blur-sm">
              <div className="text-xs text-secondary uppercase tracking-wider mb-2">
                Total Cost
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">
                  ${(depositAmount + estimatedFees).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-secondary mt-1">
                Gas deposit: ${depositAmount.toFixed(2)} + Protocol fee (2%): $
                {estimatedFees.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-border">
            <button
              onClick={handleBack}
              disabled={status === "dispersing"}
              className="flex-1 py-3 bg-muted text-secondary rounded-xl font-bold hover:bg-border transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={handleDisperse}
              disabled={
                status === "dispersing" ||
                isApproving ||
                !address ||
                (!!sourceChain?.viemChain?.id &&
                  chainId !== sourceChain.viemChain.id)
              }
              title={
                !address
                  ? "Please connect your wallet"
                  : sourceChain?.viemChain?.id &&
                    chainId !== sourceChain.viemChain.id
                  ? `Please switch to ${sourceChain.name} network`
                  : needsApproval
                  ? "Click to approve USDC spending"
                  : "Click to disperse gas"
              }
              className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {status === "dispersing" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isApproving
                    ? "Approving USDC..."
                    : isPending
                    ? "Confirming Deposit..."
                    : "Processing..."}
                </>
              ) : isApproving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Approving USDC...
                </>
              ) : needsApproval ? (
                "Approve USDC"
              ) : (
                "Disperse Gas"
              )}
            </button>
          </div>

          {status === "error" && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-500">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold mb-1">Transaction Failed</div>
                <div className="text-sm break-words line-clamp-3">
                  {error?.message ||
                    (!address
                      ? "Please connect your wallet"
                      : chainId !== (sourceChain?.viemChain?.id || 8453)
                      ? `Please switch to ${
                          sourceChain?.name || "Base"
                        } network`
                      : "Unknown error occurred")}
                </div>
              </div>
            </div>
          )}

          {(txHash || approvalTxHash) && sourceChain && (
            <div className="mt-4 text-center space-y-2">
              {approvalTxHash && (
                <div>
                  <a
                    href={`${getExplorerUrl(
                      sourceChain.id
                    )}/tx/${approvalTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View Approval on {sourceChain.name} Explorer
                  </a>
                </div>
              )}
              {txHash && (
                <div>
                  <a
                    href={`${getExplorerUrl(sourceChain.id)}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View Deposit on {sourceChain.name} Explorer
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Full Width Visualization */}
        <div className="w-full h-[600px] lg:h-[800px] glass-card rounded-2xl p-4 overflow-hidden">
          <VisualizationCanvas
            isDispersing={status === "dispersing"}
            isCompleted={false}
          />
        </div>
      </>
    </div>
  );
};

export default Step3Review;
