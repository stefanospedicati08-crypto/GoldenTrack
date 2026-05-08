import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, LogOut, AlertTriangle, X, Pencil, Check, Ruler, Weight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Account() {
  const [user, setUser] = useState(null);
  const [latestWeight, setLatestWeight] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Editable body fields
  const [editingBody, setEditingBody] = useState(false);
  const [heightVal, setHeightVal] = useState("");
  const [savingBody, setSavingBody] = useState(false);

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      setUser(u);
      setHeightVal(u.height_cm ? String(u.height_cm) : "");
      // Load latest body weight
      const weights = await base44.entities.BodyWeight.filter({ created_by: u.email }, "-date", 1);
      if (weights[0]) setLatestWeight(weights[0].weight_kg);
    }
    load();
  }, []);

  async function handleSaveBody() {
    setSavingBody(true);
    await base44.auth.updateMe({
      height_cm: heightVal ? Number(heightVal) : undefined,
    });
    setUser(prev => ({ ...prev, height_cm: heightVal ? Number(heightVal) : undefined }));
    setEditingBody(false);
    setSavingBody(false);
    toast.success("Dati salvati");
  }

  async function handleDeleteRequest() {
    if (confirmText !== "ELIMINA") return;
    setDeleting(true);
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

  // Compute BMI if available
  const bmi = latestWeight && user?.height_cm
    ? (latestWeight / Math.pow(user.height_cm / 100, 2)).toFixed(1)
    : null;

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

      {/* Body data */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold">Dati Corporei</h2>
          {!editingBody ? (
            <button onClick={() => setEditingBody(true)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
          ) : (
            <button onClick={() => setEditingBody(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {editingBody ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-muted-foreground" /> Altezza (cm)
              </label>
              <Input
                type="number"
                placeholder="es. 175"
                value={heightVal}
                onChange={e => setHeightVal(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <p className="text-xs text-muted-foreground">Il peso attuale viene aggiornato automaticamente dalla sezione Peso.</p>
            <Button onClick={handleSaveBody} disabled={savingBody} className="w-full h-10 rounded-xl">
              {savingBody ? "Salvataggio..." : <><Check className="w-4 h-4 mr-1.5" />Salva</>}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <Weight className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-heading font-bold">{latestWeight ?? "—"}</p>
              <p className="text-xs text-muted-foreground">kg</p>
            </div>
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <Ruler className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-heading font-bold">{user?.height_cm ?? "—"}</p>
              <p className="text-xs text-muted-foreground">cm</p>
            </div>
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">BMI</p>
              <p className="text-xl font-heading font-bold">{bmi ?? "—"}</p>
              <p className="text-xs text-muted-foreground">indice</p>
            </div>
          </div>
        )}
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-card rounded-t-2xl sm:rounded-2xl border border-border p-6 w-full sm:max-w-sm shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-heading font-semibold text-lg">Elimina Account</h3>
                <button onClick={() => { setShowDeleteDialog(false); setConfirmText(""); }} className="ml-auto p-1.5 rounded-lg hover:bg-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-sm text-muted-foreground leading-relaxed">
                <p>Questa azione invierà una richiesta di eliminazione del tuo account e <strong>tutti i tuoi dati</strong>. L'operazione sarà completata entro 30 giorni.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">Scrivi <strong>ELIMINA</strong> per confermare</label>
                <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="ELIMINA" className="h-10 rounded-xl" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowDeleteDialog(false); setConfirmText(""); }}>Annulla</Button>
                <Button className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={confirmText !== "ELIMINA" || deleting} onClick={handleDeleteRequest}>
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