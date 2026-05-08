import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Zap, MessageSquare, Check, Edit2, Flame, Clock } from "lucide-react";
import RPEInfoTooltip from "./RPEInfoTooltip";

const RPE_HIDDEN_KEY = "rpe_tooltip_dismissed";

export default function SessionDayLogger({ planId, dayLabel, date, existingSession, onSaved }) {
  const [rpe, setRpe] = useState(existingSession?.rpe ? String(existingSession.rpe) : "");
  const [hr, setHr] = useState(existingSession?.heart_rate_avg ? String(existingSession.heart_rate_avg) : "");
  const [note, setNote] = useState(existingSession?.athlete_note || "");
  const [calories, setCalories] = useState(existingSession?.calories ? String(existingSession.calories) : "");
  const [trainingMinutes, setTrainingMinutes] = useState(existingSession?.training_minutes ? String(existingSession.training_minutes) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existingSession);
  const [editing, setEditing] = useState(false);
  const rpeHidden = !!localStorage.getItem(RPE_HIDDEN_KEY);

  const showForm = !saved || editing;

  async function handleSave() {
    setSaving(true);
    const data = {
      plan_id: planId,
      day_label: dayLabel,
      date,
      rpe: rpe ? Number(rpe) : undefined,
      heart_rate_avg: hr ? Number(hr) : undefined,
      calories: calories ? Number(calories) : undefined,
      training_minutes: trainingMinutes ? Number(trainingMinutes) : undefined,
      athlete_note: note || undefined,
    };

    let session;
    if (existingSession?.id) {
      session = await base44.entities.WorkoutSession.update(existingSession.id, data);
    } else {
      session = await base44.entities.WorkoutSession.create(data);
    }
    onSaved(session);
    setSaved(true);
    setEditing(false);
    setSaving(false);
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          📊 Dati Sessione di Oggi
        </p>
        {saved && !editing && (
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      <RPEInfoTooltip />

      {saved && !editing ? (
        <div className="flex flex-wrap gap-2">
          {rpe && (
            <span className="flex items-center gap-1.5 text-sm bg-chart-3/10 text-chart-3 px-3 py-1.5 rounded-xl font-medium">
              <Zap className="w-4 h-4" /> RPE: {rpe}/10
            </span>
          )}
          {hr && (
            <span className="flex items-center gap-1.5 text-sm bg-destructive/10 text-destructive px-3 py-1.5 rounded-xl font-medium">
              <Heart className="w-4 h-4" /> {hr} bpm
            </span>
          )}
          {calories && (
            <span className="flex items-center gap-1.5 text-sm bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-xl font-medium">
              <Flame className="w-4 h-4" /> {calories} kcal
            </span>
          )}
          {trainingMinutes && (
            <span className="flex items-center gap-1.5 text-sm bg-secondary text-muted-foreground px-3 py-1.5 rounded-xl">
              <Clock className="w-4 h-4" /> {trainingMinutes} min
            </span>
          )}
          {note && (
            <span className="flex items-center gap-1.5 text-sm bg-secondary px-3 py-1.5 rounded-xl text-muted-foreground w-full">
              <MessageSquare className="w-4 h-4 shrink-0" /> {note}
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {!rpeHidden && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> RPE (1-10)</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="es. 7"
                  value={rpe}
                  onChange={e => setRpe(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> FC Media (bpm)</span>
              </label>
              <Input type="number" placeholder="es. 145" value={hr} onChange={e => setHr(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> Calorie (kcal)</span>
              </label>
              <Input type="number" placeholder="es. 450" value={calories} onChange={e => setCalories(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Durata (min)</span>
              </label>
              <Input type="number" placeholder="es. 60" value={trainingMinutes} onChange={e => setTrainingMinutes(e.target.value)} className="h-10 rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Note personali (visibili al trainer)</span>
            </label>
            <textarea
              placeholder="Come ti sei sentito? Difficoltà particolari..."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full text-sm bg-background border border-input rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="h-9 rounded-xl px-5">
            <Check className="w-4 h-4 mr-1" />
            {saving ? "Salvataggio..." : "Salva Dati Sessione"}
          </Button>
        </div>
      )}
    </div>
  );
}