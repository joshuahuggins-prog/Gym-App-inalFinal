// src/components/ExerciseCard.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Timer,
  Play,
  Edit2,
  Dumbbell,
} from "lucide-react";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

import { useSettings } from "../contexts/SettingsContext";
import { getProgressionSettings, getVideoLinks, updateVideoLink } from "../utils/storage";
import WarmupCalculator from "./WarmupCalculator";
import PlateCalculator from "./PlateCalculator";

// Keep your existing alternatives constant if you had it earlier
const EXERCISE_ALTERNATIVES = {
  // ...
};

const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));

const abs1 = (n) => Math.abs(toNum(n, 0));

const normalizeSetsData = (setsData, count) => {
  const c = clampInt(toNum(count, 3), 1, 12);
  const arr = Array.isArray(setsData) ? setsData.slice(0, c) : [];

  while (arr.length < c) {
    arr.push({ weight: 0, reps: 0, completed: false });
  }

  return arr.map((s) => ({
    weight: toNum(s?.weight, 0),
    reps: clampInt(toNum(s?.reps, 0), 0, 999),
    completed: !!s?.completed,
    // infer assisted from negative weight if not present
    assisted: typeof s?.assisted === "boolean" ? s.assisted : toNum(s?.weight, 0) < 0,
  }));
};

const normalizeGoalReps = (goalReps, count) => {
  const c = clampInt(toNum(count, 3), 1, 12);
  let arr = Array.isArray(goalReps) ? goalReps.slice() : [];
  if (arr.length === 0) arr = [8];

  arr = arr.map((r) => {
    const n = toNum(r, 8);
    if (!Number.isFinite(n) || n <= 0) return 8;
    return clampInt(n, 1, 200);
  });

  if (arr.length < c) {
    arr = [...arr, ...Array.from({ length: c - arr.length }, () => 8)];
  } else if (arr.length > c) {
    arr = arr.slice(0, c);
  }
  return arr;
};

const calculateRPTWeights = (topSetAbs, setNumber, progressionSettings) => {
  // basic: set2 = 90%, set3 = 80% (configurable)
  const p2 = toNum(progressionSettings?.rptSet2Percentage, 90) / 100;
  const p3 = toNum(progressionSettings?.rptSet3Percentage, 80) / 100;

  if (setNumber === 2) return Math.round(topSetAbs * p2 * 10) / 10;
  if (setNumber === 3) return Math.round(topSetAbs * p3 * 10) / 10;
  return topSetAbs;
};

const ExerciseCard = ({
  exercise,
  lastWorkoutData,
  onSetComplete,
  onWeightChange,
  onNotesChange,
  onRestTimer,
  isFirst,
}) => {
  const { weightUnit } = useSettings();

  const [expanded, setExpanded] = useState(false);
  const [showWarmup, setShowWarmup] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showVideoEdit, setShowVideoEdit] = useState(false);

  const [videoLink, setVideoLink] = useState("");
  const [notes, setNotes] = useState("");

  // ✅ IMPORTANT: hydrate from exercise.setsData
  const [sets, setSets] = useState(() => {
    const setsCount = clampInt(toNum(exercise?.sets, 3), 1, 12);
    const goalReps = normalizeGoalReps(exercise?.goalReps, setsCount);
    const base = normalizeSetsData(exercise?.setsData, setsCount);

    return base.map((s, idx) => ({
      ...s,
      goalReps: goalReps[idx] ?? 8,
    }));
  });

  const lastHydratedKeyRef = useRef("");

  const setsCount = clampInt(toNum(exercise?.sets, 3), 1, 12);
  const goalReps = useMemo(
    () => normalizeGoalReps(exercise?.goalReps, setsCount),
    [exercise?.goalReps, setsCount]
  );

  // hydrate video + notes + sets when exercise changes OR when parent updates setsData
  useEffect(() => {
    const links = getVideoLinks();
    setVideoLink(links?.[exercise?.id] || "");

    setNotes(exercise?.userNotes || "");

    const key = `${exercise?.id || ""}__${setsCount}__${JSON.stringify(exercise?.setsData || [])}__${JSON.stringify(goalReps)}`;
    if (key === lastHydratedKeyRef.current) return;
    lastHydratedKeyRef.current = key;

    const base = normalizeSetsData(exercise?.setsData, setsCount);

    setSets(
      base.map((s, idx) => ({
        ...s,
        goalReps: goalReps[idx] ?? 8,
      }))
    );
  }, [exercise?.id, setsCount, exercise?.setsData, goalReps]);

  // handy: top set abs weight
  const topSetAbs = useMemo(() => {
    const first = sets?.[0]?.weight ?? 0;
    return abs1(first);
  }, [sets]);

  const handleNotesBlur = () => {
    onNotesChange?.(exercise, notes);
  };

  const pushSetsUp = (nextSets) => {
    setSets(nextSets);

    // remove goalReps before sending upward (parent stores setsData only)
    const setsData = nextSets.map((s) => ({
      weight: toNum(s.weight, 0),
      reps: clampInt(toNum(s.reps, 0), 0, 999),
      completed: !!s.completed,
    }));

    onWeightChange?.(exercise, setsData);
  };

  const handleWeightChangeLocal = (index, raw) => {
    const n = raw === "" ? 0 : toNum(raw, 0);

    pushSetsUp(
      sets.map((s, i) => {
        if (i !== index) return s;
        const assisted = !!s.assisted;
        const signed = assisted ? -Math.abs(n) : Math.abs(n);
        return { ...s, weight: signed };
      })
    );
  };

  const handleRepsChangeLocal = (index, raw) => {
    const n = raw === "" ? 0 : clampInt(toNum(raw, 0), 0, 999);
    pushSetsUp(sets.map((s, i) => (i === index ? { ...s, reps: n } : s)));
  };

  const handleToggleAssisted = (index) => {
    pushSetsUp(
      sets.map((s, i) => {
        if (i !== index) return s;
        if (s.completed) return s;

        const nextAssisted = !s.assisted;
        const abs = Math.abs(toNum(s.weight, 0));
        const signed = nextAssisted ? -abs : abs;
        return { ...s, assisted: nextAssisted, weight: signed };
      })
    );
  };

  const getSuggestedWeight = (idx) => {
    // if lastWorkoutData exists, use it. otherwise blank.
    if (!lastWorkoutData?.sets || !Array.isArray(lastWorkoutData.sets)) return null;
    const prev = lastWorkoutData.sets[idx];
    if (!prev) return null;
    return toNum(prev.weight, 0);
  };

  const handleSetCompleteClick = (index) => {
    const s = sets[index];
    const canComplete = toNum(s.weight, 0) !== 0 && toNum(s.reps, 0) > 0;
    if (!canComplete) return;

    const next = sets.map((x, i) => (i === index ? { ...x, completed: !x.completed } : x));
    pushSetsUp(next);

    // call PR / level up hook when marking complete
    if (!sets[index].completed) {
      const updatedSet = {
        weight: toNum(next[index].weight, 0),
        reps: toNum(next[index].reps, 0),
        completed: true,
      };

      // "level up" heuristic: reps >= goal
      const levelUp = toNum(updatedSet.reps, 0) >= toNum(goalReps[index], 0);

      onSetComplete?.(exercise, updatedSet, levelUp);

      // optional rest timer
      const rest = toNum(exercise?.restTime, 120);
      if (rest > 0) onRestTimer?.(rest);
    }
  };

  const handleVideoUpdate = () => {
    try {
      updateVideoLink(exercise.id, videoLink);
      toast.success("Video link saved");
    } catch (e) {
      toast.error("Failed to save video link");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 flex items-start justify-between gap-3"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground truncate">
              {exercise.name}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {exercise.repScheme || "RPT"}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {exercise.sets} sets • Rest {exercise.restTime || 120}s
          </div>
        </div>

        <div className="pt-1">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-fadeIn">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWarmup(true)}
                disabled={topSetAbs <= 0}
              >
                <Dumbbell className="w-4 h-4 mr-2" />
                Warmup
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedWeight(topSetAbs || 0);
                setShowPlates(true);
              }}
              disabled={topSetAbs <= 0}
            >
              Plates
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAlternatives((v) => !v)}
            >
              Alternatives
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVideoEdit((v) => !v)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Video
            </Button>
          </div>

          {/* Video Edit */}
          {showVideoEdit && (
            <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
              <label className="text-sm font-medium text-foreground">
                Form Check Video URL
              </label>
              <div className="flex gap-2">
                <Input
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="flex-1"
                />
                <Button size="sm" onClick={handleVideoUpdate}>
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Alternatives */}
          {showAlternatives && EXERCISE_ALTERNATIVES[exercise.id] && (
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <div className="text-sm font-medium text-foreground mb-2">
                Alternative Exercises:
              </div>
              <div className="flex flex-wrap gap-2">
                {EXERCISE_ALTERNATIVES[exercise.id].map((alt, index) => (
                  <Badge key={index} variant="secondary">
                    {alt}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sets */}
          <div className="grid grid-cols-1 gap-3">
            {sets.map((set, index) => {
              const suggestedWeight = getSuggestedWeight(index);
              const absWeight = abs1(set.weight);
              const canComplete = toNum(set.weight, 0) !== 0 && toNum(set.reps, 0) > 0;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    set.completed
                      ? "bg-primary/10 border-primary/50"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Set Number */}
                    <button
                      type="button"
                      onClick={() => handleSetCompleteClick(index)}
                      disabled={!canComplete}
                      className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-xl transition-all duration-200 ${
                        set.completed
                          ? "bg-primary border-primary text-primary-foreground shadow-lg scale-105"
                          : "bg-primary/10 border-primary/50 text-primary hover:bg-primary/20 hover:scale-105"
                      } ${!canComplete ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {set.completed ? "✓" : index + 1}
                    </button>

                    {/* Weight + Assisted toggle */}
                    <div className="flex-1 min-w-[170px]">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-muted-foreground block mb-1">
                          Weight ({weightUnit})
                        </label>

                        <div className="flex rounded-full border border-border bg-background/40 p-0.5">
                          <button
                            type="button"
                            onClick={() => !set.completed && set.assisted && handleToggleAssisted(index)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                              !set.assisted
                                ? "bg-primary/15 text-primary border border-primary/40"
                                : "text-muted-foreground"
                            }`}
                          >
                            Weighted
                          </button>
                          <button
                            type="button"
                            onClick={() => !set.completed && !set.assisted && handleToggleAssisted(index)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                              set.assisted
                                ? "bg-orange-500/15 text-orange-500 border border-orange-500/40"
                                : "text-muted-foreground"
                            }`}
                          >
                            Assisted
                          </button>
                        </div>
                      </div>

                      <Input
                        type="text"
                        inputMode="decimal"
                        value={absWeight === 0 ? "" : String(absWeight)}
                        onChange={(e) => handleWeightChangeLocal(index, e.target.value)}
                        placeholder={
                          suggestedWeight != null ? String(Math.abs(Number(suggestedWeight))) : "0"
                        }
                        className="h-12 text-center text-lg font-semibold"
                        disabled={set.completed}
                      />

                      {suggestedWeight != null && absWeight === 0 && (
                        <div className="text-xs text-muted-foreground mt-1 text-center">
                          Last: {Math.abs(Number(suggestedWeight))}
                          {weightUnit}
                          {Number(suggestedWeight) < 0 ? " (assisted)" : ""}
                        </div>
                      )}
                    </div>

                    {/* Reps */}
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs text-muted-foreground block mb-1">
                        Reps
                      </label>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={toNum(set.reps, 0) === 0 ? "" : String(set.reps)}
                          onChange={(e) => handleRepsChangeLocal(index, e.target.value)}
                          placeholder={String(set.goalReps)}
                          className="h-12 text-center text-lg font-semibold w-20"
                          disabled={set.completed}
                        />

                        <span className="text-muted-foreground whitespace-nowrap shrink-0">
                          / {set.goalReps}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Auto RPT note */}
                  {exercise.repScheme === "RPT" && index === 0 && absWeight > 0 && (() => {
                    const progressionSettings = getProgressionSettings();
                    const set2Abs = calculateRPTWeights(absWeight, 2, progressionSettings);
                    const set3Abs = calculateRPTWeights(absWeight, 3, progressionSettings);

                    return (
                      <div className="mt-2 text-xs text-muted-foreground text-center">
                        Auto: Set 2 = {set2Abs}
                        {weightUnit}, Set 3 = {set3Abs}
                        {weightUnit}
                        {sets[0]?.assisted ? " (assisted)" : ""}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="How did it feel? Any form notes?"
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Exercise Description */}
          {!!exercise.notes && (
            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg border border-border">
              {exercise.notes}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showWarmup && (
        <WarmupCalculator
          exercise={exercise.name}
          topSetWeight={Math.abs(Number(sets[0]?.weight) || 0)}
          open={showWarmup}
          onClose={() => setShowWarmup(false)}
        />
      )}

      {showPlates && (
        <PlateCalculator
          weight={Math.abs(Number(selectedWeight) || 0)}
          open={showPlates}
          onClose={() => setShowPlates(false)}
        />
      )}
    </div>
  );
};

export default ExerciseCard;
