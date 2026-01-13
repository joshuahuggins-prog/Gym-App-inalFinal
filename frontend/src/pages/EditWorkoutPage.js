// src/pages/EditWorkoutPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Save, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import ExerciseCard from "../components/ExerciseCard";
import { toast } from "sonner";

import { getWorkouts, updateWorkout, getProgrammes, getExercises } from "../utils/storage";
import {
  buildWorkoutExerciseRows,
  serializeWorkoutExercisesFromRows,
} from "../utils/workoutBuilder";

const formatDateLong = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const EditWorkoutPage = ({ workoutId, onClose }) => {
  const [originalWorkout, setOriginalWorkout] = useState(null);
  const [rows, setRows] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const didHydrateRef = useRef(false);

  useEffect(() => {
    didHydrateRef.current = false;
    setIsDirty(false);

    const all = getWorkouts();
    const w = all.find((x) => x.id === workoutId) || null;
    setOriginalWorkout(w);

    if (!w) {
      toast.error("Workout not found");
      return;
    }

    const programmes = getProgrammes() || [];
    const programme =
      programmes.find(
        (p) => String(p?.type || "").toUpperCase() === String(w?.type || "").toUpperCase()
      ) || null;

    const catalogue = getExercises() || [];

    const built = buildWorkoutExerciseRows({
      workout: w,
      programme,
      catalogueExercises: catalogue,
    });

    setRows(built);
  }, [workoutId]);

  useEffect(() => {
    if (!originalWorkout) return;
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    setIsDirty(true);
  }, [rows, originalWorkout]);

  const headerTitle = useMemo(() => {
    if (!originalWorkout) return "Edit Workout";
    const type = String(originalWorkout.type || "").toUpperCase();
    const date = formatDateLong(originalWorkout.date);
    return `Edit Workout ${type}${date ? ` — ${date}` : ""}`;
  }, [originalWorkout]);

  const handleWeightChange = (exercise, setsData) => {
    setRows((prev) => prev.map((ex) => (ex.id === exercise.id ? { ...ex, setsData } : ex)));
  };

  const handleNotesChange = (exercise, notes) => {
    setRows((prev) => prev.map((ex) => (ex.id === exercise.id ? { ...ex, userNotes: notes } : ex)));
  };

  const handleSave = () => {
    if (!originalWorkout) return;

    const nextExercises = serializeWorkoutExercisesFromRows(rows);

    const ok = updateWorkout(originalWorkout.id, {
      exercises: nextExercises,
    });

    if (!ok) {
      toast.error("Failed to save changes");
      return;
    }

    toast.success("Workout updated ✅", { description: "Your history has been updated." });
    setIsDirty(false);
    onClose?.();
  };

  const handleCancel = () => {
    if (isDirty) {
      const sure = window.confirm("Discard your changes?");
      if (!sure) return;
    }
    onClose?.();
  };

  if (!originalWorkout) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              Loading workout…
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-zinc-400">Editing</div>
              <h1 className="text-lg font-bold text-yellow-300 truncate">{headerTitle}</h1>
              <div className="text-xs text-zinc-400 mt-1">
                Edit sets / reps / weight, then save.
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-900"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              className="flex-1 bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              disabled={!isDirty}
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Close
            </Button>

            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-zinc-700 text-zinc-200 hover:bg-zinc-900"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {rows.map((exercise, idx) => (
          <div
            key={exercise.id || `${exercise.name}-${idx}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/30"
          >
            <ExerciseCard
              exercise={exercise}
              lastWorkoutData={exercise.lastWorkoutData}
              onSetComplete={() => {}}
              onWeightChange={handleWeightChange}
              onNotesChange={handleNotesChange}
              // ✅ IMPORTANT: no onRestTimer in edit mode
              isFirst={idx === 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditWorkoutPage;