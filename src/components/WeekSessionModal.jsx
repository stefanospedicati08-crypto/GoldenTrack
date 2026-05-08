import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Zap, Heart, MessageSquare, Flame, Clock, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import "moment/locale/it";
moment.locale("it");

export default function WeekSessionModal({ week, onClose }) {
  const [logs, setLogs] = useState({});
  const [loadingDate, setLoadingDate] = useState(null);
  const [expandedDate, setExpandedDate] = useState(null);

  async function toggleDate(date) {
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-4 px-4 pb-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl space-y-4 p-5 mt-12"
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
              const isExpanded = expandedDate === date;
              const isLoading = loadingDate === date;

              // Group logs by exercise
              const exerciseGroups = {};
              dateLogsArr.forEach(l => {
                if (!exerciseGroups[l.exercise_name]) exerciseGroups[l.exercise_name] = [];
                exerciseGroups[l.exercise_name].push(l);
              });

              return (
                <div key={date} className="bg-secondary/30 rounded-xl border border-border overflow-hidden">
                  {/* Clickable header */}
                  <button
                    className="w-full text-left p-3 hover:bg-secondary/50 transition-colors"
                    onClick={() => toggleDate(date)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm capitalize">{moment(date).format("dddd D MMMM")}</p>
                      <div className="flex items-center gap-2">
                        {isLoading && <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
                        {!isLoading && (isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
                      </div>
                    </div>

                    {/* Session metrics */}
                    {dateSessions.map((s, i) => (
                      <div key={i} className="mt-2 space-y-1.5">
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
                  </button>

                  {/* Load report */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pt-1">
                            <Dumbbell className="w-3.5 h-3.5" /> Report Carichi
                          </p>
                          {Object.keys(exerciseGroups).length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">Nessun carico registrato</p>
                          ) : (
                            Object.entries(exerciseGroups).map(([exName, exLogs]) => {
                              const maxWeight = Math.max(...exLogs.map(l => l.weight_kg || 0));
                              const totalSets = exLogs.length;
                              return (
                                <div key={exName} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold">{exName}</p>
                                    <span className="text-xs text-primary font-bold">{maxWeight > 0 ? `Max ${maxWeight} kg` : "—"}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {exLogs.sort((a, b) => a.set_number - b.set_number).map(log => (
                                      <div key={log.id} className="flex items-center gap-2 text-xs bg-secondary/50 rounded-lg px-2 py-1.5">
                                        <span className="text-muted-foreground">S{log.set_number}</span>
                                        <span>{log.reps_done || "—"} rep</span>
                                        <span className="font-bold text-primary ml-auto">{log.weight_kg ? `${log.weight_kg}kg` : "—"}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}