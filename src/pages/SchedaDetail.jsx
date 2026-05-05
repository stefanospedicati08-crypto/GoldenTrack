import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";
import ExerciseCard from "../components/ExerciseCard";
import DaySessionHistory from "../components/DaySessionHistory";
import SessionDayLogger from "../components/SessionDayLogger";

export default function SchedaDetail() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, exs, lgs, sess] = await Promise.all([
        base44.entities.WorkoutPlan.get(id),
        base44.entities.Exercise.filter({ plan_id: id }, "order_index"),
        base44.entities.WorkoutLog.filter({ plan_id: id }, "-date", 500),
        base44.entities.WorkoutSession.filter({ plan_id: id }, "-date", 100),
      ]);
      setPlan(p);
      setExercises(exs);
      setLogs(lgs);
      setSessions(sess);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Group exercises by day
  const grouped = {};
  exercises.forEach(ex => {
    const day = ex.day_label || "Generale";
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(ex);
  });

  const today = new Date().toISOString().split("T")[0];

  const handleLogSaved = (newLog) => {
    setLogs(prev => [newLog, ...prev]);
  };

  const handleSessionSaved = (session) => {
    setSessions(prev => {
      const exists = prev.find(s => s.id === session.id);
      if (exists) return prev.map(s => s.id === session.id ? session : s);
      return [session, ...prev];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/schede" className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold">{plan?.title}</h1>
          {plan?.description && <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>}
        </div>
      </div>

      {/* Note admin sulla scheda */}
      {plan?.notes && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3"
        >
          <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Note del Trainer</p>
            <p className="text-sm text-foreground">{plan.notes}</p>
          </div>
        </motion.div>
      )}

      {Object.entries(grouped).map(([day, exs], gi) => (
        <motion.div
          key={day}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.1 }}
          className="space-y-3"
        >
          <h2 className="font-heading font-semibold text-lg text-primary">{day}</h2>
          <div className="space-y-3">
            {exs.map((ex, i) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                logs={logs.filter(l => l.exercise_id === ex.id)}
                onLogSaved={handleLogSaved}
                index={i}
              />
            ))}
          </div>

          {/* Logger sessione del giorno */}
          <SessionDayLogger
            planId={id}
            dayLabel={day}
            date={today}
            existingSession={sessions.find(s => s.day_label === day && s.date === today)}
            onSaved={handleSessionSaved}
          />

          {/* Storico sessioni per questo giorno */}
          <DaySessionHistory
            sessions={sessions.filter(s => s.day_label === day && s.date !== today)}
            dayLabel={day}
            logs={logs}
          />
        </motion.div>
      ))}
    </div>
  );
}