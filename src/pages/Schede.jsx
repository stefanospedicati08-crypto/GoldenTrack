import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ClipboardList, ArrowRight, CheckCircle, Archive, MoreVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Schede() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activateModal, setActivateModal] = useState(null); // plan id
  const [activateChoice, setActivateChoice] = useState(null); // true=yes, false=no
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await base44.auth.me();
      const p = await base44.entities.WorkoutPlan.filter({ assigned_to: user.email }, "-created_date");
      setPlans(p);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  async function handleSetActive(planId) {
    setSaving(true);
    // deactivate all other plans for this user
    const otherActives = plans.filter(p => p.status === "active" && p.id !== planId);
    await Promise.all(otherActives.map(p => base44.entities.WorkoutPlan.update(p.id, { status: "archived" })));
    await base44.entities.WorkoutPlan.update(planId, { status: "active" });
    setPlans(prev => prev.map(p => ({
      ...p,
      status: p.id === planId ? "active" : p.status === "active" ? "archived" : p.status
    })));
    setSaving(false);
    setActivateModal(null);
    setActivateChoice(null);
    toast.success("Scheda impostata come attiva!");
  }

  const statusConfig = {
    active: { label: "Attiva", color: "bg-accent/10 text-accent", icon: CheckCircle },
    completed: { label: "Completata", color: "bg-chart-3/10 text-chart-3", icon: CheckCircle },
    archived: { label: "Archiviata", color: "bg-muted text-muted-foreground", icon: Archive },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Le Tue Schede</h1>
        <p className="text-muted-foreground mt-1">Tutti i tuoi programmi di allenamento</p>
      </div>

      {plans.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <ClipboardList className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Nessuna scheda disponibile</p>
          <p className="text-sm text-muted-foreground/70 mt-2">Il tuo trainer ti assegnerà presto un programma</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan, i) => {
            const cfg = statusConfig[plan.status] || statusConfig.active;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                <Link
                  to={`/schede/${plan.id}`}
                  className="flex items-center gap-4 bg-card rounded-2xl border border-border p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-lg">{plan.title}</h3>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{plan.description}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mr-6" />
                </Link>
                {/* 3-dot menu */}
                <button
                  onClick={e => { e.preventDefault(); setActivateModal(plan.id); setActivateChoice(null); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-secondary transition-colors z-10"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Activate modal */}
      <AnimatePresence>
        {activateModal && (() => {
          const plan = plans.find(p => p.id === activateModal);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-lg">Impostare come attiva?</h3>
                  <button onClick={() => setActivateModal(null)} className="p-2 rounded-xl hover:bg-secondary">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">Vuoi impostare <strong>{plan?.title}</strong> come scheda attiva? Le altre schede attive verranno archiviate.</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
                    <input type="radio" name="activate" checked={activateChoice === true} onChange={() => setActivateChoice(true)} className="w-4 h-4" />
                    <span className="text-sm font-medium">Sì, imposta come attiva</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
                    <input type="radio" name="activate" checked={activateChoice === false} onChange={() => setActivateChoice(false)} className="w-4 h-4" />
                    <span className="text-sm font-medium">No, annulla</span>
                  </label>
                </div>
                <Button
                  onClick={() => activateChoice === true ? handleSetActive(activateModal) : setActivateModal(null)}
                  disabled={activateChoice === null || saving}
                  className="w-full rounded-xl h-10"
                >
                  {saving ? "Salvataggio..." : "Conferma"}
                </Button>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}