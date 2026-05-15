import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingDown, TrendingUp, Minus, Trash2, Camera, X, MoreVertical, Pencil, Check } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, ReferenceLine } from "recharts";
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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showResetMenu, setShowResetMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const photoInputRef = useRef(null);
  const [photoForId, setPhotoForId] = useState(null);

  const [goal, setGoal] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      setUser(u);
      setGoal(u.weight_goal ? String(u.weight_goal) : "");
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
    setWeights((prev) => [optimistic, ...prev]);
    setNewWeight("");
    setNotes("");
    const entry = await base44.entities.BodyWeight.create({ weight_kg: optimistic.weight_kg, date: today, notes: optimistic.notes });
    setWeights((prev) => prev.map((w) => w.id === optimistic.id ? entry : w));
    setSaving(false);
  }

  async function handleDelete(id) {
    await base44.entities.BodyWeight.delete(id);
    setWeights((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleReset() {
    setSaving(true);
    await Promise.all(weights.map((w) => base44.entities.BodyWeight.delete(w.id)));
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
    setWeights((prev) => prev.map((w) => w.id === weightId ? { ...w, photo_url: file_url } : w));
    setUploadingPhoto(null);
    setPhotoForId(null);
  }

  async function handleSaveGoal() {
    setSavingGoal(true);
    const newGoal = goal ? Number(goal) : undefined;
    await base44.auth.updateMe({ weight_goal: newGoal });
    setUser((prev) => ({ ...prev, weight_goal: newGoal }));
    setSavingGoal(false);
    setEditingGoal(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>);

  }

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.slice(-30).map((w) => ({ date: moment(w.date).format("DD/MM"), kg: w.weight_kg }));
  const latest = weights[0]?.weight_kg;
  const previous = weights[1]?.weight_kg;
  const diff = latest && previous ? (latest - previous).toFixed(1) : null;
  const weightGoal = user?.weight_goal;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Peso Corporeo</h1>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">Monitoraggio e progressioni del tuo peso corporeo.</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowResetMenu(!showResetMenu)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
          <AnimatePresence>
            {showResetMenu &&
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="absolute right-0 top-10 bg-card border border-border rounded-xl shadow-xl z-20 min-w-[180px] overflow-hidden">
                <button onClick={() => {setShowResetMenu(false);setShowResetConfirm(true);}}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4" /> Reset storico peso
                </button>
              </motion.div>
            }
          </AnimatePresence>
        </div>
      </div>

      {/* Reset confirm */}
      <AnimatePresence>
        {showResetConfirm &&
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl space-y-4">
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
        }
      </AnimatePresence>

      {/* Peso Attuale — cerchio */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        onDoubleClick={() => setShowHistoryModal(true)}
        className="flex justify-center cursor-pointer"
        title="Doppio click per storico">
        
        <div className="w-40 h-40 rounded-full border-4 border-primary flex flex-col items-center justify-center text-[hsl(var(--primary))]">
          <p className="text-sm mb-1 text-[hsl(var(--primary))]">Peso Attuale</p>
          <p className="text-4xl font-heading font-bold text-primary">{latest || "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">kg</p>
        </div>
      </motion.div>

      {/* Variazione + Obiettivo — cerchi */}
      <div className="flex items-center justify-center gap-8">
        {/* Variazione cerchio */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="w-32 h-32 rounded-full border-4 border-chart-3/40 bg-chart-3/5 flex flex-col items-center justify-center">
            <p className="text-xs text-muted-foreground mb-1">Variazione</p>
            <div className="flex items-center gap-1">
              {diff !== null ?
              <>
                  {Number(diff) > 0 ? <TrendingUp className="w-4 h-4 text-chart-3" /> : Number(diff) < 0 ? <TrendingDown className="w-4 h-4 text-accent" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-2xl font-heading font-bold">{Number(diff) > 0 ? "+" : ""}{diff}</span>
                </> :
              <span className="text-2xl font-heading font-bold">—</span>}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">kg</p>
          </div>
        </motion.div>

        {/* Obiettivo cerchio */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <button onClick={() => setEditingGoal(true)} className="w-32 h-32 rounded-full border-4 border-accent/40 bg-accent/5 flex flex-col items-center justify-center relative hover:bg-accent/10 transition-colors">
            <Pencil className="absolute top-2 right-2 w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Obiettivo</p>
            <p className="text-2xl font-heading font-bold text-accent">{weightGoal || "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-1">kg</p>
          </button>
        </motion.div>
      </div>

      {/* Andamento Peso — visible when data exists */}
      {chartData.length > 1 &&
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5">
          <h2 className="font-heading font-semibold mb-4">Andamento Peso</h2>
          <ResponsiveContainer width="100%" height={220}>
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
              {weightGoal &&
            <ReferenceLine y={weightGoal} stroke="hsl(var(--accent))" strokeDasharray="4 3" strokeWidth={2}
            label={{ value: `Obiettivo: ${weightGoal} kg`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--accent))" }} />
            }
              <Area type="monotone" dataKey="kg" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#weightGrad)" dot={{ fill: "hsl(var(--primary))", r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      }

      {/* Add weight slide-up */}
      <AnimatePresence>
        {showAddWeight &&
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddWeight(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-semibold text-lg">Registra Peso</h2>
                <button onClick={() => setShowAddWeight(false)} className="p-1.5 rounded-xl hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <Input type="number" step="0.1" placeholder="es. 75.5 kg" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="h-11 rounded-xl" autoFocus />
                <Input placeholder="Note (opzionale)" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <Button onClick={async () => {await handleSave();setShowAddWeight(false);}} disabled={saving || !newWeight} className="w-full h-11 rounded-xl">
                <Plus className="w-4 h-4 mr-1" />{saving ? "Salvataggio..." : "Aggiungi"}
              </Button>
            </motion.div>
          </div>
        }
      </AnimatePresence>

      {/* History modal */}
      <AnimatePresence>
        {showHistoryModal &&
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
                <h2 className="font-heading font-semibold text-lg">Storico Pesate</h2>
                <button onClick={() => setShowHistoryModal(false)} className="p-1.5 rounded-xl hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto divide-y divide-border">
                {weights.length === 0 &&
              <p className="text-sm text-muted-foreground text-center py-10">Nessuna pesata registrata</p>
              }
                {weights.slice(0, 50).map((w) =>
              <div key={w.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1">
                      <p className="font-semibold">{w.weight_kg} kg</p>
                      <p className="text-sm text-muted-foreground">{moment(w.date).format("DD MMMM YYYY")}</p>
                      {w.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{w.notes}</p>}
                    </div>
                    {w.photo_url &&
                <button onClick={() => setExpandedPhoto(w.photo_url)} className="shrink-0">
                        <img src={w.photo_url} alt="forma fisica" className="w-12 h-12 rounded-xl object-cover border border-border" />
                      </button>
                }
                    {!w.photo_url &&
                <button onClick={() => {setPhotoForId(w.id);photoInputRef.current?.click();}} disabled={uploadingPhoto === w.id}
                className="p-2 rounded-xl hover:bg-secondary transition-colors shrink-0 text-muted-foreground">
                        {uploadingPhoto === w.id ?
                  <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /> :
                  <Camera className="w-4 h-4" />}
                      </button>
                }
                    <button onClick={() => handleDelete(w.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              )}
              </div>
            </motion.div>
          </div>
        }
      </AnimatePresence>

      {/* Hidden file input */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, photoForId)} />

      {/* FAB */}
      <button onClick={() => setShowAddWeight(true)}
      className="fixed bottom-24 right-4 lg:bottom-6 lg:right-8 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all">
        <Plus className="w-6 h-6" />
      </button>

      {/* Goal modal */}
      <AnimatePresence>
        {editingGoal &&
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingGoal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-semibold text-lg">Obiettivo Peso</h2>
                <button onClick={() => setEditingGoal(false)} className="p-1.5 rounded-xl hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Input type="number" placeholder="es. 75 kg" value={goal} onChange={(e) => setGoal(e.target.value)} className="h-11 rounded-xl" autoFocus />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setEditingGoal(false)} className="rounded-xl">Annulla</Button>
                <Button onClick={handleSaveGoal} disabled={savingGoal} className="rounded-xl">
                  {savingGoal ? "Salvataggio..." : "Salva Obiettivo"}
                </Button>
              </div>
            </motion.div>
          </div>
        }
      </AnimatePresence>

      {/* Photo lightbox */}
      <AnimatePresence>
        {expandedPhoto &&
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setExpandedPhoto(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <img src={expandedPhoto} alt="forma fisica" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
              <button onClick={() => setExpandedPhoto(null)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white">
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        }
      </AnimatePresence>
    </div>);

}