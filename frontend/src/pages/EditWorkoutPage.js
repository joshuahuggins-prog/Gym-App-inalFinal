// src/pages/EditWorkoutPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import ExerciseCard from "../components/ExerciseCard";
import RestTimer from "../components/RestTimer";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

import { useSettings } from "../contexts/SettingsContext";
import { getWorkouts, updateWorkout, getProgrammes, getExercises } from "../utils/storage";

const safeArr = (v) => (Array.isArray(v) ? v : []);
const norm = (s) => String(s || "").trim().toLowerCase();
const upper = (s) => String(s || "").trim().toUpperCase();

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

// Build setsData with template length, filling from saved sets by index
const buildSetsFromTemplate = (templateExercise, savedExercise) => {
  const templateSetsCount = Number(templateExercise?.sets ?? 0);
  const desiredCount = Number.isFinite(templateSetsCount) && templateSetsCount > 0 ? templateSetsCount : 3;

  const savedSets = safeArr(savedExercise?.sets);

  // Fill up to desiredCount from saved, otherwise empty rows
  const base = Array.from({ length: desiredCount }, (_, i) => {
    const s = savedSets[i];
    return {
      weight: s?.weight ?? 0,
      reps: s?.reps ?? 0,
      completed: !!s?.completed,
    };
  });

  // If saved workout has MORE sets than template, keep extras too
  if (savedSets.length > desiredCount) {
    const extras = savedSets.slice(desiredCount).map((s) => ({
      weight: s?.weight ?? 0,
      reps: s?.reps ?? 0,
      completed: !!s?.completed,
    }));
    return [...base, ...extras];
  }

  return base;
};

const pickTemplateExercisesForWorkout = (workout, programmes, catalogue) => {
  // Priority:
  // 1) Programme for workout.type (A/B) → defines which exercises & sets count
  // 2) If missing, fall back to catalogue lookup by id
  const type = upper(workout?.type);
  const programme = safeArr(programmes).find((p) => upper(p?.type) === type);

  if (programme && safeArr(programme.exercises).length > 0) {
    return safeArr(programme.exercises).map((ex) => {
      // If catalogue has an updated version, we still want the programme order,
      // but we can enrich details (notes/repScheme/etc) from catalogue.
      const cat = safeArr(catalogue).find((c) => norm(c?.id) === norm(ex?.id));
      return { ...ex, ...(cat || {}) };
    });
  }

  // Fallback: use workout.exercises order, with catalogue enrichment
  return safeArr(workout?.exercises).map((ex) => {
    const cat = safeArr(catalogue).find((c) => norm(c?.id) === norm(ex?.id));
    return { ...(cat || {}), ...ex };
  });
};

const EditWorkoutPage = ({ workoutId, onClose }) => {
  const { weightUnit } = useSettings();

  const [originalWorkout, setOriginalWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState([]); // HomePage-like (setsData + userNotes)
  const [restTimer, setRestTimer] = useState(null);

  const [isDirty, setIsDirty] = useState(false);
  const didHydrateRef = useRef(false);

  useEffect(() => {
    const all = getWorkouts();
    const w = all.find((x) => String(x?.id) === String(workoutId));

    if (!w) {
      setOriginalWorkout(null);
      setWorkoutData([]);
      return;
    }

    const programmes = getProgrammes() || [];
    const catalogue = getExercises() || [];

    // Template list defines which exercises appear + how many sets to render
    const templateExercises = pickTemplateExercisesForWorkout(w, programmes, catalogue);

    // Saved data map by id for quick fill
    const savedById = new Map(safeArr(w.exercises).map((ex) => [norm(ex?.id), ex]));

    const merged = templateExercises.map((tpl) => {
      const saved = savedById.get(norm(tpl?.id));

      return {
        id: tpl.id,
        name: tpl.name,
        repScheme: tpl.repScheme ?? saved?.repScheme,
        // ✅ render template set count, fill saved values into boxes + ticks
        setsData: buildSetsFromTemplate(tpl, saved),
        userNotes: saved?.notes ?? "",
        lastWorkoutData: null,
        // Keep any template bits ExerciseCard may display
        goalReps: tpl.goalReps,
        restTime: tpl.restTime,
        notes: tpl.notes,
      };
    });

    // Also include any exercises that exist in the saved workout but are NOT in the current template
    // (so you can still edit legacy workouts fully)
    const templateIds = new Set(templateExercises.map((e) => norm(e?.id)));
    const legacyExtras = safeArr(w.exercises)
      .filter((ex) => ex?.id && !templateIds.has(norm(ex.id)))
      .map((ex) => {
        const cat = safeArr(catalogue).find((c) => norm(c?.id) === norm(ex?.id));
        const tpl = { ...(cat || {}), ...ex, sets: cat?.sets ?? ex?.sets?.length ?? 3 };

        return {
          id: ex.id,
          name: ex.name,
          repScheme: ex.repScheme,
          setsData: buildSetsFromTemplate(tpl, ex),
          userNotes: ex?.notes ?? "",
          lastWorkoutData: null,
          goalReps: tpl.goalReps,
          restTime: tpl.restTime,
          notes: tpl.notes,
        };
      });

    didHydrateRef.current = false;
    setIsDirty(false);
    setOriginalWorkout(w);
    setWorkoutData([...merged, ...legacyExtras]);
  }, [workoutId]);

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
    const type = originalWorkout?.type ? upper(originalWorkout.type) : "";
    const date = originalWorkout?.date ? formatDateLong(originalWorkout.date) : "";
    return `Edit Workout ${type}${date ? ` • ${date}` : ""}`;
  }, [originalWorkout]);

  const handleWeightChange = (exercise, setsData) => {
    setWorkoutData((prev) =>
      prev.map((ex) => (norm(ex.id) === norm(exercise.id) ? { ...ex, setsData } : ex))
    );
  };

  const handleNotesChange = (exercise, notes) => {
    setWorkoutData((prev) =>
      prev.map((ex) => (norm(ex.id) === norm(exercise.id) ? { ...ex, userNotes: notes } : ex))
    );
  };

  // ExerciseCard may call this; in edit mode we don’t need PR logic
  const handleSetComplete = () => {};

  const buildUpdatedWorkout = () => {
    if (!originalWorkout) return null;

    return {
      ...originalWorkout,
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

      {/* Rest Timer */}
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