import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
    const allUsers = await base44.entities.User.list();
    const admins = allUsers.filter(u => u.role === "admin");
    await Promise.all(admins.map(a =>
      base44.entities.Notification.create({
        user_email: a.email,
        message: `🏋️ Richiesta Trainer da ${user.full_name || user.email}. Vai nella sezione Admin per approvare o rifiutare.`,
        read: false,
      })
    ));
    setExistingRequest(req);
    setSending(false);
    toast.success("Richiesta inviata! Attendi l'approvazione dell'admin.");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
    </div>
  );

  const statusConfig = {
    pending:  { icon: Clock,         label: "In attesa di approvazione",          color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
    approved: { icon: CheckCircle,   label: "Approvata! Ora sei un Trainer.",      color: "text-green-400",  bg: "bg-green-400/10 border-green-400/20" },
    rejected: { icon: XCircle,       label: "Richiesta non approvata.",            color: "text-red-400",    bg: "bg-red-400/10 border-red-400/20" },
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-heading text-2xl font-bold text-white">Accesso Trainer</h1>
        <p className="text-white/35 text-sm mt-0.5">Richiedi l'accesso come trainer</p>
      </div>

      {existingRequest ? (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/4 border border-white/8 rounded-3xl p-5 space-y-4">
          {(() => {
            const s = statusConfig[existingRequest.status] || statusConfig.pending;
            const Icon = s.icon;
            return (
              <div className={`flex items-center gap-3 border rounded-2xl p-4 ${s.bg}`}>
                <Icon className={`w-5 h-5 ${s.color} shrink-0`} />
                <p className={`font-medium text-sm ${s.color}`}>{s.label}</p>
              </div>
            );
          })()}
          {existingRequest.status === "rejected" && (
            <button onClick={() => setExistingRequest(null)}
              className="w-full h-11 rounded-2xl bg-white/8 text-white/60 text-sm font-medium hover:bg-white/12 transition-colors">
              Invia una nuova richiesta
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/4 border border-white/8 rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#fcd12a]/12 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-[#fcd12a]" />
            </div>
            <div>
              <p className="font-semibold text-white">Richiesta Accesso Trainer</p>
              <p className="text-sm text-white/40">Potrai vedere i dati dei clienti</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2 block">Motivazione (opzionale)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Spiega perché vuoi accedere come trainer..."
              className="w-full text-sm bg-white/5 border border-white/10 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:border-[#fcd12a]/30 text-white placeholder:text-white/20"
            />
          </div>
          <button onClick={handleSend} disabled={sending}
            className="w-full h-12 rounded-2xl bg-[#fcd12a] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#fcd12a]/90 disabled:opacity-50 transition-all">
            <Send className="w-4 h-4" />
            {sending ? "Invio..." : "Invia Richiesta"}
          </button>
        </motion.div>
      )}
    </div>
  );
}