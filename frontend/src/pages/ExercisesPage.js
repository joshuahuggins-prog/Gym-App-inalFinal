// src/pages/ExercisesPage.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Save,
  Video,
  RotateCcw,
} from "lucide-react";

import ExerciseLibraryCard from "../components/ExerciseLibraryCard";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import {
  getExercises,
  saveExercise,
  deleteExercise,
  getProgrammes,
  getVideoLinks,
  updateVideoLink,
  getDefaultVideoLinks, // must exist in storage.js
} from "../utils/storage";

import { toast } from "sonner";

const MAX_SETS = 8;

const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));
const norm = (s) => String(s || "").trim().toLowerCase();

// Math challenge generator (same rules as Settings reset)
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const makeChallenge = () => {
  const ops = ["+", "-", "*"];
  const op = ops[randInt(0, ops.length - 1)];

  let a = randInt(1, 99);
  let b = randInt(1, 99);

  if (op === "*") {
    a = randInt(1, 12);
    b = randInt(1, 12);
  }

  if (op === "-" && b > a) [a, b] = [b, a];

  let result = 0;
  if (op === "+") result = a + b;
  if (op === "-") result = a - b;
  if (op === "*") result = a * b;

  return { text: `${a} ${op} ${b}`, result };
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProgramme, setFilterProgramme] = useState("all");

  const [editingExercise, setEditingExercise] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // draft strings prevent "stuck" inputs when clearing/typing
  const [setsDraft, setSetsDraft] = useState("");

  // Per-card reset UI state
  const [resetOpenId, setResetOpenId] = useState("");
  const [resetChallenge, setResetChallenge] = useState(() => makeChallenge());
  const [resetAnswer, setResetAnswer] = useState("");

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

  // Build defaults map from app code (workoutData)
  const defaultExerciseMap = useMemo(() => {
    try {
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
  }, []);

  // programmeUsageMap: exerciseId -> programmes that contain that id
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

  const handleCreateExercise = () => {
    const sets = 3;
    const goalReps = [8, 10, 12];

    setEditingExercise({
      id: `exercise_${Date.now()}`, // user-created marker
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
    const videoLinks = getVideoLinks() || {};
    const videoUrl = videoLinks[exercise.id] || "";

    const sets = Number.isFinite(Number(exercise.sets)) ? Number(exercise.sets) : 3;
    const safeSets = clampInt(sets, 1, MAX_SETS);

    let goalReps = Array.isArray(exercise.goalReps) ? [...exercise.goalReps] : [];
    if (goalReps.length === 0) goalReps = [8];

    // Ensure goalReps length matches sets (pad/trim)
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

    setEditingExercise((prev) => ({ ...prev, sets, goalReps: nextGoalReps }));
  };

  const handleSaveExercise = () => {
    if (!editingExercise?.name || !editingExercise.name.trim()) {
      toast.error("Please enter exercise name");
      return;
    }

    const { videoUrl, ...exerciseData } = editingExercise;

    // Clean sets (1..MAX_SETS)
    const setsNum = Number(exerciseData.sets);
    const sets = Number.isFinite(setsNum) ? clampInt(setsNum, 1, MAX_SETS) : 3;
    exerciseData.sets = sets;

    // Clean goalReps to match sets
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

    // Rest time
    const restNum = Number(exerciseData.restTime);
    exerciseData.restTime = Number.isFinite(restNum) && restNum > 0 ? restNum : 120;

    // Save exercise details ONLY
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

  const handleDeleteExercise = (id, name) => {
    const usedBy = programmeUsageMap.get(norm(id)) || [];
    const usedNames = usedBy.map((p) => p?.name || p?.type).filter(Boolean);

    const msg =
      usedNames.length > 0
        ? `Delete "${name}"?\n\nIt is currently used in: ${usedNames.join(
            ", "
          )}.\n\nDeleting may break those programmes unless you remove it from them too.`
        : `Delete "${name}"?`;

    if (window.confirm(msg)) {
      const ok = deleteExercise(id);
      if (!ok) {
        toast.error("Failed to delete exercise");
        return;
      }
      loadData();
      toast.success("Exercise deleted");
    }
  };

  const isUserCreatedExercise = (exercise) => {
    const id = String(exercise?.id || "");
    return id.startsWith("exercise_");
  };

  const openResetFor = (exerciseId) => {
    setResetOpenId(exerciseId);
    setResetAnswer("");
    setResetChallenge(makeChallenge());
  };

  const closeResetUI = () => {
    setResetOpenId("");
    setResetAnswer("");
    setResetChallenge(makeChallenge());
  };

  const runExerciseReset = (exercise) => {
    const id = String(exercise?.id || "").trim();
    if (!id) return;

    if (isUserCreatedExercise(exercise)) return;

    const userAnswer = Number(String(resetAnswer).trim());
    if (!Number.isFinite(userAnswer) || userAnswer !== resetChallenge.result) {
      toast.error("Wrong answer.");
      closeResetUI();
      return;
    }

    const def = defaultExerciseMap.get(id);
    if (!def) {
      toast.error("No app default found for this exercise.");
      closeResetUI();
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
        closeResetUI();
        return;
      }

      const defaults =
        (typeof getDefaultVideoLinks === "function" ? getDefaultVideoLinks() : {}) || {};
      if (defaults[id]) {
        updateVideoLink(id, defaults[id]);
      }

      closeResetUI();
      toastAndReload(`Reset "${def.name || exercise.name}" to default`);
    } catch (e) {
      toast.error(e?.message || "Reset failed");
      closeResetUI();
    }
  };

  const filteredExercises = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    // Build set of IDs that are in the selected programme (if filtering)
    let allowedIds = null;
    if (filterProgramme !== "all") {
      const prog = (programmes || []).find(
        (p) => String(p?.type) === String(filterProgramme)
      );
      const ids = new Set((prog?.exercises || []).map((e) => norm(e?.id)).filter(Boolean));
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
    <div className="min-h-screen bg-background pb-24">
      {/* ===== NEW HEADER (matches other pages) ===== */}
      <div className="sticky top-0 z-30 border-b border-border bg-gradient-to-b from-card to-background">
        <div className="max-w-4xl mx-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Library
              </div>
              <h1 className="text-3xl font-extrabold text-foreground leading-tight truncate">
                Exercise Library
              </h1>
              <div className="text-sm text-muted-foreground">
                {exercises.length} total exercises • Tip: edit the programme to add/remove exercises
              </div>
            </div>

            <Button onClick={handleCreateExercise} className="shrink-0">
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
                <SelectValue placeholder="All Programmes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programmes</SelectItem>
                {(programmes || []).map((prog) => (
                  <SelectItem key={prog.type} value={prog.type}>
                    {prog.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ===== LIST ===== */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredExercises.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">🏋️</div>
            <p className="text-lg text-muted-foreground mb-2">
              {searchTerm || filterProgramme !== "all" ? "No exercises found" : "No exercises yet"}
            </p>
            {!searchTerm && filterProgramme === "all" && (
              <Button onClick={handleCreateExercise}>Create your first exercise</Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredExercises.map((exercise) => {
              const usedBy = programmeUsageMap.get(norm(exercise.id)) || [];
              const userMade = isUserCreatedExercise(exercise);
              const isOpen = resetOpenId === exercise.id;

              const canReset =
                !userMade && defaultExerciseMap.has(String(exercise.id || "").trim());

              return (
                <ExerciseLibraryCard
                  key={exercise.id}
                  exercise={exercise}
                  usedBy={usedBy}
                  canReset={canReset}
                  resetOpen={isOpen}
                  resetChallenge={resetChallenge}
                  resetAnswer={resetAnswer}
                  onResetAnswerChange={setResetAnswer}
                  onToggleReset={() => {
                    if (!canReset) return;
                    if (isOpen) closeResetUI();
                    else openResetFor(exercise.id);
                  }}
                  onNewChallenge={() => {
                    setResetChallenge(makeChallenge());
                    setResetAnswer("");
                  }}
                  onRunReset={() => runExerciseReset(exercise)}
                  onCancelReset={closeResetUI}
                  onEdit={() => handleEditExercise(exercise)}
                  onDelete={() => handleDeleteExercise(exercise.id, exercise.name)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ===== EDIT DIALOG ===== */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            setEditingExercise(null);
            setSetsDraft("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {exercises.find((e) => e.id === editingExercise?.id)
                ? "Edit Exercise"
                : "Create New Exercise"}
            </DialogTitle>
          </DialogHeader>

          {editingExercise ? (
            <div className="space-y-4 py-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Exercise Name *
                </label>
                <Input
                  value={editingExercise.name}
                  onChange={(e) =>
                    setEditingExercise({ ...editingExercise, name: e.target.value })
                  }
                  placeholder="Weighted Dips"
                />
              </div>

              {/* Sets & Rep Scheme */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Number of Sets (max {MAX_SETS})
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={MAX_SETS}
                    value={setsDraft}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setSetsDraft(raw);

                      if (raw === "") return;

                      const n = Number(raw);
                      if (!Number.isFinite(n)) return;

                      const clamped = clampInt(n, 1, MAX_SETS);
                      setSetsAndSyncGoalReps(clamped);
                      setSetsDraft(String(clamped));
                    }}
                    onBlur={() => {
                      if (setsDraft === "") {
                        setSetsDraft(String(editingExercise.sets || 3));
                      }
                    }}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    This controls how many rep boxes appear (one per set).
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Rep Scheme
                  </label>
                  <Select
                    value={editingExercise.repScheme}
                    onValueChange={(value) =>
                      setEditingExercise({ ...editingExercise, repScheme: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RPT">RPT (Reverse Pyramid)</SelectItem>
                      <SelectItem value="Kino Reps">Kino Reps</SelectItem>
                      <SelectItem value="Rest-Pause">Rest-Pause</SelectItem>
                      <SelectItem value="Straight Sets">Straight Sets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rep boxes */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground block">
                  Goal reps for each set (one box per set)
                </label>

                <div className="grid grid-cols-4 gap-2">
                  {(editingExercise.goalReps || []).map((rep, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="text-[11px] text-muted-foreground">Set {idx + 1}</div>
                      <Input
                        type="number"
                        min="1"
                        value={rep === "" || rep == null ? "" : rep}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const nextGoalReps = [...(editingExercise.goalReps || [])];

                          if (raw === "") {
                            nextGoalReps[idx] = "";
                            setEditingExercise({
                              ...editingExercise,
                              goalReps: nextGoalReps,
                            });
                            return;
                          }

                          const n = Number(raw);
                          if (!Number.isFinite(n)) return;

                          nextGoalReps[idx] = n;
                          setEditingExercise({
                            ...editingExercise,
                            goalReps: nextGoalReps,
                          });
                        }}
                        placeholder="8"
                      />
                    </div>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground">
                  Saved as an array (e.g. [6, 8, 10]).
                </div>
              </div>

              {/* Rest Time */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Rest Time (seconds)
                </label>
                <Input
                  type="number"
                  min="15"
                  max="600"
                  value={editingExercise.restTime ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setEditingExercise({ ...editingExercise, restTime: "" });
                      return;
                    }
                    const n = Number(raw);
                    setEditingExercise({
                      ...editingExercise,
                      restTime: Number.isFinite(n) ? n : 120,
                    });
                  }}
                />
              </div>

              {/* Video URL */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Form Check Video URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={editingExercise.videoUrl || ""}
                    onChange={(e) =>
                      setEditingExercise({ ...editingExercise, videoUrl: e.target.value })
                    }
                    placeholder="https://youtube.com/..."
                  />
                  {editingExercise.videoUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(editingExercise.videoUrl, "_blank")}
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Notes / Instructions
                </label>
                <Textarea
                  value={editingExercise.notes || ""}
                  onChange={(e) =>
                    setEditingExercise({ ...editingExercise, notes: e.target.value })
                  }
                  placeholder="Exercise cues, form tips, etc."
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Programme membership:</span>{" "}
                This is controlled in the Programme editor. This page edits the exercise details only.
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowEditDialog(false);
                setEditingExercise(null);
                setSetsDraft("");
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSaveExercise}>
              <Save className="w-4 h-4 mr-2" />
              Save Exercise
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}