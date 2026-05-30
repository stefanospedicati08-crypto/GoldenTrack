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
        base44.entities.WorkoutSession.filter({ plan_id: planId }, "-date", 100),
      ]);
      setPlan(p);
      setExercises(exs.filter((ex) => (ex.day_label || "Generale") === dayLabel));
      setLogs(lgs); setSessions(sess); setLoading(false);
    }
    load();
  }, [planId, dayLabel]);

  const handleLogSaved = (newLog) => {
    if (newLog._replaceId) setLogs(prev => prev.map(l => l.id === newLog._replaceId ? newLog : l));
    else setLogs(prev => [newLog, ...prev]);
  };

  async function saveSupersetEdits() {
    const updates = Object.entries(supersetEdits);
    await Promise.all(updates.map(([exId, letter]) => base44.entities.Exercise.update(exId, { notes: letter || undefined })));
    setExercises(prev => prev.map(ex => supersetEdits[ex.id] !== undefined ? { ...ex, notes: supersetEdits[ex.id] || undefined } : ex));
    setSupersetEdits({}); setEditingSuperset(false);
  }

  const handleLogDeleted = (logId) => setLogs(prev => prev.filter(l => l.id !== logId));

  const handleSessionSaved = (session) => {
    setSessions(prev => {
      const exists = prev.find(s => s.id === session.id);
      if (exists) return prev.map(s => s.id === session.id ? session : s);
      return [session, ...prev];
    });
    setShowSessionLogger(false);
    localStorage.setItem(sessionDoneKey, "1");
    setIsSessionDone(true);
    navigate(`/schede/${planId}`);
  };

  const handleLogUpdated = async (logId, data) => {
    await base44.entities.WorkoutLog.update(logId, data);
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, ...data } : l));
  };

  const handleSessionUpdated = async (sessionId, data) => {
    await base44.entities.WorkoutSession.update(sessionId, data);
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...data } : s));
  };

  const handleSessionDeleted = async (session) => {
    await base44.entities.WorkoutSession.delete(session.id);
    setSessions(prev => prev.filter(s => s.id !== session.id));
    const weekKey = getWeekKey();
    localStorage.removeItem(`session_done_${planId}_${dayLabel}_${weekKey}`);
    setIsSessionDone(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
    </div>
  );

  function getSupersetKey(ex) {
    const notes = ex.notes?.trim() || "";
    if (/^[A-Z]$/i.test(notes)) return notes.toUpperCase();
    const name = ex.name?.trim() || "";
    const match = name.match(/^([A-Z])(?:[\s\-\.\d]|$)/i);
    return match ? match[1].toUpperCase() : null;
  }

  const groups = [];
  const seen = new Set();
  exercises.forEach((ex) => {
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
    <div className="space-y-4 pb-36">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <Link to={`/schede/${planId}`}
          className="w-9 h-9 rounded-2xl bg-white/6 border border-white/8 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4 text-white/70" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-white/30 font-medium truncate">{plan?.title}</p>
          <h1 className="font-heading text-xl font-bold text-white truncate">{dayLabel}</h1>
        </div>
        {/* Superset toggle */}
        {!editingSuperset ? (
          <button onClick={() => setEditingSuperset(true)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 bg-white/5 border border-white/8 px-3 py-1.5 rounded-2xl transition-colors">
            <Pencil className="w-3 h-3" /> SS
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={saveSupersetEdits}
              className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-2xl">
              <Check className="w-3 h-3" /> Salva
            </button>
            <button onClick={() => { setSupersetEdits({}); setEditingSuperset(false); }}
              className="p-1.5 rounded-2xl bg-white/5 text-white/40 hover:bg-white/10">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Superset editor */}
      <AnimatePresence>
        {editingSuperset && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-[#fcd12a]/6 border border-[#fcd12a]/15 rounded-3xl p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-[#fcd12a]/80 uppercase tracking-wider">Assegna superset</p>
              <p className="text-xs text-white/30 mt-0.5">Assegna la stessa lettera per raggruppare gli esercizi.</p>
            </div>
            <div className="space-y-2">
              {exercises.map((ex) => {
                const current = supersetEdits[ex.id] !== undefined ? supersetEdits[ex.id] : ex.notes?.match(/^[A-Z]$/i) ? ex.notes.toUpperCase() : "";
                return (
                  <div key={ex.id} className="flex items-center gap-3 bg-white/4 rounded-2xl px-3 py-2.5">
                    <span className="flex-1 text-sm text-white/70 truncate">{ex.name}</span>
                    <div className="flex gap-1">
                      {["", "A", "B", "C", "D", "E"].map(letter => (
                        <button key={letter}
                          onClick={() => setSupersetEdits(prev => ({ ...prev, [ex.id]: letter }))}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                            current === letter
                              ? "bg-[#fcd12a] text-black"
                              : "bg-white/8 text-white/40 hover:bg-white/15"
                          }`}>
                          {letter || "—"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session done banner */}
      {isSessionDone && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-400 font-medium">Sessione completata questa settimana — sola lettura.</p>
        </div>
      )}

      {/* Exercise groups */}
      {groups.map((group, gi) =>
        group.type === "superset" ? (
          <SupersetGroup
            key={group.key}
            supersetKey={group.key}
            exercises={group.exercises}
            logs={logs}
            onLogSaved={handleLogSaved}
            onLogDeleted={handleLogDeleted}
            readOnly={isSessionDone}
            index={gi}
          />
        ) : (
          <ExerciseCard
            key={group.exercise.id}
            exercise={group.exercise}
            logs={logs.filter(l => l.exercise_id === group.exercise.id)}
            onLogSaved={handleLogSaved}
            onLogDeleted={handleLogDeleted}
            readOnly={isSessionDone}
            index={gi}
          />
        )
      )}

      {/* Session history */}
      <DaySessionHistory
        sessions={sessions.filter(s => s.day_label === dayLabel)}
        dayLabel={dayLabel}
        logs={logs}
        onSessionDeleted={handleSessionDeleted}
        onSessionUpdated={handleSessionUpdated}
        onLogUpdated={handleLogUpdated}
      />

      {/* Session logger — bottom sheet */}
      <AnimatePresence>
        {showSessionLogger && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSessionLogger(false)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1c1f28] border-t border-white/10 rounded-t-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-1 shrink-0" />
              <div className="px-6 py-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-green-500/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="font-heading font-bold text-lg text-white">Sessione Completata! 💪</h2>
                    <p className="text-xs text-white/40">Compila i dati della sessione</p>
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB Termina Sessione */}
      {!isSessionDone && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center z-40 px-4 lg:bottom-6">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => setShowSessionLogger(true)}
            className="flex items-center gap-2 bg-[#fcd12a] text-black font-bold px-7 py-3.5 rounded-full shadow-xl shadow-[#fcd12a]/25 hover:bg-[#fcd12a]/90 active:scale-95 transition-all text-sm"
          >
            <Flag className="w-4 h-4" />
            Termina Sessione
          </motion.button>
        </div>
      )}
    </div>
  );
}