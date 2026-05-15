import { useState } from "react";
import { startTimer } from "@/lib/timerStore";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Dumbbell, TrendingUp, Check, Pencil, Flame, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import RestTimer from "./RestTimer";
import LoadChart from "./LoadChart";

// A superset: multiple exercises performed back-to-back before resting
export default function SupersetGroup({ supersetKey, exercises, logs, onLogSaved, onLogDeleted, index }) {
  const [expanded, setExpanded] = useState(false);

  const [currentExIdx, setCurrentExIdx] = useState(0); // which exercise in superset we're logging
  const [saving, setSaving] = useState(false);
  const [deletingLog, setDeletingLog] = useState(null);
  // Per-exercise form state
  const [forms, setForms] = useState(() => exercises.map(() => ({ setNumber: "1", weightKg: "", repsDone: "", isWarmup: false })));
  const today = new Date().toISOString().split("T")[0];

  const totalSets = exercises[0]?.sets || 3;

  function setForm(i, key, val) {
    setForms(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
  }

  // Count completed sets for each exercise today
  function todayLogs(ex) {
    return logs.filter(l => l.exercise_id === ex.id && l.date === today);
  }

  // Solo le serie allenanti (non warmup) contano verso il completamento
  const allDone = exercises.every(ex => todayLogs(ex).filter(l => !l.is_warmup).length >= totalSets);

  async function handleSaveSet() {
    setSaving(true);
    // Save current exercise in superset
    const ex = exercises[currentExIdx];
    const form = forms[currentExIdx];
    const completedSets = todayLogs(ex).filter(l => !l.is_warmup).map(l => l.set_number);
    const nextSet = Array.from({ length: totalSets }, (_, i) => i + 1).find(n => !completedSets.includes(n)) || (totalSets + 1);

    const optimistic = {
      id: `tmp-${Date.now()}`,
      exercise_id: ex.id,
      plan_id: ex.plan_id,
      exercise_name: ex.name,
      set_number: Number(form.setNumber || nextSet),
      reps_done: form.repsDone ? Number(form.repsDone) : (ex.reps ? parseInt(ex.reps) : 0),
      weight_kg: form.weightKg ? Number(form.weightKg) : undefined,
      is_warmup: form.isWarmup,
      date: today,
    };
    onLogSaved(optimistic);

    // Advance to next exercise in superset, or reset + start timer
    if (currentExIdx < exercises.length - 1) {
      setCurrentExIdx(currentExIdx + 1);
    } else {
      setCurrentExIdx(0);
      startTimer(restSeconds); // rest after completing all exercises in superset
    }

    // Reset form for this exercise
    setForms(prev => prev.map((f, i) => i === currentExIdx ? { setNumber: "1", weightKg: "", repsDone: "", isWarmup: false } : f));

    const newLog = await base44.entities.WorkoutLog.create({
      exercise_id: ex.id,
      plan_id: ex.plan_id,
      exercise_name: ex.name,
      set_number: optimistic.set_number,
      reps_done: optimistic.reps_done,
      weight_kg: optimistic.weight_kg,
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

  const restSeconds = exercises[0]?.rest_seconds || 90;

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
                      </div>
                      {exLogs.length > 0 && (
                        <div className="space-y-1.5">
                          {exLogs.sort((a, b) => a.set_number - b.set_number).map(log => (
                            <div key={log.id} className="flex items-center gap-3 bg-secondary/40 rounded-xl px-3 py-2">
                              <span className="text-xs text-muted-foreground w-14 shrink-0">
                                {log.is_warmup ? <span className="text-chart-3">🔥 W/U</span> : `Serie ${log.set_number}`}
                              </span>
                              <span className="text-sm font-medium">{log.reps_done || ex.reps || "—"} rep</span>
                              <span className="text-sm font-bold text-primary ml-auto">{log.weight_kg ? `${log.weight_kg} kg` : "—"}</span>
                              <button onClick={() => handleDeleteLog(log.id)} disabled={deletingLog === log.id}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                                {deletingLog === log.id
                                  ? <div className="w-3.5 h-3.5 border-2 border-destructive/20 border-t-destructive rounded-full animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Active input for current exercise in superset */}
                {!allDone && (
                  <div className="border border-primary/20 rounded-xl p-3 space-y-3 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-semibold text-primary">
                        Ora: {exercises[currentExIdx]?.name}
                        {currentExIdx < exercises.length - 1 && <span className="text-muted-foreground font-normal"> → poi {exercises[currentExIdx + 1]?.name}</span>}
                        {currentExIdx === exercises.length - 1 && <span className="text-accent font-normal"> → poi recupero</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-20 shrink-0">
                        <label className="text-xs text-muted-foreground mb-1 block">Rep</label>
                        <Input type="number" placeholder={exercises[currentExIdx]?.reps?.split(/[^0-9]/)[0] || "—"}
                          value={forms[currentExIdx].repsDone}
                          onChange={e => setForm(currentExIdx, "repsDone", e.target.value)}
                          className="h-10 rounded-xl" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Carico (kg)</label>
                        <Input type="number" placeholder="es. 50"
                          value={forms[currentExIdx].weightKg}
                          onChange={e => setForm(currentExIdx, "weightKg", e.target.value)}
                          className="h-10 rounded-xl" />
                      </div>
                    </div>
                    <Button onClick={handleSaveSet} disabled={saving} className="w-full rounded-xl h-10">
                      <Plus className="w-4 h-4 mr-1" />
                      {saving ? "Salvataggio..." : currentExIdx < exercises.length - 1 ? "Salva e prossimo esercizio →" : "Salva e recupera"}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}