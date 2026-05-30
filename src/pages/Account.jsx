import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2, LogOut, AlertTriangle, X, Pencil, Check, Ruler, Weight,
  Camera, Loader2, Plus, ChevronDown, ChevronUp, Pill, Upload,
  FileText, Settings, Timer, Bell, BellOff, CalendarDays, ChevronRight
} from "lucide-react";
import GoalCalendar from "../components/GoalCalendar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ── Apple-style toggle ──────────────────────────────────────────────────────
function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-12 h-7 rounded-full transition-all duration-200 shrink-0 ${
        enabled ? "bg-[#fcd12a]" : "bg-white/10"
      }`}
    >
      <span
        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
          enabled ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────
function Section({ children, className = "" }) {
  return (
    <div className={`bg-white/5 border border-white/8 rounded-3xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

// ── Row item ────────────────────────────────────────────────────────────────
function Row({ icon, iconBg = "bg-white/10", label, sublabel, right, onClick, first, last, danger }) {
  const base = `flex items-center gap-3.5 px-4 py-3.5 transition-colors ${
    onClick ? "cursor-pointer active:bg-white/5" : ""
  } ${danger ? "text-red-400" : ""}`;
  const border = !last ? "border-b border-white/6" : "";
  return (
    <div className={`${base} ${border}`} onClick={onClick}>
      {icon && (
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? "text-red-400" : "text-white"}`}>{label}</p>
        {sublabel && <p className="text-xs text-white/40 mt-0.5">{sublabel}</p>}
      </div>
      {right}
      {onClick && !right && <ChevronRight className="w-4 h-4 text-white/25 shrink-0" />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function Account() {
  const [user, setUser] = useState(null);
  const [latestWeight, setLatestWeight] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef(null);
  const mealRef = useRef(null);

  const [editingBody, setEditingBody] = useState(false);
  const [heightVal, setHeightVal] = useState("");
  const [savingBody, setSavingBody] = useState(false);

  const [supplements, setSupplements] = useState([]);
  const [showSupps, setShowSupps] = useState(false);
  const [newSupp, setNewSupp] = useState({ name: "", dose: "", timing: "" });
  const [addingSupp, setAddingSupp] = useState(false);
  const [savingSupp, setSavingSupp] = useState(false);

  const [uploadingMeal, setUploadingMeal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customRestEnabled, setCustomRestEnabled] = useState(false);
  const [rpePerSetEnabled, setRpePerSetEnabled] = useState(false);
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
      setCustomRestEnabled(localStorage.getItem("customRestEnabled") === "true");
      setRpePerSetEnabled(localStorage.getItem("rpePerSetEnabled") === "true");
      const savedDefault = localStorage.getItem("defaultRestSeconds");
      if (savedDefault) setDefaultRestSeconds(savedDefault);
      const saved = localStorage.getItem("notifSettings");
      if (saved) setNotifSettings(JSON.parse(saved));
      if ("Notification" in window) setNotifStatus(Notification.permission);
      const [weights, supps] = await Promise.all([
        base44.entities.BodyWeight.filter({ created_by: u.email }, "-date", 1),
        base44.entities.Supplement.filter({ created_by: u.email })
      ]);
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
    if (!("Notification" in window)) { toast.error("Browser non supporta notifiche"); return; }
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
    if (permission === "granted") toast.success("Notifiche abilitate!");
    else toast.error("Permesso negato.");
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
    if (!val || val < 10) { toast.error("Inserisci un valore valido (min 10s)"); return; }
    localStorage.setItem("defaultRestSeconds", String(val));
    setEditingRest(false);
    toast.success(`Recupero default: ${val}s`);
  }

  const bmi = latestWeight && user?.height_cm
    ? (latestWeight / Math.pow(user.height_cm / 100, 2)).toFixed(1)
    : null;

  const initials = user?.full_name
    ? user.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-10">

      {/* ── Hero profile ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center pt-6 pb-4 gap-3"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-full ring-4 ring-[#fcd12a]/40 overflow-hidden bg-white/10 flex items-center justify-center text-3xl font-bold text-[#fcd12a]">
            {user?.photo_url
              ? <img src={user.photo_url} alt="foto" className="w-full h-full object-cover" />
              : initials}
          </div>
          <button
            onClick={() => photoRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#fcd12a] rounded-full flex items-center justify-center shadow-lg"
          >
            {uploadingPhoto
              ? <Loader2 className="w-4 h-4 text-black animate-spin" />
              : <Camera className="w-4 h-4 text-black" />}
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        <div className="text-center">
          <p className="text-xl font-heading font-bold text-white">{user?.full_name || "—"}</p>
          <p className="text-sm text-white/50 mt-0.5">{user?.email}</p>
          <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-[#fcd12a]/15 text-[#fcd12a] text-xs font-medium capitalize">
            {user?.role || "user"}
          </span>
        </div>
      </motion.div>

      {/* ── Body stats ── */}
      <Section>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Dati Corporei</p>
          {!editingBody
            ? <button onClick={() => setEditingBody(true)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <Pencil className="w-3.5 h-3.5 text-white/40" />
              </button>
            : <button onClick={() => setEditingBody(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>}
        </div>
        {editingBody ? (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Altezza (cm)</label>
              <Input type="number" placeholder="es. 175" value={heightVal} onChange={(e) => setHeightVal(e.target.value)} className="h-11 rounded-2xl bg-white/5 border-white/10 text-white" />
            </div>
            <p className="text-xs text-white/30">Il peso si aggiorna automaticamente dalla sezione Peso.</p>
            <Button onClick={handleSaveBody} disabled={savingBody} className="w-full h-11 rounded-2xl bg-[#fcd12a] text-black font-semibold hover:bg-[#fcd12a]/90">
              {savingBody ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1.5" />Salva</>}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-white/6 mx-0 mb-0">
            {[
              { label: "Peso", value: latestWeight ?? "—", unit: "kg", icon: <Weight className="w-4 h-4" /> },
              { label: "Altezza", value: user?.height_cm ?? "—", unit: "cm", icon: <Ruler className="w-4 h-4" /> },
              { label: "BMI", value: bmi ?? "—", unit: "indice", icon: null },
            ].map(({ label, value, unit, icon }) => (
              <div key={label} className="bg-white/5 flex flex-col items-center justify-center py-4 gap-1">
                {icon && <div className="text-white/30">{icon}</div>}
                <p className="text-2xl font-heading font-bold text-[#fcd12a]">{value}</p>
                <p className="text-[11px] text-white/35">{unit}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Calendario obiettivi ── */}
      <Section>
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#fcd12a]" />
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Calendario Obiettivi</p>
        </div>
        <div className="px-4 pb-4 pt-2">
          <GoalCalendar />
        </div>
      </Section>

      {/* ── Piano alimentare ── */}
      <Section>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Piano Alimentare</p>
          <button
            onClick={() => mealRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-[#fcd12a] font-medium px-3 py-1.5 bg-[#fcd12a]/10 rounded-xl hover:bg-[#fcd12a]/20 transition-colors"
          >
            {uploadingMeal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {user?.meal_plan_url ? "Aggiorna" : "Carica"}
          </button>
          <input ref={mealRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleMealUpload} />
        </div>
        <div className="px-4 pb-4">
          {user?.meal_plan_url
            ? <a href={user.meal_plan_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-2xl p-3.5 hover:bg-white/8 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-[#fcd12a]/15 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#fcd12a]" />
                </div>
                <span className="text-sm font-medium text-white flex-1">Visualizza piano alimentare</span>
                <ChevronRight className="w-4 h-4 text-white/25" />
              </a>
            : <p className="text-sm text-white/35 py-2">Nessun piano caricato. Carica un'immagine o PDF.</p>}
        </div>
      </Section>

      {/* ── Integratori ── */}
      <Section>
        <button
          onClick={() => setShowSupps(!showSupps)}
          className="w-full flex items-center px-4 py-4 gap-3.5 hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
            <Pill className="w-4 h-4 text-accent" />
          </div>
          <span className="flex-1 text-left text-sm font-medium text-white">Integratori</span>
          {supplements.length > 0 && (
            <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full font-medium">{supplements.length}</span>
          )}
          {showSupps ? <ChevronUp className="w-4 h-4 text-white/25" /> : <ChevronDown className="w-4 h-4 text-white/25" />}
        </button>
        <AnimatePresence>
          {showSupps && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="border-t border-white/6 px-4 pb-4 pt-3 space-y-2">
                {supplements.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 bg-white/5 rounded-2xl px-3.5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{s.name}</p>
                      {(s.dose || s.timing) && <p className="text-xs text-white/40 mt-0.5">{[s.dose, s.timing].filter(Boolean).join(" · ")}</p>}
                    </div>
                    <button onClick={() => handleDeleteSupp(s.id)} className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {addingSupp ? (
                  <div className="space-y-2 pt-1">
                    <Input placeholder="Nome integratore *" value={newSupp.name} onChange={(e) => setNewSupp((p) => ({ ...p, name: e.target.value }))} className="h-10 rounded-2xl bg-white/5 border-white/10 text-white" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Dosaggio (es. 5g)" value={newSupp.dose} onChange={(e) => setNewSupp((p) => ({ ...p, dose: e.target.value }))} className="h-10 rounded-2xl bg-white/5 border-white/10 text-white" />
                      <Input placeholder="Quando (es. mattina)" value={newSupp.timing} onChange={(e) => setNewSupp((p) => ({ ...p, timing: e.target.value }))} className="h-10 rounded-2xl bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddSupp} disabled={!newSupp.name || savingSupp} className="flex-1 h-10 rounded-2xl bg-[#fcd12a] text-black font-semibold hover:bg-[#fcd12a]/90">
                        {savingSupp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAddingSupp(false)} className="h-10 rounded-2xl border-white/15 text-white hover:bg-white/5">Annulla</Button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingSupp(true)} className="w-full flex items-center justify-center gap-2 h-10 rounded-2xl bg-white/5 hover:bg-white/8 text-white/60 hover:text-white text-sm font-medium transition-colors border border-dashed border-white/15">
                    <Plus className="w-4 h-4" /> Aggiungi integratore
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      {/* ── Impostazioni allenamento ── */}
      <Section>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center px-4 py-4 gap-3.5 hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4 text-white/60" />
          </div>
          <span className="flex-1 text-left text-sm font-medium text-white">Impostazioni Allenamento</span>
          {showSettings ? <ChevronUp className="w-4 h-4 text-white/25" /> : <ChevronDown className="w-4 h-4 text-white/25" />}
        </button>
        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="border-t border-white/6">

                {/* Recupero personalizzato */}
                <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-white/6">
                  <div className="w-8 h-8 rounded-xl bg-[#fcd12a]/15 flex items-center justify-center shrink-0">
                    <Timer className="w-4 h-4 text-[#fcd12a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Recupero personalizzato</p>
                    <p className="text-xs text-white/35 mt-0.5">Usa il recupero impostato per ogni esercizio</p>
                  </div>
                  <Toggle enabled={customRestEnabled} onToggle={() => {
                    const val = !customRestEnabled;
                    setCustomRestEnabled(val);
                    localStorage.setItem("customRestEnabled", String(val));
                    toast.success(val ? "Recupero personalizzato attivato" : "Disattivato");
                  }} />
                </div>

                {/* Default rest seconds */}
                <AnimatePresence>
                  {customRestEnabled && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/6 bg-white/3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-white/60">Secondi di default</p>
                          {!editingRest ? (
                            <button onClick={() => setEditingRest(true)} className="flex items-center gap-1.5 text-sm font-semibold text-[#fcd12a] bg-[#fcd12a]/10 px-3 py-1 rounded-full">
                              {defaultRestSeconds}s <Pencil className="w-3 h-3 ml-0.5" />
                            </button>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <Input type="number" value={defaultRestSeconds} onChange={(e) => setDefaultRestSeconds(e.target.value)} className="h-8 w-20 rounded-xl bg-white/5 border-white/10 text-white text-sm" min={10} />
                              <span className="text-xs text-white/40">s</span>
                              <Button size="sm" onClick={saveRestDefault} className="h-8 rounded-xl bg-[#fcd12a] text-black px-3"><Check className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingRest(false)} className="h-8 rounded-xl border-white/15 text-white px-2"><X className="w-3.5 h-3.5" /></Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* RPE per serie */}
                <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-white/6">
                  <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center shrink-0 text-base">💪</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">RPE per serie</p>
                    <p className="text-xs text-white/35 mt-0.5">Registra la difficoltà percepita (1-10)</p>
                  </div>
                  <Toggle enabled={rpePerSetEnabled} onToggle={() => {
                    const val = !rpePerSetEnabled;
                    setRpePerSetEnabled(val);
                    localStorage.setItem("rpePerSetEnabled", String(val));
                    toast.success(val ? "RPE per serie attivato" : "Disattivato");
                  }} />
                </div>

                {/* Notifiche */}
                <div className="px-4 pt-3.5 pb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-4 h-4 text-[#fcd12a]" />
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Notifiche</p>
                    {notifStatus === "denied" && <span className="text-xs text-red-400 ml-auto flex items-center gap-1"><BellOff className="w-3 h-3" /> Bloccate</span>}
                    {notifStatus === "granted" && <span className="text-xs text-green-400 ml-auto">Abilitate ✓</span>}
                    {notifStatus === "default" && (
                      <button onClick={requestNotifPermission} className="text-xs text-[#fcd12a] hover:underline ml-auto">Abilita</button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {[
                      { key: "workout", label: "Allenamento" },
                      { key: "supplement", label: "Integratori" },
                      { key: "water", label: "Acqua" }
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-white/70">{label}</span>
                          <Toggle enabled={notifSettings[key].enabled} onToggle={() => {
                            if (!notifSettings[key].enabled && notifStatus !== "granted") requestNotifPermission();
                            updateNotif(key, "enabled", !notifSettings[key].enabled);
                          }} />
                        </div>
                        {notifSettings[key].enabled && (
                          <input
                            type="time"
                            value={notifSettings[key].time}
                            onChange={(e) => updateNotif(key, "time", e.target.value)}
                            className="w-full h-9 px-3 mb-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#fcd12a]/50"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      {/* ── Azioni account ── */}
      <Section>
        <Row
          icon={<LogOut className="w-4 h-4 text-white/60" />}
          label="Esci dall'account"
          onClick={() => base44.auth.logout()}
          first last={false}
        />
        <Row
          icon={<Trash2 className="w-4 h-4 text-red-400" />}
          iconBg="bg-red-400/10"
          label="Richiedi eliminazione account"
          danger
          onClick={() => setShowDeleteDialog(true)}
          last
        />
      </Section>

      <p className="text-xs text-white/20 text-center pb-2">Golden Track v1.0 · Conforme alle linee guida App Store</p>

      {/* ── Delete dialog ── */}
      <AnimatePresence>
        {showDeleteDialog && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="bg-[#1a1d25] rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 w-full sm:max-w-sm shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-white flex-1">Elimina Account</h3>
                <button onClick={() => { setShowDeleteDialog(false); setConfirmText(""); }} className="p-1.5 rounded-xl hover:bg-white/5">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
              <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-3.5 text-sm text-white/60 leading-relaxed">
                Questa azione invierà una richiesta di eliminazione del tuo account e <strong className="text-white/80">tutti i tuoi dati</strong>. Completata entro 30 giorni.
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70 block">Scrivi <strong className="text-white">ELIMINA</strong> per confermare</label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ELIMINA" className="h-11 rounded-2xl bg-white/5 border-white/10 text-white" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11 rounded-2xl border-white/15 text-white hover:bg-white/5" onClick={() => { setShowDeleteDialog(false); setConfirmText(""); }}>Annulla</Button>
                <Button className="flex-1 h-11 rounded-2xl bg-red-500 text-white hover:bg-red-500/90 font-semibold" disabled={confirmText !== "ELIMINA" || deleting} onClick={handleDeleteRequest}>
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Conferma"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}