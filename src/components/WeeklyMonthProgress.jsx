import ProgressCircle from "./ProgressCircle";

const SESSIONS_PER_WEEK = 4;

function getMonthWeeks() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Get Monday of the week containing the 1st of the month
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const firstMonday = new Date(firstDay);
  firstMonday.setDate(firstDay.getDate() + mondayOffset);

  const weeks = [];
  for (let i = 0; i < 4; i++) {
    const start = new Date(firstMonday);
    start.setDate(firstMonday.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    weeks.push({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      label: `Sett. ${i + 1}`,
    });
  }
  return weeks;
}

export default function WeeklyMonthProgress({ sessions }) {
  const weeks = getMonthWeeks();
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-3">
      <h3 className="font-heading font-semibold text-lg">Progresso Mensile</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {weeks.map((week, i) => {
          const weekSessions = sessions.filter(s => s.date >= week.start && s.date <= week.end);
          const uniqueDays = [...new Set(weekSessions.map(s => s.date))].length;
          const isCurrent = today >= week.start && today <= week.end;
          const isPast = today > week.end;

          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-colors ${
                isCurrent ? "border-primary/40 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wider ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                {week.label}
                {isCurrent && <span className="ml-1 text-primary">●</span>}
              </p>
              <ProgressCircle
                completed={uniqueDays}
                total={SESSIONS_PER_WEEK}
                size={90}
                faded={!isCurrent && !isPast}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}