import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Dumbbell, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import LoadChart from "./LoadChart";

export default function ExerciseCard({ exercise, logs, onLogSaved, index }) {
  const [expanded, setExpanded] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [setNumber, setSetNumber] = useState(1);
  const [repsDone, setRepsDone] = useState("");
  const [weightKg, setWeightKg] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.date === today);

  async function handleSave() {
    if (!repsDone) return;
    setSaving(true);
    const newLog = await base44.entities.WorkoutLog.create({
      exercise_id: exercise.id,
      plan_id: exercise.plan_id,
      exercise_name: exercise.name,
      set_number: setNumber,
      reps_done: Number(repsDone),
      weight_kg: weightKg ? Number(weightKg) : undefined,
      date: today,
    });
    onLogSaved(newLog);
    setSetNumber(prev => prev + 1);
    setRepsDone("");
    setWeightKg("");
    setSaving(false);
  }

  return (
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
            {exercise.reps && ` × ${exercise.reps}`}
            {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rec.`}
          </p>
        </div>
        {todayLogs.length > 0 && (
          <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
            {todayLogs.length} serie
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

              {/* Today's logs */}
              {todayLogs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Oggi</p>
                  <div className="grid grid-cols-3 gap-2">
                    {todayLogs.map((log, i) => (
                      <div key={log.id || i} className="bg-secondary/50 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground">Serie {log.set_number}</p>
                        <p className="font-bold text-sm">{log.reps_done} rep</p>
                        {log.weight_kg && <p className="text-xs text-primary font-medium">{log.weight_kg} kg</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new set */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nuova Serie</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Serie #</label>
                    <Input
                      type="number"
                      value={setNumber}
                      onChange={e => setSetNumber(Number(e.target.value))}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Ripetizioni</label>
                    <Input
                      type="number"
                      placeholder="12"
                      value={repsDone}
                      onChange={e => setRepsDone(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Carico (kg)</label>
                    <Input
                      type="number"
                      placeholder="50"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving || !repsDone} className="flex-1 rounded-xl h-10">
                    <Plus className="w-4 h-4 mr-1" />
                    {saving ? "Salvataggio..." : "Salva Serie"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowChart(!showChart)}
                    className="rounded-xl h-10"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Load chart */}
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
  );
}