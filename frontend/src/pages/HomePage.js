// src/pages/HomePage.js
import React, { useEffect, useRef, useState } from "react";
import { Calendar, Flame, RotateCcw, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import ExerciseCard from "../components/ExerciseCard";
import RestTimer from "../components/RestTimer";
import PRCelebration from "../components/PRCelebration";
import WorkoutActionBar from "../components/workout/WorkoutActionBar";

import {
  getWorkouts,
  saveWorkout,
  updatePersonalRecord,
  getPersonalRecords,
  getProgrammes,
  getProgressionSettings,
  peekNextWorkoutTypeFromPattern,
  advanceWorkoutPatternIndex,
  getWorkoutDraft,
  saveWorkoutDraft,
  clearWorkoutDraft,
  isWorkoutDraftForToday,
  setDraftWorkoutType, // ✅ add
} from "../utils/storage";

import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";

const HomePage = ({ onDataChange, onSaved }) => {
  const { weightUnit, toggleWeightUnit } = useSettings();

  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState([]);
  const [restTimer, setRestTimer] = useState(null);
  const [prCelebration, setPrCelebration] = useState(null);

  // Draft autosave debounce
  const draftSaveTimerRef = useRef(null);

  // UI state for floating buttons
  const [isDirty, setIsDirty] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [finishedSaved, setFinishedSaved] = useState(false);

  // Prevent "dirty" being set during initial hydration
  const didHydrateRef = useRef(false);

  // avoid eslint-disable rule names entirely
  const loadRef = useRef(null);

  // ✅ manual switcher
  const [manualWorkoutType, setManualWorkoutType] = useState("");

  const getUsableProgrammes = () => {
    const programmes = getProgrammes() || [];
    return programmes.filter((p) => Array.isArray(p.exercises) && p.exercises.length > 0);
  };

  const loadTodaysWorkout = () => {
    const workouts = getWorkouts();
    const usableProgrammes = getUsableProgrammes();

    const draft = getWorkoutDraft();
    const hasTodaysDraft = isWorkoutDraftForToday(draft) && draft?.workoutType;

    if (usableProgrammes.length === 0) {
      toast.error("No usable programmes found. Add at least 1 exercise to a programme.");
      return;
    }

    const nextType = hasTodaysDraft ? draft.workoutType : peekNextWorkoutTypeFromPattern();

    const workout =
      usableProgrammes.find(
        (p) => String(p.type).toUpperCase() === String(nextType).toUpperCase()
      ) || usableProgrammes[0];

    if (!workout) {
      toast.error("No programmes found. Please create a programme first.");
      return;
    }

    const lastSameWorkout = workouts.find(
      (w) => String(w.type).toUpperCase() === String(workout.type).toUpperCase()
    );

    setCurrentWorkout(workout);
    setManualWorkoutType(workout.type);

    // Restore draft if today + same type
    if (
      hasTodaysDraft &&
      String(draft.workoutType).toUpperCase() === String(workout.type).toUpperCase()
    ) {
      const draftById = new Map((draft.exercises || []).map((e) => [e.id, e]));

      setWorkoutData(
        workout.exercises.map((ex) => {
          const lastExerciseData = lastSameWorkout?.exercises.find(
            (e) => e.id === ex.id || e.name === ex.name
          );
          const draftEx = draftById.get(ex.id);

          return {
            ...ex,
            userNotes: draftEx?.userNotes || "",
            setsData: draftEx?.setsData || [],
            lastWorkoutData: lastExerciseData || null,
          };
        })
      );

      toast.message("Restored unsaved workout", {
        description: "We loaded your in-progress session after refresh.",
      });

      setDraftSaved(true);
      setIsDirty(false);
      setFinishedSaved(false);
      return;
    }

    // No draft - start fresh
    setWorkoutData(
      workout.exercises.map((ex) => {
        const lastExerciseData = lastSameWorkout?.exercises.find(
          (e) => e.id === ex.id || e.name === ex.name
        );
        return {
          ...ex,
          userNotes: "",
          setsData: [],
          lastWorkoutData: lastExerciseData || null,
        };
      })
    );

    setDraftSaved(false);
    setIsDirty(false);
    setFinishedSaved(false);
  };

  useEffect(() => {
    loadRef.current = loadTodaysWorkout;
  });

  useEffect(() => {
    loadRef.current?.();
  }, []);

  useEffect(() => {
    didHydrateRef.current = false;
    setIsDirty(false);
    setDraftSaved(false);
    setFinishedSaved(false);
  }, [currentWorkout?.type]);

  useEffect(() => {
    if (!currentWorkout) return;

    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    setIsDirty(true);
    setDraftSaved(false);
    setFinishedSaved(false);
  }, [workoutData, currentWorkout?.type]);

  // Auto-save workout draft as the user enters data (protects against refresh)
  // IMPORTANT: this MUST NOT change button UI state.
  useEffect(() => {
    if (!currentWorkout) return;

    const hasMeaningfulData = workoutData.some(
      (ex) =>
        (ex.userNotes && ex.userNotes.trim().length > 0) ||
        (Array.isArray(ex.setsData) &&
          ex.setsData.some((set) => (set.weight ?? 0) !== 0 || (set.reps ?? 0) !== 0))
    );

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);

    draftSaveTimerRef.current = setTimeout(() => {
      if (!hasMeaningfulData) {
        clearWorkoutDraft();
        return;
      }

      saveWorkoutDraft({
        workoutType: currentWorkout.type,
        programmeName: currentWorkout.name,
        focus: currentWorkout.focus,
        exercises: workoutData.map((ex) => ({
          id: ex.id,
          name: ex.name,
          repScheme: ex.repScheme,
          userNotes: ex.userNotes || "",
          setsData: ex.setsData || [],
        })),
      });
    }, 400);

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [currentWorkout, workoutData]);

  useEffect(() => {
    const hasData = workoutData.some(
      (ex) =>
        ex.setsData &&
        ex.setsData.length > 0 &&
        ex.setsData.some((set) => (set.weight ?? 0) !== 0 || (set.reps ?? 0) !== 0)
    );
    onDataChange?.(hasData);
  }, [workoutData, onDataChange]);

  const handleSetComplete = (exercise, set, levelUp) => {
    const progressionSettings = getProgressionSettings();
    const exerciseSpecificIncrement = progressionSettings.exerciseSpecific?.[exercise.id];

    const suggestedIncrement =
      exerciseSpecificIncrement && exerciseSpecificIncrement > 0
        ? exerciseSpecificIncrement
        : weightUnit === "lbs"
        ? progressionSettings.globalIncrementLbs
        : progressionSettings.globalIncrementKg;

    if (levelUp) {
      const suggestedWeight = (set.weight ?? 0) + suggestedIncrement;
      toast.success(`Level Up! Try ${suggestedWeight}${weightUnit} next time!`, {
        duration: 5000,
      });
    }

    // PR check (NOTE: this compares raw number; if you later want "best assisted" PR separately, we can)
    const prs = getPersonalRecords();
    const currentPR = prs?.[exercise.id];

    if (!currentPR || (set.weight ?? 0) > (currentPR.weight ?? 0)) {
      const wasNew = updatePersonalRecord(exercise.id, set.weight, set.reps);
      if (wasNew) {
        setPrCelebration({
          exercise: exercise.name,
          newWeight: set.weight,
          oldWeight: currentPR?.weight,
        });
      }
    }
  };

  const handleWeightChange = (exercise, setsData) => {
    setWorkoutData((prev) => prev.map((ex) => (ex.id === exercise.id ? { ...ex, setsData } : ex)));
  };

  const handleNotesChange = (exercise, notes) => {
    setWorkoutData((prev) => prev.map((ex) => (ex.id === exercise.id ? { ...ex, userNotes: notes } : ex)));
  };

  const buildWorkoutPayload = () => ({
    type: currentWorkout.type,
    name: currentWorkout.name,
    focus: currentWorkout.focus,
    date: new Date().toISOString(),
    exercises: workoutData.map((ex) => ({
      id: ex.id,
      name: ex.name,
      repScheme: ex.repScheme,
      sets: ex.setsData || [],
      notes: ex.userNotes || "",
    })),
  });

  const handleSaveDraft = () => {
    if (!currentWorkout) return;

    saveWorkoutDraft({
      workoutType: currentWorkout.type,
      programmeName: currentWorkout.name,
      focus: currentWorkout.focus,
      exercises: workoutData.map((ex) => ({
        id: ex.id,
        name: ex.name,
        repScheme: ex.repScheme,
        userNotes: ex.userNotes || "",
        setsData: ex.setsData || [],
      })),
    });

    setDraftSaved(true);
    setIsDirty(false);
    setFinishedSaved(false);

    toast.success("Workout saved as draft ✅", {
      description: "You can refresh without losing your entries.",
    });
  };

  const handleSaveAndFinishWorkout = () => {
    if (!currentWorkout) return;

    const workout = buildWorkoutPayload();
    saveWorkout(workout);

    clearWorkoutDraft();
    advanceWorkoutPatternIndex();

    setFinishedSaved(true);
    setIsDirty(false);
    setDraftSaved(false);

    toast.success("Workout saved! Great job! 💪", {
      description: `${currentWorkout.name} completed`,
    });

    onSaved?.();
    loadRef.current?.();
  };

  // ✅ manual switch (does NOT advance pattern)
  const handleManualSwitchWorkout = (nextType) => {
    if (!nextType) return;

    if (isDirty) {
      const ok = window.confirm(
        "You have unsaved changes.\n\nSwitching will keep them as a draft, but you may want to press Save Draft first.\n\nSwitch anyway?"
      );
      if (!ok) return;
    }

    const usableProgrammes = getUsableProgrammes();
    const picked =
      usableProgrammes.find(
        (p) => String(p.type).toUpperCase() === String(nextType).toUpperCase()
      ) || null;

    if (!picked) {
      toast.error("That workout type isn't available yet.");
      return;
    }

    // ✅ lock “today’s” workout to the chosen type via the draft
    setDraftWorkoutType(picked.type);

    loadRef.current?.();

    toast.message("Switched workout", {
      description: `Now showing: ${picked.name}`,
    });
  };

  // ✅ return to the pattern’s next workout (also does NOT advance)
  const handleReturnToSequence = () => {
    const next = peekNextWorkoutTypeFromPattern();
    if (!next) {
      toast.error("No next workout found in your pattern.");
      return;
    }
    handleManualSwitchWorkout(next);
  };

  const getStreak = () => {
    const workouts = getWorkouts();
    if (workouts.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < workouts.length; i++) {
      const workoutDate = new Date(workouts[i].date);
      workoutDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today - workoutDate) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1 + i) streak++;
      else break;
    }
    return streak;
  };

  const getDaysSinceLastWorkout = () => {
    const workouts = getWorkouts();
    if (workouts.length === 0) return null;

    const lastWorkout = new Date(workouts[0].date);
    const today = new Date();
    return Math.floor((today - lastWorkout) / (1000 * 60 * 60 * 24));
  };

  const streak = getStreak();
  const daysSince = getDaysSinceLastWorkout();

  if (!currentWorkout) return null;

  const nextInSequence = peekNextWorkoutTypeFromPattern();

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary">Gym Strength Programme</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleWeightUnit} className="font-semibold">
              {weightUnit}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Streak</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{streak} days</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Last Trained</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {daysSince === null ? "Never" : daysSince === 0 ? "Today" : `${daysSince}d ago`}
              </div>
            </div>
          </div>

          {/* Workout Info */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-foreground mb-1 truncate">
                  {currentWorkout.name}
                </h2>
                <Badge className="bg-primary/20 text-primary border-primary/50">
                  {currentWorkout.focus}
                </Badge>

                {/* ✅ Manual switcher */}
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Next in sequence:{" "}
                    <span className="font-semibold text-foreground">
                      {nextInSequence ? String(nextInSequence) : "—"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="relative">
                        <select
                          value={manualWorkoutType || ""}
                          onChange={(e) => setManualWorkoutType(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground appearance-none pr-10"
                        >
                          {getUsableProgrammes().map((p) => (
                            <option key={p.type} value={p.type}>
                              {p.name} ({p.type})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManualSwitchWorkout(manualWorkoutType)}
                      disabled={!manualWorkoutType || manualWorkoutType === currentWorkout.type}
                      className="shrink-0"
                    >
                      Switch
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReturnToSequence}
                      disabled={!nextInSequence || String(nextInSequence).toUpperCase() === String(currentWorkout.type).toUpperCase()}
                      className="shrink-0"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={() => loadRef.current?.()}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {workoutData.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            lastWorkoutData={exercise.lastWorkoutData}
            onSetComplete={handleSetComplete}
            onWeightChange={handleWeightChange}
            onNotesChange={handleNotesChange}
            onRestTimer={(duration) => setRestTimer(duration)}
            isFirst={index === 0}
          />
        ))}
      </div>

      {/* Floating Save Buttons */}
      <WorkoutActionBar
        isDirty={isDirty}
        isDraftSaved={draftSaved}
        isFinishedSaved={finishedSaved}
        onSaveDraft={handleSaveDraft}
        onSaveFinish={handleSaveAndFinishWorkout}
        disableFinish={!currentWorkout}
      />

      {/* Rest Timer */}
      {restTimer && (
        <RestTimer
          duration={restTimer}
          onComplete={() => {
            setRestTimer(null);
            toast.success("Rest period complete! Ready for next set!");
          }}
          onClose={() => setRestTimer(null)}
        />
      )}

      {/* PR Celebration */}
      {prCelebration && (
        <PRCelebration {...prCelebration} onClose={() => setPrCelebration(null)} />
      )}
    </div>
  );
};

export default HomePage;