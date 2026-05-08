import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      setPullY(Math.min(delta * 0.5, THRESHOLD * 1.2));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullY >= THRESHOLD) {
      setRefreshing(true);
      setPullY(0);
      await onRefresh();
      setRefreshing(false);
    } else {
      setPullY(0);
    }
    pulling.current = false;
    startY.current = null;
  }, [pullY, onRefresh]);

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      <AnimatePresence>
        {(pullY > 0 || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 flex justify-center pt-2 z-10"
            style={{ transform: `translateY(${pullY}px)` }}
          >
            <div className="w-9 h-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center">
              <RefreshCw
                className={`w-4 h-4 text-primary ${refreshing ? "animate-spin" : ""}`}
                style={{ transform: `rotate(${progress * 360}deg)` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div style={{ y: pullY > 0 ? pullY : 0 }}>
        {children}
      </motion.div>
    </div>
  );
}