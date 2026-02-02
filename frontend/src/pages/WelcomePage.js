// src/pages/WelcomePage.js
import React, { useMemo } from "react";
import AppHeader from "../components/AppHeader";
import { Calendar, Flame, Dumbbell, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "../components/ui/badge";

import {
  getWorkouts,
  getProgrammes,
  getWorkoutDraft,
  isWorkoutDraftForToday,
  peekNextWorkoutTypeFromPattern,
  getSettings,
} from "../utils/storage";

import { ALL_TIPS } from "../utils/welcomeTips";

// ---------------------------
// Helpers
// ---------------------------
const upper = (s) => String(s || "").toUpperCase();

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const startOfWeekMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatShortDate = (dateStrOrDate) => {
  const d = new Date(dateStrOrDate);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const getWorkoutTypeFromWorkout = (w) => {
  // your storage seems to use w.type like "A"/"B"
  return w?.type ? upper(w.type) : "";
};

// Same as HomePage style: A/B flip based on most recent saved workout
const getNextWorkoutTypeFromHistoryAB = () => {
  const workouts = getWorkouts();
  const lastType = workouts?.[0]?.type ? upper(workouts[0].type) : null;
  if (!lastType) return null;
  if (lastType === "A") return "B";
  if (lastType === "B") return "A";
  return null;
};

const getWeightUnit = () => {
  const s = (typeof getSettings === "function" && getSettings()) || {};
  // your app usually uses kg/lb
  return s.weightUnit || "kg";
};

// Extract a numeric "max weight" for a set entry (handles a few common shapes)
const getSetWeight = (setObj) => {
  if (!setObj) return null;

  // common keys you might have used
  const candidates = [
    setObj.weight,
    setObj.w,
    setObj.load,
    setObj.kg,
    setObj.lbs,
    setObj.value,
  ];

  for (const c of candidates) {
    const n = safeNum(c);
    if (n !== null) return n;
  }
  return null;
};

const getBestWeightFromExerciseEntry = (exEntry) => {
  // exEntry might have sets[] or be a flat object
  if (!exEntry) return null;

  // Sometimes you store top-level weight
  const top = getSetWeight(exEntry);
  if (top !== null) return top;

  const sets = Array.isArray(exEntry.sets) ? exEntry.sets : [];
  let best = null;
  for (const s of sets) {
    const w = getSetWeight(s);
    if (w === null) continue;
    if (best === null || w > best) best = w;
  }
  return best;
};

const getExerciseKey = (exEntry) => {
  // Prefer stable IDs if present
  return (
    exEntry?.exerciseId ||
    exEntry?.id ||
    exEntry?.exercise ||
    exEntry?.name ||
    ""
  );
};

const getExerciseName = (exEntry) => {
  return exEntry?.name || exEntry?.exerciseName || exEntry?.exercise || "Exercise";
};

// Compute per-exercise progress: latest best weight - earliest best weight
const computeExerciseProgressAllTime = (workouts) => {
  // workouts assumed newest-first in your app, but handle either way
  const list = Array.isArray(workouts) ? [...workouts] : [];
  list.sort((a, b) => new Date(a.date) - new Date(b.date)); // oldest -> newest

  const map = new Map(); // key -> { name, first, last, firstType, lastType }
  for (const w of list) {
    const type = getWorkoutTypeFromWorkout(w);
    const exs = Array.isArray(w.exercises) ? w.exercises : [];

    for (const ex of exs) {
      const key = getExerciseKey(ex);
      if (!key) continue;

      const best = getBestWeightFromExerciseEntry(ex);
      if (best === null) continue;

      const name = getExerciseName(ex);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          name,
          first: best,
          last: best,
          firstType: type,
          lastType: type,
        });
      } else {
        // update last every time as we move forward in time
        existing.last = best;
        existing.lastType = type;
        // keep existing.first as earliest seen
      }
    }
  }

  const rows = [];
  for (const v of map.values()) {
    const delta = safeNum(v.last) - safeNum(v.first);
    if (!Number.isFinite(delta)) continue;
    rows.push({
      key: v.key,
      name: v.name,
      delta,
      workoutType: v.lastType || v.firstType || "",
    });
  }

  // Sort by delta descending
  rows.sort((a, b) => b.delta - a.delta);
  return rows;
};

// ---------------------------
// WelcomePage
// ---------------------------
export default function WelcomePage({ onStartToday }) {
  const workouts = useMemo(() => getWorkouts() || [], []);
  const programmes = useMemo(() => getProgrammes() || [], []);
  const weightUnit = useMemo(() => getWeightUnit(), []);

  // Random tip shown under title bar (actions area)
  const tip = useMemo(() => {
    if (!ALL_TIPS.length) return "";
    return ALL_TIPS[Math.floor(Math.random() * ALL_TIPS.length)];
  }, []);

  // Weekly streak (consecutive weeks with at least 1 workout)
  const weeklyStreak = useMemo(() => {
    if (!workouts.length) return 0;

    const weekKeys = new Set();
    for (const w of workouts) {
      const d = new Date(w.date);
      if (Number.isNaN(d.getTime())) continue;
      const wk = startOfWeekMonday(d).toISOString().slice(0, 10); // YYYY-MM-DD
      weekKeys.add(wk);
    }

    let streak = 0;
    let cursor = startOfWeekMonday(new Date());

    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (weekKeys.has(key)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 7);
      } else {
        break;
      }
    }

    return streak;
  }, [workouts]);

  // Monthly streak (consecutive months with at least 1 workout)
  const monthlyStreak = useMemo(() => {
    if (!workouts.length) return 0;

    const months = Array.from(
      new Set(
        workouts
          .map((w) => {
            const d = new Date(w.date);
            return Number.isNaN(d.getTime()) ? null : getMonthKey(d);
          })
          .filter(Boolean)
      )
    );

    if (!months.length) return 0;

    months.sort().reverse();

    let streak = 0;
    let cursor = new Date();

    while (true) {
      const key = getMonthKey(cursor);
      if (months.includes(key)) {
        streak += 1;
        cursor.setMonth(cursor.getMonth() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [workouts]);

  // Last trained label
  const lastTrained = useMemo(() => {
    if (!workouts.length) return "—";
    return formatShortDate(workouts[0].date);
  }, [workouts]);

  const usableProgrammes = useMemo(() => {
    return (programmes || []).filter(
      (p) => Array.isArray(p.exercises) && p.exercises.length > 0
    );
  }, [programmes]);

  // Next workout: draft wins; else history A/B; else pattern
  const nextWorkout = useMemo(() => {
    if (!usableProgrammes.length) return null;

    const draft = getWorkoutDraft();
    const draftType = draft?.workoutType || draft?.type;
    const hasTodaysDraft = isWorkoutDraftForToday(draft) && !!draftType;

    const nextType = hasTodaysDraft
      ? draftType
      : getNextWorkoutTypeFromHistoryAB() || peekNextWorkoutTypeFromPattern();

    const found =
      usableProgrammes.find((p) => upper(p.type) === upper(nextType)) ||
      usableProgrammes[0];

    return found || null;
  }, [usableProgrammes, workouts]);

  // Most progress + Needs attention (simple all-time delta)
  const progressRows = useMemo(() => computeExerciseProgressAllTime(workouts), [workouts]);

  const mostProgress = useMemo(() => {
    // top 2 positive deltas
    return progressRows.filter((r) => r.delta > 0).slice(0, 2);
  }, [progressRows]);

  const needsAttention = useMemo(() => {
    // top 2 negative deltas (most negative first)
    const neg = progressRows.filter((r) => r.delta < 0);
    neg.sort((a, b) => a.delta - b.delta); // more negative first
    return neg.slice(0, 2);
  }, [progressRows]);

  const actions = tip ? (
    <div className="px-4 py-2">
      <div className="rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground italic">
        “{tip}”
      </div>
    </div>
  ) : null;

  return (
    <AppHeader title="Overview" subtitle="Your training at a glance" actions={actions}>
      <div className="p-4 space-y-4">
        {/* 2x2 tiles */}
        <div className="grid grid-cols-2 gap-4">
          {/* Weekly streak */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flame className="w-5 h-5 text-orange-500" />
              Weekly streak
            </div>
            <div className="mt-2 text-3xl font-bold text-primary">
              {weeklyStreak} wk{weeklyStreak === 1 ? "" : "s"}
            </div>
          </div>

          {/* Monthly streak */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flame className="w-5 h-5 text-orange-500" />
              Monthly streak
            </div>
            <div className="mt-2 text-3xl font-bold text-primary">
              {monthlyStreak} mo{monthlyStreak === 1 ? "" : "s"}
            </div>
          </div>

          {/* Last trained */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-5 h-5 text-primary" />
              Last trained
            </div>
            <div className="mt-2 text-3xl font-bold text-primary">{lastTrained}</div>
          </div>

          {/* Next workout (small summary tile) */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                Next workout
              </div>
              {nextWorkout?.type ? (
                <Badge variant="secondary">{upper(nextWorkout.type)}</Badge>
              ) : null}
            </div>
            <div className="mt-2 text-base font-semibold">
              {nextWorkout?.name
                ? nextWorkout.name
                : nextWorkout?.type
                ? `Workout ${upper(nextWorkout.type)}`
                : "No programmes"}
            </div>
          </div>
        </div>

        {/* Next workout detail card */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-lg">Next workout</div>
            {nextWorkout?.type ? (
              <Badge variant="secondary">{upper(nextWorkout.type)}</Badge>
            ) : null}
          </div>

          <div className="mt-1 text-muted-foreground">
            {nextWorkout?.name
              ? nextWorkout.name
              : nextWorkout?.type
              ? `Workout ${upper(nextWorkout.type)}`
              : "No programmes yet"}
          </div>

          {Array.isArray(nextWorkout?.exercises) && nextWorkout.exercises.length ? (
            <div className="mt-3 space-y-2">
              {nextWorkout.exercises.slice(0, 6).map((ex) => (
                <div
                  key={ex.id || ex.name}
                  className="flex items-center gap-2 text-sm"
                >
                  <Dumbbell className="w-4 h-4 text-muted-foreground" />
                  {ex.name}
                </div>
              ))}
              {nextWorkout.exercises.length > 6 ? (
                <div className="text-xs text-muted-foreground">
                  + {nextWorkout.exercises.length - 6} more
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">
              Add exercises to your programmes to see them here.
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={onStartToday}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold active:scale-[0.99] transition-transform"
            >
              Start today’s workout
            </button>
          </div>
        </div>

        {/* Most progress */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Most progress
            </div>
            <Badge variant="secondary">Top</Badge>
          </div>

          <div className="mt-3 space-y-3">
            {mostProgress.length ? (
              mostProgress.map((row) => (
                <div key={row.key} className="rounded-xl bg-muted/40 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    {row.workoutType ? (
                      <div className="text-xs text-muted-foreground">
                        Workout {row.workoutType}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">—</div>
                    )}
                  </div>
                  <div className="font-semibold text-green-600">
                    +{Math.round(row.delta * 10) / 10} {weightUnit}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                Not enough data yet — log a few workouts and this will appear.
              </div>
            )}
          </div>
        </div>

        {/* Needs attention */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Needs attention
            </div>
            <Badge variant="secondary">Focus</Badge>
          </div>

          <div className="mt-3 space-y-3">
            {needsAttention.length ? (
              needsAttention.map((row) => (
                <div key={row.key} className="rounded-xl bg-muted/40 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    {row.workoutType ? (
                      <div className="text-xs text-muted-foreground">
                        Workout {row.workoutType}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">—</div>
                    )}
                  </div>
                  <div className="font-semibold text-red-500">
                    {Math.round(row.delta * 10) / 10} {weightUnit}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                Nothing flagged — keep going.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppHeader>
  );
}