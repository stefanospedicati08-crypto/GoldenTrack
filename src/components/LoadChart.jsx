import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import moment from "moment";

export default function LoadChart({ logs }) {
  // Group by date, take max weight per day
  const byDate = {};
  logs.forEach(l => {
    if (!l.weight_kg) return;
    if (!byDate[l.date] || l.weight_kg > byDate[l.date]) {
      byDate[l.date] = l.weight_kg;
    }
  });

  const data = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-20)
    .map(([date, weight]) => ({
      date: moment(date).format("DD/MM"),
      kg: weight,
    }));

  if (data.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Nessun dato di carico disponibile
      </div>
    );
  }

  return (
    <div className="bg-secondary/30 rounded-xl p-4">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Progressione Carico</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit=" kg" />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey="kg"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ fill: "hsl(var(--primary))", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}