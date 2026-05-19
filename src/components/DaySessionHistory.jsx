import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Calendar, Heart, Zap, MessageSquare, Dumbbell } from "lucide-react";
import moment from "moment";
import "moment/locale/it";
moment.locale("it");

export default function DaySessionHistory({ sessions, dayLabel, logs }) {
  const [open, setOpen] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);

  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter((l) => l.date === today);

  // Filter sessions for this day
  const daySessions = sessions.
  filter((s) => s.day_label === dayLabel).
  sort((a, b) => b.date.localeCompare(a.date)).
  slice(0, 10);

  if (daySessions.length === 0) return null;

  const prevSession = daySessions[0]; // most recent past session

  return (
    <div className="bg-secondary/30 border border-border overflow-hidden rounded-[50px]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors rounded-[50px]">
        
        <Calendar className="w-4 h-4 text-[hsl(var(--foreground))]" />
        <span className="text-sm font-medium flex-1 text-[hsl(var(--primary))]">Storico sessioni — {dayLabel}</span>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{daySessions.length} sessioni</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden">
          
            <div className="px-4 pb-4 space-y-3">

              {/* Confronto sessione precedente vs corrente */}
              {prevSession && todayLogs.length > 0 && (() => {
                const prevLogs = logs.filter((l) => l.date === prevSession.date && !l.is_warmup);
                const currLogs = todayLogs.filter((l) => !l.is_warmup);
                const exerciseNames = [...new Set([...prevLogs, ...currLogs].map((l) => l.exercise_name))];
                if (exerciseNames.length === 0) return null;
                return (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">Confronto con sessione precedente</p>
                    <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold text-muted-foreground mb-1">
                      <span>Esercizio</span>
                      <span className="text-center">{moment(prevSession.date).format("DD/MM")}</span>
                      <span className="text-center text-primary">Oggi</span>
                    </div>
                    {exerciseNames.map((exName) => {
                      const pLogs = prevLogs.filter((l) => l.exercise_name === exName);
                      const cLogs = currLogs.filter((l) => l.exercise_name === exName);
                      const pMax = pLogs.length ? Math.max(...pLogs.map((l) => l.weight_kg || 0)) : null;
                      const cMax = cLogs.length ? Math.max(...cLogs.map((l) => l.weight_kg || 0)) : null;
                      return (
                        <div key={exName} className="grid grid-cols-3 gap-1 items-center py-1 border-t border-border/50">
                          <span className="text-xs font-medium truncate">{exName}</span>
                          <span className="text-xs text-center text-muted-foreground">{pMax ? `${pMax}kg` : "—"}</span>
                          <span className={`text-xs text-center font-bold ${cMax && pMax && cMax > pMax ? "text-accent" : cMax && pMax && cMax < pMax ? "text-destructive" : "text-primary"}`}>
                            {cMax ? `${cMax}kg` : "—"}
                            {cMax && pMax && cMax !== pMax && <span className="font-normal text-[10px] ml-0.5">({cMax > pMax ? "+" : ""}{(cMax - pMax).toFixed(1)})</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {daySessions.map((session, i) => {
              const sessionLogs = logs.filter((l) => l.date === session.date && !l.is_warmup);
              const exerciseNames = [...new Set(sessionLogs.map((l) => l.exercise_name))];
              const isExpanded = expandedSession === session.id;

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-xl border border-border overflow-hidden">
                  
                    <button
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/30 transition-colors">
                      <div>
                        <p className="text-sm font-semibold capitalize">
                          {moment(session.date).format("dddd D MMMM YYYY")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {session.rpe &&
                          <span className="flex items-center gap-1 text-xs bg-chart-3/10 text-chart-3 px-2 py-0.5 rounded-full font-medium">
                              <Zap className="w-3 h-3" /> RPE {session.rpe}/10
                            </span>
                          }
                          {session.heart_rate_avg &&
                          <span className="flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                              <Heart className="w-3 h-3" /> {session.heart_rate_avg} bpm
                            </span>
                          }
                          <span className="text-xs text-muted-foreground">{exerciseNames.length} esercizi</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded &&
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden border-t border-border">
                        
                          <div className="p-3 space-y-2">
                            {exerciseNames.map((exName) => {
                              const exLogs = sessionLogs.filter((l) => l.exercise_name === exName).sort((a, b) => a.set_number - b.set_number);
                              return (
                                <div key={exName} className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Dumbbell className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="text-xs font-semibold text-primary">{exName}</span>
                                  </div>
                                  <div className="pl-5 space-y-0.5">
                                    {exLogs.map((l) => (
                                      <div key={l.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="w-14 shrink-0">Serie {l.set_number}</span>
                                        <span className="font-medium text-foreground">{l.reps_done || "—"} rep</span>
                                        {l.weight_kg && <span className="font-bold text-primary">{l.weight_kg} kg{l.weight_kg_2 ? ` / ${l.weight_kg_2} kg` : ""}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            {session.athlete_note &&
                            <div className="flex items-start gap-2 bg-secondary/50 rounded-lg px-3 py-2 mt-2">
                                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground italic">{session.athlete_note}</p>
                              </div>
                            }
                          </div>
                        </motion.div>
                      }
                    </AnimatePresence>
                  </motion.div>);

            })}
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}