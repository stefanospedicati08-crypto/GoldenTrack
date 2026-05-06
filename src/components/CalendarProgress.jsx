import { useMemo } from "react";
import moment from "moment";
import { motion } from "framer-motion";

export default function CalendarProgress({ sessions }) {
  const today = moment();
  const year = today.year();
  const month = today.month();

  const sessionDates = useMemo(() => {
    return new Set(sessions.map(s => s.date));
  }, [sessions]);

  const firstDay = moment({ year, month, day: 1 });
  const daysInMonth = firstDay.daysInMonth();
  // 0=Sun, shift to Mon=0
  const startDow = (firstDay.day() + 6) % 7; // Monday-based
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  const days = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startDow + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    const dateStr = moment({ year, month, day: dayNum }).format("YYYY-MM-DD");
    return { dayNum, dateStr };
  });

  const weekLabels = ["L", "M", "M", "G", "V", "S", "D"];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-heading font-semibold text-base mb-3">
        {today.format("MMMM YYYY").charAt(0).toUpperCase() + today.format("MMMM YYYY").slice(1)}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekLabels.map((l, i) => (
          <span key={i} className="text-[10px] font-semibold text-muted-foreground uppercase">{l}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const isToday = d.dateStr === today.format("YYYY-MM-DD");
          const hasSession = sessionDates.has(d.dateStr);
          return (
            <div
              key={i}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all
                ${hasSession ? "bg-accent text-accent-foreground font-bold" : ""}
                ${isToday && !hasSession ? "ring-2 ring-primary text-primary font-bold" : ""}
                ${isToday && hasSession ? "ring-2 ring-accent" : ""}
                ${!hasSession && !isToday ? "text-muted-foreground" : ""}
              `}
            >
              {d.dayNum}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent" />
          <span className="text-xs text-muted-foreground">Sessione completata</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded ring-2 ring-primary" />
          <span className="text-xs text-muted-foreground">Oggi</span>
        </div>
      </div>
    </motion.div>
  );
}