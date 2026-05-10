import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Dumbbell, Edit, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ExerciseForm from "@/components/ExerciseForm";
import { toast } from "sonner";

const MUSCLE_GROUPS = ["Petto", "Schiena", "Gambe", "Spalle", "Bicipiti", "Tricipiti", "Addominali", "Glutei", "Avambracci", "Polpacci"];
const EQUIPMENT = ["Corpo Libero", "Manubri", "Bilanciere", "Cavi", "Macchine", "Bande di Resistenza", "Kettlebell"];
const DIFFICULTIES = ["Principiante", "Intermedio", "Avanzato"];

const DIFFICULTY_COLORS = {
  Principiante: "bg-accent/10 text-accent",
  Intermedio: "bg-chart-3/10 text-chart-3",
  Avanzato: "bg-destructive/10 text-destructive",
};

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMuscle, setFilterMuscle] = useState("");
  const [filterEquipment, setFilterEquipment] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    fetchExercises();
  }, []);

  async function fetchExercises() {
    setLoading(true);
    const data = await base44.entities.LibraryExercise.list("-created_date", 200);
    setExercises(data);
    setLoading(false);
  }

  async function handleDelete(id) {
    await base44.entities.LibraryExercise.delete(id);
    setExercises(prev => prev.filter(ex => ex.id !== id));
    setConfirmDeleteId(null);
    toast.success("Esercizio eliminato.");
  }

  const filtered = exercises.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase()) || (ex.description || "").toLowerCase().includes(search.toLowerCase());
    const matchMuscle = !filterMuscle || ex.muscle_groups?.includes(filterMuscle);
    const matchEquip = !filterEquipment || ex.equipment?.includes(filterEquipment);
    const matchDiff = !filterDifficulty || ex.difficulty === filterDifficulty;
    return matchSearch && matchMuscle && matchEquip && matchDiff;
  });

  const hasActiveFilters = search || filterMuscle || filterEquipment || filterDifficulty;

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Libreria Esercizi</h1>
          <p className="text-muted-foreground mt-1 text-sm">{exercises.length} esercizi disponibili</p>
        </div>
        <Button onClick={() => { setEditingExercise(null); setShowForm(true); }} className="rounded-xl">
          <Plus className="w-4 h-4 mr-1" /> Nuovo
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca esercizio..." className="pl-9 rounded-xl h-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterMuscle} onValueChange={setFilterMuscle}>
            <SelectTrigger className="rounded-xl h-9 text-xs w-auto min-w-[130px]">
              <SelectValue placeholder="Gruppo Muscolare" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Tutti i muscoli</SelectItem>
              {MUSCLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEquipment} onValueChange={setFilterEquipment}>
            <SelectTrigger className="rounded-xl h-9 text-xs w-auto min-w-[130px]">
              <SelectValue placeholder="Attrezzatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Tutta l'attrezzatura</SelectItem>
              {EQUIPMENT.map(eq => <SelectItem key={eq} value={eq}>{eq}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="rounded-xl h-9 text-xs w-auto min-w-[110px]">
              <SelectValue placeholder="Difficoltà" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Tutte</SelectItem>
              {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setFilterMuscle(""); setFilterEquipment(""); setFilterDifficulty(""); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded-xl border border-border bg-secondary/40 transition-colors">
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nessun esercizio trovato</p>
          <p className="text-sm mt-1">Prova a cambiare i filtri o aggiungine uno nuovo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((ex, i) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                {ex.media_url && (
                  <div className="aspect-video bg-secondary">
                    {ex.media_url.match(/\.(mp4|webm|ogg)$/i)
                      ? <video src={ex.media_url} className="w-full h-full object-cover" />
                      : <img src={ex.media_url} alt={ex.name} className="w-full h-full object-cover" />}
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold leading-tight">{ex.name}</h3>
                      {ex.difficulty && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[ex.difficulty] || "bg-secondary text-muted-foreground"}`}>
                          {ex.difficulty}
                        </span>
                      )}
                    </div>
                    <button onClick={() => { setEditingExercise(ex); setShowForm(true); }}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => setConfirmDeleteId(ex.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {ex.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{ex.description}</p>
                  )}

                  {ex.muscle_groups?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ex.muscle_groups.map(g => (
                        <span key={g} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{g}</span>
                      ))}
                    </div>
                  )}

                  {ex.equipment?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ex.equipment.map(eq => (
                        <span key={eq} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{eq}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
            <div onClick={e => e.stopPropagation()}>
              <ExerciseForm
                exercise={editingExercise}
                onSave={fetchExercises}
                onClose={() => { setShowForm(false); setEditingExercise(null); }}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-heading font-semibold text-lg">Elimina Esercizio</h3>
              </div>
              <p className="text-sm text-muted-foreground">Sei sicuro? Questa azione è irreversibile.</p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="rounded-xl">Annulla</Button>
                <Button onClick={() => handleDelete(confirmDeleteId)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Elimina
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}