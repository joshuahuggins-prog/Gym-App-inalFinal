import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Save, Calendar } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import ExerciseCard from "../components/ExerciseCard";
import RestTimer from "../components/RestTimer";
import PRCelebration from "../components/PRCelebration";

import {
  getWorkouts,
  updateWorkout,
  getProgressionSettings,
  updatePersonalRecord,
  getPersonalRecords,
} from "../utils/storage";

import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";

const EditWorkoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { weightUnit } = useSettings();

  const [originalWorkout, setOriginalWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState([]);
  const [restTimer, setRestTimer] = useState(null);
  const [prCelebration, setPrCelebration] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const didHydrateRef = useRef(false);

  // -----------------------------
  // Load workout by ID
  // -----------------------------
  useEffect(() => {
    const workouts = getWorkouts();
    const found = workouts.find((w) => w.id === id);

    if (!found) {
      toast.error("Workout not found");
      navigate("/history");
      return;
    }

    setOriginalWorkout(found);

    setWorkoutData(
      found.exercises.map((ex) => ({
        ...ex,
        userNotes: ex.notes || "",
        setsData: ex.sets || [],
        lastWorkoutData: null,
      }))
    );
  }, [id, navigate]);

  // Track dirty state
  useEffect(() => {
    if (!originalWorkout) return;

    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    setIsDirty(true);
  }, [workoutData, originalWorkout]);

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleSetComplete = (exercise, set) => {
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
    setWorkoutData((prev) =>
      prev.map((ex) => (ex.id === exercise.id ? { ...ex, setsData } : ex))
    );
  };

  const handleNotesChange = (exercise, notes) => {
    setWorkoutData((prev) =>
      prev.map((ex) => (ex.id === exercise.id ? { ...ex, userNotes: notes } : ex))
    );
  };

  const handleSaveAndClose = () => {
    if (!originalWorkout) return;

    updateWorkout(originalWorkout.id, {
      exercises: workoutData.map((ex) => ({
        id: ex.id,
        name: ex.name,
        repScheme: ex.repScheme,
        sets: ex.setsData || [],
        notes: ex.userNotes || "",
      })),
    });

    toast.success("Workout updated");
    navigate("/history");
  };

  const handleCancel = () => {
    if (isDirty) {
      const ok = window.confirm("Discard changes?");
      if (!ok) return;
    }
    navigate("/history");
  };

  if (!originalWorkout) return null;

  return (
    <div className="min-h-screen bg-[#121212] pb-28">
      {/* Header */}
      <div className="bg-[#1b1b1b] border-b border-yellow-500/30">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-yellow-400">
                Edit Workout {originalWorkout.type}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="w-4 h-4" />
                {new Date(originalWorkout.date).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-muted-foreground hover:bg-muted/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/40">
            Editing past workout
          </Badge>
        </div>
      </div>

      {/* Exercises */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {workoutData.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            lastWorkoutData={null}
            onSetComplete={handleSetComplete}
            onWeightChange={handleWeightChange}
            onNotesChange={handleNotesChange}
            onRestTimer={(duration) => setRestTimer(duration)}
            isFirst={index === 0}
          />
        ))}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-[#1b1b1b] border-t border-yellow-500/30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
          >
            Cancel
          </Button>

          <Button
            className="flex-1 bg-yellow-400 text-black hover:bg-yellow-300"
            onClick={handleSaveAndClose}
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

      {/* PR Celebration */}
      {prCelebration && (
        <PRCelebration {...prCelebration} onClose={() => setPrCelebration(null)} />
      )}
    </div>
  );
};

export default EditWorkoutPage;