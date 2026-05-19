import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, LogOut, AlertTriangle, X, Pencil, Check, Ruler, Weight, Camera, Loader2, Plus, ChevronDown, ChevronUp, Pill, Upload, FileText, Settings, Timer, Bell, BellOff } from "lucide-react";
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

  // Settings
  const [customRestEnabled, setCustomRestEnabled] = useState(false);
  const [defaultRestSeconds, setDefaultRestSeconds] = useState("90");
  const [editingRest, setEditingRest] = useState(false);
  const [notifStatus, setNotifStatus] = useState("default");
  const [notifSettings, setNotifSettings] = useState({
    workout: { enabled: false, time: "" },
    supplement: { enabled: false, time: "" },
    water: { enabled: false, time: "" }
  });

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      setUser(u);
      setHeightVal(u.height_cm ? String(u.height_cm) : "");
      const savedRest = localStorage.getItem("customRestEnabled");
      setCustomRestEnabled(savedRest === "true");
      const savedDefault = localStorage.getItem("defaultRestSeconds");
      if (savedDefault) setDefaultRestSeconds(savedDefault);
      const saved = localStorage.getItem("notifSettings");
      if (saved) setNotifSettings(JSON.parse(saved));
      if ("Notification" in window) setNotifStatus(Notification.permission);
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

  async function requestNotifPermission() {
    if (!("Notification" in window)) {
      toast.error("Il tuo browser non supporta le notifiche");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
    if (permission === "granted") {
      toast.success("Notifiche abilitate!");
    } else {
      toast.error("Permesso negato. Abilita le notifiche nelle impostazioni del browser.");
    }
  }

  function updateNotif(key, field, value) {
    setNotifSettings((prev) => {
      const updated = { ...prev, [key]: { ...prev[key], [field]: value } };
      localStorage.setItem("notifSettings", JSON.stringify(updated));
      return updated;
    });
  }

  function saveRestDefault() {
    const val = Number(defaultRestSeconds);
    if (!val || val < 10) {toast.error("Inserisci un valore valido (min 10s)");return;}
    localStorage.setItem("defaultRestSeconds", String(val));
    setEditingRest(false);
    toast.success(`Recupero default impostato a ${val}s`);
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
          <h2 className="font-heading font-semibold mx-2 text-[hsl(var(--primary))] opacity-100">Piano Alimentare</h2>
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
      <div className="border border-border overflow-hidden bg-[hsl(var(--popover))] rounded-[50px] opacity-80">
        <button onClick={() => setShowSupps(!showSupps)} className="w-full flex items-center justify-between p-5 bg-[hsl(var(--popover))] rounded-[50px] opacity-70">
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
      <div className="space-y-3 rounded-[50px]">
        <Button variant="outline" className="w-full h-12 justify-start gap-3 rounded-[50px] bg-[hsl(var(--popover))]" onClick={() => base44.auth.logout()}>
          <LogOut className="w-4 h-4 text-muted-foreground" />
          Esci dall'account
        </Button>
        <Button variant="outline" className="w-full h-12 justify-start gap-3 text-destructive border-destructive/30 hover:bg-destructive/5 rounded-[50px]" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="w-4 h-4" />
          Richiedi eliminazione account
        </Button>
      </div>

      {/* Settings */}
      <div className="border border-border p-5 space-y-4 bg-[hsl(var(--popover))] rounded-[50px]">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold text-[hsl(var(--primary))]">Impostazioni Allenamento</h2>
        </div>

        {/* Custom rest toggle */}
        <div className="flex items-center justify-between px-4 py-3 bg-[hsl(var(--popover))] text-[hsl(var(--background))] rounded-[50px] border-2 border-[hsl(var(--background))]">
          <div className="flex items-center gap-3">
            <Timer className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Recupero personalizzato</p>
              <p className="text-xs text-muted-foreground mt-0.5">Usa il recupero impostato per ogni esercizio nella scheda</p>
            </div>
          </div>
          <button
            onClick={() => {
              const newVal = !customRestEnabled;
              setCustomRestEnabled(newVal);
              localStorage.setItem("customRestEnabled", String(newVal));
              toast.success(newVal ? "Recupero personalizzato attivato" : "Recupero personalizzato disattivato");
            }}
            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 bg-[hsl(var(--background))] ${customRestEnabled ? "bg-primary" : ""}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${customRestEnabled ? "left-7" : "left-1"}`} />
          </button>
        </div>

        {/* Default rest seconds — shown only when custom rest is ENABLED */}
        {customRestEnabled &&
        <div className="bg-[hsl(var(--background))] rounded-2xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Recupero di default</p>
                <p className="text-xs text-muted-foreground mt-0.5">Secondi usati quando l'esercizio non ha recupero impostato</p>
              </div>
            </div>
            {!editingRest &&
            <button onClick={() => setEditingRest(true)} className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {defaultRestSeconds}s <Pencil className="w-3 h-3 ml-1" />
              </button>
            }
          </div>
          {editingRest &&
          <div className="flex gap-2 items-center">
              <Input
              type="number"
              value={defaultRestSeconds}
              onChange={(e) => setDefaultRestSeconds(e.target.value)}
              placeholder="es. 90"
              className="h-9 rounded-xl flex-1"
              min={10} />
              <span className="text-sm text-muted-foreground shrink-0">secondi</span>
              <Button size="sm" onClick={saveRestDefault} className="rounded-xl h-9 px-4">
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingRest(false)} className="rounded-xl h-9 px-3">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          }
        </div>
        }

        {/* Notifications */}
        <div className="bg-[hsl(var(--background))] rounded-2xl px-4 py-3 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm font-medium">Notifiche</p>
          </div>

          {[
          { key: "workout", label: "Promemoria allenamento" },
          { key: "supplement", label: "Promemoria integratori" },
          { key: "water", label: "Promemoria acqua" }].
          map(({ key, label }) =>
          <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <button
                onClick={() => {
                  if (!notifSettings[key].enabled && notifStatus !== "granted") requestNotifPermission();
                  updateNotif(key, "enabled", !notifSettings[key].enabled);
                }}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${notifSettings[key].enabled ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${notifSettings[key].enabled ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
              {notifSettings[key].enabled &&
            <input
              type="time"
              value={notifSettings[key].time}
              onChange={(e) => updateNotif(key, "time", e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            }
            </div>
          )}

          {notifStatus === "denied" &&
          <p className="text-xs text-destructive flex items-center gap-1">
              <BellOff className="w-3 h-3" /> Notifiche bloccate — abilitale nelle impostazioni del browser
            </p>
          }
          {notifStatus === "default" &&
          <button onClick={requestNotifPermission} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Bell className="w-3 h-3" /> Richiedi permesso notifiche
            </button>
          }
          {notifStatus === "granted" &&
          <p className="text-xs text-accent flex items-center gap-1">
              <Bell className="w-3 h-3" /> Notifiche abilitate
            </p>
          }
        </div>
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