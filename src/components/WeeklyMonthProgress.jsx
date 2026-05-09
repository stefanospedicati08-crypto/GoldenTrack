import { useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
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
  const scrollRef = useRef(null);

  function handleScroll() {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const items = container.querySelectorAll('[data-week-item]');
    let closest = 0;
    let minDist = Infinity;
    items.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const dist = Math.abs((rect.left + rect.width / 2) - (containerRect.left + containerRect.width / 2));
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setFocusedIdx(closest);
  }

  const circleSize = compact ? 56 : 88;
  const containerHeight = compact ? circleSize + 40 : circleSize + 56;

  return (
    <>
      <div className="space-y-1">
        {!compact && <h3 className="font-heading font-semibold text-lg">Progresso Mensile</h3>}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ height: containerHeight }}
          className="relative flex items-center overflow-x-auto scrollbar-none snap-x snap-mandatory"
        >
          {/* Padding items to allow centering first/last */}
          <div className="shrink-0" style={{ width: compact ? "calc(50% - 36px)" : "calc(50% - 52px)" }} />
          {weeks.map((week, i) => {
            const weekSessions = sessions.filter(s => s.date >= week.start && s.date <= week.end);
            const uniqueDays = [...new Set(weekSessions.map(s => s.date))].length;
            const isCurrent = today >= week.start && today <= week.end;
            const isFuture = today < week.start;
            const isFocused = i === focusedIdx;
            const distance = Math.abs(i - focusedIdx);
            const scale = isFocused ? 1 : distance === 1 ? 0.75 : 0.55;
            const opacity = isFocused ? 1 : distance === 1 ? 0.45 : 0.2;

            return (
              <button
                key={i}
                data-week-item
                onClick={() => !isFuture && setSelectedWeek({ ...week, sessions: weekSessions })}
                disabled={isFuture}
                style={{ transform: `scale(${scale})`, opacity, transition: "transform 0.3s ease, opacity 0.3s ease" }}
                className={`flex flex-col items-center snap-center shrink-0 ${compact ? "gap-1 mx-1" : "gap-2 mx-2"} ${isFuture ? "cursor-default" : "cursor-pointer"}`}
              >
                <p className={`${compact ? "text-[9px]" : "text-xs"} font-semibold uppercase tracking-widest ${
                  isFocused && isCurrent ? "text-primary" : "text-muted-foreground"
                }`}>
                  {compact ? `S${i+1}` : week.label}
                </p>
                <ProgressCircle completed={uniqueDays} total={SESSIONS_PER_WEEK} size={circleSize} />
                {isCurrent && isFocused && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
          <div className="shrink-0" style={{ width: compact ? "calc(50% - 36px)" : "calc(50% - 52px)" }} />
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