import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import moment from "moment";

export default function LoadChart({ logs }) {
  // Group by session (date): average weight per session
  const byDate = {};
  logs.forEach(l => {
    if (!l.weight_kg) return;
    if (!byDate[l.date]) byDate[l.date] = [];
    byDate[l.date].push(l.weight_kg);
  });

  const data = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-20)
    .map(([date, weights], i) => ({
      sessione: `Sessione ${i + 1}`,
      data: moment(date).format("DD/MM"),
      kg: Math.round((weights.reduce((s, v) => s + v, 0) / weights.length) * 10) / 10,
    }));

  if (data.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Nessun dato di carico disponibile
      </div>
    );
  }

  const minVal = Math.min(...data.map(d => d.kg));
  const maxVal = Math.max(...data.map(d => d.kg));
  const padding = Math.max((maxVal - minVal) * 0.2, 2);

  const CustomDot = (props) => {
    const { cx, cy, value } = props;
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth={2} />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
        <p className="text-muted-foreground text-xs mb-1">{label} • {payload[0]?.payload?.data}</p>
        <p className="font-bold text-primary">{payload[0].value} kg</p>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
        Progressione Carico
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="hsl(var(--border))"
            vertical={true}
            horizontal={true}
          />
          <XAxis
            dataKey="sessione"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
            unit=" kg"
            domain={[Math.floor(minVal - padding), Math.ceil(maxVal + padding)]}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="linear"
            dataKey="kg"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={<CustomDot />}
            activeDot={{ r: 7, fill: "hsl(var(--primary))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}