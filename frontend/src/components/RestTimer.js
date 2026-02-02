// src/components/RestTimer.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Play, Pause, RotateCcw, MinusSquare } from "lucide-react";
import { Button } from "../components/ui/button";

const fmt = (s) => {
  const ss = Math.max(0, Math.floor(Number(s) || 0));
  const m = Math.floor(ss / 60);
  const r = ss % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

export default function RestTimer({ duration, onComplete, onClose }) {
  const total = useMemo(
    () => Math.max(0, Math.floor(Number(duration) || 0)),
    [duration]
  );

  const [timeLeft, setTimeLeft] = useState(total);
  const [paused, setPaused] = useState(false);

  // ✅ Start maximised
  const [minimized, setMinimized] = useState(false);

  const endAtRef = useRef(null);
  const tickRef = useRef(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const start = Math.max(0, Math.floor(Number(duration) || 0));
    setTimeLeft(start);
    setPaused(false);

    // ✅ Always open when a new timer starts
    setMinimized(false);

    completedRef.current = false;
    endAtRef.current = Date.now() + start * 1000;

    return () => {
      endAtRef.current = null;
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [duration]);

  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    if (paused || timeLeft <= 0) return;

    tickRef.current = setInterval(() => {
      const endAt = endAtRef.current;
      if (!endAt) return;
      setTimeLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    }, 250);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [paused, timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0) return;
    if (completedRef.current) return;
    completedRef.current = true;

    onComplete?.();
    onClose?.();
  }, [timeLeft, onComplete, onClose]);

  const pause = () => {
    if (paused) return;
    if (endAtRef.current) {
      setTimeLeft(
        Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      );
    }
    endAtRef.current = null;
    setPaused(true);
  };

  const resume = () => {
    if (!paused) return;
    endAtRef.current = Date.now() + Math.max(0, timeLeft) * 1000;
    setPaused(false);
  };

  const reset = () => {
    const start = Math.max(0, Math.floor(Number(duration) || 0));
    completedRef.current = false;
    setTimeLeft(start);
    setPaused(false);
    endAtRef.current = Date.now() + start * 1000;
  };

  const progress = useMemo(() => {
    const d = Math.max(1, total || 1);
    return ((d - Math.max(0, timeLeft)) / d) * 100;
  }, [total, timeLeft]);

  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - progress / 100);

  const LAYOUT_ID = "rest-timer-layout";
  const isOpen = total > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-[9999] ${
            minimized ? "pointer-events-none" : "pointer-events-auto"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <AnimatePresence>
            {!minimized && (
              <motion.div
                className="absolute inset-0 bg-background/70 backdrop-blur-sm"
                onClick={onClose}
              />
            )}
          </AnimatePresence>

          {/* Expanded bottom sheet */}
          <AnimatePresence>
            {!minimized && (
              <motion.div
                layoutId={LAYOUT_ID}
                className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center pointer-events-none"
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              >
                <div className="pointer-events-auto w-full max-w-sm px-3 pb-3">
                  <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          Rest Timer
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {timeLeft === 0
                            ? "Done"
                            : paused
                            ? "Paused"
                            : "Counting down"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMinimized(true)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Minimise"
                        >
                          <MinusSquare className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={onClose}
                          className="text-muted-foreground hover:text-foreground"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-6 space-y-5">
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
                            />
                          </svg>

                          <div className="absolute inset-0 grid place-items-center">
                            <div className="text-center">
                              <div className="text-4xl font-extrabold text-primary tabular-nums">
                                {fmt(timeLeft)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                remaining
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={paused ? resume : pause}
                          disabled={timeLeft === 0}
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

                        <Button variant="outline" onClick={reset}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimized chip – TRUE accent colour */}
          <AnimatePresence>
            {minimized && (
              <motion.button
                layoutId={LAYOUT_ID}
                type="button"
                className="fixed left-4 top-4 z-[10000] flex items-center gap-4 rounded-full shadow-xl px-4 py-3 pointer-events-auto"
                style={{
                  backgroundColor: "hsl(var(--accent-strong))",
                  color: "hsl(var(--accent-strong-foreground))",
                  border: "1px solid hsl(var(--accent-strong) / 0.35)",
                }}
                onClick={() => setMinimized(false)}
              >
                <div className="flex flex-col leading-none">
                  <span className="text-xs opacity-90">Rest</span>
                  <span className="text-base font-semibold tabular-nums">
                    {fmt(timeLeft)}
                  </span>
                </div>

                <div
                  className="h-2.5 w-28 rounded-full overflow-hidden"
                  style={{
                    backgroundColor:
                      "hsl(var(--accent-strong-foreground) / 0.25)",
                  }}
                >
                  <motion.div
                    className="h-full"
                    style={{
                      backgroundColor:
                        "hsl(var(--accent-strong-foreground))",
                      width: `${Math.round(progress)}%`,
                    }}
                  />
                </div>

                <span
                  className="ml-1 rounded-full p-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose?.();
                  }}
                >
                  <X className="w-4 h-4 opacity-90" />
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}