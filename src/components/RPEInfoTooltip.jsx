import { useState, useEffect } from "react";
import { X, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "rpe_tooltip_dismissed";

export default function RPEInfoTooltip() {
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function handleClose() {
    if (dontShowAgain) localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex gap-3"
        >
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary mb-1">Cos'è l'RPE?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              L'<strong>RPE</strong> (Rate of Perceived Exertion) è un valore da <strong>1 a 10</strong> che indica il livello di fatica percepita durante l'allenamento.
              <br />1 = sforzo minimo · 10 = sforzo massimo assoluto.
            </p>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-muted-foreground">Non mostrare più</span>
            </label>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-primary/10 transition-colors shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}