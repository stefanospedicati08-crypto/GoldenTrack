import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { User } from "lucide-react";

export default function ProfileCompleteModal({ user, onComplete }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    birth_year: user?.birth_year ? String(user.birth_year) : "",
    initial_weight_kg: user?.initial_weight_kg ? String(user.initial_weight_kg) : "",
    height_cm: user?.height_cm ? String(user.height_cm) : "",
  });
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const isValid =
    form.first_name.trim() &&
    form.last_name.trim() &&
    form.birth_year.length === 4 &&
    Number(form.birth_year) >= 1920 &&
    Number(form.birth_year) <= currentYear - 10;

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await base44.auth.updateMe({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      birth_year: Number(form.birth_year),
      initial_weight_kg: form.initial_weight_kg ? Number(form.initial_weight_kg) : undefined,
      height_cm: form.height_cm ? Number(form.height_cm) : undefined,
    });
    setSaving(false);
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg">Completa il profilo</h3>
            <p className="text-xs text-muted-foreground">Benvenuto! Inserisci i tuoi dati</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome *</label>
              <Input
                placeholder="es. Mario"
                value={form.first_name}
                onChange={e => set("first_name", e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Cognome *</label>
              <Input
                placeholder="es. Rossi"
                value={form.last_name}
                onChange={e => set("last_name", e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Anno di nascita *</label>
            <Input
              type="number"
              placeholder="es. 1990"
              value={form.birth_year}
              onChange={e => set("birth_year", e.target.value)}
              min="1920"
              max={currentYear - 10}
              className="h-10 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Peso (kg)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="es. 75"
                value={form.initial_weight_kg}
                onChange={e => set("initial_weight_kg", e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Altezza (cm)</label>
              <Input
                type="number"
                placeholder="es. 175"
                value={form.height_cm}
                onChange={e => set("height_cm", e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">I campi contrassegnati con * sono obbligatori</p>

        <Button onClick={handleSave} disabled={saving || !isValid} className="w-full rounded-xl h-11">
          {saving ? "Salvataggio..." : "Conferma e Continua"}
        </Button>
      </motion.div>
    </div>
  );
}