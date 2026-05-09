import { useState, useEffect } from "react";
import { Pill, Check, Bell, BellOff, Settings, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

export default function SupplementsWidget({ supplements }) {
  const storageKey = `supp_taken_${getTodayKey()}`;
  const reminderKey = "supp_reminder_time";

  const [taken, setTaken] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem(reminderKey) || "");
  const [notifStatus, setNotifStatus] = useState("default"); // default | granted | denied

  useEffect(() => {
    setNotifStatus(Notification?.permission || "default");
  }, []);

  function toggleTaken(id) {
    const next = taken.includes(id) ? taken.filter(t => t !== id) : [...taken, id];
    setTaken(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function toggleAll() {
    const allIds = supplements.map(s => s.id);
    const allTaken = allIds.every(id => taken.includes(id));
    const next = allTaken ? [] : allIds;
    setTaken(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  async function requestNotifPermission() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
  }

  function saveReminder() {
    if (reminderTime) {
      localStorage.setItem(reminderKey, reminderTime);
    } else {
      localStorage.removeItem(reminderKey);
    }
    setShowSettings(false);

    if (reminderTime && notifStatus === "granted") {
      scheduleReminder(reminderTime);
    }
  }

  function scheduleReminder(time) {
    const [h, m] = time.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    setTimeout(() => {
      new Notification("💊 Integratori", { body: "Ricordati di prendere i tuoi integratori!", icon: "/favicon.ico" });
    }, delay);
  }

  if (supplements.length === 0) return null;

  const allIds = supplements.map(s => s.id);
  const allTaken = allIds.every(id => taken.includes(id));
  const someTaken = taken.length > 0 && !allTaken;
  const savedReminderTime = localStorage.getItem(reminderKey);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-purple-400" />
          <h3 className="font-heading font-semibold">Integratori del giorno</h3>
          {taken.length > 0 && (
            <span className="text-xs bg-purple-400/10 text-purple-400 px-2 py-0.5 rounded-full">
              {taken.length}/{supplements.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Mark all */}
      <button
        onClick={toggleAll}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
          allTaken
            ? "border-purple-400 bg-purple-400/10"
            : "border-border bg-secondary/30 hover:border-purple-400/40"
        }`}
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          allTaken ? "bg-purple-400 border-purple-400" : someTaken ? "border-purple-400" : "border-muted-foreground/40"
        }`}>
          {allTaken && <Check className="w-3 h-3 text-white" />}
          {someTaken && <div className="w-2 h-2 rounded-full bg-purple-400" />}
        </div>
        <span className={`text-sm font-medium ${allTaken ? "text-purple-400" : "text-foreground"}`}>
          {allTaken ? "Tutti presi! 🎉" : "Segna tutti come presi"}
        </span>
      </button>

      {/* Individual supplements */}
      <div className="space-y-2">
        {supplements.map(s => {
          const isTaken = taken.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggleTaken(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                isTaken
                  ? "border-purple-400/40 bg-purple-400/5"
                  : "border-border bg-secondary/20 hover:border-purple-400/30"
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isTaken ? "bg-purple-400 border-purple-400" : "border-muted-foreground/40"
              }`}>
                {isTaken && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 text-left">
                <span className={`text-sm font-medium ${isTaken ? "line-through text-muted-foreground" : ""}`}>
                  {s.name}
                </span>
                {(s.dose || s.timing) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[s.dose, s.timing].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Reminder badge */}
      {savedReminderTime && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bell className="w-3.5 h-3.5" />
          <span>Promemoria impostato alle {savedReminderTime}</span>
        </div>
      )}

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5 w-full sm:max-w-sm shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold">Impostazioni promemoria</h3>
                <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium block">Orario promemoria giornaliero</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={e => setReminderTime(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {reminderTime && (
                  <button
                    onClick={() => { setReminderTime(""); }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Rimuovi promemoria
                  </button>
                )}
              </div>

              {notifStatus !== "granted" && (
                <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Per ricevere notifiche devi concedere il permesso al browser.
                  </p>
                  {notifStatus === "denied" ? (
                    <p className="text-xs text-destructive">Notifiche bloccate — abilitale nelle impostazioni del browser.</p>
                  ) : (
                    <button
                      onClick={requestNotifPermission}
                      className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                    >
                      <Bell className="w-3.5 h-3.5" /> Abilita notifiche
                    </button>
                  )}
                </div>
              )}

              {notifStatus === "granted" && (
                <div className="flex items-center gap-2 text-xs text-accent">
                  <Bell className="w-3.5 h-3.5" />
                  <span>Notifiche abilitate</span>
                </div>
              )}

              <button
                onClick={saveReminder}
                className="w-full h-11 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Salva impostazioni
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}