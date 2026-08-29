import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

interface FTSOPriceBadgeProps {
  price?: number;
  symbol?: string;
  source?: "ftso" | "fallback";
  isLoading?: boolean;
  lastUpdate?: number;
  className?: string;
}

const FTSOPriceBadge: React.FC<FTSOPriceBadgeProps> = ({
  price,
  symbol,
  source = "ftso",
  isLoading = false,
  lastUpdate,
  className,
}) => {
  const formatPrice = (value: number): string => {
    if (value >= 1000) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (value >= 1) {
      return `$${value.toFixed(2)}`;
    } else {
      return `$${value.toFixed(4)}`;
    }
  };

  const getTimeSinceUpdate = (): string => {
    if (!lastUpdate) return "";
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (isLoading) {
    return (
      <div className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10", className)}>
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-secondary">Loading price...</span>
      </div>
    );
  }

  if (!price || !symbol) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={clsx(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
        source === "ftso"
          ? "bg-primary/10 border-primary/30"
          : "bg-orange-500/10 border-orange-500/30",
        className
      )}
    >
      {source === "ftso" ? (
        <TrendingUp className="w-4 h-4 text-primary" />
      ) : (
        <AlertCircle className="w-4 h-4 text-orange-500" />
      )}
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">
            {symbol} {formatPrice(price)}
          </span>
          {source === "ftso" && (
            <span className="text-xs font-medium text-primary/80">
              Powered by FTSO
            </span>
          )}
          {source === "fallback" && (
            <span className="text-xs font-medium text-orange-500/80">
              Fallback Source
            </span>
          )}
        </div>
        {lastUpdate && (
          <span className="text-xs text-secondary">
            {getTimeSinceUpdate()}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default FTSOPriceBadge;
