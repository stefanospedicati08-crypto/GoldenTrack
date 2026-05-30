import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ClipboardList, Weight, Camera, Dumbbell, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";
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
  const [allLogsLoaded, setAllLogsLoaded] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

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

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
    </div>
  );

  const sortedWeights = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sortedWeights.slice(-30).map(w => ({ date: moment(w.date).format("DD/MM"), kg: w.weight_kg }));
  const latest = weights[0]?.weight_kg;
  const previous = weights[1]?.weight_kg;
  const diff = latest && previous ? (latest - previous).toFixed(1) : null;
  const photos = weights.filter(w => w.photo_url);

  async function loadAllLogs() {
    if (allLogsLoaded) return;
    setLoadingLogs(true);
    const allLogs = await Promise.all(plans.map(p => base44.entities.WorkoutLog.filter({ plan_id: p.id }, "-date", 1000)));
    setLogs(allLogs.flat());
    setAllLogsLoaded(true);
    setLoadingLogs(false);
  }

  const tabs = [
    { id: "plans", label: "Schede", icon: ClipboardList },
    { id: "weight", label: "Peso", icon: Weight },
    { id: "photos", label: "Foto", icon: Camera },
    { id: "sessions", label: "Sessioni", icon: Dumbbell },
    { id: "training", label: "Allenamento", icon: BarChart2 },
  ];

  const initials = clientUser?.full_name?.[0] || clientEmail?.[0]?.toUpperCase();

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <Link to="/clienti" className="p-2 rounded-xl hover:bg-white/8 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Link>
        <div className="w-12 h-12 rounded-full bg-[#fcd12a]/15 flex items-center justify-center text-lg font-bold text-[#fcd12a] shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-white">{clientUser?.full_name || clientEmail}</h1>
          <p className="text-sm text-white/40">{clientEmail}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); if (t.id === "training") loadAllLogs(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
              activeTab === t.id
                ? "bg-[#fcd12a] text-black font-bold"
                : "bg-white/5 border border-white/8 text-white/50 hover:text-white"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Schede */}
      {activeTab === "plans" && (
        <div className="space-y-3">
          {plans.length === 0 ? (
            <div className="bg-white/4 border border-white/8 rounded-2xl p-8 text-center">
              <p className="text-white/35 text-sm">Nessuna scheda assegnata</p>
            </div>
          ) : (
            plans.map(plan => (
              <div key={plan.id} className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-white">{plan.title}</p>
                    <p className="text-sm text-white/40">{plan.status} · {new Date(plan.created_date).toLocaleDateString("it-IT")}</p>
                  </div>
                  {expandedPlan === plan.id ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                </button>
                <AnimatePresence>
                  {expandedPlan === plan.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="border-t border-white/6 px-4 pb-4 pt-3 space-y-2">
                        {sessions.filter(s => s.plan_id === plan.id).slice(0, 10).map(s => (
                          <div key={s.id} className="bg-white/4 rounded-xl p-3 text-sm">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <p className="font-medium text-white">{s.day_label} — {moment(s.date).format("DD/MM/YY")}</p>
                              <div className="flex gap-1.5 text-xs flex-wrap">
                                {s.rpe && <span className="bg-orange-400/10 text-orange-400 px-2 py-0.5 rounded-lg">RPE {s.rpe}</span>}
                                {s.heart_rate_avg && <span className="bg-red-400/10 text-red-400 px-2 py-0.5 rounded-lg">{s.heart_rate_avg} bpm</span>}
                                {s.training_minutes && <span className="bg-white/8 text-white/50 px-2 py-0.5 rounded-lg">{s.training_minutes} min</span>}
                              </div>
                            </div>
                            {s.athlete_note && <p className="text-white/35 mt-1 italic text-xs">"{s.athlete_note}"</p>}
                          </div>
                        ))}
                        {sessions.filter(s => s.plan_id === plan.id).length === 0 && (
                          <p className="text-sm text-white/30">Nessuna sessione registrata</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <p className="text-xs text-white/40">Peso Attuale</p>
              <p className="text-3xl font-heading font-bold text-[#fcd12a] mt-1">{latest || "—"}</p>
              <p className="text-xs text-white/30">kg</p>
            </div>
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <p className="text-xs text-white/40">Variazione</p>
              <div className="flex items-center gap-2 mt-1">
                {diff !== null ? (
                  <>
                    {Number(diff) > 0 ? <TrendingUp className="w-5 h-5 text-orange-400" /> : Number(diff) < 0 ? <TrendingDown className="w-5 h-5 text-green-400" /> : <Minus className="w-5 h-5 text-white/40" />}
                    <span className="text-2xl font-heading font-bold text-white">{Number(diff) > 0 ? "+" : ""}{diff}</span>
                  </>
                ) : <span className="text-2xl font-heading font-bold text-white">—</span>}
              </div>
              <p className="text-xs text-white/30">kg dall'ultima</p>
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <h3 className="font-heading font-semibold text-white mb-4 text-sm">Andamento Peso</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fcd12a" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#fcd12a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }} unit=" kg" domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} width={52} />
                  <Tooltip contentStyle={{ background: "#1c1f28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: 12, color: "#fff" }} />
                  <Area type="monotone" dataKey="kg" stroke="#fcd12a" strokeWidth={2.5} fill="url(#wg2)" dot={false} activeDot={{ r: 5, fill: "#fcd12a", stroke: "#1c1f28", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2">
            {weights.slice(0, 20).map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 bg-white/4 border border-white/8 rounded-2xl p-4">
                <div className="flex-1">
                  <p className="font-semibold text-white">{w.weight_kg} kg</p>
                  <p className="text-sm text-white/40">{moment(w.date).format("DD MMMM YYYY")}</p>
                  {w.notes && <p className="text-xs text-white/30 italic">{w.notes}</p>}
                </div>
                {w.photo_url && (
                  <button onClick={() => setExpandedPhoto(w.photo_url)}>
                    <img src={w.photo_url} alt="peso" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
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
            <div className="bg-white/4 border border-white/8 rounded-2xl p-10 text-center">
              <Camera className="w-12 h-12 text-white/15 mx-auto mb-3" />
              <p className="text-white/35 text-sm">Nessuna foto caricata</p>
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
                  className="relative aspect-square rounded-2xl overflow-hidden border border-white/10"
                >
                  <img src={w.photo_url} alt="progresso" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5">
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
            <div className="bg-white/4 border border-white/8 rounded-2xl p-10 text-center">
              <Dumbbell className="w-12 h-12 text-white/15 mx-auto mb-3" />
              <p className="text-white/35 text-sm">Nessuna sessione registrata</p>
            </div>
          ) : (
            sessions.slice(0, 50).map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="bg-white/4 border border-white/8 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-semibold text-white text-sm">{s.day_label} — {moment(s.date).format("DD MMMM YYYY")}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {s.rpe && <span className="text-xs bg-orange-400/10 text-orange-400 px-2 py-0.5 rounded-xl font-medium">RPE {s.rpe}/10</span>}
                    {s.heart_rate_avg && <span className="text-xs bg-red-400/10 text-red-400 px-2 py-0.5 rounded-xl">{s.heart_rate_avg} bpm</span>}
                    {s.calories && <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-xl">{s.calories} kcal</span>}
                    {s.training_minutes && <span className="text-xs bg-white/8 text-white/50 px-2 py-0.5 rounded-xl">{s.training_minutes} min</span>}
                  </div>
                </div>
                {s.athlete_note && <p className="text-sm text-white/35 italic">"{s.athlete_note}"</p>}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Allenamento */}
      {activeTab === "training" && (
        <div className="space-y-4">
          {loadingLogs ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white/4 border border-white/8 rounded-2xl p-10 text-center">
              <BarChart2 className="w-12 h-12 text-white/15 mx-auto mb-3" />
              <p className="text-white/35 text-sm">Nessun dato di allenamento registrato</p>
            </div>
          ) : (() => {
            const byDate = {};
            logs.forEach(l => { if (!byDate[l.date]) byDate[l.date] = []; byDate[l.date].push(l); });
            return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).slice(0, 40).map(([date, dayLogs], i) => {
              const byEx = {};
              dayLogs.forEach(l => { if (!byEx[l.exercise_name]) byEx[l.exercise_name] = []; byEx[l.exercise_name].push(l); });
              return (
                <motion.div key={date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/3 border-b border-white/6">
                    <BarChart2 className="w-4 h-4 text-[#fcd12a]" />
                    <p className="font-semibold text-sm text-white">{moment(date).format("dddd DD MMMM YYYY")}</p>
                    <span className="ml-auto text-xs text-white/35">{Object.keys(byEx).length} esercizi</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {Object.entries(byEx).map(([exName, exLogs]) => {
                      const maxWeight = Math.max(...exLogs.map(l => l.weight_kg || 0));
                      const sortedSets = [...exLogs].sort((a, b) => a.set_number - b.set_number);
                      return (
                        <div key={exName} className="px-4 py-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white">{exName}</p>
                            {maxWeight > 0 && <span className="text-xs font-bold text-[#fcd12a]">{maxWeight} kg max</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {sortedSets.map(l => (
                              <span key={l.id} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${l.is_warmup ? "bg-orange-400/10 text-orange-400" : "bg-white/8 text-white/60"}`}>
                                {l.is_warmup ? "W/U" : `S${l.set_number}`} · {l.reps_done || "—"} rep{l.weight_kg ? ` · ${l.weight_kg}kg` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            });
          })()}
        </div>
      )}

      {/* Photo lightbox */}
      <AnimatePresence>
        {expandedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setExpandedPhoto(null)}>
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