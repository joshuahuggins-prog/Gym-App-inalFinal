// src/utils/storage.js
// LocalStorage utility functions for workout data

// ✅ No existing users, so migrations are not needed right now.
// Keep a version key so you can add migrations later if you ever need them.
const STORAGE_VERSION = 1; // integers only
const STORAGE_VERSION_KEY = "gym_storage_version";

export const initStorage = () => {
  try {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    const version = storedVersion ? parseInt(storedVersion, 10) : 0;

    // Future migrations go here:
    // if (version < 2) { ... }

    // Always persist current version so init is idempotent
    localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
  } catch (e) {
    console.error("Storage init failed", e);
  }
};

const STORAGE_KEYS = {
  WORKOUTS: "gym_workouts",
  WORKOUT_DRAFT: "gym_workout_draft",
  SETTINGS: "gym_settings",
  BODY_WEIGHT: "gym_body_weight",
  PERSONAL_RECORDS: "gym_personal_records",
  VIDEO_LINKS: "gym_video_links",
  PROGRAMMES: "gym_programmes",

  // IMPORTANT:
  // This key now stores ONLY "overrides" (changes/custom exercises),
  // not a fully-synced catalogue generated from programmes.
  EXERCISES: "gym_exercises",

  PROGRESSION_SETTINGS: "gym_progression_settings",
  WORKOUT_PATTERN: "gym_workout_pattern",
  WORKOUT_PATTERN_INDEX: "gym_workout_pattern_index",
  SCHEMA_VERSION: "gym_schema_version",
};

// ============================
// Base storage helpers
// ============================

export const getWorkouts = () => {
  const arr = getStorageData(STORAGE_KEYS.WORKOUTS) || [];
  if (!Array.isArray(arr)) return [];

  return [...arr].sort((a, b) => {
    const da = new Date(a?.date || 0).getTime();
    const db = new Date(b?.date || 0).getTime();
    return db - da;
  });
};

export const setStorageData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    return false;
  }
};

// ============================
// Workout draft helpers (protects unsaved workout data on refresh)
// ============================

const getLocalDateKey = (d = new Date()) => {
  try {
    return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

export const getWorkoutDraft = () => getStorageData(STORAGE_KEYS.WORKOUT_DRAFT);

export const saveWorkoutDraft = (draft) => {
  if (!draft) return false;
  return setStorageData(STORAGE_KEYS.WORKOUT_DRAFT, {
    ...draft,
    dateKey: draft.dateKey || getLocalDateKey(),
    updatedAt: new Date().toISOString(),
  });
};

export const clearWorkoutDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.WORKOUT_DRAFT);
    return true;
  } catch (e) {
    console.error("Error clearing workout draft", e);
    return false;
  }
};

export const isWorkoutDraftForToday = (draft) => {
  if (!draft) return false;
  return draft.dateKey === getLocalDateKey();
};

export const setDraftWorkoutType = (workoutType) => {
  if (!workoutType) return false;

  const draft = getWorkoutDraft() || {};
  return saveWorkoutDraft({
    ...draft,
    workoutType,
    exercises: Array.isArray(draft.exercises) ? draft.exercises : [],
  });
};

// ============================
// Workouts
// ============================

export const getWorkouts = () => getStorageData(STORAGE_KEYS.WORKOUTS) || [];

export const saveWorkout = (workout) => {
  const workouts = getWorkouts();
  const newWorkout = {
    ...workout,
    id: workout.id || Date.now().toString(),
    date: workout.date || new Date().toISOString(),
  };
  workouts.unshift(newWorkout);
  return setStorageData(STORAGE_KEYS.WORKOUTS, workouts);
};

export const updateWorkout = (id, updates) => {
  const workouts = getWorkouts();
  const index = workouts.findIndex((w) => w.id === id);
  if (index !== -1) {
    workouts[index] = { ...workouts[index], ...updates };
    return setStorageData(STORAGE_KEYS.WORKOUTS, workouts);
  }
  return false;
};

export const deleteWorkout = (id) => {
  const workouts = getWorkouts();
  const filtered = workouts.filter((w) => w.id !== id);
  return setStorageData(STORAGE_KEYS.WORKOUTS, filtered);
};

// ============================
// Settings
// ============================

const DEFAULT_SETTINGS = {
  weightUnit: "kg",
  theme: "dark",
  // "maxWeight" | "e1rm"
  statsMetric: "maxWeight",
};

export const getSettings = () => {
  const stored = getStorageData(STORAGE_KEYS.SETTINGS);
  if (!stored || typeof stored !== "object") return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...stored };
};

export const updateSettings = (updates) =>
  setStorageData(STORAGE_KEYS.SETTINGS, {
    ...getSettings(),
    ...updates,
  });

export const getStatsMetric = () => getSettings().statsMetric || "maxWeight";
export const setStatsMetric = (statsMetric) => updateSettings({ statsMetric });

// ============================
// Body Weight Tracking
// ============================

export const getBodyWeights = () => getStorageData(STORAGE_KEYS.BODY_WEIGHT) || [];

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

// ============================
// Personal Records
// ============================

export const getPersonalRecords = () => getStorageData(STORAGE_KEYS.PERSONAL_RECORDS) || {};

export const updatePersonalRecord = (exerciseName, weight, reps, date) => {
  const prs = getPersonalRecords();
  const key = String(exerciseName || "").toLowerCase().replace(/\s+/g, "_");

  if (!prs[key] || weight > prs[key].weight) {
    prs[key] = {
      exerciseName,
      weight,
      reps,
      date: date || new Date().toISOString(),
      previousWeight: prs[key]?.weight || null,
    };
    setStorageData(STORAGE_KEYS.PERSONAL_RECORDS, prs);
    return true;
  }
  return false;
};

// ============================
// Video Links
// ============================

const getDefaultVideoLinks = () => ({
  weighted_dips: "https://www.youtube.com/watch?v=2z8JmcrW-As",
  incline_db_bench: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
  flat_db_bench: "https://www.youtube.com/watch?v=VmB1G1K7v94",
  overhead_press: "https://www.youtube.com/watch?v=2yjwXTZQDDI",
  lateral_raises: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
  triceps_pushdowns: "https://www.youtube.com/watch?v=-xa-6cQaZKY",
  weighted_chinups: "https://www.youtube.com/watch?v=bZ6Ysk9jf6E",
  db_romanian_deadlifts: "https://www.youtube.com/watch?v=hQgFixeXdZo?si",
  bulgarian_split_squats: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
  incline_hammer_curls: "https://www.youtube.com/watch?v=zC3nLlEvin4",
  face_pulls: "https://www.youtube.com/watch?v=rep-qVOkqgk",
});

export const getVideoLinks = () =>
  getStorageData(STORAGE_KEYS.VIDEO_LINKS) || getDefaultVideoLinks();

export const updateVideoLink = (exerciseName, url) => {
  const links = getVideoLinks();
  const key = String(exerciseName || "").toLowerCase().replace(/\s+/g, "_");
  links[key] = url;
  return setStorageData(STORAGE_KEYS.VIDEO_LINKS, links);
};

// ============================
// Programmes Management
// ============================

export const getProgrammes = () => {
  const programmes = getStorageData(STORAGE_KEYS.PROGRAMMES);
  if (!programmes || programmes.length === 0) {
    const { WORKOUT_A, WORKOUT_B } = require("../data/workoutData");
    const defaultProgrammes = [WORKOUT_A, WORKOUT_B];
    setStorageData(STORAGE_KEYS.PROGRAMMES, defaultProgrammes);
    return defaultProgrammes;
  }
  return programmes;
};

export const saveProgramme = (programme) => {
  const programmes = getProgrammes();
  const existing = programmes.find((p) => p.type === programme.type);

  const nextProgrammes = existing
    ? programmes.map((p) => (p.type === programme.type ? programme : p))
    : [...programmes, programme];

  return setStorageData(STORAGE_KEYS.PROGRAMMES, nextProgrammes);
};

export const deleteProgramme = (type) => {
  const programmes = getProgrammes();
  const filtered = programmes.filter((p) => p.type !== type);
  return setStorageData(STORAGE_KEYS.PROGRAMMES, filtered);
};

// ============================
// Exercises (Stock baseline + Local overrides)
// ============================

const normId = (s) => String(s || "").trim();

const getStockProgrammes = () => {
  const { WORKOUT_A, WORKOUT_B } = require("../data/workoutData");
  return [WORKOUT_A, WORKOUT_B].filter(Boolean);
};

const buildStockExercisesFromWorkouts = () => {
  const programmes = getStockProgrammes();
  const map = new Map();

  programmes.forEach((prog) => {
    (prog.exercises || []).forEach((ex) => {
      const id = normId(ex?.id);
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, {
          ...ex,
          id,
          // keep these if your UI uses them
          hidden: !!ex.hidden,
          assignedTo: Array.isArray(ex.assignedTo) ? ex.assignedTo : [],
        });
      }
    });
  });

  return Array.from(map.values());
};

// Local overrides ONLY (what user changed or added)
export const getExerciseOverrides = () => {
  const local = getStorageData(STORAGE_KEYS.EXERCISES);
  return Array.isArray(local) ? local : [];
};

// Merged view used by the app
export const getExercises = () => {
  const stock = buildStockExercisesFromWorkouts();
  const local = getExerciseOverrides();

  const stockById = new Map(stock.map((e) => [normId(e.id), e]));
  const localById = new Map(
    local.filter((e) => e && e.id).map((e) => [normId(e.id), e])
  );

  const merged = [];
  const seen = new Set();

  for (const [id, stockEx] of stockById.entries()) {
    const localEx = localById.get(id);
    merged.push(localEx ? { ...stockEx, ...localEx, id } : stockEx);
    seen.add(id);
  }

  // Add any local-only custom exercises
  for (const [id, localEx] of localById.entries()) {
    if (seen.has(id)) continue;
    merged.push({ ...localEx, id });
  }

  return merged;
};

// Upsert override (does NOT rebuild from programmes)
export const saveExercise = (exercise) => {
  const id = normId(exercise?.id);
  if (!id) return false;

  const local = getExerciseOverrides();
  const next = local.slice();

  const idx = next.findIndex((e) => normId(e?.id) === id);
  if (idx >= 0) next[idx] = { ...next[idx], ...exercise, id };
  else next.push({ ...exercise, id });

  return setStorageData(STORAGE_KEYS.EXERCISES, next);
};

// Delete override.
// If it's a stock exercise, we "hide" it by writing an override {hidden:true}
// so it stays gone in the UI (optional but usually expected).
export const deleteExercise = (id) => {
  const target = normId(id);
  if (!target) return false;

  const stock = buildStockExercisesFromWorkouts();
  const isStock = stock.some((e) => normId(e.id) === target);

  const local = getExerciseOverrides();
  const without = local.filter((e) => normId(e?.id) !== target);

  if (isStock) {
    without.push({ id: target, hidden: true });
  }

  return setStorageData(STORAGE_KEYS.EXERCISES, without);
};

// Convenience: get a single exercise by id (merged)
export const getExerciseById = (id) => {
  const target = normId(id);
  if (!target) return null;
  return getExercises().find((e) => normId(e?.id) === target) || null;
};

// ============================
// Progression Settings
// ============================

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

// ============================
// Workout Pattern
// ============================

export const getWorkoutPattern = () => getStorageData(STORAGE_KEYS.WORKOUT_PATTERN) || "A,B";
export const setWorkoutPattern = (patternString) =>
  setStorageData(STORAGE_KEYS.WORKOUT_PATTERN, patternString);

export const getWorkoutPatternIndex = () =>
  getStorageData(STORAGE_KEYS.WORKOUT_PATTERN_INDEX) || 0;

export const setWorkoutPatternIndex = (index) =>
  setStorageData(STORAGE_KEYS.WORKOUT_PATTERN_INDEX, index);

export const parseWorkoutPattern = (patternString) => {
  return (patternString || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
};

export const getUsableProgrammes = () => {
  return getProgrammes().filter((p) => Array.isArray(p.exercises) && p.exercises.length > 0);
};

const getResolvedPatternList = () => {
  const usable = getUsableProgrammes();
  if (usable.length === 0) return [];

  const usableTypes = new Set(usable.map((p) => String(p.type).toUpperCase()));
  const patternStr = getWorkoutPattern();
  const pattern = parseWorkoutPattern(patternStr);

  const safePattern = pattern.length > 0 ? pattern : Array.from(usableTypes).sort();
  const filtered = safePattern.filter((t) => usableTypes.has(t));
  const finalPattern = filtered.length > 0 ? filtered : Array.from(usableTypes).sort();

  return finalPattern;
};

export const peekNextWorkoutTypeFromPattern = () => {
  const finalPattern = getResolvedPatternList();
  if (finalPattern.length === 0) return null;

  const i = getWorkoutPatternIndex() % finalPattern.length;
  return finalPattern[i];
};

export const advanceWorkoutPatternIndex = () => {
  const finalPattern = getResolvedPatternList();
  if (finalPattern.length === 0) return false;

  const i = getWorkoutPatternIndex() % finalPattern.length;
  setWorkoutPatternIndex((i + 1) % finalPattern.length);
  return true;
};

export const getNextWorkoutTypeFromPattern = () => {
  const next = peekNextWorkoutTypeFromPattern();
  if (!next) return null;
  advanceWorkoutPatternIndex();
  return next;
};

// ============================
// Export/Import CSV
// ============================

export const exportToCSV = () => {
  const workouts = getWorkouts();
  if (workouts.length === 0) return null;

  const headers = ["Date", "Workout", "Exercise", "Set", "Weight", "Reps", "Notes"];
  const rows = [];

  workouts.forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      (exercise.sets || []).forEach((set, index) => {
        rows.push([
          new Date(workout.date).toLocaleDateString(),
          workout.type,
          exercise.name,
          index + 1,
          set.weight ?? "",
          set.reps ?? "",
          exercise.notes ?? "",
        ]);
      });
    });
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
};

export const importFromCSV = (csvText) => {
  try {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return { success: false, error: "CSV file is empty or invalid" };

    const headers = lines[0].split(",").map((h) => h.trim());
    const requiredHeaders = ["Date", "Workout", "Exercise", "Set", "Weight", "Reps"];
    const hasAllHeaders = requiredHeaders.every((h) => headers.includes(h));

    if (!hasAllHeaders) {
      return {
        success: false,
        error: `Missing required headers. Expected: ${requiredHeaders.join(", ")}`,
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

      const [date, workoutType, exercise, set, weight, reps, notes = ""] = values;

      if (!date || !workoutType || !exercise) {
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
      let exerciseObj = workout.exercises.find((e) => e.name === exercise);

      if (!exerciseObj) {
        exerciseObj = { name: exercise, sets: [], notes };
        workout.exercises.push(exerciseObj);
      }

      exerciseObj.sets.push({
        weight: parseFloat(weight) || 0,
        reps: parseInt(reps, 10) || 0,
        completed: true,
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
  } catch (error) {
    return { success: false, error: `Failed to parse CSV: ${error.message}` };
  }
};

// ============================
// Reset / Backup
// ============================

export const resetAllLocalData = async () => {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));

    if (typeof caches !== "undefined") {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    return true;
  } catch (e) {
    console.error("Failed to reset local data", e);
    return false;
  }
};

export const exportAllDataToJSON = () => {
  try {
    const payload = {
      meta: {
        app: "Gym-App-inalFinal",
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

        // Export overrides only (keeps backups small + portable)
        exerciseOverrides: getExerciseOverrides(),

        progressionSettings: getProgressionSettings(),
        workoutPattern: typeof getWorkoutPattern === "function" ? getWorkoutPattern() : null,
        workoutPatternIndex:
          typeof getWorkoutPatternIndex === "function" ? getWorkoutPatternIndex() : null,
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
      data.exerciseOverrides ||
      data.exercises ||
      data.progressionSettings;

    if (!looksValid) {
      return { success: false, error: "This file doesn't look like a valid full backup." };
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
    if (Array.isArray(data.bodyWeights)) setStorageData(STORAGE_KEYS.BODY_WEIGHT, data.bodyWeights);
    if (data.personalRecords) setStorageData(STORAGE_KEYS.PERSONAL_RECORDS, data.personalRecords);
    if (data.videoLinks) setStorageData(STORAGE_KEYS.VIDEO_LINKS, data.videoLinks);
    if (Array.isArray(data.programmes)) setStorageData(STORAGE_KEYS.PROGRAMMES, data.programmes);

    // New format: overrides-only
    if (Array.isArray(data.exerciseOverrides)) {
      setStorageData(STORAGE_KEYS.EXERCISES, data.exerciseOverrides);
    }
    // Backward compat: if old backups contain full "exercises", accept them as overrides
    else if (Array.isArray(data.exercises)) {
      setStorageData(STORAGE_KEYS.EXERCISES, data.exercises);
    }

    if (data.progressionSettings)
      setStorageData(STORAGE_KEYS.PROGRESSION_SETTINGS, data.progressionSettings);

    if (data.workoutPattern != null && STORAGE_KEYS.WORKOUT_PATTERN) {
      setStorageData(STORAGE_KEYS.WORKOUT_PATTERN, data.workoutPattern);
    }
    if (data.workoutPatternIndex != null && STORAGE_KEYS.WORKOUT_PATTERN_INDEX) {
      setStorageData(STORAGE_KEYS.WORKOUT_PATTERN_INDEX, data.workoutPatternIndex);
    }

    return { success: true };
  } catch (e) {
    console.error("Failed to import all data", e);
    return { success: false, error: `Import failed: ${e.message}` };
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

export default STORAGE_KEYS;
