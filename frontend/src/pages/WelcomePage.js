import React, { useMemo } from "react";
import AppHeader from "../components/AppHeader";
import { Flame, Dumbbell, TrendingUp, AlertTriangle } from "lucide-react";
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
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
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

const getNextWorkoutTypeFromHistoryAB = () => {
  const workouts = getWorkouts();
  const lastType = workouts?.[0]?.type ? upper(workouts[0].type) : null;
  if (!lastType) return null;
  if (lastType === "A") return "B";
  if (lastType === "B") return "A";
  return null;
};

const getWeightUnit = () => {
  const s = getSettings?.() || {};
  return s.weightUnit || "kg";
};

const getSetWeight = (setObj) => {
  if (!setObj) return null;
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
  if (!exEntry) return null;
  const sets = Array.isArray(exEntry.sets) ? exEntry.sets : [];
  let best = null;
  for (const s of sets) {
    const w = getSetWeight(s);
    if (w === null) continue;
    if (best === null || w > best) best = w;
  }
  return best;
};

const getExerciseKey = (exEntry) =>
  exEntry?.exerciseId || exEntry?.id || exEntry?.exercise || exEntry?.name || "";

const getExerciseName = (exEntry) =>
  exEntry?.name || exEntry?.exerciseName || exEntry?.exercise || "Exercise";

/**
 * Progress calculation:
 * - bigDelta  = last − previous
 * - allDelta  = last − first
 */
const computeExerciseProgress = (workouts) => {
  const list = Array.isArray(workouts) ? [...workouts] : [];
  list.sort((a, b) => new Date(a.date) - new Date(b.date));

  const map = new Map();

  for (const w of list) {
    const type = w?.type ? upper(w.type) : "";
    for (const ex of w.exercises || []) {
      const key = getExerciseKey(ex);
      if (!key) continue;

      const best = getBestWeightFromExerciseEntry(ex);
      if (best === null) continue;

      const name = getExerciseName(ex);
      const entry = map.get(key) || {
        key,
        name,
        values: [],
        workoutType: type,
      };

      entry.values.push(best);
      entry.workoutType = type;
      map.set(key, entry);
    }
  }

  const rows = [];
  for (const v of map.values()) {
    if (v.values.length < 2) continue;

    const first = v.values[0];
    const last = v.values[v.values.length - 1];
    const prev = v.values[v.values.length - 2];

    const bigDelta = safeNum(last) - safeNum(prev);
    const allDelta = safeNum(last) - safeNum(first);

    if (!Number.isFinite(bigDelta) && !Number.isFinite(allDelta)) continue;

    rows.push({
      key: v.key,
      name: v.name,
      bigDelta,
      allDelta,
      workoutType: v.workoutType,
    });
  }

  rows.sort((a, b) => (b.bigDelta || 0) - (a.bigDelta || 0));
  return rows;
};

const moodForCount = (n) => {
  const c = Math.max(0, Math.min(7, Number(n) || 0));
  if (c === 0) return "😔";
  if (c === 1) return "🙂";
  if (c === 2) return "😄";
  if (c === 3) return "😁";
  if (c === 4) return "🤩";
  if (c === 5) return "🥳";
  if (c === 6) return "🤪";
  return "👽";
};

// ---------------------------
// WelcomePage
// ---------------------------
export default function WelcomePage({ onStartToday }) {
  const workouts = useMemo(() => getWorkouts() || [], []);
  const programmes = useMemo(() => getProgrammes() || [], []);
  const weightUnit = useMemo(() => getWeightUnit(), []);

  const appLogoSrc = `${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`;

  const tip = useMemo(() => {
    if (!ALL_TIPS.length) return "";
    return ALL_TIPS[Math.floor(Math.random() * ALL_TIPS.length)];
  }, []);

  const weeklyStreak = useMemo(() => {
    const weeks = new Set();
    for (const w of workouts) {
      const d = new Date(w.date);
      if (!Number.isNaN(d.getTime())) {
        weeks.add(startOfWeekMonday(d).toISOString().slice(0, 10));
      }
    }

    let streak = 0;
    let cursor = startOfWeekMonday(new Date());
    while (weeks.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    }
    return streak;
  }, [workouts]);

  const monthlyStreak = useMemo(() => {
    const months = new Set();
    for (const w of workouts) {
      const d = new Date(w.date);
      if (!Number.isNaN(d.getTime())) months.add(getMonthKey(d));
    }

    let streak = 0;
    let cursor = new Date();
    while (months.has(getMonthKey(cursor))) {
      streak++;
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return streak;
  }, [workouts]);

  const workoutsThisWeek = useMemo(() => {
    const start = startOfWeekMonday(new Date());
    return workouts.filter((w) => new Date(w.date) >= start).length;
  }, [workouts]);

  const mood = useMemo(() => moodForCount(workoutsThisWeek), [workoutsThisWeek]);

  const lastTrained = useMemo(
    () => (workouts.length ? formatShortDate(workouts[0].date) : "—"),
    [workouts]
  );

  const usableProgrammes = useMemo(
    () => programmes.filter((p) => p.exercises?.length),
    [programmes]
  );

  const nextWorkout = useMemo(() => {
    const draft = getWorkoutDraft();
    const draftType = draft?.workoutType || draft?.type;
    const nextType =
      (isWorkoutDraftForToday(draft) && draftType) ||
      getNextWorkoutTypeFromHistoryAB() ||
      peekNextWorkoutTypeFromPattern();

    return (
      usableProgrammes.find((p) => upper(p.type) === upper(nextType)) ||
      usableProgrammes[0] ||
      null
    );
  }, [usableProgrammes, workouts]);

  const progressRows = useMemo(
    () => computeExerciseProgress(workouts),
    [workouts]
  );

  const mostProgress = progressRows.filter((r) => r.bigDelta > 0).slice(0, 2);
  const needsAttention = progressRows
    .filter((r) => r.bigDelta < 0)
    .sort((a, b) => a.bigDelta - b.bigDelta)
    .slice(0, 2);

  const actions = tip ? (
    <div className="px-4 py-2">
      <div className="rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground italic">
        “{tip}”
      </div>
    </div>
  ) : null;

  return (
    <AppHeader
      title="Overview"
      subtitle="Your training at a glance"
      actions={actions}
      rightIconSrc={appLogoSrc}
    >
      <div className="p-4 space-y-4">
        {/* Tiles */}
        <div className="grid grid-cols-2 gap-4">
          <Tile label="Weekly streak" value={`${weeklyStreak} Weeks`} icon={<Flame className="w-5 h-5 text-orange-500" />} />
          <Tile label="Monthly streak" value={`${monthlyStreak} Months`} icon={<Flame className="w-5 h-5 text-orange-500" />} />
          <Tile label="Last trained" value={lastTrained} icon="📅" />
          <Tile label="Workouts this week" value={workoutsThisWeek} icon={mood} />
        </div>

        {/* Next workout */}
        <NextWorkoutCard workout={nextWorkout} onStartToday={onStartToday} />

        {/* Most progress */}
        <ProgressCard
          title="Most progress"
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          rows={mostProgress}
          weightUnit={weightUnit}
          positive
        />

        {/* Needs attention */}
        <ProgressCard
          title="Needs attention"
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          rows={needsAttention}
          weightUnit={weightUnit}
        />
      </div>
    </AppHeader>
  );
}

// ---------------------------
// Small UI helpers
// ---------------------------
function Tile({ label, value, icon }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-center">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-primary">{value}</div>
    </div>
  );
}

function ProgressCard({ title, icon, rows, weightUnit }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 font-semibold text-lg">
        {icon}
        {title}
      </div>

      <div className="mt-3 space-y-3">
        {rows.length ? (
          rows.map((r) => (
            <div
              key={r.key}
              className="rounded-xl bg-muted/40 p-3 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  Workout {r.workoutType || "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  All-time:{" "}
                  <span className={r.allDelta >= 0 ? "text-green-600" : "text-red-500"}>
                    {r.allDelta >= 0 ? "+" : ""}
                    {Math.round(r.allDelta * 10) / 10} {weightUnit}
                  </span>
                </div>
              </div>
              <div
                className={`font-semibold ${
                  r.bigDelta >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {r.bigDelta >= 0 ? "+" : ""}
                {Math.round(r.bigDelta * 10) / 10} {weightUnit}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">
            Not enough data yet.
          </div>
        )}
      </div>
    </div>
  );
}

function NextWorkoutCard({ workout, onStartToday }) {
  if (!workout) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg">Next workout</div>
        {workout.type && <Badge variant="secondary">{upper(workout.type)}</Badge>}
      </div>

      <div className="mt-1 text-muted-foreground">
        {workout.name || `Workout ${upper(workout.type)}`}
      </div>

      <div className="mt-3 space-y-2">
        {workout.exercises?.slice(0, 6).map((ex) => (
          <div key={ex.id || ex.name} className="flex items-center gap-2 text-sm">
            <Dumbbell className="w-4 h-4 text-muted-foreground" />
            {ex.name}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button
          onClick={onStartToday}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold"
        >
          Start today’s workout
        </button>
      </div>
    </div>
  );
}