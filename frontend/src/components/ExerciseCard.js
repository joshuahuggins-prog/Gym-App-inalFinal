// src/components/ExerciseCard.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Timer, Video, Shuffle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { getVideoLinks, getPersonalRecords } from "../utils/storage";
import { EXERCISE_ALTERNATIVES } from "../data/workoutData";

const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.trunc(n)));

const normalizeGoalReps = (goalReps, count) => {
  const base = Array.isArray(goalReps) ? goalReps : [];
  const out = [];
  for (let i = 0; i < count; i++) out.push(base[i] ?? base[0] ?? 8);
  return out;
};

const normalizeSets = (setsData, count) => {
  const base = Array.isArray(setsData) ? setsData : [];
  const out = [];
  for (let i = 0; i < count; i++) {
    const s = base[i] || {};
    out.push({
      weight: s.weight ?? "",
      reps: s.reps ?? "",
      completed: !!s.completed,
    });
  }
  return out;
};

const ExerciseCard = ({
  exercise,
  lastWorkoutData,
  onSetComplete,
  onWeightChange,
  onNotesChange,
  onRestTimer,
}) => {
  const setsCount = clampInt(Number(exercise?.sets ?? 3), 1, 12);

  const goalReps = useMemo(
    () => normalizeGoalReps(exercise?.goalReps, setsCount),
    [exercise?.goalReps, setsCount]
  );

  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(exercise?.userNotes || "");
  const [videoLink, setVideoLink] = useState("");
  const [sets, setSets] = useState(() =>
    normalizeSets(exercise?.setsData, setsCount)
  );

  // assisted if any saved weight is negative
  const [mode, setMode] = useState(() =>
    (exercise?.setsData || []).some((s) => Number(s.weight) < 0)
      ? "assisted"
      : "weighted"
  );

  const hydrateKey = useRef("");

  // PR (display only)
  const pr = useMemo(() => {
    const prs = getPersonalRecords?.() || {};
    return prs[exercise?.id] || null;
  }, [exercise?.id]);

  // best from this workout’s sets (for label line)
  const bestFromWorkout = useMemo(() => {
    const nums = (sets || [])
      .map((s) => (s.weight === "" ? null : Number(s.weight)))
      .filter((n) => Number.isFinite(n));
    if (nums.length === 0) return null;
    return Math.max(...nums.map((n) => Math.abs(n)));
  }, [sets]);

  // hydrate when parent provides updated exercise object
  useEffect(() => {
    const key = `${exercise?.id || ""}__${setsCount}__${JSON.stringify(
      exercise?.setsData || []
    )}__${JSON.stringify(exercise?.goalReps || [])}`;

    if (key === hydrateKey.current) return;
    hydrateKey.current = key;

    setSets(normalizeSets(exercise?.setsData, setsCount));
    setNotes(exercise?.userNotes || "");

    const links = getVideoLinks();
    setVideoLink(links?.[exercise?.id] || "");

    setMode(
      (exercise?.setsData || []).some((s) => Number(s.weight) < 0)
        ? "assisted"
        : "weighted"
    );
  }, [exercise, setsCount]);

  const pushUp = (nextSets) => {
    setSets(nextSets);

    onWeightChange?.(
      exercise,
      nextSets.map((s) => ({
        weight: s.weight === "" ? "" : Number(s.weight),
        reps: s.reps === "" ? "" : Number(s.reps),
        completed: !!s.completed,
      }))
    );
  };

  // ✅ IMPORTANT: header must ignore clicks on interactive elements
  const handleHeaderToggle = (e) => {
    const interactive = e.target.closest(
      "button, a, input, textarea, select, [data-no-toggle]"
    );
    if (interactive) return;
    setExpanded((v) => !v);
  };

  const toggleMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);

    const converted = sets.map((s) => {
      if (s.weight === "") return s;
      const v = Math.abs(Number(s.weight));
      return { ...s, weight: nextMode === "assisted" ? -v : v };
    });

    pushUp(converted);
  };

  const completedCount = useMemo(
    () => sets.filter((s) => s.completed).length,
    [sets]
  );

  const maxLabel = useMemo(() => {
    const best =
      pr?.weight != null ? Math.abs(Number(pr.weight)) : bestFromWorkout;
    if (!Number.isFinite(best) || best === 0) return null;
    const label = mode === "assisted" ? "Assist max" : "Max";
    return `${label}: ${best}`;
  }, [pr, bestFromWorkout, mode]);

  const showExerciseInfoNotes = !!(
    exercise?.notes && String(exercise.notes).trim().length > 0
  );

  const showAlternativesToast = () => {
    const id = exercise?.id;
    const alts = id ? EXERCISE_ALTERNATIVES?.[id] : null;

    if (!alts || !Array.isArray(alts) || alts.length === 0) {
      toast.message("Alternatives", {
        description: "No alternatives saved for this exercise.",
      });
      return;
    }

    toast.message("Alternatives", {
      description: (
        <div className="mt-1 space-y-1">
          {alts.slice(0, 8).map((a, i) => (
            <div key={i} className="text-sm">
              • {a}
            </div>
          ))}
          {alts.length > 8 ? (
            <div className="text-xs text-muted-foreground mt-1">
              +{alts.length - 8} more…
            </div>
          ) : null}
        </div>
      ),
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header (NOT a <button> to avoid nested button bugs) */}
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left p-4 cursor-pointer select-none"
        onClick={handleHeaderToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate text-foreground">
              {exercise?.name || "Exercise"}
            </h3>

            {/* Row 2 */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {completedCount}/{setsCount} sets
              </span>

              {exercise?.repScheme ? (
                <Badge variant="secondary" className="text-[10px]">
                  {exercise.repScheme}
                </Badge>
              ) : null}

              {pr?.weight != null && (
                <span className="text-foreground font-semibold">
                  PR: {pr.weight} × {pr.reps}
                </span>
              )}
            </div>

            {/* Row 3 toggle */}
            <div
              className="mt-2 inline-flex border border-border rounded-md overflow-hidden"
              data-no-toggle
            >
              <button
                type="button"
                data-no-toggle
                className={`px-2 py-1 text-[11px] ${
                  mode === "weighted"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleMode("weighted");
                }}
              >
                Weighted
              </button>

              <button
                type="button"
                data-no-toggle
                className={`px-2 py-1 text-[11px] ${
                  mode === "assisted"
                    ? "bg-orange-500/20 text-orange-600"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleMode("assisted");
                }}
              >
                Assisted
              </button>
            </div>
          </div>

          {/* Right-side icons */}
          <div className="flex items-center gap-1 shrink-0">
            {videoLink ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(videoLink, "_blank", "noopener,noreferrer");
                }}
                title="Open form video"
              >
                <Video className="w-4 h-4" />
              </Button>
            ) : null}

            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {maxLabel && (
            <div className="text-xs text-muted-foreground">
              <span
                className={
                  mode === "assisted"
                    ? "text-orange-600 font-semibold"
                    : "text-foreground font-semibold"
                }
              >
                {maxLabel}
              </span>
            </div>
          )}

          {/* Sets */}
          <div className="space-y-2">
            {sets.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-[60px_1fr_1fr_40px] gap-2 items-center"
              >
                <span className="text-xs text-muted-foreground">
                  Set {i + 1}
                </span>

                <Input
                  type="number"
                  value={s.weight === "" ? "" : Math.abs(Number(s.weight))}
                  placeholder={mode === "assisted" ? "Assist" : "Weight"}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const next = [...sets];

                    if (raw === "") {
                      next[i] = { ...s, weight: "" };
                      pushUp(next);
                      return;
                    }

                    const n = Number(raw);
                    if (!Number.isFinite(n)) return;

                    next[i] = { ...s, weight: mode === "assisted" ? -n : n };
                    pushUp(next);
                  }}
                />

                <Input
                  type="number"
                  value={s.reps}
                  placeholder={`${goalReps[i] ?? 8}`}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const next = [...sets];

                    if (raw === "") {
                      next[i] = { ...s, reps: "" };
                      pushUp(next);
                      return;
                    }

                    const n = Number(raw);
                    if (!Number.isFinite(n)) return;

                    next[i] = { ...s, reps: n };
                    pushUp(next);
                  }}
                />

                <Button
                  size="sm"
                  variant={s.completed ? "default" : "outline"}
                  onClick={() => {
                    const next = [...sets];
                    next[i] = { ...s, completed: !s.completed };
                    pushUp(next);
                    onSetComplete?.(exercise, next[i], false);
                  }}
                  title={s.completed ? "Completed" : "Mark completed"}
                >
                  ✓
                </Button>
              </div>
            ))}
          </div>

          {/* Workout notes */}
          <Textarea
            value={notes}
            placeholder="Workout notes…"
            className="min-h-[70px]"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onNotesChange?.(exercise, notes)}
          />

          {/* Exercise info notes */}
          {showExerciseInfoNotes && (
            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg border border-border">
              <div className="text-[11px] font-semibold text-foreground mb-1">
                Exercise notes
              </div>
              <div className="whitespace-pre-wrap">
                {String(exercise.notes).trim()}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {onRestTimer ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestTimer?.(exercise?.restTime ?? 120)}
              >
                <Timer className="w-4 h-4 mr-1" />
                Rest
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={showAlternativesToast}
              title="Show alternatives"
            >
              <Shuffle className="w-4 h-4 mr-1" />
              Alternatives
            </Button>
          </div>

          {/* Last workout */}
          {lastWorkoutData ? (
            <div className="text-xs text-muted-foreground border border-border rounded-lg p-3 bg-muted/20">
              <div className="font-semibold text-foreground mb-1">
                Last time
              </div>
              {(lastWorkoutData.sets || []).map((s2, idx) => (
                <div key={idx}>
                  Set {idx + 1}: {s2.weight} × {s2.reps}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ExerciseCard;
```0
