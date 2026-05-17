import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Droplets, Plus, Minus, Settings, Check } from "lucide-react";
import ProgressCircle from "./ProgressCircle";

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
      setGoal(savedGoal);
      setGoalInput(String(savedGoal));
      const logs = await base44.entities.WaterLog.filter({ created_by: user.email, date: today }, "-created_date", 1);
      setLog(logs[0] || null);
      setLoading(false);
    }
    load();
  }, []);

  const drank = log?.ml_drank || 0;

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
    if (log?.id) {
      await base44.entities.WaterLog.update(log.id, { goal_ml: newGoal });
    }
    setEditingGoal(false);
  }

  if (loading) return null;

  return (
    <div className="p-5 space-y-3 bg-[hsl(var(--popover))] rounded-[50px]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[hsl(var(--background))] rounded-[50px]">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-400 mx-1" />
          <h3 className="font-heading font-semibold">Idratazione</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-blue-400">{drank} / {goal} ml</span>
          <button onClick={() => setEditingGoal((v) => !v)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <Settings className="w-3.5 h-3.5 text-muted-foreground mx-2" />
          </button>
        </div>
      </div>

      {/* Goal editor — stepper +/- 250ml */}
      {editingGoal &&
      <div className="flex items-center justify-between bg-secondary/40 rounded-xl px-3 py-2">
          <span className="text-xs text-muted-foreground">Obiettivo</span>
          <div className="flex items-center gap-2">
            <button
            onClick={() => setGoalInput(String(Math.max(500, Number(goalInput) - 250)))}
            className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-base font-bold transition-colors">
            
              −
            </button>
            <span className="text-sm font-bold text-blue-400 w-20 text-center">{Number(goalInput)} ml</span>
            <button
            onClick={() => setGoalInput(String(Number(goalInput) + 250))}
            className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-base font-bold transition-colors">
            
              +
            </button>
            <button onClick={saveGoal} className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground ml-1 transition-colors hover:bg-primary/90">
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      }

      {/* Circular progress + buttons on right */}
      <div className="flex items-center gap-6">
        <div className="flex justify-center">
          <ProgressCircle completed={drank} total={goal} size={100} />
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => addWater(150)}
          className="flex items-center justify-center gap-2 bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 text-xs font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap">
            <Plus className="w-3 h-3" />150ml
          </button>
          <button onClick={() => addWater(250)}
          className="flex items-center justify-center gap-2 bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 text-xs font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap">
            <Plus className="w-3 h-3" />250ml
          </button>
          <button onClick={() => addWater(500)}
          className="flex items-center justify-center gap-2 bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 text-xs font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap">
            <Plus className="w-3 h-3" />500ml
          </button>
          <button onClick={removeWater} disabled={drank === 0}
          className="flex items-center justify-center px-4 bg-secondary hover:bg-secondary/80 text-muted-foreground text-xs rounded-lg py-2 transition-colors disabled:opacity-30">
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>);

}