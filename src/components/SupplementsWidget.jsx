import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Pill, Check, Bell, Settings, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}
function getNotifSettings() {
  try { return JSON.parse(localStorage.getItem("notifSettings") || "{}"); } catch { return {}; }
}

export default function SupplementsWidget({ supplements }) {
  const storageKey = `supp_taken_${getTodayKey()}`;
  const [taken, setTaken] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [reminderTime, setReminderTime] = useState(() => getNotifSettings()?.supplement?.time || "");
  const [notifStatus, setNotifStatus] = useState("default");
  const mealLogIdRef = useRef(null);
  const today = getTodayKey();

  useEffect(() => {
    if ("Notification" in window) setNotifStatus(Notification.permission);
    base44.entities.MealLog.filter({ date: today }, "-date", 1).then(logs => {
      if (logs[0]) mealLogIdRef.current = logs[0].id;
    });
  }, []);

  async function syncMealLog(nextTaken) {
    const allIds = supplements.map(s => s.id);
    const allDone = allIds.length > 0 && allIds.every(id => nextTaken.includes(id));
    if (mealLogIdRef.current) {
      await base44.entities.MealLog.update(mealLogIdRef.current, { completed: allDone });
    } else if (allDone) {
      const created = await base44.entities.MealLog.create({ date: today, completed: true });
      mealLogIdRef.current = created.id;
    }
  }

  function toggleTaken(id) {
    const next = taken.includes(id) ? taken.filter(t => t !== id) : [...taken, id];
    setTaken(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    syncMealLog(next);
  }

  function toggleAll() {
    const allIds = supplements.map(s => s.id);
    const allTaken = allIds.every(id => taken.includes(id));
    const next = allTaken ? [] : allIds;
    setTaken(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    syncMealLog(next);
  }

  async function requestNotifPermission() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
  }

  function saveReminder() {
    const current = getNotifSettings();
    const updated = { ...current, supplement: { enabled: !!reminderTime, time: reminderTime || "" } };
    localStorage.setItem("notifSettings", JSON.stringify(updated));
    setShowSettings(false);
    if (reminderTime && notifStatus === "granted") scheduleReminder(reminderTime);
  }

  function scheduleReminder(time) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const [h, m] = time.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    setTimeout(() => {
      new Notification("💊 Integratori", { body: "Ricordati di prendere i tuoi integratori!", icon: "/favicon.ico" });
    }, target - now);
  }

  if (supplements.length === 0) return null;

  const allIds = supplements.map(s => s.id);
  const allTaken = allIds.every(id => taken.includes(id));
  const savedReminderTime = getNotifSettings()?.supplement?.time || "";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white/70">Integratori</span>
          {taken.length > 0 && (
            <span className="text-[10px] bg-purple-400/10 text-purple-400 px-2 py-0.5 rounded-full font-medium">
              {taken.length}/{supplements.length}
            </span>
          )}
        </div>
        <button onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-xl hover:bg-white/8 transition-colors">
          <Settings className="w-3.5 h-3.5 text-white/25" />
        </button>
      </div>

      {/* Mark all button */}
      <button onClick={toggleAll}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-sm font-medium transition-all ${
          allTaken
            ? "border-purple-400/40 bg-purple-400/10 text-purple-400"
            : "border-white/8 bg-white/3 text-white/50 hover:border-white/15 hover:bg-white/6"
        }`}>
        {allTaken ? <Check className="w-4 h-4" /> : null}
        {allTaken ? "Tutti presi! 🎉" : "Segna tutti come presi"}
      </button>

      {/* Individual supplements */}
      <div className="space-y-1.5">
        {supplements.map(s => {
          const isTaken = taken.includes(s.id);
          return (
            <button key={s.id} onClick={() => toggleTaken(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 border rounded-2xl transition-all text-left ${
                isTaken
                  ? "border-white/8 bg-white/4 opacity-60"
                  : "border-white/6 bg-white/3 hover:border-white/12 hover:bg-white/5"
              }`}>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                isTaken ? "border-purple-400 bg-purple-400" : "border-white/20"
              }`}>
                {isTaken && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${isTaken ? "line-through text-white/30" : "text-white/70"}`}>
                  {s.name}
                </span>
                {(s.dose || s.timing) && (
                  <p className="text-xs text-white/25">{[s.dose, s.timing].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Reminder badge */}
      {savedReminderTime && (
        <div className="flex items-center gap-2 text-xs text-white/25">
          <Bell className="w-3.5 h-3.5" />
          <span>Promemoria alle {savedReminderTime}</span>
        </div>
      )}

      {/* Settings bottom sheet */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1c1f28] border-t border-white/10 rounded-t-3xl p-5 w-full max-w-lg shadow-2xl space-y-4">
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-1" />
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-white">Impostazioni promemoria</h3>
                <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-xl hover:bg-white/8">
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/30 uppercase tracking-wider block">Orario promemoria</label>
                <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-[#fcd12a]/30" />
                {reminderTime && (
                  <button onClick={() => setReminderTime("")} className="text-xs text-red-400/70 hover:text-red-400">
                    Rimuovi promemoria
                  </button>
                )}
              </div>
              {notifStatus !== "granted" && (
                <div className="bg-white/4 rounded-2xl p-3 space-y-2">
                  <p className="text-xs text-white/35">Permetti le notifiche per ricevere promemoria.</p>
                  {notifStatus === "denied"
                    ? <p className="text-xs text-red-400/70">Notifiche bloccate — abilitale nelle impostazioni del browser.</p>
                    : <button onClick={requestNotifPermission} className="flex items-center gap-1.5 text-xs text-[#fcd12a]/80 hover:text-[#fcd12a] font-medium">
                        <Bell className="w-3.5 h-3.5" /> Abilita notifiche
                      </button>
                  }
                </div>
              )}
              {notifStatus === "granted" && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Bell className="w-3.5 h-3.5" /> Notifiche abilitate
                </div>
              )}
              <button onClick={saveReminder}
                className="w-full h-12 bg-[#fcd12a] text-black rounded-2xl text-sm font-bold hover:bg-[#fcd12a]/90 transition-colors">
                Salva impostazioni
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}