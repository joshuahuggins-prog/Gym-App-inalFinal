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

  const pr = useMemo(() => bestSetFromHistory(exerciseKey), [exerciseKey]);
  const historyBests = useMemo(() => getHistoryBests(exerciseKey), [exerciseKey]);

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
      const ww = toNumOrNull(s.weight);
      if (!Number.isFinite(ww)) return s;
      const v = Math.abs(ww);
      return { ...s, weight: nextMode === "assisted" ? -v : v };
    });

    pushUp(converted);
  };

  const completedCount = useMemo(() => sets.filter((s) => s.completed).length, [
    sets,
  ]);

  const isExerciseComplete = useMemo(
    () => sets.length > 0 && sets.every((s) => !!s.completed),
    [sets]
  );

  const topLineLabel = useMemo(() => {
    const parts = [];
    if (Number.isFinite(historyBests?.maxWeighted)) {
      parts.push(`Max: ${fmt1(historyBests.maxWeighted)}`);
    }
    if (Number.isFinite(historyBests?.bestAssist)) {
      parts.push(`Best assist: ${fmt1(historyBests.bestAssist)}`);
    }
    if (parts.length === 0) return null;
    return parts.join(" • ");
  }, [historyBests]);

  const completeIncompleteLabel = useMemo(() => {
    if (mode === "weighted") {
      const a = Number.isFinite(historyBests?.maxCompleteWeighted)
        ? `Max complete: ${fmt1(historyBests.maxCompleteWeighted)}`
        : null;
      const b = Number.isFinite(historyBests?.maxIncompleteWeighted)
        ? `Max incomplete: ${fmt1(historyBests.maxIncompleteWeighted)}`
        : null;
      return [a, b].filter(Boolean).join(" • ") || null;
    }
    const a = Number.isFinite(historyBests?.bestCompleteAssist)
      ? `Assist complete: ${fmt1(historyBests.bestCompleteAssist)}`
      : null;
    const b = Number.isFinite(historyBests?.bestIncompleteAssist)
      ? `Assist incomplete: ${fmt1(historyBests.bestIncompleteAssist)}`
      : null;
    return [a, b].filter(Boolean).join(" • ") || null;
  }, [historyBests, mode]);

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

  // ==========================
  // Settings
  // ==========================
  const [settingsVersion, setSettingsVersion] = useState(0);
  useEffect(() => {
    const handler = () => setSettingsVersion((v) => v + 1);
    window.addEventListener("storage", handler);
    window.addEventListener("gymapp:settingsChanged", handler);
    window.addEventListener("gymapp:progressionChanged", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("gymapp:settingsChanged", handler);
      window.removeEventListener("gymapp:progressionChanged", handler);
    };
  }, []);

  const progressionSettings = useMemo(
    () => getProgressionSettings?.() || {},
    [settingsVersion]
  );
  const appSettings = useMemo(() => getSettings?.() || {}, [settingsVersion]);
  const globalIncrement = useMemo(() => {
    const unit = (appSettings?.weightUnit || "kg").toLowerCase();
    const inc =
      unit === "lbs"
        ? Number(progressionSettings?.globalIncrementLbs)
        : Number(progressionSettings?.globalIncrementKg);
    return Number.isFinite(inc) ? inc : 0;
  }, [appSettings?.weightUnit, progressionSettings]);

  const clampToMode = (value, currentMode) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    if (currentMode === "weighted") return Math.max(0, n);
    return Math.min(0, n);
  };

  // Suggested weights logic (same as before)
  const suggestedWeights = useMemo(() => {
    const count = desiredSetsCount;
    const schemeRaw = String(exercise?.repScheme || "").trim();
    const scheme = schemeRaw.toLowerCase();
    const isRPT = scheme === "rpt";
    const isKinoOrPause = scheme.includes("kino") || scheme.includes("pause");

    const out = new Array(count).fill(null);
    const lastSets = Array.isArray(lastWorkoutData?.sets)
      ? lastWorkoutData.sets
      : [];
    const lastWeights = lastSets.map((s) => toNumOrNull(s?.weight));
    const lastReps = lastSets.map((s) => toNumOrNull(s?.reps));

    const heaviestIndexLast = (() => {
      let best = -Infinity;
      let idx = -1;
      for (let i = 0; i < lastWeights.length; i++) {
        const w = lastWeights[i];
        if (!Number.isFinite(w)) continue;
        if (w > best) {
          best = w;
          idx = i;
        }
      }
      return idx;
    })();

    let base = null;
    if (isKinoOrPause) {
      if (heaviestIndexLast >= 0 && Number.isFinite(lastWeights[heaviestIndexLast])) {
        base = lastWeights[heaviestIndexLast];
      } else if (Number.isFinite(bestFromCurrentSets)) base = bestFromCurrentSets;
    } else {
      const first = lastWeights?.[0];
      if (Number.isFinite(first)) base = first;
      else if (Number.isFinite(bestFromCurrentSets)) base = bestFromCurrentSets;
    }

    if (Number.isFinite(base)) base = clampToMode(base, mode);

    // Further logic same as your original code...
    // (RPT, Kino/Pause, default scheme)
    for (let i = 0; i < count; i++) {
      const v = Number.isFinite(lastWeights[i]) ? lastWeights[i] : base;
      out[i] = round1(clampToMode(v, mode));
    }
    return out;
  }, [
    desiredSetsCount,
    exercise?.repScheme,
    goalReps,
    lastWorkoutData,
    bestFromCurrentSets,
    globalIncrement,
    progressionSettings,
    mode,
  ]);

  const suggestedWeightForSet = (setIndex) => {
    const ww = suggestedWeights?.[setIndex];
    if (Number.isFinite(ww)) return fmt1(ww);
    return mode === "assisted" ? "Assist" : "Weight";
  };

  // ==========================
  // Custom number pad stub
  // ==========================
  const openCustomNumberPad = (exercise, setIndex, field) => {
    // Replace this stub with your actual modal
    const value = prompt(`Enter ${field} for set ${setIndex + 1}`, sets[setIndex][field] || "");
    if (value === null) return;
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const next = [...sets];
    next[setIndex] = { ...next[setIndex], [field]: n };
    pushUp(next);
  };

// ==========================
// Render
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
                PR: {fmt1(pr.weight)} × {pr.reps}
              </span>
            )}

            {isExerciseComplete && (
              <Badge className="bg-primary/20 text-primary border-primary/40">
                Completed
              </Badge>
            )}
          </div>

          {/* Mode toggle */}
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

          {expanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* History labels */}
          {topLineLabel && (
            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">{topLineLabel}</span>
            </div>
          )}
          {completeIncompleteLabel && (
            <div className="text-xs text-muted-foreground">
              <span className="text-muted-foreground">{completeIncompleteLabel}</span>
            </div>
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
                  placeholder={suggestedWeightForSet(i)}
                  onFocus={(e) => e.target.blur()} // disable system keyboard
                  onClick={() => openCustomNumberPad(exercise, i, "weight")}
                  readOnly
                />

                <Input
                  type="number"
                  value={s.reps}
                  placeholder={`${goalReps[i] ?? 8}`}
                  onFocus={(e) => e.target.blur()}
                  onClick={() => openCustomNumberPad(exercise, i, "reps")}
                  readOnly
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

          {/* Action buttons */}
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
// ==========================
// Render
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
    {/* Completed overlay */}
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

          {/* Top labels */}
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

          {/* Mode toggle */}
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

        {/* Video icon + expand */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasVideo}
            onClick={(e) => {
              e.stopPropagation();
              if (hasVideo) onOpenVideo?.(exercise, videoLink);
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
        {/* History labels */}
        {topLineLabel && (
          <div className="text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">{topLineLabel}</span>
          </div>
        )}
        {completeIncompleteLabel && (
          <div className="text-xs text-muted-foreground">
            <span>{completeIncompleteLabel}</span>
          </div>
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
                placeholder={suggestedWeightForSet(i)}
                onFocus={(e) => e.target.blur()}
                onClick={() => openCustomNumberPad(exercise, i, "weight")}
                readOnly
              />

              <Input
                type="number"
                value={s.reps}
                placeholder={`${goalReps[i] ?? 8}`}
                onFocus={(e) => e.target.blur()}
                onClick={() => openCustomNumberPad(exercise, i, "reps")}
                readOnly
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

        {/* Action buttons */}
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

        {/* Last workout */}
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
