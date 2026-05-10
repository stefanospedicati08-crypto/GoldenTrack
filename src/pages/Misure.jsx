import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Ruler, X, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import moment from "moment";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const MISURE_FIELDS = [
  { key: "petto", label: "Petto", unit: "cm" },
  { key: "vita", label: "Vita", unit: "cm" },
  { key: "fianchi", label: "Fianchi", unit: "cm" },
  { key: "coscia_sx", label: "Coscia SX", unit: "cm" },
  { key: "coscia_dx", label: "Coscia DX", unit: "cm" },
  { key: "braccio_sx", label: "Braccio SX", unit: "cm" },
  { key: "braccio_dx", label: "Braccio DX", unit: "cm" },
  { key: "polpaccio_sx", label: "Polpaccio SX", unit: "cm" },
  { key: "polpaccio_dx", label: "Polpaccio DX", unit: "cm" },
  { key: "addome", label: "Addome", unit: "cm" },
];

const FIELD_COLORS = [
  "#f87171", "#60a5fa", "#34d399", "#a78bfa",
  "#fb923c", "#f472b6", "#38bdf8", "#4ade80",
  "#facc15", "#c084fc"
];

export default function Misure() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // Field detail popup
  const [selectedField, setSelectedField] = useState(null); // { key, label }

  useEffect(() => {
    async function load() {
      const u = await base44.auth.me();
      const data = await base44.entities.BodyMeasurement.filter({ created_by: u.email }, "-date", 100);
      setLogs(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    if (editingLog) {
      const updated = await base44.entities.BodyMeasurement.update(editingLog.id, form);
      setLogs(prev => prev.map(l => l.id === editingLog.id ? { ...l, ...form } : l));
      toast.success("Misure aggiornate!");
    } else {
      const today = new Date().toISOString().split("T")[0];
      const entry = await base44.entities.BodyMeasurement.create({ ...form, date: today });
      setLogs(prev => [entry, ...prev]);
      toast.success("Misure salvate!");
    }
    setForm({});
    setShowForm(false);
    setEditingLog(null);
    setSaving(false);
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

  // Chart data for the selected field popup
  const fieldChartData = selectedField
    ? [...logs]
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter(l => l[selectedField.key])
        .map(l => ({ date: moment(l.date).format("DD/MM"), value: l[selectedField.key] }))
    : [];

  // Overall chart data
  const chartData = [...logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-20)
    .map(l => ({
      date: moment(l.date).format("DD/MM"),
      ...Object.fromEntries(MISURE_FIELDS.map(f => [f.key, l[f.key] || null]))
    }));

  const activeFields = MISURE_FIELDS.filter(f => logs.some(l => l[f.key]));

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Misure Corporee</h1>
          <p className="text-muted-foreground mt-1 text-sm">Tocca una misura per vedere il grafico</p>
        </div>
        <Button onClick={() => { setEditingLog(null); setForm({}); setShowForm(true); }} className="rounded-xl">
          <Plus className="w-4 h-4 mr-1" /> Nuova
        </Button>
      </div>

      {/* Ultima misurazione — clickable cards */}
      {latest && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold">Ultima Misurazione</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{moment(latest.date).format("DD MMMM YYYY")}</span>
              <button onClick={() => openEdit(latest)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 justify-items-center">
            {MISURE_FIELDS.map((f, i) => {
              const val = latest[f.key];
              const prevVal = previous?.[f.key];
              const diff = val && prevVal ? (val - prevVal).toFixed(1) : null;
              if (!val) return null;
              return (
                <button
                  key={f.key}
                  onClick={() => setSelectedField(f)}
                  className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-accent bg-white shadow-md hover:shadow-lg hover:scale-105 transition-all active:scale-95"
                >
                  <p className="text-[11px] text-accent font-bold text-center leading-tight px-2">{f.label}</p>
                  <p className="text-xl font-heading font-extrabold text-accent mt-0.5">{val}</p>
                  <p className="text-[10px] font-semibold text-accent/70">cm</p>
                  {diff !== null && (
                    <p className={`text-[10px] font-bold ${Number(diff) > 0 ? "text-chart-3" : Number(diff) < 0 ? "text-green-500" : "text-muted-foreground"}`}>
                      {Number(diff) > 0 ? "+" : ""}{diff}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Overall chart */}
      {logs.length > 1 && activeFields.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5">
          <h2 className="font-heading font-semibold mb-4">Andamento Misure nel Tempo</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit=" cm" domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }}
                formatter={(value, name) => [value ? `${value} cm` : "—", MISURE_FIELDS.find(f => f.key === name)?.label || name]}
              />
              {activeFields.map((f, i) => (
                <Line
                  key={f.key}
                  type="monotone"
                  dataKey={f.key}
                  stroke={FIELD_COLORS[i % FIELD_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  name={f.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Storico */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading font-semibold">Storico</h2>
          {logs.map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">{moment(log.date).format("DD MMMM YYYY")}</p>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(log)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => setConfirmDeleteId(log.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MISURE_FIELDS.map(f => log[f.key] ? (
                  <span key={f.key} className="text-xs bg-secondary px-2 py-1.5 rounded-lg flex items-center justify-between">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-semibold ml-2">{log[f.key]} cm</span>
                  </span>
                ) : null)}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {logs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Ruler className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nessuna misurazione registrata</p>
          <p className="text-sm mt-1">Aggiungi la prima misurazione per iniziare</p>
        </div>
      )}

      {/* Field Detail Popup */}
      <AnimatePresence>
        {selectedField && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedField(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-lg">{selectedField.label}</h2>
                <button onClick={() => setSelectedField(null)} className="p-1.5 rounded-xl hover:bg-secondary"><X className="w-5 h-5" /></button>
              </div>

              {/* Latest value */}
              {latest?.[selectedField.key] && (
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 rounded-2xl px-5 py-3 text-center">
                    <p className="text-xs text-muted-foreground">Attuale</p>
                    <p className="text-3xl font-heading font-bold text-primary">{latest[selectedField.key]}</p>
                    <p className="text-xs text-muted-foreground">cm</p>
                  </div>
                  {previous?.[selectedField.key] && (
                    <div>
                      <p className="text-xs text-muted-foreground">Variazione</p>
                      {(() => {
                        const diff = (latest[selectedField.key] - previous[selectedField.key]).toFixed(1);
                        return (
                          <p className={`text-xl font-heading font-bold ${Number(diff) > 0 ? "text-chart-3" : Number(diff) < 0 ? "text-accent" : "text-muted-foreground"}`}>
                            {Number(diff) > 0 ? "+" : ""}{diff} cm
                          </p>
                        );
                      })()}
                      <p className="text-xs text-muted-foreground">dall'ultima</p>
                    </div>
                  )}
                </div>
              )}

              {/* Chart */}
              {fieldChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={fieldChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit=" cm" domain={["dataMin - 1", "dataMax + 1"]} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12 }}
                      formatter={(v) => [`${v} cm`, selectedField.label]}
                    />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Aggiungi almeno 2 misurazioni per vedere il grafico.</p>
              )}

              {/* History list */}
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {[...logs].sort((a, b) => b.date.localeCompare(a.date)).filter(l => l[selectedField.key]).map(l => (
                  <div key={l.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-secondary/50">
                    <span className="text-muted-foreground">{moment(l.date).format("DD MMM YYYY")}</span>
                    <span className="font-semibold">{l[selectedField.key]} cm</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingLog(null); setForm({}); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-lg">{editingLog ? "Modifica Misurazione" : "Nuova Misurazione"}</h2>
                <button onClick={() => { setShowForm(false); setEditingLog(null); setForm({}); }} className="p-1.5 rounded-xl hover:bg-secondary"><X className="w-5 h-5" /></button>
              </div>
              {editingLog && <p className="text-sm text-muted-foreground">{moment(editingLog.date).format("DD MMMM YYYY")}</p>}
              {!editingLog && <p className="text-sm text-muted-foreground">Compila solo i campi che vuoi registrare oggi.</p>}
              <div className="grid grid-cols-2 gap-3">
                {MISURE_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label} (cm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="es. 85.5"
                      value={form[f.key] || ""}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value ? Number(e.target.value) : undefined }))}
                      className="h-10 rounded-xl"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingLog(null); setForm({}); }} className="flex-1 rounded-xl">Annulla</Button>
                <Button onClick={handleSave} disabled={saving || Object.values(form).every(v => !v)} className="flex-1 rounded-xl">
                  {saving ? "Salvataggio..." : editingLog ? "Salva Modifiche" : "Salva"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-2xl space-y-4">
              <h3 className="font-heading font-semibold text-lg">Elimina Misurazione</h3>
              <p className="text-sm text-muted-foreground">Sei sicuro? Questa azione è irreversibile.</p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="rounded-xl">Annulla</Button>
                <Button onClick={() => handleDelete(confirmDeleteId)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}