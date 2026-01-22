// frontend/src/utils/storage.js
// LocalStorage utility functions for workout data

// =====================
// Versioning
// =====================
const STORAGE_VERSION = 6; // integer migrations only
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
  WORKOUT_DRAFT: "gym_workout_draft",
};

// =====================
// Helpers
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
// Workout Draft (unsaved session state)
// =====================
// Used to preserve in-progress workout data across refresh / accidental close.
// Stored as a single object; callers can choose structure (e.g., { programmeId, startedAt, exercises: [...] }).
export const getWorkoutDraft = () => {
  return getStorageData(STORAGE_KEYS.WORKOUT_DRAFT);
};

export const setWorkoutDraft = (draft) => {
  return setStorageData(STORAGE_KEYS.WORKOUT_DRAFT, draft);
};

export const clearWorkoutDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.WORKOUT_DRAFT);
    return true;
  } catch (e) {
    console.error("Failed to clear workout draft", e);
    return false;
  }
};

// Convenience: some parts of the app want to know if the saved draft belongs to "today".
// Supported draft shapes:
// - { startedAt: number | string }
// - { date: "YYYY-MM-DD" }
export const isWorkoutDraftForToday = () => {
  const draft = getWorkoutDraft();
  if (!draft) return false;

  const pad2 = (n) => String(n).padStart(2, "0");
  const today = new Date();
  const todayYMD = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(
    today.getDate()
  )}`;

  // If stored as YYYY-MM-DD
  if (typeof draft.date === "string" && draft.date.length >= 10) {
    return draft.date.slice(0, 10) === todayYMD;
  }

  // If stored as timestamp / ISO
  const startedAt = draft.startedAt;
  if (!startedAt) return false;

  const d = new Date(startedAt);
  if (Number.isNaN(d.getTime())) return false;

  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
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

// Decide next workout type from pattern + usable programmes
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
// Settings
// =====================
export const getSettings = () => {
  const defaults = {
    weightUnit: "kg",
    colorMode: "dark", // "light" | "dark"
    colorTheme: "blue", // "blue" | "yellow" | "green" | "red"
  };

  const stored = getStorageData(STORAGE_KEYS.SETTINGS);
  if (!stored) return defaults;

  // Backwards compatible: older versions used "theme" to mean dark mode
  const legacyColorMode =
    stored.theme === "light" || stored.theme === "dark" ? stored.theme : undefined;

  return {
    ...defaults,
    ...stored,
    ...(legacyColorMode ? { colorMode: legacyColorMode } : {}),
  };
};

export const updateSettings = (updates) => {
  const settings = getSettings();
  return setStorageData(STORAGE_KEYS.SETTINGS, { ...settings, ...updates });
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
 * - only overwrites if weight increases (your original rule)
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
  incline_hammer_curls: "https://www.youtube.com/watch?v=zC3nLlEvin4",
  face_pulls: "https://www.youtube.com/watch?v=rep-qVOkqgk",
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
// Programmes Management
// =====================
export const getProgrammes = () => {
  const programmes = getStorageData(STORAGE_KEYS.PROGRAMMES);
  if (Array.isArray(programmes) && programmes.length > 0) return programmes;

  const { WORKOUT_A, WORKOUT_B } = require("../data/workoutData");
  const defaults = [WORKOUT_A, WORKOUT_B];
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
// Exercises (SAFE catalogue rebuild)
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

  const add = (ex) => {
    if (!ex?.id) return;
    const id = normalizeId(ex.id);
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

export const saveExercise = (exercise) => {
  const id = normalizeId(exercise?.id);
  if (!id) return false;

  // --- 1) Save exercise into catalogue (but don't trust assignedTo as source of truth)
  const exercises = getStorageData(STORAGE_KEYS.EXERCISES) || [];
  const idx = exercises.findIndex((e) => normalizeId(e.id) === id);

  if (idx !== -1) {
    const prev = exercises[idx];
    exercises[idx] = {
      ...prev,
      ...exercise,
      id,
      hidden: typeof exercise.hidden === "boolean" ? exercise.hidden : prev.hidden,
    };
  } else {
    exercises.push({ ...exercise, id });
  }

// ✅ Coerce numeric fields (prevents "" / strings breaking saves)
  const setsNum = Number(exercise.sets);
  exercise.sets = Number.isFinite(setsNum) && setsNum > 0 ? setsNum : 3;

  const restNum = Number(exercise.restTime);
  exercise.restTime = Number.isFinite(restNum) && restNum > 0 ? restNum : 120;

  // ✅ Ensure goalReps is a clean number array
  const rawGoalReps = Array.isArray(exercise.goalReps) ? exercise.goalReps : [];
  const cleanedGoalReps = rawGoalReps
    .map((x) => (x === "" || x == null ? null : Number(x)))
    .filter((n) => Number.isFinite(n) && n > 0);
  exercise.goalReps = cleanedGoalReps.length ? cleanedGoalReps : [8, 10, 12];

  // ✅ Update the exercise inside programmes too
  syncExerciseFieldsIntoProgrammes(exercise);
  
  // --- 2) IMPORTANT: sync programmes based on exercise.assignedTo
  // Programmes are the source of truth for assignments.
  const assignedTo = Array.isArray(exercise.assignedTo) ? exercise.assignedTo : [];
  syncExerciseAssignmentsToProgrammes({ ...exercise, id, assignedTo });

  // --- 3) Persist exercises and rebuild catalogue (so assignedTo is re-derived cleanly)
  setStorageData(STORAGE_KEYS.EXERCISES, exercises);

  // Rebuild catalogue so assignments are consistent everywhere
  const programmes = getProgrammes();
  const merged = rebuildExerciseCatalogue(programmes, exercises);
  setStorageData(STORAGE_KEYS.EXERCISES, merged);

  return true;
};

export const deleteExercise = (id) => {
  const exercises = getStorageData(STORAGE_KEYS.EXERCISES) || [];
  const filtered = exercises.filter(
    (e) => normalizeId(e.id) !== normalizeId(id)
  );
  return setStorageData(STORAGE_KEYS.EXERCISES, filtered);
};

// Sync Exercise Assignment to Programme Helper
function syncExerciseAssignmentsToProgrammes(exercise) {
  const programmes = getProgrammes();
  const id = normalizeId(exercise.id);
  if (!id) return;

  const wantTypes = new Set((exercise.assignedTo || []).map((t) => String(t).toUpperCase()));

  const updated = programmes.map((p) => {
    const type = String(p.type).toUpperCase();
    const list = Array.isArray(p.exercises) ? [...p.exercises] : [];

    const has = list.some((ex) => normalizeId(ex?.id) === id);
    const shouldHave = wantTypes.has(type);

    // If programme should contain exercise, add it (with sensible fields)
    if (shouldHave && !has) {
      list.push({
        id,
        name: exercise.name,
        sets: exercise.sets ?? 3,
        repScheme: exercise.repScheme ?? "RPT",
        goalReps: Array.isArray(exercise.goalReps) ? exercise.goalReps : [8, 10, 12],
        restTime: exercise.restTime ?? 120,
        notes: exercise.notes ?? "",
      });
    }

    // If programme should NOT contain exercise, remove it
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

      // Update core fields used on Home/Programme screens
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

  const headers = ["Date", "Workout", "Exercise", "Set", "Weight", "Reps", "Notes"];
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
    if (data.videoLinks) setStorageData(STORAGE_KEYS.VIDEO_LINKS, data.videoLinks);
    if (Array.isArray(data.programmes))
      setStorageData(STORAGE_KEYS.PROGRAMMES, data.programmes);
    if (Array.isArray(data.exercises))
      setStorageData(STORAGE_KEYS.EXERCISES, data.exercises);
    if (data.progressionSettings)
      setStorageData(STORAGE_KEYS.PROGRESSION_SETTINGS, data.progressionSettings);

    if (data.workoutPattern != null) {
      setStorageData(STORAGE_KEYS.WORKOUT_PATTERN, data.workoutPattern);
    }
    if (data.workoutPatternIndex != null) {
      setStorageData(STORAGE_KEYS.WORKOUT_PATTERN_INDEX, data.workoutPatternIndex);
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
    // 1) Backup
    const backupJson = exportAllDataToJSON();
    if (!backupJson) return { success: false, error: "Backup failed." };

    // 2) Reset
    const resetOk = await resetAllLocalData();
    if (!resetOk) return { success: false, error: "Reset failed." };

    // 3) Restore
    const result = importAllDataFromJSON(backupJson, options);
    if (!result?.success) return result;

    // 4) Reload (so UI refreshes from storage)
    window.location.reload();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
