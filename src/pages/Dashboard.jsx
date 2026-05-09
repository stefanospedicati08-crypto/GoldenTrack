import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ClipboardList, X, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeBanner from "../components/WelcomeBanner";
import WaterTrackerWidget from "../components/WaterTrackerWidget";
import PullToRefresh from "../components/PullToRefresh";
import WeeklyMonthProgress from "../components/WeeklyMonthProgress";
import ProfileCompleteModal from "../components/ProfileCompleteModal";
import RichiestaSchedaForm from "../components/RichiestaSchedaForm";
import DashboardCustomizer from "../components/DashboardCustomizer";
import { FileText } from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [watermarkUrl, setWatermarkUrl] = useState(null);
  const [widgets, setWidgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dashboard_widgets") || '{"water":true,"meal":true}'); } catch { return { water: true, meal: true }; }
  });
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      setUser(u);
      if (!u.birth_year) setShowProfileModal(true);
      const [p, sess, notifs, gs] = await Promise.all([
        base44.entities.WorkoutPlan.filter({ assigned_to: u.email, status: "active" }),
        base44.entities.WorkoutSession.filter({ created_by: u.email }, "-date", 100),
        base44.entities.Notification.filter({ user_email: u.email, read: false }),
        base44.entities.GymSettings.list(),
      ]);
      setPlans(p);
      setSessions(sess);
      setNotifications(notifs);
      if (gs[0]?.watermark_url) setWatermarkUrl(gs[0].watermark_url);
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

  const activePlan = plans[0];

  function handleWidgetsChange(newWidgets) {
    setWidgets(newWidgets);
    localStorage.setItem("dashboard_widgets", JSON.stringify(newWidgets));
  }

  async function handleRefresh() {
    setLoading(true);
    const u = await base44.auth.me();
    const [p, sess, notifs, gs] = await Promise.all([
      base44.entities.WorkoutPlan.filter({ assigned_to: u.email, status: "active" }),
      base44.entities.WorkoutSession.filter({ created_by: u.email }, "-date", 100),
      base44.entities.Notification.filter({ user_email: u.email, read: false }),
      base44.entities.GymSettings.list(),
    ]);
    setPlans(p);
    setSessions(sess);
    setNotifications(notifs);
    if (gs[0]?.watermark_url) setWatermarkUrl(gs[0].watermark_url);
    setLoading(false);
  }

  async function dismissNotification(id) {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-8">
      {showProfileModal && (
        <ProfileCompleteModal user={user} onComplete={() => setShowProfileModal(false)} />
      )}

      <div className="relative">
        <WelcomeBanner
          userName={user?.first_name || user?.full_name?.split(" ")[0] || "Atleta"}
          hasActivePlan={plans.length > 0}
          planId={activePlan?.id}
          watermarkUrl={watermarkUrl}
          user={user}
        />
        <div className="absolute top-3 right-3 z-10">
          <DashboardCustomizer widgets={widgets} onChange={handleWidgetsChange} />
        </div>
      </div>

      {/* Notifiche */}
      <AnimatePresence>
        {notifications.map(notif => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3"
          >
            <ClipboardList className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-foreground">{notif.message}</p>
            <button onClick={() => dismissNotification(notif.id)} className="p-1 rounded-lg hover:bg-accent/10">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Scheda Corrente */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => activePlan && navigate(`/schede/${activePlan.id}`)}
        className={`bg-card rounded-2xl border border-border p-5 ${activePlan ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Scheda Corrente</p>
            <p className="text-xl font-heading font-bold mt-1">{activePlan ? activePlan.title : "—"}</p>
            {activePlan?.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{activePlan.description}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-primary bg-primary/10">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>
      </motion.div>

      {/* Piano Alimentare */}
      {widgets.meal && user?.meal_plan_url && (
        <a href={user.meal_plan_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-card rounded-2xl border border-border p-4 hover:border-accent/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Piano Alimentare</p>
            <p className="font-semibold">Visualizza il tuo piano</p>
          </div>
        </a>
      )}

      {/* Progresso mensile (4 settimane) */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <WeeklyMonthProgress sessions={sessions} />
      </div>

      {/* Acqua */}
      {widgets.water && <WaterTrackerWidget />}
    </div>
    </PullToRefresh>
  );
}