import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, FileText, Dumbbell, ChevronRight, Flame, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import moment from "moment";
import "moment/locale/it";
moment.locale("it");

export default function SchedaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = base44.entities.WorkoutSession.subscribe((event) => {
      if (event.type === "delete") setSessions(prev => prev.filter(s => s.id !== event.id));
      else if (event.type === "create" && event.data) setSessions(prev => [event.data, ...prev]);
      else if (event.type === "update" && event.data) setSessions(prev => prev.map(s => s.id === event.id ? event.data : s));
    });
    return unsub;
  }, []);

  useEffect(() => {
    async function load() {
      const [p, exs, sess] = await Promise.all([
        base44.entities.WorkoutPlan.get(id),
        base44.entities.Exercise.filter({ plan_id: id }, "order_index"),
        base44.entities.WorkoutSession.filter({ plan_id: id }, "-date", 100),
      ]);
      setPlan(p); setExercises(exs); setSessions(sess); setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
    </div>
  );

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
  const today = new Date().toISOString().split("T")[0];

  // Total sessions this month
  const monthSessions = sessions.filter(s => s.date >= cutoff).length;

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <Link to="/schede" className="w-9 h-9 rounded-2xl bg-white/6 border border-white/8 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4 text-white/70" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-xl font-bold text-white truncate">{plan?.title}</h1>
          {plan?.description && <p className="text-xs text-white/35 mt-0.5 truncate">{plan.description}</p>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/4 border border-white/7 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#fcd12a]/15 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-[#fcd12a]" />
          </div>
          <div>
            <p className="text-lg font-heading font-bold text-white leading-none">{monthSessions}</p>
            <p className="text-[11px] text-white/30 mt-0.5">sessioni (30gg)</p>
          </div>
        </div>
        <div className="bg-white/4 border border-white/7 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-lg font-heading font-bold text-white leading-none">{days.length}</p>
            <p className="text-[11px] text-white/30 mt-0.5">giorni scheda</p>
          </div>
        </div>
      </div>

      {/* Trainer notes */}
      {plan?.notes && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-[#fcd12a]/7 border border-[#fcd12a]/15 rounded-2xl px-4 py-3">
          <FileText className="w-4 h-4 text-[#fcd12a]/70 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-semibold text-[#fcd12a]/70 uppercase tracking-wider mb-1">Note del Trainer</p>
            <p className="text-sm text-white/70 leading-relaxed">{plan.notes}</p>
          </div>
        </motion.div>
      )}

      {/* Day cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {days.map(([day, exs], gi) => {
          const daySessions = sessions.filter(s => s.day_label === day);
          const recentSessions = daySessions.filter(s => s.date >= cutoff);
          const lastSession = daySessions.sort((a, b) => b.date.localeCompare(a.date))[0];
          const doneToday = daySessions.some(s => s.date === today);

          return (
            <motion.button
              key={day}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.07 }}
              onClick={() => navigate(`/schede/${id}/giorno/${encodeURIComponent(day)}`)}
              className="relative overflow-hidden bg-white/4 border border-white/8 hover:border-white/18 hover:bg-white/7 active:scale-[0.98] transition-all rounded-3xl p-4 text-left group"
            >
              {/* Done today badge */}
              {doneToday && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center">
                  <span className="text-green-400 text-xs">✓</span>
                </div>
              )}

              {/* Icon */}
              <div className="w-11 h-11 rounded-2xl bg-[#fcd12a]/10 flex items-center justify-center mb-3">
                <Dumbbell className="w-5 h-5 text-[#fcd12a]" />
              </div>

              {/* Title & meta */}
              <h2 className="font-heading font-bold text-base text-white">{day}</h2>
              <p className="text-xs text-white/35 mt-0.5">{exs.length} esercizi</p>

              {/* Exercise pills */}
              <div className="flex flex-wrap gap-1 mt-2">
                {exs.slice(0, 3).map(ex => (
                  <span key={ex.id} className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full truncate max-w-[90px]">
                    {ex.name}
                  </span>
                ))}
                {exs.length > 3 && (
                  <span className="text-[10px] text-white/25 px-1">+{exs.length - 3}</span>
                )}
              </div>

              {/* Session dots */}
              {recentSessions.length > 0 && (
                <div className="flex items-center gap-1 mt-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(recentSessions.length, 8) }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#fcd12a]/50" />
                    ))}
                  </div>
                  {lastSession && (
                    <span className="text-[10px] text-white/25 ml-1">
                      {moment(lastSession.date).fromNow()}
                    </span>
                  )}
                </div>
              )}

              <ChevronRight className="absolute right-4 bottom-4 w-4 h-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}