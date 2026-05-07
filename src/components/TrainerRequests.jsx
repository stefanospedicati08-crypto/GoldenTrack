import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
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
    // Update trainer request status
    await base44.entities.TrainerRequest.update(req.id, { status: "approved" });
    // Find user and update role to trainer
    const allUsers = await base44.entities.User.list();
    const targetUser = allUsers.find(u => u.email === req.user_email);
    if (targetUser) {
      await base44.entities.User.update(targetUser.id, { role: "trainer" });
    }
    // Send notification to user
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

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Dumbbell className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-semibold text-lg">Richieste Trainer</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-chart-3/10 text-chart-3">{requests.length} in attesa</span>
      </div>
      <div className="space-y-2">
        {requests.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-4 bg-card rounded-xl border border-border p-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{req.user_name || req.user_email}</p>
              <p className="text-xs text-muted-foreground">{req.user_email}</p>
              {req.notes && <p className="text-sm text-muted-foreground mt-1 italic">"{req.notes}"</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => handleApprove(req)}
                disabled={processing === req.id}
                className="h-8 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {processing === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleReject(req)}
                disabled={processing === req.id}
                className="h-8 rounded-lg text-destructive hover:bg-destructive/10"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}