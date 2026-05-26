import { useState, useEffect } from "react";
import { startTimer } from "@/lib/timerStore";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Dumbbell, TrendingUp, Check, Pencil, Flame, Trash2, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import LoadChart from "./LoadChart";

// A superset: multiple exercises performed back-to-back before resting
export default function SupersetGroup({ supersetKey, exercises, logs, onLogSaved, onLogDeleted, index }) {
  const [expanded, setExpanded] = useState(false);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingLog, setDeletingLog] = useState(null);
  const [editingLog, setEditingLog] = useState(null); // { logId, weight }
  const [forms, setForms] = useState(() => exercises.map(() => ({ setNumber: "", weightKg: "", repsDone: "", isWarmup: false, notes: "", rpeSet: "" })));
  const [rpePerSetEnabled, setRpePerSetEnabled] = useState(() => localStorage.getItem("rpePerSetEnabled") === "true");
  const today = new Date().toISOString().split("T")[0];
  const totalSets = exercises[0]?.sets || 3;
  const restSeconds = exercises[0]?.rest_seconds || 90;

  function setForm(i, key, val) {
    setForms(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
  }

  function todayLogs(ex) {
    return logs.filter(l => l.exercise_id === ex.id && l.date === today);
  }

  // Get suggested weight: first from today's most recent log, then from last session
  function getSuggestedWeight(ex, setNum) {
    const exLogs = logs.filter(l => l.exercise_id === ex.id && !l.is_warmup);
    // Today's logs sorted by set_number desc — use the most recently logged weight today
    const todayExLogs = exLogs.filter(l => l.date === today).sort((a, b) => b.set_number - a.set_number);
    if (todayExLogs.length > 0 && todayExLogs[0].weight_kg != null) {
      return String(todayExLogs[0].weight_kg);
    }
    // Fall back to same set from last session
    const pastLogs = exLogs.filter(l => l.date !== today);
    const lastDate = [...new Set(pastLogs.map(l => l.date))].sort((a, b) => b.localeCompare(a))[0];
    if (!lastDate) return "";
    const match = pastLogs.find(l => l.date === lastDate && l.set_number === setNum);
    return match?.weight_kg ? String(match.weight_kg) : "";
  }

  const allDone = exercises.every(ex => todayLogs(ex).filter(l => !l.is_warmup).length >= totalSets);

  // Compute next set number for current exercise reactively
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
      id: `tmp-${Date.now()}`,
      exercise_id: ex.id,
      plan_id: ex.plan_id,
      exercise_name: ex.name,
      set_number: setNum,
      reps_done: form.repsDone ? Number(form.repsDone) : (ex.reps ? parseInt(ex.reps) : 0),
      weight_kg: form.weightKg ? Number(form.weightKg) : undefined,
      notes: form.notes || undefined,
      rpe_set: rpePerSetEnabled && form.rpeSet ? Number(form.rpeSet) : undefined,
      is_warmup: form.isWarmup,
      date: today,
    };
    onLogSaved(optimistic);

    // Advance to next exercise
    const nextExIdx = currentExIdx < exercises.length - 1 ? currentExIdx + 1 : 0;
    if (nextExIdx === 0) startTimer(restSeconds);

    // Pre-fill next exercise: use the weight just logged (most recent), fall back to previous session
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
      exercise_id: ex.id,
      plan_id: ex.plan_id,
      exercise_name: ex.name,
      set_number: optimistic.set_number,
      reps_done: optimistic.reps_done,
      weight_kg: optimistic.weight_kg,
      notes: optimistic.notes,
      rpe_set: optimistic.rpe_set,
      is_warmup: optimistic.is_warmup,
      date: today,
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
    const current = log.weight_kg || 0;
    const updated = Math.max(0, parseFloat((current + delta).toFixed(1)));
    await base44.entities.WorkoutLog.update(log.id, { weight_kg: updated });
    onLogSaved({ ...log, weight_kg: updated, _replaceId: log.id });
  }

  return (
    <>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-card rounded-2xl border-2 border-primary/30 overflow-hidden"
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
                Superset {supersetKey}
              </span>
            </div>
            <p className="font-semibold mt-0.5">{exercises.map(e => e.name).join(" + ")}</p>
            <p className="text-sm text-muted-foreground">{totalSets} serie · esegui entrambi, poi recupera</p>
          </div>
          {allDone && (
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-accent/10 text-accent">✓ Completato</span>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="px-4 pb-4 space-y-4">

                {/* Per-exercise logs */}
                {exercises.map((ex, ei) => {
                  const exLogs = todayLogs(ex);
                  return (
                    <div key={ex.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentExIdx === ei && !allDone ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
                        <p className="text-sm font-semibold">{ex.name}</p>
                        {ex.reps && <span className="text-xs text-muted-foreground">× {ex.reps}</span>}
                        <span className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          exLogs.filter(l => !l.is_warmup).length >= totalSets ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                        }`}>{exLogs.filter(l => !l.is_warmup).length}/{totalSets}</span>
                      </div>
                      {exLogs.length > 0 && (
                        <div className="space-y-2">
                          {exLogs.sort((a, b) => a.set_number - b.set_number).map(log => (
                            <div key={log.id} className="flex flex-col gap-2 bg-secondary/40 rounded-xl px-3 py-2.5">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-14 shrink-0">
                                  {log.is_warmup ? <span className="text-chart-3">🔥 W/U</span> : `Serie ${log.set_number}`}
                                </span>
                                <span className="text-sm font-medium">{log.reps_done || ex.reps || "—"} rep</span>
                                {editingLog?.id === log.id ? (
                                  <>
                                    <Input type="number" placeholder="kg" value={editingLog.weight}
                                      onChange={e => setEditingLog({ id: log.id, weight: e.target.value })}
                                      className="h-8 w-24 rounded-lg text-sm ml-auto" autoFocus />
                                    <Button size="sm" onClick={() => handleEditWeight(log, editingLog.weight)} className="h-8 rounded-lg px-3">
                                      <Check className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-sm font-bold text-primary ml-auto">
                                      {log.weight_kg ? `${log.weight_kg} kg` : "—"}
                                    </span>
                                    <button onClick={() => setEditingLog({ id: log.id, weight: log.weight_kg ? String(log.weight_kg) : "" })}
                                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                    <button onClick={() => handleDeleteLog(log.id)} disabled={deletingLog === log.id}
                                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                                      {deletingLog === log.id
                                        ? <div className="w-3.5 h-3.5 border-2 border-destructive/20 border-t-destructive rounded-full animate-spin" />
                                        : <Trash2 className="w-3.5 h-3.5" />}
                                    </button>
                                  </>
                                )}
                              </div>
                              {editingLog?.id !== log.id && log.weight_kg != null && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[10px] text-muted-foreground mr-1">Modifica rapida:</span>
                                  {[-5, -2, -1, +1, +2, +5].map(d => (
                                    <button key={d} onClick={() => adjustWeight(log, d)}
                                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                                        d > 0 ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
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

                {/* Active input for current exercise in superset */}
                {!allDone && (() => {
                  const ex = exercises[currentExIdx];
                  const form = forms[currentExIdx];
                  const completedSets = todayLogs(ex).filter(l => !l.is_warmup).map(l => l.set_number);
                  const missingSets = Array.from({ length: totalSets }, (_, i) => i + 1).filter(n => !completedSets.includes(n));
                  const extraSets = Array.from({ length: 5 }, (_, i) => totalSets + i + 1);
                  const currentSetNum = form.setNumber ? Number(form.setNumber) : getNextSetNum(ex);
                  const suggested = getSuggestedWeight(ex, currentSetNum);
                  return (
                    <div className="border border-primary/20 rounded-xl p-3 space-y-3 bg-primary/5">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs font-semibold text-primary">
                          Ora: {ex?.name}
                          {currentExIdx < exercises.length - 1 && <span className="text-muted-foreground font-normal"> → poi {exercises[currentExIdx + 1]?.name}</span>}
                          {currentExIdx === exercises.length - 1 && <span className="text-accent font-normal"> → poi recupero</span>}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Serie</label>
                          <Select value={form.setNumber || String(getNextSetNum(ex))} onValueChange={v => setForm(currentExIdx, "setNumber", v)}>
                            <SelectTrigger className="h-10 rounded-xl text-[hsl(var(--primary))]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[...missingSets, ...extraSets].map(n => (
                                <SelectItem key={n} value={String(n)}>
                                  {n > totalSets ? `Serie ${n} (extra)` : `Serie ${n}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Rep</label>
                          <Input type="number" placeholder={ex?.reps?.split(/[^0-9]/)[0] || "—"}
                            value={form.repsDone}
                            onChange={e => setForm(currentExIdx, "repsDone", e.target.value)}
                            className="h-10 rounded-xl" />
                        </div>
                        <div className="col-span-2">
                           <label className="text-xs text-muted-foreground mb-1 block">
                             Carico (kg)
                             {suggested && !form.weightKg && <span className="text-primary ml-1">(prec. {suggested}kg)</span>}
                           </label>
                           <Input type="number" placeholder={suggested || "es. 50"}
                             value={form.weightKg}
                             onChange={e => setForm(currentExIdx, "weightKg", e.target.value)}
                             className="h-10 rounded-xl" />
                         </div>
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground mb-1 block">Note serie (opzionale)</label>
                          <Input type="text" placeholder="es. buona esecuzione..."
                            value={form.notes}
                            onChange={e => setForm(currentExIdx, "notes", e.target.value)}
                            className="h-10 rounded-xl" />
                        </div>
                        {rpePerSetEnabled && (
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">RPE (1-10)</label>
                            <Input type="number" placeholder="es. 8" min="1" max="10"
                              value={form.rpeSet}
                              onChange={e => setForm(currentExIdx, "rpeSet", e.target.value)}
                              className="h-10 rounded-xl" />
                          </div>
                        )}
                      </div>
                      <Button onClick={handleSaveSet} disabled={saving} className="w-full rounded-xl h-10">
                        <Plus className="w-4 h-4 mr-1" />
                        {saving ? "Salvataggio..." : currentExIdx < exercises.length - 1 ? "Salva e prossimo esercizio →" : "Salva e recupera"}
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}