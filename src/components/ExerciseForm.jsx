import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Check, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const MUSCLE_GROUPS = ["Petto", "Schiena", "Gambe", "Spalle", "Bicipiti", "Tricipiti", "Addominali", "Glutei", "Avambracci", "Polpacci"];
const EQUIPMENT = ["Corpo Libero", "Manubri", "Bilanciere", "Cavi", "Macchine", "Bande di Resistenza", "Kettlebell"];
const DIFFICULTIES = ["Principiante", "Intermedio", "Avanzato"];

export default function ExerciseForm({ exercise, onSave, onClose }) {
  const isEditing = !!exercise?.id;
  const [form, setForm] = useState({
    name: exercise?.name || "",
    description: exercise?.description || "",
    muscle_groups: exercise?.muscle_groups || [],
    equipment: exercise?.equipment || [],
    difficulty: exercise?.difficulty || "",
    media_url: exercise?.media_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const toggleMulti = (field, val) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(val) ? prev[field].filter(v => v !== val) : [...prev[field], val]
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, media_url: file_url }));
      toast.success("File caricato!");
    } catch {
      toast.error("Errore nel caricamento del file.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || form.muscle_groups.length === 0) return;
    setSaving(true);
    try {
      if (isEditing) {
        await base44.entities.LibraryExercise.update(exercise.id, form);
        toast.success("Esercizio aggiornato!");
      } else {
        await base44.entities.LibraryExercise.create(form);
        toast.success("Esercizio aggiunto!");
      }
      onSave();
      onClose();
    } catch {
      toast.error("Errore nel salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-lg">{isEditing ? "Modifica Esercizio" : "Nuovo Esercizio"}</h2>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nome Esercizio *</Label>
          <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="es. Panca Piana" required className="mt-1 rounded-xl" />
        </div>

        <div>
          <Label>Descrizione</Label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Descrivi l'esecuzione corretta..."
            rows={3}
            className="mt-1 w-full text-sm bg-background border border-input rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <Label>Gruppi Muscolari *</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {MUSCLE_GROUPS.map(g => (
              <button key={g} type="button" onClick={() => toggleMulti("muscle_groups", g)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.muscle_groups.includes(g) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-secondary/40 hover:border-primary/40"}`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Attrezzatura</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {EQUIPMENT.map(eq => (
              <button key={eq} type="button" onClick={() => toggleMulti("equipment", eq)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.equipment.includes(eq) ? "bg-accent text-accent-foreground border-accent" : "border-border bg-secondary/40 hover:border-accent/40"}`}>
                {eq}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Difficoltà</Label>
          <Select value={form.difficulty} onValueChange={v => setForm(p => ({ ...p, difficulty: v }))}>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder="Seleziona difficoltà" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Media (Immagine / Video)</Label>
          <div className="mt-1 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer bg-secondary hover:bg-secondary/80 px-3 py-2 rounded-xl border border-border transition-colors">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Caricamento..." : "Carica file"}
              <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
            </label>
            {form.media_url && (
              <button type="button" onClick={() => setForm(p => ({ ...p, media_url: "" }))} className="text-xs text-destructive hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Rimuovi
              </button>
            )}
          </div>
          {form.media_url && (
            <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-secondary">
              {form.media_url.match(/\.(mp4|webm|ogg)$/i)
                ? <video src={form.media_url} controls className="w-full h-full object-contain" />
                : <img src={form.media_url} alt="media" className="w-full h-full object-contain" />}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">Annulla</Button>
          <Button type="submit" disabled={saving || uploading || !form.name || form.muscle_groups.length === 0} className="flex-1 rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            {isEditing ? "Salva Modifiche" : "Aggiungi"}
          </Button>
        </div>
      </form>
    </div>
  );
}