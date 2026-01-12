// src/pages/EditWorkoutPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import ExerciseCard from "../components/ExerciseCard";
import RestTimer from "../components/RestTimer";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

import { useSettings } from "../contexts/SettingsContext";
import { getWorkouts, updateWorkout } from "../utils/storage";

const formatDateLong = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const safeArr = (v) => (Array.isArray(v) ? v : []);

const EditWorkoutPage = ({ workoutId, onClose }) => {
  const { weightUnit } = useSettings();

  const [originalWorkout, setOriginalWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState([]); // HomePage-like shape
  const [restTimer, setRestTimer] = useState(null);

  const [isDirty, setIsDirty] = useState(false);
  const didHydrateRef = useRef(false);

  // Load workout
  useEffect(() => {
    const all = getWorkouts();
    const w = all.find((x) => String(x?.id) === String(workoutId));

    if (!w) {
      setOriginalWorkout(null);
      setWorkoutData([]);
      return;
    }

    setOriginalWorkout(w);

    // Convert saved workout shape -> HomePage editing shape
    const mapped = safeArr(w.exercises).map((ex) => ({
      id: ex.id,
      name: ex.name,
      repScheme: ex.repScheme,
      // ExerciseCard in HomePage expects:
      setsData: safeArr(ex.sets).map((s) => ({
        weight: s?.weight ?? 0,
        reps: s?.reps ?? 0,
        completed: !!s?.completed,
        // keep any extra fields if you ever add them
        ...s,
      })),
      userNotes: ex?.notes ?? "",
      lastWorkoutData: null, // optional; not needed in edit mode
    }));

    didHydrateRef.current = false;
    setIsDirty(false);
    setWorkoutData(mapped);
  }, [workoutId]);

  // Mark dirty on edits (but not on first hydration)
  useEffect(() => {
    if (!originalWorkout) return;

    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    setIsDirty(true);
  }, [workoutData, originalWorkout]);

  const headerTitle = useMemo(() => {
    if (!originalWorkout) return "Edit Workout";
    const type = originalWorkout?.type ? String(originalWorkout.type).toUpperCase() : "";
    const date = originalWorkout?.date ? formatDateLong(originalWorkout.date) : "";
    return `Edit Workout ${type ? type : ""}${date ? ` • ${date}` : ""}`.trim();
  }, [originalWorkout]);

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

  // In edit mode we don’t need PR logic, but ExerciseCard may call this.
  const handleSetComplete = () => {};

  const buildUpdatedWorkout = () => {
    if (!originalWorkout) return null;

    return {
      ...originalWorkout,
      // keep same id & date
      exercises: workoutData.map((ex) => ({
        id: ex.id,
        name: ex.name,
        repScheme: ex.repScheme,
        sets: safeArr(ex.setsData).map((s) => ({
          weight: Number(s?.weight ?? 0),
          reps: Number(s?.reps ?? 0),
          completed: !!s?.completed,
        })),
        notes: ex.userNotes || "",
      })),
    };
  };

  const handleSaveAndClose = () => {
    if (!originalWorkout) {
      toast.error("Workout not found.");
      return;
    }

    const updated = buildUpdatedWorkout();
    if (!updated) return;

    const ok = updateWorkout(originalWorkout.id, updated);
    if (!ok) {
      toast.error("Failed to save changes.");
      return;
    }

    toast.success("Workout updated ✅");
    setIsDirty(false);
    onClose?.();
  };

  const handleCancel = () => {
    if (isDirty) {
      const leave = window.confirm("Discard your edits?");
      if (!leave) return;
    }
    onClose?.();
  };

  if (!workoutId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Missing workout id
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Close and try again from History.
          </div>
          <Button className="mt-4 w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (!originalWorkout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-5">
          <div className="text-foreground font-bold">Workout not found</div>
          <div className="text-sm text-muted-foreground mt-2">
            It may have been deleted.
          </div>
          <Button className="mt-4 w-full" onClick={onClose}>
            Back to History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#0f1115] text-foreground">
      {/* Header (dark grey + bright yellow theme) */}
      <div className="border-b border-border bg-[#12151b]">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-[#ffd84d] truncate">
                {headerTitle}
              </h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge className="bg-[#ffd84d]/15 text-[#ffd84d] border border-[#ffd84d]/30">
                  Edit mode
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  Unit: {weightUnit}
                </Badge>
                {isDirty ? (
                  <Badge className="bg-[#ffd84d]/15 text-[#ffd84d] border border-[#ffd84d]/30">
                    Unsaved changes
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Saved
                  </Badge>
                )}
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={handleCancel} title="Close">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveAndClose}
              className="flex-1 bg-[#ffd84d] text-black hover:bg-[#ffd84d]/90"
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Close
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-[#ffd84d]/30 text-[#ffd84d] hover:bg-[#ffd84d]/10"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Exercise cards (same component as Home) */}
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

      {/* Rest Timer (optional but keeps same UX) */}
      {restTimer && (
        <RestTimer
          duration={restTimer}
          onComplete={() => {
            setRestTimer(null);
            toast.success("Rest period complete!");
          }}
          onClose={() => setRestTimer(null)}
        />
      )}
    </div>
  );
};

export default EditWorkoutPage;