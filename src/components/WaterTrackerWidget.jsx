import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Droplets, Plus, Minus, Settings, Check } from "lucide-react";

const RADIUS = 34;
const CIRC = 2 * Math.PI * RADIUS;

function WaterRing({ drank, goal }) {
  const pct = goal > 0 ? Math.min(drank / goal, 1) : 0;
  const done = pct >= 1;
  return (
    <svg width={88} height={88} className="-rotate-90">
      <circle cx={44} cy={44} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle cx={44} cy={44} r={RADIUS} fill="none"
        stroke={done ? "#4ade80" : "#60a5fa"}
        strokeWidth="5" strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={CIRC * (1 - pct)}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

export default function WaterTrackerWidget() {
  const [log, setLog] = useState(null);
  const [goal, setGoal] = useState(2500);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      const user = await base44.auth.me();
      const savedGoal = user.water_goal_ml || 2500;
      setGoal(savedGoal); setGoalInput(String(savedGoal));
      const logs = await base44.entities.WaterLog.filter({ created_by: user.email, date: today }, "-created_date", 1);
      setLog(logs[0] || null); setLoading(false);
    }
    load();
  }, []);

  const drank = log?.ml_drank || 0;
  const pct = Math.min(Math.round((drank / goal) * 100), 100);

  async function addWater(ml) {
    const newMl = drank + ml;
    if (log?.id) {
      const updated = await base44.entities.WaterLog.update(log.id, { ml_drank: newMl, goal_ml: goal });
      setLog(updated);
    } else {
      const created = await base44.entities.WaterLog.create({ date: today, ml_drank: newMl, goal_ml: goal });
      setLog(created);
    }
  }

  async function removeWater() {
    if (!log?.id || drank <= 0) return;
    const updated = await base44.entities.WaterLog.update(log.id, { ml_drank: Math.max(0, drank - 250) });
    setLog(updated);
  }

  async function saveGoal() {
    const newGoal = Number(goalInput);
    if (!newGoal || newGoal < 100) return;
    setGoal(newGoal);
    await base44.auth.updateMe({ water_goal_ml: newGoal });
    if (log?.id) await base44.entities.WaterLog.update(log.id, { goal_ml: newGoal });
    setEditingGoal(false);
  }

  if (loading) return null;

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex items-center gap-4">
        {/* Ring */}
        <div className="relative shrink-0">
          <WaterRing drank={drank} goal={goal} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-white leading-none">{pct}%</span>
          </div>
        </div>

        {/* Numbers + add buttons */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-heading font-bold text-blue-400">{drank}</span>
              <span className="text-xs text-white/30 ml-1">/ {goal} ml</span>
            </div>
            <button onClick={() => setEditingGoal(v => !v)}
              className="p-1.5 rounded-xl hover:bg-white/8 transition-colors">
              <Settings className="w-3.5 h-3.5 text-white/25" />
            </button>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {[150, 250, 500].map(ml => (
              <button key={ml} onClick={() => addWater(ml)}
                className="flex items-center gap-1 bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 text-xs font-medium rounded-xl px-3 py-1.5 transition-colors">
                <Plus className="w-3 h-3" />{ml}ml
              </button>
            ))}
            <button onClick={removeWater} disabled={drank === 0}
              className="bg-white/5 hover:bg-white/10 text-white/35 rounded-xl px-3 py-1.5 transition-colors disabled:opacity-30">
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Goal editor */}
      {editingGoal && (
        <div className="flex items-center gap-2 bg-white/4 rounded-2xl px-3 py-2">
          <span className="text-xs text-white/30 flex-1">Obiettivo giornaliero</span>
          <button onClick={() => setGoalInput(String(Math.max(500, Number(goalInput) - 250)))}
            className="w-8 h-8 rounded-xl bg-white/8 text-white/60 text-base font-bold flex items-center justify-center hover:bg-white/12">−</button>
          <span className="text-sm font-bold text-blue-400 w-20 text-center">{Number(goalInput)} ml</span>
          <button onClick={() => setGoalInput(String(Number(goalInput) + 250))}
            className="w-8 h-8 rounded-xl bg-white/8 text-white/60 text-base font-bold flex items-center justify-center hover:bg-white/12">+</button>
          <button onClick={saveGoal}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#fcd12a] text-black">
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}