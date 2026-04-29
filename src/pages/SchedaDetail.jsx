import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import ExerciseCard from "../components/ExerciseCard";

export default function SchedaDetail() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, exs, lgs] = await Promise.all([
        base44.entities.WorkoutPlan.get(id),
        base44.entities.Exercise.filter({ plan_id: id }, "order_index"),
        base44.entities.WorkoutLog.filter({ plan_id: id }, "-date", 200),
      ]);
      setPlan(p);
      setExercises(exs);
      setLogs(lgs);
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

  const handleLogSaved = (newLog) => {
    setLogs(prev => [newLog, ...prev]);
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
        </motion.div>
      ))}
    </div>
  );
}