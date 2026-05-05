import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function ProgressCircle({ completed, total, size = 120, faded = false }) {
  const strokeWidth = size < 100 ? 8 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(completed / total, 1) : 0;
  const offset = circumference - progress * circumference;
  const isFull = completed >= total && total > 0;
  const fontSize = size < 100 ? "text-base" : "text-xl";
  const subFontSize = size < 100 ? "text-[10px]" : "text-xs";
  const checkSize = size < 100 ? "w-7 h-7" : "w-10 h-10";
  const checkIconSize = size < 100 ? "w-4 h-4" : "w-6 h-6";

  return (
    <div className={`relative ${faded ? "opacity-40" : ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth} />
        
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
          transition={{ duration: 0.8, ease: "easeOut" }} />
        
      </svg>
      <div className="absolute inset-0 flex items-center justify-center bg-transparent text-gray-200">
        {isFull ?
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`${checkSize} rounded-full bg-accent/20 flex items-center justify-center`}>
          
            <Check className={`${checkIconSize} text-accent`} strokeWidth={3} />
          </motion.div> :

        <div className="text-center">
            <span className={`${fontSize} font-heading font-bold leading-none`}>{completed}</span>
            <span className={`${subFontSize} text-muted-foreground block`}>/{total}</span>
          </div>
        }
      </div>
    </div>);

}