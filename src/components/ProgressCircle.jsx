import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function ProgressCircle({ completed, total }) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(completed / total, 1) : 0;
  const offset = circumference - progress * circumference;
  const isFull = completed >= total && total > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isFull ? "hsl(var(--accent))" : "hsl(var(--primary))"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isFull ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center"
            >
              <Check className="w-6 h-6 text-accent" strokeWidth={3} />
            </motion.div>
          ) : (
            <div className="text-center">
              <span className="text-xl font-heading font-bold leading-none">{completed}</span>
              <span className="text-xs text-muted-foreground block">/{total}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {isFull ? "Settimana completata! 🎉" : "Sessioni completate"}
      </p>
    </div>
  );
}