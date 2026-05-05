import { motion } from "framer-motion";
import { Calendar, ChevronRight, Dumbbell } from "lucide-react";
import { Link } from "react-router-dom";
import moment from "moment";
import "moment/locale/it";

moment.locale("it");

export default function SessioniPrecedenti({ logs }) {
  // Group logs by date
  const byDate = {};
  logs.forEach(log => {
    if (!byDate[log.date]) byDate[log.date] = [];
    byDate[log.date].push(log);
  });

  const sessions = Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5)
    .map(([date, entries]) => {
      const exercises = [...new Set(entries.map(e => e.exercise_name))];
      const totalSets = entries.length;
      const maxWeight = Math.max(...entries.map(e => e.weight_kg || 0).filter(Boolean));
      return { date, exercises, totalSets, maxWeight };
    });

  if (sessions.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center">
        <Dumbbell className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">Nessuna sessione precedente</p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-3">
      {sessions.map(({ date, exercises, totalSets, maxWeight }, i) => {
        const isToday = date === today;
        return (
          <motion.div
            key={date}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-4 bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isToday ? "bg-primary/10" : "bg-secondary"}`}>
              <Calendar className={`w-5 h-5 ${isToday ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm capitalize">
                  {isToday ? "Oggi" : moment(date).format("dddd D MMMM")}
                </p>
                {isToday && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">oggi</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {exercises.slice(0, 3).join(" · ")}{exercises.length > 3 ? ` +${exercises.length - 3}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-primary">{totalSets} serie</p>
              {maxWeight > 0 && (
                <p className="text-xs text-muted-foreground">{maxWeight} kg max</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}