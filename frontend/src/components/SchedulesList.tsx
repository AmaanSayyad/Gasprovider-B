import React, { useState, useEffect } from "react";
import { Calendar, Clock, Repeat, Zap, Play, Pause, Trash2, Edit } from "lucide-react";
import { useAccount } from "wagmi";
import { fetchSchedules, createSchedule, pauseSchedule, resumeSchedule, cancelSchedule } from "../utils/api";

interface Schedule {
  id: string;
  name?: string;
  scheduleType: "one_time" | "recurring" | "auto_balance";
  scheduledAt?: string;
  recurrencePattern?: string;
  amountInUsd: string;
  status: "active" | "paused" | "cancelled" | "completed";
  nextExecutionAt?: string;
  lastExecutedAt?: string;
  executionCount: number;
  autoDisperseEnabled: boolean;
  monitorChainId?: number;
  balanceThreshold?: string;
}

const SchedulesList: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadSchedules();
    }
  }, [isConnected, address]);

  const loadSchedules = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const data = await fetchSchedules(address);
      setSchedules(data.schedules || []);
    } catch (error) {
      console.error("Failed to load schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseSchedule(id);
      await loadSchedules();
    } catch (error) {
      console.error("Failed to pause schedule:", error);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeSchedule(id);
      await loadSchedules();
    } catch (error) {
      console.error("Failed to resume schedule:", error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this schedule?")) return;
    try {
      await cancelSchedule(id);
      await loadSchedules();
    } catch (error) {
      console.error("Failed to cancel schedule:", error);
    }
  };

  const getScheduleIcon = (type: string) => {
    switch (type) {
      case "one_time":
        return <Clock className="w-4 h-4" />;
      case "recurring":
        return <Repeat className="w-4 h-4" />;
      case "auto_balance":
        return <Zap className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const formatNextExecution = (dateString?: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!isConnected) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-white/60">Connect your wallet to view schedules</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Scheduled Dispersals</h3>
        <button
          onClick={loadSchedules}
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/60">Loading schedules...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>No scheduled dispersals</p>
          <p className="text-sm mt-2">Create a schedule to automate your gas dispersals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
                      {getScheduleIcon(schedule.scheduleType)}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {schedule.name || `Schedule ${schedule.id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-white/60 capitalize">
                        {schedule.scheduleType.replace("_", " ")}
                        {schedule.recurrencePattern && ` • ${schedule.recurrencePattern}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-white/80 space-y-1 ml-8">
                    <div>Amount: ${schedule.amountInUsd}</div>
                    {schedule.nextExecutionAt && (
                      <div>Next: {formatNextExecution(schedule.nextExecutionAt)}</div>
                    )}
                    {schedule.autoDisperseEnabled && schedule.balanceThreshold && (
                      <div className="text-xs text-primary">
                        Auto-disperse when balance &lt; {schedule.balanceThreshold}
                      </div>
                    )}
                    {schedule.executionCount > 0 && (
                      <div className="text-xs text-white/60">
                        Executed {schedule.executionCount} time(s)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      schedule.status === "active"
                        ? "bg-green-500/20 text-green-500"
                        : schedule.status === "paused"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : "bg-gray-500/20 text-gray-500"
                    }`}
                  >
                    {schedule.status}
                  </span>

                  {schedule.status === "active" ? (
                    <button
                      onClick={() => handlePause(schedule.id)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      title="Pause"
                    >
                      <Pause className="w-4 h-4 text-white" />
                    </button>
                  ) : schedule.status === "paused" ? (
                    <button
                      onClick={() => handleResume(schedule.id)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      title="Resume"
                    >
                      <Play className="w-4 h-4 text-white" />
                    </button>
                  ) : null}

                  <button
                    onClick={() => handleCancel(schedule.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    title="Cancel"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchedulesList;

