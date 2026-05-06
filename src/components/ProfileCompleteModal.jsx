import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { User } from "lucide-react";

export default function ProfileCompleteModal({ user, onComplete }) {
  const [birthYear, setBirthYear] = useState("");
  const [saving, setSaving] = useState(false);
  const currentYear = new Date().getFullYear();
  const isValid = birthYear.length === 4 && Number(birthYear) >= 1920 && Number(birthYear) <= currentYear - 10;

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    await base44.auth.updateMe({ birth_year: Number(birthYear) });
    setSaving(false);
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-2xl space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg">Completa il profilo</h3>
            <p className="text-xs text-muted-foreground">Benvenuto, {user?.full_name?.split(" ")[0]}!</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Per completare la registrazione inserisci il tuo <strong>anno di nascita</strong>. Questo dato è obbligatorio.
        </p>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Anno di nascita *</label>
          <Input
            type="number"
            placeholder="es. 1990"
            value={birthYear}
            onChange={e => setBirthYear(e.target.value)}
            min="1920"
            max={currentYear - 10}
            className="h-11 rounded-xl"
            onKeyDown={e => e.key === "Enter" && isValid && handleSave()}
          />
        </div>
        <Button onClick={handleSave} disabled={saving || !isValid} className="w-full rounded-xl h-11">
          {saving ? "Salvataggio..." : "Conferma e Continua"}
        </Button>
      </motion.div>
    </div>
  );
}