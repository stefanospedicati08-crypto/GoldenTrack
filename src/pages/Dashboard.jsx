import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ClipboardList, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeBanner from "../components/WelcomeBanner";
import WeeklyMonthProgress from "../components/WeeklyMonthProgress";
import RichiestaSchedaForm from "../components/RichiestaSchedaForm";
import ProfileCompleteModal from "../components/ProfileCompleteModal";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [watermarkUrl, setWatermarkUrl] = useState(null);
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

  async function dismissNotification(id) {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div className="space-y-8">
      {showProfileModal && (
        <ProfileCompleteModal user={user} onComplete={() => setShowProfileModal(false)} />
      )}

      <WelcomeBanner
        userName={user?.full_name?.split(" ")[0] || "Atleta"}
        hasActivePlan={plans.length > 0}
        planId={activePlan?.id}
        watermarkUrl={watermarkUrl}
      />

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

      {/* Progresso mensile (4 settimane) */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <WeeklyMonthProgress sessions={sessions} />
        <RichiestaSchedaForm user={user} />
      </div>
    </div>
  );
}