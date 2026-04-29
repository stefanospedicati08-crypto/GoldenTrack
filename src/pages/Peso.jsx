import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";
import moment from "moment";

export default function Peso() {
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWeight, setNewWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await base44.auth.me();
      const w = await base44.entities.BodyWeight.filter({ created_by: user.email }, "-date", 100);
      setWeights(w);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!newWeight) return;
    setSaving(true);
    const entry = await base44.entities.BodyWeight.create({
      weight_kg: Number(newWeight),
      date: new Date().toISOString().split("T")[0],
      notes: notes || undefined,
    });
    setWeights(prev => [entry, ...prev]);
    setNewWeight("");
    setNotes("");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.slice(-30).map(w => ({
    date: moment(w.date).format("DD/MM"),
    kg: w.weight_kg,
  }));

  const latest = weights[0]?.weight_kg;
  const previous = weights[1]?.weight_kg;
  const diff = latest && previous ? (latest - previous).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Peso Corporeo</h1>
        <p className="text-muted-foreground mt-1">Monitora i tuoi progressi</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <p className="text-sm text-muted-foreground">Peso Attuale</p>
          <p className="text-3xl font-heading font-bold mt-1">{latest ? `${latest}` : "—"}</p>
          <p className="text-xs text-muted-foreground">kg</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <p className="text-sm text-muted-foreground">Variazione</p>
          <div className="flex items-center gap-2 mt-1">
            {diff !== null ? (
              <>
                {Number(diff) > 0 ? (
                  <TrendingUp className="w-5 h-5 text-chart-3" />
                ) : Number(diff) < 0 ? (
                  <TrendingDown className="w-5 h-5 text-accent" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-2xl font-heading font-bold">
                  {Number(diff) > 0 ? "+" : ""}{diff}
                </span>
              </>
            ) : (
              <span className="text-2xl font-heading font-bold">—</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">kg dall'ultima misurazione</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-5 col-span-2 sm:col-span-1"
        >
          <p className="text-sm text-muted-foreground">Misurazioni</p>
          <p className="text-3xl font-heading font-bold mt-1">{weights.length}</p>
          <p className="text-xs text-muted-foreground">registrazioni totali</p>
        </motion.div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <h2 className="font-heading font-semibold mb-4">Andamento Peso</h2>
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
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                unit=" kg"
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="kg"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#weightGrad)"
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Add weight */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
        <h2 className="font-heading font-semibold mb-4">Registra Peso</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="number"
              step="0.1"
              placeholder="es. 75.5"
              value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="flex-1">
            <Input
              placeholder="Note (opzionale)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <Button onClick={handleSave} disabled={saving || !newWeight} className="h-11 rounded-xl px-6">
            <Plus className="w-4 h-4 mr-1" />
            {saving ? "Salvataggio..." : "Aggiungi"}
          </Button>
        </div>
      </motion.div>

      {/* History */}
      {weights.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold">Storico</h2>
          <div className="space-y-2">
            {weights.slice(0, 20).map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 bg-card rounded-xl border border-border p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{w.weight_kg} kg</p>
                  <p className="text-sm text-muted-foreground">{moment(w.date).format("DD MMMM YYYY")}</p>
                </div>
                {w.notes && <p className="text-sm text-muted-foreground">{w.notes}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}