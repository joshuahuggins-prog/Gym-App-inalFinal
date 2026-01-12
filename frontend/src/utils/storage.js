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
  EXERCISES: "gym_exercises",
  PROGRESSION_SETTINGS: "gym_progression_settings",
  WORKOUT_PATTERN: "gym_workout_pattern",
  WORKOUT_PATTERN_INDEX: "gym_workout_pattern_index",
  SCHEMA_VERSION: "gym_schema_version",
};

// ============================
// Base storage helpers
// ============================

export const getStorageData = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return null;
  }
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
  // en-CA gives YYYY-MM-DD
  try {
    return d.toLocaleDateString("en-CA");
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
  const todayKey = getLocalDateKey();
  return draft.dateKey === todayKey;
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
    // Initialize with default programmes from workoutData
    // eslint note: keep as require to avoid circular imports in some setups
    const { WORKOUT_A, WORKOUT_B } = require("../data/workoutData");
    const defaultProgrammes = [WORKOUT_A, WORKOUT_B];
    setStorageData(STORAGE_KEYS.PROGRAMMES, defaultProgrammes);
    return defaultProgrammes;
  }
  return programmes;
};

// ============================
// Catalogue Sync (Programmes -> Exercises)
// ============================

const norm = (s) => String(s || "").trim().toLowerCase();
const upper = (s) => String(s || "").trim().toUpperCase();

/**
 * Build a map: exerciseId -> Set(programmeTypes that reference it)
 */
const buildAssignedToMapFromProgrammes = (programmes) => {
  const map = new Map();

  (programmes || []).forEach((p) => {
    const type = upper(p?.type);
    (p?.exercises || []).forEach((ex) => {
      const id = norm(ex?.id);
      if (!id || !type) return;

      if (!map.has(id)) map.set(id, new Set());
      map.get(id).add(type);
    });
  });

  return map;
};

/**
 * Sync catalogue `assignedTo` (and optionally `hidden`) based on programmes.
 * - Dedupes by `id` (last wins)
 * - Adds any programme exercise missing from catalogue (using programme copy as base)
 * - Rebuilds assignedTo from scratch
 */
export const syncExerciseCatalogueFromProgrammes = ({
  programmes,
  exercises,
  autoHideUnused = true,
}) => {
  const assignedToMap = buildAssignedToMapFromProgrammes(programmes);
  const catalogue = Array.isArray(exercises) ? exercises.slice() : [];

  // Index existing catalogue by id (dedupe)
  const byId = new Map();
  catalogue.forEach((ex) => {
    const id = norm(ex?.id);
    if (!id) return;
    byId.set(id, ex);
  });

  // Ensure every programme exercise exists in catalogue
  (programmes || []).forEach((p) => {
    (p?.exercises || []).forEach((exFromProg) => {
      const id = norm(exFromProg?.id);
      if (!id) return;

      if (!byId.has(id)) {
        byId.set(id, {
          id: exFromProg.id,
          name: exFromProg.name || exFromProg.id,
          sets: exFromProg.sets ?? 3,
          repScheme: exFromProg.repScheme ?? "RPT",
          goalReps: exFromProg.goalReps ?? [6, 8, 10],
          restTime: exFromProg.restTime ?? 120,
          notes: exFromProg.notes ?? "",
          hidden: false,
          assignedTo: [],
        });
      }
    });
  });

  const synced = Array.from(byId.values()).map((ex) => {
    const id = norm(ex?.id);
    const set = assignedToMap.get(id);
    const assignedTo = set ? Array.from(set) : [];

    const next = { ...ex, assignedTo };
    if (autoHideUnused) {
      next.hidden = assignedTo.length === 0;
    }
    return next;
  });

  // Stable-ish ordering: used first, then name
  synced.sort((a, b) => {
    const aUsed = (a.assignedTo || []).length > 0;
    const bUsed = (b.assignedTo || []).length > 0;
    if (aUsed !== bUsed) return aUsed ? -1 : 1;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return synced;
};

/**
 * One-call helper: sync and persist catalogue.
 */
export const syncAndSaveExerciseCatalogue = (options = { autoHideUnused: true }) => {
  const programmes = getProgrammes() || [];
  const exercises = getStorageData(STORAGE_KEYS.EXERCISES) || [];

  const synced = syncExerciseCatalogueFromProgrammes({
    programmes,
    exercises,
    autoHideUnused: options.autoHideUnused !== false,
  });

  setStorageData(STORAGE_KEYS.EXERCISES, synced);
  return synced;
};

export const saveProgramme = (programme) => {
  const programmes = getProgrammes();
  const existing = programmes.find((p) => p.type === programme.type);

  let nextProgrammes;
  if (existing) {
    nextProgrammes = programmes.map((p) => (p.type === programme.type ? programme : p));
  } else {
    nextProgrammes = [...programmes, programme];
  }

  const ok = setStorageData(STORAGE_KEYS.PROGRAMMES, nextProgrammes);
  if (ok) syncAndSaveExerciseCatalogue({ autoHideUnused: true });
  return ok;
};

export const deleteProgramme = (type) => {
  const programmes = getProgrammes();
  const filtered = programmes.filter((p) => p.type !== type);

  const ok = setStorageData(STORAGE_KEYS.PROGRAMMES, filtered);
  if (ok) syncAndSaveExerciseCatalogue({ autoHideUnused: true });
  return ok;
};

// ============================
// Exercises Management
// ============================

export const getExercises = () => {
  const stored = getStorageData(STORAGE_KEYS.EXERCISES);

  // If missing/empty, initialise from programmes first
  if (!stored || stored.length === 0) {
    const programmes = getProgrammes();
    const allExercises = [];

    programmes.forEach((prog) => {
      (prog.exercises || []).forEach((ex) => {
        if (!allExercises.find((e) => e.id === ex.id)) {
          allExercises.push({
            ...ex,
            assignedTo: [prog.type],
            hidden: false,
          });
        } else {
          const existing = allExercises.find((e) => e.id === ex.id);
          existing.assignedTo = existing.assignedTo || [];
          if (!existing.assignedTo.includes(prog.type)) {
            existing.assignedTo.push(prog.type);
          }
        }
      });
    });

    setStorageData(STORAGE_KEYS.EXERCISES, allExercises);

    // Immediately sync (dedupe + hide unused, etc.)
    return syncAndSaveExerciseCatalogue({ autoHideUnused: true });
  }

  // Always return a synced view so "unassigned" ghosts don’t linger
  const programmes = getProgrammes();
  const synced = syncExerciseCatalogueFromProgrammes({
    programmes,
    exercises: stored,
    autoHideUnused: true,
  });
  setStorageData(STORAGE_KEYS.EXERCISES, synced);
  return synced;
};

export const saveExercise = (exercise) => {
  // Keep whatever is stored, then upsert, then sync against programmes
  const existing = getStorageData(STORAGE_KEYS.EXERCISES) || [];
  const id = norm(exercise?.id);
  if (!id) return false;

  const next = existing.slice();
  const idx = next.findIndex((e) => norm(e?.id) === id);

  if (idx >= 0) next[idx] = { ...next[idx], ...exercise };
  else next.push(exercise);

  const ok = setStorageData(STORAGE_KEYS.EXERCISES, next);
  if (!ok) return false;

  // Sync ensures assignedTo/hidden remain consistent with programmes
  syncAndSaveExerciseCatalogue({ autoHideUnused: true });
  return true;
};

export const deleteExercise = (id) => {
  const exercises = getStorageData(STORAGE_KEYS.EXERCISES) || [];
  const target = norm(id);
  const filtered = exercises.filter((e) => norm(e?.id) !== target);
  const ok = setStorageData(STORAGE_KEYS.EXERCISES, filtered);
  if (ok) syncAndSaveExerciseCatalogue({ autoHideUnused: true });
  return ok;
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
        exercises: getExercises(),
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
      data.workouts || data.settings || data.programmes || data.exercises || data.progressionSettings;

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
    if (Array.isArray(data.exercises)) setStorageData(STORAGE_KEYS.EXERCISES, data.exercises);
    if (data.progressionSettings)
      setStorageData(STORAGE_KEYS.PROGRESSION_SETTINGS, data.progressionSettings);

    if (data.workoutPattern != null && STORAGE_KEYS.WORKOUT_PATTERN) {
      setStorageData(STORAGE_KEYS.WORKOUT_PATTERN, data.workoutPattern);
    }
    if (data.workoutPatternIndex != null && STORAGE_KEYS.WORKOUT_PATTERN_INDEX) {
      setStorageData(STORAGE_KEYS.WORKOUT_PATTERN_INDEX, data.workoutPatternIndex);
    }

    // ✅ After importing, resync catalogue so assignedTo/hidden are correct
    syncAndSaveExerciseCatalogue({ autoHideUnused: true });

    return { success: true };
  } catch (e) {
    console.error("Failed to import all data", e);
    return { success: false, error: `Import failed: ${e.message}` };
  }
};

// Kept for backwards compatibility with any older code paths that used it.
// (Not required for the new sync system, but harmless to leave here.)
const normalize = (s) => (s || "").toString().trim().toLowerCase();
const autoHideUnusedCatalogueExercises = (data) => {
  if (!data || !Array.isArray(data.exercises)) return data;

  const activeIds = new Set();
  if (Array.isArray(data.programmes)) {
    data.programmes.forEach((prog) => {
      (prog.exercises || []).forEach((ex) => {
        if (ex?.id) activeIds.add(normalize(ex.id));
      });
    });
  }

  data.exercises = data.exercises.map((ex) => {
    const id = normalize(ex.id);
    if (!id) return ex;
    const shouldStayVisible = activeIds.has(id);
    return { ...ex, hidden: !shouldStayVisible };
  });

  return data;
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