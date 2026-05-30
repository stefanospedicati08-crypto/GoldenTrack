import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Heart, Zap, MessageSquare, Check, Edit2, Flame, Clock } from "lucide-react";
import RPEInfoTooltip from "./RPEInfoTooltip";

const RPE_HIDDEN_KEY = "rpe_tooltip_dismissed";

export default function SessionDayLogger({ planId, dayLabel, date, existingSession, onSaved, inline = false }) {
  const [rpe, setRpe] = useState(existingSession?.rpe ? String(existingSession.rpe) : "");
  const [hr, setHr] = useState(existingSession?.heart_rate_avg ? String(existingSession.heart_rate_avg) : "");
  const [note, setNote] = useState(existingSession?.athlete_note || "");
  const [calories, setCalories] = useState(existingSession?.calories ? String(existingSession.calories) : "");
  const existingTotalMinutes = existingSession?.training_minutes || 0;
  const [durationHours, setDurationHours] = useState(existingTotalMinutes ? String(Math.floor(existingTotalMinutes / 60)) : "");
  const [durationMinutes, setDurationMinutes] = useState(existingTotalMinutes ? String(Math.floor(existingTotalMinutes % 60)) : "");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existingSession);
  const [editing, setEditing] = useState(false);
  const rpeHidden = !!localStorage.getItem(RPE_HIDDEN_KEY);
  const showForm = !saved || editing;

  async function handleSave() {
    setSaving(true);
    const data = {
      plan_id: planId, day_label: dayLabel, date,
      rpe: rpe ? Number(rpe) : undefined,
      heart_rate_avg: hr ? Number(hr) : undefined,
      calories: calories ? Number(calories) : undefined,
      training_minutes: (durationHours || durationMinutes || durationSeconds)
        ? (Number(durationHours || 0) * 60) + Number(durationMinutes || 0) + (Number(durationSeconds || 0) / 60)
        : undefined,
      athlete_note: note || undefined,
    };
    let session;
    if (existingSession?.id) {
      session = await base44.entities.WorkoutSession.update(existingSession.id, data);
    } else {
      session = await base44.entities.WorkoutSession.create(data);
    }
    onSaved(session);
    setSaved(true); setEditing(false); setSaving(false);
  }

  const inputClass = "h-11 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm";
  const labelClass = "text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5 flex items-center gap-1";

  return (
    <div className={inline ? "space-y-4" : "bg-white/4 border border-white/8 rounded-3xl p-4 space-y-4"}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Dati Sessione</p>
        {saved && !editing && (
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-xl hover:bg-white/8 transition-colors">
            <Edit2 className="w-3.5 h-3.5 text-white/30" />
          </button>
        )}
      </div>

      <RPEInfoTooltip />

      {saved && !editing ? (
        <div className="flex flex-wrap gap-2">
          {rpe && (
            <span className="flex items-center gap-1.5 text-sm bg-orange-400/10 text-orange-400 px-3 py-1.5 rounded-2xl font-medium">
              <Zap className="w-4 h-4" /> RPE: {rpe}/10
            </span>
          )}
          {hr && (
            <span className="flex items-center gap-1.5 text-sm bg-red-400/10 text-red-400 px-3 py-1.5 rounded-2xl font-medium">
              <Heart className="w-4 h-4" /> {hr} bpm
            </span>
          )}
          {calories && (
            <span className="flex items-center gap-1.5 text-sm bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-2xl font-medium">
              <Flame className="w-4 h-4" /> {calories} kcal
            </span>
          )}
          {(durationHours || durationMinutes) && (
            <span className="flex items-center gap-1.5 text-sm bg-white/6 text-white/40 px-3 py-1.5 rounded-2xl">
              <Clock className="w-4 h-4" />
              {durationHours ? `${durationHours}h ` : ""}{durationMinutes ? `${durationMinutes}min` : ""}{durationSeconds ? ` ${durationSeconds}s` : ""}
            </span>
          )}
          {note && (
            <span className="flex items-center gap-1.5 text-sm bg-white/5 px-3 py-1.5 rounded-2xl text-white/35 w-full">
              <MessageSquare className="w-4 h-4 shrink-0" /> {note}
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {!rpeHidden && (
              <div>
                <label className={labelClass}><Zap className="w-3 h-3 text-orange-400" /> RPE (1-10)</label>
                <Input type="number" min="1" max="10" placeholder="es. 7"
                  value={rpe} onChange={e => setRpe(e.target.value)} className={inputClass} />
              </div>
            )}
            <div>
              <label className={labelClass}><Heart className="w-3 h-3 text-red-400" /> FC Media (bpm)</label>
              <Input type="number" placeholder="es. 145"
                value={hr} onChange={e => setHr(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}><Flame className="w-3 h-3 text-orange-400" /> Calorie (kcal)</label>
              <Input type="number" placeholder="es. 450"
                value={calories} onChange={e => setCalories(e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}><Clock className="w-3 h-3 text-white/40" /> Durata</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: durationHours, set: setDurationHours, label: "ore", max: undefined },
                  { val: durationMinutes, set: setDurationMinutes, label: "min", max: 59 },
                  { val: durationSeconds, set: setDurationSeconds, label: "sec", max: 59 },
                ].map(({ val, set, label, max }) => (
                  <div key={label}>
                    <Input type="number" min="0" max={max} placeholder="0"
                      value={val} onChange={e => set(e.target.value)}
                      className={inputClass + " text-center"} />
                    <p className="text-[10px] text-center text-white/20 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className={labelClass}><MessageSquare className="w-3 h-3" /> Note personali</label>
            <textarea placeholder="Come ti sei sentito? Difficoltà particolari..."
              value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full text-sm bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 resize-none focus:outline-none focus:border-[#fcd12a]/30 text-white placeholder:text-white/20" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full h-12 rounded-2xl bg-[#fcd12a] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#fcd12a]/90 disabled:opacity-50 transition-all">
            <Check className="w-4 h-4" />
            {saving ? "Salvataggio..." : "Salva Dati Sessione"}
          </button>
        </div>
      )}
    </div>
  );
}