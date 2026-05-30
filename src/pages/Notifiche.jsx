import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import PullToRefresh from "../components/PullToRefresh";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function Notifiche() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
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

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
    </div>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="font-heading text-2xl font-bold text-white">Notifiche</h1>
            <p className="text-white/35 text-sm mt-0.5">
              {unreadCount > 0 ? `${unreadCount} non lette` : "Tutte lette"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-[#fcd12a]/80 hover:text-[#fcd12a] bg-[#fcd12a]/8 border border-[#fcd12a]/15 rounded-2xl px-3 py-2 transition-colors font-medium">
              <CheckCheck className="w-3.5 h-3.5" />
              Tutte lette
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Bell className="w-7 h-7 text-white/15" />
            </div>
            <p className="text-white/30 text-sm">Nessuna notifica</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notifications.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
                    notif.read
                      ? "bg-white/3 border-white/6"
                      : "bg-[#fcd12a]/5 border-[#fcd12a]/15"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                    notif.read ? "bg-white/5" : "bg-[#fcd12a]/12"
                  }`}>
                    <Bell className={`w-4 h-4 ${notif.read ? "text-white/25" : "text-[#fcd12a]"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${notif.read ? "text-white/40" : "text-white/80 font-medium"}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-white/25 mt-1">
                      {moment(notif.created_date).fromNow()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!notif.read && (
                      <button onClick={() => markRead(notif.id)}
                        className="p-2 rounded-xl hover:bg-white/8 transition-colors" title="Segna come letta">
                        <Check className="w-4 h-4 text-green-400" />
                      </button>
                    )}
                    <button onClick={() => deleteNotif(notif.id)}
                      className="p-2 rounded-xl hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400/60 hover:text-red-400" />
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