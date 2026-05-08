import { useState, useEffect, useRef } from "react";
import { X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beepTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    beepTone(880, 0, 0.15);
    beepTone(880, 0.2, 0.15);
    beepTone(1100, 0.4, 0.4);
  } catch (e) {}
}

export default function RestTimer({ defaultSeconds = 90, onClose }) {
  const [total, setTotal] = useState(defaultSeconds);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const intervalRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            playBeep();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Collapse on scroll down, expand on scroll up
  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current + 30) {
        setCollapsed(true);
      } else if (currentY < lastScrollY.current - 30) {
        setCollapsed(false);
      }
      lastScrollY.current = currentY;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function addTime(s) {
    setRemaining(r => r + s);
    setTotal(t => t + s);
    if (!running) setRunning(true);
  }

  const progress = total > 0 ? remaining / total : 0;
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const isDone = remaining === 0;
  const circumference = 2 * Math.PI * 22;

  return (
    <motion.div
      initial={{ opacity: 0, y: 80, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 80, x: "-50%" }}
      className="fixed bottom-6 left-1/2 z-50 bg-card border border-border rounded-2xl shadow-2xl"
      style={{ width: "min(340px, calc(100vw - 32px))" }}
    >
      {/* Collapsed view */}
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 shrink-0">
              <svg className="-rotate-90" width="36" height="36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke={isDone ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 14}
                  strokeDashoffset={(1 - progress) * 2 * Math.PI * 14}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold font-heading">
                  {isDone ? "✓" : `${min}:${sec.toString().padStart(2, "0")}`}
                </span>
              </div>
            </div>
            <span className="text-sm font-semibold">{isDone ? "Recupero completato! 💪" : "Recupero in corso..."}</span>
          </div>
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        </button>
      ) : (
        <div className="p-4 flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0">
            <svg className="-rotate-90" width="56" height="56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke={isDone ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                strokeWidth="4" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={(1 - progress) * circumference}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold font-heading">
                {isDone ? "✓" : `${min}:${sec.toString().padStart(2, "0")}`}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{isDone ? "Recupero completato! 💪" : "Recupero in corso..."}</p>
            <div className="flex gap-1.5 mt-1.5">
              <button onClick={() => addTime(10)} className="text-xs bg-secondary hover:bg-secondary/80 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3" /> 10s
              </button>
              <button onClick={() => addTime(30)} className="text-xs bg-secondary hover:bg-secondary/80 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3" /> 30s
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}