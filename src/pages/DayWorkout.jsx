import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle2, Flag, Pencil, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ExerciseCard from "../components/ExerciseCard";
import SupersetGroup from "../components/SupersetGroup";
import SessionDayLogger from "../components/SessionDayLogger";
import DaySessionHistory from "../components/DaySessionHistory";

export default function DayWorkout() {
  const { planId, day } = useParams();
  const dayLabel = decodeURIComponent(day);
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSessionLogger, setShowSessionLogger] = useState(false);
  const [editingSuperset, setEditingSuperset] = useState(false);
  const [supersetEdits, setSupersetEdits] = useState({});

  // Calcola la chiave della settimana corrente (lunedì)
  function getWeekKey() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0];
  }

  const sessionDoneKey = `session_done_${planId}_${dayLabel}_${getWeekKey()}`;
  const [isSessionDone, setIsSessionDone] = useState(() => !!localStorage.getItem(sessionDoneKey));

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      const [p, exs, lgs, sess] = await Promise.all([
      base44.entities.WorkoutPlan.get(planId),
      base44.entities.Exercise.filter({ plan_id: planId }, "order_index"),
      base44.entities.WorkoutLog.filter({ plan_id: planId }, "-date", 500),
      base44.entities.WorkoutSession.filter({ plan_id: planId }, "-date", 100)]
      );
      setPlan(p);
      setExercises(exs.filter((ex) => (ex.day_label || "Generale") === dayLabel));
      setLogs(lgs);
      setSessions(sess);
      setLoading(false);
    }
    load();
  }, [planId, dayLabel]);

  const handleLogSaved = (newLog) => {
    if (newLog._replaceId) {
      setLogs((prev) => prev.map((l) => l.id === newLog._replaceId ? newLog : l));
    } else {
      setLogs((prev) => [newLog, ...prev]);
    }
  };

  async function saveSupersetEdits() {
    const updates = Object.entries(supersetEdits);
    await Promise.all(updates.map(([exId, letter]) =>
    base44.entities.Exercise.update(exId, { notes: letter || undefined })
    ));
    setExercises((prev) => prev.map((ex) =>
    supersetEdits[ex.id] !== undefined ?
    { ...ex, notes: supersetEdits[ex.id] || undefined } :
    ex
    ));
    setSupersetEdits({});
    setEditingSuperset(false);
  }

  const handleLogDeleted = (logId) => {
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  const handleSessionSaved = (session) => {
    setSessions((prev) => {
      const exists = prev.find((s) => s.id === session.id);
      if (exists) return prev.map((s) => s.id === session.id ? session : s);
      return [session, ...prev];
    });
    setShowSessionLogger(false);
    localStorage.setItem(sessionDoneKey, "1");
    setIsSessionDone(true);
    navigate(`/schede/${planId}`);
  };

  const handleSessionDeleted = async (session) => {
    await base44.entities.WorkoutSession.delete(session.id);
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    // Se era la sessione di questa settimana, sblocca il workout
    const weekKey = getWeekKey();
    const key = `session_done_${planId}_${dayLabel}_${weekKey}`;
    localStorage.removeItem(key);
    setIsSessionDone(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>);

  }

  // Group exercises by superset letter (e.g. "A", "B") detected from name prefix like "A1", "A2", or notes
  // We detect superset by looking at the first character of the exercise name if it's a letter followed by a number
  function getSupersetKey(ex) {
    // Check notes field for a standalone letter (e.g. notes = "A")
    const notes = ex.notes?.trim() || "";
    if (/^[A-Z]$/i.test(notes)) return notes.toUpperCase();
    // Check name prefix like "A CHIN UPS", "A.", "A-"
    const name = ex.name?.trim() || "";
    const match = name.match(/^([A-Z])(?:[\s\-\.\d]|$)/i);
    return match ? match[1].toUpperCase() : null;
  }

  // Build ordered groups: superset groups and standalone exercises
  const groups = [];
  const seen = new Set();

  exercises.forEach((ex) => {
    if (seen.has(ex.id)) return;
    const key = getSupersetKey(ex);
    if (key) {
      const siblings = exercises.filter((e) => getSupersetKey(e) === key);
      if (siblings.length > 1) {
        siblings.forEach((s) => seen.add(s.id));
        groups.push({ type: "superset", key, exercises: siblings });
        return;
      }
    }
    seen.add(ex.id);
    groups.push({ type: "single", exercise: ex });
  });

  const todaySessions = sessions.filter((s) => s.day_label === dayLabel && s.date === today);

  return (
    <div className="space-y-5 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/schede/${planId}`} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5 text-[hsl(var(--primary))]" />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium">{plan?.title}</p>
          <h1 className="font-heading text-2xl font-bold text-[hsl(var(--primary))]">{dayLabel}</h1>
        </div>
        {!editingSuperset ?
        <button onClick={() => setEditingSuperset(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary px-3 py-1.5 rounded-xl transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Superset
          </button> :

        <div className="flex gap-2">
            <button onClick={saveSupersetEdits}
          className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-3 py-1.5 rounded-xl">
              <Check className="w-3.5 h-3.5" /> Salva
            </button>
            <button onClick={() => {setSupersetEdits({});setEditingSuperset(false);}}
          className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-xl">
              <X className="w-3.5 h-3.5" /> Annulla
            </button>
          </div>
        }
      </div>

      {/* Superset editing mode */}
      {editingSuperset &&
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Assegna lettere superset</p>
          <p className="text-xs text-muted-foreground">Assegna la stessa lettera a due esercizi per raggrupparli come superset.</p>
          <div className="space-y-2 mt-3">
            {exercises.map((ex) => {
            const current = supersetEdits[ex.id] !== undefined ? supersetEdits[ex.id] : ex.notes?.match(/^[A-Z]$/i) ? ex.notes.toUpperCase() : "";
            return (
              <div key={ex.id} className="flex items-center gap-3 bg-card rounded-xl px-3 py-2.5 border border-border">
                  <span className="flex-1 text-sm font-medium truncate">{ex.name}</span>
                  <div className="flex gap-1">
                    {["", "A", "B", "C", "D", "E"].map((letter) =>
                  <button key={letter}
                  onClick={() => setSupersetEdits((prev) => ({ ...prev, [ex.id]: letter }))}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  current === letter ?
                  "bg-primary text-primary-foreground" :
                  "bg-secondary hover:bg-secondary/80 text-muted-foreground"}`
                  }>
                        {letter || "—"}
                      </button>
                  )}
                  </div>
                </div>);

          })}
          </div>
        </motion.div>
      }

      {/* Se la sessione è già stata terminata questa settimana → solo storico */}
      {isSessionDone && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
          <p className="text-sm text-accent font-medium">Sessione completata questa settimana — visualizzazione sola lettura.</p>
        </div>
      )}

      {/* Exercise list */}
      {groups.map((group, gi) =>
      group.type === "superset" ?
      <SupersetGroup
        key={group.key}
        supersetKey={group.key}
        exercises={group.exercises}
        logs={logs}
        onLogSaved={handleLogSaved}
        onLogDeleted={handleLogDeleted}
        readOnly={isSessionDone}
        index={gi} /> :

      <ExerciseCard
        key={group.exercise.id}
        exercise={group.exercise}
        logs={logs.filter((l) => l.exercise_id === group.exercise.id)}
        onLogSaved={handleLogSaved}
        onLogDeleted={handleLogDeleted}
        readOnly={isSessionDone}
        index={gi} />
      )}

      {/* Storico sessioni */}
      <DaySessionHistory
        sessions={sessions.filter((s) => s.day_label === dayLabel && s.date !== today)}
        dayLabel={dayLabel}
        logs={logs}
        onSessionDeleted={handleSessionDeleted} />
      

      {/* Session Logger modal */}
      <AnimatePresence>
        {showSessionLogger &&
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowSessionLogger(false)}>
            <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-lg">Sessione Completata! 💪</h2>
                  <p className="text-sm text-muted-foreground">Compila i dati della sessione</p>
                </div>
              </div>
              <SessionDayLogger
              planId={planId}
              dayLabel={dayLabel}
              date={today}
              existingSession={todaySessions[0]}
              onSaved={handleSessionSaved}
              inline />
            
            </motion.div>
          </div>
        }
      </AnimatePresence>

      {/* FAB Termina Sessione — nascosto se sessione già terminata */}
      {!isSessionDone && <div className="fixed bottom-24 left-0 right-0 flex justify-center z-40 px-4 lg:bottom-6">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => setShowSessionLogger(true)}
          className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold px-6 py-3.5 rounded-full shadow-xl hover:bg-accent/90 active:scale-95 transition-all">
          
          <Flag className="w-5 h-5" />
          Termina Sessione
        </motion.button>
      </div>}
    </div>);

}