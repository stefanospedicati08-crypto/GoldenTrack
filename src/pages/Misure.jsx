import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Plus, Ruler, X, Trash2, Pencil, TrendingDown, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import moment from "moment";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const MISURE_FIELDS = [
  { key: "petto", label: "Petto" },
  { key: "vita", label: "Vita" },
  { key: "fianchi", label: "Fianchi" },
  { key: "coscia_sx", label: "Coscia SX" },
  { key: "coscia_dx", label: "Coscia DX" },
  { key: "braccio_sx", label: "Braccio SX" },
  { key: "braccio_dx", label: "Braccio DX" },
  { key: "polpaccio_sx", label: "Polpaccio SX" },
  { key: "polpaccio_dx", label: "Polpaccio DX" },
  { key: "addome", label: "Addome" },
];

const FIELD_COLORS = ["#f87171","#60a5fa","#34d399","#a78bfa","#fb923c","#f472b6","#38bdf8","#4ade80","#facc15","#c084fc"];

export default function Misure() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedField, setSelectedField] = useState(null);

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      const data = await base44.entities.BodyMeasurement.filter({ created_by: u.email }, "-date", 100);
      setLogs(data); setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    if (editingLog) {
      await base44.entities.BodyMeasurement.update(editingLog.id, form);
      setLogs(prev => prev.map(l => l.id === editingLog.id ? { ...l, ...form } : l));
      toast.success("Misure aggiornate!");
    } else {
      const today = new Date().toISOString().split("T")[0];
      const entry = await base44.entities.BodyMeasurement.create({ ...form, date: today });
      setLogs(prev => [entry, ...prev]);
      toast.success("Misure salvate!");
    }
    setForm({}); setShowForm(false); setEditingLog(null); setSaving(false);
  }

  function openEdit(log) {
    setEditingLog(log);
    setForm(Object.fromEntries(MISURE_FIELDS.map(f => [f.key, log[f.key] || ""])));
    setShowForm(true);
  }

  async function handleDelete(id) {
    await base44.entities.BodyMeasurement.delete(id);
    setLogs(prev => prev.filter(l => l.id !== id));
    setConfirmDeleteId(null);
    toast.success("Misurazione eliminata.");
  }

  const latest = logs[0];
  const previous = logs[1];

  const fieldChartData = selectedField
    ? [...logs].sort((a, b) => a.date.localeCompare(b.date)).filter(l => l[selectedField.key]).map(l => ({ date: moment(l.date).format("DD/MM"), value: l[selectedField.key] }))
    : [];

  const chartData = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-20).map(l => ({
    date: moment(l.date).format("DD/MM"),
    ...Object.fromEntries(MISURE_FIELDS.map(f => [f.key, l[f.key] || null]))
  }));
  const activeFields = MISURE_FIELDS.filter(f => logs.some(l => l[f.key]));

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#fcd12a]/20 border-t-[#fcd12a] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Misure Corporee</h1>
          <p className="text-white/35 text-sm mt-0.5">Tocca una misura per vedere il grafico</p>
        </div>
        <button onClick={() => { setEditingLog(null); setForm({}); setShowForm(true); }}
          className="w-10 h-10 rounded-2xl bg-[#fcd12a] text-black flex items-center justify-center hover:bg-[#fcd12a]/90 transition-colors shadow-lg shadow-[#fcd12a]/20">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Latest — measurement grid */}
      {latest && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">Ultima misurazione</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">{moment(latest.date).format("DD MMM YYYY")}</span>
              <button onClick={() => openEdit(latest)} className="p-1.5 rounded-xl hover:bg-white/8 transition-colors">
                <Pencil className="w-3.5 h-3.5 text-white/30" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MISURE_FIELDS.map((f, i) => {
              const val = latest[f.key];
              if (!val) return null;
              const prevVal = previous?.[f.key];
              const diff = val && prevVal ? (val - prevVal).toFixed(1) : null;
              const color = FIELD_COLORS[i % FIELD_COLORS.length];
              return (
                <button key={f.key} onClick={() => setSelectedField(f)}
                  className="flex items-center gap-3 bg-white/4 border border-white/7 hover:border-white/15 active:scale-[0.98] transition-all rounded-2xl px-3 py-3 text-left">
                  <div className="w-2 h-8 rounded-full shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/40">{f.label}</p>
                    <p className="text-lg font-heading font-bold text-white leading-none">{val}<span className="text-xs text-white/30 ml-1 font-normal">cm</span></p>
                    {diff !== null && (
                      <p className={`text-[10px] font-medium flex items-center gap-0.5 ${Number(diff) > 0 ? "text-red-400" : Number(diff) < 0 ? "text-green-400" : "text-white/30"}`}>
                        {Number(diff) > 0 ? <TrendingUp className="w-3 h-3" /> : Number(diff) < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        {Number(diff) > 0 ? "+" : ""}{diff} cm
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Chart */}
      {logs.length > 1 && activeFields.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/4 border border-white/7 rounded-3xl p-4">
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-4">Andamento</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }} unit=" cm" domain={["dataMin - 2", "dataMax + 2"]} axisLine={false} tickLine={false} width={52} />
              <Tooltip contentStyle={{ background: "#1c1f28", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", fontSize: 12, color: "#fff" }}
                labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}
                formatter={(v, name) => [v ? `${v} cm` : "—", MISURE_FIELDS.find(f => f.key === name)?.label || name]} />
              {activeFields.map((f, i) => (
                <Line key={f.key} type="monotone" dataKey={f.key} stroke={FIELD_COLORS[i % FIELD_COLORS.length]}
                  strokeWidth={2.5} dot={false} connectNulls name={f.label}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#1c1f28" }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* History */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">Storico</p>
          {logs.map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="bg-white/3 border border-white/6 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">{moment(log.date).format("DD MMMM YYYY")}</p>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(log)} className="p-1.5 rounded-xl hover:bg-white/8 transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-white/30" />
                  </button>
                  <button onClick={() => setConfirmDeleteId(log.id)} className="p-1.5 rounded-xl hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400/50" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MISURE_FIELDS.map(f => log[f.key] ? (
                  <span key={f.key} className="text-xs bg-white/5 text-white/50 px-2 py-1 rounded-xl">
                    {f.label}: <span className="font-semibold text-white/70">{log[f.key]} cm</span>
                  </span>
                ) : null)}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {logs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <Ruler className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/30 text-sm">Nessuna misurazione registrata</p>
          <p className="text-white/15 text-xs">Tocca + per aggiungere la prima</p>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => { setEditingLog(null); setForm({}); setShowForm(true); }}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-8 z-40 w-14 h-14 bg-[#fcd12a] text-black rounded-full shadow-xl shadow-[#fcd12a]/25 flex items-center justify-center hover:bg-[#fcd12a]/90 active:scale-95 transition-all">
        <Plus className="w-6 h-6" />
      </button>

      {/* Field detail — bottom sheet */}
      <AnimatePresence>
        {selectedField && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedField(null)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1c1f28] border-t border-white/10 rounded-t-3xl p-5 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-bold text-lg text-white">{selectedField.label}</h2>
                <button onClick={() => setSelectedField(null)} className="w-8 h-8 rounded-2xl bg-white/8 flex items-center justify-center">
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
              {latest?.[selectedField.key] && (
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-white/5 rounded-2xl px-5 py-3 text-center">
                    <p className="text-xs text-white/30">Attuale</p>
                    <p className="text-3xl font-heading font-bold text-[#fcd12a]">{latest[selectedField.key]}</p>
                    <p className="text-xs text-white/30">cm</p>
                  </div>
                  {previous?.[selectedField.key] && (() => {
                    const diff = (latest[selectedField.key] - previous[selectedField.key]).toFixed(1);
                    return (
                      <div>
                        <p className="text-xs text-white/30">Variazione</p>
                        <p className={`text-xl font-heading font-bold ${Number(diff) > 0 ? "text-red-400" : Number(diff) < 0 ? "text-green-400" : "text-white/30"}`}>
                          {Number(diff) > 0 ? "+" : ""}{diff} cm
                        </p>
                        <p className="text-xs text-white/25">dall'ultima</p>
                      </div>
                    );
                  })()}
                </div>
              )}
              {fieldChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={fieldChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }} unit=" cm" domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} width={52} />
                    <Tooltip contentStyle={{ background: "#1c1f28", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", fontSize: 12, color: "#fff" }}
                      labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}
                      formatter={v => [`${v} cm`, selectedField.label]} />
                    <Line type="monotone" dataKey="value" stroke="#fcd12a" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#fcd12a", strokeWidth: 2, stroke: "#1c1f28" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-white/30 text-center py-4">Aggiungi almeno 2 misurazioni per il grafico.</p>
              )}
              <div className="space-y-1 mt-3 max-h-40 overflow-y-auto">
                {[...logs].sort((a, b) => b.date.localeCompare(a.date)).filter(l => l[selectedField.key]).map(l => (
                  <div key={l.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-xl hover:bg-white/4">
                    <span className="text-white/35">{moment(l.date).format("DD MMM YYYY")}</span>
                    <span className="font-semibold text-white/70">{l[selectedField.key]} cm</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit form — bottom sheet */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowForm(false); setEditingLog(null); setForm({}); }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1c1f28] border-t border-white/10 rounded-t-3xl p-5 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-bold text-lg text-white">
                  {editingLog ? "Modifica Misurazione" : "Nuova Misurazione"}
                </h2>
                <button onClick={() => { setShowForm(false); setEditingLog(null); setForm({}); }}
                  className="w-8 h-8 rounded-2xl bg-white/8 flex items-center justify-center">
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
              {editingLog && <p className="text-xs text-white/30 mb-3">{moment(editingLog.date).format("DD MMMM YYYY")}</p>}
              {!editingLog && <p className="text-xs text-white/30 mb-3">Compila solo i campi che vuoi registrare.</p>}
              <div className="grid grid-cols-2 gap-2.5 pb-2">
                {MISURE_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="text-[11px] font-medium text-white/30 mb-1 block">{f.label} (cm)</label>
                    <Input type="number" step="0.1" placeholder="es. 85" value={form[f.key] || ""}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value ? Number(e.target.value) : undefined }))}
                      className="h-10 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingLog(null); setForm({}); }}
                  className="flex-1 h-12 rounded-2xl bg-white/8 text-white/50 text-sm font-medium">Annulla</button>
                <button onClick={handleSave} disabled={saving || Object.values(form).every(v => !v)}
                  className="flex-1 h-12 rounded-2xl bg-[#fcd12a] text-black font-bold text-sm disabled:opacity-50 transition-opacity">
                  {saving ? "Salvataggio..." : editingLog ? "Salva Modifiche" : "Salva"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmDeleteId(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#1c1f28] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-center font-semibold text-white">Elimina misurazione?</p>
              <p className="text-sm text-white/35 text-center">Questa azione è irreversibile.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 h-11 rounded-2xl bg-white/8 text-white/60 text-sm font-medium">Annulla</button>
                <button onClick={() => handleDelete(confirmDeleteId)}
                  className="flex-1 h-11 rounded-2xl bg-red-500 text-white font-bold text-sm">Elimina</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}