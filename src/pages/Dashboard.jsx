import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClipboardList, X, Bell, Pill } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeBanner from "../components/WelcomeBanner";
import WaterTrackerWidget from "../components/WaterTrackerWidget";
import PullToRefresh from "../components/PullToRefresh";
import WeeklyMonthProgress from "../components/WeeklyMonthProgress";
import ProfileCompleteModal from "../components/ProfileCompleteModal";
import RichiestaSchedaForm from "../components/RichiestaSchedaForm";
import DashboardCustomizer from "../components/DashboardCustomizer";
import SupplementsWidget from "../components/SupplementsWidget";
import { FileText } from "lucide-react";

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
    try {return JSON.parse(localStorage.getItem("dashboard_widgets") || '{"water":true,"meal":true}');} catch {return { water: true, meal: true };}
  });
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = base44.entities.WorkoutSession.subscribe((event) => {
      if (event.type === 'delete') {
        setSessions(prev => prev.filter(s => s.id !== event.id));
      } else if (event.type === 'create' && event.data) {
        setSessions(prev => [event.data, ...prev]);
      } else if (event.type === 'update' && event.data) {
        setSessions(prev => prev.map(s => s.id === event.id ? event.data : s));
      }
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
      base44.entities.Supplement.filter({ created_by: u.email, active: true })]
      );
      setPlans(p);
      setArchivedPlans(archived);
      setSessions(sess);
      setNotifications(notifs);
      setSupplements(supps);
      if (gs[0]?.watermark_url) setWatermarkUrl(gs[0].watermark_url);
      // Count distinct days in active plan
      if (p[0]) {
        const exs = await base44.entities.Exercise.filter({ plan_id: p[0].id });
        const days = new Set(exs.map(e => e.day_label).filter(Boolean));
        if (days.size > 0) setPlanDaysCount(days.size);
      }
      if (p[0]) {
      const exs = await base44.entities.Exercise.filter({ plan_id: p[0].id });
      const days = new Set(exs.map(e => e.day_label).filter(Boolean));
      if (days.size > 0) setPlanDaysCount(days.size);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>);

  }

  const activePlan = plans[0];

  function handleWidgetsChange(newWidgets) {
    setWidgets(newWidgets);
    localStorage.setItem("dashboard_widgets", JSON.stringify(newWidgets));
  }

  async function handleRefresh() {
    setLoading(true);
    const u = await base44.auth.me();
    const [p, archived, sess, notifs, gs, supps] = await Promise.all([
    base44.entities.WorkoutPlan.filter({ assigned_to: u.email, status: "active" }),
    base44.entities.WorkoutPlan.filter({ assigned_to: u.email, status: "completed" }, "-updated_date", 5),
    base44.entities.WorkoutSession.filter({ created_by: u.email }, "-date", 100),
    base44.entities.Notification.filter({ user_email: u.email, read: false }),
    base44.entities.GymSettings.list(),
    base44.entities.Supplement.filter({ created_by: u.email, active: true })]
    );
    setPlans(p);
    setArchivedPlans(archived);
    setSessions(sess);
    setNotifications(notifs);
    setSupplements(supps);
    if (gs[0]?.watermark_url) setWatermarkUrl(gs[0].watermark_url);
    setLoading(false);
  }

  async function dismissNotification(id) {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-3">
      {showProfileModal &&
        <ProfileCompleteModal user={user} onComplete={() => setShowProfileModal(false)} />
        }

      <div className="relative">
        <WelcomeBanner
            userName={user?.first_name || user?.full_name?.split(" ")[0] || "Atleta"}
            hasActivePlan={plans.length > 0}
            planId={activePlan?.id}
            watermarkUrl={watermarkUrl}
            user={user} />
          
        <div className="absolute top-3 right-3 z-10">
          <DashboardCustomizer widgets={widgets} onChange={handleWidgetsChange} />
        </div>
      </div>

      {/* Notifiche */}
      <AnimatePresence>
        {notifications.map((notif) =>
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3">
            
            <ClipboardList className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-foreground">{notif.message}</p>
            <button onClick={() => dismissNotification(notif.id)} className="p-1 rounded-lg hover:bg-accent/10">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
          )}
      </AnimatePresence>

      {/* Scheda Corrente + Progresso Mensile */}
      <div className="flex items-center gap-3">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => activePlan && navigate(`/schede/${activePlan.id}`)}
            className={`flex flex-col items-center justify-center shrink-0 ${activePlan ? "cursor-pointer" : ""}`}>
            
          <div className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 transition-all text-[hsl(var(--primary))] ${
            activePlan ? "border-primary bg-primary/10 hover:bg-primary/20 shadow-lg shadow-primary/20" : "border-border bg-card"}`
            }>
            <ClipboardList className="w-5 h-5 text-primary mb-0.5" />
            <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Scheda</p>
            <p className="text-xs font-heading font-bold mt-0.5 text-center px-2 leading-tight line-clamp-2">{activePlan ? activePlan.title : "—"}</p>
          </div>
        </motion.div>

        {!showProfileModal &&
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-2 flex-1 min-w-0">
            
            <WeeklyMonthProgress sessions={sessions} compact sessionsPerWeek={planDaysCount} planStartDate={activePlan?.created_date} />
          </motion.div>
          }
      </div>

      {/* Schede Archiviate */}
      {archivedPlans.length > 0 &&
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Schede Completate</p>
              <p className="font-semibold text-sm mt-0.5">{archivedPlans.length} scheda{archivedPlans.length > 1 ? "e" : ""}</p>
            </div>
            <Link to="/schede">
              <Button variant="outline" size="sm" className="rounded-xl h-9">Visualizza</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {archivedPlans.slice(0, 3).map((p) =>
            <Link key={p.id} to={`/schede/${p.id}`}
            className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <span className="text-xs font-medium truncate">{p.title}</span>
                <span className="text-[10px] text-muted-foreground ml-2 shrink-0">✓</span>
              </Link>
            )}
          </div>
        </motion.div>
        }

      {/* Piano Alimentare */}
      {widgets.meal && user?.meal_plan_url &&
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
        }


      {/* Acqua */}
      {widgets.water && <WaterTrackerWidget />}

      {/* Integratori */}
      {widgets.supplements && <SupplementsWidget supplements={supplements} />}
    </div>
    </PullToRefresh>);

}