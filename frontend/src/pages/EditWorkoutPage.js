import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import ExerciseCard from "../components/ExerciseCard";
import RestTimer from "../components/RestTimer";
import { toast } from "sonner";

import {
  getWorkouts,
  updateWorkout,
} from "../utils/storage";

const EditWorkoutPage = ({ workoutId, onClose }) => {
  const [originalWorkout, setOriginalWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState([]);
  const [restTimer, setRestTimer] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const didHydrateRef = useRef(false);

  useEffect(() => {
    const workouts = getWorkouts();
    const workout = workouts.find((w) => w.id === workoutId);

    if (!workout) {
      toast.error("Workout not found");
      onClose?.();
      return;
    }

    setOriginalWorkout(workout);

    setWorkoutData(
      workout.exercises.map((ex) => ({
        ...ex,
        setsData: ex.sets || [],
        userNotes: ex.notes || "",
        lastWorkoutData: null, // not needed in edit mode
      }))
    );
  }, [workoutId, onClose]);

  // Track dirty state (ignore first hydration)
  useEffect(() => {
    if (!originalWorkout) return;

    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    setIsDirty(true);
  }, [workoutData, originalWorkout]);

  const handleWeightChange = (exercise, setsData) => {
    setWorkoutData((prev) =>
      prev.map((ex) => (ex.id === exercise.id ? { ...ex, setsData } : ex))
    );
  };

  const handleNotesChange = (exercise, notes) => {
    setWorkoutData((prev) =>
      prev.map((ex) => (ex.id === exercise.id ? { ...ex, userNotes: notes } : ex))
    );
  };

  const handleSave = () => {
    if (!originalWorkout) return;

    const updatedWorkout = {
      ...originalWorkout,
      exercises: workoutData.map((ex) => ({
        id: ex.id,
        name: ex.name,
        repScheme: ex.repScheme,
        sets: ex.setsData || [],
        notes: ex.userNotes || "",
      })),
    };

    updateWorkout(originalWorkout.id, updatedWorkout);

    toast.success("Workout updated ✏️");
    onClose?.();
  };

  const handleCancel = () => {
    if (isDirty) {
      const ok = window.confirm(
        "Discard changes? Your edits will be lost."
      );
      if (!ok) return;
    }
    onClose?.();
  };

  if (!originalWorkout) return null;

  return (
    <div className="min-h-screen bg-zinc-900 pb-28 text-foreground">
      {/* Header */}
      <div className="border-b border-yellow-500/30 bg-zinc-950">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-yellow-400">
                Edit Workout {originalWorkout.type}
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date(originalWorkout.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <Badge className="bg-yellow-400/20 text-yellow-300 border-yellow-400/50">
              EDIT MODE
            </Badge>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {workoutData.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            lastWorkoutData={null}
            onWeightChange={handleWeightChange}
            onNotesChange={handleNotesChange}
            onRestTimer={(d) => setRestTimer(d)}
            isFirst={index === 0}
            disablePRs
            disableProgression
          />
        ))}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-yellow-500/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10"
            onClick={handleCancel}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <Button
            className="flex-1 bg-yellow-400 text-black hover:bg-yellow-300"
            onClick={handleSave}
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
          onComplete={() => {
            setRestTimer(null);
            toast.success("Rest complete");
          }}
          onClose={() => setRestTimer(null)}
        />
      )}
    </div>
  );
};

export default EditWorkoutPage;