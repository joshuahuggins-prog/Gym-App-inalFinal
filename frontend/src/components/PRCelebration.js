import React, { useEffect, useMemo } from "react";
import { Trophy, X } from "lucide-react";
import { Button } from "../components/ui/button";

const COLORS = ["hsl(var(--primary))", "hsl(var(--gold))", "hsl(var(--success))"];

const PRCelebration = ({ exercise, newWeight, oldWeight, onClose }) => {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  // No state needed: just render a small set of particles
  const confetti = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duration: 1.6 + Math.random() * 0.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.floor(Math.random() * 4),
      })),
    []
  );

  const showOld = oldWeight != null && oldWeight !== "" && Number(oldWeight) !== 0;
  const diff = showOld ? Number(newWeight) - Number(oldWeight) : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 backdrop-blur-sm animate-fadeIn">
      {/* Confetti */}
      {confetti.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-confetti"
          style={{
            left: `${p.left}%`,
            top: "-16px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <div className="relative w-[92vw] max-w-sm rounded-2xl border border-gold/40 bg-card p-4 shadow-2xl glow-gold">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-10 h-10 rounded-full bg-gold/10">
            <Trophy className="w-5 h-5 text-gold" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gold">New PR</div>
            <div className="truncate text-base font-bold text-foreground">{exercise}</div>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted-foreground">Now</div>
            <div className="text-lg font-extrabold text-gradient-gold">
              {newWeight} lbs
            </div>
          </div>
        </div>

        {showOld && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/20 p-3">
            <div>
              <div className="text-xs text-muted-foreground">Prev</div>
              <div className="font-semibold text-foreground">{oldWeight} lbs</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Increase</div>
              <div className="font-semibold text-success">
                +{diff.toFixed(1)} lbs 💪
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={onClose}
          className="mt-3 w-full bg-gold hover:bg-gold/90 text-gold-foreground font-semibold"
        >
          Nice! 🔥
        </Button>
      </div>
    </div>
  );
};

export default PRCelebration;