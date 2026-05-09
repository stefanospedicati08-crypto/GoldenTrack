import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingDown, TrendingUp, Minus, Trash2, Camera, X, MoreVertical, Pencil, Check, ChevronDown, ChevronUp } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function Peso() {
  const [weights, setWeights] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newWeight, setNewWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showChart, setShowChart] = useState(false);
  const [showResetMenu, setShowResetMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const photoInputRef = useRef(null);
  const [photoForId, setPhotoForId] = useState(null);

  const [goal, setGoal] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      setUser(u);
      setGoal(u.weight_goal ? String(u.weight_goal) : "");
      setGoalDate(u.weight_goal_date || "");
      const w = await base44.entities.BodyWeight.filter({ created_by: u.email }, "-date", 100);
      setWeights(w);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!newWeight) return;
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const optimistic = { id: `tmp-${Date.now()}`, weight_kg: Number(newWeight), date: today, notes: notes || undefined };
    setWeights(prev => [optimistic, ...prev]);
    setNewWeight("");
    setNotes("");
    const entry = await base44.entities.BodyWeight.create({ weight_kg: optimistic.weight_kg, date: today, notes: optimistic.notes });
    setWeights(prev => prev.map(w => w.id === optimistic.id ? entry : w));
    setSaving(false);
  }

  async function handleDelete(id) {
    await base44.entities.BodyWeight.delete(id);
    setWeights(prev => prev.filter(w => w.id !== id));
  }

  async function handleReset() {
    setSaving(true);
    await Promise.all(weights.map(w => base44.entities.BodyWeight.delete(w.id)));
    setWeights([]);
    setShowResetConfirm(false);
    setShowResetMenu(false);
    setSaving(false);
  }

  async function handlePhotoUpload(e, weightId) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(weightId);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.BodyWeight.update(weightId, { photo_url: file_url });
    setWeights(prev => prev.map(w => w.id === weightId ? { ...w, photo_url: file_url } : w));
    setUploadingPhoto(null);
    setPhotoForId(null);
  }

  async function handleSaveGoal() {
    setSavingGoal(true);
    await base44.auth.updateMe({ weight_goal: goal ? Number(goal) : undefined, weight_goal_date: goalDate || undefined });
    setSavingGoal(false);
    setEditingGoal(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.slice(-30).map(w => ({ date: moment(w.date).format("DD/MM"), kg: w.weight_kg }));
  const latest = weights[0]?.weight_kg;
  const previous = weights[1]?.weight_kg;
  const diff = latest && previous ? (latest - previous).toFixed(1) : null;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Peso Corporeo</h1>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">Non perderti l'opportunità di avere a portata di click le progressioni e il monitoraggio del tuo peso corporeo.</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowResetMenu(!showResetMenu)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
          <AnimatePresence>
            {showResetMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-10 bg-card border border-border rounded-xl shadow-xl z-20 min-w-[180px] overflow-hidden">
                <button onClick={() => { setShowResetMenu(false); setShowResetConfirm(true); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4" /> Reset storico peso
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Reset confirm */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="bg-card rounded-t-2xl sm:rounded-2xl border border-border p-6 w-full sm:max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-heading font-semibold text-lg">Attenzione</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Se si vuole effettuare il reset del peso <strong>tutti i dati presenti nello storico verranno cancellati</strong> e non sarà più possibile recuperarli.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowResetConfirm(false)} className="rounded-xl">Annulla</Button>
                <Button onClick={handleReset} disabled={saving} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <Trash2 className="w-4 h-4 mr-1" /> Conferma Reset
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          onDoubleClick={() => setShowHistory(v => !v)}
          className="bg-card rounded-2xl border border-border p-5 cursor-pointer select-none"
        >
          <p className="text-sm text-muted-foreground">Peso Attuale</p>
          <p className="text-3xl font-heading font-bold mt-1">{latest || "—"}</p>
          <p className="text-xs text-muted-foreground">kg</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">doppio click per {showHistory ? "chiudere" : "storico"}</p>
          <AnimatePresence>
            {showHistory && weights.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 border-t border-border divide-y divide-border">
                  {weights.slice(0, 30).map((w) => (
                    <div key={w.id} className="flex items-center gap-4 py-3">
                      <div className="flex-1">
                        <p className="font-semibold">{w.weight_kg} kg</p>
                        <p className="text-sm text-muted-foreground">{moment(w.date).format("DD MMMM YYYY")}</p>
                        {w.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{w.notes}</p>}
                      </div>
                      {w.photo_url && (
                        <button onClick={e => { e.stopPropagation(); setExpandedPhoto(w.photo_url); }} className="shrink-0">
                          <img src={w.photo_url} alt="forma fisica" className="w-12 h-12 rounded-xl object-cover border border-border" />
                        </button>
                      )}
                      {!w.photo_url && (
                        <button onClick={e => { e.stopPropagation(); setPhotoForId(w.id); photoInputRef.current?.click(); }} disabled={uploadingPhoto === w.id}
                          className="p-2 rounded-xl hover:bg-secondary transition-colors shrink-0 text-muted-foreground">
                          {uploadingPhoto === w.id
                            ? <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            : <Camera className="w-4 h-4" />}
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); handleDelete(w.id); }} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Variazione</p>
          <div className="flex items-center gap-2 mt-1">
            {diff !== null ? (
              <>
                {Number(diff) > 0 ? <TrendingUp className="w-5 h-5 text-chart-3" /> : Number(diff) < 0 ? <TrendingDown className="w-5 h-5 text-accent" /> : <Minus className="w-5 h-5 text-muted-foreground" />}
                <span className="text-2xl font-heading font-bold">{Number(diff) > 0 ? "+" : ""}{diff}</span>
              </>
            ) : <span className="text-2xl font-heading font-bold">—</span>}
          </div>
          <p className="text-xs text-muted-foreground">kg dall'ultima</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Obiettivo</p>
            <button onClick={() => setEditingGoal(!editingGoal)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          {editingGoal ? (
            <div className="space-y-2">
              <Input type="number" placeholder="kg" value={goal} onChange={e => setGoal(e.target.value)} className="h-8 rounded-lg text-sm" />
    
              <Button size="sm" onClick={handleSaveGoal} disabled={savingGoal} className="h-7 rounded-lg px-3 text-xs w-full">
                {savingGoal ? "..." : <><Check className="w-3 h-3 mr-1" />Salva</>}
              </Button>
            </div>
          ) : (
            <>
              <p className="text-3xl font-heading font-bold">{user?.weight_goal ? `${user.weight_goal}` : "—"}</p>
              <p className="text-xs text-muted-foreground">kg obiettivo</p>
            </>
          )}
        </motion.div>
      </div>

      {/* Chart - collapsible */}
      {chartData.length > 1 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button onClick={() => setShowChart(!showChart)} className="w-full flex items-center justify-between p-5">
            <h2 className="font-heading font-semibold">Andamento Peso</h2>
            {showChart ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {showChart && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-5 pb-5 border-t border-border pt-2">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit=" kg" domain={["dataMin - 1", "dataMax + 1"]} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 13 }} />
                      <Area type="monotone" dataKey="kg" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#weightGrad)" dot={{ fill: "hsl(var(--primary))", r: 4 }} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, photoForId)} />

      {/* Add weight slide-up */}
      <AnimatePresence>
        {showAddWeight && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddWeight(false)}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5 w-full sm:max-w-sm shadow-2xl space-y-3">
              <h2 className="font-heading font-semibold">Registra Peso</h2>
              <Input type="number" step="0.1" placeholder="es. 75.5 kg" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="h-11 rounded-xl" autoFocus />
              <Input placeholder="Note (opzionale)" value={notes} onChange={e => setNotes(e.target.value)} className="h-11 rounded-xl" />
              <Button onClick={async () => { await handleSave(); setShowAddWeight(false); }} disabled={saving || !newWeight} className="w-full h-11 rounded-xl">
                <Plus className="w-4 h-4 mr-1" />{saving ? "Salvataggio..." : "Aggiungi"}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button onClick={() => setShowAddWeight(true)}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-8 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all">
        <Plus className="w-6 h-6" />
      </button>

      {/* Photo lightbox */}
      <AnimatePresence>
        {expandedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setExpandedPhoto(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <img src={expandedPhoto} alt="forma fisica" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
              <button onClick={() => setExpandedPhoto(null)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white">
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}