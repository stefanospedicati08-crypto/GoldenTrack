import { useState } from "react";
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

export default function WeeklyMonthProgress({ sessions }) {
  const weeks = getMonthWeeks();
  const today = new Date().toISOString().split("T")[0];
  const [selectedWeek, setSelectedWeek] = useState(null);

  return (
    <>
      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-lg">Progresso Mensile</h3>
        <div className="flex justify-around items-center gap-2">
          {weeks.map((week, i) => {
            const weekSessions = sessions.filter(s => s.date >= week.start && s.date <= week.end);
            const uniqueDays = [...new Set(weekSessions.map(s => s.date))].length;
            const isCurrent = today >= week.start && today <= week.end;
            const isFuture = today < week.start;

            return (
              <button
                key={i}
                onClick={() => !isFuture && setSelectedWeek({ ...week, sessions: weekSessions })}
                disabled={isFuture}
                className={`flex flex-col items-center gap-1.5 transition-all ${isFuture ? "opacity-25 cursor-default" : "cursor-pointer hover:scale-105 active:scale-95"}`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wider ${isCurrent ? "text-accent" : "text-muted-foreground"}`}>
                  {week.label}
                  {isCurrent && <span className="ml-1">●</span>}
                </p>
                <ProgressCircle completed={uniqueDays} total={SESSIONS_PER_WEEK} size={80} />
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center">Tocca un cerchio per vedere i dettagli della settimana</p>
      </div>

      <AnimatePresence>
        {selectedWeek && (
          <WeekSessionModal week={selectedWeek} onClose={() => setSelectedWeek(null)} />
        )}
      </AnimatePresence>
    </>
  );
}