import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import PullToRefresh from "../components/PullToRefresh";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function Notifiche() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      setUser(u);
      const notifs = await base44.entities.Notification.filter({ user_email: u.email }, "-created_date", 100);
      setNotifications(notifs);
      setLoading(false);
    }
    load();
  }, []);

  async function markRead(id) {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function deleteNotif(id) {
    await base44.entities.Notification.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  async function handleRefresh() {
    const u = await base44.auth.me();
    const notifs = await base44.entities.Notification.filter({ user_email: u.email }, "-created_date", 100);
    setNotifications(notifs);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Notifiche</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} non lette` : "Tutte lette"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} className="rounded-xl h-9 gap-2">
            <CheckCheck className="w-4 h-4" />
            Segna tutte lette
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Bell className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Nessuna notifica</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {notifications.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-start gap-4 rounded-2xl border p-4 transition-colors ${
                  notif.read ? "bg-card border-border" : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  notif.read ? "bg-secondary" : "bg-primary/10"
                }`}>
                  <Bell className={`w-4 h-4 ${notif.read ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${notif.read ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {moment(notif.created_date).fromNow()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!notif.read && (
                    <button
                      onClick={() => markRead(notif.id)}
                      className="p-2 rounded-xl hover:bg-secondary transition-colors"
                      title="Segna come letta"
                    >
                      <Check className="w-4 h-4 text-accent" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotif(notif.id)}
                    className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}