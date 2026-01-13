import React, { useEffect, useMemo, useState } from "react";
import { X, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/button";

const fmt = (s) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

const RestTimer = ({ duration, onComplete, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(duration || 0);
  const [paused, setPaused] = useState(false);

  // Reset when duration changes
  useEffect(() => {
    setTimeLeft(duration || 0);
    setPaused(false);
  }, [duration]);

  // Tick
  useEffect(() => {
    if (paused || timeLeft <= 0) return;

    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [paused, timeLeft]);

  // Complete callback
  useEffect(() => {
    if (timeLeft === 0) onComplete?.();
  }, [timeLeft, onComplete]);

  const progress = useMemo(() => {
    const d = Math.max(1, Number(duration) || 1);
    return ((d - Math.max(0, timeLeft)) / d) * 100;
  }, [duration, timeLeft]);

  const r = 40;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - progress / 100);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-[92vw] max-w-xs rounded-2xl border border-border bg-card p-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">Rest</div>
          <div className="text-xs text-muted-foreground">
            {timeLeft === 0 ? "Done" : "Remaining"}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          {/* Ring */}
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
              <circle
                cx="40"
                cy="40"
                r={r}
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                fill="none"
                strokeDasharray={c}
                strokeDashoffset={dash}
                className="transition-all duration-500 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-lg font-extrabold text-gradient-primary">
                {fmt(Math.max(0, timeLeft))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setPaused((p) => !p)}
              disabled={timeLeft === 0}
              title={paused ? "Resume" : "Pause"}
            >
              {paused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
              {paused ? "Resume" : "Pause"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTimeLeft(duration || 0);
                setPaused(false);
              }}
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {timeLeft === 0 && (
          <div className="mt-3 text-center text-sm font-semibold text-success">
            Ready for the next set 🎯
          </div>
        )}
      </div>
    </div>
  );
};

export default RestTimer;