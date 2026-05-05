import { motion } from "framer-motion";
import { Dumbbell, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function WelcomeBanner({ userName, hasActivePlan, planId }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary rounded-2xl p-6 text-primary-foreground shadow-xl shadow-primary/20"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
      <div className="absolute bottom-0 right-16 w-24 h-24 bg-white/5 rounded-full translate-y-8" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-primary-foreground/70 text-sm font-medium">{greeting} 👋</p>
            <h1 className="font-heading text-3xl font-bold leading-tight">
              Benvenuto, {userName}!
            </h1>
            <p className="text-primary-foreground/80 text-base mt-1">
              Sei pronto per la sessione di allenamento di oggi? 💪
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
        </div>

        {hasActivePlan && (
          <div className="mt-5 flex gap-3">
            <Link to={planId ? `/schede/${planId}` : "/schede"}>
              <Button
                size="sm"
                className="bg-white text-primary hover:bg-white/90 font-semibold rounded-xl px-5 h-10 shadow-lg"
              >
                <Flame className="w-4 h-4 mr-1.5" />
                Inizia Allenamento
              </Button>
            </Link>
            <Link to="/schede">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/15 rounded-xl h-10 px-4"
              >
                Vedi Schede
              </Button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}