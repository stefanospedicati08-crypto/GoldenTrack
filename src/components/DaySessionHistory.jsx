import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Calendar, Heart, Zap, MessageSquare } from "lucide-react";
import moment from "moment";
import "moment/locale/it";
moment.locale("it");

export default function DaySessionHistory({ sessions, dayLabel, logs }) {
  const [open, setOpen] = useState(false);

  // Filter sessions for this day
  const daySessions = sessions.
  filter((s) => s.day_label === dayLabel).
  sort((a, b) => b.date.localeCompare(a.date)).
  slice(0, 10);

  if (daySessions.length === 0) return null;

  return (
    <div className="bg-secondary/30 rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors rounded-[50px]">
        
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium flex-1">Storico sessioni — {dayLabel}</span>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{daySessions.length} sessioni</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden">
          
            <div className="px-4 pb-4 space-y-2">
              {daySessions.map((session, i) => {
              const sessionLogs = logs.filter((l) => l.date === session.date);
              const exercises = [...new Set(sessionLogs.map((l) => l.exercise_name))];
              const maxWeight = Math.max(...sessionLogs.map((l) => l.weight_kg || 0).filter(Boolean));

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-xl border border-border p-3 space-y-2">
                  
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold capitalize">
                        {moment(session.date).format("dddd D MMMM YYYY")}
                      </p>
                      <div className="flex items-center gap-2">
                        {session.rpe &&
                      <span className="flex items-center gap-1 text-xs bg-chart-3/10 text-chart-3 px-2 py-0.5 rounded-full font-medium">
                            <Zap className="w-3 h-3" /> RPE {session.rpe}/10
                          </span>
                      }
                        {session.heart_rate_avg &&
                      <span className="flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                            <Heart className="w-3 h-3" /> {session.heart_rate_avg} bpm
                          </span>
                      }
                      </div>
                    </div>

                    {exercises.length > 0 &&
                  <div className="flex flex-wrap gap-1">
                        {exercises.map((ex) =>
                    <span key={ex} className="text-xs bg-secondary px-2 py-0.5 rounded-lg text-muted-foreground">
                            {ex}
                          </span>
                    )}
                        {maxWeight > 0 &&
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-medium">
                            max {maxWeight} kg
                          </span>
                    }
                      </div>
                  }

                    {session.athlete_note &&
                  <div className="flex items-start gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground italic">{session.athlete_note}</p>
                      </div>
                  }
                  </motion.div>);

            })}
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}