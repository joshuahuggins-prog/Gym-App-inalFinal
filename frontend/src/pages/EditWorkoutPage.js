// src/pages/EditWorkoutPage.js
import React, { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getWorkouts, updateWorkout } from "../utils/storage";
import { toast } from "sonner";

const EditWorkoutPage = ({ workoutId, onClose }) => {
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);

  /* -----------------------------
     Load workout
  ----------------------------- */
  useEffect(() => {
    console.log("[EditWorkoutPage] workoutId =", workoutId);

    if (!workoutId) {
      setLoading(false);
      return;
    }

    const all = getWorkouts();
    const found = all.find((w) => w.id === workoutId);

    if (!found) {
      console.error("[EditWorkoutPage] Workout not found");
    }

    setWorkout(found || null);
    setLoading(false);
  }, [workoutId]);

  /* -----------------------------
     Guards (NEVER return null)
  ----------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">
        Loading workout…
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white gap-4">
        <div className="text-xl font-bold">Workout not found</div>
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to History
        </Button>
      </div>
    );
  }

  /* -----------------------------
     Save
  ----------------------------- */

  const handleSave = () => {
    updateWorkout(workout.id, workout);
    toast.success("Workout updated");
    onClose();
  };

  /* -----------------------------
     UI
  ----------------------------- */

  return (
    <div className="min-h-screen bg-neutral-900 text-white pb-24">
      {/* Header */}
      <div className="border-b border-yellow-500/30 bg-neutral-950">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-yellow-400">
              Edit Workout {workout.type}
            </h1>
            <p className="text-xs text-neutral-400">
              {new Date(workout.date).toLocaleDateString()}
            </p>
          </div>

          <Badge className="bg-yellow-400 text-black">EDIT MODE</Badge>
        </div>
      </div>

      {/* Body (placeholder – will mirror HomePage later) */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {workout.exercises.map((ex, i) => (
          <div
            key={i}
            className="bg-neutral-800 border border-neutral-700 rounded-lg p-4"
          >
            <div className="font-semibold mb-2">{ex.name}</div>

            {ex.sets.map((set, idx) => (
              <div
                key={idx}
                className="flex justify-between text-sm text-neutral-300"
              >
                <span>Set {idx + 1}</span>
                <span>
                  {set.weight} × {set.reps}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-950 border-t border-yellow-500/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
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
    </div>
  );
};

export default EditWorkoutPage;