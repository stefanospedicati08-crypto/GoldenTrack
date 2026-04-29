import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Dumbbell, TrendingUp, ClipboardList, ArrowRight, Flame } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      setUser(u);
      const [p, l, w] = await Promise.all([
        base44.entities.WorkoutPlan.filter({ assigned_to: u.email, status: "active" }),
        base44.entities.WorkoutLog.filter({ created_by: u.email }, "-date", 10),
        base44.entities.BodyWeight.filter({ created_by: u.email }, "-date", 5),
      ]);
      setPlans(p);
      setLogs(l);
      setWeights(w);
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

  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.date === today);
  const lastWeight = weights[0];

  const stats = [
    {
      label: "Schede Attive",
      value: plans.length,
      icon: ClipboardList,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Esercizi Oggi",
      value: todayLogs.length,
      icon: Flame,
      color: "text-accent bg-accent/10",
    },
    {
      label: "Ultimo Peso",
      value: lastWeight ? `${lastWeight.weight_kg} kg` : "—",
      icon: TrendingUp,
      color: "text-chart-3 bg-chart-3/10",
    },
  ];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-heading text-3xl font-bold">
          Ciao, {user?.full_name?.split(" ")[0] || "Atleta"} 💪
        </h1>
        <p className="text-muted-foreground mt-1">Ecco il tuo riepilogo di oggi</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="bg-card rounded-2xl border border-border p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-heading font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Le Tue Schede</h2>
        {plans.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <Dumbbell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nessuna scheda attiva al momento</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Il tuo trainer ti assegnerà presto una scheda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <Link
                  to={`/schede/${plan.id}`}
                  className="block bg-card rounded-2xl border border-border p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading font-semibold text-lg">{plan.title}</h3>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}