// src/pages/ExercisesPage.js
import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Save, Video } from "lucide-react";

import AppHeader from "../components/AppHeader";
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
  getDefaultVideoLinks,
} from "../utils/storage";

import { toast } from "sonner";

const MAX_SETS = 8;

const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));
const norm = (s) => String(s || "").trim().toLowerCase();

const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

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
  const [setsDraft, setSetsDraft] = useState("");

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
    setTimeout(() => {
      window.location.reload();
    }, 650);
  };

  const appLogoSrc = `${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`;

  // build defaults map from workoutData
  const defaultExerciseMap = useMemo(() => {
    try {
      const { WORKOUT_A, WORKOUT_B } = require("../data/workoutData");
      const all = [
        ...(WORKOUT_A?.exercises || []),
        ...(WORKOUT_B?.exercises || []),
      ];

      const map = new Map();
      all.forEach((ex) => {
        if (!ex?.id) return;
        map.set(String(ex.id), {
          id: String(ex.id),
          name: ex.name || "",
          sets: ex.sets ?? 3,
          repScheme: ex.repScheme ?? "RPT",
          goalReps: Array.isArray(ex.goalReps) ? ex.goalReps : [8, 10, 12],
          restTime: ex.restTime ?? 120,
          notes: ex.notes ?? "",
        });
      });
      return map;
    } catch {
      return new Map();
    }
  }, []);

  const programmeUsageMap = useMemo(() => {
    const map = new Map();
    (programmes || []).forEach((p) => {
      (p?.exercises || []).forEach((e) => {
        const id = norm(e?.id);
        if (!id) return;
        if (!map.has(id)) map.set(id, []);
        map.get(id).push(p);
      });
    });
    return map;
  }, [programmes]);

  const handleCreateExercise = () => {
    const sets = 3;
    setEditingExercise({
      id: `exercise_${Date.now()}`,
      name: "",
      sets,
      repScheme: "RPT",
      goalReps: [8, 10, 12],
      restTime: 120,
      notes: "",
      videoUrl: "",
    });
    setSetsDraft(String(sets));
    setShowEditDialog(true);
  };

  const handleEditExercise = (exercise) => {
    const videoLinks = getVideoLinks() || {};
    const sets = clampInt(Number(exercise.sets) || 3, 1, MAX_SETS);

    let goalReps = Array.isArray(exercise.goalReps)
      ? [...exercise.goalReps]
      : [];

    if (goalReps.length < sets) {
      goalReps = [
        ...goalReps,
        ...Array.from({ length: sets - goalReps.length }, () => 8),
      ];
    } else if (goalReps.length > sets) {
      goalReps = goalReps.slice(0, sets);
    }

    setEditingExercise({
      ...exercise,
      sets,
      goalReps,
      videoUrl: videoLinks[exercise.id] || "",
    });
    setSetsDraft(String(sets));
    setShowEditDialog(true);
  };

  const setSetsAndSyncGoalReps = (sets) => {
    const next = clampInt(sets, 1, MAX_SETS);
    let reps = [...(editingExercise.goalReps || [])];

    if (reps.length < next) {
      reps.push(...Array.from({ length: next - reps.length }, () => 8));
    } else if (reps.length > next) {
      reps = reps.slice(0, next);
    }

    setEditingExercise({ ...editingExercise, sets: next, goalReps: reps });
  };

  const handleSaveExercise = () => {
    if (!editingExercise?.name?.trim()) {
      toast.error("Please enter exercise name");
      return;
    }

    const { videoUrl, ...exerciseData } = editingExercise;

    exerciseData.sets = clampInt(Number(exerciseData.sets) || 3, 1, MAX_SETS);

    let reps = Array.isArray(exerciseData.goalReps)
      ? exerciseData.goalReps.map((r) =>
          clampInt(Number(r) || 8, 1, 200)
        )
      : [8];

    if (reps.length < exerciseData.sets) {
      reps.push(
        ...Array.from(
          { length: exerciseData.sets - reps.length },
          () => 8
        )
      );
    } else if (reps.length > exerciseData.sets) {
      reps = reps.slice(0, exerciseData.sets);
    }

    exerciseData.goalReps = reps;
    exerciseData.restTime =
      Number(exerciseData.restTime) > 0 ? exerciseData.restTime : 120;

    if (!saveExercise(exerciseData)) {
      toast.error("Failed to save exercise");
      return;
    }

    if (videoUrl?.trim()) {
      updateVideoLink(exerciseData.id, videoUrl.trim());
    }

    loadData();
    setShowEditDialog(false);
    setEditingExercise(null);
    setSetsDraft("");
    toast.success("Exercise saved!");
  };

  const isUserCreatedExercise = (ex) =>
    String(ex?.id || "").startsWith("exercise_");

  const openResetFor = (id) => {
    setResetOpenId(id);
    setResetAnswer("");
    setResetChallenge(makeChallenge());
  };

  const closeResetUI = () => {
    setResetOpenId("");
    setResetAnswer("");
  };

  const runExerciseReset = (exercise) => {
    const id = String(exercise?.id || "");
    if (isUserCreatedExercise(exercise)) return;

    if (Number(resetAnswer) !== resetChallenge.result) {
      toast.error("Wrong answer");
      closeResetUI();
      return;
    }

    const def = defaultExerciseMap.get(id);
    if (!def) {
      toast.error("No default found");
      closeResetUI();
      return;
    }

    saveExercise(def);

    const defaults = getDefaultVideoLinks?.() || {};
    if (defaults[id]) updateVideoLink(id, defaults[id]);

    closeResetUI();
    toastAndReload(`Reset "${def.name}" to default`);
  };

  const filteredExercises = useMemo(() => {
    const search = searchTerm.toLowerCase();
    let allowedIds = null;

    if (filterProgramme !== "all") {
      const prog = programmes.find((p) => p.type === filterProgramme);
      allowedIds = new Set((prog?.exercises || []).map((e) => norm(e.id)));
    }

    return exercises.filter((ex) => {
      if (search && !ex.name.toLowerCase().includes(search)) return false;
      if (allowedIds && !allowedIds.has(norm(ex.id))) return false;
      return true;
    });
  }, [exercises, programmes, searchTerm, filterProgramme]);

  return (
    <AppHeader
      title="Exercises"
      subtitle={`${exercises.length} total exercises`}
      rightIconSrc={appLogoSrc}
    >
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Search exercises…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button onClick={handleCreateExercise}>
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredExercises.map((exercise) => (
            <ExerciseLibraryCard
              key={exercise.id}
              exercise={exercise}
              usedBy={programmeUsageMap.get(norm(exercise.id)) || []}
              userMade={isUserCreatedExercise(exercise)}
              canReset={defaultExerciseMap.has(exercise.id)}
              resetOpen={resetOpenId === exercise.id}
              resetChallenge={resetChallenge}
              resetAnswer={resetAnswer}
              onChangeResetAnswer={setResetAnswer}
              onToggleReset={() => openResetFor(exercise.id)}
              onConfirmReset={() => runExerciseReset(exercise)}
              onCancelReset={closeResetUI}
              onEdit={() => handleEditExercise(exercise)}
              onDelete={() => deleteExercise(exercise.id)}
            />
          ))}
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exercise</DialogTitle>
          </DialogHeader>

          {editingExercise && (
  <div className="space-y-4 py-4">
    <div>
      <label className="text-sm font-medium block mb-2">
        Exercise Name *
      </label>
      <Input
        value={editingExercise.name}
        onChange={(e) =>
          setEditingExercise({ ...editingExercise, name: e.target.value })
        }
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium block mb-2">
          Number of Sets
        </label>
        <Input
          type="number"
          min="1"
          max={MAX_SETS}
          value={setsDraft}
          onChange={(e) => {
            const raw = e.target.value;
            setSetsDraft(raw);
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            setSetsAndSyncGoalReps(n);
          }}
          onBlur={() => {
            if (!setsDraft) {
              setSetsDraft(String(editingExercise.sets));
            }
          }}
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-2">
          Rep Scheme
        </label>
        <Select
          value={editingExercise.repScheme}
          onValueChange={(v) =>
            setEditingExercise({ ...editingExercise, repScheme: v })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RPT">RPT</SelectItem>
            <SelectItem value="Straight Sets">Straight Sets</SelectItem>
            <SelectItem value="Rest-Pause">Rest-Pause</SelectItem>
            <SelectItem value="Kino Reps">Kino Reps</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div>
      <label className="text-sm font-medium block mb-2">
        Goal reps per set
      </label>
      <div className="grid grid-cols-4 gap-2">
        {editingExercise.goalReps.map((rep, i) => (
          <Input
            key={i}
            type="number"
            min="1"
            value={rep}
            onChange={(e) => {
              const reps = [...editingExercise.goalReps];
              reps[i] = Number(e.target.value) || 8;
              setEditingExercise({ ...editingExercise, goalReps: reps });
            }}
          />
        ))}
      </div>
    </div>

    <div>
      <label className="text-sm font-medium block mb-2">
        Rest Time (seconds)
      </label>
      <Input
        type="number"
        value={editingExercise.restTime}
        onChange={(e) =>
          setEditingExercise({
            ...editingExercise,
            restTime: Number(e.target.value) || 120,
          })
        }
      />
    </div>

    <div>
      <label className="text-sm font-medium block mb-2">
        Form Check Video URL
      </label>
      <div className="flex gap-2">
        <Input
          value={editingExercise.videoUrl || ""}
          onChange={(e) =>
            setEditingExercise({
              ...editingExercise,
              videoUrl: e.target.value,
            })
          }
        />
        {editingExercise.videoUrl && (
          <Button
            variant="outline"
            onClick={() =>
              window.open(editingExercise.videoUrl, "_blank")
            }
          >
            <Video className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>

    <div>
      <label className="text-sm font-medium block mb-2">
        Notes
      </label>
      <Textarea
        value={editingExercise.notes || ""}
        onChange={(e) =>
          setEditingExercise({
            ...editingExercise,
            notes: e.target.value,
          })
        }
      />
    </div>

    <div className="flex gap-3 pt-4">
      <Button
        variant="outline"
        className="flex-1"
        onClick={() => setShowEditDialog(false)}
      >
        Cancel
      </Button>
      <Button className="flex-1" onClick={handleSaveExercise}>
        <Save className="w-4 h-4 mr-2" />
        Save Exercise
      </Button>
    </div>
  </div>
)}
        </DialogContent>
      </Dialog>
    </AppHeader>
  );
}
