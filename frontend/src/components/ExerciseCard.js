// src/components/ExerciseCard.js
import React, { useMemo } from "react";
import {
  PlayCircle,
  Plus,
  Timer,
  CheckCircle2,
  Circle,
  Info,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function ExerciseCard({
  exercise,
  lastWorkoutData,
  onSetComplete,
  onWeightChange,
  onNotesChange,
  onRestTimer,
  onAddSet,
  onOpenVideo,
  isFirst,
}) {
  const setsData = Array.isArray(exercise?.setsData) ? exercise.setsData : [];

  // 🔎 Find a usable video link
  const videoUrl = useMemo(() => {
    const u =
      exercise?.videoUrl ||
      exercise?.video ||
      exercise?.url ||
      exercise?.youtube ||
      "";
    return String(u || "").trim();
  }, [exercise]);

  const hasVideo = !!videoUrl;

  const handleToggleCompleted = (setIdx) => {
    const next = setsData.map((s, i) =>
      i === setIdx ? { ...s, completed: !s.completed } : s
    );

    onWeightChange?.(exercise, next);

    const didComplete = !!next?.[setIdx]?.completed;
    if (didComplete) {
      // Keep your existing behavior: treat completion as a "set complete" moment.
      // We pass "levelUp" as false (no auto suggestion) because that’s app-specific.
      onSetComplete?.(exercise, next[setIdx], false);
    }
  };

  const handleFieldChange = (setIdx, key, value) => {
    const next = setsData.map((s, i) => (i === setIdx ? { ...s, [key]: value } : s));
    onWeightChange?.(exercise, next);
  };

  // Assisted logic:
  // - Assisted = allow negative weight (or just a semantic flag)
  // - We'll infer it from a per-set boolean `assisted`, defaulting false.
  const isAssisted = useMemo(() => {
    // if ANY set is marked assisted, treat the exercise as assisted for styling
    return setsData.some((s) => !!s.assisted);
  }, [setsData]);

  const toggleAssisted = () => {
    const nextVal = !isAssisted;
    const next = setsData.map((s) => ({ ...s, assisted: nextVal }));
    onWeightChange?.(exercise, next);
  };

  return (
    <div
      className={cx(
        "rounded-2xl border border-border bg-card shadow-sm overflow-hidden",
        isFirst && "ring-1 ring-primary/20"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-foreground truncate">
                {exercise?.name || exercise?.id}
              </h3>

              {exercise?.repScheme ? (
                <Badge className="bg-muted text-foreground border-border">
                  {exercise.repScheme}
                </Badge>
              ) : null}

              {Array.isArray(exercise?.goalReps) && exercise.goalReps.length ? (
                <Badge className="bg-muted text-foreground border-border">
                  Goal: {exercise.goalReps.join(" / ")}
                </Badge>
              ) : null}
            </div>

            {!!exercise?.notes && (
              <div className="mt-1 text-xs text-muted-foreground flex items-start gap-1">
                <Info className="w-3.5 h-3.5 mt-[1px]" />
                <span className="leading-snug">{exercise.notes}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Video button: accent if present, ghost+disabled if not */}
            <Button
              type="button"
              size="sm"
              variant={hasVideo ? "default" : "ghost"}
              disabled={!hasVideo}
              onClick={() => hasVideo && onOpenVideo?.(exercise, videoUrl)}
              className={cx(
                "h-9 px-3 rounded-xl",
                hasVideo
                  ? cx(
                      "bg-[hsl(var(--accent-strong))] text-[hsl(var(--accent-strong-foreground))]",
                      "hover:bg-[hsl(var(--accent-strong)/0.92)]",
                      "border border-[hsl(var(--accent-strong))]"
                    )
                  : "text-muted-foreground"
              )}
              title={hasVideo ? "Watch video" : "No video link saved"}
              aria-label={hasVideo ? "Watch video" : "No video link saved"}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Video
            </Button>

            {/* Add set */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onAddSet?.(exercise)}
              className="h-9 px-3 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Set
            </Button>
          </div>
        </div>

        {/* Assisted + Rest row */}
        <div className="mt-3 flex items-center justify-between gap-2">
          {/* Assisted toggle: accent colour only when Assisted */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleAssisted}
            className={cx(
              "h-9 px-3 rounded-xl border-2",
              isAssisted
                ? cx(
                    "bg-[hsl(var(--accent-strong))] text-[hsl(var(--accent-strong-foreground))] border-[hsl(var(--accent-strong))]",
                    "hover:bg-[hsl(var(--accent-strong)/0.92)]"
                  )
                : "bg-background text-foreground border-border hover:bg-muted/40"
            )}
            title="Toggle assisted for this exercise"
            aria-pressed={isAssisted}
          >
            {isAssisted ? "Assisted" : "Normal"}
          </Button>

          {/* Rest timer */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onRestTimer?.(exercise?.restTime ?? 120)}
            className="h-9 px-3 rounded-xl"
            title="Start rest timer"
          >
            <Timer className="w-4 h-4 mr-2" />
            Rest
          </Button>
        </div>

        {/* Last workout summary (if available) */}
        {lastWorkoutData?.sets?.length ? (
          <div className="mt-3 text-xs text-muted-foreground">
            Last time:{" "}
            <span className="text-foreground font-medium">
              {lastWorkoutData.sets
                .slice(0, 3)
                .map((s) => `${s.weight ?? "—"} × ${s.reps ?? "—"}`)
                .join(" • ")}
              {lastWorkoutData.sets.length > 3 ? " • …" : ""}
            </span>
          </div>
        ) : null}
      </div>

      {/* Sets */}
      <div className="p-4 space-y-3">
        {setsData.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No sets yet — tap <span className="font-semibold">Set</span> to add one.
          </div>
        ) : (
          setsData.map((set, idx) => {
            const completed = !!set.completed;
            const assisted = !!set.assisted;

            return (
              <div
                key={idx}
                className={cx(
                  "rounded-xl border border-border p-3 bg-background",
                  completed && "opacity-95"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">
                    Set {idx + 1}
                    {assisted ? (
                      <span className="ml-2 text-xs font-semibold text-[hsl(var(--accent-strong))]">
                        (Assisted)
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCompleted(idx)}
                    className={cx(
                      "inline-flex items-center gap-2 text-sm font-semibold",
                      completed ? "text-success" : "text-muted-foreground"
                    )}
                    aria-label={completed ? "Mark incomplete" : "Mark complete"}
                    title={completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {completed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                    {completed ? "Done" : "Tick"}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Weight</div>
                    <Input
                      inputMode="decimal"
                      value={set.weight ?? ""}
                      onChange={(e) => handleFieldChange(idx, "weight", e.target.value)}
                      placeholder={assisted ? "e.g. -20" : "e.g. 60"}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Reps</div>
                    <Input
                      inputMode="numeric"
                      value={set.reps ?? ""}
                      onChange={(e) => handleFieldChange(idx, "reps", e.target.value)}
                      placeholder="e.g. 8"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Notes */}
        <div className="pt-1">
          <div className="text-xs text-muted-foreground mb-1">Notes</div>
          <Input
            value={exercise?.userNotes ?? ""}
            onChange={(e) => onNotesChange?.(exercise, e.target.value)}
            placeholder="Anything to remember for next time…"
            className="h-10"
          />
        </div>
      </div>
    </div>
  );
}