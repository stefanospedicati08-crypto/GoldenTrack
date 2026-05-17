import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, FileText, Dumbbell, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function SchedaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, exs, sess] = await Promise.all([
      base44.entities.WorkoutPlan.get(id),
      base44.entities.Exercise.filter({ plan_id: id }, "order_index"),
      base44.entities.WorkoutSession.filter({ plan_id: id }, "-date", 100)]
      );
      setPlan(p);
      setExercises(exs);
      setSessions(sess);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>);

  }

  const grouped = {};
  exercises.forEach((ex) => {
    const day = ex.day_label || "Generale";
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(ex);
  });

  const days = Object.entries(grouped);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link to="/schede" className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold">{plan?.title}</h1>
          {plan?.description && <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>}
        </div>
      </div>

      {plan?.notes &&
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3">
          <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Note del Trainer</p>
            <p className="text-sm text-foreground">{plan.notes}</p>
          </div>
        </motion.div>
      }

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {days.map(([day, exs], gi) => {
          const recentSessions = sessions.filter((s) => s.day_label === day && s.date >= cutoff);
          const lastSession = sessions.filter((s) => s.day_label === day).sort((a, b) => b.date.localeCompare(a.date))[0];
          return (
            <motion.button
              key={day}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.08 }}
              onClick={() => navigate(`/schede/${id}/giorno/${encodeURIComponent(day)}`)}
              className="bg-card border border-border p-5 text-left hover:border-primary/50 hover:shadow-lg transition-all active:scale-95 group rounded-[50px]">
              
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Dumbbell className="w-6 h-6 text-primary" />
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              </div>
              <h2 className="font-heading font-bold text-lg text-[hsl(var(--primary))]">{day}</h2>
              <p className="text-sm text-muted-foreground mt-1">{exs.length} esercizi</p>
              {lastSession &&
              <p className="text-xs text-muted-foreground/60 mt-2">
                  Ultima sessione: {new Date(lastSession.date).toLocaleDateString("it-IT")}
                </p>
              }
              {recentSessions.length > 0 &&
              <div className="mt-3 flex gap-1">
                  {Array.from({ length: Math.min(recentSessions.length, 8) }).map((_, i) =>
                <div key={i} className="w-2 h-2 rounded-full bg-primary/60" />
                )}
                </div>
              }
            </motion.button>);

        })}
      </div>
    </div>);

}