import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ClipboardList, Send, X, Clock, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function isWithinAllowedTime() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hour * 60 + minutes;
  const start = 7 * 60; // 7:00
  const end = 23 * 60 + 59; // 23:59
  return day >= 1 && day <= 5 && timeInMinutes >= start && timeInMinutes <= end;
}

const NOTE_EXAMPLES = [
  "Più lavoro sulle braccia",
  "Meno gambe, già allenate",
  "Voglio più cardio",
  "Focus su spalle e schiena",
  "Allenamento breve (max 45 min)",
];

export default function RichiestaSchedaForm({ user, compact = false }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [checking, setChecking] = useState(false);

  async function handleOpen() {
    setChecking(true);
    const recent = await base44.entities.SchedaRequest.filter({ user_email: user.email }, "-created_date", 1);
    if (recent.length > 0) {
      const daysSince = (Date.now() - new Date(recent[0].created_date)) / (1000 * 60 * 60 * 24);
      if (daysSince < 28) {
        setDaysLeft(Math.ceil(28 - daysSince));
        setOpen("too_soon");
        setChecking(false);
        return;
      }
    }
    setChecking(false);
    if (!isWithinAllowedTime()) {
      setOpen("blocked");
    } else {
      setOpen(true);
    }
  }

  async function handleSend() {
    setSaving(true);
    await base44.entities.SchedaRequest.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      notes: notes || undefined,
      status: "pending",
    });
    setSaving(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setOpen(false);
      setNotes("");
    }, 2000);
  }

  return (
    <>
      <Button onClick={handleOpen} variant="outline" disabled={checking} className={`rounded-xl h-10 gap-2 ${compact ? "" : "w-full sm:w-auto"}`}>
        {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
        Richiedi Nuova Scheda
      </Button>

      {/* Too soon modal */}
      <AnimatePresence>
        {open === "too_soon" && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="bg-card rounded-t-2xl sm:rounded-2xl border border-border p-6 w-full sm:max-w-sm shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-chart-3" />
                </div>
                <h3 className="font-heading font-semibold text-lg">Troppo presto</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Puoi richiedere una nuova scheda solo dopo <strong>4 settimane</strong> dall'ultima richiesta.<br /><br />
                Mancano ancora <strong>{daysLeft} giorni</strong>.
              </p>
              <Button onClick={() => setOpen(false)} className="w-full rounded-xl">Chiudi</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Blocked modal */}
      <AnimatePresence>
        {open === "blocked" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-heading font-semibold text-lg">Orario non disponibile</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                La richiesta della scheda è accessibile dal <strong>lunedì al venerdì</strong> dalle <strong>7:00 alle 23:59</strong>.
                <br /><br />
                Il sabato e la domenica non è possibile effettuare la richiesta scheda.<br />
                Per maggiori info chiedere in segreteria.
              </p>
              <Button onClick={() => setOpen(false)} className="w-full rounded-xl">Chiudi</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request form modal */}
      <AnimatePresence>
        {open === true && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg">Richiedi Scheda</h3>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">
                  Note e richieste (opzionale)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Descrivi le tue preferenze o obiettivi..."
                  className="w-full text-sm bg-background border border-input rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Esempi di richieste:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTE_EXAMPLES.map(ex => (
                      <button
                        key={ex}
                        onClick={() => setNotes(prev => prev ? `${prev}, ${ex}` : ex)}
                        className="text-xs bg-secondary hover:bg-primary/10 hover:text-primary px-2.5 py-1 rounded-lg transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSend}
                disabled={saving || sent}
                className="w-full rounded-xl h-10"
              >
                {sent ? (
                  "✓ Richiesta inviata!"
                ) : saving ? (
                  "Invio in corso..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Invia Richiesta
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}