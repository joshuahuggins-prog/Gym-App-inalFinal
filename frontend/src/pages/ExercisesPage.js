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

// ✅ FIX THIS PATH TO MATCH YOUR FILE LOCATION EXACTLY (case-sensitive on GitHub Actions)
import ExerciseLibraryCard from "../components/ExerciseLibraryCard";
// If yours is in a subfolder, use one of these instead:
// import ExerciseLibraryCard from "../components/exercise/ExerciseLibraryCard";
// import ExerciseLibraryCard from "../components/workout/ExerciseLibraryCard";

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

const buildDefaultExerciseMap = () => {
  try {
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
  } catch {
    return new Map();
  }
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProgramme, setFilterProgramme] = useState("all");

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

  const videoLinks = useMemo(() => getVideoLinks() || {}, [exercises]);

  const isUserCreatedExercise = (exercise) => {
    const id = String(exercise?.id || "");
    return id.startsWith("exercise_");
  };

  const handleCreateExercise = () => {
    // if your card handles its own edit dialog, it will use these values
    const newEx = {
      id: `exercise_${Date.now()}`,
      name: "",
      sets: 3,
      repScheme: "RPT",
      goalReps: [8, 10, 12],
      restTime: 120,
      notes: "",
    };

    // save immediately or open edit UI—depends how your card is built.
    // Here: create + open edit via toast hint
    saveExercise(newEx);
    toast.success("Exercise created. Tap edit to fill details.");
    loadData();
  };

  const handleDeleteExercise = (exercise) => {
    const id = exercise?.id;
    const name = exercise?.name || "this exercise";

    const usedBy = programmeUsageMap.get(norm(id)) || [];
    const usedNames = usedBy.map((p) => p?.name || p?.type).filter(Boolean);

    const msg =
      usedNames.length > 0
        ? `Delete "${name}"?\n\nUsed in: ${usedNames.join(
            ", "
          )}.\n\nDeleting may break those programmes unless removed there too.`
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

  const handleResetExerciseToDefault = (exercise) => {
    const id = String(exercise?.id || "").trim();
    if (!id) return;
    if (isUserCreatedExercise(exercise)) return;

    const def = defaultExerciseMap.get(id);
    if (!def) {
      toast.error("No app default found for this exercise.");
      return;
    }

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
    if (defaults[id]) updateVideoLink(id, defaults[id]);

    toastAndReload(`Reset "${def.name || exercise.name}" to default`);
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

      {/* Cards */}
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
                  onDelete={() => handleDeleteExercise(exercise)}
                  onResetToDefault={() => handleResetExerciseToDefault(exercise)}
                  onOpenVideo={() => {
                    if (!videoUrl) {
                      toast.message("No video saved", {
                        description: "Add a video URL when editing the exercise.",
                      });
                      return;
                    }
                    window.open(videoUrl, "_blank");
                  }}
                  onChanged={() => loadData()}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}