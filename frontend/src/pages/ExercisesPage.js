// src/pages/ExercisesPage.js
import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import { toast } from "sonner";

import ExerciseLibraryCard from "../components/ExerciseLibraryCard";

import {
  getExercises,
  saveExercise,
  deleteExercise,
  getProgrammes,
  getVideoLinks,
  updateVideoLink,
  getDefaultVideoLinks,
} from "../utils/storage";

const MAX_SETS = 8;
const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));
const norm = (s) => String(s || "").trim().toLowerCase();

/** Build defaults map from app code (workoutData) */
const buildDefaultExerciseMap = () => {
  try {
    // keep require() so CRA/CRACO doesn't try to hoist and break older builds
    // eslint-disable-next-line global-require
    const { WORKOUT_A, WORKOUT_B } = require("../data/workoutData");

    const all = [
      ...(WORKOUT_A?.exercises || []),
      ...(WORKOUT_B?.exercises || []),
    ];

    const map = new Map();

    all.forEach((ex) => {
      const id = String(ex?.id || "").trim();
      if (!id) return;

      map.set(id, {
        id,
        name: ex?.name || "",
        sets: ex?.sets ?? 3,
        repScheme: ex?.repScheme ?? "RPT",
        goalReps: Array.isArray(ex?.goalReps) ? ex.goalReps : [8, 10, 12],
        restTime: ex?.restTime ?? 120,
        notes: ex?.notes ?? "",
        ...ex,
      });
    });

    return map;
  } catch (e) {
    return new Map();
  }
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [programmes, setProgrammes] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterProgramme, setFilterProgramme] = useState("all");

  // dialog state (still handled by your card via callbacks)
  const [editingExercise, setEditingExercise] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // drafts to avoid stuck inputs
  const [setsDraft, setSetsDraft] = useState("");

  // defaults (for reset-to-default)
  const defaultExerciseMap = useMemo(() => buildDefaultExerciseMap(), []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setExercises(getExercises() || []);
    setProgrammes(getProgrammes() || []);
  };

  const toastAndReload = (message) => {
    toast.success(message);
    setTimeout(() => window.location.reload(), 650);
  };

  /** exerciseId -> programmes containing it */
  const programmeUsageMap = useMemo(() => {
    const map = new Map();

    (programmes || []).forEach((p) => {
      const list = Array.isArray(p?.exercises) ? p.exercises : [];
      list.forEach((ex) => {
        const id = norm(ex?.id);
        if (!id) return;
        if (!map.has(id)) map.set(id, []);
        map.get(id).push(p);
      });
    });

    return map;
  }, [programmes]);

  /** quick lookup for video urls */
  const videoLinks = useMemo(() => getVideoLinks() || {}, [exercises]);

  const isUserCreatedExercise = (exercise) => {
    const id = String(exercise?.id || "");
    return id.startsWith("exercise_");
  };

  const handleCreateExercise = () => {
    const sets = 3;
    const goalReps = [8, 10, 12];

    setEditingExercise({
      id: `exercise_${Date.now()}`,
      name: "",
      sets,
      repScheme: "RPT",
      goalReps,
      restTime: 120,
      notes: "",
      videoUrl: "",
    });

    setSetsDraft(String(sets));
    setShowEditDialog(true);
  };

  const handleEditExercise = (exercise) => {
    const videoUrl = (getVideoLinks() || {})[exercise.id] || "";

    const sets = Number.isFinite(Number(exercise.sets)) ? Number(exercise.sets) : 3;
    const safeSets = clampInt(sets, 1, MAX_SETS);

    let goalReps = Array.isArray(exercise.goalReps) ? [...exercise.goalReps] : [];
    if (goalReps.length === 0) goalReps = [8];

    if (goalReps.length < safeSets) {
      goalReps = [
        ...goalReps,
        ...Array.from({ length: safeSets - goalReps.length }, () => 8),
      ];
    } else if (goalReps.length > safeSets) {
      goalReps = goalReps.slice(0, safeSets);
    }

    setEditingExercise({ ...exercise, sets: safeSets, goalReps, videoUrl });
    setSetsDraft(String(safeSets));
    setShowEditDialog(true);
  };

  const setSetsAndSyncGoalReps = (nextSets) => {
    const sets = clampInt(nextSets, 1, MAX_SETS);

    const current = Array.isArray(editingExercise?.goalReps)
      ? [...editingExercise.goalReps]
      : [];

    let nextGoalReps = current;

    if (nextGoalReps.length < sets) {
      nextGoalReps = [
        ...nextGoalReps,
        ...Array.from({ length: sets - nextGoalReps.length }, () => 8),
      ];
    } else if (nextGoalReps.length > sets) {
      nextGoalReps = nextGoalReps.slice(0, sets);
    }

    setEditingExercise({ ...editingExercise, sets, goalReps: nextGoalReps });
  };

  const handleSaveExercise = () => {
    if (!editingExercise?.name || !editingExercise.name.trim()) {
      toast.error("Please enter exercise name");
      return;
    }

    const { videoUrl, ...exerciseData } = editingExercise;

    const setsNum = Number(exerciseData.sets);
    const sets = Number.isFinite(setsNum) ? clampInt(setsNum, 1, MAX_SETS) : 3;
    exerciseData.sets = sets;

    const rawGoalReps = Array.isArray(exerciseData.goalReps) ? exerciseData.goalReps : [];
    let cleaned = rawGoalReps.map((x) => {
      if (x === "" || x == null) return 8;
      const n = Number(x);
      if (!Number.isFinite(n) || n <= 0) return 8;
      return clampInt(n, 1, 200);
    });

    if (cleaned.length < sets) {
      cleaned = [...cleaned, ...Array.from({ length: sets - cleaned.length }, () => 8)];
    } else if (cleaned.length > sets) {
      cleaned = cleaned.slice(0, sets);
    }

    exerciseData.goalReps = cleaned.length > 0 ? cleaned : [8];

    const restNum = Number(exerciseData.restTime);
    exerciseData.restTime = Number.isFinite(restNum) && restNum > 0 ? restNum : 120;

    const ok = saveExercise(exerciseData);
    if (!ok) {
      toast.error("Failed to save exercise");
      return;
    }

    if (videoUrl && videoUrl.trim()) {
      updateVideoLink(exerciseData.id, videoUrl.trim());
    }

    loadData();
    setShowEditDialog(false);
    setEditingExercise(null);
    setSetsDraft("");
    toast.success("Exercise saved!");
  };

  const handleDeleteExercise = (exercise) => {
    const id = exercise?.id;
    const name = exercise?.name || "this exercise";

    const usedBy = programmeUsageMap.get(norm(id)) || [];
    const usedNames = usedBy.map((p) => p?.name || p?.type).filter(Boolean);

    const msg =
      usedNames.length > 0
        ? `Delete "${name}"?\n\nIt is currently used in: ${usedNames.join(
            ", "
          )}.\n\nDeleting may break those programmes unless you remove it from them too.`
        : `Delete "${name}"?`;

    if (!window.confirm(msg)) return;

    const ok = deleteExercise(id);
    if (!ok) {
      toast.error("Failed to delete exercise");
      return;
    }

    loadData();
    toast.success("Exercise deleted");
  };

  /** Reset one exercise back to app default (matching your original logic) */
  const handleResetExerciseToDefault = (exercise) => {
    const id = String(exercise?.id || "").trim();
    if (!id) return;

    if (isUserCreatedExercise(exercise)) return;

    const def = defaultExerciseMap.get(id);
    if (!def) {
      toast.error("No app default found for this exercise.");
      return;
    }

    try {
      const ok = saveExercise({
        id: def.id,
        name: def.name,
        sets: def.sets ?? 3,
        repScheme: def.repScheme ?? "RPT",
        goalReps: Array.isArray(def.goalReps) ? def.goalReps : [8, 10, 12],
        restTime: def.restTime ?? 120,
        notes: def.notes ?? "",
        hidden: typeof exercise?.hidden === "boolean" ? exercise.hidden : false,
        assignedTo: Array.isArray(exercise?.assignedTo) ? exercise.assignedTo : [],
      });

      if (!ok) {
        toast.error("Reset failed");
        return;
      }

      const defaults =
        (typeof getDefaultVideoLinks === "function" ? getDefaultVideoLinks() : {}) || {};
      if (defaults[id]) {
        updateVideoLink(id, defaults[id]);
      }

      toastAndReload(`Reset "${def.name || exercise.name}" to default`);
    } catch (e) {
      toast.error(e?.message || "Reset failed");
    }
  };

  const filteredExercises = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    let allowedIds = null;
    if (filterProgramme !== "all") {
      const prog = (programmes || []).find(
        (p) => String(p?.type) === String(filterProgramme)
      );

      const ids = new Set(
        (prog?.exercises || []).map((e) => norm(e?.id)).filter(Boolean)
      );
      allowedIds = ids;
    }

    return (exercises || []).filter((ex) => {
      const name = String(ex?.name || "");
      const matchesSearch = !search || name.toLowerCase().includes(search);

      const id = norm(ex?.id);
      const matchesProgramme = filterProgramme === "all" ? true : allowedIds?.has(id);

      return matchesSearch && matchesProgramme;
    });
  }, [exercises, programmes, searchTerm, filterProgramme]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-primary">Exercise Library</h1>
              <p className="text-sm text-muted-foreground">
                {exercises.length} total exercises
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tip: To add/remove exercises from workouts, edit the programme (not here).
              </p>
            </div>

            <Button onClick={handleCreateExercise}>
              <Plus className="w-4 h-4 mr-2" />
              New Exercise
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search exercises..."
                className="pl-10"
              />
            </div>

            <Select value={filterProgramme} onValueChange={setFilterProgramme}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by programme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programmes</SelectItem>
                {(programmes || []).map((prog) => (
                  <SelectItem key={prog.type} value={prog.type}>
                    {prog.name || prog.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredExercises.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">🏋️</div>
            <p className="text-lg text-muted-foreground mb-2">
              {searchTerm || filterProgramme !== "all"
                ? "No exercises found"
                : "No exercises yet"}
            </p>
            {!searchTerm && filterProgramme === "all" ? (
              <Button onClick={handleCreateExercise}>Create your first exercise</Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredExercises.map((exercise) => {
              const usedBy = programmeUsageMap.get(norm(exercise.id)) || [];
              const userMade = isUserCreatedExercise(exercise);
              const idTrim = String(exercise?.id || "").trim();
              const defaultExists = defaultExerciseMap.has(idTrim);
              const canReset = !userMade && defaultExists;

              const videoUrl = videoLinks?.[exercise.id] || "";

              return (
                <ExerciseLibraryCard
                  key={exercise.id}
                  exercise={exercise}
                  usedBy={usedBy}
                  userMade={userMade}
                  canReset={canReset}
                  defaultExists={defaultExists}
                  videoUrl={videoUrl}
                  onEdit={() => handleEditExercise(exercise)}
                  onDelete={() => handleDeleteExercise(exercise)}
                  onOpenVideo={(ex, url) => {
                    const u = url || videoUrl;
                    if (!u) {
                      toast.message("No video saved", {
                        description: "Add a video URL when editing the exercise.",
                      });
                      return;
                    }
                    window.open(u, "_blank");
                  }}
                  onResetToDefault={() => handleResetExerciseToDefault(exercise)}
                  // edit modal wiring (optional: if your card triggers it internally)
                  editingExercise={editingExercise}
                  showEditDialog={showEditDialog}
                  setShowEditDialog={setShowEditDialog}
                  setEditingExercise={setEditingExercise}
                  setsDraft={setsDraft}
                  setSetsDraft={setSetsDraft}
                  setSetsAndSyncGoalReps={setSetsAndSyncGoalReps}
                  onSaveExercise={handleSaveExercise}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* IMPORTANT:
          If your ExerciseLibraryCard DOES NOT render the edit dialog internally,
          then you should move the dialog back here. If it DOES render it,
          leave it inside the card or (better) make a separate ExerciseEditDialog component.
      */}
    </div>
  );
}