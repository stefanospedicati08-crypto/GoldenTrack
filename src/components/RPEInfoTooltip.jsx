import { useState, useEffect } from "react";
import { X, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "rpe_tooltip_dismissed";

export default function RPEInfoTooltip() {
  const [showInfo, setShowInfo] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(!!localStorage.getItem(STORAGE_KEY));
  }, []);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
    setShowInfo(false);
  }

  return (
    <div>
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
        Cos'è l'RPE?
      </button>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="mt-2 bg-primary/10 border border-primary/30 rounded-2xl p-4 flex gap-3"
          >
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary mb-1">Cos'è l'RPE?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                L'<strong>RPE</strong> (Rate of Perceived Exertion) è un valore da <strong>1 a 10</strong> che indica il livello di fatica percepita durante l'allenamento.
                <br />1 = sforzo minimo · 10 = sforzo massimo assoluto.
              </p>
            </div>
            <button onClick={() => setShowInfo(false)} className="p-1 rounded-lg hover:bg-primary/10 transition-colors shrink-0">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}