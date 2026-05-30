import { useState } from "react";
import { startTimer } from "@/lib/timerStore";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Zap, Check, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

export default function SupersetGroup({ supersetKey, exercises, logs, onLogSaved, onLogDeleted, index, readOnly = false }) {
  const [expanded, setExpanded] = useState(false);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingLog, setDeletingLog] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [forms, setForms] = useState(() => exercises.map(() => ({ setNumber: "", weightKg: "", repsDone: "", isWarmup: false, notes: "", rpeSet: "" })));
  const [rpePerSetEnabled] = useState(() => localStorage.getItem("rpePerSetEnabled") === "true");
  const today = new Date().toISOString().split("T")[0];
  const totalSets = exercises[0]?.sets || 3;
  const restSeconds = exercises[0]?.rest_seconds || 90;

  function setForm(i, key, val) {
    setForms(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
  }

  function todayLogs(ex) {
    return logs.filter(l => l.exercise_id === ex.id && l.date === today);
  }

  function getSuggestedWeight(ex, setNum) {
    const exLogs = logs.filter(l => l.exercise_id === ex.id && !l.is_warmup);
    const todayExLogs = exLogs.filter(l => l.date === today).sort((a, b) => b.set_number - a.set_number);
    if (todayExLogs.length > 0 && todayExLogs[0].weight_kg != null) return String(todayExLogs[0].weight_kg);
    const pastLogs = exLogs.filter(l => l.date !== today);
    const lastDate = [...new Set(pastLogs.map(l => l.date))].sort((a, b) => b.localeCompare(a))[0];
    if (!lastDate) return "";
    const match = pastLogs.find(l => l.date === lastDate && l.set_number === setNum);
    return match?.weight_kg ? String(match.weight_kg) : "";
  }

  const allDone = exercises.every(ex => todayLogs(ex).filter(l => !l.is_warmup).length >= totalSets);

  function getNextSetNum(ex) {
    const completedSets = todayLogs(ex).filter(l => !l.is_warmup).map(l => l.set_number);
    return Array.from({ length: totalSets }, (_, i) => i + 1).find(n => !completedSets.includes(n)) || (totalSets + 1);
  }

  async function handleSaveSet() {
    setSaving(true);
    const ex = exercises[currentExIdx];
    const form = forms[currentExIdx];
    const setNum = Number(form.setNumber || getNextSetNum(ex));
    const optimistic = {
      id: `tmp-${Date.now()}`, exercise_id: ex.id, plan_id: ex.plan_id,
      exercise_name: ex.name, set_number: setNum,
      reps_done: form.repsDone ? Number(form.repsDone) : (ex.reps ? parseInt(ex.reps) : 0),
      weight_kg: form.weightKg ? Number(form.weightKg) : undefined,
      notes: form.notes || undefined,
      rpe_set: rpePerSetEnabled && form.rpeSet ? Number(form.rpeSet) : undefined,
      is_warmup: form.isWarmup, date: today,
    };
    onLogSaved(optimistic);
    const nextExIdx = currentExIdx < exercises.length - 1 ? currentExIdx + 1 : 0;
    if (nextExIdx === 0) startTimer(restSeconds);
    const nextEx = exercises[nextExIdx];
    const nextSetForNextEx = getNextSetNum(nextEx);
    const justLoggedWeight = optimistic.weight_kg != null ? String(optimistic.weight_kg) : null;
    const nextSuggested = justLoggedWeight ?? getSuggestedWeight(nextEx, nextSetForNextEx);
    setForms(prev => prev.map((f, i) => {
      if (i === currentExIdx) return { setNumber: "", weightKg: "", repsDone: "", isWarmup: false, notes: "", rpeSet: "" };
      if (i === nextExIdx) return { ...f, weightKg: nextSuggested, setNumber: String(nextSetForNextEx) };
      return f;
    }));
    setCurrentExIdx(nextExIdx);
    const newLog = await base44.entities.WorkoutLog.create({
      exercise_id: ex.id, plan_id: ex.plan_id, exercise_name: ex.name,
      set_number: optimistic.set_number, reps_done: optimistic.reps_done,
      weight_kg: optimistic.weight_kg, notes: optimistic.notes, rpe_set: optimistic.rpe_set,
      is_warmup: optimistic.is_warmup, date: today,
    });
    onLogSaved({ ...newLog, _replaceId: optimistic.id });
    setSaving(false);
  }

  async function handleDeleteLog(logId) {
    setDeletingLog(logId);
    await base44.entities.WorkoutLog.delete(logId);
    onLogDeleted && onLogDeleted(logId);
    setDeletingLog(null);
  }

  async function handleEditWeight(log, newWeightStr) {
    const newWeight = newWeightStr ? Number(newWeightStr) : undefined;
    await base44.entities.WorkoutLog.update(log.id, { weight_kg: newWeight });
    onLogSaved({ ...log, weight_kg: newWeight, _replaceId: log.id });
    setEditingLog(null);
  }

  async function adjustWeight(log, delta) {
    const updated = Math.max(0, parseFloat(((log.weight_kg || 0) + delta).toFixed(1)));
    await base44.entities.WorkoutLog.update(log.id, { weight_kg: updated });
    onLogSaved({ ...log, weight_kg: updated, _replaceId: log.id });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={`bg-white/4 border-2 rounded-3xl overflow-hidden ${
        allDone ? "border-green-500/25" : "border-[#fcd12a]/15"
      }`}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3 transition-colors">
        <div className="w-10 h-10 rounded-2xl bg-[#fcd12a]/15 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-[#fcd12a]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-[#fcd12a] uppercase tracking-widest bg-[#fcd12a]/10 px-2 py-0.5 rounded-full">
              Superset {supersetKey}
            </span>
            {allDone && <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">✓ Fatto</span>}
          </div>
          <p className="text-sm font-semibold text-white">{exercises.map(e => e.name).join(" + ")}</p>
          <p className="text-xs text-white/30">{totalSets} serie · esegui entrambi, poi recupera</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/25" /> : <ChevronDown className="w-4 h-4 text-white/25" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4 space-y-4">

              {/* Per-exercise logs */}
              {exercises.map((ex, ei) => {
                const exLogs = todayLogs(ex);
                return (
                  <div key={ex.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${currentExIdx === ei && !allDone ? "bg-[#fcd12a] animate-pulse" : "bg-white/15"}`} />
                      <p className="text-sm font-semibold text-white">{ex.name}</p>
                      {ex.reps && <span className="text-xs text-white/30">× {ex.reps}</span>}
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        exLogs.filter(l => !l.is_warmup).length >= totalSets ? "bg-green-500/15 text-green-400" : "bg-[#fcd12a]/10 text-[#fcd12a]"
                      }`}>{exLogs.filter(l => !l.is_warmup).length}/{totalSets}</span>
                    </div>
                    {exLogs.length > 0 && (
                      <div className="space-y-1.5">
                        {exLogs.sort((a, b) => a.set_number - b.set_number).map(log => (
                          <div key={log.id} className="bg-white/4 rounded-2xl px-3 py-2.5 space-y-1.5">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-white/30 w-14 shrink-0">
                                {log.is_warmup ? <span className="text-orange-400">🔥 W/U</span> : `Serie ${log.set_number}`}
                              </span>
                              <span className="text-sm text-white/60">{log.reps_done || ex.reps || "—"} rep</span>
                              {editingLog?.id === log.id ? (
                                <>
                                  <Input type="number" placeholder="kg" value={editingLog.weight}
                                    onChange={e => setEditingLog({ id: log.id, weight: e.target.value })}
                                    className="h-8 w-24 rounded-xl text-sm ml-auto bg-white/5 border-white/10 text-white" autoFocus />
                                  <button onClick={() => handleEditWeight(log, editingLog.weight)}
                                    className="w-8 h-8 rounded-xl bg-[#fcd12a] text-black flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm font-bold text-[#fcd12a] ml-auto">
                                    {log.weight_kg ? `${log.weight_kg} kg` : "—"}
                                  </span>
                                  <button onClick={() => setEditingLog({ id: log.id, weight: log.weight_kg ? String(log.weight_kg) : "" })}
                                    className="p-1.5 rounded-xl hover:bg-white/8">
                                    <Pencil className="w-3.5 h-3.5 text-white/25" />
                                  </button>
                                  <button onClick={() => handleDeleteLog(log.id)} disabled={deletingLog === log.id}
                                    className="p-1.5 rounded-xl hover:bg-red-500/10">
                                    {deletingLog === log.id
                                      ? <div className="w-3.5 h-3.5 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin" />
                                      : <Trash2 className="w-3.5 h-3.5 text-red-400/50" />}
                                  </button>
                                </>
                              )}
                            </div>
                            {editingLog?.id !== log.id && log.weight_kg != null && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] text-white/20 mr-1">Quick:</span>
                                {[-5, -2, -1, +1, +2, +5].map(d => (
                                  <button key={d} onClick={() => adjustWeight(log, d)}
                                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                                      d > 0 ? "bg-[#fcd12a]/10 text-[#fcd12a]" : "bg-white/5 text-white/30"
                                    }`}>
                                    {d > 0 ? `+${d}` : d}kg
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Active input */}
              {!allDone && !readOnly && (() => {
                const ex = exercises[currentExIdx];
                const form = forms[currentExIdx];
                const completedSets = todayLogs(ex).filter(l => !l.is_warmup).map(l => l.set_number);
                const missingSets = Array.from({ length: totalSets }, (_, i) => i + 1).filter(n => !completedSets.includes(n));
                const extraSets = Array.from({ length: 5 }, (_, i) => totalSets + i + 1);
                const currentSetNum = form.setNumber ? Number(form.setNumber) : getNextSetNum(ex);
                const suggested = getSuggestedWeight(ex, currentSetNum);
                const pyramidReps = ex.reps && /^\d+(-\d+)+$/.test(ex.reps.trim()) ? ex.reps.trim().split("-").map(Number) : null;
                const suggestedReps = pyramidReps ? (pyramidReps[currentSetNum - 1] ?? pyramidReps[pyramidReps.length - 1]) : null;
                return (
                  <div className="bg-[#fcd12a]/5 border border-[#fcd12a]/15 rounded-2xl p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#fcd12a]" />
                      <p className="text-xs font-semibold text-[#fcd12a]">
                        Ora: {ex?.name}
                        {currentExIdx < exercises.length - 1
                          ? <span className="text-white/30 font-normal"> → poi {exercises[currentExIdx + 1]?.name}</span>
                          : <span className="text-green-400/70 font-normal"> → poi recupero</span>}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-white/30 mb-1 block">Serie</label>
                        <Select value={form.setNumber || String(getNextSetNum(ex))} onValueChange={v => setForm(currentExIdx, "setNumber", v)}>
                          <SelectTrigger className="h-10 rounded-2xl bg-white/5 border-white/10 text-[#fcd12a] text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[...missingSets, ...extraSets].map(n => (
                              <SelectItem key={n} value={String(n)}>{n > totalSets ? `Serie ${n} (extra)` : `Serie ${n}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[11px] text-white/30 mb-1 block">
                          Rep {suggestedReps && <span className="text-[#fcd12a]/60">({suggestedReps} pres.)</span>}
                        </label>
                        <Input type="number" placeholder={suggestedReps ? String(suggestedReps) : (ex?.reps?.split(/[^0-9]/)[0] || "—")}
                          value={form.repsDone} onChange={e => setForm(currentExIdx, "repsDone", e.target.value)}
                          className="h-10 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[11px] text-white/30 mb-1 block">
                          Carico (kg) {suggested && !form.weightKg && <span className="text-[#fcd12a]/60">(prec. {suggested}kg)</span>}
                        </label>
                        <Input type="number" placeholder={suggested || "es. 50"}
                          value={form.weightKg} onChange={e => setForm(currentExIdx, "weightKg", e.target.value)}
                          className="h-10 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[11px] text-white/30 mb-1 block">Note serie</label>
                        <Input type="text" placeholder="es. buona esecuzione..."
                          value={form.notes} onChange={e => setForm(currentExIdx, "notes", e.target.value)}
                          className="h-10 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                      </div>
                      {rpePerSetEnabled && (
                        <div className="col-span-2">
                          <label className="text-[11px] text-white/30 mb-1 block">RPE (1-10)</label>
                          <Input type="number" placeholder="es. 8" min="1" max="10"
                            value={form.rpeSet} onChange={e => setForm(currentExIdx, "rpeSet", e.target.value)}
                            className="h-10 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                        </div>
                      )}
                    </div>
                    <button onClick={handleSaveSet} disabled={saving}
                      className="w-full h-11 rounded-2xl bg-[#fcd12a] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#fcd12a]/90 disabled:opacity-50 active:scale-[0.98] transition-all">
                      <Plus className="w-4 h-4" />
                      {saving ? "Salvataggio..." : currentExIdx < exercises.length - 1 ? "Salva → prossimo esercizio" : "Salva → recupera"}
                    </button>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}