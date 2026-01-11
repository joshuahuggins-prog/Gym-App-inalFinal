// LocalStorage utility functions for workout data

const STORAGE_VERSION = 4; // use integers for migrations
const STORAGE_VERSION_KEY = "gym_storage_version";

export const initStorage = () => {
  try {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    const version = storedVersion ? parseInt(storedVersion, 10) : 0;

    // ===== Migration to v5 =====
    if (version < 5) {
      const programmes = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.PROGRAMMES) || "null"
      );
      const exercises = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.EXERCISES) || "null"
      );

      // Only run if both exist
      if (Array.isArray(programmes) && Array.isArray(exercises)) {
        const deadliftId = "db_romanian_deadlifts";

        // 1) Replace seated cable rows -> deadlifts in programmes
        const updatedProgrammes = replaceExerciseInProgrammes(
          programmes,
          "seated_cable_rows",
          {
            id: deadliftId,
            name: "DB Romanian Deadlifts",
            notes: "Hip hinge, dumbbells, slight knee bend",
          }
        );

        localStorage.setItem(
          STORAGE_KEYS.PROGRAMMES,
          JSON.stringify(updatedProgrammes)
        );

        // 2) Ensure deadlifts exists in exercise catalogue
        const hasDeadlifts = exercises.some((e) => e?.id === deadliftId);
        let updatedExercises = exercises;

        if (!hasDeadlifts) {
          updatedExercises = [
            ...exercises,
            {
              id: deadliftId,
              name: "DB Romanian Deadlifts",
              sets: 3,
              repScheme: "RPT",
              goalReps: [6, 8, 10],
              restTime: 120,
              notes: "Hip hinge, dumbbells, slight knee bend",
              assignedTo: ["B"],
              hidden: false,
            },
          ];
        }

        // 3) Auto-hide unused exercises AFTER replacement
        const migrated = autoHideUnusedCatalogueExercises({
          programmes: updatedProgrammes,
          exercises: updatedExercises,
        });

        localStorage.setItem(
          STORAGE_KEYS.EXERCISES,
          JSON.stringify(migrated.exercises)
        );

        // 4) Ensure video link exists (optional)
        const videoLinks =
          JSON.parse(localStorage.getItem(STORAGE_KEYS.VIDEO_LINKS) || "null") ||
          {};
        if (!videoLinks[deadliftId]) {
          videoLinks[deadliftId] =
            "https://www.youtube.com/watch?v=hQgFixeXdZo";
          localStorage.setItem(
            STORAGE_KEYS.VIDEO_LINKS,
            JSON.stringify(videoLinks)
          );
        }
      }
    }

    // Save current version
    localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION.toString());
  } catch (e) {
    console.error("Storage init failed", e);
  }
};

const STORAGE_KEYS = {
  WORKOUTS: 'gym_workouts',
  WORKOUT_DRAFT: 'gym_workout_draft',
  SETTINGS: 'gym_settings',
  BODY_WEIGHT: 'gym_body_weight',
  PERSONAL_RECORDS: 'gym_personal_records',
  VIDEO_LINKS: 'gym_video_links',
  PROGRAMMES: 'gym_programmes',
  EXERCISES: 'gym_exercises',
  PROGRESSION_SETTINGS: 'gym_progression_settings',
  WORKOUT_PATTERN: "gym_workout_pattern",
  WORKOUT_PATTERN_INDEX: "gym_workout_pattern_index",
  SCHEMA_VERSION: 
'gym_schema_version'
};

// ===== Workout draft helpers (protects unsaved workout data on refresh) =====

const getLocalDateKey = (d = new Date()) => {
  // en-CA gives YYYY-MM-DD
  try {
    return d.toLocaleDateString('en-CA');
  } catch {
    // Fallback
    return d.toISOString().slice(0, 10);
  }
};

export const getWorkoutDraft = () => {
  return getStorageData(STORAGE_KEYS.WORKOUT_DRAFT);
};

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
    console.error('Error clearing workout draft', e);
    return false;
  }
};

export const isWorkoutDraftForToday = (draft) => {
  if (!draft) return false;
  const todayKey = getLocalDateKey();
  return draft.dateKey === todayKey;
};

// Get data from localStorage
export const getStorageData = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return null;
  }
};

export const getWorkoutPattern = () => {
  // Default pattern if user never sets one
  return getStorageData(STORAGE_KEYS.WORKOUT_PATTERN) || "A,B";
};

export const setWorkoutPattern = (patternString) => {
  // Store raw string (we validate elsewhere too)
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
  return getProgrammes().filter((p) => Array.isArray(p.exercises) && p.exercises.length > 0);
};

// Shared helper: compute the safe pattern list based on usable programme types
const getResolvedPatternList = () => {
  const usable = getUsableProgrammes();
  if (usable.length === 0) return [];

  const usableTypes = new Set(usable.map((p) => String(p.type).toUpperCase()));
  const patternStr = getWorkoutPattern();
  const pattern = parseWorkoutPattern(patternStr);

  // If pattern empty, fall back to alphabetical usable types
  const safePattern = pattern.length > 0 ? pattern : Array.from(usableTypes).sort();
  // Filter pattern to only usable types
  const filtered = safePattern.filter((t) => usableTypes.has(t));
  // If user entered only invalid letters, fall back again
  const finalPattern = filtered.length > 0 ? filtered : Array.from(usableTypes).sort();

  return finalPattern;
};

// Read next workout type WITHOUT advancing the pattern index.
// This prevents refreshes / reloads from accidentally moving the programme on.
export const peekNextWorkoutTypeFromPattern = () => {
  const finalPattern = getResolvedPatternList();
  if (finalPattern.length === 0) return null;

  const i = getWorkoutPatternIndex() % finalPattern.length;
  return finalPattern[i];
};

// Advance the pattern index by one step.
// Call this ONLY when the user completes (Save & Finish) a workout.
export const advanceWorkoutPatternIndex = () => {
  const finalPattern = getResolvedPatternList();
  if (finalPattern.length === 0) return false;

  const i = getWorkoutPatternIndex() % finalPattern.length;
  setWorkoutPatternIndex((i + 1) % finalPattern.length);
  return true;
};

// Backwards-compatible helper: returns next type AND advances index.
export const getNextWorkoutTypeFromPattern = () => {
  const next = peekNextWorkoutTypeFromPattern();
  if (!next) return null;
  advanceWorkoutPatternIndex();
  return next;
};


// Set data to localStorage
export const setStorageData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    return false;
  }
};

// Workout Sessions
export const getWorkouts = () => {
  return getStorageData(STORAGE_KEYS.WORKOUTS) || [];
};

export const saveWorkout = (workout) => {
  const workouts = getWorkouts();
  const newWorkout = {
    ...workout,
    id: workout.id || Date.now().toString(),
    date: workout.date || new Date().toISOString()
  };
  workouts.unshift(newWorkout);
  return setStorageData(STORAGE_KEYS.WORKOUTS, workouts);
};

export const updateWorkout = (id, updates) => {
  const workouts = getWorkouts();
  const index = workouts.findIndex(w => w.id === id);
  if (index !== -1) {
    workouts[index] = { ...workouts[index], ...updates };
    return setStorageData(STORAGE_KEYS.WORKOUTS, workouts);
  }
  return false;
};

export const deleteWorkout = (id) => {
  const workouts = getWorkouts();
  const filtered = workouts.filter(w => w.id !== id);
  return setStorageData(STORAGE_KEYS.WORKOUTS, filtered);
};

// Settings
export const getSettings = () => {
  return getStorageData(STORAGE_KEYS.SETTINGS) || {
    weightUnit: 'lbs',
    theme: 'dark'
  };
};

export const updateSettings = (updates) => {
  const settings = getSettings();
  return setStorageData(STORAGE_KEYS.SETTINGS, { ...settings, ...updates });
};

// Body Weight Tracking
export const getBodyWeights = () => {
  return getStorageData(STORAGE_KEYS.BODY_WEIGHT) || [];
};

export const addBodyWeight = (weight, note = '') => {
  const weights = getBodyWeights();
  const newEntry = {
    id: Date.now().toString(),
    weight,
    note,
    date: new Date().toISOString()
  };
  weights.unshift(newEntry);
  return setStorageData(STORAGE_KEYS.BODY_WEIGHT, weights);
};

export const deleteBodyWeight = (id) => {
  const weights = getBodyWeights();
  const filtered = weights.filter(w => w.id !== id);
  return setStorageData(STORAGE_KEYS.BODY_WEIGHT, filtered);
};

// Personal Records
export const getPersonalRecords = () => {
  return getStorageData(STORAGE_KEYS.PERSONAL_RECORDS) || {};
};

export const updatePersonalRecord = (exerciseName, weight, reps, date) => {
  const prs = getPersonalRecords();
  const key = exerciseName.toLowerCase().replace(/\s+/g, '_');
  
  if (!prs[key] || weight > prs[key].weight) {
    prs[key] = {
      exerciseName,
      weight,
      reps,
      date: date || new Date().toISOString(),
      previousWeight: prs[key]?.weight || null
    };
    setStorageData(STORAGE_KEYS.PERSONAL_RECORDS, prs);
    return true;
  }
  return false;
};

// Video Links
export const getVideoLinks = () => {
  return getStorageData(STORAGE_KEYS.VIDEO_LINKS) || getDefaultVideoLinks();
};

export const updateVideoLink = (exerciseName, url) => {
  const links = getVideoLinks();
  const key = exerciseName.toLowerCase().replace(/\s+/g, '_');
  links[key] = url;
  return setStorageData(STORAGE_KEYS.VIDEO_LINKS, links);
};

// Default video links
const getDefaultVideoLinks = () => ({
  'weighted_dips': 'https://www.youtube.com/watch?v=2z8JmcrW-As',
  'incline_db_bench': 'https://www.youtube.com/watch?v=8iPEnn-ltC8',
  'flat_db_bench': 'https://www.youtube.com/watch?v=VmB1G1K7v94',
  'overhead_press': 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
  'lateral_raises': 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
  'triceps_pushdowns': 'https://www.youtube.com/watch?v=-xa-6cQaZKY',
  'weighted_chinups': 'https://www.youtube.com/watch?v=bZ6Ysk9jf6E',
  'db_romanian_deadlifts': 'https://www.youtube.com/watch?v=hQgFixeXdZo?si',
  'bulgarian_split_squats': 'https://www.youtube.com/watch?v=2C-uNgKwPLE',
  'incline_hammer_curls': 'https://www.youtube.com/watch?v=zC3nLlEvin4',
  'face_pulls': 'https://www.youtube.com/watch?v=rep-qVOkqgk'
});

// Programmes Management
export const getProgrammes = () => {
  const programmes = getStorageData(STORAGE_KEYS.PROGRAMMES);
  if (!programmes || programmes.length === 0) {
    // Initialize with default programmes from workoutData
    const { WORKOUT_A, WORKOUT_B } = require('../data/workoutData');
    const defaultProgrammes = [WORKOUT_A, WORKOUT_B];
    setStorageData(STORAGE_KEYS.PROGRAMMES, defaultProgrammes);
    return defaultProgrammes;
  }
  return programmes;
};

export const saveProgramme = (programme) => {
  const programmes = getProgrammes();
  const existing = programmes.find(p => p.type === programme.type);
  
  if (existing) {
    const updated = programmes.map(p => p.type === programme.type ? programme : p);
    return setStorageData(STORAGE_KEYS.PROGRAMMES, updated);
  } else {
    programmes.push(programme);
    return setStorageData(STORAGE_KEYS.PROGRAMMES, programmes);
  }
};

export const deleteProgramme = (type) => {
  const programmes = getProgrammes();
  const filtered = programmes.filter(p => p.type !== type);
  return setStorageData(STORAGE_KEYS.PROGRAMMES, filtered);
};

// Exercises Management
export const getExercises = () => {
  const exercises = getStorageData(STORAGE_KEYS.EXERCISES);
  if (!exercises || exercises.length === 0) {
    // Initialize with default exercises
    const programmes = getProgrammes();
    const allExercises = [];
    
    programmes.forEach(prog => {
      prog.exercises.forEach(ex => {
        if (!allExercises.find(e => e.id === ex.id)) {
          allExercises.push({
            ...ex,
            assignedTo: [prog.type]
          });
        } else {
          const existing = allExercises.find(e => e.id === ex.id);
          if (!existing.assignedTo.includes(prog.type)) {
            existing.assignedTo.push(prog.type);
          }
        }
      });
    });
    
    setStorageData(STORAGE_KEYS.EXERCISES, allExercises);
    return allExercises;
  }
  return exercises;
};

export const saveExercise = (exercise) => {
  const exercises = getExercises().filter(e => !e.hidden);
  const existing = exercises.find(e => e.id === exercise.id);
  
  if (existing) {
    const updated = exercises.map(e => e.id === exercise.id ? exercise : e);
    return setStorageData(STORAGE_KEYS.EXERCISES, updated);
  } else {
    exercises.push(exercise);
    return setStorageData(STORAGE_KEYS.EXERCISES, exercises);
  }
};

export const deleteExercise = (id) => {
  const exercises = getExercises();
  const filtered = exercises.filter(e => e.id !== id);
  return setStorageData(STORAGE_KEYS.EXERCISES, filtered);
};

// Progression Settings
export const getProgressionSettings = () => {
  return getStorageData(STORAGE_KEYS.PROGRESSION_SETTINGS) || {
    globalIncrementLbs: 5,
    globalIncrementKg: 2.5,
    rptSet2Percentage: 90,
    rptSet3Percentage: 80,
    exerciseSpecific: {}
  };
};

export const updateProgressionSettings = (settings) => {
  return setStorageData(STORAGE_KEYS.PROGRESSION_SETTINGS, settings);
};

// Export/Import CSV
export const exportToCSV = () => {
  const workouts = getWorkouts();
  if (workouts.length === 0) return null;
  
  const headers = ['Date', 'Workout', 'Exercise', 'Set', 'Weight', 'Reps', 'Notes'];
  const rows = [];
  
  workouts.forEach(workout => {
    workout.exercises.forEach(exercise => {
      exercise.sets.forEach((set, index) => {
        rows.push([
          new Date(workout.date).toLocaleDateString(),
          workout.type,
          exercise.name,
          index + 1,
          set.weight || '',
          set.reps || '',
          exercise.notes || ''
        ]);
      });
    });
  });
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return csv;
};

export const importFromCSV = (csvText) => {
  try {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, error: 'CSV file is empty or invalid' };
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['Date', 'Workout', 'Exercise', 'Set', 'Weight', 'Reps'];
    
    const hasAllHeaders = requiredHeaders.every(h => headers.includes(h));
    if (!hasAllHeaders) {
      return {
        success: false,
        error: `Missing required headers. Expected: ${requiredHeaders.join(', ')}`
      };
    }
    
    const workoutMap = new Map();
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 6) {
        errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }
      
      const [date, workoutType, exercise, set, weight, reps, notes = ''] = values;
      
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
          exercises: []
        });
      }
      
      const workout = workoutMap.get(workoutKey);
      let exerciseObj = workout.exercises.find(e => e.name === exercise);
      
      if (!exerciseObj) {
        exerciseObj = {
          name: exercise,
          sets: [],
          notes: notes
        };
        workout.exercises.push(exerciseObj);
      }
      
      exerciseObj.sets.push({
        weight: parseFloat(weight) || 0,
        reps: parseInt(reps) || 0,
        completed: true
      });
    }
    
    const workouts = Array.from(workoutMap.values());
    const existing = getWorkouts();
    const combined = [...workouts, ...existing];
    
    setStorageData(STORAGE_KEYS.WORKOUTS, combined);
    
    return {
      success: true,
      imported: workouts.length,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV: ${error.message}`
    };
  }
};
export const resetAllLocalData = async () => {
  try {
    // Remove only your app’s localStorage keys
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));

    // Clear Service Worker caches (if supported)
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
// ===== Full backup Export/Import (JSON) =====

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
        // include these only if you already created them:
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
    if (Array.isArray(data.exercises)) setStorageData(STORAGE_KEYS.EXERCISES, data.exercises);
    if (data.progressionSettings)
      setStorageData(STORAGE_KEYS.PROGRESSION_SETTINGS, data.progressionSettings);

    // Optional pattern restore (only if your STORAGE_KEYS contains these)
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
const normalize = (s) => (s || "").toString().trim().toLowerCase();

const autoHideUnusedCatalogueExercises = (data) => {
  if (!data || !Array.isArray(data.exercises)) return data;

  // Build set of active IDs from programmes
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
    // 1) Backup current data
    const backupJson = exportAllDataToJSON();
    if (!backupJson) return { success: false, error: "Backup failed." };

    // 2) Reset all local data (localStorage + caches)
    const resetOk = await resetAllLocalData();
    if (!resetOk) return { success: false, error: "Reset failed." };

    // 3) Restore from backup immediately
    const result = importAllDataFromJSON(backupJson, options);
    if (!result?.success) return result;

    // 4) Optional: force reload so UI uses fresh state
    window.location.reload();

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
export default STORAGE_KEYS;
