import { useState, useEffect, useRef } from "react";
import { subscribeTimer, clearTimer } from "@/lib/timerStore";
import { Square } from "lucide-react";
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

const OW = 140, OH = 56, RX = 28, RY = 27;
const OVAL_PERIMETER = 2 * Math.PI * Math.sqrt((OW * OW + RY * RY) / 2);

export default function GlobalRestTimer() {
  const [totalSeconds, setTotalSeconds] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    return subscribeTimer((secs) => {
      if (secs !== null) {
        setTotalSeconds(secs);
        setRemaining(secs);
        setRunning(true);
        setVisible(true);
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

  // Show on scroll up
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      if (y < lastScrollY.current - 10) setVisible(true);
      lastScrollY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!totalSeconds) return null;

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const isDone = remaining === 0;
  const dashOffset = (1 - progress) * OVAL_PERIMETER;

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
          <div className="relative bg-card/95 backdrop-blur-xl border border-border rounded-full shadow-2xl px-5 py-3 flex items-center gap-4" style={{ minWidth: 260 }}>
            <div className="relative shrink-0" style={{ width: OW, height: OH }}>
              <svg width={OW} height={OH} viewBox={`0 0 ${OW} ${OH}`} className="-rotate-90">
                <ellipse cx={OW/2} cy={OH/2} rx={RX} ry={RY} fill="none" stroke="hsl(var(--border))" strokeWidth="3.5" />
                <ellipse cx={OW/2} cy={OH/2} rx={RX} ry={RY} fill="none"
                  stroke={isDone ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                  strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={OVAL_PERIMETER} strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold font-heading text-foreground leading-none">
                  {isDone ? "✓" : `${min}:${sec.toString().padStart(2, "0")}`}
                </span>
                {!isDone && <span className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-widest">recupero</span>}
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-xs font-semibold truncate">
                {isDone ? "Recupero completato! 💪" : "Recupero in corso…"}
              </p>
              {!isDone && (
                <div className="flex gap-1.5">
                  {[15, 30].map(s => (
                    <button key={s} onClick={() => setRemaining(r => r + s)}
                      className="text-[10px] bg-secondary hover:bg-secondary/80 px-2.5 py-1 rounded-full transition-colors font-medium">
                      +{s}s
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isDone && (
              <button onClick={() => { clearTimer(); setTotalSeconds(null); setVisible(false); }}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors">
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}