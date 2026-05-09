import { useState, useEffect, useRef } from "react";
import { X, Plus, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beepTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.5, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    beepTone(880, 0, 0.15);
    beepTone(880, 0.2, 0.15);
    beepTone(1100, 0.4, 0.5);
    beepTone(1100, 1.0, 0.5);
  } catch (e) {}
}

export default function RestTimer({ defaultSeconds = 90, onClose }) {
  const [total] = useState(defaultSeconds);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(true);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef(null);

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
            // Auto-disappear after 2s
            setTimeout(() => {
              setVisible(false);
              setTimeout(onClose, 400);
            }, 2000);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function addTime(s) {
    setRemaining(r => r + s);
    if (!running) setRunning(true);
  }

  function stopTimer() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setVisible(false);
    setTimeout(onClose, 300);
  }

  const progress = total > 0 ? remaining / total : 0;
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const isDone = remaining === 0;

  // Oval SVG dimensions
  const W = 200, H = 80, rx = 40, ry = 38;
  const perimeter = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 60, x: "-50%" }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-28 lg:bottom-8 left-1/2 z-50"
          style={{ width: "min(300px, calc(100vw - 32px))" }}
        >
          <div className="relative bg-card/95 backdrop-blur-xl border border-border rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
            {/* Oval progress ring */}
            <div className="relative shrink-0" style={{ width: 52, height: 52 }}>
              <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
                <circle cx="26" cy="26" r="22" fill="none" stroke="hsl(var(--border))" strokeWidth="3.5" />
                <circle
                  cx="26" cy="26" r="22" fill="none"
                  stroke={isDone ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                  strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={(1 - progress) * 2 * Math.PI * 22}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold font-heading text-foreground">
                  {isDone ? "✓" : `${min}:${sec.toString().padStart(2, "0")}`}
                </span>
              </div>
            </div>

            {/* Text + add buttons */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">
                {isDone ? "Recupero completato! 💪" : "Recupero..."}
              </p>
              {!isDone && (
                <div className="flex gap-1 mt-1">
                  <button onClick={() => addTime(15)} className="text-[10px] bg-secondary hover:bg-secondary/80 px-2 py-0.5 rounded-full transition-colors">
                    +15s
                  </button>
                  <button onClick={() => addTime(30)} className="text-[10px] bg-secondary hover:bg-secondary/80 px-2 py-0.5 rounded-full transition-colors">
                    +30s
                  </button>
                </div>
              )}
            </div>

            {/* Stop / close */}
            {!isDone && (
              <button onClick={stopTimer} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors">
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}