// frontend/src/utils/storage.js
// LocalStorage utility functions for workout data

// =====================
// Versioning
// =====================
const STORAGE_VERSION = 7; // bump because we add tombstones
const STORAGE_VERSION_KEY = "gym_storage_version";

// =====================
// Storage Keys
// =====================
export const STORAGE_KEYS = {
  WORKOUTS: "gym_workouts",
  SETTINGS: "gym_settings",
  BODY_WEIGHT: "gym_body_weight",
  PERSONAL_RECORDS: "gym_personal_records",
  VIDEO_LINKS: "gym_video_links",
  PROGRAMMES: "gym_programmes",
  EXERCISES: "gym_exercises",
  PROGRESSION_SETTINGS: "gym_progression_settings",
  WORKOUT_PATTERN: "gym_workout_pattern",
  WORKOUT_PATTERN_INDEX: "gym_workout_pattern_index",

  // Draft workout (unsaved)
  WORKOUT_DRAFT: "gym_workout_draft",

  // NEW: remembers exercises the user deleted so defaults don't respawn
  EXERCISE_TOMBSTONES: "gym_exercise_tombstones",
};

// =====================
// Helpers (string/id/date)
// =====================
const normalizeId = (s) => (s || "").toString().trim();

const toLegacyKey = (s) =>
  (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

// Prefer ids when it already looks like an id, otherwise legacy-transform it
const toKeyIdOrName = (idOrName) => {
  const raw = normalizeId(idOrName);
  if (!raw) return "";
  if (raw.includes("_") && !raw.includes(" ")) return raw.toLowerCase();
  return toLegacyKey(raw);
};

const toISODateOnly = (d) => {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

// Legacy / archived exercises we never want to lose
// (Even if removed from workoutData later)
const LEGACY_EXERCISES = [
  {
    id: "seated_cable_rows",
    name: "Seated Cable Rows",
    sets: 3,
    repScheme: "RPT",
    goalReps: [8, 10, 12],
    restTime: 150,
    notes: "Legacy / archived. Pull to lower chest, squeeze shoulder blades",
    assignedTo: [],
    hidden: false,
  },
  {
    id: "db_romanian_deadlifts",
    name: "DB Romanian Deadlifts",
    sets: 3,
    repScheme: "RPT",
    goalReps: [6, 8, 10],
    restTime: 120,
    notes: "Hip hinge. Push hips back, neutral spine.",
    assignedTo: [],
    hidden: false,
  },
];

// =====================
// Low-level storage
// =====================
export const getStorageData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error(`Failed to read ${key}`, e);
    return null;
  }
};

export const setStorageData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Failed to write ${key}`, e);
    return false;
  }
};

// =====================
// Init + migration
// =====================
export const initStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_VERSION_KEY);
    const version = stored ? parseInt(stored, 10) : 0;

    // ---- Migration to v6 ----
    // Rebuild exercise catalogue so legacy/default exercises are never lost
    if (version < 6) {
      const programmes = getProgrammes();
      const existing = getStorageData(STORAGE_KEYS.EXERCISES) || [];
      const rebuilt = rebuildExerciseCatalogue(programmes, existing);
      setStorageData(STORAGE_KEYS.EXERCISES, rebuilt);
    }

    // ---- Migration to v7 ----
    // Ensure tombstones key exists
    if (version < 7) {
      const t = getStorageData(STORAGE_KEYS.EXERCISE_TOMBSTONES);
      if (!Array.isArray(t)) setStorageData(STORAGE_KEYS.EXERCISE_TOMBSTONES, []);
    }

    localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION.toString());
  } catch (e) {
    console.error("Storage init failed", e);
  }
};

// =====================
// Workout Pattern Helpers
// =====================
export const getWorkoutPattern = () => {
  return getStorageData(STORAGE_KEYS.WORKOUT_PATTERN) || "A,B";
};

export const setWorkoutPattern = (patternString) => {
  return setStorageData(STORAGE_KEYS.WORKOUT_PATTERN, patternString);
};

export const getWorkoutPatternIndex = () => {
  return getStorageData(STORAGE_KEYS.WORKOUT_PATTERN_INDEX) || 0;
};

export const setWorkoutPatternIndex = (index) => {
  return setStorageData(STORAGE_KEYS.WORKOUT_PATTERN_INDEX, index);
};

// Parse "A,B,B,C" -> ["A","B","B","C"]
export const parseWorkoutPattern = (patternString) => {
  return (patternString || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
};

// "Usable" programmes = have 1+ exercises
export const getUsableProgrammes = () => {
  return getProgrammes().filter(
    (p) => Array.isArray(p.exercises) && p.exercises.length > 0
  );
};

// Decide next workout type from pattern + usable programmes (ADVANCES index)
export const getNextWorkoutTypeFromPattern = () => {
  const usable = getUsableProgrammes();
  if (usable.length === 0) return null;

  const usableTypes = new Set(usable.map((p) => String(p.type).toUpperCase()));
  const pattern = parseWorkoutPattern(getWorkoutPattern());

  const safePattern =
    pattern.length > 0 ? pattern : Array.from(usableTypes).sort();

  const filtered = safePattern.filter((t) => usableTypes.has(t));
  const finalPattern =
    filtered.length > 0 ? filtered : Array.from(usableTypes).sort();

  const i = getWorkoutPatternIndex() % finalPattern.length;
  const nextType = finalPattern[i];

  setWorkoutPatternIndex((i + 1) % finalPattern.length);
  return nextType;
};

// Peek next workout type from pattern + usable programmes (DOES NOT advance index)
export const peekNextWorkoutTypeFromPattern = () => {
  const usable = getUsableProgrammes();
  if (usable.length === 0) return null;

  const usableTypes = new Set(usable.map((p) => String(p.type).toUpperCase()));
  const pattern = parseWorkoutPattern(getWorkoutPattern());

  const safePattern =
    pattern.length > 0 ? pattern : Array.from(usableTypes).sort();

  const filtered = safePattern.filter((t) => usableTypes.has(t));
  const finalPattern =
    filtered.length > 0 ? filtered : Array.from(usableTypes).sort();

  const i = getWorkoutPatternIndex() % finalPattern.length;
  return finalPattern[i];
};

// Explicit helper some files import
export const advanceWorkoutPatternIndex = () => {
  const usable = getUsableProgrammes();
  const usableTypes = new Set(usable.map((p) => String(p.type).toUpperCase()));
  const pattern = parseWorkoutPattern(getWorkoutPattern());

  const safePattern =
    pattern.length > 0 ? pattern : Array.from(usableTypes).sort();

  const filtered = safePattern.filter((t) => usableTypes.has(t));
  const finalPattern =
    filtered.length > 0 ? filtered : Array.from(usableTypes).sort();

  const len = finalPattern.length > 0 ? finalPattern.length : 1;
  const current = getWorkoutPatternIndex();
  const next = (Number(current) || 0) + 1;

  const wrapped = ((next % len) + len) % len;
  setWorkoutPatternIndex(wrapped);
  return wrapped;
};

// =====================
// Workouts
// =====================
export const getWorkouts = () => getStorageData(STORAGE_KEYS.WORKOUTS) || [];

export const saveWorkout = (workout) => {
  const workouts = getWorkouts();
  workouts.unshift({
    ...workout,
    id: workout.id || Date.now().toString(),
    date: workout.date || new Date().toISOString(),
  });
  return setStorageData(STORAGE_KEYS.WORKOUTS, workouts);
};

export const updateWorkout = (id, updates) => {
  const workouts = getWorkouts();
  const index = workouts.findIndex((w) => w.id === id);
  if (index === -1) return false;

  workouts[index] = { ...workouts[index], ...updates };
  return setStorageData(STORAGE_KEYS.WORKOUTS, workouts);
};

export const deleteWorkout = (id) => {
  const workouts = getWorkouts();
  const filtered = workouts.filter((w) => w.id !== id);
  return setStorageData(STORAGE_KEYS.WORKOUTS, filtered);
};

// =====================
// Workout Draft (unsaved)
// =====================
export const getWorkoutDraft = () => {
  return getStorageData(STORAGE_KEYS.WORKOUT_DRAFT);
};

export const setWorkoutDraft = (draft) => {
  const enriched =
    draft && typeof draft === "object"
      ? {
          ...draft,
          startedAt: draft.startedAt || new Date().toISOString(),
          date: draft.date || toISODateOnly(new Date()),
        }
      : draft;

  return setStorageData(STORAGE_KEYS.WORKOUT_DRAFT, enriched);
};

// Alias some older imports may use
export const saveWorkoutDraft = (draft) => setWorkoutDraft(draft);

export const clearWorkoutDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.WORKOUT_DRAFT);
    return true;
  } catch (e) {
    console.error("Failed to clear workout draft", e);
    return false;
  }
};

export const isWorkoutDraftForToday = () => {
  const draft = getWorkoutDraft();
  if (!draft || typeof draft !== "object") return false;

  const today = toISODateOnly(new Date());

  if (draft.date) return String(draft.date).slice(0, 10) === today;
  if (draft.startedAt) return toISODateOnly(draft.startedAt) === today;

  return false;
};

// Set / change the draft workout type without overwriting the rest of the draft
export const setDraftWorkoutType = (type) => {
  const t = (type || "").toString().trim().toUpperCase();
  const draft = getWorkoutDraft();

  const nextDraft =
    draft && typeof draft === "object"
      ? { ...draft, type: t }
      : {
          type: t,
          startedAt: new Date().toISOString(),
          date: new Date().toISOString().slice(0, 10),
        };

  return setWorkoutDraft(nextDraft);
};

// =====================
// Settings (theme + metric, backwards compatible)
// =====================
export const getSettings = () => {
  const s = getStorageData(STORAGE_KEYS.SETTINGS) || {};

  // Backwards compat: older builds used `theme: "dark"|"light"`
  const legacyMode =
    typeof s.theme === "string" && (s.theme === "dark" || s.theme === "light")
      ? s.theme
      : null;

  return {
    weightUnit: s.weightUnit || "kg",

    // Theme system
    colorMode: s.colorMode || legacyMode || "light",
    colorTheme: s.colorTheme || "blue",

    // Progress page metric
    progressMetric: s.progressMetric || "max",
  };
};

export const updateSettings = (updates) => {
  const current = getSettings();
  const next = { ...current, ...(updates || {}) };

  // keep legacy key in sync (optional)
  if (updates?.colorMode) next.theme = updates.colorMode;

  return setStorageData(STORAGE_KEYS.SETTINGS, next);
};

// =====================
// Body Weight Tracking
// =====================
export const getBodyWeights = () =>
  getStorageData(STORAGE_KEYS.BODY_WEIGHT) || [];

export const addBodyWeight = (weight, note = "") => {
  const weights = getBodyWeights();
  const newEntry = {
    id: Date.now().toString(),
    weight,
    note,
    date: new Date().toISOString(),
  };
  weights.unshift(newEntry);
  return setStorageData(STORAGE_KEYS.BODY_WEIGHT, weights);
};

export const deleteBodyWeight = (id) => {
  const weights = getBodyWeights();
  const filtered = weights.filter((w) => w.id !== id);
  return setStorageData(STORAGE_KEYS.BODY_WEIGHT, filtered);
};

// =====================
// Personal Records (PRs) — backwards compatible
// =====================
export const getPersonalRecords = () => {
  const prs = getStorageData(STORAGE_KEYS.PERSONAL_RECORDS) || {};

  // Ensure each PR has exerciseName populated (Stats page uses it)
  let changed = false;
  Object.keys(prs).forEach((k) => {
    if (prs[k] && !prs[k].exerciseName) {
      prs[k].exerciseName = k.replace(/_/g, " ");
      changed = true;
    }
  });
  if (changed) setStorageData(STORAGE_KEYS.PERSONAL_RECORDS, prs);

  return prs;
};

/**
 * Backwards compatible updater:
 * - accepts exerciseId OR exerciseName
 * - stores under underscore key
 * - keeps exerciseName for display
 * - only overwrites if weight increases (original rule)
 *
 * NOTE: this keeps legacy behaviour (no 0/negative PRs).
 */
export const updatePersonalRecord = (exerciseIdOrName, weight, reps, date) => {
  const prs = getPersonalRecords();
  const key = toKeyIdOrName(exerciseIdOrName);
  if (!key) return false;

  const w = Number(weight);
  const r = Number(reps);

  if (!Number.isFinite(w) || w <= 0) return false;
  if (!Number.isFinite(r) || r <= 0) return false;

  const prev = prs[key];
  const prevWeight = prev ? Number(prev.weight || 0) : 0;

  const displayName =
    prev?.exerciseName ||
    (normalizeId(exerciseIdOrName).includes("_")
      ? key.replace(/_/g, " ")
      : normalizeId(exerciseIdOrName));

  if (!prev || w > prevWeight) {
    prs[key] = {
      exerciseName: displayName,
      weight: w,
      reps: r,
      date: date || new Date().toISOString(),
      previousWeight: prev?.weight ?? null,
    };
    setStorageData(STORAGE_KEYS.PERSONAL_RECORDS, prs);
    return true;
  }

  return false;
};

// =====================
// Video Links
// =====================
const getDefaultVideoLinks = () => ({
  weighted_dips: "https://www.youtube.com/watch?v=2z8JmcrW-As",
  incline_db_bench: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
  flat_db_bench: "https://www.youtube.com/watch?v=VmB1G1K7v94",
  overhead_press: "https://www.youtube.com/watch?v=2yjwXTZQDDI",
  lateral_raises: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
  triceps_pushdowns: "https://www.youtube.com/watch?v=-xa-6cQaZKY",
  weighted_chinups: "https://www.youtube.com/watch?v=bZ6Ysk9jf6E",
  db_romanian_deadlifts: "https://www.youtube.com/watch?v=hQgFixeXdZo",
  bulgarian_split_squats: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
  incline_hammer_curls: "https://www.youtube.com/watch?v=dYmwchQHqEA",
  face_pulls: "https://www.youtube.com/watch?v=rep-qVOkqgk",
  hanging_knee_raises: "https://www.youtube.com/watch?v=BI7wrB3Crsc",
});

export const getVideoLinks = () => {
  return getStorageData(STORAGE_KEYS.VIDEO_LINKS) || getDefaultVideoLinks();
};

// Accept id OR name (legacy) as first param
export const updateVideoLink = (exerciseIdOrName, url) => {
  const links = getVideoLinks();
  const key = toKeyIdOrName(exerciseIdOrName);
  if (!key) return false;
  links[key] = url;
  return setStorageData(STORAGE_KEYS.VIDEO_LINKS, links);
};

// =====================
// Programmes Management (NO forced default merges)
// =====================
export const getProgrammes = () => {
  const programmes = getStorageData(STORAGE_KEYS.PROGRAMMES);
  if (Array.isArray(programmes) && programmes.length > 0) return programmes;

  const { WORKOUT_A, WORKOUT_B } = require("../data/workoutData");
  const defaults = [WORKOUT_A, WORKOUT_B].filter(Boolean);
  setStorageData(STORAGE_KEYS.PROGRAMMES, defaults);
  return defaults;
};

export const saveProgramme = (programme) => {
  const programmes = getProgrammes();
  const existing = programmes.find((p) => p.type === programme.type);

  if (existing) {
    const updated = programmes.map((p) =>
      p.type === programme.type ? programme : p
    );
    return setStorageData(STORAGE_KEYS.PROGRAMMES, updated);
  } else {
    programmes.push(programme);
    return setStorageData(STORAGE_KEYS.PROGRAMMES, programmes);
  }
};

export const deleteProgramme = (type) => {
  const programmes = getProgrammes();
  const filtered = programmes.filter((p) => p.type !== type);
  return setStorageData(STORAGE_KEYS.PROGRAMMES, filtered);
};

// =====================
// Exercise tombstones (deleted defaults stay deleted)
// =====================
const getExerciseTombstones = () =>
  getStorageData(STORAGE_KEYS.EXERCISE_TOMBSTONES) || [];

const addExerciseTombstone = (id) => {
  const normId = normalizeId(id).toLowerCase();
  if (!normId) return false;

  const set = new Set(
    getExerciseTombstones().map((x) => String(x).toLowerCase())
  );
  set.add(normId);
  return setStorageData(STORAGE_KEYS.EXERCISE_TOMBSTONES, Array.from(set));
};

const removeExerciseEverywhereFromProgrammes = (id) => {
  const normId = normalizeId(id);
  if (!normId) return false;

  const programmes = getProgrammes();
  const updated = programmes.map((p) => {
    const list = Array.isArray(p.exercises) ? p.exercises : [];
    return {
      ...p,
      exercises: list.filter((ex) => normalizeId(ex?.id) !== normId),
    };
  });

  return setStorageData(STORAGE_KEYS.PROGRAMMES, updated);
};

// =====================
// Exercises (SAFE catalogue rebuild + respects tombstones)
// =====================
function getDefaultExercisesFromWorkoutData() {
  try {
    const { WORKOUT_A, WORKOUT_B } = require("../data/workoutData");
    return [
      ...(WORKOUT_A?.exercises || []),
      ...(WORKOUT_B?.exercises || []),
    ];
  } catch {
    return [];
  }
}

function rebuildExerciseCatalogue(programmes, existingExercises) {
  const byId = new Map();
  const tombstones = new Set(
    getExerciseTombstones().map((x) => String(x).toLowerCase())
  );

  const add = (ex) => {
    if (!ex?.id) return;
    const id = normalizeId(ex.id);
    if (!id) return;

    // ✅ if user deleted it previously, never re-add it from defaults/legacy
    if (tombstones.has(id.toLowerCase())) return;

    const prev = byId.get(id) || {};
    byId.set(id, { ...prev, ...ex, id });
  };

  getDefaultExercisesFromWorkoutData().forEach(add);
  LEGACY_EXERCISES.forEach(add);
  (existingExercises || []).forEach(add);

  // Recompute assignedTo from programmes
  const assignedMap = new Map();
  (programmes || []).forEach((p) => {
    const type = p?.type;
    (p?.exercises || []).forEach((ex) => {
      if (!ex?.id || !type) return;
      const id = normalizeId(ex.id);
      if (!assignedMap.has(id)) assignedMap.set(id, new Set());
      assignedMap.get(id).add(type);
    });
  });

  return Array.from(byId.values()).map((ex) => ({
    ...ex,
    assignedTo: assignedMap.has(ex.id)
      ? Array.from(assignedMap.get(ex.id))
      : ex.assignedTo || [],
  }));
}

export const getExercises = () => {
  const stored = getStorageData(STORAGE_KEYS.EXERCISES) || [];
  const programmes = getProgrammes();
  const merged = rebuildExerciseCatalogue(programmes, stored);
  setStorageData(STORAGE_KEYS.EXERCISES, merged);
  return merged;
};

function coerceExerciseForSave(exercise) {
  const ex = { ...(exercise || {}) };
  ex.id = normalizeId(ex.id);

  // sets
  const setsNum = Number(ex.sets);
  ex.sets = Number.isFinite(setsNum) && setsNum > 0 ? setsNum : 3;

  // restTime
  const restNum = Number(ex.restTime);
  ex.restTime = Number.isFinite(restNum) && restNum > 0 ? restNum : 120;

  // goalReps
  const rawGoalReps = Array.isArray(ex.goalReps) ? ex.goalReps : [];
  const cleanedGoalReps = rawGoalReps
    .map((x) => (x === "" || x == null ? null : Number(x)))
    .filter((n) => Number.isFinite(n) && n > 0);
  ex.goalReps = cleanedGoalReps.length ? cleanedGoalReps : [8, 10, 12];

  // hidden
  if (typeof ex.hidden !== "boolean") ex.hidden = false;

  // assignedTo
  if (!Array.isArray(ex.assignedTo)) ex.assignedTo = [];

  return ex;
}

export const saveExercise = (exercise) => {
  const ex = coerceExerciseForSave(exercise);
  const id = ex.id;
  if (!id) return false;

  // If an exercise was previously deleted, "saving" it should resurrect it.
  // So remove tombstone if present.
  const tombs = new Set(
    getExerciseTombstones().map((x) => String(x).toLowerCase())
  );
  if (tombs.has(id.toLowerCase())) {
    tombs.delete(id.toLowerCase());
    setStorageData(STORAGE_KEYS.EXERCISE_TOMBSTONES, Array.from(tombs));
  }

  const exercises = getStorageData(STORAGE_KEYS.EXERCISES) || [];
  const idx = exercises.findIndex((e) => normalizeId(e?.id) === id);

  if (idx !== -1) {
    const prev = exercises[idx] || {};
    exercises[idx] = {
      ...prev,
      ...ex,
      id,
      hidden: typeof ex.hidden === "boolean" ? ex.hidden : prev.hidden,
    };
  } else {
    exercises.push({ ...ex, id });
  }

  // Update core fields inside programmes too
  syncExerciseFieldsIntoProgrammes(ex);

  // Sync assignments based on exercise.assignedTo
  const assignedTo = Array.isArray(ex.assignedTo) ? ex.assignedTo : [];
  syncExerciseAssignmentsToProgrammes({ ...ex, id, assignedTo });

  // Persist exercises and rebuild catalogue (so assignedTo is re-derived cleanly)
  setStorageData(STORAGE_KEYS.EXERCISES, exercises);

  const programmes = getProgrammes();
  const merged = rebuildExerciseCatalogue(programmes, exercises);
  setStorageData(STORAGE_KEYS.EXERCISES, merged);

  return true;
};

export const deleteExercise = (id) => {
  try {
    const normId = normalizeId(id);
    if (!normId) return false;

    // ✅ Remember deletion so defaults/legacy don't respawn
    addExerciseTombstone(normId);

    // ✅ Remove it from programmes so it disappears there too
    removeExerciseEverywhereFromProgrammes(normId);

    // Remove from stored exercises list
    const exercises = getStorageData(STORAGE_KEYS.EXERCISES) || [];
    const filtered = exercises.filter((e) => normalizeId(e.id) !== normId);
    setStorageData(STORAGE_KEYS.EXERCISES, filtered);

    // Rebuild catalogue so UI updates immediately
    const programmes = getProgrammes();
    const merged = rebuildExerciseCatalogue(programmes, filtered);
    setStorageData(STORAGE_KEYS.EXERCISES, merged);

    return true;
  } catch (e) {
    console.error("deleteExercise failed", e);
    return false;
  }
};

// Sync Exercise Assignment to Programme Helper
function syncExerciseAssignmentsToProgrammes(exercise) {
  const programmes = getProgrammes();
  const id = normalizeId(exercise.id);
  if (!id) return;

  const wantTypes = new Set(
    (exercise.assignedTo || []).map((t) => String(t).toUpperCase())
  );

  const updated = programmes.map((p) => {
    const type = String(p.type).toUpperCase();
    const list = Array.isArray(p.exercises) ? [...p.exercises] : [];

    const has = list.some((ex) => normalizeId(ex?.id) === id);
    const shouldHave = wantTypes.has(type);

    if (shouldHave && !has) {
      list.push({
        id,
        name: exercise.name,
        sets: exercise.sets ?? 3,
        repScheme: exercise.repScheme ?? "RPT",
        goalReps: Array.isArray(exercise.goalReps)
          ? exercise.goalReps
          : [8, 10, 12],
        restTime: exercise.restTime ?? 120,
        notes: exercise.notes ?? "",
      });
    }

    if (!shouldHave && has) {
      const filtered = list.filter((ex) => normalizeId(ex?.id) !== id);
      return { ...p, exercises: filtered };
    }

    return { ...p, exercises: list };
  });

  setStorageData(STORAGE_KEYS.PROGRAMMES, updated);
}

function syncExerciseFieldsIntoProgrammes(exercise) {
  const programmes = getProgrammes();
  const id = normalizeId(exercise.id);
  if (!id) return;

  const updated = programmes.map((p) => {
    const list = Array.isArray(p.exercises) ? p.exercises : [];
    const changed = list.map((ex) => {
      if (normalizeId(ex?.id) !== id) return ex;

      return {
        ...ex,
        name: exercise.name,
        sets: exercise.sets,
        repScheme: exercise.repScheme,
        goalReps: exercise.goalReps,
        restTime: exercise.restTime,
        notes: exercise.notes,
      };
    });

    return { ...p, exercises: changed };
  });

  setStorageData(STORAGE_KEYS.PROGRAMMES, updated);
}

// =====================
// Progression Settings
// =====================
export const getProgressionSettings = () => {
  return (
    getStorageData(STORAGE_KEYS.PROGRESSION_SETTINGS) || {
      globalIncrementLbs: 5,
      globalIncrementKg: 2.5,
      rptSet2Percentage: 90,
      rptSet3Percentage: 80,
      exerciseSpecific: {},
    }
  );
};

export const updateProgressionSettings = (settings) => {
  return setStorageData(STORAGE_KEYS.PROGRESSION_SETTINGS, settings);
};

// =====================
// Export/Import CSV
// =====================
export const exportToCSV = () => {
  const workouts = getWorkouts();
  if (!Array.isArray(workouts) || workouts.length === 0) return null;

  const headers = [
    "Date",
    "Workout",
    "Exercise",
    "Set",
    "Weight",
    "Reps",
    "Notes",
  ];
  const rows = [];

  workouts.forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      (exercise.sets || []).forEach((set, idx) => {
        rows.push([
          new Date(workout.date).toLocaleDateString(),
          workout.type || "",
          exercise.name || "",
          idx + 1,
          set.weight ?? "",
          set.reps ?? "",
          exercise.notes || "",
        ]);
      });
    });
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
};

export const importFromCSV = (csvText) => {
  try {
    const lines = (csvText || "").trim().split("\n");
    if (lines.length < 2) {
      return { success: false, error: "CSV file is empty or invalid" };
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const requiredHeaders = [
      "Date",
      "Workout",
      "Exercise",
      "Set",
      "Weight",
      "Reps",
    ];

    const hasAllHeaders = requiredHeaders.every((h) => headers.includes(h));
    if (!hasAllHeaders) {
      return {
        success: false,
        error: `Missing required headers. Expected: ${requiredHeaders.join(
          ", "
        )}`,
      };
    }

    const workoutMap = new Map();
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length < 6) {
        errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      const [date, workoutType, exerciseName, setNum, weight, reps, notes = ""] =
        values;

      if (!date || !workoutType || !exerciseName) {
        errors.push(`Line ${i + 1}: Missing required fields`);
        continue;
      }

      const workoutKey = `${date}_${workoutType}`;

      if (!workoutMap.has(workoutKey)) {
        workoutMap.set(workoutKey, {
          id: `import_${Date.now()}_${i}`,
          date: new Date(date).toISOString(),
          type: workoutType,
          exercises: [],
        });
      }

      const workout = workoutMap.get(workoutKey);

      let exerciseObj = workout.exercises.find((e) => e.name === exerciseName);
      if (!exerciseObj) {
        exerciseObj = { name: exerciseName, sets: [], notes };
        workout.exercises.push(exerciseObj);
      }

      exerciseObj.sets.push({
        weight: parseFloat(weight) || 0,
        reps: parseInt(reps, 10) || 0,
        completed: true,
        setNumber: parseInt(setNum, 10) || exerciseObj.sets.length + 1,
      });
    }

    const importedWorkouts = Array.from(workoutMap.values());
    const existing = getWorkouts();
    const combined = [...importedWorkouts, ...existing];

    setStorageData(STORAGE_KEYS.WORKOUTS, combined);

    return {
      success: true,
      imported: importedWorkouts.length,
      errors: errors.length > 0 ? errors : null,
    };
  } catch (e) {
    return { success: false, error: `Failed to parse CSV: ${e.message}` };
  }
};

// =====================
// Full backup Export/Import (JSON)
// =====================
export const exportAllDataToJSON = () => {
  try {
    const payload = {
      meta: {
        app: "Gym-App-inalF",
        version: 1,
        exportedAt: new Date().toISOString(),
      },
      data: {
        workouts: getWorkouts(),
        settings: getSettings(),
        bodyWeights: getBodyWeights(),
        personalRecords: getPersonalRecords(),
        videoLinks: getVideoLinks(),
        programmes: getProgrammes(),
        exercises: getExercises(),
        progressionSettings: getProgressionSettings(),
        workoutPattern:
          typeof getWorkoutPattern === "function" ? getWorkoutPattern() : null,
        workoutPatternIndex:
          typeof getWorkoutPatternIndex === "function"
            ? getWorkoutPatternIndex()
            : null,
      },
    };

    return JSON.stringify(payload, null, 2);
  } catch (e) {
    console.error("Failed to export all data", e);
    return null;
  }
};

export const importAllDataFromJSON = (jsonText, options = { merge: false }) => {
  try {
    const parsed = JSON.parse(jsonText);
    const backup = parsed?.data ? parsed : { data: parsed };
    const data = backup.data || {};

    const looksValid =
      data.workouts ||
      data.settings ||
      data.programmes ||
      data.exercises ||
      data.progressionSettings;

    if (!looksValid) {
      return {
        success: false,
        error: "This file doesn't look like a valid full backup.",
      };
    }

    // Workouts: overwrite or merge by id
    if (Array.isArray(data.workouts)) {
      if (options.merge) {
        const existing = getWorkouts();
        const byId = new Map(existing.map((w) => [w.id, w]));
        data.workouts.forEach((w) => {
          if (w?.id) byId.set(w.id, w);
        });
        setStorageData(STORAGE_KEYS.WORKOUTS, Array.from(byId.values()));
      } else {
        setStorageData(STORAGE_KEYS.WORKOUTS, data.workouts);
      }
    }

    if (data.settings) setStorageData(STORAGE_KEYS.SETTINGS, data.settings);
    if (Array.isArray(data.bodyWeights))
      setStorageData(STORAGE_KEYS.BODY_WEIGHT, data.bodyWeights);
    if (data.personalRecords)
      setStorageData(STORAGE_KEYS.PERSONAL_RECORDS, data.personalRecords);
    if (data.videoLinks)
      setStorageData(STORAGE_KEYS.VIDEO_LINKS, data.videoLinks);
    if (Array.isArray(data.programmes))
      setStorageData(STORAGE_KEYS.PROGRAMMES, data.programmes);
    if (Array.isArray(data.exercises))
      setStorageData(STORAGE_KEYS.EXERCISES, data.exercises);
    if (data.progressionSettings)
      setStorageData(
        STORAGE_KEYS.PROGRESSION_SETTINGS,
        data.progressionSettings
      );

    if (data.workoutPattern != null) {
      setStorageData(STORAGE_KEYS.WORKOUT_PATTERN, data.workoutPattern);
    }
    if (data.workoutPatternIndex != null) {
      setStorageData(
        STORAGE_KEYS.WORKOUT_PATTERN_INDEX,
        data.workoutPatternIndex
      );
    }

    // Tombstones (keep them if present)
    if (Array.isArray(data.exerciseTombstones)) {
      setStorageData(STORAGE_KEYS.EXERCISE_TOMBSTONES, data.exerciseTombstones);
    }

    return { success: true };
  } catch (e) {
    console.error("Failed to import all data", e);
    return { success: false, error: `Import failed: ${e.message}` };
  }
};

// =====================
// Force Update helpers
// =====================
export const resetAllLocalData = async () => {
  try {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(STORAGE_VERSION_KEY);

    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }

    return true;
  } catch (e) {
    console.error("Failed to reset local data", e);
    return false;
  }
};

export const resetWithBackup = async (options = { merge: false }) => {
  try {
    const backupJson = exportAllDataToJSON();
    if (!backupJson) return { success: false, error: "Backup failed." };

    const resetOk = await resetAllLocalData();
    if (!resetOk) return { success: false, error: "Reset failed." };

    const result = importAllDataFromJSON(backupJson, options);
    if (!result?.success) return result;

    window.location.reload();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};