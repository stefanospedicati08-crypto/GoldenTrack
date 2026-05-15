import { useState } from "react";
import { startTimer } from "@/lib/timerStore";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Dumbbell, TrendingUp, Check, Pencil, MessageSquare, Flame, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import LoadChart from "./LoadChart";
import RestTimer from "./RestTimer";

export default function ExerciseCard({ exercise, logs, onLogSaved, onLogDeleted, index }) {
  const [expanded, setExpanded] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [saving, setSaving] = useState(false);

  const [setNumber, setSetNumber] = useState("1");
  const [weightKg, setWeightKg] = useState("");
  const [weightKg2, setWeightKg2] = useState("");
  const [repsDone, setRepsDone] = useState("");
  const [editingLog, setEditingLog] = useState(null);
  const [editWeight, setEditWeight] = useState("");
  const [exerciseNote, setExerciseNote] = useState(exercise.athlete_note || "");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(!!exercise.athlete_note);
  const [editingNote, setEditingNote] = useState(false);
  const [isWarmup, setIsWarmup] = useState(false);
  const [deletingLog, setDeletingLog] = useState(null);


  const isDoubleReps = exercise.reps && exercise.reps.includes("/");
  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter((l) => l.date === today);
  const totalSets = exercise.sets || 5;

  // Solo le serie allenanti (non warmup) contano verso il completamento
  const trainingSets = todayLogs.filter((l) => !l.is_warmup);
  const allSetsCompleted = trainingSets.length >= totalSets;

  const completedSetNumbers = trainingSets.map((l) => l.set_number);
  const nextSet = Array.from({ length: totalSets }, (_, i) => i + 1).find((n) => !completedSetNumbers.includes(n));

  async function handleSave() {
    setSaving(true);
    const optimistic = {
      id: `tmp-${Date.now()}`,
      exercise_id: exercise.id,
      plan_id: exercise.plan_id,
      exercise_name: exercise.name,
      set_number: Number(setNumber),
      reps_done: repsDone ? Number(repsDone) : exercise.reps ? parseInt(exercise.reps) : 0,
      weight_kg: weightKg ? Number(weightKg) : undefined,
      weight_kg_2: isDoubleReps && weightKg2 ? Number(weightKg2) : undefined,
      is_warmup: isWarmup,
      date: today
    };
    onLogSaved(optimistic);
    const next = isWarmup
      ? String(Number(setNumber) + 1)
      : (nextSet ? String(nextSet === Number(setNumber) ? nextSet + 1 : nextSet) : String(totalSets + 1));
    setSetNumber(next);
    setWeightKg("");
    setWeightKg2("");
    setRepsDone("");
    setSaving(false);
    startTimer(exercise.rest_seconds || 90);
    const newLog = await base44.entities.WorkoutLog.create({
      exercise_id: exercise.id,
      plan_id: exercise.plan_id,
      exercise_name: exercise.name,
      set_number: Number(optimistic.set_number),
      reps_done: optimistic.reps_done,
      weight_kg: optimistic.weight_kg,
      weight_kg_2: optimistic.weight_kg_2,
      is_warmup: isWarmup,
      date: today
    });
    // Replace optimistic entry with real one
    onLogSaved({ ...newLog, _replaceId: optimistic.id });
  }

  async function handleEditWeight(log) {
    setSaving(true);
    const newWeight = editWeight ? Number(editWeight) : undefined;
    await base44.entities.WorkoutLog.update(log.id, { weight_kg: newWeight });
    log.weight_kg = newWeight;
    setEditingLog(null);
    setEditWeight("");
    setSaving(false);
  }

  async function adjustWeight(log, delta) {
    const current = log.weight_kg || 0;
    const updated = Math.max(0, parseFloat((current + delta).toFixed(1)));
    await base44.entities.WorkoutLog.update(log.id, { weight_kg: updated });
    log.weight_kg = updated;
    // force re-render by triggering onLogSaved with updated log
    onLogSaved({ ...log, weight_kg: updated, _replaceId: log.id });
  }

  async function handleDeleteLog(log) {
    setDeletingLog(log.id);
    await base44.entities.WorkoutLog.delete(log.id);
    onLogDeleted && onLogDeleted(log.id);
    setDeletingLog(null);
  }

  async function handleSaveNote() {
    setSavingNote(true);
    await base44.entities.Exercise.update(exercise.id, { athlete_note: exerciseNote || undefined });
    exercise.athlete_note = exerciseNote || undefined;
    setNoteSaved(true);
    setEditingNote(false);
    setSavingNote(false);
  }

  return (
    <>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-card rounded-2xl border border-border overflow-hidden">
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/30 transition-colors">
          
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[hsl(var(--primary))]">{exercise.name}</h3>
            <p className="text-sm text-[hsl(var(--popover-foreground))]">
              {exercise.sets && `${exercise.sets} serie`}
              {exercise.reps && ` × ${exercise.reps} rep`}
              {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rec.`}
            </p>
          </div>
          {todayLogs.length > 0 &&
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${allSetsCompleted ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
              {allSetsCompleted ? `✓ ${trainingSets.length}/${totalSets}` : `${trainingSets.length}/${totalSets} serie`}
              {todayLogs.filter(l => l.is_warmup).length > 0 && <span className="text-chart-3"> +{todayLogs.filter(l => l.is_warmup).length}WU</span>}
            </span>
          }
          {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden">
            
              <div className="px-4 pb-4 space-y-4">
                {exercise.notes &&
              <p className="text-sm text-muted-foreground bg-secondary/50 rounded-xl p-3">
                    📝 {exercise.notes}
                  </p>
              }

                {exercise.reps &&
              <div className="flex items-center gap-2 bg-secondary/40 rounded-xl px-3 py-2">
                    <span className="text-xs text-muted-foreground">Ripetizioni prescritte:</span>
                    <span className="font-semibold text-sm">{exercise.reps}</span>
                  </div>
              }

                {todayLogs.length > 0 &&
              <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Serie di oggi</p>
                    <div className="space-y-2">
                      {todayLogs.
                  sort((a, b) => a.set_number - b.set_number).
                  map((log) =>
                  <div key={log.id} className="flex flex-col gap-2 bg-secondary/40 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-14 shrink-0">
                                {log.is_warmup ? <span className="text-chart-3">🔥 W/U</span> : `Serie ${log.set_number}`}
                              </span>
                              <span className="text-sm font-medium">{log.reps_done || exercise.reps || "—"} rep</span>
                              {editingLog === log.id ?
                      <>
                                  <Input
                          type="number"
                          placeholder="kg"
                          value={editWeight}
                          onChange={(e) => setEditWeight(e.target.value)}
                          className="h-8 w-24 rounded-lg text-sm ml-auto"
                          autoFocus />
                        
                                  <Button size="sm" onClick={() => handleEditWeight(log)} disabled={saving} className="h-8 rounded-lg px-3">
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                </> :

                      <>
                                  <span className="text-sm font-bold text-primary ml-auto">
                                    {log.weight_kg ? `${log.weight_kg} kg` : "—"}
                                    {log.weight_kg_2 ? <span className="text-muted-foreground font-normal"> / {log.weight_kg_2} kg</span> : null}
                                  </span>
                                  <button
                          onClick={() => {setEditingLog(log.id);setEditWeight(log.weight_kg ? String(log.weight_kg) : "");}}
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                          
                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                  <button
                          onClick={() => handleDeleteLog(log)}
                          disabled={deletingLog === log.id}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                          
                                    {deletingLog === log.id ?
                          <div className="w-3.5 h-3.5 border-2 border-destructive/20 border-t-destructive rounded-full animate-spin" /> :
                          <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                </>
                      }
                            </div>
                            {/* Quick weight adjust buttons */}
                            {editingLog !== log.id && log.weight_kg != null &&
                    <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] text-muted-foreground mr-1">Modifica rapida:</span>
                                {[-5, -2, -1, +1, +2, +5].map((d) =>
                      <button key={d} onClick={() => adjustWeight(log, d)}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                      d > 0 ?
                      "bg-primary/10 text-primary hover:bg-primary/20" :
                      "bg-secondary hover:bg-secondary/80 text-muted-foreground"}`
                      }>
                                    {d > 0 ? `+${d}` : d}kg
                                  </button>
                      )}
                              </div>
                    }
                          </div>
                  )}
                      </div>
                      </div>
              }

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Registra Serie</p>
                      <button
                    onClick={() => setIsWarmup((v) => !v)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                    isWarmup ? "bg-chart-3/10 text-chart-3 border-chart-3/40" : "bg-secondary text-muted-foreground border-border"}`
                    }>
                    
                        <Flame className="w-3 h-3" />
                        Warm Up
                      </button>
                    </div>
                    <div className="space-y-3">
                       <div className="flex gap-2">
                         <div className="flex-1">
                           <label className="text-xs text-muted-foreground mb-1 block">Serie</label>
                           <Select value={setNumber} onValueChange={setSetNumber}>
                             <SelectTrigger className="h-10 rounded-xl text-[hsl(var(--primary))]">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               {isWarmup ? (
                                 // Per warmup: numeri liberi 1-10
                                 Array.from({ length: 10 }, (_, i) => i + 1).map((n) =>
                                   <SelectItem key={n} value={String(n)}>WU {n}</SelectItem>
                                 )
                               ) : (
                                 // Serie allenanti: quelle mancanti + extra
                                 (() => {
                                   const missing = Array.from({ length: totalSets }, (_, i) => i + 1).filter(n => !completedSetNumbers.includes(n));
                                   const extra = Array.from({ length: 5 }, (_, i) => totalSets + i + 1);
                                   return [...missing, ...extra].map(n =>
                                     <SelectItem key={n} value={String(n)}>{n > totalSets ? `Serie ${n} (extra)` : `Serie ${n}`}</SelectItem>
                                   );
                                 })()
                               )}
                             </SelectContent>
                           </Select>
                         </div>
                         <div className="w-20 shrink-0">
                           <label className="text-xs text-muted-foreground mb-1 block">Rep fatte</label>
                           <Input
                        type="number"
                        placeholder={exercise.reps ? exercise.reps.split(/\D/)[0] : "—"}
                        value={repsDone}
                        onChange={(e) => setRepsDone(e.target.value)}
                        className="h-10 rounded-xl" />
                      
                         </div>
                         <div className="flex-1">
                           <label className="text-xs text-muted-foreground mb-1 block">{isDoubleReps ? "Carico 1° (kg)" : "Carico (kg)"}</label>
                           <Input
                        type="number"
                        placeholder="es. 50"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="h-10 rounded-xl" />
                      
                         </div>
                         {isDoubleReps &&
                    <div className="flex-1">
                             <label className="text-xs text-muted-foreground mb-1 block">Carico 2° (kg)</label>
                             <Input
                        type="number"
                        placeholder="es. 30"
                        value={weightKg2}
                        onChange={(e) => setWeightKg2(e.target.value)}
                        className="h-10 rounded-xl" />
                      
                           </div>
                    }
                       </div>
                     </div>
                     <div className="flex gap-2">
                       <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl h-10">
                        <Plus className="w-4 h-4 mr-1" />
                        {saving ? "Salvataggio..." : "Salva Serie"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowChart(!showChart)} className="rounded-xl h-10">
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Note personali esercizio
                    </p>
                    {noteSaved && !editingNote &&
                  <button onClick={() => setEditingNote(true)} className="p-1 rounded hover:bg-secondary">
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                  }
                  </div>
                  {noteSaved && !editingNote && (
                    <p className="text-sm text-muted-foreground bg-secondary/40 rounded-xl px-3 py-2 italic">
                      {exerciseNote || "—"}
                    </p>
                  )}
                  {(!noteSaved || editingNote) && (
                    <div className="flex gap-2">
                      <textarea
                        placeholder="Es. Sento bene il bicipite, aumentare peso..."
                        value={exerciseNote}
                        onChange={(e) => setExerciseNote(e.target.value)}
                        rows={2}
                        className="flex-1 text-sm bg-background border border-input rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                      />
                      <Button size="sm" onClick={handleSaveNote} disabled={savingNote} className="h-9 rounded-xl self-end">
                        {savingNote ? "..." : <Check className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {showChart && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <LoadChart logs={logs} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>);

}