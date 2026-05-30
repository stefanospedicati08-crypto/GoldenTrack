import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import WeekSessionModal from "./WeekSessionModal";
import { ChevronLeft, ChevronRight, Flame, CalendarDays } from "lucide-react";

function getPlanWeeks(planStartDate) {
  const today = new Date().toISOString().split("T")[0];
  const start = new Date(planStartDate);
  const dayOfWeek = start.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + mondayOffset);
  const weeks = [];
  let weekStart = new Date(start);
  let weekNum = 1;
  while (weekStart.toISOString().split("T")[0] <= today) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weeks.push({
      start: weekStart.toISOString().split("T")[0],
      end: weekEnd.toISOString().split("T")[0],
      label: `Sett. ${weekNum}`,
      num: weekNum,
    });
    weekNum++;
    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + 7);
  }
  return weeks;
}

function Ring({ completed, total, size = 72 }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(completed / total, 1) : 0;
  const done = completed >= total && total > 0;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={done ? "#4ade80" : "#fcd12a"}
        strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

export default function WeeklyMonthProgress({ sessions, compact = false, sessionsPerWeek = 4, planStartDate }) {
  const startDate = planStartDate || new Date().toISOString().split("T")[0];
  const planSessions = planStartDate ? sessions.filter(s => s.date >= planStartDate) : sessions;
  const weeks = getPlanWeeks(startDate);
  const today = new Date().toISOString().split("T")[0];
  const currentWeekIdx = weeks.findIndex(w => today >= w.start && today <= w.end);
  const [selectedIdx, setSelectedIdx] = useState(currentWeekIdx >= 0 ? currentWeekIdx : weeks.length - 1);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const scrollRef = useRef(null);

  // Scroll to selected chip on mount
  useEffect(() => {
    if (scrollRef.current) {
      const chip = scrollRef.current.children[selectedIdx];
      if (chip) chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, []);

  const totalSessionsDone = planSessions.length;
  const totalWeeksDone = weeks.filter(w => {
    const ws = planSessions.filter(s => s.date >= w.start && s.date <= w.end);
    return [...new Set(ws.map(s => s.date))].length >= sessionsPerWeek;
  }).length;

  const focusedWeek = weeks[selectedIdx];
  const focusedSessions = focusedWeek
    ? planSessions.filter(s => s.date >= focusedWeek.start && s.date <= focusedWeek.end)
    : [];
  const focusedDays = [...new Set(focusedSessions.map(s => s.date))].length;
  const isCurrentWeek = focusedWeek && today >= focusedWeek.start && today <= focusedWeek.end;
  const isFutureWeek = focusedWeek && today < focusedWeek.start;
  const weekDone = focusedDays >= sessionsPerWeek;

  return (
    <>
      <div className="space-y-4">
        {/* ── Stats summary ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-2xl px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#fcd12a]/15 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-[#fcd12a]" />
            </div>
            <div>
              <p className="text-lg font-heading font-bold text-white leading-none">{totalSessionsDone}</p>
              <p className="text-[11px] text-white/35 mt-0.5">sessioni totali</p>
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-heading font-bold text-white leading-none">{totalWeeksDone}</p>
              <p className="text-[11px] text-white/35 mt-0.5">settimane complete</p>
            </div>
          </div>
        </div>

        {/* ── Week chips horizontal scroll ── */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-none pb-1"
        >
          {weeks.map((week, i) => {
            const ws = planSessions.filter(s => s.date >= week.start && s.date <= week.end);
            const wd = [...new Set(ws.map(s => s.date))].length;
            const done = wd >= sessionsPerWeek;
            const isCurrent = today >= week.start && today <= week.end;
            const active = i === selectedIdx;
            return (
              <button
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`flex flex-col items-center shrink-0 px-3 py-2 rounded-2xl transition-all border ${
                  active
                    ? "bg-[#fcd12a]/15 border-[#fcd12a]/40"
                    : "bg-white/4 border-white/6 hover:bg-white/8"
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "text-[#fcd12a]" : "text-white/35"}`}>
                  S{week.num}
                </span>
                <div className="relative my-1">
                  <Ring completed={wd} total={sessionsPerWeek} size={36} />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                    {done ? "✓" : `${wd}/${sessionsPerWeek}`}
                  </span>
                </div>
                {isCurrent && <span className="w-1 h-1 rounded-full bg-[#fcd12a] animate-pulse" />}
              </button>
            );
          })}
        </div>

        {/* ── Selected week detail ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`rounded-2xl border p-4 flex items-center gap-4 ${
              weekDone
                ? "bg-green-500/8 border-green-500/20"
                : isFutureWeek
                ? "bg-white/3 border-white/6"
                : isCurrentWeek
                ? "bg-[#fcd12a]/8 border-[#fcd12a]/20"
                : "bg-white/4 border-white/8"
            }`}
          >
            <div className="relative shrink-0">
              <Ring completed={focusedDays} total={sessionsPerWeek} size={64} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-white leading-none">
                  {weekDone ? "✓" : `${focusedDays}`}
                </span>
                {!weekDone && <span className="text-[9px] text-white/30">/{sessionsPerWeek}</span>}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-white">{focusedWeek?.label}</p>
                {isCurrentWeek && <span className="text-[10px] bg-[#fcd12a]/15 text-[#fcd12a] px-2 py-0.5 rounded-full font-medium">In corso</span>}
                {weekDone && <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">Completata ✓</span>}
              </div>
              <p className="text-xs text-white/40">
                {isFutureWeek
                  ? "Settimana futura"
                  : `${focusedDays} allenament${focusedDays === 1 ? "o" : "i"} su ${sessionsPerWeek} previsti`}
              </p>
              {!isFutureWeek && focusedSessions.length > 0 && (
                <button
                  onClick={() => setSelectedWeek({ ...focusedWeek, sessions: focusedSessions })}
                  className="mt-2 text-[11px] text-[#fcd12a]/70 hover:text-[#fcd12a] transition-colors font-medium"
                >
                  Vedi dettagli →
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedWeek && (
          <WeekSessionModal week={selectedWeek} onClose={() => setSelectedWeek(null)} />
        )}
      </AnimatePresence>
    </>
  );
}