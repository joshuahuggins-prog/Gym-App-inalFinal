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
import { getVideoLinks, getPersonalRecords, getWorkouts } from "../utils/storage";
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

/**
 * Match ProgressPage behaviour: find best (MAX) signed weight for this exercise key from history.
 * - For assisted dips: -18 is "better" than -56 because -18 > -56 (closer to 0)
 * - For weighted: 56 > 40 etc
 */
const bestSignedFromHistory = (exerciseKey) => {
  const workouts = getWorkouts?.() || [];
  let best = -Infinity;

  workouts.forEach((w) => {
    (w?.exercises || []).forEach((ex) => {
      const key = normKey(ex?.id || ex?.name);
      if (!key || key !== exerciseKey) return;

      (ex?.sets || []).forEach((s) => {
        const ww = Number(s?.weight);
        if (!Number.isFinite(ww)) return;
        if (ww > best) best = ww;
      });
    });
  });

  return best === -Infinity ? null : best;
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
  const [sets, setSets] = useState(() => normalizeSets(exercise?.setsData, desiredSetsCount));

  // Mode is still useful for quick toggle converting sign, but DISPLAY always shows the signed value.
  const [mode, setMode] = useState(() =>
    (exercise?.setsData || []).some((s) => Number(s.weight) < 0) ? "assisted" : "weighted"
  );

  const userChoseModeRef = useRef(false);
  const lastExerciseIdRef = useRef(exercise?.id || "");

  // PRs: keep sign (no abs)
  const pr = useMemo(() => {
    const prs = getPersonalRecords?.() || {};
    return prs[exercise?.id] || null;
  }, [exercise?.id]);

  const exerciseKey = useMemo(
    () => normKey(exercise?.id || exercise?.name),
    [exercise?.id, exercise?.name]
  );

  // Last workout suggestions (signed)
  const lastTimeSuggestions = useMemo(() => {
    const arr = Array.isArray(lastWorkoutData?.sets) ? lastWorkoutData.sets : [];
    return arr.map((s) => toNumOrNull(s?.weight));
  }, [lastWorkoutData]);

  // Current-entered best (signed max)
  const bestFromCurrentSets = useMemo(() => {
    let best = -Infinity;
    (sets || []).forEach((s) => {
      const ww = toNumOrNull(s?.weight);
      if (!Number.isFinite(ww)) return;
      if (ww > best) best = ww;
    });
    return best === -Infinity ? null : best;
  }, [sets]);

  // ✅ Source of truth: history (same as ProgressPage), then PR, then current
  const overallBestSigned = useMemo(() => {
    const fromHistory = bestSignedFromHistory(exerciseKey);
    if (Number.isFinite(fromHistory)) return fromHistory;

    const prW = toNumOrNull(pr?.weight);
    if (Number.isFinite(prW)) return prW;

    if (Number.isFinite(bestFromCurrentSets)) return bestFromCurrentSets;

    return null;
  }, [exerciseKey, pr, bestFromCurrentSets]);

  // Hydrate from storage
  useEffect(() => {
    setSets(normalizeSets(exercise?.setsData, desiredSetsCount));
    setNotes(exercise?.userNotes || "");

    const links = getVideoLinks();
    setVideoLink(links?.[exercise?.id] || "");
  }, [exercise?.setsData, exercise?.userNotes, exercise?.id, desiredSetsCount]);

  // Reset mode when exercise changes
  useEffect(() => {
    const currentId = exercise?.id || "";
    if (currentId !== lastExerciseIdRef.current) {
      lastExerciseIdRef.current = currentId;
      userChoseModeRef.current = false;

      setMode((exercise?.setsData || []).some((s) => Number(s.weight) < 0) ? "assisted" : "weighted");
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
    const interactive = e.target.closest("button, a, input, textarea, select, [data-no-toggle]");
    if (interactive) return;
    setExpanded((v) => !v);
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

  const completedCount = useMemo(() => sets.filter((s) => s.completed).length, [sets]);

  const isExerciseComplete = useMemo(
    () => sets.length > 0 && sets.every((s) => !!s.completed),
    [sets]
  );

  const maxLabel = useMemo(() => {
    if (!Number.isFinite(overallBestSigned)) return null;
    const label = overallBestSigned < 0 ? "Best assist" : "Max";
    return `${label}: ${overallBestSigned}`;
  }, [overallBestSigned]);

  const showExerciseInfoNotes =
    exercise?.notes && String(exercise.notes).trim().length > 0;

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
          {alts.length > 8 && (
            <div className="text-xs text-muted-foreground mt-1">
              +{alts.length - 8} more…
            </div>
          )}
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

  const hasVideo = !!videoLink;

  // ✅ Suggested placeholder for weight input (SIGNED)
  // Prefer last time same set index, else fallback to overall best (signed)
  const suggestedWeightForSet = (setIndex) => {
    const bySet = lastTimeSuggestions?.[setIndex];
    if (Number.isFinite(bySet)) return String(bySet);
    if (Number.isFinite(overallBestSigned)) return String(overallBestSigned);
    return mode === "assisted" ? "Assist" : "Weight";
  };

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl border",
        isExerciseComplete ? "bg-primary/10 border-primary/40" : "bg-card border-border",
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

              {exercise?.repScheme && (
                <Badge variant="secondary" className="text-[10px]">
                  {exercise.repScheme}
                </Badge>
              )}

              {pr?.weight != null && pr?.reps != null && (
                <span className="text-foreground font-semibold">
                  PR: {pr.weight} × {pr.reps}
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

          {/* Video icon */}
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

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {maxLabel && (
            <div className="text-xs text-muted-foreground">
              <span
                className={
                  Number(overallBestSigned) < 0
                    ? "text-[hsl(var(--accent-strong))] font-semibold"
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
                <span className="text-xs text-muted-foreground">Set {i + 1}</span>

                {/* ✅ weight input shows SIGNED weight (negative stays negative) */}
                <Input
                  type="number"
                  value={s.weight}
                  placeholder={suggestedWeightForSet(i)}
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

                    next[i] = { ...s, weight: n };
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
              <div className="whitespace-pre-wrap">{String(exercise.notes).trim()}</div>
            </div>
          )}

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
              <div className="font-semibold text-foreground mb-1">Last time</div>
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