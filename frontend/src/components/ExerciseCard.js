// src/components/ExerciseCard.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Timer,
  Video,
  Shuffle,
  Plus,
  Minus,
  Check,
} from "lucide-react";
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
  onAddSet,
  onOpenVideo,
}) => {
  // ✅ IMPORTANT FIX:
  // Always prefer setsData length (live), fall back to exercise.sets (programme default)
  const desiredSetsCount = useMemo(() => {
    const liveLen = Array.isArray(exercise?.setsData) ? exercise.setsData.length : 0;
    const fallback = Number(exercise?.sets ?? 3);
    const count = liveLen > 0 ? liveLen : fallback;
    return clampInt(count, 1, 40);
  }, [exercise?.setsData, exercise?.sets]);

  const goalReps = useMemo(
    () => normalizeGoalReps(exercise?.goalReps, desiredSetsCount),
    [exercise?.goalReps, desiredSetsCount]
  );

  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(exercise?.userNotes || "");
  const [videoLink, setVideoLink] = useState("");
  const [sets, setSets] = useState(() =>
    normalizeSets(exercise?.setsData, desiredSetsCount)
  );

  const [mode, setMode] = useState(() =>
    (exercise?.setsData || []).some((s) => Number(s.weight) < 0)
      ? "assisted"
      : "weighted"
  );

  const userChoseModeRef = useRef(false);
  const lastExerciseIdRef = useRef(exercise?.id || "");

  const pr = useMemo(() => {
    const prs = getPersonalRecords?.() || {};
    return prs[exercise?.id] || null;
  }, [exercise?.id]);

  const bestFromWorkout = useMemo(() => {
    const nums = (sets || [])
      .map((s) => (s.weight === "" ? null : Number(s.weight)))
      .filter((n) => Number.isFinite(n));
    if (nums.length === 0) return null;
    return Math.max(...nums.map((n) => Math.abs(n)));
  }, [sets]);

  // ✅ Hydrate using desiredSetsCount (not exercise.sets)
  useEffect(() => {
    setSets(normalizeSets(exercise?.setsData, desiredSetsCount));
    setNotes(exercise?.userNotes || "");

    const links = getVideoLinks();
    setVideoLink(links?.[exercise?.id] || "");
  }, [exercise?.setsData, exercise?.userNotes, exercise?.id, desiredSetsCount]);

  useEffect(() => {
    const currentId = exercise?.id || "";
    if (currentId !== lastExerciseIdRef.current) {
      lastExerciseIdRef.current = currentId;
      userChoseModeRef.current = false;

      setMode(
        (exercise?.setsData || []).some((s) => Number(s.weight) < 0)
          ? "assisted"
          : "weighted"
      );
    }
  }, [exercise?.id, exercise?.setsData]);

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

  const handleHeaderToggle = (e) => {
    const interactive = e.target.closest(
      "button, a, input, textarea, select, [data-no-toggle]"
    );
    if (interactive) return;
    setExpanded((v) => !v);
  };

  const toggleMode = (nextMode) => {
    if (nextMode === mode) return;

    userChoseModeRef.current = true;
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

  const isExerciseComplete = useMemo(() => {
    if (!sets.length) return false;
    return sets.every((s) => !!s.completed);
  }, [sets]);

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

  const handleRemoveSet = () => {
    if (sets.length <= 1) {
      toast.message("Can't remove", { description: "You need at least 1 set." });
      return;
    }
    const next = sets.slice(0, -1);
    pushUp(next);
    toast.success("Set removed", { duration: 1200 });
  };

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl border",
        isExerciseComplete
          ? "bg-primary/10 border-primary/40"
          : "bg-card border-border",
      ].join(" ")}
    >
      {isExerciseComplete && (
        <div className="pointer-events-none absolute right-4 top-4 opacity-20">
          <Check className="w-16 h-16" />
        </div>
      )}

      {/* Header */}
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

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {completedCount}/{sets.length} sets
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

              {isExerciseComplete ? (
                <Badge className="bg-primary/20 text-primary border-primary/40">
                  Completed
                </Badge>
              ) : null}
            </div>

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

          <div className="flex items-center gap-1 shrink-0">
            {videoLink ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenVideo?.(exercise, videoLink);
                }}
                title="Watch exercise video"
                data-no-toggle
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

          <div className="space-y-2">
            {sets.map((s, i) => (
              <div
                key={`${i}-${s.completed ? "c" : "n"}`}
                className="grid grid-cols-[60px_1fr_1fr_44px] gap-2 items-center"
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
                  type="button"
                  data-no-toggle
                  size="sm"
                  variant={s.completed ? "default" : "outline"}
                  className={
                    s.completed ? "shadow-sm" : "bg-background hover:bg-muted/40"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = [...sets];
                    next[i] = { ...s, completed: !s.completed };
                    pushUp(next);
                    onSetComplete?.(exercise, next[i], false);
                  }}
                  title={s.completed ? "Completed" : "Mark completed"}
                  aria-pressed={s.completed}
                >
                  ✓
                </Button>
              </div>
            ))}
          </div>

          <Textarea
            value={notes}
            placeholder="Workout notes…"
            className="min-h-[70px]"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onNotesChange?.(exercise, notes)}
          />

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

          <div className="flex flex-wrap gap-2">
            {onRestTimer ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestTimer?.(exercise?.restTime ?? 120);
                }}
                data-no-toggle
              >
                <Timer className="w-4 h-4 mr-1" />
                Rest
              </Button>
            ) : null}

            {/* Add Set (text only "Set") */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddSet?.(exercise);
              }}
              title="Add a set"
              data-no-toggle
            >
              <Plus className="w-4 h-4 mr-1" />
              Set
            </Button>

            {/* Remove Set (text only "Set") */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveSet();
              }}
              title="Remove the last set"
              data-no-toggle
              disabled={sets.length <= 1}
            >
              <Minus className="w-4 h-4 mr-1" />
              Set
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                showAlternativesToast();
              }}
              title="Show alternatives"
              data-no-toggle
            >
              <Shuffle className="w-4 h-4 mr-1" />
              Alternatives
            </Button>
          </div>

          {lastWorkoutData ? (
            <div className="text-xs text-muted-foreground border border-border rounded-lg p-3 bg-muted/20">
              <div className="font-semibold text-foreground mb-1">Last time</div>
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