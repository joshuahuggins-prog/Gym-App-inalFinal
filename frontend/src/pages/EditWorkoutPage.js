// src/pages/EditWorkoutPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Save, AlertTriangle, Plus } from "lucide-react";
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

  // Add exercise UI (same idea as HomePage)
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

  const headerTitle = useMemo(() => {
    if (!originalWorkout) return "Edit Workout";
    const type = String(originalWorkout.type || "").toUpperCase();
    const date = formatDateLong(originalWorkout.date);
    return `Edit Workout ${type}${date ? ` — ${date}` : ""}`;
  }, [originalWorkout]);

  const handleWeightChange = (exercise, setsData) => {
    setRows((prev) =>
      prev.map((ex) => (ex.id === exercise.id ? { ...ex, setsData } : ex))
    );
  };

  const handleNotesChange = (exercise, notes) => {
    setRows((prev) =>
      prev.map((ex) => (ex.id === exercise.id ? { ...ex, userNotes: notes } : ex))
    );
  };

  // ✅ NEW: Add an extra set to an exercise row while editing history
  const handleAddSetToExercise = (exercise) => {
    if (!exercise?.id) return;

    setRows((prev) =>
      prev.map((ex) => {
        if (ex.id !== exercise.id) return ex;

        const currentSetsData = Array.isArray(ex.setsData) ? ex.setsData : [];

        // If setsData already exists, add onto it.
        // If not, create baseline from ex.sets (or fallback 3) then add.
        const baseCount =
          currentSetsData.length > 0
            ? currentSetsData.length
            : clampInt(Number(ex.sets ?? 3), 1, 12);

        const base =
          currentSetsData.length > 0
            ? currentSetsData
            : buildExerciseDefaultSetsData(baseCount);

        // cap
        if (base.length >= 20) {
          toast.message("Max sets reached", {
            description: "You can add up to 20 sets per exercise.",
          });
          return ex;
        }

        const nextSetsData = [...base, makeEmptySet()];
        return {
          ...ex,
          sets: nextSetsData.length, // keep the displayed count in sync
          setsData: nextSetsData,
        };
      })
    );

    toast.success("Set added", {
      description: `Added an extra set to ${exercise.name || exercise.id}`,
      duration: 1600,
    });
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

    toast.success("Workout updated ✅", {
      description: "Your history has been updated.",
    });
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

  // Library list (for add dialog)
  const allLibraryExercises = useMemo(() => {
    const list = getExercises() || [];
    return list
      .slice()
      .sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      );
  }, [showAddDialog]);

  const addCandidates = useMemo(() => {
    const q = norm(addSearch);

    // prevent adding duplicates already in this workout
    const existing = new Set((rows || []).map((r) => norm(r?.id || r?.name)));

    return allLibraryExercises
      .filter((ex) => {
        if (!ex) return false;

        const idKey = norm(ex.id);
        const nameKey = norm(ex.name || ex.id);

        if (existing.has(idKey) || existing.has(nameKey)) return false;
        if (!q) return true;

        return norm(ex.name).includes(q) || norm(ex.id).includes(q);
      })
      .slice(0, 50);
  }, [allLibraryExercises, addSearch, rows]);

  const handleAddExerciseToWorkout = (ex) => {
    if (!ex?.id) return;

    const setsCount = clampInt(Number(ex.sets ?? 3), 1, 12);

    const newRow = {
      id: ex.id,
      name: ex.name || ex.id,
      repScheme: ex.repScheme || "RPT",
      goalReps: Array.isArray(ex.goalReps) ? ex.goalReps : undefined,
      sets: setsCount,
      restTime: ex.restTime ?? 120,
      notes: ex.notes ?? "",

      userNotes: "",
      setsData: buildExerciseDefaultSetsData(setsCount),
      lastWorkoutData: null,
    };

    setRows((prev) => [...prev, newRow]);
    setShowAddDialog(false);
    setAddSearch("");

    toast.success("Exercise added", {
      description: `${newRow.name} added to this workout.`,
      duration: 1800,
    });
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
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">Editing</div>
              <h1 className="text-lg font-bold text-gold truncate">
                {headerTitle}
              </h1>
              <div className="text-xs text-muted-foreground mt-1">
                Edit sets / reps / weight, then save.
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {/* Add exercise */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="border-border hover:bg-muted/50"
                title="Add exercise"
              >
                <Plus className="w-4 h-4" />
              </Button>

              {/* Close */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="border-border hover:bg-muted/50"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!isDirty}
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Close
            </Button>

            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-border hover:bg-muted/50"
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
            className="rounded-2xl border border-border bg-card/40"
          >
            <ExerciseCard
              exercise={exercise}
              lastWorkoutData={exercise.lastWorkoutData}
              onSetComplete={() => {}}
              onWeightChange={handleWeightChange}
              onNotesChange={handleNotesChange}
              onAddSet={handleAddSetToExercise} // ✅ NEW: makes + Set work
              // no onRestTimer in edit mode
              isFirst={idx === 0}
            />
          </div>
        ))}
      </div>

      {/* Add Exercise Dialog */}
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

            <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
              {addCandidates.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  No matches (or already in this workout).
                </div>
              ) : (
                addCandidates.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleAddExerciseToWorkout(ex)}
                    className="w-full text-left rounded-lg border border-border bg-card hover:bg-muted/40 transition p-3"
                  >
                    <div className="font-semibold text-foreground">{ex.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ex.sets ?? 3} sets • {ex.repScheme || "RPT"}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              This only edits this saved workout entry (history). It won’t change
              your programme template.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditWorkoutPage;