import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Heart, Zap, MessageSquare, Dumbbell, Trash2, Pencil, Check, X, Clock, Flame } from "lucide-react";
import moment from "moment";
import "moment/locale/it";
moment.locale("it");

function formatDuration(minutes) {
  if (!minutes) return null;
  const totalSeconds = Math.round(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}min`);
  if (s > 0) parts.push(`${s}s`);
  return parts.length ? parts.join(' ') : '0min';
}

export default function DaySessionHistory({ sessions, dayLabel, logs, onSessionDeleted, onSessionUpdated, onLogUpdated }) {
  const [open, setOpen] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
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
  const daySessions = sessions
    .filter((s) => s.day_label === dayLabel)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  if (daySessions.length === 0) return null;

  const prevSession = daySessions[0];

  return (
    <div className="bg-white/3 border border-white/8 overflow-hidden rounded-3xl">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/4 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-white/6 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 text-white/40" />
        </div>
        <span className="text-sm font-medium flex-1 text-white/70">Storico — {dayLabel}</span>
        <span className="text-xs text-white/25 bg-white/5 px-2 py-0.5 rounded-full">{daySessions.length}</span>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5 border-t border-white/6 pt-3">
              {/* Comparison panel */}
              {prevSession && todayLogs.length > 0 && (() => {
                const prevLogs = logs.filter((l) => l.date === prevSession.date && !l.is_warmup);
                const currLogs = todayLogs.filter((l) => !l.is_warmup);
                const exerciseNames = [...new Set([...prevLogs, ...currLogs].map((l) => l.exercise_name))];
                if (exerciseNames.length === 0) return null;
                return (
                  <div className="bg-[#fcd12a]/6 border border-[#fcd12a]/15 rounded-2xl p-3 space-y-2">
                    <p className="text-[10px] font-semibold text-[#fcd12a]/80 uppercase tracking-wider">vs sessione precedente</p>
                    <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold text-white/30 mb-1">
                      <span>Esercizio</span>
                      <span className="text-center">{moment(prevSession.date).format("DD/MM")}</span>
                      <span className="text-center text-[#fcd12a]/70">Oggi</span>
                    </div>
                    {exerciseNames.map((exName) => {
                      const pLogs = prevLogs.filter((l) => l.exercise_name === exName);
                      const cLogs = currLogs.filter((l) => l.exercise_name === exName);
                      const pMax = pLogs.length ? Math.max(...pLogs.map((l) => l.weight_kg || 0)) : null;
                      const cMax = cLogs.length ? Math.max(...cLogs.map((l) => l.weight_kg || 0)) : null;
                      const improved = cMax && pMax && cMax > pMax;
                      const worse = cMax && pMax && cMax < pMax;
                      return (
                        <div key={exName} className="grid grid-cols-3 gap-1 items-center py-1.5 border-t border-white/5">
                          <span className="text-xs text-white/60 font-medium truncate">{exName}</span>
                          <span className="text-xs text-center text-white/30">{pMax ? `${pMax}kg` : "—"}</span>
                          <span className={`text-xs text-center font-bold ${improved ? "text-green-400" : worse ? "text-red-400" : "text-[#fcd12a]"}`}>
                            {cMax ? `${cMax}kg` : "—"}
                            {cMax && pMax && cMax !== pMax && (
                              <span className="font-normal text-[9px] ml-0.5 opacity-70">
                                ({cMax > pMax ? "+" : ""}{(cMax - pMax).toFixed(1)})
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Session cards */}
              {daySessions.map((session, i) => {
                const sessionLogs = logs.filter((l) => l.date === session.date && !l.is_warmup);
                const exerciseNames = [...new Set(sessionLogs.map((l) => l.exercise_name))];
                const isExpanded = expandedSession === session.id;
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white/4 border border-white/6 rounded-2xl overflow-hidden"
                  >
                    {/* Session header */}
                    <div className="flex items-center">
                      <button
                        onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                        className="flex-1 flex items-center gap-3 p-3 text-left hover:bg-white/3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                          <Flame className="w-3.5 h-3.5 text-[#fcd12a]/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white capitalize">
                            {moment(session.date).format("dddd D MMM")}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {session.rpe && (
                              <span className="flex items-center gap-0.5 text-[10px] text-orange-400/80">
                                <Zap className="w-3 h-3" /> RPE {session.rpe}
                              </span>
                            )}
                            {session.heart_rate_avg && (
                              <span className="flex items-center gap-0.5 text-[10px] text-red-400/80">
                                <Heart className="w-3 h-3" /> {session.heart_rate_avg} bpm
                              </span>
                            )}
                            {session.training_minutes && (
                              <span className="text-[10px] text-white/30">
                                <Clock className="w-3 h-3 inline mr-0.5" />{formatDuration(session.training_minutes)}
                              </span>
                            )}
                            <span className="text-[10px] text-white/25">{exerciseNames.length} es.</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white/25 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-white/25 shrink-0" />}
                      </button>
                      {onSessionUpdated && editingSession !== session.id && (
                        <button onClick={(e) => { e.stopPropagation(); startEdit(session); setExpandedSession(session.id); }}
                          className="p-3 text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onSessionDeleted && (
                        <button onClick={(e) => { e.stopPropagation(); onSessionDeleted(session); }}
                          className="p-3 text-red-400/40 hover:text-red-400 hover:bg-red-500/8 transition-colors rounded-r-2xl">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden border-t border-white/6"
                        >
                          <div className="p-3 space-y-3">
                            {/* Edit session form */}
                            {editingSession === session.id && (
                              <div className="bg-white/5 rounded-2xl p-3 space-y-2">
                                <p className="text-[10px] font-semibold text-[#fcd12a]/70 uppercase tracking-wider">Modifica sessione</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {[{key:"rpe",label:"RPE (1-10)"},{key:"heart_rate_avg",label:"FC media (bpm)"},{key:"calories",label:"Calorie (kcal)"},{key:"training_minutes",label:"Durata (min)"}].map(f => (
                                    <div key={f.key}>
                                      <label className="text-[10px] text-white/30 block mb-0.5">{f.label}</label>
                                      <input type="number" value={editForm[f.key]}
                                        onChange={e => setEditForm(p => ({...p, [f.key]: e.target.value}))}
                                        className="w-full h-8 rounded-xl border border-white/10 bg-white/5 px-2 text-sm text-white focus:outline-none focus:border-[#fcd12a]/40" />
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <label className="text-[10px] text-white/30 block mb-0.5">Note atleta</label>
                                  <textarea value={editForm.athlete_note}
                                    onChange={e => setEditForm(p => ({...p, athlete_note: e.target.value}))}
                                    rows={2} className="w-full rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-sm text-white resize-none focus:outline-none focus:border-[#fcd12a]/40" />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveEdit(session)} disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-1 h-9 rounded-xl bg-[#fcd12a] text-black text-xs font-bold">
                                    <Check className="w-3.5 h-3.5" /> {saving ? "..." : "Salva"}
                                  </button>
                                  <button onClick={() => setEditingSession(null)}
                                    className="flex items-center gap-1 h-9 px-4 rounded-xl bg-white/8 text-white/50 text-xs">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Exercises */}
                            {exerciseNames.map((exName) => {
                              const exLogs = sessionLogs.filter((l) => l.exercise_name === exName).sort((a, b) => a.set_number - b.set_number);
                              return (
                                <div key={exName} className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <Dumbbell className="w-3.5 h-3.5 text-[#fcd12a]/60 shrink-0" />
                                    <span className="text-xs font-semibold text-white/80">{exName}</span>
                                  </div>
                                  <div className="pl-5 space-y-1">
                                    {exLogs.map((l) => (
                                      <div key={l.id}>
                                        {editingLog?.id === l.id ? (
                                          <div className="flex flex-wrap items-center gap-1.5 bg-white/5 rounded-xl px-2 py-1.5">
                                            <span className="text-[10px] text-white/30 w-14 shrink-0">Serie {l.set_number}</span>
                                            <input type="number" placeholder="rep" value={editingLog.reps_done}
                                              onChange={e => setEditingLog(p => ({...p, reps_done: e.target.value}))}
                                              className="w-16 h-7 rounded-lg border border-white/10 bg-white/5 px-1.5 text-xs text-white focus:outline-none" />
                                            <input type="number" placeholder="kg" value={editingLog.weight_kg}
                                              onChange={e => setEditingLog(p => ({...p, weight_kg: e.target.value}))}
                                              className="w-16 h-7 rounded-lg border border-white/10 bg-white/5 px-1.5 text-xs text-white focus:outline-none" />
                                            <button onClick={saveLogEdit} disabled={savingLog}
                                              className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#fcd12a] text-black">
                                              <Check className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => setEditingLog(null)}
                                              className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/8 text-white/50">
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 text-xs text-white/40 group">
                                            <span className="w-14 shrink-0">Serie {l.set_number}</span>
                                            <span className="text-white/60">{l.reps_done || "—"} rep</span>
                                            {l.weight_kg && <span className="font-bold text-[#fcd12a]/80">{l.weight_kg} kg{l.weight_kg_2 ? ` / ${l.weight_kg_2}` : ""}</span>}
                                            {onLogUpdated && (
                                              <button onClick={() => setEditingLog({ id: l.id, reps_done: l.reps_done ?? "", weight_kg: l.weight_kg ?? "", weight_kg_2: l.weight_kg_2 ?? "" })}
                                                className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/8 transition-all">
                                                <Pencil className="w-3 h-3 text-white/30" />
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

                            {/* Athlete note */}
                            {session.athlete_note && (
                              <div className="flex items-start gap-2 bg-white/4 rounded-xl px-3 py-2">
                                <MessageSquare className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                                <p className="text-xs text-white/40 italic">{session.athlete_note}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}