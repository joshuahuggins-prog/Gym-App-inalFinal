// src/components/ExerciseCard.js
import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Video, Dumbbell, Edit2 } from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";

import {
  calculateRPTWeights,
  shouldLevelUp,
  EXERCISE_ALTERNATIVES,
} from "../data/workoutData";

import { useSettings } from "../contexts/SettingsContext";
import { getVideoLinks, updateVideoLink, getProgressionSettings } from "../utils/storage";

import WarmupCalculator from "./WarmupCalculator";
import PlateCalculator from "./PlateCalculator";

/**
 * Allows intermediate typing like "" or "." etc.
 * Returns { ok:false } for intermediate, { ok:true, value:number } for valid.
 */
const parseMaybeNumber = (raw) => {
  const s = (raw ?? "").toString().trim();
  if (s === "") return { ok: false, value: null };
  if (s === "." ) return { ok: false, value: null };

  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, value: null };
  return { ok: true, value: n };
};

const toAbsString = (n) => {
  if (n == null || !Number.isFinite(n)) return "";
  return String(Math.abs(n));
};

const ExerciseCard = ({
  exercise,
  onSetComplete,
  onWeightChange,
  onNotesChange,
  onRestTimer,
  isFirst,
  lastWorkoutData,
}) => {
  const { weightUnit } = useSettings();
  const [expanded, setExpanded] = useState(true);

  // Each set stores:
  // - weightText (always positive string, user types normally)
  // - weight (signed number: negative if assisted)
  // - assisted boolean
  const initialSets = useMemo(() => {
    const count = Number(exercise.sets) || 1;
    return Array(count)
      .fill(null)
      .map((_, index) => ({
        setNumber: index + 1,
        assisted: false,
        weightText: "",
        weight: null, // signed number
        repsText: "",
        reps: null,
        completed: false,
        goalReps: exercise.goalReps?.[index] ?? exercise.goalReps?.[0] ?? 8,
      }));
  }, [exercise.sets, exercise.goalReps]);

  const [sets, setSets] = useState(initialSets);

  const [notes, setNotes] = useState(exercise.notes || "");
  const [showWarmup, setShowWarmup] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showVideoEdit, setShowVideoEdit] = useState(false);
  const [videoLink, setVideoLink] = useState("");

  const getSuggestedWeight = (setIndex) => {
    const w = lastWorkoutData?.sets?.[setIndex]?.weight;
    return Number.isFinite(Number(w)) ? Number(w) : null;
  };

  useEffect(() => {
    const links = getVideoLinks();
    setVideoLink(links[exercise.id] || "");
  }, [exercise.id]);

  // Keep local sets in sync if exercise.sets / goalReps change
  useEffect(() => {
    setSets((prev) => {
      const nextLen = Number(exercise.sets) || 1;
      return Array(nextLen)
        .fill(null)
        .map((_, i) => {
          const existing = prev[i];
          return {
            setNumber: i + 1,
            assisted: existing?.assisted ?? false,
            weightText: existing?.weightText ?? "",
            weight: existing?.weight ?? null,
            repsText: existing?.repsText ?? "",
            reps: existing?.reps ?? null,
            completed: existing?.completed ?? false,
            goalReps: exercise.goalReps?.[i] ?? exercise.goalReps?.[0] ?? 8,
          };
        });
    });
  }, [exercise.sets, exercise.goalReps]);

  const emitSetsToParent = (nextSets) => {
    const payload = nextSets.map((s) => ({
      setNumber: s.setNumber,
      weight: Number.isFinite(s.weight) ? s.weight : 0,
      reps: Number.isFinite(s.reps) ? s.reps : 0,
      completed: !!s.completed,
      goalReps: s.goalReps,
    }));
    onWeightChange?.(exercise, payload);
  };

  const applySign = (assisted, value) => {
    if (!Number.isFinite(value)) return null;
    const abs = Math.abs(value);
    return assisted ? -abs : abs;
  };

  const handleSetComplete = (setIndex) => {
    setSets((prev) => {
      const next = prev.slice();
      const current = { ...next[setIndex] };

      const hasWeight = Number.isFinite(current.weight);
      const hasReps = Number.isFinite(current.reps) && current.reps > 0;
      if (!hasWeight || !hasReps) {
        next[setIndex] = current;
        return next;
      }

      if (!current.completed) {
        current.completed = true;

        const isTopSet = setIndex === 0;
        const leveled =
          isTopSet && shouldLevelUp(current.reps, current.goalReps);

        onSetComplete?.(
          exercise,
          { weight: current.weight, reps: current.reps },
          !!leveled
        );

        if (setIndex < next.length - 1) onRestTimer?.(exercise.restTime);
      } else {
        current.completed = false;
      }

      next[setIndex] = current;
      emitSetsToParent(next);
      return next;
    });
  };

  const handleWeightChange = (setIndex, raw) => {
    const rawText = (raw ?? "").toString();

    setSets((prev) => {
      const next = prev.slice();
      const s = { ...next[setIndex] };

      // user types positive always
      s.weightText = rawText;

      const parsed = parseMaybeNumber(rawText);
      if (parsed.ok) {
        s.weight = applySign(s.assisted, parsed.value);
      } else {
        s.weight = null;
      }

      next[setIndex] = s;

      // RPT: only auto-fill if top set is a POSITIVE number and not assisted
      if (exercise.repScheme === "RPT" && setIndex === 0) {
        const top = s.weight;
        if (Number.isFinite(top) && top > 0 && !s.assisted) {
          const progressionSettings = getProgressionSettings();
          for (let i = 1; i < next.length; i++) {
            const setWeight = calculateRPTWeights(top, i + 1, progressionSettings);
            next[i] = {
              ...next[i],
              assisted: false,
              weight: setWeight,
              weightText: String(setWeight),
            };
          }
        }
      }

      emitSetsToParent(next);
      return next;
    });
  };

  const handleToggleAssisted = (setIndex) => {
    setSets((prev) => {
      const next = prev.slice();
      const s = { ...next[setIndex] };

      s.assisted = !s.assisted;

      // if there's a valid number typed, flip the sign immediately
      const parsed = parseMaybeNumber(s.weightText);
      if (parsed.ok) {
        s.weight = applySign(s.assisted, parsed.value);
      } else if (Number.isFinite(s.weight)) {
        // fallback if text was empty but number exists
        s.weight = s.assisted ? -Math.abs(s.weight) : Math.abs(s.weight);
        s.weightText = toAbsString(s.weight);
      }

      next[setIndex] = s;

      emitSetsToParent(next);
      return next;
    });
  };

  const handleRepsChange = (setIndex, raw) => {
    const rawText = (raw ?? "").toString();

    setSets((prev) => {
      const next = prev.slice();
      const s = { ...next[setIndex] };

      s.repsText = rawText;

      if (rawText.trim() === "") {
        s.reps = null;
      } else {
        const n = Number(rawText);
        s.reps = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
      }

      next[setIndex] = s;
      emitSetsToParent(next);
      return next;
    });
  };

  const handleNotesBlur = () => onNotesChange?.(exercise, notes);

  const handleVideoUpdate = () => {
    updateVideoLink(exercise.id, videoLink);
    setShowVideoEdit(false);
  };

  const completedSets = sets.filter((s) => s.completed).length;

  const topSet = sets[0];
  const levelUp =
    !!topSet?.completed &&
    Number.isFinite(topSet?.reps) &&
    shouldLevelUp(topSet.reps, topSet.goalReps);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className="p-4 cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-foreground">{exercise.name}</h3>
              {levelUp ? (
                <Badge className="bg-gold text-gold-foreground font-semibold animate-bounce-slow">
                  Level Up! +5{weightUnit}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="text-primary border-primary/50">
                {exercise.repScheme}
              </Badge>
              <span className="text-muted-foreground">
                {completedSets}/{exercise.sets} sets
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{exercise.restTime}s rest</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {videoLink ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(videoLink, "_blank");
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Video className="w-5 h-5 text-primary" />
              </button>
            ) : null}

            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="px-4 pb-4 space-y-4 animate-fadeIn">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {isFirst ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWarmup(true)}
                disabled={!Number.isFinite(sets[0]?.weight)}
              >
                <Dumbbell className="w-4 h-4 mr-2" />
                Warmup
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const w = sets[0]?.weight;
                setSelectedWeight(Number.isFinite(w) ? w : 0);
                setShowPlates(true);
              }}
              disabled={!Number.isFinite(sets[0]?.weight)}
            >
              Plates
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowAlternatives((v) => !v)}>
              Alternatives
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowVideoEdit((v) => !v)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Video
            </Button>
          </div>

          {/* Video Edit */}
          {showVideoEdit ? (
            <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
              <label className="text-sm font-medium text-foreground">Form Check Video URL</label>
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
          ) : null}

          {/* Alternatives */}
          {showAlternatives && EXERCISE_ALTERNATIVES[exercise.id] ? (
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <div className="text-sm font-medium text-foreground mb-2">Alternative Exercises:</div>
              <div className="flex flex-wrap gap-2">
                {EXERCISE_ALTERNATIVES[exercise.id].map((alt, index) => (
                  <Badge key={index} variant="secondary">
                    {alt}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* Sets */}
          <div className="grid grid-cols-1 gap-3">
            {sets.map((set, index) => {
              const suggestedWeight = getSuggestedWeight(index);

              const hasWeight = Number.isFinite(set.weight);
              const hasReps = Number.isFinite(set.reps) && set.reps > 0;
              const canComplete = hasWeight && hasReps;

              const modeClasses = set.assisted
                ? "bg-orange-500/15 border-orange-500/40 text-orange-700"
                : "bg-primary/10 border-primary/40 text-primary";

              return (
                <div
                  key={index}
                  className={
                    "p-4 rounded-lg border transition-all duration-200 " +
                    (set.completed ? "bg-primary/10 border-primary/50" : "bg-muted/30 border-border")
                  }
                >
                  <div className="flex items-center gap-3">
                    {/* Set Number */}
                    <button
                      type="button"
                      onClick={() => handleSetComplete(index)}
                      disabled={!canComplete}
                      className={
                        "flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-xl transition-all duration-200 " +
                        (set.completed
                          ? "bg-primary border-primary text-primary-foreground shadow-lg scale-105"
                          : "bg-primary/10 border-primary/50 text-primary hover:bg-primary/20 hover:scale-105") +
                        " " +
                        (!canComplete ? "opacity-50 cursor-not-allowed" : "cursor-pointer")
                      }
                    >
                      {set.completed ? "✓" : index + 1}
                    </button>

                    {/* Weight */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="text-xs text-muted-foreground">
                          Weight ({weightUnit})
                        </label>

                        <button
                          type="button"
                          onClick={() => handleToggleAssisted(index)}
                          disabled={set.completed}
                          className={"text-xs px-2 py-1 rounded-md border transition-colors " + modeClasses}
                        >
                          {set.assisted ? "Assisted" : "Weighted"}
                        </button>
                      </div>

                      <Input
                        type="text"
                        inputMode="decimal"
                        value={set.weightText}
                        onChange={(e) => handleWeightChange(index, e.target.value)}
                        placeholder={suggestedWeight != null ? String(Math.abs(suggestedWeight)) : "0"}
                        className="h-12 text-center text-lg font-semibold"
                        disabled={set.completed}
                      />

                      {/* show the stored signed value so it’s obvious */}
                      {Number.isFinite(set.weight) ? (
                        <div className="text-[11px] text-muted-foreground mt-1 text-center">
                          Stored: <span className="font-semibold text-foreground">{set.weight}{weightUnit}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Reps */}
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Reps</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={set.repsText}
                          onChange={(e) => handleRepsChange(index, e.target.value)}
                          placeholder={String(set.goalReps)}
                          className="h-12 text-center text-lg font-semibold w-16"
                          disabled={set.completed}
                        />
                        <span className="text-muted-foreground whitespace-nowrap">/ {set.goalReps}</span>
                      </div>
                    </div>
                  </div>

                  {/* Auto RPT note */}
                  {exercise.repScheme === "RPT" &&
                  index === 0 &&
                  Number.isFinite(set.weight) &&
                  set.weight > 0 &&
                  !set.assisted ? (
                    (() => {
                      const progressionSettings = getProgressionSettings();
                      const set2Weight = calculateRPTWeights(set.weight, 2, progressionSettings);
                      const set3Weight = calculateRPTWeights(set.weight, 3, progressionSettings);
                      return (
                        <div className="mt-2 text-xs text-muted-foreground text-center">
                          Auto: Set 2 = {set2Weight}
                          {weightUnit}, Set 3 = {set3Weight}
                          {weightUnit}
                        </div>
                      );
                    })()
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="How did it feel? Any form notes?"
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Exercise Description */}
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg border border-border">
            {exercise.notes}
          </div>
        </div>
      ) : null}

      {/* Modals */}
      {showWarmup ? (
        <WarmupCalculator
          exercise={exercise.name}
          topSetWeight={Number.isFinite(sets[0]?.weight) ? sets[0].weight : 0}
          open={showWarmup}
          onClose={() => setShowWarmup(false)}
        />
      ) : null}

      {showPlates ? (
        <PlateCalculator
          weight={selectedWeight}
          open={showPlates}
          onClose={() => setShowPlates(false)}
        />
      ) : null}
    </div>
  );
};

export default ExerciseCard;
