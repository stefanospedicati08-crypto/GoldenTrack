import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Zap, Heart, MessageSquare, Flame, ChevronDown, ChevronUp, Dumbbell, Clock } from "lucide-react";
import { motion } from "framer-motion";
import moment from "moment";
import "moment/locale/it";
moment.locale("it");

export default function WeekSessionModal({ week, onClose }) {
  const [logs, setLogs] = useState({});
  const [loadingDate, setLoadingDate] = useState(null);
  const [expandedDate, setExpandedDate] = useState(null);

  async function toggleLoads(date) {
    if (expandedDate === date) { setExpandedDate(null); return; }
    if (!logs[date]) {
      setLoadingDate(date);
      const dateLogs = await base44.entities.WorkoutLog.filter({ date }, "set_number", 200);
      setLogs(prev => ({ ...prev, [date]: dateLogs }));
      setLoadingDate(null);
    }
    setExpandedDate(date);
  }

  const sessionsByDate = {};
  week.sessions.forEach(s => {
    if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
    sessionsByDate[s.date].push(s);
  });
  const sortedDates = Object.keys(sessionsByDate).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-lg">{week.label}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sortedDates.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">Nessuna sessione registrata questa settimana</p>
        ) : (
          <div className="space-y-3">
            {sortedDates.map(date => {
              const dateSessions = sessionsByDate[date];
              const dateLogsArr = logs[date] || [];
              const exerciseGroups = {};
              dateLogsArr.forEach(l => {
                if (!exerciseGroups[l.exercise_name]) exerciseGroups[l.exercise_name] = [];
                exerciseGroups[l.exercise_name].push(l);
              });

              return (
                <div key={date} className="bg-secondary/30 rounded-xl border border-border overflow-hidden">
                  <div className="p-3 space-y-2">
                    <p className="font-semibold text-sm capitalize">{moment(date).format("dddd D MMMM")}</p>
                    {dateSessions.map((s, i) => (
                      <div key={i} className="space-y-1.5">
                        {s.day_label && <p className="text-xs text-muted-foreground font-medium">{s.day_label}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          {s.rpe && (
                            <span className="flex items-center gap-1 text-xs bg-chart-3/10 text-chart-3 px-2 py-0.5 rounded-full font-medium">
                              <Zap className="w-3 h-3" /> RPE {s.rpe}/10
                            </span>
                          )}
                          {s.heart_rate_avg && (
                            <span className="flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                              <Heart className="w-3 h-3" /> {s.heart_rate_avg} bpm
                            </span>
                          )}
                          {s.calories && (
                            <span className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-medium">
                              <Flame className="w-3 h-3" /> {s.calories} kcal
                            </span>
                          )}
                          {s.training_minutes && (
                            <span className="flex items-center gap-1 text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> {s.training_minutes} min
                            </span>
                          )}
                        </div>
                        {s.athlete_note && (
                          <p className="text-xs text-muted-foreground italic flex items-start gap-1.5">
                            <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />{s.athlete_note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => toggleLoads(date)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:bg-secondary/50 transition-colors border-t border-border"
                  >
                    <Dumbbell className="w-3.5 h-3.5" />
                    {expandedDate === date ? "Nascondi carichi" : "Storico carichi serie"}
                    {loadingDate === date ? (
                      <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    ) : expandedDate === date ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {expandedDate === date && (
                    <div className="px-3 pb-3 space-y-3">
                      {Object.keys(exerciseGroups).length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Nessun carico registrato</p>
                      ) : (
                        Object.entries(exerciseGroups).map(([exName, exLogs]) => (
                          <div key={exName} className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{exName}</p>
                            <div className="space-y-1">
                              {exLogs.sort((a, b) => a.set_number - b.set_number).map(log => (
                                <div key={log.id} className="flex items-center gap-3 text-xs bg-secondary/40 rounded-lg px-2 py-1.5">
                                  <span className="text-muted-foreground w-14">Serie {log.set_number}</span>
                                  <span>{log.reps_done || "—"} rep</span>
                                  <span className="font-bold text-primary ml-auto">{log.weight_kg ? `${log.weight_kg} kg` : "—"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}