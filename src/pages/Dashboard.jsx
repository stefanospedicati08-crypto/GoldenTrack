import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { ClipboardList, X, Flame, Dumbbell, ChevronRight, Bell, FileText, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WaterTrackerWidget from "../components/WaterTrackerWidget";
import PullToRefresh from "../components/PullToRefresh";
import WeeklyMonthProgress from "../components/WeeklyMonthProgress";
import ProfileCompleteModal from "../components/ProfileCompleteModal";
import RichiestaSchedaForm from "../components/RichiestaSchedaForm";
import DashboardCustomizer from "../components/DashboardCustomizer";
import SupplementsWidget from "../components/SupplementsWidget";

// ── Fade-in card wrapper ──────────────────────────────────────────
function Card({ children, className = "", delay = 0, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      onClick={onClick}
      className={`bg-white/5 border border-white/8 rounded-3xl overflow-hidden ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ── Widget section label ──────────────────────────────────────────
function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest px-1 mb-2">{children}</p>;
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [archivedPlans, setArchivedPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [planDaysCount, setPlanDaysCount] = useState(4);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [watermarkUrl, setWatermarkUrl] = useState(null);
  const [widgets, setWidgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dashboard_widgets") || '{"water":true,"meal":true}'); }
    catch { return { water: true, meal: true }; }
  });
  const navigate = useNavigate();

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
      const u = await base44.auth.me();
      setUser(u);
      if (!u.birth_year) setShowProfileModal(true);
      const [p, archived, sess, notifs, gs, supps] = await Promise.all([
        base44.entities.WorkoutPlan.filter({ assigned_to: u.email, status: "active" }),
        base44.entities.WorkoutPlan.filter({ assigned_to: u.email, status: "completed" }, "-updated_date", 5),
        base44.entities.WorkoutSession.filter({ created_by: u.email }, "-date", 100),
        base44.entities.Notification.filter({ user_email: u.email, read: false }),
        base44.entities.GymSettings.list(),
        base44.entities.Supplement.filter({ created_by: u.email, active: true }),
      ]);
      setPlans(p); setArchivedPlans(archived); setSessions(sess);
      setNotifications(notifs); setSupplements(supps);
      if (gs[0]?.watermark_url) setWatermarkUrl(gs[0].watermark_url);
      if (p[0]) {
        const exs = await base44.entities.Exercise.filter({ plan_id: p[0].id });
        const days = new Set(exs.map(e => e.day_label).filter(Boolean));
        if (days.size > 0) setPlanDaysCount(days.size);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleRefresh() {
    setLoading(true);
    const u = await base44.auth.me();
    const [p, archived, sess, notifs, gs, supps] = await Promise.all([
      base44.entities.WorkoutPlan.filter({ assigned_to: u.email, status: "active" }),
      base44.entities.WorkoutPlan.filter({ assigned_to: u.email, status: "completed" }, "-updated_date", 5),
      base44.entities.WorkoutSession.filter({ created_by: u.email }, "-date", 100),
      base44.entities.Notification.filter({ user_email: u.email, read: false }),
      base44.entities.GymSettings.list(),
      base44.entities.Supplement.filter({ created_by: u.email, active: true }),
    ]);
    setPlans(p); setArchivedPlans(archived); setSessions(sess);
    setNotifications(notifs); setSupplements(supps);
    if (gs[0]?.watermark_url) setWatermarkUrl(gs[0].watermark_url);
    setLoading(false);
  }

  async function dismissNotification(id) {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  function handleWidgetsChange(w) {
    setWidgets(w);
    localStorage.setItem("dashboard_widgets", JSON.stringify(w));
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <div className="w-10 h-10 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
        <p className="text-white/30 text-sm">Caricamento...</p>
      </div>
    );
  }

  const activePlan = plans[0];
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Buona notte" : hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  const greetingEmoji = hour < 5 ? "🌙" : hour < 12 ? "☀️" : hour < 18 ? "🌤️" : "🌙";
  const firstName = user?.first_name || user?.full_name?.split(" ")[0] || "Atleta";
  const initials = user?.full_name
    ? user.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 pb-10">
        {showProfileModal && <ProfileCompleteModal user={user} onComplete={() => setShowProfileModal(false)} />}

        {/* ── Hero ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1f28] via-[#22263a] to-[#1a1d25] border border-white/8 shadow-2xl"
          style={{ minHeight: 220 }}
        >
          {/* Decorative glow circles */}
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-[#fcd12a]/12 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#fcd12a]/8 blur-2xl pointer-events-none" />
          <div className="absolute top-8 right-8 w-20 h-20 rounded-full border border-[#fcd12a]/15 pointer-events-none" />
          <div className="absolute top-12 right-12 w-10 h-10 rounded-full border border-[#fcd12a]/20 pointer-events-none" />

          {/* Watermark */}
          {watermarkUrl && (
            <img src={watermarkUrl} alt="" className="absolute inset-0 w-full h-full object-contain opacity-[0.04] pointer-events-none select-none" />
          )}

          <div className="relative z-10 p-6 flex flex-col gap-4">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full ring-2 ring-[#fcd12a]/40 overflow-hidden bg-white/10 flex items-center justify-center text-sm font-bold text-[#fcd12a] shrink-0">
                  {user?.photo_url
                    ? <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
                    : initials}
                </div>
                <div>
                  <p className="text-white/45 text-xs font-medium">{greeting} {greetingEmoji}</p>
                  <p className="text-white font-heading font-bold text-lg leading-tight">{firstName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <div className="w-8 h-8 rounded-full bg-[#fcd12a]/15 border border-[#fcd12a]/30 flex items-center justify-center relative">
                    <Bell className="w-4 h-4 text-[#fcd12a]" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#fcd12a] rounded-full text-[9px] font-bold text-black flex items-center justify-center">
                      {notifications.length}
                    </span>
                  </div>
                )}
                <DashboardCustomizer widgets={widgets} onChange={handleWidgetsChange} />
              </div>
            </div>

            {/* Active plan badge */}
            {activePlan ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 w-fit">
                <Dumbbell className="w-3.5 h-3.5 text-[#fcd12a]" />
                <span className="text-xs text-white/60">Scheda attiva:</span>
                <span className="text-xs font-semibold text-white truncate max-w-[140px]">{activePlan.title}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 w-fit">
                <Zap className="w-3.5 h-3.5 text-white/30" />
                <span className="text-xs text-white/40">Nessuna scheda attiva</span>
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-2">
              {activePlan && (
                <Link to={`/schede/${activePlan.id}`}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 bg-[#fcd12a] text-black font-bold rounded-2xl px-5 py-2.5 text-sm shadow-lg shadow-[#fcd12a]/25 hover:bg-[#fcd12a]/90 transition-colors"
                  >
                    <Flame className="w-4 h-4" />
                    Allena ora
                  </motion.button>
                </Link>
              )}
              <Link to="/schede">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-white/8 border border-white/12 text-white font-medium rounded-2xl px-4 py-2.5 text-sm hover:bg-white/12 transition-colors"
                >
                  Vedi Schede
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
              </Link>
              {user && (
                <div className="[&_button]:!rounded-2xl [&_button]:!h-10 [&_button]:!text-sm [&_button]:!border-white/20 [&_button]:!text-white/70 [&_button]:hover:!bg-white/10">
                  <RichiestaSchedaForm user={user} compact />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Notifications ────────────────────────────────────── */}
        <AnimatePresence>
          {notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 bg-[#fcd12a]/8 border border-[#fcd12a]/20 rounded-2xl px-4 py-3"
            >
              <Bell className="w-4 h-4 text-[#fcd12a] shrink-0 mt-0.5" />
              <p className="flex-1 text-sm text-white/80">{notif.message}</p>
              <button onClick={() => dismissNotification(notif.id)} className="p-1 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── Progress mensile ──────────────────────────────────── */}
        <Card delay={0.1}>
          <div className="px-4 pt-3 pb-1">
            <SectionLabel>Progresso mensile</SectionLabel>
          </div>
          <div className="px-3 pb-4">
            <WeeklyMonthProgress sessions={sessions} compact sessionsPerWeek={planDaysCount} planStartDate={activePlan?.created_date} />
          </div>
        </Card>

        {/* ── Piano alimentare ──────────────────────────────────── */}
        {widgets.meal && user?.meal_plan_url && (
          <Card delay={0.15}>
            <a
              href={user.meal_plan_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 px-4 py-4 hover:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-2xl bg-green-500/15 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40">Nutrizione</p>
                <p className="font-semibold text-white text-sm">Piano Alimentare</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/25 shrink-0" />
            </a>
          </Card>
        )}

        {/* ── Schede archiviate ─────────────────────────────────── */}
        {archivedPlans.length > 0 && (
          <Card delay={0.2}>
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <SectionLabel>Schede completate</SectionLabel>
              <Link to="/schede" className="text-[11px] text-[#fcd12a]/70 hover:text-[#fcd12a] font-medium transition-colors mb-2">
                Vedi tutte →
              </Link>
            </div>
            <div className="px-3 pb-3 space-y-1">
              {archivedPlans.slice(0, 3).map((p) => (
                <Link
                  key={p.id}
                  to={`/schede/${p.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-green-400/60 shrink-0" />
                  <span className="text-sm text-white/70 flex-1 truncate">{p.title}</span>
                  <span className="text-[10px] text-green-400/60 font-medium">✓ Completata</span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* ── Acqua ─────────────────────────────────────────────── */}
        {widgets.water && (
          <Card delay={0.25}>
            <div className="px-4 pt-3 pb-1">
              <SectionLabel>Idratazione</SectionLabel>
            </div>
            <div className="px-4 pb-4">
              <WaterTrackerWidget />
            </div>
          </Card>
        )}

        {/* ── Integratori ──────────────────────────────────────── */}
        {widgets.supplements && supplements.length > 0 && (
          <Card delay={0.3}>
            <div className="px-4 pt-3 pb-1">
              <SectionLabel>Integratori</SectionLabel>
            </div>
            <div className="px-4 pb-4">
              <SupplementsWidget supplements={supplements} />
            </div>
          </Card>
        )}

        <p className="text-[11px] text-white/15 text-center pt-2">Golden Track</p>
      </div>
    </PullToRefresh>
  );
}