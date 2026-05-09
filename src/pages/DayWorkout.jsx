import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle2, Flag } from "lucide-react";
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

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      const [p, exs, lgs, sess] = await Promise.all([
        base44.entities.WorkoutPlan.get(planId),
        base44.entities.Exercise.filter({ plan_id: planId }, "order_index"),
        base44.entities.WorkoutLog.filter({ plan_id: planId }, "-date", 500),
        base44.entities.WorkoutSession.filter({ plan_id: planId }, "-date", 100),
      ]);
      setPlan(p);
      setExercises(exs.filter(ex => (ex.day_label || "Generale") === dayLabel));
      setLogs(lgs);
      setSessions(sess);
      setLoading(false);
    }
    load();
  }, [planId, dayLabel]);

  const handleLogSaved = (newLog) => {
    if (newLog._replaceId) {
      setLogs(prev => prev.map(l => l.id === newLog._replaceId ? newLog : l));
    } else {
      setLogs(prev => [newLog, ...prev]);
    }
  };

  const handleLogDeleted = (logId) => {
    setLogs(prev => prev.filter(l => l.id !== logId));
  };

  const handleSessionSaved = (session) => {
    setSessions(prev => {
      const exists = prev.find(s => s.id === session.id);
      if (exists) return prev.map(s => s.id === session.id ? session : s);
      return [session, ...prev];
    });
    setShowSessionLogger(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Group exercises by superset letter (e.g. "A", "B") detected from name prefix like "A1", "A2", or notes
  // We detect superset by looking at the first character of the exercise name if it's a letter followed by a number
  function getSupersetKey(ex) {
    // Match names like "A CHIN UPS", "A.", "A-", "A1", or just single letter "A"
    const name = ex.name?.trim() || "";
    const match = name.match(/^([A-Z])(?:[\s\-\.\d]|$)/i);
    return match ? match[1].toUpperCase() : null;
  }

  // Build ordered groups: superset groups and standalone exercises
  const groups = [];
  const seen = new Set();

  exercises.forEach(ex => {
    if (seen.has(ex.id)) return;
    const key = getSupersetKey(ex);
    if (key) {
      const siblings = exercises.filter(e => getSupersetKey(e) === key);
      if (siblings.length > 1) {
        siblings.forEach(s => seen.add(s.id));
        groups.push({ type: "superset", key, exercises: siblings });
        return;
      }
    }
    seen.add(ex.id);
    groups.push({ type: "single", exercise: ex });
  });

  const todaySessions = sessions.filter(s => s.day_label === dayLabel && s.date === today);

  return (
    <div className="space-y-5 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/schede/${planId}`} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{plan?.title}</p>
          <h1 className="font-heading text-2xl font-bold">{dayLabel}</h1>
        </div>
      </div>

      {/* Exercise list */}
      {groups.map((group, gi) =>
        group.type === "superset" ? (
          <SupersetGroup
            key={group.key}
            supersetKey={group.key}
            exercises={group.exercises}
            logs={logs}
            onLogSaved={handleLogSaved}
            onLogDeleted={handleLogDeleted}
            index={gi}
          />
        ) : (
          <ExerciseCard
            key={group.exercise.id}
            exercise={group.exercise}
            logs={logs.filter(l => l.exercise_id === group.exercise.id)}
            onLogSaved={handleLogSaved}
            onLogDeleted={handleLogDeleted}
            index={gi}
          />
        )
      )}

      {/* Storico sessioni */}
      <DaySessionHistory
        sessions={sessions.filter(s => s.day_label === dayLabel && s.date !== today)}
        dayLabel={dayLabel}
        logs={logs}
      />

      {/* Session Logger modal */}
      <AnimatePresence>
        {showSessionLogger && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSessionLogger(false)}>
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-t-2xl sm:rounded-2xl border border-border w-full sm:max-w-lg shadow-2xl p-6"
            >
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
                inline
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB Termina Sessione */}
      <div className="fixed bottom-24 left-0 right-0 flex justify-center z-40 px-4 lg:bottom-6">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => setShowSessionLogger(true)}
          className="flex items-center gap-2 bg-accent text-accent-foreground font-semibold px-6 py-3.5 rounded-full shadow-xl hover:bg-accent/90 active:scale-95 transition-all"
        >
          <Flag className="w-5 h-5" />
          Termina Sessione
        </motion.button>
      </div>
    </div>
  );
}