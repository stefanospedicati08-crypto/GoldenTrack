import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Users, ClipboardList, Loader2, FileText, Trash2, Inbox, Check, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    async function load() {
      const [u, p, r] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.WorkoutPlan.list("-created_date", 50),
        base44.entities.SchedaRequest.list("-created_date", 100),
      ]);
      setUsers(u);
      setPlans(p);
      setRequests(r);
      setLoading(false);
    }
    load();
  }, []);

  async function handleUpload() {
    if (!selectedUser || !planTitle || !pdfFile) {
      toast.error("Compila tutti i campi e carica un PDF");
      return;
    }

    setUploading(true);

    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

    const plan = await base44.entities.WorkoutPlan.create({
      title: planTitle,
      description: planDesc || undefined,
      assigned_to: selectedUser,
      status: "active",
      pdf_url: file_url,
    });

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: file_url,
      json_schema: {
        type: "object",
        properties: {
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Nome dell'esercizio" },
                muscle_group: { type: "string", description: "Gruppo muscolare" },
                sets: { type: "number", description: "Numero di serie" },
                reps: { type: "string", description: "Numero di ripetizioni (es. '12', '8-10', '15')" },
                rest_seconds: { type: "number", description: "Recupero in secondi tra le serie" },
                notes: { type: "string", description: "Note aggiuntive sull'esercizio" },
                day_label: { type: "string", description: "Giorno della settimana o nome del giorno (es. 'Giorno A', 'Lunedì', 'Push')" },
              },
            },
          },
        },
      },
    });

    // Deactivate old active plans for this user
    const oldPlans = await base44.entities.WorkoutPlan.filter({ assigned_to: selectedUser, status: "active" });
    await Promise.all(oldPlans.filter(p => p.id !== plan.id).map(p => base44.entities.WorkoutPlan.update(p.id, { status: "archived" })));

    // Notify user
    await base44.entities.Notification.create({
      user_email: selectedUser,
      message: "La nuova programmazione di allenamento è stata consegnata, la si può trovare andando nella sezione schede.",
      read: false,
    });

    if (extracted.status === "success" && extracted.output?.exercises) {
      const exercisesToCreate = extracted.output.exercises.map((ex, i) => ({
        plan_id: plan.id,
        name: ex.name,
        muscle_group: ex.muscle_group || undefined,
        sets: ex.sets || undefined,
        reps: ex.reps || undefined,
        rest_seconds: ex.rest_seconds || undefined,
        notes: ex.notes || undefined,
        day_label: ex.day_label || undefined,
        order_index: i,
      }));
      await base44.entities.Exercise.bulkCreate(exercisesToCreate);
      toast.success(`Scheda creata con ${exercisesToCreate.length} esercizi!`);
    } else {
      toast.success("Scheda creata! Gli esercizi non sono stati estratti automaticamente.");
    }

    setPlans(prev => [plan, ...prev]);
    setPlanTitle("");
    setPlanDesc("");
    setPdfFile(null);
    setSelectedUser("");
    setUploading(false);
  }

  async function handleRequestStatus(id, status) {
    await base44.entities.SchedaRequest.update(id, { status });
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success(status === "approved" ? "Richiesta approvata" : "Richiesta rifiutata");
  }

  async function handleDeletePlan(planId) {
    if (!confirm("Sei sicuro di voler eliminare questa scheda?")) return;
    const exercises = await base44.entities.Exercise.filter({ plan_id: planId });
    await Promise.all(exercises.map(ex => base44.entities.Exercise.delete(ex.id)));
    await base44.entities.WorkoutPlan.delete(planId);
    setPlans(prev => prev.filter(p => p.id !== planId));
    toast.success("Scheda eliminata");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">Gestisci schede e clienti</p>
      </div>

      {/* Richieste Scheda */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Inbox className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">Richieste Scheda</h2>
          <span className="text-sm text-muted-foreground">({requests.filter(r => r.status === "pending").length} in attesa)</span>
        </div>
        {requests.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-muted-foreground text-sm">Nessuna richiesta ricevuta</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 bg-card rounded-xl border border-border p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{req.user_name || req.user_email}</p>
                    <span className="text-xs text-muted-foreground">{req.user_email}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      req.status === "pending" ? "bg-chart-3/10 text-chart-3" :
                      req.status === "approved" ? "bg-accent/10 text-accent" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {req.status === "pending" ? "In attesa" : req.status === "approved" ? "Approvata" : "Rifiutata"}
                    </span>
                  </div>
                  {req.notes && (
                    <p className="text-sm text-muted-foreground mt-1 italic">"{req.notes}"</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(req.created_date).toLocaleDateString("it-IT")}</p>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleRequestStatus(req.id, "approved")} className="h-8 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90">
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRequestStatus(req.id, "rejected")} className="h-8 rounded-lg text-destructive hover:bg-destructive/10">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Upload new plan */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-lg">Carica Nuova Scheda</h2>
            <p className="text-sm text-muted-foreground">Carica un PDF e verrà estratto automaticamente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Cliente</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Seleziona cliente" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Titolo Scheda</label>
            <Input
              placeholder="es. Scheda Massa - Fase 1"
              value={planTitle}
              onChange={e => setPlanTitle(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Descrizione (opzionale)</label>
          <Input
            placeholder="Descrizione del programma..."
            value={planDesc}
            onChange={e => setPlanDesc(e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">File PDF</label>
          <input
            type="file"
            accept=".pdf"
            onChange={e => setPdfFile(e.target.files[0])}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer"
          />
          {pdfFile && (
            <p className="text-sm text-accent mt-2 flex items-center gap-1">
              <FileText className="w-4 h-4" /> {pdfFile.name}
            </p>
          )}
        </div>

        <Button onClick={handleUpload} disabled={uploading} className="h-11 rounded-xl px-8">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Estrazione in corso...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Carica e Crea Scheda
            </>
          )}
        </Button>
      </motion.div>

      {/* Existing plans */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">Schede Esistenti</h2>
          <span className="text-sm text-muted-foreground">({plans.length})</span>
        </div>
        {plans.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <p className="text-muted-foreground">Nessuna scheda creata</p>
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 bg-card rounded-xl border border-border p-4"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {plan.assigned_to} · {plan.status}
                  </p>
                </div>
                {plan.pdf_url && (
                  <a href={plan.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                    <FileText className="w-5 h-5" />
                  </a>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDeletePlan(plan.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Users list */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">Clienti Registrati</h2>
          <span className="text-sm text-muted-foreground">({users.length})</span>
        </div>
        <div className="space-y-2">
          {users.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 bg-card rounded-xl border border-border p-4"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {u.full_name?.[0] || u.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{u.full_name || "—"}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </div>
              <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {u.role || "user"}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}