// src/utils/workoutBuilder.js

const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * Convert a saved workout "sets" array into the app's live UI setsData format.
 * Saved format: [{ weight, reps, completed, ... }]
 * UI format:   [{ weight, reps, completed }]
 */
const savedSetsToSetsData = (savedSets) => {
  if (!Array.isArray(savedSets)) return [];
  return savedSets.map((s) => ({
    weight: toNum(s?.weight, 0),
    reps: clampInt(toNum(s?.reps, 0), 0, 999),
    completed: !!s?.completed,
  }));
};

/**
 * Ensure setsData has exactly `count` items.
 * - Keep existing items where possible
 * - Pad with blanks
 * - Trim extras
 */
const normalizeSetsData = (setsData, count) => {
  const c = clampInt(toNum(count, 3), 1, 12);
  const base = Array.isArray(setsData) ? setsData.slice(0, c) : [];

  while (base.length < c) {
    base.push({ weight: 0, reps: 0, completed: false });
  }

  // ensure shape
  return base.map((s) => ({
    weight: toNum(s?.weight, 0),
    reps: clampInt(toNum(s?.reps, 0), 0, 999),
    completed: !!s?.completed,
  }));
};

/**
 * Ensure goalReps matches sets count.
 */
const normalizeGoalReps = (goalReps, count) => {
  const c = clampInt(toNum(count, 3), 1, 12);
  let arr = Array.isArray(goalReps) ? goalReps.slice() : [];
  if (arr.length === 0) arr = [8];

  // sanitize
  arr = arr.map((r) => {
    const n = toNum(r, 8);
    if (!Number.isFinite(n) || n <= 0) return 8;
    return clampInt(n, 1, 200);
  });

  if (arr.length < c) {
    arr = [...arr, ...Array.from({ length: c - arr.length }, () => 8)];
  } else if (arr.length > c) {
    arr = arr.slice(0, c);
  }
  return arr;
};

/**
 * Build editable exercise rows for a workout:
 * - Uses programme template for correct exercise list + correct set count
 * - Overlays saved workout values (weight/reps/completed/notes)
 * - Always returns setsData with EXACT number of sets (template sets)
 */
export const buildWorkoutExerciseRows = ({
  workout,
  programme,
  catalogueExercises = [],
}) => {
  if (!workout) return [];

  const templateExercises =
    (programme?.exercises && Array.isArray(programme.exercises) && programme.exercises.length > 0)
      ? programme.exercises
      : workout.exercises || [];

  // saved workout map by id, fallback by name
  const savedById = new Map();
  const savedByName = new Map();
  (workout.exercises || []).forEach((ex) => {
    if (ex?.id) savedById.set(String(ex.id), ex);
    if (ex?.name) savedByName.set(String(ex.name).toLowerCase(), ex);
  });

  // catalogue map (optional)
  const catById = new Map();
  (catalogueExercises || []).forEach((ex) => {
    if (ex?.id) catById.set(String(ex.id), ex);
  });

  return templateExercises.map((tmpl) => {
    const id = tmpl?.id ? String(tmpl.id) : "";
    const nameKey = String(tmpl?.name || "").toLowerCase();

    const saved = (id && savedById.get(id)) || savedByName.get(nameKey) || null;
    const cat = (id && catById.get(id)) || null;

    const setsCount = clampInt(toNum(tmpl?.sets ?? cat?.sets ?? saved?.sets?.length ?? 3, 3), 1, 12);

    const goalReps = normalizeGoalReps(
      tmpl?.goalReps ?? cat?.goalReps ?? [],
      setsCount
    );

    const baseSetsData = saved
      ? savedSetsToSetsData(saved.sets)
      : [];

    const setsData = normalizeSetsData(baseSetsData, setsCount);

    return {
      id: id || saved?.id || `exercise_${Date.now()}`,
      name: tmpl?.name || saved?.name || cat?.name || id,
      repScheme: tmpl?.repScheme || saved?.repScheme || cat?.repScheme || "RPT",
      sets: setsCount,
      goalReps,
      restTime: tmpl?.restTime ?? cat?.restTime ?? 120,
      notes: tmpl?.notes ?? cat?.notes ?? "",
      // This is the key thing the cards read/write:
      setsData,
      // user notes on the workout exercise
      userNotes: saved?.notes || "",
      lastWorkoutData: null,
    };
  });
};