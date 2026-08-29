/**
 * Component to display hardcoded exchange rates for Treasury system
 * Styled to match FTSOPriceDisplay but uses hardcoded rates
 * Requirements: 2.4, 4.1, 9.4
 */

import React, { useEffect, useState } from "react";
import { TrendingUp, DollarSign } from "lucide-react";
import { getTreasurySupportedChains } from "../utils/api";

interface TreasuryPriceDisplayProps {
  tokenSymbol?: string;
  chainId?: number;
  className?: string;
}

const TreasuryPriceDisplay: React.FC<TreasuryPriceDisplayProps> = ({
  tokenSymbol,
  chainId,
  className = "",
}) => {
  const [price, setPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setIsLoading(true);
        const response = await getTreasurySupportedChains();

        if (tokenSymbol) {
          // Find token price
          const token = response.supportedTokens.find(
            (t) => t.symbol.toUpperCase() === tokenSymbol.toUpperCase()
          );
          if (token) {
            setPrice(token.usdPrice);
          }
        } else if (chainId) {
          // Find chain native token price
          const chain = response.chains.find((c) => c.chainId === chainId);
          if (chain) {
            setPrice(chain.nativeTokenUsdPrice);
          }
        }
      } catch (error) {
        console.error("Failed to fetch Treasury prices:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
  }, [tokenSymbol, chainId]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-secondary ${className}`}>
        <TrendingUp className="w-3 h-3 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  if (price === null) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
        <DollarSign className="w-3 h-3 text-primary" />
        <span className="text-xs font-semibold text-primary">
          ${price.toFixed(price < 1 ? 4 : 2)}
        </span>
      </div>
      <div className="text-xs text-secondary">
        Hardcoded Rate
      </div>
    </div>
  );
};

export default TreasuryPriceDisplay;
