// src/pages/HomePage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../components/AppHeader";
import { Calendar, Flame, RotateCcw, ChevronDown, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

import VideoModal from "../components/VideoModal";
import ExerciseCard from "../components/ExerciseCard";
import RestTimer from "../components/RestTimer";
import PRCelebration from "../components/PRCelebration";
import WorkoutActionBar from "../components/workout/WorkoutActionBar";

import {
  getWorkouts,
  saveWorkout,
  updatePersonalRecord,
  getPersonalRecords,
  getProgrammes,
  getProgressionSettings,
  peekNextWorkoutTypeFromPattern,
  advanceWorkoutPatternIndex,
  getWorkoutDraft,
  saveWorkoutDraft,
  clearWorkoutDraft,
  isWorkoutDraftForToday,
  setDraftWorkoutType,
  getExercises,
} from "../utils/storage";

import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";

// ---------------------------
// Helpers
// ---------------------------
const norm = (s) => String(s || "").trim().toLowerCase();
const upper = (s) => String(s || "").trim().toUpperCase();
const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.trunc(n)));

const getWeekKey = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  const thursday = new Date(d);
  thursday.setHours(0, 0, 0, 0);
  thursday.setDate(thursday.getDate() + 3 - ((thursday.getDay() + 6) % 7));

  const week1 = new Date(thursday.getFullYear(), 0, 4);
  week1.setHours(0, 0, 0, 0);

  const weekNo =
    1 +
    Math.round(
      ((thursday - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );

  return `${thursday.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

const buildExerciseDefaultSetsData = (setsCount) =>
  Array.from({ length: setsCount }, () => ({
    weight: "",
    reps: "",
    completed: false,
  }));

const makeEmptySet = () => ({ weight: "", reps: "", completed: false });

const getNextWorkoutTypeFromHistoryAB = () => {
  const workouts = getWorkouts();
  const lastType = workouts?.[0]?.type ? upper(workouts[0].type) : null;
  if (!lastType) return null;
  if (lastType === "A") return "B";
  if (lastType === "B") return "A";
  return null;
};

// ---------------------------
// HomePage
// ---------------------------
const HomePage = () => {
  const { weightUnit } = useSettings();

  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState([]);
  const [restTimer, setRestTimer] = useState(null);
  const [prCelebration, setPrCelebration] = useState(null);
  const [videoModal, setVideoModal] = useState({ open: false, title: "", url: "" });

  const draftSaveTimerRef = useRef(null);
  const loadRef = useRef(null);

  const [manualWorkoutType, setManualWorkoutType] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addSearch, setAddSearch] = useState("");

  // ---------------------------
  // Load Today's Workout
  // ---------------------------
  const getUsableProgrammes = () => {
    const programmes = getProgrammes() || [];
    return programmes.filter((p) => Array.isArray(p.exercises) && p.exercises.length > 0);
  };

  const loadTodaysWorkout = () => {
    const workouts = getWorkouts();
    const usableProgrammes = getUsableProgrammes();
    const draft = getWorkoutDraft();
    const draftType = draft?.workoutType || draft?.type;
    const hasTodaysDraft = isWorkoutDraftForToday(draft) && !!draftType;

    if (usableProgrammes.length === 0) {
      toast.error("No usable programmes found. Add at least 1 exercise to a programme.");
      return;
    }

    const nextType = hasTodaysDraft
      ? draftType
      : getNextWorkoutTypeFromHistoryAB() || peekNextWorkoutTypeFromPattern();

    const workout =
      usableProgrammes.find((p) => upper(p.type) === upper(nextType)) || usableProgrammes[0];

    if (!workout) {
      toast.error("No programmes found. Please create a programme first.");
      return;
    }

    const lastSameWorkout = workouts.find((w) => upper(w.type) === upper(workout.type));
    setCurrentWorkout(workout);
    setManualWorkoutType(workout.type);

    if (hasTodaysDraft && upper(draftType) === upper(workout.type)) {
      const draftById = new Map((draft?.exercises || []).map((e) => [e.id, e]));
      setWorkoutData(
        (workout.exercises || []).map((ex) => {
          const lastExerciseData = lastSameWorkout?.exercises?.find(
            (e) => e.id === ex.id || e.name === ex.name
          );
          const draftEx = draftById.get(ex.id);
          return {
            ...ex,
            userNotes: draftEx?.userNotes || "",
            setsData: Array.isArray(draftEx?.setsData) ? draftEx.setsData : [],
            lastWorkoutData: lastExerciseData || null,
          };
        })
      );
      toast.message("Restored unsaved workout", { description: "We loaded your in-progress session after refresh." });
      return;
    }

    setWorkoutData(
      (workout.exercises || []).map((ex) => {
        const lastExerciseData = lastSameWorkout?.exercises?.find(
          (e) => e.id === ex.id || e.name === ex.name
        );
        return { ...ex, userNotes: "", setsData: [], lastWorkoutData: lastExerciseData || null };
      })
    );
  };

  useEffect(() => { loadRef.current = loadTodaysWorkout; }, []);
  useEffect(() => { loadRef.current?.(); }, []);

  // ---------------------------
  // Auto-save draft
  // ---------------------------
  useEffect(() => {
    if (!currentWorkout) return;

    const hasMeaningfulData = (workoutData || []).some((ex) =>
      (ex.userNotes && ex.userNotes.trim().length > 0) ||
      (Array.isArray(ex.setsData) && ex.setsData.some((set) => (set.weight ?? "") !== "" || (set.reps ?? "") !== "" || !!set.completed))
    );

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      if (!hasMeaningfulData) return clearWorkoutDraft();

      saveWorkoutDraft({
        workoutType: currentWorkout.type,
        programmeName: currentWorkout.name,
        focus: currentWorkout.focus,
        exercises: (workoutData || []).map((ex) => ({
          id: ex.id,
          name: ex.name,
          repScheme: ex.repScheme,
          userNotes: ex.userNotes || "",
          setsData: Array.isArray(ex.setsData) ? ex.setsData : [],
        })),
      });
    }, 400);

    return () => { if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current); };
  }, [currentWorkout, workoutData]);
  // ---------------------------
  // Handlers
  // ---------------------------
  const handleSetComplete = (exercise, set, levelUp) => {
    const progressionSettings = getProgressionSettings();
    const exerciseSpecificIncrement = progressionSettings.exerciseSpecific?.[exercise.id];
    const suggestedIncrement =
      exerciseSpecificIncrement && exerciseSpecificIncrement > 0
        ? exerciseSpecificIncrement
        : weightUnit === "lbs"
        ? progressionSettings.globalIncrementLbs
        : progressionSettings.globalIncrementKg;

    if (levelUp) {
      const suggestedWeight = (Number(set.weight) || 0) + suggestedIncrement;
      toast.success(`Level Up! Try ${suggestedWeight}${weightUnit} next time!`, { duration: 3500 });
    }

    const prs = getPersonalRecords();
    const currentPR = prs?.[exercise.id];
    const w = Number(set.weight);
    if (!Number.isFinite(w)) return;

    if (!currentPR || w > Number(currentPR.weight ?? -Infinity)) {
      const wasNew = updatePersonalRecord(exercise.id, w, Number(set.reps) || 0);
      if (wasNew) setPrCelebration({ exercise: exercise.name, newWeight: w, oldWeight: currentPR?.weight });
    }
  };

  const handleWeightChange = (exercise, setsData) => {
    setWorkoutData((prev) =>
      (prev || []).map((ex) => (ex.id === exercise.id ? { ...ex, setsData } : ex))
    );
  };

  const handleNotesChange = (exercise, notes) => {
    setWorkoutData((prev) =>
      (prev || []).map((ex) => (ex.id === exercise.id ? { ...ex, userNotes: notes } : ex))
    );
  };

  const handleAddSetToExercise = (exercise) => {
    if (!exercise?.id) return;

    setWorkoutData((prev) =>
      (prev || []).map((ex) => {
        if (ex.id !== exercise.id) return ex;

        const currentSetsData = Array.isArray(ex.setsData) ? ex.setsData : [];
        const baseCount = currentSetsData.length > 0 ? currentSetsData.length : clampInt(Number(ex.sets ?? 3), 1, 12);
        const base = currentSetsData.length > 0 ? currentSetsData : buildExerciseDefaultSetsData(baseCount);

        if (base.length >= 20) {
          toast.message("Max sets reached", { description: "You can add up to 20 sets per exercise for today." });
          return ex;
        }

        return { ...ex, sets: base.length + 1, setsData: [...base, makeEmptySet()] };
      })
    );

    toast.success("Set added", { description: `Added an extra set to ${exercise.name || exercise.id}`, duration: 1800 });
  };

  const buildWorkoutPayload = () => ({
    type: currentWorkout.type,
    name: currentWorkout.name,
    focus: currentWorkout.focus,
    date: new Date().toISOString(),
    exercises: (workoutData || []).map((ex) => ({
      id: ex.id,
      name: ex.name,
      repScheme: ex.repScheme,
      sets: Array.isArray(ex.setsData) ? ex.setsData : [],
      notes: ex.userNotes || "",
    })),
  });

  const handleSaveAndFinishWorkout = () => {
    if (!currentWorkout) return;
    saveWorkout(buildWorkoutPayload());
    clearWorkoutDraft();
    advanceWorkoutPatternIndex();
    toast.success("Workout saved! Great job! 💪", { description: `${currentWorkout.name} completed` });
    loadRef.current?.();
  };

  const handleManualSwitchWorkout = (nextType) => {
    if (!nextType) return;
    const usableProgrammes = getUsableProgrammes();
    const picked = usableProgrammes.find((p) => upper(p.type) === upper(nextType)) || null;
    if (!picked) return toast.error("That workout type isn't available yet.");
    setDraftWorkoutType(picked.type);
    setManualWorkoutType(picked.type);
    loadRef.current?.();
    toast.message("Switched workout", { description: `Now showing: ${picked.name}` });
  };

  const handleReturnToSequence = () => {
    const next = peekNextWorkoutTypeFromPattern();
    if (!next) return toast.error("No next workout found in your pattern.");
    handleManualSwitchWorkout(next);
  };

  // ---------------------------
  // Weekly streak & last workout
  // ---------------------------
  const weeklyStreak = useMemo(() => {
    const workouts = getWorkouts();
    if (!workouts.length) return 0;

    const weeks = workouts.map((w) => getWeekKey(w.date)).filter(Boolean);
    const uniq = [...new Set(weeks)];

    const weekStart = (weekKey) => {
      const [y, w] = String(weekKey).split("-W");
      const year = Number(y);
      const week = Number(w);
      if (!Number.isFinite(year) || !Number.isFinite(week)) return null;
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dow = simple.getDay();
      const isoMonday = new Date(simple);
      const diff = dow <= 4 ? 1 - (dow || 7) : 8 - dow;
      isoMonday.setDate(simple.getDate() + diff);
      isoMonday.setHours(0, 0, 0, 0);
      return isoMonday;
    };

    const starts = uniq.map(weekStart).filter(Boolean);
    if (!starts.length) return 0;

    let streak = 1;
    for (let i = 0; i < starts.length - 1; i++) {
      const diffDays = Math.round((starts[i] - starts[i + 1]) / 86400000);
      if (diffDays >= 6 && diffDays <= 8) streak++;
      else break;
    }
    return streak;
  }, [workoutData]);

  const getDaysSinceLastWorkout = () => {
    const workouts = getWorkouts();
    if (!workouts.length) return null;
    return Math.floor((new Date() - new Date(workouts[0].date)) / (1000 * 60 * 60 * 24));
  };

  const daysSince = getDaysSinceLastWorkout();
  const canFinish = useMemo(
    () =>
      (workoutData || []).some((ex) =>
        Array.isArray(ex.setsData) &&
        ex.setsData.some((set) => (set.weight ?? "") !== "" || (set.reps ?? "") !== "")
      ),
    [workoutData]
  );

  // ---------------------------
  // Add Exercise Dialog prep
  // ---------------------------
  const allLibraryExercises = useMemo(() => (getExercises() || []).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))), [showAddDialog]);
  const addCandidates = useMemo(() => {
    const q = norm(addSearch);
    const existingIds = new Set((workoutData || []).map((e) => norm(e.id)));
    return allLibraryExercises.filter((ex) => ex?.id && !existingIds.has(norm(ex.id)) && (!q || norm(ex.name).includes(q) || norm(ex.id).includes(q))).slice(0, 50);
  }, [allLibraryExercises, addSearch, workoutData]);

  const handleAddExerciseToToday = (ex) => {
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
    setWorkoutData((prev) => [...(prev || []), newRow]);
    setShowAddDialog(false);
    setAddSearch("");
    toast.success("Exercise added", { description: `${newRow.name} added to Today` });
  };
  if (!currentWorkout) return null;
  const nextInSequence = peekNextWorkoutTypeFromPattern();
  const subtitle = `${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`;

  return (
    <AppHeader
      title="Log Workout"
      subtitle={subtitle}
      rightIconSrc={`${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`}
      actions={
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadRef.current?.()} title="Reload today">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-white/90">
            Next: <span className="font-semibold text-white">{nextInSequence ? String(nextInSequence) : "—"}</span>
          </div>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Weekly streak</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{weeklyStreak} weeks</div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Last Trained</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {daysSince === null
              ? "Never"
              : daysSince === 0
              ? "Today"
              : `${daysSince}d ago`}
          </div>
        </div>
      </div>

      {/* Workout Info */}
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mt-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 w-full">
            <h2 className="text-xl font-bold text-foreground mb-1 truncate">
              {currentWorkout.name}
            </h2>
            <Badge className="bg-primary/20 text-primary border-primary/50">
              {currentWorkout.focus}
            </Badge>

            {/* Manual switcher */}
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <select
                      value={manualWorkoutType || ""}
                      onChange={(e) => setManualWorkoutType(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground appearance-none pr-10"
                    >
                      {getUsableProgrammes().map((p) => (
                        <option key={p.type} value={p.type}>
                          {p.name} ({p.type})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManualSwitchWorkout(manualWorkoutType)}
                  disabled={
                    !manualWorkoutType ||
                    upper(manualWorkoutType) === upper(currentWorkout.type)
                  }
                  className="shrink-0"
                >
                  Switch
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReturnToSequence}
                  disabled={
                    !nextInSequence ||
                    upper(nextInSequence) === upper(currentWorkout.type)
                  }
                  className="shrink-0"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="mt-4 space-y-4">
        {(workoutData || []).map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            lastWorkoutData={exercise.lastWorkoutData}
            onSetComplete={handleSetComplete}
            onWeightChange={handleWeightChange}
            onNotesChange={handleNotesChange}
            onRestTimer={(duration) => setRestTimer(duration)}
            onAddSet={handleAddSetToExercise}
            onOpenVideo={(ex, url) => {
              if (!url) {
                toast.message("No video saved", {
                  description: "Add a YouTube link for this exercise in your library.",
                });
                return;
              }
              setVideoModal({ open: true, title: ex?.name || "Exercise Video", url });
            }}
            isFirst={index === 0}
          />
        ))}
      </div>

      {/* Floating Save Button */}
      <WorkoutActionBar
        onSaveFinish={handleSaveAndFinishWorkout}
        disableFinish={!currentWorkout || !canFinish}
      />

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
            <DialogTitle>Add Exercise</DialogTitle>
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
                  No matches (or already added).
                </div>
              ) : (
                addCandidates.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleAddExerciseToToday(ex)}
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
              Added exercises only affect Today (they won’t be added into your programme).
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rest Timer */}
      {restTimer && (
        <RestTimer
          duration={restTimer}
          onComplete={() => {
            setRestTimer(null);
            toast.success("Rest period complete! Ready for next set!");
          }}
          onClose={() => setRestTimer(null)}
        />
      )}

      {/* Video Modal */}
      <VideoModal
        open={videoModal.open}
        onOpenChange={(open) => setVideoModal((v) => ({ ...v, open }))}
        title={videoModal.title}
        videoUrl={videoModal.url}
      />

      {/* PR Celebration */}
      {prCelebration && (
        <PRCelebration
          {...prCelebration}
          onClose={() => setPrCelebration(null)}
        />
      )}
    </AppHeader>
  );
};

export default HomePage;
