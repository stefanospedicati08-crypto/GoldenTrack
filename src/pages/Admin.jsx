import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Upload, Users, ClipboardList, Loader2, FileText, Trash2, Inbox, Check, X, Download, Image, Search, ArrowRight, UserX, RefreshCw } from "lucide-react";
import AdminNotifications from "../components/AdminNotifications";
import TrainerRequests from "../components/TrainerRequests";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

function downloadCSV(rows, filename) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Section({ children, className = "" }) {
  return (
    <div className={`bg-white/5 border border-white/8 rounded-2xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [gymSettings, setGymSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reprocessingPlan, setReprocessingPlan] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [uploadingWatermark, setUploadingWatermark] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    async function load() {
      const [u, p, r, gs] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.WorkoutPlan.list("-created_date", 50),
        base44.entities.SchedaRequest.list("created_date", 100),
        base44.entities.GymSettings.list(),
      ]);
      setUsers([...u].sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email)));
      setPlans(p);
      setRequests(r);
      setGymSettings(gs[0] || null);
      setLoading(false);
    }
    load();
  }, []);

  async function handleUpload() {
    if (!selectedUser || !pdfFile) { toast.error("Seleziona un cliente e carica un PDF"); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    const plan = await base44.entities.WorkoutPlan.create({
      title: planTitle || `Scheda ${new Date().toLocaleDateString("it-IT")}`,
      description: planDesc || undefined,
      assigned_to: selectedUser,
      status: "active",
      pdf_url: file_url,
    });
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          exercises: {
            type: "array",
            description: "Lista di tutti gli esercizi. SUPERSET: stessa lettera (A, B, C...) nel campo superset_key.",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                muscle_group: { type: "string" },
                sets: { type: "number" },
                reps: { type: "string" },
                rest_seconds: { type: "number" },
                notes: { type: "string" },
                superset_key: { type: "string" },
                day_label: { type: "string" },
              },
            },
          },
        },
      },
    });
    const oldPlans = await base44.entities.WorkoutPlan.filter({ assigned_to: selectedUser, status: "active" });
    await Promise.all(oldPlans.filter(p => p.id !== plan.id).map(p => base44.entities.WorkoutPlan.update(p.id, { status: "archived" })));
    await base44.entities.Notification.create({
      user_email: selectedUser,
      message: "La nuova programmazione di allenamento è stata consegnata, la si può trovare andando nella sezione schede.",
      read: false,
    });
    const pendingReqs = requests.filter(r => r.user_email === selectedUser && r.status === "pending");
    await Promise.all(pendingReqs.map(r => base44.entities.SchedaRequest.delete(r.id)));
    setRequests(prev => prev.filter(r => !(r.user_email === selectedUser && r.status === "pending")));
    if (extracted.status === "success" && extracted.output?.exercises) {
      const exercisesToCreate = extracted.output.exercises.map((ex, i) => ({
        plan_id: plan.id,
        name: ex.name,
        muscle_group: ex.muscle_group || undefined,
        sets: ex.sets || undefined,
        reps: ex.reps || undefined,
        rest_seconds: ex.rest_seconds || undefined,
        notes: ex.superset_key ? ex.superset_key.toUpperCase() : (ex.notes || undefined),
        day_label: ex.day_label || undefined,
        order_index: i,
      }));
      await base44.entities.Exercise.bulkCreate(exercisesToCreate);
      toast.success(`Scheda creata con ${exercisesToCreate.length} esercizi!`);
    } else {
      toast.success("Scheda creata!");
    }
    setPlans(prev => [plan, ...prev]);
    setPlanTitle(""); setPlanDesc(""); setPdfFile(null); setSelectedUser("");
    setUploading(false);
  }

  async function handleRequestStatus(req, status) {
    await base44.entities.SchedaRequest.update(req.id, { status });
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status } : r));
    const nextMonday = (() => {
      const d = new Date(); const day = d.getDay();
      const diff = day === 0 ? 1 : 8 - day; d.setDate(d.getDate() + diff);
      return moment(d).format("D MMMM");
    })();
    const message = status === "approved"
      ? `La tua scheda è in elaborazione, sarà pronta lunedì ${nextMonday}. Buon allenamento! 💪`
      : "Ci dispiace, la richiesta del tuo rinnovo scheda non è stata approvata. Per maggiori info chiedere in segreteria.";
    await base44.entities.Notification.create({ user_email: req.user_email, message, read: false });
    toast.success(status === "approved" ? "Richiesta approvata" : "Richiesta rifiutata");
  }

  async function handleDeleteUser(userId, userEmail) {
    if (!confirm(`Sei sicuro di voler eliminare l'account di ${userEmail}?`)) return;
    const [userPlans, userWeights, userSessions, userLogs, userNotifs] = await Promise.all([
      base44.entities.WorkoutPlan.filter({ assigned_to: userEmail }),
      base44.entities.BodyWeight.filter({ created_by: userEmail }),
      base44.entities.WorkoutSession.filter({ created_by: userEmail }),
      base44.entities.WorkoutLog.filter({ created_by: userEmail }),
      base44.entities.Notification.filter({ user_email: userEmail }),
    ]);
    await Promise.all([
      ...userPlans.map(p => base44.entities.WorkoutPlan.delete(p.id)),
      ...userWeights.map(w => base44.entities.BodyWeight.delete(w.id)),
      ...userSessions.map(s => base44.entities.WorkoutSession.delete(s.id)),
      ...userLogs.map(l => base44.entities.WorkoutLog.delete(l.id)),
      ...userNotifs.map(n => base44.entities.Notification.delete(n.id)),
    ]);
    await base44.entities.User.delete(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast.success("Account eliminato");
  }

  async function handleReprocessPlan(plan) {
    if (!plan.pdf_url) { toast.error("Nessun PDF associato a questa scheda"); return; }
    setReprocessingPlan(plan.id);
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: plan.pdf_url,
      json_schema: {
        type: "object",
        properties: {
          exercises: {
            type: "array",
            description: "Lista di tutti gli esercizi. SUPERSET: stessa lettera nel campo superset_key.",
            items: { type: "object", properties: { name: { type: "string" }, muscle_group: { type: "string" }, sets: { type: "number" }, reps: { type: "string" }, rest_seconds: { type: "number" }, notes: { type: "string" }, superset_key: { type: "string" }, day_label: { type: "string" } } },
          },
        },
      },
    });
    if (extracted.status === "success" && extracted.output?.exercises) {
      const oldExercises = await base44.entities.Exercise.filter({ plan_id: plan.id });
      await Promise.all(oldExercises.map(ex => base44.entities.Exercise.delete(ex.id)));
      const exercisesToCreate = extracted.output.exercises.map((ex, i) => ({
        plan_id: plan.id, name: ex.name, muscle_group: ex.muscle_group || undefined,
        sets: ex.sets || undefined, reps: ex.reps || undefined, rest_seconds: ex.rest_seconds || undefined,
        notes: ex.superset_key ? ex.superset_key.toUpperCase() : (ex.notes || undefined),
        day_label: ex.day_label || undefined, order_index: i,
      }));
      await base44.entities.Exercise.bulkCreate(exercisesToCreate);
      toast.success(`Scheda ri-elaborata con ${exercisesToCreate.length} esercizi!`);
    } else { toast.error("Errore durante l'estrazione"); }
    setReprocessingPlan(null);
  }

  async function handleDeletePlan(planId) {
    if (!confirm("Sei sicuro di voler eliminare questa scheda?")) return;
    const exercises = await base44.entities.Exercise.filter({ plan_id: planId });
    await Promise.all(exercises.map(ex => base44.entities.Exercise.delete(ex.id)));
    await base44.entities.WorkoutPlan.delete(planId);
    setPlans(prev => prev.filter(p => p.id !== planId));
    toast.success("Scheda eliminata");
  }

  async function handleWatermarkUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    setUploadingWatermark(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (gymSettings) {
      await base44.entities.GymSettings.update(gymSettings.id, { watermark_url: file_url });
      setGymSettings(prev => ({ ...prev, watermark_url: file_url }));
    } else {
      const gs = await base44.entities.GymSettings.create({ watermark_url: file_url });
      setGymSettings(gs);
    }
    setUploadingWatermark(false);
    toast.success("Filigrana aggiornata!");
  }

  function exportRequests() {
    const rows = [["Nome", "Email", "Note", "Data", "Stato"]];
    requests.forEach(r => rows.push([r.user_name || "", r.user_email, r.notes || "", new Date(r.created_date).toLocaleDateString("it-IT"), r.status]));
    downloadCSV(rows, "richieste_schede.csv");
  }

  function exportClients() {
    const rows = [["Nome", "Email", "Anno di Nascita"]];
    users.forEach(u => rows.push([u.full_name || "", u.email, u.birth_year || ""]));
    downloadCSV(rows, "clienti.csv");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
    </div>
  );

  const inputCls = "h-11 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#fcd12a]/30";

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-white/40 text-sm mt-0.5">Gestisci schede e clienti</p>
      </div>

      <TrainerRequests />

      {/* Richieste Scheda */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Inbox className="w-5 h-5 text-[#fcd12a]" />
          <h2 className="font-heading font-semibold text-lg text-white flex-1">Richieste Scheda</h2>
          <span className="text-sm text-white/40">({requests.filter(r => r.status === "pending").length} in attesa)</span>
          <button onClick={exportRequests} className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-white/6 border border-white/10 text-white/60 hover:text-white text-xs font-medium transition-colors">
            <Download className="w-3.5 h-3.5" /> Esporta CSV
          </button>
        </div>
        {requests.length === 0 ? (
          <Section><p className="text-white/35 text-sm text-center py-6">Nessuna richiesta ricevuta</p></Section>
        ) : (
          <div className="space-y-2">
            {requests.map((req, i) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 bg-white/4 border border-white/8 rounded-2xl p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-white">{req.user_name || req.user_email}</p>
                    <span className="text-xs text-white/40">{req.user_email}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${req.status === "pending" ? "bg-orange-400/10 text-orange-400" : req.status === "approved" ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
                      {req.status === "pending" ? "In attesa" : req.status === "approved" ? "Approvata" : "Rifiutata"}
                    </span>
                  </div>
                  {req.notes && <p className="text-sm text-white/40 mt-1 italic">"{req.notes}"</p>}
                  <p className="text-xs text-white/25 mt-1">{new Date(req.created_date).toLocaleDateString("it-IT")}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {req.status === "pending" && (
                    <>
                      <button onClick={() => handleRequestStatus(req, "approved")} className="w-8 h-8 rounded-xl bg-green-400/15 text-green-400 hover:bg-green-400/25 flex items-center justify-center transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleRequestStatus(req, "rejected")} className="w-8 h-8 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-400/20 flex items-center justify-center transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button onClick={async () => { await base44.entities.SchedaRequest.delete(req.id); setRequests(prev => prev.filter(r => r.id !== req.id)); toast.success("Richiesta eliminata"); }}
                    className="w-8 h-8 rounded-xl bg-white/5 text-white/30 hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Upload new plan */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#fcd12a]/12 flex items-center justify-center">
            <Upload className="w-5 h-5 text-[#fcd12a]" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-base text-white">Carica Nuova Scheda</h2>
            <p className="text-xs text-white/40 mt-0.5">Carica un PDF — gli esercizi vengono estratti automaticamente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2 block">Cliente *</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="h-11 rounded-2xl bg-white/5 border-white/10 text-white data-[placeholder]:text-white/30">
                <SelectValue placeholder="Seleziona cliente" />
              </SelectTrigger>
              <SelectContent className="bg-[#1c1f28] border-white/10 text-white">
                {users.map(u => <SelectItem key={u.id} value={u.email} className="text-white focus:bg-white/8 focus:text-white">{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2 block">Titolo <span className="text-white/20 font-normal">(opzionale)</span></label>
            <Input placeholder="es. Scheda Massa - Fase 1" value={planTitle} onChange={e => setPlanTitle(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2 block">Descrizione <span className="text-white/20 font-normal">(opzionale)</span></label>
          <Input placeholder="Descrizione del programma..." value={planDesc} onChange={e => setPlanDesc(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2 block">File PDF *</label>
          <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])}
            className="block w-full text-sm text-white/40 file:mr-4 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-semibold file:bg-[#fcd12a] file:text-black hover:file:bg-[#fcd12a]/90 file:cursor-pointer cursor-pointer" />
          {pdfFile && <p className="text-sm text-green-400 mt-2 flex items-center gap-1.5"><FileText className="w-4 h-4" /> {pdfFile.name}</p>}
        </div>

        <button onClick={handleUpload} disabled={uploading}
          className="flex items-center justify-center gap-2 h-12 px-8 rounded-2xl bg-[#fcd12a] text-black font-bold text-sm hover:bg-[#fcd12a]/90 disabled:opacity-50 transition-all">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Estrazione in corso...</> : <><Upload className="w-4 h-4" />Carica e Crea Scheda</>}
        </button>
      </motion.div>

      {/* Schede esistenti */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-[#fcd12a]" />
          <h2 className="font-heading font-semibold text-base text-white flex-1">Schede Esistenti</h2>
          <span className="text-sm text-white/35">({plans.length})</span>
        </div>
        {plans.length === 0 ? (
          <Section><p className="text-white/35 text-center py-6 text-sm">Nessuna scheda creata</p></Section>
        ) : (
          <div className="space-y-2">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 bg-white/4 border border-white/8 rounded-2xl p-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white">{plan.title}</h3>
                  <p className="text-sm text-white/40 truncate">{plan.assigned_to} · {plan.status}</p>
                </div>
                {plan.pdf_url && (
                  <a href={plan.pdf_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-xl text-[#fcd12a]/60 hover:text-[#fcd12a] hover:bg-[#fcd12a]/10 transition-colors">
                    <FileText className="w-4 h-4" />
                  </a>
                )}
                {plan.pdf_url && (
                  <button onClick={() => handleReprocessPlan(plan)} disabled={reprocessingPlan === plan.id}
                    className="p-1.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors">
                    {reprocessingPlan === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </button>
                )}
                <button onClick={() => handleDeletePlan(plan.id)}
                  className="p-1.5 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Filigrana */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Image className="w-5 h-5 text-[#fcd12a]" />
          <h2 className="font-heading font-semibold text-base text-white">Filigrana Benvenuto</h2>
        </div>
        <Section>
          <div className="p-5 space-y-3">
            {gymSettings?.watermark_url && (
              <img src={gymSettings.watermark_url} alt="filigrana" className="h-20 object-contain rounded-xl border border-white/8" />
            )}
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleWatermarkUpload} className="hidden" />
                <span className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl bg-white/8 border border-white/10 text-white/70 hover:text-white hover:bg-white/12 text-sm font-medium cursor-pointer transition-colors">
                  {uploadingWatermark ? <><Loader2 className="w-4 h-4 animate-spin" />Caricamento...</> : <><Upload className="w-4 h-4" />Carica Filigrana</>}
                </span>
              </label>
              <p className="text-xs text-white/30">PNG/SVG con sfondo trasparente</p>
            </div>
          </div>
        </Section>
      </div>

      {/* Invio Notifiche */}
      <AdminNotifications users={users} />

      {/* Clienti */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Users className="w-5 h-5 text-[#fcd12a]" />
          <h2 className="font-heading font-semibold text-base text-white flex-1">Clienti Registrati</h2>
          <span className="text-sm text-white/35">({users.length})</span>
          <button onClick={exportClients} className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-white/6 border border-white/10 text-white/60 hover:text-white text-xs font-medium transition-colors">
            <Download className="w-3.5 h-3.5" /> Esporta CSV
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input placeholder="Cerca cliente..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
            className="pl-10 h-11 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/30" />
        </div>
        <div className="space-y-2">
          {users.filter(u =>
            !userSearch ||
            u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase())
          ).map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-full bg-[#fcd12a]/15 flex items-center justify-center text-sm font-bold text-[#fcd12a] shrink-0">
                {u.full_name?.[0] || u.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{u.full_name || "—"}</p>
                <p className="text-sm text-white/40 truncate">{u.email}</p>
                {u.birth_year && <p className="text-xs text-white/25">Nato nel {u.birth_year}</p>}
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/8 text-white/50 shrink-0">{u.role || "user"}</span>
              <a href={`/cliente/${encodeURIComponent(u.email)}`}
                className="flex items-center gap-1 text-xs text-[#fcd12a]/70 font-medium hover:text-[#fcd12a] transition-colors shrink-0">
                Dettagli <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => handleDeleteUser(u.id, u.email)}
                className="p-1.5 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0">
                <UserX className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}