import { useState, useEffect, useRef } from "react";
import { subscribeTimer, clearTimer, startTimer } from "@/lib/timerStore";
import { Square, Pencil, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beepTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.5, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + duration);
    };
    beepTone(880, 0, 0.15); beepTone(880, 0.2, 0.15);
    beepTone(1100, 0.4, 0.5); beepTone(1100, 1.0, 0.5);
  } catch (e) {}
}

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function GlobalRestTimer() {
  const [totalSeconds, setTotalSeconds] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [visible, setVisible] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editMinutes, setEditMinutes] = useState("1");
  const [editSeconds, setEditSeconds] = useState("30");
  const intervalRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    return subscribeTimer((secs) => {
      if (secs !== null) {
        setTotalSeconds(secs);
        setRemaining(secs);
        setRunning(true);
        setVisible(true);
        setEditMode(false);
      } else {
        setTotalSeconds(null);
        setRunning(false);
      }
    });
  }, []);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
            playBeep();
            setTimeout(() => { clearTimer(); setTotalSeconds(null); }, 3000);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      if (y < lastScrollY.current - 10) setVisible(true);
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleTimerClick() {
    if (editMode) return;
    // Pre-fill with current remaining
    setEditMinutes(String(Math.floor(remaining / 60)));
    setEditSeconds(String(remaining % 60));
    setEditMode(true);
  }

  function applyCustomTime() {
    const secs = (parseInt(editMinutes) || 0) * 60 + (parseInt(editSeconds) || 0);
    if (secs < 1) return;
    setTotalSeconds(secs);
    setRemaining(secs);
    setRunning(true);
    setEditMode(false);
  }

  if (!totalSeconds) return null;

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const isDone = remaining === 0;
  const dashOffset = (1 - progress) * CIRCUMFERENCE;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 80, x: "-50%" }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed bottom-28 lg:bottom-8 left-1/2 z-50"
        >
          <div
            className="relative bg-[#1c1f28]/95 backdrop-blur-xl border border-white/12 rounded-3xl shadow-2xl shadow-black/40 px-4 py-3 flex items-center gap-3"
            style={{ minWidth: 260 }}
          >
            {/* Ring + time — tap to edit */}
            <button
              onClick={handleTimerClick}
              className="relative shrink-0 group"
              title="Tocca per modificare il tempo"
            >
              <svg width={56} height={56} className="-rotate-90">
                <circle cx={28} cy={28} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                <circle
                  cx={28} cy={28} r={RADIUS} fill="none"
                  stroke={isDone ? "#4ade80" : "#fcd12a"}
                  strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isDone
                  ? <span className="text-green-400 text-base">✓</span>
                  : <span className="text-[#fcd12a] text-xs font-bold font-heading leading-none">
                      {`${min}:${sec.toString().padStart(2, "0")}`}
                    </span>
                }
              </div>
              {/* Edit hint */}
              {!isDone && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="w-2.5 h-2.5 text-white/60" />
                </div>
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {editMode ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-white/40 font-medium">Imposta tempo</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editMinutes}
                        onChange={(e) => setEditMinutes(e.target.value)}
                        className="w-10 h-8 text-center rounded-xl bg-white/8 border border-white/15 text-white text-sm font-bold focus:outline-none focus:border-[#fcd12a]/50"
                        min={0} max={60}
                        autoFocus
                      />
                      <span className="text-white/40 text-xs">min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={editSeconds}
                        onChange={(e) => setEditSeconds(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyCustomTime()}
                        className="w-10 h-8 text-center rounded-xl bg-white/8 border border-white/15 text-white text-sm font-bold focus:outline-none focus:border-[#fcd12a]/50"
                        min={0} max={59}
                      />
                      <span className="text-white/40 text-xs">sec</span>
                    </div>
                    <button
                      onClick={applyCustomTime}
                      className="w-8 h-8 rounded-xl bg-[#fcd12a] flex items-center justify-center shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 text-black" />
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-white/50" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-white">
                    {isDone ? "Recupero completato! 💪" : "Recupero in corso…"}
                  </p>
                  {!isDone && (
                    <div className="flex gap-1.5 mt-1.5">
                      {[15, 30, 60].map(s => (
                        <button
                          key={s}
                          onClick={() => setRemaining(r => r + s)}
                          className="text-[10px] bg-white/8 hover:bg-white/15 text-white/60 hover:text-white px-2.5 py-1 rounded-full transition-colors font-medium"
                        >
                          +{s}s
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {!isDone && !editMode && (
              <button
                onClick={() => { clearTimer(); setTotalSeconds(null); setVisible(false); }}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}