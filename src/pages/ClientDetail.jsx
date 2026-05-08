import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ClipboardList, Weight, Camera, Dumbbell, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import moment from "moment";

export default function ClientDetail() {
  const { email } = useParams();
  const clientEmail = decodeURIComponent(email);
  const [clientUser, setClientUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [weights, setWeights] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState("plans");

  useEffect(() => {
    async function load() {
      const [allUsers, clientPlans, clientWeights, clientSessions] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.WorkoutPlan.filter({ assigned_to: clientEmail }, "-created_date"),
        base44.entities.BodyWeight.filter({ created_by: clientEmail }, "-date", 100),
        base44.entities.WorkoutSession.filter({ created_by: clientEmail }, "-date", 100),
      ]);
      const u = allUsers.find(u => u.email === clientEmail);
      setClientUser(u || { email: clientEmail });
      setPlans(clientPlans);
      setWeights(clientWeights);
      setSessions(clientSessions);

      if (clientPlans.length > 0) {
        const activePlan = clientPlans.find(p => p.status === "active") || clientPlans[0];
        const planLogs = await base44.entities.WorkoutLog.filter({ plan_id: activePlan.id }, "-date", 500);
        setLogs(planLogs);
        setExpandedPlan(activePlan.id);
      }
      setLoading(false);
    }
    load();
  }, [clientEmail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const sortedWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sortedWeights.slice(-30).map(w => ({
    date: moment(w.date).format("DD/MM"),
    kg: w.weight_kg,
  }));

  const latest = weights[0]?.weight_kg;
  const previous = weights[1]?.weight_kg;
  const diff = latest && previous ? (latest - previous).toFixed(1) : null;
  const photos = weights.filter(w => w.photo_url);

  const tabs = [
    { id: "plans", label: "Schede", icon: ClipboardList },
    { id: "weight", label: "Peso", icon: Weight },
    { id: "photos", label: "Foto", icon: Camera },
    { id: "sessions", label: "Sessioni", icon: Dumbbell },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/clienti" className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
            {clientUser?.full_name?.[0] || clientEmail?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">{clientUser?.full_name || clientEmail}</h1>
            <p className="text-sm text-muted-foreground">{clientEmail}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Schede */}
      {activeTab === "plans" && (
        <div className="space-y-3">
          {plans.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <p className="text-muted-foreground">Nessuna scheda assegnata</p>
            </div>
          ) : (
            plans.map(plan => (
              <div key={plan.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{plan.title}</p>
                    <p className="text-sm text-muted-foreground">{plan.status} · {new Date(plan.created_date).toLocaleDateString("it-IT")}</p>
                  </div>
                  {expandedPlan === plan.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {expandedPlan === plan.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2">
                        {/* Sessions for this plan */}
                        {sessions.filter(s => s.plan_id === plan.id).slice(0, 10).map(s => (
                          <div key={s.id} className="bg-secondary/40 rounded-xl p-3 text-sm">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <p className="font-medium">{s.day_label} — {moment(s.date).format("DD/MM/YY")}</p>
                              <div className="flex gap-2 text-xs flex-wrap">
                                {s.rpe && <span className="bg-chart-3/10 text-chart-3 px-2 py-0.5 rounded-lg">RPE {s.rpe}</span>}
                                {s.heart_rate_avg && <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-lg">{s.heart_rate_avg} bpm</span>}
                                {s.training_minutes && <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-lg">{s.training_minutes} min</span>}
                              </div>
                            </div>
                            {s.athlete_note && <p className="text-muted-foreground mt-1 italic text-xs">"{s.athlete_note}"</p>}
                          </div>
                        ))}
                        {sessions.filter(s => s.plan_id === plan.id).length === 0 && (
                          <p className="text-sm text-muted-foreground">Nessuna sessione registrata</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      )}

      {/* Peso */}
      {activeTab === "weight" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-sm text-muted-foreground">Peso Attuale</p>
              <p className="text-3xl font-heading font-bold mt-1">{latest || "—"}</p>
              <p className="text-xs text-muted-foreground">kg</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-sm text-muted-foreground">Variazione</p>
              <div className="flex items-center gap-2 mt-1">
                {diff !== null ? (
                  <>
                    {Number(diff) > 0 ? <TrendingUp className="w-5 h-5 text-chart-3" /> : Number(diff) < 0 ? <TrendingDown className="w-5 h-5 text-accent" /> : <Minus className="w-5 h-5 text-muted-foreground" />}
                    <span className="text-2xl font-heading font-bold">{Number(diff) > 0 ? "+" : ""}{diff}</span>
                  </>
                ) : <span className="text-2xl font-heading font-bold">—</span>}
              </div>
              <p className="text-xs text-muted-foreground">kg dall'ultima</p>
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading font-semibold mb-4">Andamento Peso</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="weightGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit=" kg" domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 13 }} />
                  <Area type="monotone" dataKey="kg" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#weightGrad2)" dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2">
            {weights.slice(0, 20).map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 bg-card rounded-xl border border-border p-4">
                <div className="flex-1">
                  <p className="font-semibold">{w.weight_kg} kg</p>
                  <p className="text-sm text-muted-foreground">{moment(w.date).format("DD MMMM YYYY")}</p>
                  {w.notes && <p className="text-xs text-muted-foreground italic">{w.notes}</p>}
                </div>
                {w.photo_url && (
                  <button onClick={() => setExpandedPhoto(w.photo_url)}>
                    <img src={w.photo_url} alt="peso" className="w-12 h-12 rounded-xl object-cover border border-border" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Foto */}
      {activeTab === "photos" && (
        <div className="space-y-4">
          {photos.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-10 text-center">
              <Camera className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">Nessuna foto caricata</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((w, i) => (
                <motion.button
                  key={w.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setExpandedPhoto(w.photo_url)}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-border"
                >
                  <img src={w.photo_url} alt="progresso" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1.5">
                    <p className="text-xs text-white font-medium">{moment(w.date).format("DD/MM/YY")}</p>
                    <p className="text-xs text-white/70">{w.weight_kg} kg</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sessioni */}
      {activeTab === "sessions" && (
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-10 text-center">
              <Dumbbell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">Nessuna sessione registrata</p>
            </div>
          ) : (
            sessions.slice(0, 30).map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="bg-card rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-semibold">{s.day_label} — {moment(s.date).format("DD MMMM YYYY")}</p>
                  <div className="flex gap-2 flex-wrap">
                    {s.rpe && <span className="text-xs bg-chart-3/10 text-chart-3 px-2.5 py-1 rounded-xl font-medium">RPE {s.rpe}/10</span>}
                    {s.heart_rate_avg && <span className="text-xs bg-destructive/10 text-destructive px-2.5 py-1 rounded-xl">{s.heart_rate_avg} bpm</span>}
                    {s.calories && <span className="text-xs bg-orange-500/10 text-orange-500 px-2.5 py-1 rounded-xl">{s.calories} kcal</span>}
                    {s.training_minutes && <span className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-xl">{s.training_minutes} min</span>}
                  </div>
                </div>
                {s.athlete_note && <p className="text-sm text-muted-foreground italic">"{s.athlete_note}"</p>}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Photo lightbox */}
      <AnimatePresence>
        {expandedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setExpandedPhoto(null)}>
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={expandedPhoto}
              alt="progresso"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}