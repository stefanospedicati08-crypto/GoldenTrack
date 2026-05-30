import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ClipboardList, ArrowRight, CheckCircle, Archive, X, Timer, History, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import RestTimer from "../components/RestTimer";

const STATUS = {
  active:    { label: "Attiva",      dot: "bg-[#fcd12a]",   bg: "bg-[#fcd12a]/10",  text: "text-[#fcd12a]" },
  completed: { label: "Completata",  dot: "bg-green-400",   bg: "bg-green-400/10",  text: "text-green-400" },
  archived:  { label: "Archiviata",  dot: "bg-white/20",    bg: "bg-white/5",       text: "text-white/35"  },
};

function PlanCard({ plan, i, onOptions }) {
  const cfg = STATUS[plan.status] || STATUS.archived;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06 }}
      className="relative group"
    >
      <Link
        to={`/schede/${plan.id}`}
        className="flex items-center gap-4 bg-white/4 border border-white/8 hover:border-white/15 hover:bg-white/6 transition-all rounded-3xl p-4"
      >
        {/* Color strip */}
        <div className={`w-1 h-12 rounded-full ${cfg.dot} shrink-0 opacity-70`} />

        {/* Icon */}
        <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
          <ClipboardList className="w-5 h-5 text-white/50" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-white truncate">{plan.title}</p>
          {plan.description && (
            <p className="text-xs text-white/35 mt-0.5 truncate">{plan.description}</p>
          )}
        </div>

        {/* Status badge */}
        <span className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>

        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all shrink-0" />
      </Link>

      {/* Options */}
      <button
        onClick={(e) => { e.preventDefault(); onOptions(plan.id); }}
        className="absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-white/8 text-white/25 hover:text-white/60 transition-colors z-10 opacity-0 group-hover:opacity-100"
      >
        <span className="text-xs font-bold">···</span>
      </button>
    </motion.div>
  );
}

export default function Schede() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activateModal, setActivateModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await base44.auth.me();
      const p = await base44.entities.WorkoutPlan.filter({ assigned_to: user.email }, "-created_date");
      setPlans(p);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSetActive(planId) {
    setSaving(true);
    const otherActives = plans.filter((p) => p.status === "active" && p.id !== planId);
    await Promise.all(otherActives.map((p) => base44.entities.WorkoutPlan.update(p.id, { status: "archived" })));
    await base44.entities.WorkoutPlan.update(planId, { status: "active" });
    setPlans((prev) => prev.map((p) => ({
      ...p,
      status: p.id === planId ? "active" : p.status === "active" ? "archived" : p.status,
    })));
    setSaving(false);
    setActivateModal(null);
    toast.success("Scheda impostata come attiva!");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
    </div>
  );

  const activePlans = plans.filter((p) => p.status === "active");
  const archivedPlans = plans.filter((p) => p.status !== "active");

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Le mie Schede</h1>
          <p className="text-white/35 text-sm mt-0.5">Il tuo programma di allenamento</p>
        </div>
        <button onClick={() => setShowTimer(true)}
          className="flex items-center gap-2 bg-white/6 border border-white/10 hover:bg-white/10 transition-colors rounded-2xl px-3 py-2 text-sm text-white/60 hover:text-white">
          <Timer className="w-4 h-4" />
          <span className="hidden sm:inline">Timer</span>
        </button>
      </div>

      {/* Active plans */}
      {activePlans.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-4 bg-white/3 border border-white/6 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-white/20" />
          </div>
          <div className="text-center">
            <p className="text-white/50 font-medium">Nessuna scheda attiva</p>
            <p className="text-white/25 text-sm mt-1">Il tuo trainer ti assegnerà presto un programma</p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest px-1">Scheda attiva</p>
          {activePlans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} i={i} onOptions={(id) => setActivateModal(id)} />
          ))}
        </div>
      )}

      {/* Archived plans */}
      {archivedPlans.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-xs font-semibold text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors px-1"
          >
            <History className="w-3.5 h-3.5" />
            Storico schede ({archivedPlans.length})
            {showArchived ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <AnimatePresence>
            {showArchived && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="space-y-2">
                  {archivedPlans.map((plan, i) => (
                    <PlanCard key={plan.id} plan={plan} i={i} onOptions={(id) => setActivateModal(id)} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Activate modal */}
      <AnimatePresence>
        {activateModal && (() => {
          const plan = plans.find((p) => p.id === activateModal);
          return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setActivateModal(null)}>
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1c1f28] border border-white/10 rounded-t-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
                <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-2" />
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-lg text-white">Impostare come attiva?</h3>
                  <button onClick={() => setActivateModal(null)} className="p-1.5 rounded-xl hover:bg-white/8">
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>
                <p className="text-sm text-white/45">
                  Vuoi impostare <strong className="text-white">{plan?.title}</strong> come scheda attiva?
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setActivateModal(null)}
                    className="flex-1 h-11 rounded-2xl bg-white/8 text-white/60 text-sm font-medium">
                    Annulla
                  </button>
                  <button onClick={() => handleSetActive(activateModal)} disabled={saving}
                    className="flex-1 h-11 rounded-2xl bg-[#fcd12a] text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    <Zap className="w-4 h-4" />
                    {saving ? "Salvataggio..." : "Imposta attiva"}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Rest timer */}
      <AnimatePresence>
        {showTimer && <RestTimer defaultSeconds={90} onClose={() => setShowTimer(false)} />}
      </AnimatePresence>
    </div>
  );
}