import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ClipboardList, ArrowRight, CheckCircle, Archive } from "lucide-react";
import { motion } from "framer-motion";

export default function Schede() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

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
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}