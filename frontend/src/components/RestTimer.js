// src/components/RestTimer.js
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

  useEffect(() => {
    setTimeLeft(duration || 0);
    setPaused(false);
  }, [duration]);

  useEffect(() => {
    if (paused || timeLeft <= 0) return;

    const t = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(t);
  }, [paused, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) onComplete?.();
  }, [timeLeft, onComplete]);

  const progress = useMemo(() => {
    const d = Math.max(1, Number(duration) || 1);
    return ((d - Math.max(0, timeLeft)) / d) * 100;
  }, [duration, timeLeft]);

  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - progress / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm">
      {/* Positions the modal about 1/3 up the screen */}
      <div className="w-full flex justify-center pb-[33vh]">
        <div className="relative w-[92vw] max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-[slideUp_.22s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <div className="text-sm font-semibold text-foreground">
                Rest Timer
              </div>
              <div className="text-xs text-muted-foreground">
                {timeLeft === 0 ? "Done" : "Counting down"}
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body (taller) */}
          <div className="px-5 py-6 space-y-5">
            {/* Ring + time */}
            <div className="grid place-items-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r={r}
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={r}
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={c}
                    strokeDashoffset={dash}
                    className="transition-all duration-500 ease-linear"
                  />
                </svg>

                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    {/* ✅ Theme-matching text (best option) */}
                    <div className="text-4xl font-extrabold text-foreground">
                      {fmt(Math.max(0, timeLeft))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {timeLeft === 0 ? "Ready!" : "remaining"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPaused((p) => !p)}
                disabled={timeLeft === 0}
                title={paused ? "Resume" : "Pause"}
              >
                {paused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setTimeLeft(duration || 0);
                  setPaused(false);
                }}
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {timeLeft === 0 && (
              <div className="text-center text-sm font-semibold text-success">
                Ready for the next set 🎯
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestTimer;
