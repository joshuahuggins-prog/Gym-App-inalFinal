// src/pages/HistoryPage.js
import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Calendar, Pencil, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

import { getWorkouts, deleteWorkout, updateWorkout, getExercises } from "../utils/storage";
import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";

const ensureArray = (v) => (Array.isArray(v) ? v : []);
const norm = (s) => String(s || "").trim().toLowerCase();
const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.trunc(n)));

const buildExerciseDefaultSetsData = (setsCount) =>
  Array.from({ length: setsCount }, () => ({
    weight: "",
    reps: "",
    completed: false,
  }));

const fmtWorkoutLabel = (w) => {
  const name = w?.name || "Workout";
  const date = w?.date
    ? new Date(w.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "—";
  const focus = w?.focus || w?.type || "";
  return `${name} • ${date}${focus ? ` • ${focus}` : ""}`;
};

const HistoryPage = ({ onEditWorkout }) => {
  const { weightUnit } = useSettings();

  // ✅ Read workouts synchronously on first render to avoid "No workouts yet" flicker
  const [workouts, setWorkouts] = useState(() => ensureArray(getWorkouts()));
  const [expandedWorkouts, setExpandedWorkouts] = useState(new Set());

  // ✅ Add Exercise (global header button) state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [targetWorkoutId, setTargetWorkoutId] = useState("");
  const [addSearch, setAddSearch] = useState("");

  // Keep in sync on mount
  useEffect(() => {
    setWorkouts(ensureArray(getWorkouts()));
  }, []);

  const reload = () => setWorkouts(ensureArray(getWorkouts()));

  const handleDelete = (id) => {
    if (window.confirm("Delete this workout?")) {
      deleteWorkout(id);
      reload();
      toast.success("Workout deleted");
    }
  };

  const toggleExpand = (id) => {
    setExpandedWorkouts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const groupedWorkouts = useMemo(() => {
    const grouped = {};
    ensureArray(workouts).forEach((workout) => {
      const d = new Date(workout?.date);
      if (Number.isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(workout);
    });
    return grouped;
  }, [workouts]);

  const totalCount = ensureArray(workouts).length;

  // ---------------------------
  // Add exercise (library)
  // ---------------------------
  const allLibraryExercises = useMemo(() => {
    const list = getExercises() || [];
    return list
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [showAddDialog]);

  const addCandidates = useMemo(() => {
    if (!showAddDialog) return [];
    const q = norm(addSearch);

    return allLibraryExercises
      .filter((ex) => {
        if (!ex?.id) return false;
        if (!q) return true;
        return norm(ex.name).includes(q) || norm(ex.id).includes(q);
      })
      .slice(0, 50);
  }, [allLibraryExercises, addSearch, showAddDialog]);

  const handleAddExerciseToWorkout = (libEx) => {
    if (!targetWorkoutId) {
      toast.message("Pick a workout first", {
        description: "Choose which workout you want to add this exercise to.",
      });
      return;
    }
    if (!libEx?.id) return;

    const workout = ensureArray(workouts).find((w) => w?.id === targetWorkoutId);
    if (!workout) {
      toast.error("Workout not found");
      return;
    }

    const existingExercises = ensureArray(workout.exercises);

    // Prevent duplicate exercise id in the same saved workout
    if (existingExercises.some((e) => String(e?.id) === String(libEx.id))) {
      toast.message("Already added", {
        description: "That exercise is already in this workout.",
      });
      return;
    }

    const setsCount = clampInt(Number(libEx.sets ?? 3), 1, 12);

    // History workouts store sets as an array
    const newExercise = {
      id: libEx.id,
      name: libEx.name || libEx.id,
      repScheme: libEx.repScheme || "RPT",
      sets: buildExerciseDefaultSetsData(setsCount),
      notes: "",
    };

    const ok = updateWorkout(targetWorkoutId, {
      exercises: [...existingExercises, newExercise],
    });

    if (!ok) {
      toast.error("Couldn’t save update", {
        description: "Storage update failed. Try again.",
      });
      return;
    }

    toast.success("Exercise added", {
      description: `${newExercise.name} added to that workout`,
    });

    setShowAddDialog(false);
    setTargetWorkoutId("");
    setAddSearch("");
    reload();
  };

  const selectedWorkout = useMemo(
    () => ensureArray(workouts).find((w) => w?.id === targetWorkoutId) || null,
    [workouts, targetWorkoutId]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-primary">Workout History</h1>
              <p className="text-sm text-muted-foreground">
                {totalCount} total workouts logged
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                disabled={totalCount === 0}
                title={totalCount === 0 ? "Add a workout first" : "Add exercise to a workout"}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {totalCount === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💪</div>
            <p className="text-lg text-muted-foreground mb-2">No workouts yet</p>
          </div>
        ) : (
          Object.entries(groupedWorkouts).map(([monthKey, monthWorkouts]) => {
            const [year, month] = monthKey.split("-");
            const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString(
              "en-US",
              { month: "long", year: "numeric" }
            );

            return (
              <div key={monthKey} className="space-y-3">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {monthName}
                </h2>

                {ensureArray(monthWorkouts).map((workout) => {
                  const isExpanded = expandedWorkouts.has(workout?.id);
                  const exercises = ensureArray(workout?.exercises);

                  const completedSets = exercises.reduce((sum, ex) => {
                    const sets = ensureArray(ex?.sets);
                    return sum + sets.filter((s) => !!s?.completed).length;
                  }, 0);

                  const totalSets = exercises.reduce((sum, ex) => {
                    const sets = ensureArray(ex?.sets);
                    return sum + sets.length;
                  }, 0);

                  return (
                    <div
                      key={workout?.id}
                      className="bg-card border border-border rounded-xl overflow-hidden"
                    >
                      {/* Workout Header */}
                      <div
                        className="p-4 cursor-pointer select-none"
                        onClick={() => toggleExpand(workout.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-foreground mb-1">
                              {workout?.name || "Workout"}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>
                                {workout?.date
                                  ? new Date(workout.date).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "—"}
                              </span>
                              <span>•</span>
                              <span>
                                {completedSets}/{totalSets} sets
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* ✏️ Edit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditWorkout?.(workout.id);
                              }}
                              title="Edit workout"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {/* 🗑 Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(workout.id);
                              }}
                              className="text-destructive hover:bg-destructive/10"
                              title="Delete workout"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>

                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        <Badge className="bg-primary/20 text-primary border-primary/50">
                          {workout?.focus || workout?.type || "—"}
                        </Badge>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 animate-fadeIn">
                          {exercises.map((exercise, exIndex) => {
                            const sets = ensureArray(exercise?.sets);
                            return (
                              <div
                                key={`${exercise?.id || exercise?.name || exIndex}`}
                                className="bg-muted/30 rounded-lg p-3 border border-border"
                              >
                                <div className="font-semibold text-foreground mb-2">
                                  {exercise?.name || "Exercise"}
                                </div>

                                <div className="space-y-2">
                                  {sets.map((set, setIndex) => (
                                    <div key={setIndex} className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">
                                        Set {setIndex + 1}
                                      </span>
                                      <span className="font-semibold text-foreground">
                                        {Number(set?.weight ?? 0)} {weightUnit} ×{" "}
                                        {Number(set?.reps ?? 0)}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {exercise?.notes ? (
                                  <div className="mt-2 text-xs text-muted-foreground p-2 bg-card rounded border border-border">
                                    {exercise.notes}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* ✅ Add Exercise Dialog (header button) */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setTargetWorkoutId("");
            setAddSearch("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Exercise to a Past Workout</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Pick workout */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Choose workout</div>

              <div className="relative">
                <select
                  value={targetWorkoutId}
                  onChange={(e) => setTargetWorkoutId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground appearance-none pr-10"
                >
                  <option value="">Select a workout…</option>
                  {ensureArray(workouts).map((w) => (
                    <option key={w.id} value={w.id}>
                      {fmtWorkoutLabel(w)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {selectedWorkout ? (
                <div className="text-xs text-muted-foreground">
                  Adding into:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedWorkout.name || "Workout"}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Search exercise */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Search exercise</div>
              <Input
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Search exercise library..."
                disabled={!targetWorkoutId}
              />
            </div>

            {/* Results */}
            <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
              {!targetWorkoutId ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Pick a workout first.
                </div>
              ) : addCandidates.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  No matches.
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
              This adds the exercise into that saved workout in your history.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoryPage;