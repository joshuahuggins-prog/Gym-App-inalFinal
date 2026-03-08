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
import {
  getVideoLinks,
  getWorkouts,
  getProgressionSettings,
  getSettings,
} from "../utils/storage";
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

const normKey = (nameOrId) =>
  (nameOrId || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const toNumOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const round1 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return n;
  return Math.round(x * 10) / 10;
};

const fmt1 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  if (Number.isInteger(x)) return String(x);
  return round1(x).toFixed(1);
};

const bestSetFromHistory = (exerciseKey) => {
  const workouts = getWorkouts?.() || [];
  let bestW = -Infinity;
  let bestR = -Infinity;
  let bestDate = null;

  workouts.forEach((w) => {
    const wDate = w?.date || null;
    (w?.exercises || []).forEach((ex) => {
      const key = normKey(ex?.id || ex?.name);
      if (!key || key !== exerciseKey) return;

      (ex?.sets || []).forEach((s) => {
        const ww = toNumOrNull(s?.weight);
        const rr = toNumOrNull(s?.reps);
        if (!Number.isFinite(ww) || !Number.isFinite(rr)) return;

        if (ww > bestW || (ww === bestW && rr > bestR)) {
          bestW = ww;
          bestR = rr;
          bestDate = wDate;
        }
      });
    });
  });

  if (bestW === -Infinity) return null;
  return { weight: bestW, reps: bestR, date: bestDate };
};

const getHistoryBests = (exerciseKey) => {
  const workouts = getWorkouts?.() || [];

  let maxWeighted = -Infinity;
  let bestAssist = Infinity;
  let maxCompleteWeighted = -Infinity;
  let maxIncompleteWeighted = -Infinity;
  let bestCompleteAssist = Infinity;
  let bestIncompleteAssist = Infinity;

  workouts.forEach((w) => {
    (w?.exercises || []).forEach((ex) => {
      const key = normKey(ex?.id || ex?.name);
      if (!key || key !== exerciseKey) return;

      (ex?.sets || []).forEach((s) => {
        const ww = toNumOrNull(s?.weight);
        if (!Number.isFinite(ww)) return;

        const done = !!s?.completed;

        if (ww >= 0) {
          if (ww > maxWeighted) maxWeighted = ww;

          if (done) {
            if (ww > maxCompleteWeighted) maxCompleteWeighted = ww;
          } else {
            if (ww > maxIncompleteWeighted) maxIncompleteWeighted = ww;
          }
        } else {
          if (ww < bestAssist) bestAssist = ww;

          if (done) {
            if (ww < bestCompleteAssist) bestCompleteAssist = ww;
          } else {
            if (ww < bestIncompleteAssist) bestIncompleteAssist = ww;
          }
        }
      });
    });
  });

  return {
    maxWeighted: maxWeighted === -Infinity ? null : maxWeighted,
    bestAssist: bestAssist === Infinity ? null : bestAssist,
    maxCompleteWeighted:
      maxCompleteWeighted === -Infinity ? null : maxCompleteWeighted,
    maxIncompleteWeighted:
      maxIncompleteWeighted === -Infinity ? null : maxIncompleteWeighted,
    bestCompleteAssist:
      bestCompleteAssist === Infinity ? null : bestCompleteAssist,
    bestIncompleteAssist:
      bestIncompleteAssist === Infinity ? null : bestIncompleteAssist,
  };
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
  openCustomNumberPad
}) => {

  const desiredSetsCount = useMemo(() => {
    const liveLen = Array.isArray(exercise?.setsData)
      ? exercise.setsData.length
      : 0;
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

  const exerciseKey = useMemo(
    () => normKey(exercise?.id || exercise?.name),
    [exercise?.id, exercise?.name]
  );

  const pr = useMemo(() => bestSetFromHistory(exerciseKey), [exerciseKey]);
  const historyBests = useMemo(() => getHistoryBests(exerciseKey), [exerciseKey]);

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

  const completedCount = useMemo(
    () => sets.filter((s) => s.completed).length,
    [sets]
  );

  const isExerciseComplete = useMemo(
    () => sets.length > 0 && sets.every((s) => !!s.completed),
    [sets]
  );

  const hasVideo = !!videoLink;

  useEffect(() => {
    const links = getVideoLinks();
    setVideoLink(links?.[exercise?.id] || "");
  }, [exercise?.id]);

  const showAlternativesToast = () => {
    const id = exercise?.id;
    const alts = id ? EXERCISE_ALTERNATIVES?.[id] : null;

    if (!alts || !alts.length) {
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

  const suggestedWeightForSet = (setIndex) => {
    const ww = sets?.[setIndex]?.weight;
    if (ww !== "" && ww !== null && ww !== undefined) return "";
    return mode === "assisted" ? "Assist" : "Weight";
  };

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card border-border">

      <div
        role="button"
        tabIndex={0}
        className="w-full text-left p-4 cursor-pointer select-none"
        onClick={handleHeaderToggle}
      >

        <div className="flex items-start justify-between gap-3">

          <div className="flex-1 min-w-0">

            <h3 className="font-bold truncate text-foreground">
              {exercise?.name || "Exercise"}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{completedCount}/{sets.length} sets</span>

              {exercise?.repScheme && (
                <Badge variant="secondary" className="text-[10px]">
                  {exercise.repScheme}
                </Badge>
              )}

              {pr?.weight != null && pr?.reps != null && (
                <span className="text-foreground font-semibold">
                  PR: {fmt1(pr.weight)} × {pr.reps}
                </span>
              )}
            </div>

          </div>

          <div className="flex items-center gap-1 shrink-0">

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasVideo}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasVideo) return;
                onOpenVideo?.(exercise, videoLink);
              }}
            >
              <Video className="w-4 h-4" />
            </Button>

            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}

          </div>
        </div>

      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">

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
                  type="text"
                  inputMode="none"
                  value={s.weight ?? ""}
                  placeholder={suggestedWeightForSet(i)}
                  onFocus={(e) => {
                    e.preventDefault();
                    openCustomNumberPad?.(exercise, i, "weight");
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    openCustomNumberPad?.(exercise, i, "weight");
                  }}
                />

                <Input
                  type="text"
                  inputMode="none"
                  value={s.reps ?? ""}
                  placeholder={`${goalReps[i] ?? 8}`}
                  onFocus={(e) => {
                    e.preventDefault();
                    openCustomNumberPad?.(exercise, i, "reps");
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    openCustomNumberPad?.(exercise, i, "reps");
                  }}
                />

                <Button
                  type="button"
                  size="sm"
                  variant={s.completed ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = [...sets];
                    next[i] = { ...s, completed: !s.completed };
                    pushUp(next);
                    onSetComplete?.(exercise, next[i], false);
                  }}
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

          <div className="flex flex-wrap gap-2">

            {onRestTimer && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestTimer?.(exercise?.restTime ?? 120);
                }}
              >
                <Timer className="w-4 h-4 mr-1" />
                Rest
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddSet?.(exercise);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Set
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={sets.length <= 1}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveSet();
              }}
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
            >
              <Shuffle className="w-4 h-4 mr-1" />
              Alternatives
            </Button>

          </div>

          {lastWorkoutData && (
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
          )}

        </div>
      )}

    </div>
  );
};

export default ExerciseCard;
