import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ProgressCircle from "./ProgressCircle";
import WeekSessionModal from "./WeekSessionModal";



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

export default function WeeklyMonthProgress({ sessions, compact = false, sessionsPerWeek = 4 }) {
  const weeks = getMonthWeeks();
  const today = new Date().toISOString().split("T")[0];
  const [selectedWeek, setSelectedWeek] = useState(null);
  const currentWeekIdx = weeks.findIndex(w => today >= w.start && today <= w.end);
  const [focusedIdx, setFocusedIdx] = useState(currentWeekIdx >= 0 ? currentWeekIdx : 0);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragVel = useRef(0);

  function getItemStyle(i) {
    let diff = i - focusedIdx;
    if (Math.abs(diff) > weeks.length / 2) {
      diff = diff > 0 ? diff - weeks.length : diff + weeks.length;
    }
    const absDiff = Math.abs(diff);
    if (absDiff === 0) return { scale: 1.35, opacity: 1, y: 0, z: 10 };
    if (absDiff === 1) return { scale: 0.68, opacity: 0.4, y: 16, z: 5 };
    return { scale: 0.45, opacity: 0.12, y: 32, z: 1 };
  }

  function handleDragStart(e) {
    setDragging(true);
    dragStartX.current = e.type.includes('mouse') ? e.clientX : e.touches?.[0]?.clientX || 0;
    dragVel.current = 0;
  }

  function handleDragMove(e) {
    if (!dragging) return;
    const currentX = e.type.includes('mouse') ? e.clientX : e.touches?.[0]?.clientX || 0;
    const delta = currentX - dragStartX.current;
    dragVel.current = delta;
  }

  function handleDragEnd() {
    setDragging(false);
    const threshold = 30;
    if (Math.abs(dragVel.current) > threshold) {
      if (dragVel.current > 0) {
        setFocusedIdx((focusedIdx - 1 + weeks.length) % weeks.length);
      } else if (dragVel.current < 0) {
        setFocusedIdx((focusedIdx + 1) % weeks.length);
      }
    }
  }

  useEffect(() => {
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [focusedIdx, dragging]);

  const circleSize = compact ? 54 : 82;
  const containerHeight = compact ? 110 : 160;
  const itemW = compact ? 70 : 110;

  return (
    <>
      <div className="space-y-1 relative z-0">
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
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                  onClick={() => {
                    if (i === focusedIdx && !isFuture && Math.abs(dragVel.current) < 10) {
                      setSelectedWeek({ ...week, sessions: weekSessions });
                    }
                  }}
                  disabled={isFuture && !isFocused}
                  animate={{
                    x: xOffset,
                    scale: style.scale,
                    opacity: style.opacity,
                    y: style.y,
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 35 }}
                  style={{ position: "absolute", zIndex: style.z, userSelect: "none" }}
                  className={`flex flex-col items-center ${compact ? "gap-1" : "gap-2"} ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
                >
                  <p className={`${compact ? "text-[9px]" : "text-xs"} font-bold uppercase tracking-widest ${
                    isFocused && isCurrent ? "text-primary" : isFocused ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {compact ? `S${i+1}` : week.label}
                  </p>
                  <ProgressCircle completed={uniqueDays} total={sessionsPerWeek} size={circleSize} />
                  {isCurrent && isFocused && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </motion.button>
              );
            })}
          </div>

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