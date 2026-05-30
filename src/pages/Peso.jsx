import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingDown, TrendingUp, Minus, Trash2, Camera, X, MoreVertical, Pencil, Target } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, ReferenceLine } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

const RING_R = 54;
const RING_CIRC = 2 * Math.PI * RING_R;

function WeightRing({ current, goal, max }) {
  const pct = max > 0 ? Math.min(current / max, 1) : 0;
  const offset = RING_CIRC * (1 - pct);
  const size = 160;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={RING_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={RING_R} fill="none"
        stroke="#fcd12a" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={RING_CIRC} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      {goal && (
        <circle cx={size/2} cy={size/2} r={RING_R} fill="none"
          stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeOpacity={0.6}
          strokeDasharray={`4 ${RING_CIRC}`}
          strokeDashoffset={RING_CIRC * (1 - goal / max)} />
      )}
    </svg>
  );
}

export default function Peso() {
  const [weights, setWeights] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newWeight, setNewWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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
    setNewWeight(""); setNotes("");
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
    setWeights([]); setShowResetConfirm(false); setShowMenu(false); setSaving(false);
  }

  async function handlePhotoUpload(e, weightId) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(weightId);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.BodyWeight.update(weightId, { photo_url: file_url });
    setWeights((prev) => prev.map((w) => w.id === weightId ? { ...w, photo_url: file_url } : w));
    setUploadingPhoto(null); setPhotoForId(null);
  }

  async function handleSaveGoal() {
    setSavingGoal(true);
    const newGoal = goal ? Number(goal) : undefined;
    await base44.auth.updateMe({ weight_goal: newGoal });
    setUser((prev) => ({ ...prev, weight_goal: newGoal }));
    setSavingGoal(false); setEditingGoal(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
    </div>
  );

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.slice(-30).map((w) => ({ date: moment(w.date).format("DD/MM"), kg: w.weight_kg }));
  const latest = weights[0]?.weight_kg;
  const previous = weights[1]?.weight_kg;
  const diff = latest && previous ? (latest - previous).toFixed(1) : null;
  const weightGoal = user?.weight_goal;
  const ringMax = weightGoal ? Math.max(latest || weightGoal, weightGoal) * 1.05 : (latest || 100);

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="font-heading text-2xl font-bold text-white">Peso Corporeo</h1>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-2xl hover:bg-white/8 transition-colors">
            <MoreVertical className="w-5 h-5 text-white/50" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-10 bg-[#1c1f28] border border-white/10 rounded-2xl shadow-xl z-20 min-w-[180px] overflow-hidden">
                <button onClick={() => { setShowMenu(false); setShowResetConfirm(true); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors">
                  <Trash2 className="w-4 h-4" /> Reset storico
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hero — ring + weight */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-[#1c1f28] to-[#22263a] border border-white/8 rounded-3xl p-6"
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-[#fcd12a]/8 blur-3xl pointer-events-none" />
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <WeightRing current={latest || 0} goal={weightGoal} max={ringMax} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-heading font-bold text-white leading-none">{latest || "—"}</span>
              <span className="text-xs text-white/40 mt-1">kg</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-white/35 uppercase tracking-widest font-medium">Peso attuale</p>
              <p className="text-4xl font-heading font-bold text-[#fcd12a] leading-none mt-1">{latest || "—"}<span className="text-lg text-white/40 ml-1">kg</span></p>
            </div>
            <div className="flex gap-2">
              {/* Variazione */}
              <div className="flex-1 bg-white/5 rounded-2xl px-3 py-2">
                <p className="text-[10px] text-white/30 mb-1">Variazione</p>
                <div className="flex items-center gap-1">
                  {diff !== null ? (
                    <>
                      {Number(diff) > 0 ? <TrendingUp className="w-3.5 h-3.5 text-red-400" /> : Number(diff) < 0 ? <TrendingDown className="w-3.5 h-3.5 text-green-400" /> : <Minus className="w-3.5 h-3.5 text-white/40" />}
                      <span className={`text-base font-bold font-heading ${Number(diff) > 0 ? "text-red-400" : Number(diff) < 0 ? "text-green-400" : "text-white/40"}`}>
                        {Number(diff) > 0 ? "+" : ""}{diff}
                      </span>
                      <span className="text-[10px] text-white/30">kg</span>
                    </>
                  ) : <span className="text-base font-bold text-white/30">—</span>}
                </div>
              </div>
              {/* Obiettivo */}
              <button onClick={() => setEditingGoal(true)} className="flex-1 bg-white/5 rounded-2xl px-3 py-2 hover:bg-white/10 transition-colors text-left relative">
                <Pencil className="absolute top-2 right-2 w-3 h-3 text-white/20" />
                <p className="text-[10px] text-white/30 mb-1">Obiettivo</p>
                <div className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-base font-bold font-heading text-green-400">{weightGoal || "—"}</span>
                  {weightGoal && <span className="text-[10px] text-white/30">kg</span>}
                </div>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chart */}
      {chartData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/4 border border-white/8 rounded-3xl p-4">
          <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-4">Andamento</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fcd12a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#fcd12a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} unit=" kg" domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} width={45} />
              <Tooltip contentStyle={{ background: "#1c1f28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: 13, color: "#fff" }} />
              {weightGoal && (
                <ReferenceLine y={weightGoal} stroke="#4ade80" strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: `${weightGoal} kg`, position: "insideTopRight", fontSize: 10, fill: "#4ade80" }} />
              )}
              <Area type="monotone" dataKey="kg" stroke="#fcd12a" strokeWidth={2.5} fill="url(#wGrad)" dot={false} activeDot={{ r: 5, fill: "#fcd12a" }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Recent entries */}
      {weights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-white/35 uppercase tracking-widest">Ultime pesate</p>
            {weights.length > 3 && (
              <button onClick={() => setShowHistoryModal(true)} className="text-xs text-[#fcd12a]/70 hover:text-[#fcd12a] font-medium transition-colors">
                Vedi tutte →
              </button>
            )}
          </div>
          <div className="space-y-2">
            {weights.slice(0, 5).map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 bg-white/4 border border-white/6 rounded-2xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white font-heading">{w.weight_kg} kg</span>
                    {i === 0 && <span className="text-[10px] bg-[#fcd12a]/15 text-[#fcd12a] px-2 py-0.5 rounded-full font-medium">Ultimo</span>}
                  </div>
                  <p className="text-xs text-white/35 mt-0.5">{moment(w.date).format("DD MMMM YYYY")}</p>
                  {w.notes && <p className="text-xs text-white/25 mt-0.5 italic truncate">{w.notes}</p>}
                </div>
                {w.photo_url ? (
                  <button onClick={() => setExpandedPhoto(w.photo_url)} className="shrink-0">
                    <img src={w.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover border border-white/10" />
                  </button>
                ) : (
                  <button onClick={() => { setPhotoForId(w.id); photoInputRef.current?.click(); }}
                    disabled={uploadingPhoto === w.id}
                    className="p-2 rounded-xl hover:bg-white/8 text-white/30 hover:text-white/60 transition-colors shrink-0">
                    {uploadingPhoto === w.id
                      ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                      : <Camera className="w-4 h-4" />}
                  </button>
                )}
                <button onClick={() => handleDelete(w.id)}
                  className="p-2 rounded-xl hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty */}
      {weights.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/30 text-sm">Nessuna pesata registrata</p>
          <p className="text-white/15 text-xs">Tocca + per aggiungere la prima</p>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setShowAddWeight(true)}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-8 z-40 w-14 h-14 bg-[#fcd12a] text-black rounded-full shadow-xl shadow-[#fcd12a]/25 flex items-center justify-center hover:bg-[#fcd12a]/90 active:scale-95 transition-all">
        <Plus className="w-6 h-6" />
      </button>

      {/* Hidden file input */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, photoForId)} />

      {/* Add weight modal */}
      <AnimatePresence>
        {showAddWeight && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddWeight(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1f28] border border-white/10 rounded-t-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-2" />
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-semibold text-lg text-white">Registra Peso</h2>
                <button onClick={() => setShowAddWeight(false)} className="p-1.5 rounded-xl hover:bg-white/8">
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>
              <Input type="number" step="0.1" placeholder="es. 75.5" value={newWeight} onChange={(e) => setNewWeight(e.target.value)}
                className="h-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/25 text-lg text-center font-heading font-bold" autoFocus />
              <Input placeholder="Note (opzionale)" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="h-11 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/25" />
              <button onClick={async () => { await handleSave(); setShowAddWeight(false); }} disabled={saving || !newWeight}
                className="w-full h-12 rounded-2xl bg-[#fcd12a] text-black font-bold text-sm disabled:opacity-50 transition-opacity">
                {saving ? "Salvataggio..." : "Aggiungi"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1f28] border border-white/10 rounded-t-3xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-4 mb-2" />
              <div className="flex items-center justify-between px-5 py-3 shrink-0">
                <h2 className="font-heading font-semibold text-lg text-white">Storico Pesate</h2>
                <button onClick={() => setShowHistoryModal(false)} className="p-1.5 rounded-xl hover:bg-white/8">
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>
              <div className="overflow-y-auto px-4 pb-8 space-y-2">
                {weights.slice(0, 50).map((w) => (
                  <div key={w.id} className="flex items-center gap-3 bg-white/4 rounded-2xl px-4 py-3">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{w.weight_kg} kg</p>
                      <p className="text-xs text-white/35">{moment(w.date).format("DD MMMM YYYY")}</p>
                      {w.notes && <p className="text-xs text-white/25 italic mt-0.5">{w.notes}</p>}
                    </div>
                    {w.photo_url && (
                      <button onClick={() => setExpandedPhoto(w.photo_url)}>
                        <img src={w.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(w.id)} className="p-2 rounded-xl hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal modal */}
      <AnimatePresence>
        {editingGoal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingGoal(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1f28] border border-white/10 rounded-t-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-2" />
              <h2 className="font-heading font-semibold text-lg text-white">Obiettivo Peso</h2>
              <Input type="number" placeholder="es. 75 kg" value={goal} onChange={(e) => setGoal(e.target.value)}
                className="h-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/25 text-lg text-center font-heading font-bold" autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setEditingGoal(false)} className="flex-1 h-11 rounded-2xl bg-white/8 text-white/60 text-sm font-medium">Annulla</button>
                <button onClick={handleSaveGoal} disabled={savingGoal} className="flex-1 h-11 rounded-2xl bg-[#fcd12a] text-black font-bold text-sm disabled:opacity-50">
                  {savingGoal ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset confirm */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1f28] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-center font-semibold text-white">Reset storico peso</p>
              <p className="text-sm text-white/40 text-center leading-relaxed">Tutti i dati dello storico verranno cancellati permanentemente.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 h-11 rounded-2xl bg-white/8 text-white/60 text-sm font-medium">Annulla</button>
                <button onClick={handleReset} disabled={saving} className="flex-1 h-11 rounded-2xl bg-red-500 text-white font-bold text-sm disabled:opacity-50">
                  {saving ? "..." : "Elimina tutto"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo lightbox */}
      <AnimatePresence>
        {expandedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setExpandedPhoto(null)}>
            <motion.img initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              src={expandedPhoto} alt="" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}