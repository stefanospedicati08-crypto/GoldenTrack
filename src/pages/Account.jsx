import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, LogOut, AlertTriangle, X, Pencil, Check, Ruler, Weight, Camera, Loader2, Plus, ChevronDown, ChevronUp, Pill, Upload, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Account() {
  const [user, setUser] = useState(null);
  const [latestWeight, setLatestWeight] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef(null);
  const mealRef = useRef(null);

  // Body
  const [editingBody, setEditingBody] = useState(false);
  const [heightVal, setHeightVal] = useState("");
  const [savingBody, setSavingBody] = useState(false);

  // Supplements
  const [supplements, setSupplements] = useState([]);
  const [showSupps, setShowSupps] = useState(false);
  const [newSupp, setNewSupp] = useState({ name: "", dose: "", timing: "" });
  const [addingSupp, setAddingSupp] = useState(false);
  const [savingSupp, setSavingSupp] = useState(false);

  // Meal plan
  const [uploadingMeal, setUploadingMeal] = useState(false);

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      setUser(u);
      setHeightVal(u.height_cm ? String(u.height_cm) : "");
      const [weights, supps] = await Promise.all([
      base44.entities.BodyWeight.filter({ created_by: u.email }, "-date", 1),
      base44.entities.Supplement.filter({ created_by: u.email })]
      );
      if (weights[0]) setLatestWeight(weights[0].weight_kg);
      setSupplements(supps);
    }
    load();
  }, []);

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ photo_url: file_url });
    setUser((prev) => ({ ...prev, photo_url: file_url }));
    setUploadingPhoto(false);
    toast.success("Foto aggiornata!");
  }

  async function handleMealUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingMeal(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ meal_plan_url: file_url });
    setUser((prev) => ({ ...prev, meal_plan_url: file_url }));
    setUploadingMeal(false);
    toast.success("Piano alimentare caricato!");
  }

  async function handleSaveBody() {
    setSavingBody(true);
    await base44.auth.updateMe({ height_cm: heightVal ? Number(heightVal) : undefined });
    setUser((prev) => ({ ...prev, height_cm: heightVal ? Number(heightVal) : undefined }));
    setEditingBody(false);
    setSavingBody(false);
    toast.success("Dati salvati");
  }

  async function handleAddSupp() {
    if (!newSupp.name) return;
    setSavingSupp(true);
    const s = await base44.entities.Supplement.create({ ...newSupp, active: true });
    setSupplements((prev) => [...prev, s]);
    setNewSupp({ name: "", dose: "", timing: "" });
    setAddingSupp(false);
    setSavingSupp(false);
  }

  async function handleDeleteSupp(id) {
    await base44.entities.Supplement.delete(id);
    setSupplements((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleDeleteRequest() {
    if (confirmText !== "ELIMINA") return;
    setDeleting(true);
    await base44.entities.Notification.create({
      user_email: "admin",
      message: `Richiesta eliminazione account da: ${user?.email} (${user?.full_name || "—"})`,
      read: false
    });
    toast.success("Richiesta inviata. Il tuo account sarà eliminato entro 30 giorni.");
    setShowDeleteDialog(false);
    setConfirmText("");
    setDeleting(false);
  }

  const bmi = latestWeight && user?.height_cm ?
  (latestWeight / Math.pow(user.height_cm / 100, 2)).toFixed(1) :
  null;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold text-[hsl(var(--primary))]">Account</h1>
        <p className="text-muted-foreground mt-1">Gestisci il tuo profilo e preferenze</p>
      </div>

      {/* User info + photo */}
      <div className="border border-border p-5 flex items-center gap-4 bg-[hsl(var(--popover))] rounded-[50px]">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-primary overflow-hidden bg-[hsl(var(--background))]">
            {user?.photo_url ?
            <img src={user.photo_url} alt="foto" className="w-full h-full object-cover" /> :
            user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "?"}
          </div>
          <button
            onClick={() => photoRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
            
            {uploadingPhoto ? <Loader2 className="w-3 h-3 text-primary-foreground animate-spin" /> : <Camera className="w-3 h-3 text-primary-foreground" />}
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        <div>
          <p className="font-semibold text-lg text-[hsl(var(--primary))]">{user?.full_name || "—"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role || "user"}</p>
        </div>
      </div>

      {/* Body data */}
      <div className="border border-border p-5 space-y-4 bg-[hsl(var(--popover))] rounded-[50px]">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold">Dati Corporei</h2>
          {!editingBody ?
          <button onClick={() => setEditingBody(true)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button> :
          <button onClick={() => setEditingBody(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
        {editingBody ?
        <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Altezza (cm)</label>
              <Input type="number" placeholder="es. 175" value={heightVal} onChange={(e) => setHeightVal(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <p className="text-xs text-muted-foreground">Il peso viene aggiornato automaticamente dalla sezione Peso.</p>
            <Button onClick={handleSaveBody} disabled={savingBody} className="w-full h-10 rounded-xl">
              {savingBody ? "Salvataggio..." : <><Check className="w-4 h-4 mr-1.5" />Salva</>}
            </Button>
          </div> :

        <div className="grid grid-cols-3 gap-3">
            <div className="p-3 text-center rounded-[1000px] bg-[hsl(var(--background))]">
              <Weight className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-heading font-bold text-[hsl(var(--primary))]">{latestWeight ?? "—"}</p>
              <p className="text-xs text-muted-foreground">kg</p>
            </div>
            <div className="p-3 text-center rounded-[100px] bg-[hsl(var(--background))]">
              <Ruler className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-heading font-bold text-[hsl(var(--primary))]">{user?.height_cm ?? "—"}</p>
              <p className="text-xs text-muted-foreground">cm</p>
            </div>
            <div className="p-3 text-center rounded-[100px] bg-[hsl(var(--background))]">
              <p className="text-xs text-muted-foreground mb-1">BMI</p>
              <p className="text-xl font-heading font-bold text-[hsl(var(--primary))]">{bmi ?? "—"}</p>
              <p className="text-xs text-muted-foreground">indice</p>
            </div>
          </div>
        }
      </div>

      {/* Meal Plan */}
      <div className="border border-border p-5 space-y-3 rounded-[50px] bg-[hsl(var(--popover))]">
        <div className="flex items-center justify-between bg-[hsl(var(--background))] rounded-[50px]">
          <h2 className="font-heading font-semibold mx-2 bg-[hsl(var(--primary))] opacity-25 text-[hsl(var(--foreground))]">Piano Alimentare</h2>
          <button onClick={() => mealRef.current?.click()} className="flex items-center gap-1.5 text-xs text-primary font-medium px-3 py-1.5 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors">
            {uploadingMeal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {user?.meal_plan_url ? "Aggiorna" : "Carica"}
          </button>
          <input ref={mealRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleMealUpload} />
        </div>
        {user?.meal_plan_url ?
        <a href={user.meal_plan_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-secondary/40 rounded-xl p-3 hover:bg-secondary/60 transition-colors">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium flex-1">Visualizza piano alimentare</span>
          </a> :

        <p className="text-sm text-muted-foreground">Nessun piano caricato. Carica un'immagine o PDF del tuo piano.</p>
        }
      </div>

      {/* Supplements */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <button onClick={() => setShowSupps(!showSupps)} className="w-full flex items-center justify-between p-5">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-accent" />
            <h2 className="font-heading font-semibold text-[hsl(var(--primary))]">Integratori</h2>
            {supplements.length > 0 && <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{supplements.length}</span>}
          </div>
          {showSupps ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {showSupps &&
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-5 pb-5 space-y-3 border-t border-border pt-3">
                {supplements.map((s) =>
              <div key={s.id} className="flex items-center gap-3 bg-secondary/30 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{[s.dose, s.timing].filter(Boolean).join(" · ")}</p>
                    </div>
                    <button onClick={() => handleDeleteSupp(s.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
              )}
                {addingSupp ?
              <div className="space-y-2">
                    <Input placeholder="Nome integratore *" value={newSupp.name} onChange={(e) => setNewSupp((p) => ({ ...p, name: e.target.value }))} className="h-9 rounded-xl text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Dosaggio (es. 5g)" value={newSupp.dose} onChange={(e) => setNewSupp((p) => ({ ...p, dose: e.target.value }))} className="h-9 rounded-xl text-sm" />
                      <Input placeholder="Quando (es. mattina)" value={newSupp.timing} onChange={(e) => setNewSupp((p) => ({ ...p, timing: e.target.value }))} className="h-9 rounded-xl text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddSupp} disabled={!newSupp.name || savingSupp} className="flex-1 rounded-xl h-9">
                        {savingSupp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAddingSupp(false)} className="rounded-xl h-9">Annulla</Button>
                    </div>
                  </div> :

              <Button size="sm" variant="outline" onClick={() => setAddingSupp(true)} className="w-full rounded-xl h-9 gap-1.5">
                    <Plus className="w-4 h-4" /> Aggiungi integratore
                  </Button>
              }
              </div>
            </motion.div>
          }
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full h-12 rounded-xl justify-start gap-3" onClick={() => base44.auth.logout()}>
          <LogOut className="w-4 h-4 text-muted-foreground" />
          Esci dall'account
        </Button>
        <Button variant="outline" className="w-full h-12 rounded-xl justify-start gap-3 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="w-4 h-4" />
          Richiedi eliminazione account
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">Golden Track v1.0 · Conforme alle linee guida App Store</p>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {showDeleteDialog &&
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          className="bg-card rounded-t-2xl sm:rounded-2xl border border-border p-6 w-full sm:max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-heading font-semibold text-lg">Elimina Account</h3>
                <button onClick={() => {setShowDeleteDialog(false);setConfirmText("");}} className="ml-auto p-1.5 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
              </div>
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-sm text-muted-foreground leading-relaxed">
                Questa azione invierà una richiesta di eliminazione del tuo account e <strong>tutti i tuoi dati</strong>. L'operazione sarà completata entro 30 giorni.
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">Scrivi <strong>ELIMINA</strong> per confermare</label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ELIMINA" className="h-10 rounded-xl" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => {setShowDeleteDialog(false);setConfirmText("");}}>Annulla</Button>
                <Button className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={confirmText !== "ELIMINA" || deleting} onClick={handleDeleteRequest}>
                  {deleting ? "Invio..." : "Conferma"}
                </Button>
              </div>
            </motion.div>
          </div>
        }
      </AnimatePresence>
    </div>);

}