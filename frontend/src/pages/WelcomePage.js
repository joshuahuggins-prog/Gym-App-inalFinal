// src/pages/WelcomePage.js
import React, { useMemo } from "react";
import AppHeader from "../components/AppHeader";
import { Calendar, Flame, Dumbbell } from "lucide-react";
import { Badge } from "../components/ui/badge";

import {
  getWorkouts,
  getProgrammes,
  getWorkoutDraft,
  isWorkoutDraftForToday,
  peekNextWorkoutTypeFromPattern,
} from "../utils/storage";

import { ALL_TIPS } from "../utils/welcomeTips";

// ---------------------------
// Helpers
// ---------------------------
const upper = (s) => String(s || "").toUpperCase();

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

// Same as HomePage: A/B flip based on most recent saved workout
const getNextWorkoutTypeFromHistoryAB = () => {
  const workouts = getWorkouts();
  const lastType = workouts?.[0]?.type ? upper(workouts[0].type) : null;
  if (!lastType) return null;
  if (lastType === "A") return "B";
  if (lastType === "B") return "A";
  return null;
};

export default function WelcomePage({ onStartToday }) {
  const workouts = useMemo(() => getWorkouts() || [], []);
  const programmes = useMemo(() => getProgrammes() || [], []);

  // Random tip shown under title bar (actions area)
  const tip = useMemo(() => {
    if (!ALL_TIPS.length) return "";
    return ALL_TIPS[Math.floor(Math.random() * ALL_TIPS.length)];
  }, []);

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

    // Sort descending
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
    const d = new Date(workouts[0].date);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
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
    >
      <div className="p-4 space-y-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flame className="w-5 h-5" />
              Monthly streak
            </div>
            <div className="mt-2 text-3xl font-bold">
              {monthlyStreak} month{monthlyStreak === 1 ? "" : "s"}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-5 h-5" />
              Last trained
            </div>
            <div className="mt-2 text-3xl font-bold">{lastTrained}</div>
          </div>
        </div>

        {/* Next workout card */}
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

          {/* Simple CTA to start Today */}
          <div className="mt-4">
            <button
              onClick={onStartToday}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold active:scale-[0.99] transition-transform"
            >
              Start today’s workout
            </button>
          </div>
        </div>
      </div>
    </AppHeader>
  );
}