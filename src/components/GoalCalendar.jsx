import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight, Droplets, Pill } from "lucide-react";

const DAYS = ["L", "M", "M", "G", "V", "S", "D"];

export default function GoalCalendar() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [waterLogs, setWaterLogs] = useState([]);
  const [mealLogs, setMealLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().split("T")[0];
      const [wl, ml] = await Promise.all([
        base44.entities.WaterLog.filter({ date: { $gte: threeMonthsAgo } }, "-date", 200),
        base44.entities.MealLog.filter({ date: { $gte: threeMonthsAgo } }, "-date", 200),
      ]);
      setWaterLogs(wl);
      setMealLogs(ml);
      setLoading(false);
    }
    load();
  }, []);

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }
  function nextMonth() {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (next <= today) setCurrentMonth(next);
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  function dateStr(d) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const waterMap = Object.fromEntries(
    waterLogs
      .filter((l) => l.ml_drank != null && l.goal_ml != null && l.ml_drank >= l.goal_ml)
      .map((l) => [l.date, true])
  );
  const mealMap = Object.fromEntries(
    mealLogs.filter((l) => l.completed).map((l) => [l.date, true])
  );

  const monthName = currentMonth.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const isFutureMonth = new Date(year, month + 1, 1) > today;

  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const daysElapsed = month === today.getMonth() && year === today.getFullYear() ? today.getDate() : daysInMonth;
  const waterDays = Object.keys(waterMap).filter(d => d.startsWith(prefix)).length;
  const mealDays = Object.keys(mealMap).filter(d => d.startsWith(prefix)).length;
  const bothDays = Array.from({ length: daysInMonth }, (_, i) => dateStr(i + 1))
    .filter(d => waterMap[d] && mealMap[d]).length;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /><Droplets className="w-3 h-3" /> Acqua</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-accent inline-block" /><Pill className="w-3 h-3" /> Integratori</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Entrambi ⭐</span>
      </div>

      {/* Month header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-xl hover:bg-secondary transition-colors">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <p className="text-sm font-semibold capitalize">{monthName}</p>
        <button onClick={nextMonth} disabled={isFutureMonth} className="p-1.5 rounded-xl hover:bg-secondary transition-colors disabled:opacity-30">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: totalCells }, (_, i) => {
            const dayNum = i - startOffset + 1;
            if (dayNum < 1 || dayNum > daysInMonth) return <div key={i} />;
            const ds = dateStr(dayNum);
            const isToday = ds === today.toISOString().split("T")[0];
            const isFuture = new Date(year, month, dayNum) > today;
            const hasWater = !!waterMap[ds];
            const hasMeal = !!mealMap[ds];
            const hasBoth = hasWater && hasMeal;

            return (
              <div
                key={i}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium
                  ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}
                  ${isFuture ? "opacity-30" : ""}
                  ${hasBoth ? "bg-yellow-400/20" : hasWater ? "bg-blue-400/10" : hasMeal ? "bg-accent/10" : "bg-secondary/20"}
                `}
              >
                <span className={isToday ? "text-primary font-bold" : ""}>{dayNum}</span>
                <div className="flex gap-0.5 mt-0.5">
                  {hasBoth
                    ? <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    : <>
                        {hasWater && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        {hasMeal && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                      </>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly stats */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="bg-blue-400/10 rounded-2xl px-3 py-3 text-center">
          <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="text-lg font-bold font-heading text-blue-400">{waterDays}</p>
          <p className="text-[11px] text-muted-foreground">{daysElapsed > 0 ? `${Math.round(waterDays / daysElapsed * 100)}%` : "—"}</p>
        </div>
        <div className="bg-accent/10 rounded-2xl px-3 py-3 text-center">
          <Pill className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="text-lg font-bold font-heading text-accent">{mealDays}</p>
          <p className="text-[11px] text-muted-foreground">{daysElapsed > 0 ? `${Math.round(mealDays / daysElapsed * 100)}%` : "—"}</p>
        </div>
        <div className="bg-yellow-400/10 rounded-2xl px-3 py-3 text-center">
          <span className="text-base block mb-1">⭐</span>
          <p className="text-lg font-bold font-heading text-yellow-500">{bothDays}</p>
          <p className="text-[11px] text-muted-foreground">{daysElapsed > 0 ? `${Math.round(bothDays / daysElapsed * 100)}%` : "—"}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">Gli obiettivi si aggiornano automaticamente dalla dashboard</p>
    </div>
  );
}