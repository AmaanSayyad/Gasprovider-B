import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import FTSOPriceBadge from "./FTSOPriceBadge";

interface PriceData {
  symbol: string;
  price: number;
  change24h?: number;
  source: "ftso" | "fallback";
  lastUpdate: number;
}

interface FTSOPriceDisplayProps {
  prices: PriceData[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const FTSOPriceDisplay: React.FC<FTSOPriceDisplayProps> = ({
  prices,
  isLoading = false,
  onRefresh,
  className,
}) => {
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});
  const [priceChanges, setPriceChanges] = useState<Record<string, "up" | "down" | "same">>({});

  useEffect(() => {
    const changes: Record<string, "up" | "down" | "same"> = {};
    
    prices.forEach((priceData) => {
      const prevPrice = previousPrices[priceData.symbol];
      if (prevPrice !== undefined) {
        if (priceData.price > prevPrice) {
          changes[priceData.symbol] = "up";
        } else if (priceData.price < prevPrice) {
          changes[priceData.symbol] = "down";
        } else {
          changes[priceData.symbol] = "same";
        }
      }
    });

    setPriceChanges(changes);

    // Update previous prices
    const newPrevPrices: Record<string, number> = {};
    prices.forEach((priceData) => {
      newPrevPrices[priceData.symbol] = priceData.price;
    });
    setPreviousPrices(newPrevPrices);

    // Clear change indicators after animation
    const timeout = setTimeout(() => {
      setPriceChanges({});
    }, 2000);

    return () => clearTimeout(timeout);
  }, [prices]);

  const formatPrice = (value: number): string => {
    if (value >= 1000) {
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (value >= 1) {
      return value.toFixed(2);
    } else {
      return value.toFixed(4);
    }
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  if (prices.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={clsx("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-white">Live Prices</h3>
          <span className="text-xs text-secondary font-medium px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30">
            Powered by FTSO
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx("w-4 h-4 text-secondary", isLoading && "animate-spin")} />
          </button>
        )}
      </div>

      {/* Price Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {prices.map((priceData) => {
            const change = priceChanges[priceData.symbol];
            const hasChange24h = priceData.change24h !== undefined;

            return (
              <motion.div
                key={priceData.symbol}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  backgroundColor: change === "up" 
                    ? "rgba(34, 197, 94, 0.1)" 
                    : change === "down" 
                    ? "rgba(239, 68, 68, 0.1)" 
                    : "rgba(255, 255, 255, 0.05)"
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className={clsx(
                  "p-4 rounded-xl border transition-all",
                  priceData.source === "ftso"
                    ? "border-white/10"
                    : "border-orange-500/30"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm text-secondary font-medium">
                      {priceData.symbol}
                    </div>
                    <motion.div
                      key={priceData.price}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className="text-2xl font-bold text-white"
                    >
                      ${formatPrice(priceData.price)}
                    </motion.div>
                  </div>
                  
                  {change && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      className={clsx(
                        "p-1.5 rounded-full",
                        change === "up" && "bg-green-500/20",
                        change === "down" && "bg-red-500/20"
                      )}
                    >
                      {change === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
                      {change === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
                      {change === "same" && <Minus className="w-4 h-4 text-secondary" />}
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  {hasChange24h && (
                    <div className={clsx(
                      "text-sm font-medium",
                      priceData.change24h! >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {formatChange(priceData.change24h!)}
                    </div>
                  )}
                  
                  <div className={clsx(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    priceData.source === "ftso"
                      ? "bg-primary/10 text-primary"
                      : "bg-orange-500/10 text-orange-500"
                  )}>
                    {priceData.source === "ftso" ? "FTSO" : "Fallback"}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {isLoading && prices.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-secondary">Loading prices...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FTSOPriceDisplay;
