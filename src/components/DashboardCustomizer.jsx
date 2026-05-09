import { useState } from "react";
import { Settings, X, Droplets, FileText, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WIDGETS = [
  { key: "water", label: "Acqua giornaliera", icon: Droplets, color: "text-blue-400" },
  { key: "meal", label: "Piano alimentare", icon: FileText, color: "text-accent" },
  { key: "fit", label: "Google Fit", icon: Activity, color: "text-green-500", disabled: true, badge: "Presto" },
];

export default function DashboardCustomizer({ widgets, onChange }) {
  const [open, setOpen] = useState(false);

  function toggle(key) {
    onChange({ ...widgets, [key]: !widgets[key] });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl hover:bg-secondary transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        Personalizza
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5 w-full sm:max-w-sm shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-lg">Personalizza Dashboard</h3>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">Scegli quali widget visualizzare nella tua dashboard.</p>
              <div className="space-y-2">
                {WIDGETS.map(w => (
                  <button
                    key={w.key}
                    disabled={w.disabled}
                    onClick={() => !w.disabled && toggle(w.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      widgets[w.key] && !w.disabled
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-secondary/30"
                    } ${w.disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/30 cursor-pointer"}`}
                  >
                    <w.icon className={`w-5 h-5 ${w.color}`} />
                    <span className="flex-1 text-sm font-medium text-left">{w.label}</span>
                    {w.badge && (
                      <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{w.badge}</span>
                    )}
                    {!w.disabled && (
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        widgets[w.key] ? "border-primary bg-primary" : "border-border"
                      }`}>
                        {widgets[w.key] && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}