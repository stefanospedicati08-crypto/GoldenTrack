import { useState } from "react";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

export default function ExerciseCompareModal({ exercise, logs, onClose }) {
  // Group logs by date (only training sets, no warmups)
  const trainingLogs = logs.filter((l) => !l.is_warmup);
  const dates = [...new Set(trainingLogs.map((l) => l.date))].sort((a, b) => b.localeCompare(a));

  const [dateA, setDateA] = useState(dates[0] || "");
  const [dateB, setDateB] = useState(dates[1] || "");

  function getSessionLogs(date) {
    return trainingLogs.filter((l) => l.date === date).sort((a, b) => a.set_number - b.set_number);
  }

  const sessionA = getSessionLogs(dateA);
  const sessionB = getSessionLogs(dateB);
  const maxSets = Math.max(sessionA.length, sessionB.length);

  function formatDate(d) {
    if (!d) return "—";
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
  }

  function totalVolume(session) {
    return session.reduce((sum, l) => sum + (l.reps_done || 0) * (l.weight_kg || 0), 0);
  }

  function avgWeight(session) {
    const sets = session.filter((l) => l.weight_kg != null);
    if (!sets.length) return null;
    return (sets.reduce((s, l) => s + l.weight_kg, 0) / sets.length).toFixed(1);
  }

  const volA = totalVolume(sessionA);
  const volB = totalVolume(sessionB);
  const wA = parseFloat(avgWeight(sessionA));
  const wB = parseFloat(avgWeight(sessionB));

  function Trend({ a, b }) {
    if (isNaN(a) || isNaN(b) || a === b) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if (a > b) return <TrendingUp className="w-4 h-4 text-accent" />;
    return <TrendingDown className="w-4 h-4 text-destructive" />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="font-heading font-bold text-lg text-primary">Confronto Sessioni</h2>
            <p className="text-xs text-muted-foreground">{exercise.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {dates.length < 2 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">Servono almeno 2 sessioni registrate per fare il confronto.</p>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            {/* Date selectors */}
            <div className="grid grid-cols-2 gap-3">
              {[{ label: "Sessione A", value: dateA, onChange: setDateA }, { label: "Sessione B", value: dateB, onChange: setDateB }].map(({ label, value, onChange }) => (
                <div key={label}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                  <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-10 rounded-xl bg-secondary border border-border text-sm px-3 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {dates.map((d) => (
                      <option key={d} value={d}>{formatDate(d)}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Summary stats */}
            {(sessionA.length > 0 || sessionB.length > 0) && (
              <div className="grid grid-cols-3 gap-2 bg-secondary/40 rounded-xl p-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Serie</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-bold text-sm">{sessionA.length}</span>
                    <Trend a={sessionA.length} b={sessionB.length} />
                    <span className="font-bold text-sm">{sessionB.length}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Carico medio</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-bold text-sm">{wA || "—"}</span>
                    <Trend a={wA} b={wB} />
                    <span className="font-bold text-sm">{wB || "—"}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Volume tot.</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-bold text-sm">{volA || "—"}</span>
                    <Trend a={volA} b={volB} />
                    <span className="font-bold text-sm">{volB || "—"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Per-set comparison */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dettaglio serie</p>
              {/* Column headers */}
              <div className="grid grid-cols-3 gap-2 mb-1 px-1">
                <p className="text-xs font-medium text-primary text-center">{formatDate(dateA)}</p>
                <p className="text-xs text-muted-foreground text-center">Serie</p>
                <p className="text-xs font-medium text-primary text-center">{formatDate(dateB)}</p>
              </div>
              <div className="space-y-2">
                {Array.from({ length: maxSets }, (_, i) => {
                  const logA = sessionA[i];
                  const logB = sessionB[i];
                  const wDiff = logA?.weight_kg != null && logB?.weight_kg != null
                    ? parseFloat((logA.weight_kg - logB.weight_kg).toFixed(1))
                    : null;
                  return (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center bg-secondary/30 rounded-xl px-3 py-2.5">
                      {/* A */}
                      <div className="text-center">
                        {logA ? (
                          <>
                            <p className="font-bold text-sm text-foreground">{logA.weight_kg != null ? `${logA.weight_kg} kg` : "—"}</p>
                            <p className="text-xs text-muted-foreground">{logA.reps_done || "—"} rep</p>
                          </>
                        ) : <p className="text-xs text-muted-foreground">—</p>}
                      </div>
                      {/* Set label + diff */}
                      <div className="text-center">
                        <p className="text-xs font-semibold text-muted-foreground">Serie {i + 1}</p>
                        {wDiff !== null && (
                          <p className={`text-[11px] font-medium mt-0.5 ${wDiff > 0 ? "text-accent" : wDiff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {wDiff > 0 ? `+${wDiff}` : wDiff}kg
                          </p>
                        )}
                      </div>
                      {/* B */}
                      <div className="text-center">
                        {logB ? (
                          <>
                            <p className="font-bold text-sm text-foreground">{logB.weight_kg != null ? `${logB.weight_kg} kg` : "—"}</p>
                            <p className="text-xs text-muted-foreground">{logB.reps_done || "—"} rep</p>
                          </>
                        ) : <p className="text-xs text-muted-foreground">—</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}