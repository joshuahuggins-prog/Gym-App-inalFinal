import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Save,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import ExerciseCard from "../components/ExerciseCard";
import RestTimer from "../components/RestTimer";
import { toast } from "sonner";

import { getWorkouts, updateWorkout } from "../utils/storage";

/* ---------------------------------------
   Utilities
--------------------------------------- */

const deepClone = (x) => JSON.parse(JSON.stringify(x));

const isDifferent = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

/* ---------------------------------------
   Component
--------------------------------------- */

const EditWorkoutPage = ({ workoutId, onClose }) => {
  const [originalWorkout, setOriginalWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState([]);
  const [restTimer, setRestTimer] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const originalRef = useRef(null);
  const didHydrateRef = useRef(false);

  /* ---------------------------------------
     Load workout
  --------------------------------------- */

  useEffect(() => {
    const workout = getWorkouts().find((w) => w.id === workoutId);

    if (!workout) {
      toast.error("Workout not found");
      onClose?.();
      return;
    }

    const hydrated = workout.exercises.map((ex) => ({
      ...ex,
      setsData: deepClone(ex.sets || []),
      userNotes: ex.notes || "",
      lastWorkoutData: null,
    }));

    setOriginalWorkout(workout);
    setWorkoutData(hydrated);
    originalRef.current = deepClone(hydrated);
  }, [workoutId, onClose]);

  /* ---------------------------------------
     Dirty tracking
  --------------------------------------- */

  useEffect(() => {
    if (!originalWorkout) return;

    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    setIsDirty(isDifferent(workoutData, originalRef.current));
  }, [workoutData, originalWorkout]);

  /* ---------------------------------------
     Warn before unload
  --------------------------------------- */

  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /* ---------------------------------------
     Handlers
  --------------------------------------- */

  const handleWeightChange = (exercise, setsData) => {
    setWorkoutData((prev) =>
      prev.map((ex) =>
        ex.id === exercise.id ? { ...ex, setsData } : ex
      )
    );
  };

  const handleNotesChange = (exercise, notes) => {
    setWorkoutData((prev) =>
      prev.map((ex) =>
        ex.id === exercise.id ? { ...ex, userNotes: notes } : ex
      )
    );
  };

  const handleDeleteSet = (exerciseId, index) => {
    setWorkoutData((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const next = [...(ex.setsData || [])];
        next.splice(index, 1);
        return { ...ex, setsData: next };
      })
    );
  };

  const resetExercise = (exerciseId) => {
    const original = originalRef.current.find((e) => e.id === exerciseId);
    if (!original) return;

    setWorkoutData((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId ? deepClone(original) : ex
      )
    );

    toast.message("Exercise reset");
  };

  const resetAll = () => {
    if (!window.confirm("Reset ALL changes?")) return;
    setWorkoutData(deepClone(originalRef.current));
    toast.message("Workout reset");
  };

  const handleSave = () => {
    const payload = {
      ...originalWorkout,
      exercises: workoutData.map((ex) => ({
        id: ex.id,
        name: ex.name,
        repScheme: ex.repScheme,
        sets: ex.setsData || [],
        notes: ex.userNotes || "",
      })),
    };

    updateWorkout(originalWorkout.id, payload);
    toast.success("Workout updated");
    onClose?.();
  };

  const handleCancel = () => {
    if (isDirty) {
      const ok = window.confirm("Discard changes?");
      if (!ok) return;
    }
    onClose?.();
  };

  if (!originalWorkout) return null;

  /* ---------------------------------------
     Render
  --------------------------------------- */

  return (
    <div className="min-h-screen bg-zinc-900 pb-28">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-yellow-500/30">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-yellow-400">
                Edit Workout {originalWorkout.type}
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date(originalWorkout.date).toLocaleDateString()}
              </p>
            </div>

            <Badge className="bg-yellow-400/20 text-yellow-300 border-yellow-400/50">
              EDIT MODE
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            className="border-yellow-500/50 text-yellow-300"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
        </div>
      </div>

      {/* Exercises */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {workoutData.map((exercise, index) => {
          const original = originalRef.current.find(
            (e) => e.id === exercise.id
          );
          const changed = isDifferent(exercise, original);

          return (
            <div
              key={exercise.id}
              className={`rounded-xl ${
                changed
                  ? "ring-2 ring-yellow-400/50"
                  : ""
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-yellow-300 font-semibold">
                  {exercise.name}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resetExercise(exercise.id)}
                  className="text-yellow-300"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              <ExerciseCard
                exercise={exercise}
                lastWorkoutData={null}
                isFirst={index === 0}
                disablePRs
                disableProgression
                onWeightChange={handleWeightChange}
                onNotesChange={handleNotesChange}
                onRestTimer={(d) => setRestTimer(d)}
                renderSetActions={(setIndex) => (
                  <button
                    onClick={() =>
                      handleDeleteSet(exercise.id, setIndex)
                    }
                    className="text-destructive hover:scale-110"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-yellow-500/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-yellow-500/50 text-yellow-300"
            onClick={handleCancel}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <Button
            className="flex-1 bg-yellow-400 text-black hover:bg-yellow-300"
            onClick={handleSave}
            disabled={!isDirty}
          >
            <Save className="w-4 h-4 mr-2" />
            Save & Close
          </Button>
        </div>
      </div>

      {/* Rest Timer */}
      {restTimer && (
        <RestTimer
          duration={restTimer}
          onComplete={() => setRestTimer(null)}
          onClose={() => setRestTimer(null)}
        />
      )}
    </div>
  );
};

export default EditWorkoutPage;