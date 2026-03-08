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

// ==========================
// Helpers
// ==========================
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

// ==========================
// ExerciseCard Component
// ==========================
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

  const userChoseModeRef = useRef(false);
  const lastExerciseIdRef = useRef(exercise?.id || "");
  const exerciseKey = useMemo(
    () => normKey(exercise?.id || exercise?.name),
    [exercise?.id, exercise?.name]
  );

  const pr = useMemo(() => {
    const workouts = getWorkouts?.() || [];
    let bestW = -Infinity;
    let bestR = -Infinity;
    let bestDate = null;

    workouts.forEach((w) => {
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
            bestDate = w?.date || null;
          }
        });
      });
    });

    if (bestW === -Infinity) return null;
    return { weight: bestW, reps: bestR, date: bestDate };
  }, [exerciseKey]);

  const historyBests = useMemo(() => {
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
            if (done && ww > maxCompleteWeighted) maxCompleteWeighted = ww;
            if (!done && ww > maxIncompleteWeighted) maxIncompleteWeighted = ww;
          } else {
            if (ww < bestAssist) bestAssist = ww;
            if (done && ww < bestCompleteAssist) bestCompleteAssist = ww;
            if (!done && ww < bestIncompleteAssist) bestIncompleteAssist = ww;
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
  }, [exerciseKey]);

  const bestFromCurrentSets = useMemo(() => {
    let best = -Infinity;
    (sets || []).forEach((s) => {
      const ww = toNumOrNull(s?.weight);
      if (!Number.isFinite(ww)) return;
      if (ww > best) best = ww;
    });
    return best === -Infinity ? null : best;
  }, [sets]);

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

  const toggleMode = (nextMode) => {
    if (nextMode === mode) return;
    userChoseModeRef.current = true;
    setMode(nextMode);

    const converted = sets.map((s) => {
      if (s.weight === "") return s;
      const ww = toNumOrNull(s.weight);
      if (!Number.isFinite(ww)) return s;
      const v = Math.abs(ww);
      return { ...s, weight: nextMode === "assisted" ? -v : v };
    });
    pushUp(converted);
  };

  const completedCount = useMemo(
    () => sets.filter((s) => s.completed).length,
    [sets]
  );
  const isExerciseComplete = useMemo(
    () => sets.length > 0 && sets.every((s) => !!s.completed),
    [sets]
  );

  const topLineLabel = useMemo(() => {
    const parts = [];
    if (Number.isFinite(historyBests?.maxWeighted))
      parts.push(`Max: ${fmt1(historyBests.maxWeighted)}`);
    if (Number.isFinite(historyBests?.bestAssist))
      parts.push(`Best assist: ${fmt1(historyBests.bestAssist)}`);
    return parts.length ? parts.join(" • ") : null;
  }, [historyBests]);

  const completeIncompleteLabel = useMemo(() => {
    if (mode === "weighted") {
      const a = Number.isFinite(historyBests?.maxCompleteWeighted)
        ? `Max complete: ${fmt1(historyBests.maxCompleteWeighted)}`
        : null;
      const b = Number.isFinite(historyBests?.maxIncompleteWeighted)
        ? `Max incomplete: ${fmt1(historyBests.maxIncompleteWeighted)}`
        : null;
      if (!a && !b) return null;
      return [a, b].filter(Boolean).join(" • ");
    }
    const a = Number.isFinite(historyBests?.bestCompleteAssist)
      ? `Assist complete: ${fmt1(historyBests.bestCompleteAssist)}`
      : null;
    const b = Number.isFinite(historyBests?.bestIncompleteAssist)
      ? `Assist incomplete: ${fmt1(historyBests.bestIncompleteAssist)}`
      : null;
    if (!a && !b) return null;
    return [a, b].filter(Boolean).join(" • ");
  }, [historyBests, mode]);

  const hasVideo = !!videoLink;

  // ==========================
  // JSX
  // ==========================
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
        onClick={(e) => {
          const interactive = e.target.closest(
            "button, a, input, textarea, select, [data-no-toggle]"
          );
          if (interactive) return;
          setExpanded((v) => !v);
        }}
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
              {isExerciseComplete && (
                <Badge className="bg-primary/20 text-primary border-primary/40">
                  Completed
                </Badge>
              )}
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
                    ? "bg-[hsl(var(--accent-strong)/0.20)] text-[hsl(var(--accent-strong))]"
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
              title={hasVideo ? "Watch exercise video" : "No video link saved"}
              data-no-toggle
              className={hasVideo ? "hover:bg-muted/40" : "text-muted-foreground"}
            >
              <Video
                className={
                  hasVideo
                    ? "w-4 h-4 text-[hsl(var(--accent-strong))]"
                    : "w-4 h-4"
                }
              />
            </Button>

            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {topLineLabel && (
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">{topLineLabel}</span>
            </div>
          )}
          {completeIncompleteLabel && (
            <div className="text-xs text-muted-foreground">{completeIncompleteLabel}</div>
          )}

          {/* Sets */}
          <div className="space-y-2">
            {sets.map((s, i) => (
              <div
                key={`${i}-${s.completed ? "c" : "n"}`}
                className="grid grid-cols-[60px_1fr_1fr_44px] gap-2 items-center"
              >
                <span className="text-xs text-muted-foreground">Set {i + 1}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={s.weight}
                  placeholder={fmt1(s.weight)}
                  onChange={(e) => {
                    const n = e.target.value;
                    const next = [...sets];
                    next[i] = { ...s, weight: n === "" ? "" : Number(n) };
                    pushUp(next);
                  }}
                />
                <Input
                  type="number"
                  value={s.reps}
                  placeholder={`${goalReps[i] ?? 8}`}
                  onChange={(e) => {
                    const n = e.target.value;
                    const next = [...sets];
                    next[i] = { ...s, reps: n === "" ? "" : Number(n) };
                    pushUp(next);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant={s.completed ? "default" : "outline"}
                  className={s.completed ? "shadow-sm" : "bg-background hover:bg-muted/40"}
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

          {/* Notes */}
          <Textarea
            value={notes}
            placeholder="Workout notes…"
            className="min-h-[70px]"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onNotesChange?.(exercise, notes)}
          />
        </div>
      )}
    </div>
  );
};

export default ExerciseCard;
