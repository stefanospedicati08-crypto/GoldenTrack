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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#1c1f28] border-t border-white/10 rounded-t-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-1 sticky top-0" />

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between py-4 sticky top-4 bg-[#1c1f28] z-10">
            <h3 className="font-heading font-bold text-lg text-white">{week.label}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-2xl bg-white/8 hover:bg-white/12 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-white/30 text-sm">Nessuna sessione questa settimana</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDates.map(date => {
                const dateSessions = sessionsByDate[date];
                const dateLogsArr = logs[date] || [];
                const isExpanded = expandedDate === date;
                const isLoading = loadingDate === date;

                const exerciseGroups = {};
                dateLogsArr.forEach(l => {
                  if (!exerciseGroups[l.exercise_name]) exerciseGroups[l.exercise_name] = [];
                  exerciseGroups[l.exercise_name].push(l);
                });

                return (
                  <div key={date} className="bg-white/4 border border-white/7 rounded-2xl overflow-hidden">
                    {/* Date header */}
                    <button
                      className="w-full text-left p-4 hover:bg-white/3 transition-colors"
                      onClick={() => toggleDate(date)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm text-white capitalize">
                          {moment(date).format("dddd D MMMM")}
                        </p>
                        <div className="flex items-center gap-2">
                          {isLoading && <div className="w-3.5 h-3.5 border-2 border-[#fcd12a]/30 border-t-[#fcd12a] rounded-full animate-spin" />}
                          {!isLoading && (isExpanded
                            ? <ChevronUp className="w-4 h-4 text-white/30" />
                            : <ChevronDown className="w-4 h-4 text-white/30" />)}
                        </div>
                      </div>

                      {/* Metrics per session */}
                      {dateSessions.map((s, i) => (
                        <div key={i} className="space-y-2">
                          {s.day_label && (
                            <p className="text-[11px] text-white/40 font-medium">{s.day_label}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {s.rpe && (
                              <span className="flex items-center gap-1 text-[11px] bg-orange-400/10 text-orange-400 px-2 py-0.5 rounded-full font-medium">
                                <Zap className="w-3 h-3" /> RPE {s.rpe}
                              </span>
                            )}
                            {s.heart_rate_avg && (
                              <span className="flex items-center gap-1 text-[11px] bg-red-400/10 text-red-400 px-2 py-0.5 rounded-full font-medium">
                                <Heart className="w-3 h-3" /> {s.heart_rate_avg} bpm
                              </span>
                            )}
                            {s.calories && (
                              <span className="flex items-center gap-1 text-[11px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full font-medium">
                                <Flame className="w-3 h-3" /> {s.calories} kcal
                              </span>
                            )}
                            {s.training_minutes && (
                              <span className="flex items-center gap-1 text-[11px] bg-white/6 text-white/40 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> {s.training_minutes} min
                              </span>
                            )}
                          </div>
                          {s.athlete_note && (
                            <p className="text-xs text-white/35 italic flex items-start gap-1.5">
                              <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 text-white/25" />{s.athlete_note}
                            </p>
                          )}
                        </div>
                      ))}
                    </button>

                    {/* Exercise report */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-2 border-t border-white/6 space-y-3">
                            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest flex items-center gap-1.5">
                              <Dumbbell className="w-3 h-3" /> Report Carichi
                            </p>
                            {Object.keys(exerciseGroups).length === 0 ? (
                              <p className="text-xs text-white/30 text-center py-2">Nessun carico registrato</p>
                            ) : (
                              Object.entries(exerciseGroups).map(([exName, exLogs]) => {
                                const maxWeight = Math.max(...exLogs.map(l => l.weight_kg || 0));
                                return (
                                  <div key={exName} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-semibold text-white/70">{exName}</p>
                                      <span className="text-xs text-[#fcd12a]/80 font-bold">
                                        {maxWeight > 0 ? `Max ${maxWeight} kg` : "—"}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                      {exLogs.sort((a, b) => a.set_number - b.set_number).map(log => (
                                        <div key={log.id} className="flex items-center gap-2 text-xs bg-white/4 rounded-xl px-2.5 py-1.5">
                                          <span className="text-white/30 w-5 shrink-0">S{log.set_number}</span>
                                          <span className="text-white/50">{log.reps_done || "—"} rep</span>
                                          <span className="font-bold text-[#fcd12a]/80 ml-auto">
                                            {log.weight_kg ? `${log.weight_kg}kg` : "—"}
                                          </span>
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
        </div>
      </motion.div>
    </div>
  );
}