import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ProgressCircle from "./ProgressCircle";
import WeekSessionModal from "./WeekSessionModal";

const SESSIONS_PER_WEEK = 4;

function getMonthWeeks() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const firstMonday = new Date(firstDay);
  firstMonday.setDate(firstDay.getDate() + mondayOffset);
  const weeks = [];
  for (let i = 0; i < 4; i++) {
    const start = new Date(firstMonday);
    start.setDate(firstMonday.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    weeks.push({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      label: `Settimana ${i + 1}`,
    });
  }
  return weeks;
}

export default function WeeklyMonthProgress({ sessions, compact = false }) {
  const weeks = getMonthWeeks();
  const today = new Date().toISOString().split("T")[0];
  const [selectedWeek, setSelectedWeek] = useState(null);
  const currentWeekIdx = weeks.findIndex(w => today >= w.start && today <= w.end);
  const [focusedIdx, setFocusedIdx] = useState(currentWeekIdx >= 0 ? currentWeekIdx : 0);

  function getItemStyle(i) {
    const diff = i - focusedIdx;
    const absDiff = Math.abs(diff);
    if (absDiff === 0) return { scale: 1, opacity: 1, y: 0, z: 10 };
    if (absDiff === 1) return { scale: 0.72, opacity: 0.45, y: 14, z: 5 };
    return { scale: 0.52, opacity: 0.18, y: 26, z: 1 };
  }

  const circleSize = compact ? 54 : 82;
  const containerHeight = compact ? 110 : 160;
  const itemW = compact ? 70 : 110;

  return (
    <>
      <div className="space-y-1">
        {!compact && <h3 className="font-heading font-semibold text-lg">Progresso Mensile</h3>}
        <div
          className="relative overflow-hidden"
          style={{ height: containerHeight }}
        >
          {/* Arc carousel */}
          <div className="absolute inset-0 flex items-center justify-center">
            {weeks.map((week, i) => {
              const weekSessions = sessions.filter(s => s.date >= week.start && s.date <= week.end);
              const uniqueDays = [...new Set(weekSessions.map(s => s.date))].length;
              const isCurrent = today >= week.start && today <= week.end;
              const isFuture = today < week.start;
              const isFocused = i === focusedIdx;
              const style = getItemStyle(i);
              const xOffset = (i - focusedIdx) * itemW;

              return (
                <motion.button
                  key={i}
                  onClick={() => {
                    if (i === focusedIdx && !isFuture) {
                      setSelectedWeek({ ...week, sessions: weekSessions });
                    } else {
                      setFocusedIdx(i);
                    }
                  }}
                  disabled={isFuture && !isFocused}
                  animate={{
                    x: xOffset,
                    scale: style.scale,
                    opacity: style.opacity,
                    y: style.y,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ position: "absolute", zIndex: style.z }}
                  className={`flex flex-col items-center ${compact ? "gap-1" : "gap-2"} ${isFuture ? "cursor-default" : "cursor-pointer"}`}
                >
                  <p className={`${compact ? "text-[9px]" : "text-xs"} font-bold uppercase tracking-widest ${
                    isFocused && isCurrent ? "text-primary" : isFocused ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {compact ? `S${i+1}` : week.label}
                  </p>
                  <ProgressCircle completed={uniqueDays} total={SESSIONS_PER_WEEK} size={circleSize} />
                  {isCurrent && isFocused && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </motion.button>
              );
            })}
          </div>
          {/* Nav arrows */}
          {focusedIdx > 0 && (
            <button onClick={() => setFocusedIdx(f => f - 1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors">
              ‹
            </button>
          )}
          {focusedIdx < weeks.length - 1 && (
            <button onClick={() => setFocusedIdx(f => f + 1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors">
              ›
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedWeek && (
          <WeekSessionModal week={selectedWeek} onClose={() => setSelectedWeek(null)} />
        )}
      </AnimatePresence>
    </>
  );
}