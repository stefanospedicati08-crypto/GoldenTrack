import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Dumbbell, TrendingUp, Check, Pencil, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import LoadChart from "./LoadChart";
import RestTimer from "./RestTimer";

export default function ExerciseCard({ exercise, logs, onLogSaved, index }) {
  const [expanded, setExpanded] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [setNumber, setSetNumber] = useState("1");
  const [weightKg, setWeightKg] = useState("");
  const [editingLog, setEditingLog] = useState(null);
  const [editWeight, setEditWeight] = useState("");
  const [exerciseNote, setExerciseNote] = useState(exercise.athlete_note || "");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(!!exercise.athlete_note);
  const [editingNote, setEditingNote] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.date === today);
  const totalSets = exercise.sets || 5;
  const allSetsCompleted = todayLogs.length >= totalSets;

  const completedSetNumbers = todayLogs.map(l => l.set_number);
  const nextSet = Array.from({ length: totalSets }, (_, i) => i + 1).find(n => !completedSetNumbers.includes(n));

  async function handleSave() {
    setSaving(true);
    const newLog = await base44.entities.WorkoutLog.create({
      exercise_id: exercise.id,
      plan_id: exercise.plan_id,
      exercise_name: exercise.name,
      set_number: Number(setNumber),
      reps_done: exercise.reps ? parseInt(exercise.reps) : 0,
      weight_kg: weightKg ? Number(weightKg) : undefined,
      date: today,
    });
    onLogSaved(newLog);
    const next = nextSet ? String(nextSet === Number(setNumber) ? nextSet + 1 : nextSet) : String(totalSets);
    setSetNumber(next);
    setWeightKg("");
    setSaving(false);
    setShowTimer(true);
  }

  async function handleEditWeight(log) {
    setSaving(true);
    await base44.entities.WorkoutLog.update(log.id, { weight_kg: editWeight ? Number(editWeight) : undefined });
    log.weight_kg = editWeight ? Number(editWeight) : undefined;
    setEditingLog(null);
    setEditWeight("");
    setSaving(false);
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
      <AnimatePresence>
        {showTimer && (
          <RestTimer defaultSeconds={exercise.rest_seconds || 90} onClose={() => setShowTimer(false)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-card rounded-2xl border border-border overflow-hidden"
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{exercise.name}</h3>
            <p className="text-sm text-muted-foreground">
              {exercise.sets && `${exercise.sets} serie`}
              {exercise.reps && ` × ${exercise.reps} rep`}
              {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rec.`}
            </p>
          </div>
          {todayLogs.length > 0 && (
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${allSetsCompleted ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
              {allSetsCompleted ? "✓ Completato" : `${todayLogs.length}/${totalSets} serie`}
            </span>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                {exercise.notes && (
                  <p className="text-sm text-muted-foreground bg-secondary/50 rounded-xl p-3">
                    📝 {exercise.notes}
                  </p>
                )}

                {exercise.reps && (
                  <div className="flex items-center gap-2 bg-secondary/40 rounded-xl px-3 py-2">
                    <span className="text-xs text-muted-foreground">Ripetizioni prescritte:</span>
                    <span className="font-semibold text-sm">{exercise.reps}</span>
                  </div>
                )}

                {todayLogs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Serie di oggi</p>
                    <div className="space-y-2">
                      {todayLogs
                        .sort((a, b) => a.set_number - b.set_number)
                        .map((log) => (
                          <div key={log.id} className="flex items-center gap-3 bg-secondary/40 rounded-xl px-3 py-2.5">
                            <span className="text-xs text-muted-foreground w-14">Serie {log.set_number}</span>
                            <span className="text-sm font-medium">{exercise.reps || log.reps_done} rep</span>
                            {editingLog === log.id ? (
                              <>
                                <Input
                                  type="number"
                                  placeholder="kg"
                                  value={editWeight}
                                  onChange={e => setEditWeight(e.target.value)}
                                  className="h-8 w-24 rounded-lg text-sm ml-auto"
                                  autoFocus
                                />
                                <Button size="sm" onClick={() => handleEditWeight(log)} disabled={saving} className="h-8 rounded-lg px-3">
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-sm font-bold text-primary ml-auto">
                                  {log.weight_kg ? `${log.weight_kg} kg` : "—"}
                                </span>
                                <button
                                  onClick={() => { setEditingLog(log.id); setEditWeight(log.weight_kg ? String(log.weight_kg) : ""); }}
                                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {!allSetsCompleted && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Registra Serie</p>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Seleziona Serie</label>
                        <Select value={setNumber} onValueChange={setSetNumber}>
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: totalSets }, (_, i) => i + 1)
                              .filter(n => !completedSetNumbers.includes(n))
                              .map(n => (
                                <SelectItem key={n} value={String(n)}>Serie {n}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Carico (kg)</label>
                        <Input
                          type="number"
                          placeholder="es. 50"
                          value={weightKg}
                          onChange={e => setWeightKg(e.target.value)}
                          className="h-10 rounded-xl"
                        />
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
                )}

                {allSetsCompleted && (
                  <Button variant="outline" onClick={() => setShowChart(!showChart)} className="w-full rounded-xl h-10">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {showChart ? "Nascondi grafico" : "Mostra progressione carico"}
                  </Button>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Note personali esercizio
                    </p>
                    {noteSaved && !editingNote && (
                      <button onClick={() => setEditingNote(true)} className="p-1 rounded hover:bg-secondary">
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  {noteSaved && !editingNote ? (
                    <p className="text-sm text-muted-foreground bg-secondary/40 rounded-xl px-3 py-2 italic">
                      {exerciseNote || "—"}
                    </p>
                  ) : (
                    <div className="flex gap-2">
                      <textarea
                        placeholder="Es. Sento bene il bicipite, aumentare peso..."
                        value={exerciseNote}
                        onChange={e => setExerciseNote(e.target.value)}
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
    </>
  );
}