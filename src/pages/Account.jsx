import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Trash2, LogOut, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Account() {
  const [user, setUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  async function handleDeleteRequest() {
    if (confirmText !== "ELIMINA") return;
    setDeleting(true);
    // Send deletion request notification to admins
    await base44.entities.Notification.create({
      user_email: "admin",
      message: `Richiesta eliminazione account da: ${user?.email} (${user?.full_name || "—"})`,
      read: false,
    });
    toast.success("Richiesta inviata. Il tuo account sarà eliminato entro 30 giorni.");
    setShowDeleteDialog(false);
    setConfirmText("");
    setDeleting(false);
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold">Account</h1>
        <p className="text-muted-foreground mt-1">Gestisci il tuo profilo e preferenze</p>
      </div>

      {/* User info */}
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
          {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <p className="font-semibold text-lg">{user?.full_name || "—"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role || "user"}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-12 rounded-xl justify-start gap-3"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
          Esci dall'account
        </Button>

        <Button
          variant="outline"
          className="w-full h-12 rounded-xl justify-start gap-3 text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="w-4 h-4" />
          Richiedi eliminazione account
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Golden Track v1.0 · Conforme alle linee guida App Store
      </p>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDeleteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-heading font-semibold text-lg">Elimina Account</h3>
                <button
                  onClick={() => { setShowDeleteDialog(false); setConfirmText(""); }}
                  className="ml-auto p-1.5 rounded-lg hover:bg-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-sm text-muted-foreground leading-relaxed">
                <p>Questa azione invierà una richiesta di eliminazione del tuo account e <strong>tutti i tuoi dati</strong> (schede, pesi, sessioni, foto). L'operazione sarà completata entro 30 giorni.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">
                  Scrivi <strong>ELIMINA</strong> per confermare
                </label>
                <Input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="ELIMINA"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => { setShowDeleteDialog(false); setConfirmText(""); }}
                >
                  Annulla
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={confirmText !== "ELIMINA" || deleting}
                  onClick={handleDeleteRequest}
                >
                  {deleting ? "Invio..." : "Conferma"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}