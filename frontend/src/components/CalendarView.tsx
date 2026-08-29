import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { fetchSchedules } from "../utils/api";
import { motion } from "framer-motion";

interface Schedule {
  id: string;
  name?: string;
  scheduleType: "one_time" | "recurring" | "auto_balance";
  scheduledAt?: string;
  nextExecutionAt?: string;
  amountInUsd: string;
  status: string;
}

const CalendarView: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      loadSchedules();
    }
  }, [isConnected, address]);

  const loadSchedules = async () => {
    if (!address) return;
    try {
      const data = await fetchSchedules(address);
      setSchedules(data.schedules || []);
    } catch (error) {
      console.error("Failed to load schedules:", error);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getSchedulesForDate = (date: Date): Schedule[] => {
    const dateStr = date.toISOString().split("T")[0];
    return schedules.filter((schedule) => {
      if (schedule.scheduledAt) {
        const scheduleDate = new Date(schedule.scheduledAt).toISOString().split("T")[0];
        return scheduleDate === dateStr;
      }
      if (schedule.nextExecutionAt) {
        const nextDate = new Date(schedule.nextExecutionAt).toISOString().split("T")[0];
        return nextDate === dateStr;
      }
      return false;
    });
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split("T")[0];
      const isToday = dateStr === new Date().toISOString().split("T")[0];
      const isSelected = selectedDate?.toISOString().split("T")[0] === dateStr;
      const daySchedules = getSchedulesForDate(date);

      days.push(
        <motion.button
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`aspect-square p-2 rounded-lg border-2 transition-all relative ${
            isToday
              ? "border-primary bg-primary/10 text-primary font-bold"
              : isSelected
              ? "border-white/30 bg-white/10 text-white"
              : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-sm font-semibold">{day}</div>
          {daySchedules.length > 0 && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
              {daySchedules.slice(0, 3).map((_, idx) => (
                <div
                  key={idx}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                />
              ))}
              {daySchedules.length > 3 && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              )}
            </div>
          )}
        </motion.button>
      );
    }

    return days;
  };

  const selectedDateSchedules = selectedDate ? getSchedulesForDate(selectedDate) : [];

  if (!isConnected) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-40 text-white/60" />
        <p className="text-white/60">Connect your wallet to view scheduled dispersals</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Calendar View</h3>
        <button
          onClick={goToToday}
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm"
        >
          Today
        </button>
      </div>

      {/* Calendar Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h4 className="text-lg font-bold text-white">
            {monthNames[month]} {year}
          </h4>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-white/60 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Selected Date Schedules */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10"
        >
          <div className="text-sm font-semibold text-white mb-3">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          {selectedDateSchedules.length === 0 ? (
            <p className="text-sm text-white/60">No schedules for this date</p>
          ) : (
            <div className="space-y-2">
              {selectedDateSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {schedule.name || `Schedule ${schedule.id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-white/60">
                        ${schedule.amountInUsd} • {schedule.scheduleType.replace("_", " ")}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        schedule.status === "active"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-gray-500/20 text-gray-500"
                      }`}
                    >
                      {schedule.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default CalendarView;

