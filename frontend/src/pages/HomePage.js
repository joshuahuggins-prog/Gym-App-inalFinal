// src/pages/HomePage.js
import React, { useEffect, useRef, useState } from "react";
import { Calendar, Flame, RotateCcw } from "lucide-react";
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

  useEffect(() => {
    loadTodaysWorkout();
    // eslint-disable-next-line
  }, []);

  // When workout type changes, treat next load as hydration (not user edits)
  useEffect(() => {
    didHydrateRef.current = false;
    setIsDirty(false);
    setDraftSaved(false);
    setFinishedSaved(false);
  }, [currentWorkout?.type]);

  // Mark dirty when user changes workoutData (not during initial load)
  useEffect(() => {
    if (!currentWorkout) return;

    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    setIsDirty(true);
    setDraftSaved(false);
    setFinishedSaved(false);
  }, [workoutData, currentWorkout]);

  // Auto-save workout draft as the user enters data (protects against refresh)
  useEffect(() => {
    if (!currentWorkout) return;

    const hasMeaningfulData = workoutData.some(
      (ex) =>
        (ex.userNotes && ex.userNotes.trim().length > 0) ||
        (Array.isArray(ex.setsData) &&
          ex.setsData.some(
            (set) => (set.weight ?? 0) !== 0 || (set.reps ?? 0) !== 0
          ))
    );

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);

    draftSaveTimerRef.current = setTimeout(() => {
      if (!hasMeaningfulData) {
        clearWorkoutDraft();
        setDraftSaved(false);
        setIsDirty(false);
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

      setDraftSaved(true);
      setIsDirty(false);
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

  const loadTodaysWorkout = () => {
    const workouts = getWorkouts();
    const programmes = getProgrammes();

    const draft = getWorkoutDraft();
    const hasTodaysDraft = isWorkoutDraftForToday(draft) && draft?.workoutType;

    const usableProgrammes = programmes.filter(
      (p) => Array.isArray(p.exercises) && p.exercises.length > 0
    );

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
      (w) => String(w.type).toUpperCase() === String(nextType).toUpperCase()
    );

    setCurrentWorkout(workout);

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

      return;
    }

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
  };

  const handleSetComplete = (exercise, set, levelUp) => {
    const progressionSettings = getProgressionSettings();
    const exerciseSpecificIncrement = progressionSettings.exerciseSpecific[exercise.id];

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

    const prs = getPersonalRecords();
    const exerciseKey = exercise.id;
    const currentPR = prs[exerciseKey];

    if (!currentPR || (set.weight ?? 0) > (currentPR.weight ?? 0)) {
      const wasNew = updatePersonalRecord(exercise.name, set.weight, set.reps);
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
    const updated = workoutData.map((ex) =>
      ex.id === exercise.id ? { ...ex, setsData } : ex
    );
    setWorkoutData(updated);
  };

  const handleNotesChange = (exercise, notes) => {
    const updated = workoutData.map((ex) =>
      ex.id === exercise.id ? { ...ex, userNotes: notes } : ex
    );
    setWorkoutData(updated);
  };

  const buildWorkoutPayload = () => {
    return {
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
    };
  };

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

    toast.success("Workout saved! Great job! 💪", {
      description: `${currentWorkout.name} completed`,
    });

    onSaved?.();

    loadTodaysWorkout();
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

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary">
                Gym Strength Programme
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleWeightUnit}
              className="font-semibold"
            >
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

          {/* Rest Day Alert */}
          {daysSince !== null && daysSince >= 2 && (
            <div
              className={`p-4 rounded-lg border ${
                daysSince >= 4
                  ? "bg-destructive/10 border-destructive/50 text-destructive"
                  : "bg-primary/10 border-primary/50 text-primary"
              }`}
            >
              <div className="font-semibold">
                {daysSince >= 4 ? "⚠️ Time to get back!" : "💪 Rest day over soon"}
              </div>
              <div className="text-sm opacity-90 mt-1">
                {daysSince >= 4
                  ? `It's been ${daysSince} days. Let's crush this workout!`
                  : "Muscles recovered. Ready for the next session!"}
              </div>
            </div>
          )}

          {/* Workout Info */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                  {currentWorkout.name}
                </h2>
                <Badge className="bg-primary/20 text-primary border-primary/50">
                  {currentWorkout.focus}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={loadTodaysWorkout}>
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

      {/* Floating Save Buttons (bottom-right) */}
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