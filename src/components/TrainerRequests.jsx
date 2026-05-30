import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dumbbell, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function TrainerRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    async function load() {
      const reqs = await base44.entities.TrainerRequest.filter({ status: "pending" }, "-created_date");
      setRequests(reqs);
      setLoading(false);
    }
    load();
  }, []);

  async function handleApprove(req) {
    setProcessing(req.id);
    await base44.entities.TrainerRequest.update(req.id, { status: "approved" });
    const allUsers = await base44.entities.User.list();
    const targetUser = allUsers.find(u => u.email === req.user_email);
    if (targetUser) await base44.entities.User.update(targetUser.id, { role: "trainer" });
    await base44.entities.Notification.create({
      user_email: req.user_email,
      message: "🎉 La tua richiesta di accesso come Trainer è stata approvata! Ora hai accesso alle funzionalità trainer.",
      read: false,
    });
    setRequests(prev => prev.filter(r => r.id !== req.id));
    toast.success("Trainer approvato!");
    setProcessing(null);
  }

  async function handleReject(req) {
    setProcessing(req.id);
    await base44.entities.TrainerRequest.update(req.id, { status: "rejected" });
    await base44.entities.Notification.create({
      user_email: req.user_email,
      message: "La tua richiesta di accesso come Trainer non è stata approvata. Per informazioni contatta la segreteria.",
      read: false,
    });
    setRequests(prev => prev.filter(r => r.id !== req.id));
    toast.success("Richiesta rifiutata");
    setProcessing(null);
  }

  if (loading || requests.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Dumbbell className="w-5 h-5 text-[#fcd12a]" />
        <h2 className="font-heading font-semibold text-base text-white">Richieste Trainer</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-400/10 text-orange-400">{requests.length} in attesa</span>
      </div>
      <div className="space-y-2">
        {requests.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-4 bg-white/4 border border-white/8 rounded-2xl p-4"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#fcd12a]/12 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-[#fcd12a]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white">{req.user_name || req.user_email}</p>
              <p className="text-xs text-white/40">{req.user_email}</p>
              {req.notes && <p className="text-sm text-white/35 mt-1 italic">"{req.notes}"</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleApprove(req)}
                disabled={processing === req.id}
                className="w-8 h-8 rounded-xl bg-green-400/15 text-green-400 hover:bg-green-400/25 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {processing === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleReject(req)}
                disabled={processing === req.id}
                className="w-8 h-8 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-400/20 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}