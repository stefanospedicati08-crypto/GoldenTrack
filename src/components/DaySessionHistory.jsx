import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Calendar, Heart, Zap, MessageSquare, Dumbbell, Trash2, Pencil, Check, X } from "lucide-react";
import moment from "moment";
import "moment/locale/it";
moment.locale("it");

export default function DaySessionHistory({ sessions, dayLabel, logs, onSessionDeleted, onSessionUpdated, onLogUpdated }) {
  const [open, setOpen] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingLog, setEditingLog] = useState(null); // { id, reps_done, weight_kg, weight_kg_2 }
  const [savingLog, setSavingLog] = useState(false);

  async function saveLogEdit() {
    if (!editingLog) return;
    setSavingLog(true);
    const data = {
      reps_done: editingLog.reps_done ? Number(editingLog.reps_done) : undefined,
      weight_kg: editingLog.weight_kg ? Number(editingLog.weight_kg) : undefined,
      weight_kg_2: editingLog.weight_kg_2 ? Number(editingLog.weight_kg_2) : undefined,
    };
    await onLogUpdated(editingLog.id, data);
    setEditingLog(null);
    setSavingLog(false);
  }

  function startEdit(session) {
    setEditingSession(session.id);
    setEditForm({
      rpe: session.rpe ?? "",
      heart_rate_avg: session.heart_rate_avg ?? "",
      calories: session.calories ?? "",
      training_minutes: session.training_minutes ?? "",
      athlete_note: session.athlete_note ?? "",
    });
  }

  async function saveEdit(session) {
    setSaving(true);
    const data = {
      rpe: editForm.rpe ? Number(editForm.rpe) : undefined,
      heart_rate_avg: editForm.heart_rate_avg ? Number(editForm.heart_rate_avg) : undefined,
      calories: editForm.calories ? Number(editForm.calories) : undefined,
      training_minutes: editForm.training_minutes ? Number(editForm.training_minutes) : undefined,
      athlete_note: editForm.athlete_note || undefined,
    };
    await onSessionUpdated(session.id, data);
    setEditingSession(null);
    setSaving(false);
  }

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
                  
                    <div className="flex items-center">
                    <button
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className="flex-1 flex items-center justify-between p-3 text-left hover:bg-secondary/30 transition-colors">
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
                    {onSessionUpdated && editingSession !== session.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(session); setExpandedSession(session.id); }}
                        className="p-3 text-muted-foreground hover:bg-secondary/50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {onSessionDeleted && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSessionDeleted(session); }}
                        className="p-3 text-destructive hover:bg-destructive/10 transition-colors rounded-r-xl">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    </div>

                    <AnimatePresence>
                      {isExpanded &&
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden border-t border-border">
                        
                          <div className="p-3 space-y-2">
                            {editingSession === session.id && (
                              <div className="bg-secondary/40 rounded-xl p-3 space-y-2">
                                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Modifica sessione</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {[{key:"rpe",label:"RPE (1-10)"},{key:"heart_rate_avg",label:"FC media (bpm)"},{key:"calories",label:"Calorie (kcal)"},{key:"training_minutes",label:"Durata (min)"}].map(f => (
                                    <div key={f.key}>
                                      <label className="text-[10px] text-muted-foreground block mb-0.5">{f.label}</label>
                                      <input type="number" value={editForm[f.key]} onChange={e => setEditForm(p => ({...p, [f.key]: e.target.value}))}
                                        className="w-full h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground block mb-0.5">Note atleta</label>
                                  <textarea value={editForm.athlete_note} onChange={e => setEditForm(p => ({...p, athlete_note: e.target.value}))}
                                    rows={2} className="w-full rounded-lg border border-input bg-background px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveEdit(session)} disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                                    <Check className="w-3.5 h-3.5" /> {saving ? "Salvataggio..." : "Salva"}
                                  </button>
                                  <button onClick={() => setEditingSession(null)}
                                    className="flex items-center gap-1 h-8 px-3 rounded-lg bg-secondary text-muted-foreground text-xs">
                                    <X className="w-3.5 h-3.5" /> Annulla
                                  </button>
                                </div>
                              </div>
                            )}
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
                                        <div key={l.id}>
                                          {editingLog?.id === l.id ? (
                                            <div className="flex flex-wrap items-center gap-1.5 bg-secondary/60 rounded-lg px-2 py-1.5">
                                              <span className="text-[10px] text-muted-foreground w-14 shrink-0">Serie {l.set_number}</span>
                                              <input type="number" placeholder="rep" value={editingLog.reps_done}
                                                onChange={e => setEditingLog(p => ({...p, reps_done: e.target.value}))}
                                                className="w-16 h-7 rounded-md border border-input bg-background px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                                              <input type="number" placeholder="kg" value={editingLog.weight_kg}
                                                onChange={e => setEditingLog(p => ({...p, weight_kg: e.target.value}))}
                                                className="w-16 h-7 rounded-md border border-input bg-background px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                                              {(l.weight_kg_2 != null || editingLog.weight_kg_2) && (
                                                <input type="number" placeholder="kg2" value={editingLog.weight_kg_2}
                                                  onChange={e => setEditingLog(p => ({...p, weight_kg_2: e.target.value}))}
                                                  className="w-16 h-7 rounded-md border border-input bg-background px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                                              )}
                                              <button onClick={saveLogEdit} disabled={savingLog}
                                                className="h-7 w-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground">
                                                <Check className="w-3 h-3" />
                                              </button>
                                              <button onClick={() => setEditingLog(null)}
                                                className="h-7 w-7 flex items-center justify-center rounded-md bg-secondary text-muted-foreground">
                                                <X className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground group">
                                              <span className="w-14 shrink-0">Serie {l.set_number}</span>
                                              <span className="font-medium text-foreground">{l.reps_done || "—"} rep</span>
                                              {l.weight_kg && <span className="font-bold text-primary">{l.weight_kg} kg{l.weight_kg_2 ? ` / ${l.weight_kg_2} kg` : ""}</span>}
                                              {onLogUpdated && (
                                                <button onClick={() => setEditingLog({ id: l.id, reps_done: l.reps_done ?? "", weight_kg: l.weight_kg ?? "", weight_kg_2: l.weight_kg_2 ?? "" })}
                                                  className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary transition-all">
                                                  <Pencil className="w-3 h-3 text-muted-foreground" />
                                                </button>
                                              )}
                                            </div>
                                          )}
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