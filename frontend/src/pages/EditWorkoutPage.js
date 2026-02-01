import React, { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../components/AppHeader";
import { X, Save, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import ExerciseCard from "../components/ExerciseCard";
import { toast } from "sonner";

import {
  getWorkouts,
  updateWorkout,
  getProgrammes,
  getExercises,
} from "../utils/storage";
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

const norm = (s) => String(s || "").trim().toLowerCase();
const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.trunc(n)));

const buildExerciseDefaultSetsData = (setsCount) =>
  Array.from({ length: setsCount }, () => ({
    weight: "",
    reps: "",
    completed: false,
  }));

const makeEmptySet = () => ({ weight: "", reps: "", completed: false });

const EditWorkoutPage = ({ workoutId, onClose }) => {
  const [originalWorkout, setOriginalWorkout] = useState(null);
  const [rows, setRows] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const didHydrateRef = useRef(false);

  // Add exercise UI
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addSearch, setAddSearch] = useState("");

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
        (p) =>
          String(p?.type || "").toUpperCase() ===
          String(w?.type || "").toUpperCase()
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

  const subtitle = useMemo(() => {
    if (!originalWorkout) return "Edit saved workout";
    const type = String(originalWorkout.type || "").toUpperCase();
    const date = formatDateLong(originalWorkout.date);
    return `${type}${date ? ` — ${date}` : ""}`;
  }, [originalWorkout]);

  const handleWeightChange = (exercise, setsData) => {
    setRows((prev) =>
      prev.map((ex) => (ex.id === exercise.id ? { ...ex, setsData } : ex))
    );
  };

  const handleNotesChange = (exercise, notes) => {
    setRows((prev) =>
      prev.map((ex) =>
        ex.id === exercise.id ? { ...ex, userNotes: notes } : ex
      )
    );
  };

  const handleAddSetToExercise = (exercise) => {
    if (!exercise?.id) return;

    setRows((prev) =>
      prev.map((ex) => {
        if (ex.id !== exercise.id) return ex;

        const currentSetsData = Array.isArray(ex.setsData) ? ex.setsData : [];
        const baseCount =
          currentSetsData.length > 0
            ? currentSetsData.length
            : clampInt(Number(ex.sets ?? 3), 1, 12);

        const base =
          currentSetsData.length > 0
            ? currentSetsData
            : buildExerciseDefaultSetsData(baseCount);

        if (base.length >= 20) {
          toast.message("Max sets reached", {
            description: "You can add up to 20 sets per exercise.",
          });
          return ex;
        }

        const nextSetsData = [...base, makeEmptySet()];
        return {
          ...ex,
          sets: nextSetsData.length,
          setsData: nextSetsData,
        };
      })
    );

    toast.success("Set added", {
      description: `Added an extra set to ${exercise.name || exercise.id}`,
      duration: 1600,
    });
  };

  const handleRemoveExerciseFromWorkout = (exercise) => {
    if (!exercise) return;

    const label = exercise.name || exercise.id || "this exercise";
    const sure = window.confirm(
      `Remove "${label}" from this workout entry?\n\nThis only affects this saved history item.`
    );
    if (!sure) return;

    setRows((prev) =>
      (prev || []).filter((r) => r !== exercise && r.id !== exercise.id)
    );

    toast.success("Exercise removed", {
      description: `"${label}" removed from this workout.`,
      duration: 1800,
    });
  };

  const handleSave = () => {
    if (!originalWorkout) return;

    if (!rows || rows.length === 0) {
      toast.error("Workout needs at least 1 exercise");
      return;
    }

    const nextExercises = serializeWorkoutExercisesFromRows(rows);

    const ok = updateWorkout(originalWorkout.id, {
      exercises: nextExercises,
    });

    if (!ok) {
      toast.error("Failed to save changes");
      return;
    }

    toast.success("Workout updated ✅");
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
    <AppHeader
      title="Edit Workout"
      subtitle={subtitle}
      rightIconSrc={`${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            title="Add exercise"
          >
            <Plus className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="text-sm text-muted-foreground">
              No exercises left in this workout entry.
            </div>
          </div>
        ) : (
          rows.map((exercise, idx) => (
            <div
              key={exercise.id || `${exercise.name}-${idx}`}
              className="rounded-2xl border border-border bg-card/40 relative"
            >
              <button
                type="button"
                onClick={() => handleRemoveExerciseFromWorkout(exercise)}
                className="absolute top-3 right-3 z-10 rounded-lg border border-border bg-background/80 px-2 py-2 hover:bg-muted/60"
                title="Remove exercise"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <ExerciseCard
                exercise={exercise}
                lastWorkoutData={exercise.lastWorkoutData}
                onSetComplete={() => {}}
                onWeightChange={handleWeightChange}
                onNotesChange={handleNotesChange}
                onAddSet={handleAddSetToExercise}
                isFirst={idx === 0}
              />
            </div>
          ))
        )}
      </div>

      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setAddSearch("");
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Exercise to this workout</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Search exercise library..."
            />
          </div>
        </DialogContent>
      </Dialog>
    </AppHeader>
  );
};

export default EditWorkoutPage;