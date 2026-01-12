// frontend/src/components/ExerciseCard.js
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
import {
  getVideoLinks,
  updateVideoLink,
  getProgressionSettings,
} from "../utils/storage";
import WarmupCalculator from "./WarmupCalculator";
import PlateCalculator from "./PlateCalculator";

const toNumberOrZero = (raw) => {
  if (raw === "" || raw == null) return 0;
  // allow decimals; user never types "-" (we handle sign via toggle)
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const abs1 = (n) => Math.round(Math.abs(Number(n) || 0) * 10) / 10;

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

  // Each set stores: weight (can be negative), reps, completed, goalReps, assisted(boolean)
  const [sets, setSets] = useState(() =>
    Array(Number(exercise.sets) || 1)
      .fill(null)
      .map((_, index) => ({
        setNumber: index + 1,
        weight: 0,
        reps: 0,
        completed: false,
        assisted: false,
        goalReps: exercise.goalReps?.[index] ?? exercise.goalReps?.[0] ?? 8,
      }))
  );

  const [notes, setNotes] = useState(exercise.notes || "");
  const [showWarmup, setShowWarmup] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showVideoEdit, setShowVideoEdit] = useState(false);
  const [videoLink, setVideoLink] = useState("");

  const completedSets = useMemo(() => sets.filter((s) => s.completed).length, [sets]);
  const levelUp = useMemo(() => {
    const s1 = sets[0];
    return !!(s1?.completed && shouldLevelUp(s1.reps, s1.goalReps));
  }, [sets]);

  const getSuggestedWeight = (setIndex) => {
    const w = lastWorkoutData?.sets?.[setIndex]?.weight;
    const n = Number(w);
    return Number.isFinite(n) ? n : null;
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
            weight: existing?.weight ?? 0,
            reps: existing?.reps ?? 0,
            completed: existing?.completed ?? false,
            assisted: existing?.assisted ?? false,
            goalReps: exercise.goalReps?.[i] ?? exercise.goalReps?.[0] ?? 8,
          };
        });
    });
  }, [exercise.sets, exercise.goalReps]);

  const pushUp = (nextSets) => {
    setSets(nextSets);
    onWeightChange?.(exercise, nextSets); // keep parent synced (draft + payload)
  };

  const handleSetComplete = (setIndex) => {
    const newSets = [...sets];
    const currentSet = { ...newSets[setIndex] };

    // Weight must be non-zero (negative allowed), reps must be > 0
    const canComplete = Number(currentSet.weight) !== 0 && Number(currentSet.reps) > 0;
    if (!canComplete) return;

    if (!currentSet.completed) {
      currentSet.completed = true;

      if (setIndex === 0 && shouldLevelUp(currentSet.reps, currentSet.goalReps)) {
        onSetComplete?.(exercise, currentSet, true);
      } else {
        onSetComplete?.(exercise, currentSet, false);
      }

      if (setIndex < newSets.length - 1) {
        onRestTimer?.(exercise.restTime);
      }
    } else {
      currentSet.completed = false;
    }

    newSets[setIndex] = currentSet;
    pushUp(newSets);
  };

  const applyRPT = (newSets, set1WeightSigned, assisted) => {
    const progressionSettings = getProgressionSettings();

    // RPT math should use absolute load, then re-apply sign if assisted
    const baseAbs = Math.abs(set1WeightSigned);

    for (let i = 1; i < newSets.length; i++) {
      const absW =
        baseAbs > 0 ? calculateRPTWeights(baseAbs, i + 1, progressionSettings) : 0;

      newSets[i] = {
        ...newSets[i],
        assisted,
        weight: assisted ? -absW : absW,
      };
    }
  };

  const handleWeightChange = (setIndex, raw) => {
    const newSets = [...sets];
    const current = { ...newSets[setIndex] };

    const typedAbs = toNumberOrZero(raw);
    const assisted = !!current.assisted;
    const signed = assisted ? -Math.abs(typedAbs) : Math.abs(typedAbs);

    current.weight = signed;
    newSets[setIndex] = current;

    // Auto-calculate RPT weights after set 1 changes
    if (exercise.repScheme === "RPT" && setIndex === 0) {
      applyRPT(newSets, signed, assisted);
    }

    pushUp(newSets);
  };

  const handleToggleAssisted = (setIndex) => {
    const newSets = [...sets];
    const current = { ...newSets[setIndex] };

    const nextAssisted = !current.assisted;
    const absW = Math.abs(Number(current.weight) || 0);

    current.assisted = nextAssisted;
    current.weight = nextAssisted ? -absW : absW;
    newSets[setIndex] = current;

    // If toggling set 1 and scheme is RPT, re-apply sign + recalc
    if (exercise.repScheme === "RPT" && setIndex === 0) {
      applyRPT(newSets, current.weight, nextAssisted);
    }

    pushUp(newSets);
  };

  const handleRepsChange = (setIndex, raw) => {
    const newSets = [...sets];
    newSets[setIndex] = {
      ...newSets[setIndex],
      reps: toNumberOrZero(raw),
    };
    pushUp(newSets);
  };

  const handleNotesBlur = () => {
    onNotesChange?.(exercise, notes);
  };

  const handleVideoUpdate = () => {
    updateVideoLink(exercise.id, videoLink);
    setShowVideoEdit(false);
  };

  const suggestedSet1 = getSuggestedWeight(0);
  const topSetAbs = abs1(sets[0]?.weight || 0);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div
        className="p-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-lg font-bold text-foreground">{exercise.name}</h3>
              {levelUp && (
                <Badge className="bg-gold text-gold-foreground font-semibold animate-bounce-slow">
                  Level Up! +5{weightUnit}
                </Badge>
              )}
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

          <div className="flex items-center gap-2 shrink-0">
            {videoLink && (
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
            )}
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

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
              const canComplete = Number(set.weight) !== 0 && Number(set.reps) > 0;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    set.completed
                      ? "bg-primary/10 border-primary/50"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  {/* Make the row wrap on small screens to prevent overflow */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Set Number */}
                    <button
                      type="button"
                      onClick={() => handleSetComplete(index)}
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

                        {/* Toggle pill */}
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
                        onChange={(e) => handleWeightChange(index, e.target.value)}
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

                    {/* Reps (fixed overflow) */}
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs text-muted-foreground block mb-1">
                        Reps
                      </label>

                      {/* allow wrapping so '/ goal' never spills outside card */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={set.reps === 0 ? "" : String(set.reps)}
                          onChange={(e) => handleRepsChange(index, e.target.value)}
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
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg border border-border">
            {exercise.notes}
          </div>
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
