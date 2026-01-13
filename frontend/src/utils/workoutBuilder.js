// src/utils/workoutBuilder.js

const norm = (s) => String(s || "").trim().toLowerCase();
const upper = (s) => String(s || "").trim().toUpperCase();

const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));

const ensureGoalReps = (goalReps, setsCount) => {
  const arr = Array.isArray(goalReps) ? goalReps.slice() : [];
  const base = arr.length ? arr : [8];

  let out = base.slice(0, setsCount);
  while (out.length < setsCount) out.push(out[out.length - 1] ?? 8);

  // clean to numbers
  out = out.map((x) => {
    const n = Number(x);
    return Number.isFinite(n) && n > 0 ? clampInt(n, 1, 200) : 8;
  });

  return out;
};

const buildCatalogueMap = (catalogue) => {
  const map = new Map();
  (catalogue || []).forEach((ex) => {
    const id = norm(ex?.id);
    if (!id) return;
    map.set(id, ex);
  });
  return map;
};

const findSavedExercise = (savedExercises, templateEx) => {
  const id = norm(templateEx?.id);
  if (id) {
    const byId = (savedExercises || []).find((e) => norm(e?.id) === id);
    if (byId) return byId;
  }
  // fallback by name for older data
  const name = norm(templateEx?.name);
  if (!name) return null;
  return (savedExercises || []).find((e) => norm(e?.name) === name) || null;
};

const resolveSetsCount = ({ templateEx, catalogueEx, savedEx }) => {
  const t = Number(templateEx?.sets);
  const c = Number(catalogueEx?.sets);
  const savedLen = Array.isArray(savedEx?.sets) ? savedEx.sets.length : 0;

  const candidate =
    (Number.isFinite(t) && t > 0 ? t : null) ??
    (Number.isFinite(c) && c > 0 ? c : null) ??
    (savedLen > 0 ? savedLen : null) ??
    3;

  return clampInt(candidate, 1, 20);
};

const getSavedSetForIndex = (savedEx, idx) => {
  const sets = Array.isArray(savedEx?.sets) ? savedEx.sets : [];
  const setNumber = idx + 1;

  // prefer explicit setNumber if present
  const byNum = sets.find((s) => Number(s?.setNumber) === setNumber);
  if (byNum) return byNum;

  // else positional
  return sets[idx] || null;
};

/**
 * Builds workoutData rows shaped like HomePage expects:
 * { ...exerciseTemplate, userNotes, setsData, lastWorkoutData }
 *
 * - ALWAYS renders full set count from template (programme/catalogue)
 * - overlays saved data into those set slots
 */
export const buildWorkoutExerciseRows = ({
  workoutType,
  programme,
  catalogueExercises,
  savedWorkout,
  lastSameWorkout, // optional (Home uses it)
}) => {
  const catalogueMap = buildCatalogueMap(catalogueExercises);

  // Template source: programme first, else saved workout structure
  const templateExercises =
    (programme && Array.isArray(programme.exercises) && programme.exercises.length > 0
      ? programme.exercises
      : Array.isArray(savedWorkout?.exercises)
      ? savedWorkout.exercises
      : []) || [];

  const savedExercises = Array.isArray(savedWorkout?.exercises) ? savedWorkout.exercises : [];

  return templateExercises.map((templateEx) => {
    const id = norm(templateEx?.id);
    const catalogueEx = id ? catalogueMap.get(id) : null;

    const savedEx = findSavedExercise(savedExercises, templateEx);

    const setsCount = resolveSetsCount({ templateEx, catalogueEx, savedEx });
    const goalReps = ensureGoalReps(templateEx?.goalReps ?? catalogueEx?.goalReps, setsCount);

    const setsData = Array.from({ length: setsCount }, (_, idx) => {
      const s = getSavedSetForIndex(savedEx, idx);
      const weight = Number(s?.weight);
      const reps = Number(s?.reps);
      const completed = !!s?.completed;

      return {
        setNumber: idx + 1,
        weight: Number.isFinite(weight) ? weight : 0,
        reps: Number.isFinite(reps) ? reps : 0,
        completed,
      };
    });

    const lastWorkoutData =
      lastSameWorkout?.exercises?.find((e) => norm(e?.id) === id || norm(e?.name) === norm(templateEx?.name)) ||
      null;

    return {
      // base template (catalogue first, then programme overrides)
      ...(catalogueEx || {}),
      ...(templateEx || {}),
      // ensure critical fields
      id: templateEx?.id || catalogueEx?.id,
      name: templateEx?.name || catalogueEx?.name || templateEx?.id || "Exercise",
      repScheme: templateEx?.repScheme || catalogueEx?.repScheme || "RPT",
      sets: setsCount,
      goalReps,
      // overlay saved user data
      userNotes: savedEx?.notes || savedEx?.userNotes || "",
      setsData,
      lastWorkoutData,
      // helpful
      _workoutType: upper(workoutType),
    };
  });
};

export const serializeWorkoutExercisesFromRows = (rows) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  return safeRows.map((ex) => {
    const rawSets = Array.isArray(ex?.setsData) ? ex.setsData : [];

    // Keep only meaningful sets (or completed ones)
    const cleanedSets = rawSets
      .map((s, idx) => ({
        setNumber: Number(s?.setNumber) || idx + 1,
        weight: Number.isFinite(Number(s?.weight)) ? Number(s.weight) : 0,
        reps: Number.isFinite(Number(s?.reps)) ? Number(s.reps) : 0,
        completed: !!s?.completed,
      }))
      .filter((s) => s.completed || s.weight !== 0 || s.reps !== 0);

    return {
      id: ex?.id,
      name: ex?.name,
      repScheme: ex?.repScheme,
      sets: cleanedSets,
      notes: ex?.userNotes || "",
    };
  });
};