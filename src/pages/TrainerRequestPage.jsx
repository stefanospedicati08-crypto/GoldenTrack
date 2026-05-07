import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dumbbell, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function TrainerRequestPage() {
  const [user, setUser] = useState(null);
  const [existingRequest, setExistingRequest] = useState(null);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      setUser(u);
      const reqs = await base44.entities.TrainerRequest.filter({ user_email: u.email }, "-created_date", 1);
      setExistingRequest(reqs[0] || null);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSend() {
    setSending(true);
    const req = await base44.entities.TrainerRequest.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      notes: notes || undefined,
      status: "pending",
    });
    // Notify all admins
    const allUsers = await base44.entities.User.list();
    const admins = allUsers.filter(u => u.role === "admin");
    await Promise.all(admins.map(a =>
      base44.entities.Notification.create({
        user_email: a.email,
        message: `🏋️ Richiesta Trainer da ${user.full_name || user.email} (${user.email}). Vai nella sezione Admin per approvare o rifiutare.`,
        read: false,
      })
    ));
    setExistingRequest(req);
    setSending(false);
    toast.success("Richiesta inviata! Attendi l'approvazione dell'admin.");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const statusInfo = {
    pending: { icon: Clock, label: "In attesa di approvazione", color: "text-chart-3", bg: "bg-chart-3/10" },
    approved: { icon: CheckCircle, label: "Approvata! Ora sei un Trainer.", color: "text-accent", bg: "bg-accent/10" },
    rejected: { icon: XCircle, label: "Richiesta non approvata. Contatta la segreteria.", color: "text-destructive", bg: "bg-destructive/10" },
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Accesso Trainer</h1>
        <p className="text-muted-foreground mt-1">Richiedi l'accesso come trainer</p>
      </div>

      {existingRequest ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-4"
        >
          {(() => {
            const s = statusInfo[existingRequest.status];
            const Icon = s.icon;
            return (
              <div className={`flex items-center gap-3 ${s.bg} rounded-xl p-4`}>
                <Icon className={`w-6 h-6 ${s.color} shrink-0`} />
                <p className={`font-medium ${s.color}`}>{s.label}</p>
              </div>
            );
          })()}
          {existingRequest.status === "rejected" && (
            <Button onClick={() => setExistingRequest(null)} variant="outline" className="w-full rounded-xl">
              Invia una nuova richiesta
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Richiesta Accesso Trainer</p>
              <p className="text-sm text-muted-foreground">Potrai vedere i dati dei clienti</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Motivazione (opzionale)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Spiega perché vuoi accedere come trainer..."
              className="w-full text-sm bg-background border border-input rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          <Button onClick={handleSend} disabled={sending} className="w-full rounded-xl h-10 gap-2">
            {sending ? "Invio..." : <><Send className="w-4 h-4" />Invia Richiesta</>}
          </Button>
        </motion.div>
      )}
    </div>
  );
}