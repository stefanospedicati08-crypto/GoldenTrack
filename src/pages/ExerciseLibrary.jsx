import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Dumbbell, Edit, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ExerciseForm from "@/components/ExerciseForm";
import { toast } from "sonner";

const MUSCLE_GROUP_ORDER = [
  "Petto", "Dorso", "Gambe", "Deltoidi", "Bicipiti", "Tricipiti", "Addome", "Corpo Libero", "Total Body", "Cardio"
];

const MUSCLE_GROUP_COLORS = {
  Petto:      { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30",    dot: "bg-red-400" },
  Dorso:      { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/30",   dot: "bg-blue-400" },
  Gambe:      { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/30",  dot: "bg-green-400" },
  Deltoidi:   { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
  Bicipiti:   { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-400" },
  Tricipiti:  { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-400" },
  Addome:     { bg: "bg-pink-500/10",   text: "text-pink-400",   border: "border-pink-500/30",   dot: "bg-pink-400" },
  "Corpo Libero": { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30",   dot: "bg-cyan-400" },
  "Total Body":   { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30", dot: "bg-indigo-400" },
  "Cardio":       { bg: "bg-teal-500/10",  text: "text-teal-400",  border: "border-teal-500/30",  dot: "bg-teal-400" },
};

const DIFFICULTY_BADGE = {
  Principiante: "bg-accent/10 text-accent",
  Intermedio:   "bg-chart-3/10 text-chart-3",
  Avanzato:     "bg-destructive/10 text-destructive",
};

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(() =>
    Object.fromEntries(MUSCLE_GROUP_ORDER.map(g => [g, true]))
  );

  useEffect(() => {
    async function init() {
      const user = await base44.auth.me();
      setIsAdmin(user?.role === "admin");
      fetchExercises();
    }
    init();
  }, []);

  async function fetchExercises() {
    setLoading(true);
    const data = await base44.entities.LibraryExercise.list("-created_date", 300);
    setExercises(data);
    setLoading(false);
  }

  async function handleDelete(id) {
    await base44.entities.LibraryExercise.delete(id);
    setExercises(prev => prev.filter(ex => ex.id !== id));
    setConfirmDeleteId(null);
    toast.success("Esercizio eliminato.");
  }

  const toggleGroup = (group) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Filter and group exercises
  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    ex.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by primary muscle group
  const grouped = {};
  MUSCLE_GROUP_ORDER.forEach(g => { grouped[g] = []; });

  filtered.forEach(ex => {
    const primaryGroup = ex.muscle_groups?.[0] || "Altro";
    if (grouped[primaryGroup]) {
      grouped[primaryGroup].push(ex);
    } else {
      if (!grouped["Altro"]) grouped["Altro"] = [];
      grouped["Altro"].push(ex);
    }
  });

  const totalCount = filtered.length;

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Libreria Esercizi</h1>
          <p className="text-muted-foreground mt-1 text-sm">{totalCount} esercizi disponibili</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingExercise(null); setShowForm(true); }} className="rounded-xl">
            <Plus className="w-4 h-4 mr-1" /> Nuovo
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca esercizio..."
          className="pl-9 rounded-xl h-10"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nessun esercizio trovato</p>
        </div>
      ) : (
        <div className="space-y-4">
          {MUSCLE_GROUP_ORDER.map(group => {
            const groupExercises = grouped[group] || [];
            if (groupExercises.length === 0) return null;
            const colors = MUSCLE_GROUP_COLORS[group] || MUSCLE_GROUP_COLORS["Petto"];
            const isCollapsed = collapsedGroups[group];

            return (
              <motion.div
                key={group}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border ${colors.border} overflow-hidden`}
              >
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 ${colors.bg} hover:opacity-90 transition-opacity`}
                >
                  <div className={`w-3 h-3 rounded-full ${colors.dot} shrink-0`} />
                  <span className={`font-heading font-bold text-base flex-1 text-left ${colors.text}`}>{group}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 ${colors.text}`}>
                    {groupExercises.length} esercizi
                  </span>
                  {isCollapsed
                    ? <ChevronDown className={`w-4 h-4 ${colors.text}`} />
                    : <ChevronUp className={`w-4 h-4 ${colors.text}`} />}
                </button>

                {/* Exercises */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="divide-y divide-border">
                        {groupExercises.map((ex, i) => (
                          <motion.div
                            key={ex.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="px-4 py-4 bg-card hover:bg-secondary/20 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                <Dumbbell className={`w-4 h-4 ${colors.text}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-sm">{ex.name}</h3>
                                  {ex.difficulty && (
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_BADGE[ex.difficulty] || "bg-secondary text-muted-foreground"}`}>
                                      {ex.difficulty}
                                    </span>
                                  )}
                                </div>
                                {ex.description && (
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ex.description}</p>
                                )}
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {ex.muscle_groups?.slice(1).map(g => (
                                    <span key={g} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">+{g}</span>
                                  ))}
                                  {ex.equipment?.map(eq => (
                                    <span key={eq} className="text-[10px] bg-secondary/60 text-muted-foreground px-2 py-0.5 rounded-full">{eq}</span>
                                  ))}
                                </div>
                                {ex.media_url && (
                                  <div className="mt-2 rounded-xl overflow-hidden max-w-xs aspect-video bg-secondary">
                                    {ex.media_url.match(/\.(mp4|webm|ogg)$/i)
                                      ? <video src={ex.media_url} controls className="w-full h-full object-cover" />
                                      : <img src={ex.media_url} alt={ex.name} className="w-full h-full object-cover" />}
                                  </div>
                                )}
                              </div>
                              {isAdmin && (
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => { setEditingExercise(ex); setShowForm(true); }}
                                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(ex.id)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
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

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-2xl space-y-4"
            >
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