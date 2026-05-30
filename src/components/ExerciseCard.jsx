import { useState, useEffect } from "react";
import { startTimer } from "@/lib/timerStore";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Dumbbell, TrendingUp, Check, Pencil, MessageSquare, Flame, Trash2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import LoadChart from "./LoadChart";
import ExerciseCompareModal from "./ExerciseCompareModal";

export default function ExerciseCard({ exercise, logs, onLogSaved, onLogDeleted, index }) {
  const [expanded, setExpanded] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
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
  const [completed, setCompleted] = useState(false);
  const [showWarmups, setShowWarmups] = useState(false);
  const [customRestEnabled, setCustomRestEnabled] = useState(false);
  const [rpePerSetEnabled, setRpePerSetEnabled] = useState(false);
  const [setNotes, setSetNotes] = useState("");
  const [rpeSet, setRpeSet] = useState("");

  useEffect(() => {
    setCustomRestEnabled(localStorage.getItem("customRestEnabled") === "true");
    setRpePerSetEnabled(localStorage.getItem("rpePerSetEnabled") === "true");
  }, []);

  const isDoubleReps = exercise.reps && exercise.reps.includes("/");
  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.date === today);
  const totalSets = exercise.sets || 5;
  const trainingSets = todayLogs.filter(l => !l.is_warmup);
  const warmupLogs = todayLogs.filter(l => l.is_warmup);
  const allSetsCompleted = trainingSets.length >= totalSets;
  const completedSetNumbers = trainingSets.map(l => l.set_number);
  const nextSet = Array.from({ length: totalSets }, (_, i) => i + 1).find(n => !completedSetNumbers.includes(n));

  const trainingLogsToday = todayLogs.filter(l => !l.is_warmup).sort((a, b) => b.set_number - a.set_number);
  const lastSessionLogs = logs.filter(l => l.date !== today && !l.is_warmup);
  const lastSessionDates = [...new Set(lastSessionLogs.map(l => l.date))].sort((a, b) => b.localeCompare(a));
  const lastSessionDate = lastSessionDates[0];
  const lastSessionSetLogs = lastSessionDate ? lastSessionLogs.filter(l => l.date === lastSessionDate) : [];
  const currentSetNum = Number(isWarmup ? setNumber : (nextSet || totalSets + 1));
  const prevSetLog = !isWarmup ? lastSessionSetLogs.find(l => l.set_number === currentSetNum) : null;

  const pyramidReps = exercise.reps && /^\d+(-\d+)+$/.test(exercise.reps.trim())
    ? exercise.reps.trim().split("-").map(Number) : null;
  const suggestedReps = pyramidReps
    ? (pyramidReps[currentSetNum - 1] ?? pyramidReps[pyramidReps.length - 1]) : null;
  const suggestedWeight = !isWarmup && trainingLogsToday.length > 0 && trainingLogsToday[0].weight_kg != null
    ? String(trainingLogsToday[0].weight_kg)
    : prevSetLog?.weight_kg ? String(prevSetLog.weight_kg) : "";

  async function handleSave() {
    setSaving(true);
    const optimistic = {
      id: `tmp-${Date.now()}`,
      exercise_id: exercise.id, plan_id: exercise.plan_id, exercise_name: exercise.name,
      set_number: Number(setNumber),
      reps_done: repsDone ? Number(repsDone) : exercise.reps ? parseInt(exercise.reps) : 0,
      weight_kg: weightKg ? Number(weightKg) : undefined,
      weight_kg_2: isDoubleReps && weightKg2 ? Number(weightKg2) : undefined,
      notes: setNotes || undefined,
      rpe_set: rpePerSetEnabled && rpeSet ? Number(rpeSet) : undefined,
      is_warmup: isWarmup, date: today,
    };
    onLogSaved(optimistic);
    const nextSetNum = isWarmup
      ? Number(setNumber) + 1
      : (nextSet ? (nextSet === Number(setNumber) ? nextSet + 1 : nextSet) : totalSets + 1);
    setSetNumber(String(nextSetNum));
    const nextPrevLog = !isWarmup ? lastSessionSetLogs.find(l => l.set_number === nextSetNum) : null;
    const justLoggedWeight = !isWarmup && optimistic.weight_kg != null ? String(optimistic.weight_kg) : null;
    setWeightKg(justLoggedWeight ?? (nextPrevLog?.weight_kg ? String(nextPrevLog.weight_kg) : ""));
    setWeightKg2(""); setRepsDone(""); setSetNotes(""); setRpeSet("");
    setSaving(false);
    const defaultRest = Number(localStorage.getItem("defaultRestSeconds") || "90");
    const restTime = customRestEnabled && exercise.rest_seconds > 0 ? exercise.rest_seconds : (exercise.rest_seconds > 0 ? exercise.rest_seconds : defaultRest);
    startTimer(restTime);
    const newLog = await base44.entities.WorkoutLog.create({
      exercise_id: exercise.id, plan_id: exercise.plan_id, exercise_name: exercise.name,
      set_number: Number(optimistic.set_number), reps_done: optimistic.reps_done,
      weight_kg: optimistic.weight_kg, weight_kg_2: optimistic.weight_kg_2,
      notes: optimistic.notes, rpe_set: optimistic.rpe_set, is_warmup: isWarmup, date: today,
    });
    onLogSaved({ ...newLog, _replaceId: optimistic.id });
  }

  async function handleEditWeight(log) {
    setSaving(true);
    const newWeight = editWeight ? Number(editWeight) : undefined;
    await base44.entities.WorkoutLog.update(log.id, { weight_kg: newWeight });
    log.weight_kg = newWeight; setEditingLog(null); setEditWeight(""); setSaving(false);
  }

  async function adjustWeight(log, delta) {
    const updated = Math.max(0, parseFloat(((log.weight_kg || 0) + delta).toFixed(1)));
    await base44.entities.WorkoutLog.update(log.id, { weight_kg: updated });
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
    setNoteSaved(true); setEditingNote(false); setSavingNote(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white/4 border rounded-3xl overflow-hidden transition-colors ${
        allSetsCompleted ? "border-green-500/25" : expanded ? "border-[#fcd12a]/20" : "border-white/7"
      }`}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3 transition-colors"
      >
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
          allSetsCompleted ? "bg-green-500/15" : "bg-[#fcd12a]/10"
        }`}>
          {allSetsCompleted
            ? <CheckCircle2 className="w-5 h-5 text-green-400" />
            : <Dumbbell className="w-5 h-5 text-[#fcd12a]" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm">{exercise.name}</h3>
          <p className="text-xs text-white/35 mt-0.5">
            {exercise.sets && `${exercise.sets} serie`}
            {exercise.reps && ` × ${exercise.reps}`}
            {exercise.rest_seconds && ` · ${exercise.rest_seconds}s rec.`}
          </p>
        </div>
        {todayLogs.length > 0 && (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
            allSetsCompleted ? "bg-green-500/15 text-green-400" : "bg-[#fcd12a]/12 text-[#fcd12a]"
          }`}>
            {trainingSets.length}/{totalSets}
            {warmupLogs.length > 0 && <span className="text-orange-400 ml-1">+{warmupLogs.length}W</span>}
          </span>
        )}
        {expanded
          ? <ChevronUp className="w-4 h-4 text-white/25 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-white/25 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4">

              {/* Trainer note */}
              {exercise.notes && (
                <div className="flex items-start gap-2 bg-[#fcd12a]/5 border border-[#fcd12a]/12 rounded-2xl px-3 py-2.5">
                  <span className="text-[#fcd12a]/50 text-xs shrink-0 mt-0.5">📝</span>
                  <p className="text-xs text-white/50">{exercise.notes}</p>
                </div>
              )}

              {/* Reps prescription */}
              {exercise.reps && (
                <div className="flex items-center gap-2 bg-white/3 rounded-2xl px-3 py-2">
                  <span className="text-xs text-white/30">Ripetizioni prescritte:</span>
                  <span className="font-bold text-sm text-[#fcd12a]">{exercise.reps}</span>
                </div>
              )}

              {/* Today's sets */}
              {todayLogs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Serie di oggi</p>
                    <div className="flex items-center gap-2">
                      {warmupLogs.length > 0 && (
                        <button onClick={() => setShowWarmups(v => !v)}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400 flex items-center gap-1">
                          🔥 {warmupLogs.length} WU {showWarmups ? "▲" : "▼"}
                        </button>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        allSetsCompleted ? "bg-green-500/15 text-green-400" : "bg-[#fcd12a]/12 text-[#fcd12a]"
                      }`}>
                        {trainingSets.length}/{totalSets} serie
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[...todayLogs].filter(l => !l.is_warmup || showWarmups).sort((a, b) => a.set_number - b.set_number).map(log => (
                      <div key={log.id} className="bg-white/4 rounded-2xl px-3 py-2.5 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/30 w-14 shrink-0">
                            {log.is_warmup ? <span className="text-orange-400">🔥 W/U</span> : `Serie ${log.set_number}`}
                          </span>
                          <span className="text-sm text-white/60">{log.reps_done || exercise.reps || "—"} rep</span>
                          {editingLog === log.id ? (
                            <>
                              <Input type="number" placeholder="kg" value={editWeight}
                                onChange={e => setEditWeight(e.target.value)}
                                className="h-8 w-24 rounded-xl text-sm ml-auto bg-white/5 border-white/10 text-white" autoFocus />
                              <button onClick={() => handleEditWeight(log)} disabled={saving}
                                className="w-8 h-8 rounded-xl bg-[#fcd12a] text-black flex items-center justify-center">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-bold text-[#fcd12a] ml-auto">
                                {log.weight_kg ? `${log.weight_kg} kg` : "—"}
                                {log.weight_kg_2 ? <span className="text-white/30 font-normal"> / {log.weight_kg_2}kg</span> : null}
                                {log.rpe_set != null ? <span className="text-xs text-white/25 font-normal ml-1">RPE {log.rpe_set}</span> : null}
                              </span>
                              <button onClick={() => { setEditingLog(log.id); setEditWeight(log.weight_kg ? String(log.weight_kg) : ""); }}
                                className="p-1.5 rounded-xl hover:bg-white/8 transition-colors">
                                <Pencil className="w-3.5 h-3.5 text-white/25" />
                              </button>
                              <button onClick={() => handleDeleteLog(log)} disabled={deletingLog === log.id}
                                className="p-1.5 rounded-xl hover:bg-red-500/10 transition-colors">
                                {deletingLog === log.id
                                  ? <div className="w-3.5 h-3.5 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5 text-red-400/50" />}
                              </button>
                            </>
                          )}
                        </div>
                        {editingLog !== log.id && log.weight_kg != null && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-white/20 mr-1">Quick:</span>
                            {[-5, -2, -1, +1, +2, +5].map(d => (
                              <button key={d} onClick={() => adjustWeight(log, d)}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                                  d > 0 ? "bg-[#fcd12a]/10 text-[#fcd12a] hover:bg-[#fcd12a]/20" : "bg-white/5 text-white/35 hover:bg-white/10"
                                }`}>
                                {d > 0 ? `+${d}` : d}kg
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Log new set */}
              <div className="space-y-3 bg-white/3 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Registra Serie</p>
                  <button onClick={() => setIsWarmup(v => !v)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                      isWarmup ? "bg-orange-400/10 text-orange-400 border-orange-400/30" : "bg-white/5 text-white/30 border-white/10"
                    }`}>
                    <Flame className="w-3 h-3" /> Warm Up
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-white/30 mb-1 block">Serie</label>
                    <Select value={setNumber} onValueChange={setSetNumber}>
                      <SelectTrigger className="h-10 rounded-2xl bg-white/5 border-white/10 text-[#fcd12a] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isWarmup
                          ? Array.from({ length: 10 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>WU {n}</SelectItem>)
                          : (() => {
                            const missing = Array.from({ length: totalSets }, (_, i) => i + 1).filter(n => !completedSetNumbers.includes(n));
                            const extra = Array.from({ length: 5 }, (_, i) => totalSets + i + 1);
                            return [...missing, ...extra].map(n => (
                              <SelectItem key={n} value={String(n)}>{n > totalSets ? `Serie ${n} (extra)` : `Serie ${n}`}</SelectItem>
                            ));
                          })()
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/30 mb-1 block">
                      Rep fatte
                      {suggestedReps && <span className="text-[#fcd12a]/60 ml-1">({suggestedReps} pres.)</span>}
                    </label>
                    <Input type="number"
                      placeholder={suggestedReps ? String(suggestedReps) : (exercise.reps ? exercise.reps.split(/\D/)[0] : "—")}
                      value={repsDone} onChange={e => setRepsDone(e.target.value)}
                      className="h-10 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/30 mb-1 block">
                      {isDoubleReps ? "Carico 1° (kg)" : "Carico (kg)"}
                      {suggestedWeight && !weightKg && <span className="text-[#fcd12a]/60 ml-1">(prec. {suggestedWeight}kg)</span>}
                    </label>
                    <Input type="number" placeholder={suggestedWeight || "es. 50"}
                      value={weightKg} onChange={e => setWeightKg(e.target.value)}
                      className="h-10 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/30 mb-1 block">Note serie</label>
                    <Input type="text" placeholder="es. buona esecuzione..."
                      value={setNotes} onChange={e => setSetNotes(e.target.value)}
                      className="h-10 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                  </div>
                  {rpePerSetEnabled && (
                    <div className="col-span-2">
                      <label className="text-[11px] text-white/30 mb-1 block">RPE (1-10)</label>
                      <Input type="number" placeholder="es. 8" min="1" max="10"
                        value={rpeSet} onChange={e => setRpeSet(e.target.value)}
                        className="h-10 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                    </div>
                  )}
                  {isDoubleReps && (
                    <div>
                      <label className="text-[11px] text-white/30 mb-1 block">Carico 2° (kg)</label>
                      <Input type="number" placeholder="es. 30"
                        value={weightKg2} onChange={e => setWeightKg2(e.target.value)}
                        className="h-10 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 h-11 rounded-2xl bg-[#fcd12a] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#fcd12a]/90 disabled:opacity-50 transition-all active:scale-[0.98]">
                    <Plus className="w-4 h-4" />
                    {saving ? "Salvataggio..." : "Salva Serie"}
                  </button>
                  <button onClick={() => setShowChart(!showChart)}
                    className="w-11 h-11 rounded-2xl bg-white/6 border border-white/8 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <TrendingUp className="w-4 h-4 text-white/40" />
                  </button>
                  <button onClick={() => setShowCompare(true)}
                    className="w-11 h-11 rounded-2xl bg-white/6 border border-white/8 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="text-xs font-bold text-white/40">A/B</span>
                  </button>
                </div>
                <button
                  onClick={() => { setCompleted(true); setExpanded(false); }}
                  className={`w-full h-10 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    completed
                      ? "bg-green-500/15 text-green-400 border border-green-500/25"
                      : "bg-white/4 text-white/40 border border-white/8 hover:border-green-500/25 hover:text-green-400"
                  }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  {completed ? "Esercizio completato ✓" : "Segna come completato"}
                </button>
              </div>

              {/* Personal note */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> Note personali
                  </p>
                  {noteSaved && !editingNote && (
                    <button onClick={() => setEditingNote(true)} className="p-1 rounded hover:bg-white/8">
                      <Pencil className="w-3 h-3 text-white/25" />
                    </button>
                  )}
                </div>
                {noteSaved && !editingNote && (
                  <p className="text-sm text-white/40 bg-white/4 rounded-2xl px-3 py-2 italic">{exerciseNote || "—"}</p>
                )}
                {(!noteSaved || editingNote) && (
                  <div className="flex gap-2">
                    <textarea placeholder="Es. Sento bene il bicipite, aumentare peso..."
                      value={exerciseNote} onChange={e => setExerciseNote(e.target.value)} rows={2}
                      className="flex-1 text-sm bg-white/5 border border-white/10 rounded-2xl px-3 py-2 resize-none focus:outline-none focus:border-[#fcd12a]/30 text-white placeholder:text-white/20" />
                    <button onClick={handleSaveNote} disabled={savingNote}
                      className="h-9 px-3 rounded-2xl bg-[#fcd12a] text-black font-bold self-end">
                      {savingNote ? "..." : <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Chart */}
              <AnimatePresence>
                {showChart && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <LoadChart logs={logs} />
                  </motion.div>
                )}
              </AnimatePresence>

              {showCompare && (
                <ExerciseCompareModal exercise={exercise} logs={logs} onClose={() => setShowCompare(false)} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}