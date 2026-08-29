import React, { useState } from "react";
import { X, Calendar, Clock, Repeat, Zap, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGasFountain } from "../context/GasFountainContext";
import { useAccount } from "wagmi";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (schedule: any) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onSchedule }) => {
  const { selectedChains, sourceChain, sourceToken, depositAmount, transactionCounts } = useGasFountain();
  const { address } = useAccount();

  const [scheduleType, setScheduleType] = useState<"one_time" | "recurring" | "auto_balance">("one_time");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [recurrencePattern, setRecurrencePattern] = useState<"daily" | "weekly" | "monthly">("daily");
  const [scheduleName, setScheduleName] = useState("");
  
  // Auto-disperse settings
  const [monitorChainId, setMonitorChainId] = useState<number | undefined>();
  const [balanceThreshold, setBalanceThreshold] = useState("");
  const [checkInterval, setCheckInterval] = useState("60");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!address || !sourceChain || !sourceToken) {
      alert("Please connect wallet and select source chain/token");
      return;
    }

    // Build allocations from selected chains
    const allocations = selectedChains.map((chain) => ({
      destChainId: chain.viemChain?.id || 0,
      amountUsd: ((transactionCounts[chain.id] || 10) * chain.avgTxCost).toFixed(2),
    }));

    // Build scheduled date/time
    let scheduledAt: Date | undefined;
    if (scheduleType === "one_time" && scheduledDate && scheduledTime) {
      const [year, month, day] = scheduledDate.split("-").map(Number);
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      scheduledAt = new Date(year, month - 1, day, hours, minutes);
    }

    const schedule = {
      userAddress: address,
      name: scheduleName || undefined,
      sourceChainId: sourceChain.viemChain?.id || 0,
      // Native tokens have null address; backend expects a 0x address
      tokenAddress:
        sourceToken.address ||
        "0x0000000000000000000000000000000000000000",
      tokenSymbol: sourceToken.symbol,
      amountInUsd: depositAmount.toFixed(2),
      allocations,
      scheduleType,
      scheduledAt: scheduledAt?.toISOString(),
      recurrencePattern: scheduleType === "recurring" ? recurrencePattern : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      autoDisperseEnabled: scheduleType === "auto_balance",
      monitorChainId: scheduleType === "auto_balance" ? monitorChainId : undefined,
      balanceThreshold: scheduleType === "auto_balance" ? balanceThreshold : undefined,
      checkInterval: scheduleType === "auto_balance" ? parseInt(checkInterval) : undefined,
    };

    onSchedule(schedule);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl glass-card border border-theme rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-theme flex items-center justify-between sticky top-0 bg-theme-muted z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-2xl">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-theme">Schedule Dispersal</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            {/* Schedule Name */}
            <div>
              <label className="block text-sm font-semibold text-theme mb-2">
                Schedule Name (Optional)
              </label>
              <input
                type="text"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="e.g., Weekly Gas Top-up"
                className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Schedule Type */}
            <div>
              <label className="block text-sm font-semibold text-theme mb-3">
                Schedule Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setScheduleType("one_time")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    scheduleType === "one_time"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-theme bg-theme-muted text-secondary hover:border-primary/30"
                  }`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-2" />
                  <div className="text-sm font-semibold">One Time</div>
                </button>
                <button
                  onClick={() => setScheduleType("recurring")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    scheduleType === "recurring"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-theme bg-theme-muted text-secondary hover:border-primary/30"
                  }`}
                >
                  <Repeat className="w-5 h-5 mx-auto mb-2" />
                  <div className="text-sm font-semibold">Recurring</div>
                </button>
                <button
                  onClick={() => setScheduleType("auto_balance")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    scheduleType === "auto_balance"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-theme bg-theme-muted text-secondary hover:border-primary/30"
                  }`}
                >
                  <Zap className="w-5 h-5 mx-auto mb-2" />
                  <div className="text-sm font-semibold">Auto-Disperse</div>
                </button>
              </div>
            </div>

            {/* One-time Schedule */}
            {scheduleType === "one_time" && (
              <div className="space-y-4 p-4 bg-theme-muted rounded-xl border border-theme">
                <label className="block text-sm font-semibold text-theme mb-2">
                  Scheduled Date & Time
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-secondary mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-secondary mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Recurring Schedule */}
            {scheduleType === "recurring" && (
              <div className="space-y-4 p-4 bg-theme-muted rounded-xl border border-theme">
                <label className="block text-sm font-semibold text-theme mb-3">
                  Recurrence Pattern
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["daily", "weekly", "monthly"] as const).map((pattern) => (
                    <button
                      key={pattern}
                      onClick={() => setRecurrencePattern(pattern)}
                      className={`p-3 rounded-xl border-2 transition-all capitalize ${
                        recurrencePattern === pattern
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-theme bg-theme-muted text-secondary hover:border-primary/30"
                      }`}
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Auto-Disperse Settings */}
            {scheduleType === "auto_balance" && (
              <div className="space-y-4 p-4 bg-theme-muted rounded-xl border border-theme">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-4 h-4 text-primary" />
                  <label className="text-sm font-semibold text-theme">
                    Auto-Disperse When Balance Drops
                  </label>
                </div>

                <div>
                  <label className="block text-xs text-secondary mb-2">
                    Monitor Chain
                  </label>
                  <select
                    value={monitorChainId || ""}
                    onChange={(e) => setMonitorChainId(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">Select chain to monitor</option>
                    {selectedChains.map((chain) => (
                      <option key={chain.id} value={chain.viemChain?.id}>
                        {chain.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-secondary mb-2">
                    Balance Threshold (in native token)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={balanceThreshold}
                    onChange={(e) => setBalanceThreshold(e.target.value)}
                    placeholder="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-secondary mt-1">
                    Disperse when balance drops below this amount
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-secondary mb-2">
                    Check Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 rounded-xl bg-theme-muted border border-theme text-theme focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
              <div className="text-sm font-semibold text-theme mb-2">Summary</div>
              <div className="space-y-1 text-xs text-secondary">
                <div>Amount: ${depositAmount.toFixed(2)}</div>
                <div>Chains: {selectedChains.length}</div>
                <div>Source: {sourceChain?.name}</div>
                <div>Token: {sourceToken?.symbol}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-theme flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-theme-muted border border-theme text-theme hover:bg-muted transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 rounded-xl bg-primary text-white hover:bg-blue-600 transition-colors font-semibold shadow-lg shadow-primary/20"
            >
              Create Schedule
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ScheduleModal;

