// src/pages/StatsPage.js
import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

import {
  getWorkouts,
  getProgrammes,
} from "../utils/storage";

import { useSettings } from "../contexts/SettingsContext";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/**
 * Metric helpers
 */
const round1 = (n) => Math.round(n * 10) / 10;

const formatDateShort = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};

const calcE1RM = (weight, reps) => {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return 0;
  return w * (1 + r / 30); // Epley
};

const getExerciseBestForWorkoutEntry = (exerciseEntry, statsMetric) => {
  // exerciseEntry.sets = array of {weight, reps}
  const sets = Array.isArray(exerciseEntry?.sets) ? exerciseEntry.sets : [];

  if (sets.length === 0) return 0;

  if (statsMetric === "e1rm") {
    let best = 0;
    for (const s of sets) {
      const v = calcE1RM(s?.weight, s?.reps);
      if (v > best) best = v;
    }
    return best;
  }

  // default: maxWeight
  let best = 0;
  for (const s of sets) {
    const w = Number(s?.weight);
    if (Number.isFinite(w) && w > best) best = w;
  }
  return best;
};

const safeUpper = (s) => String(s || "").toUpperCase();

/**
 * Build time-series for (programmeType, exerciseId) from workouts
 */
const buildSeries = (workouts, programmeType, exerciseId, statsMetric) => {
  const type = safeUpper(programmeType);
  const id = String(exerciseId || "");

  const points = [];

  // workouts are stored newest-first in your app, but we want chronological for the chart
  const filtered = workouts
    .filter((w) => safeUpper(w?.type) === type)
    .slice()
    .sort((a, b) => new Date(a?.date).getTime() - new Date(b?.date).getTime());

  for (const w of filtered) {
    const entry = (w?.exercises || []).find((e) => e?.id === id || e?.name === id);
    if (!entry) continue;

    const value = getExerciseBestForWorkoutEntry(entry, statsMetric);
    if (value <= 0) continue;

    points.push({
      date: w.date,
      label: formatDateShort(w.date),
      value: round1(value),
      // for tooltip
      repsBest:
        statsMetric === "e1rm"
          ? (() => {
              // optional: find the set that produced the best e1rm
              let best = 0;
              let bestReps = 0;
              let bestWeight = 0;
              for (const s of entry.sets || []) {
                const v = calcE1RM(s?.weight, s?.reps);
                if (v > best) {
                  best = v;
                  bestReps = Number(s?.reps) || 0;
                  bestWeight = Number(s?.weight) || 0;
                }
              }
              return { bestWeight, bestReps };
            })()
          : null,
    });
  }

  return points;
};

/**
 * Progress scoring:
 * - Use last N points (default 4)
 * - Score = last - first
 * - Needs attention = worst score (or missing data)
 */
const computeProgressScore = (series, lookback = 4) => {
  if (!Array.isArray(series) || series.length < 2) return null;
  const slice = series.slice(-lookback);
  if (slice.length < 2) return null;
  const first = slice[0].value;
  const last = slice[slice.length - 1].value;
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  return round1(last - first);
};

const TooltipContent = ({ active, payload, label, unit, statsMetric }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="text-sm text-muted-foreground">
        {statsMetric === "e1rm" ? "e1RM" : "Max"}:{" "}
        <span className="font-semibold text-foreground">
          {p?.value}{unit}
        </span>
      </div>

      {statsMetric === "e1rm" && p?.repsBest?.bestWeight > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          Based on {p.repsBest.bestWeight}{unit} × {p.repsBest.bestReps}
        </div>
      )}
    </div>
  );
};

const ProgrammeCard = ({
  programme,
  workouts,
  statsMetric,
  unit,
}) => {
  const exercises = Array.isArray(programme?.exercises) ? programme.exercises : [];

  const [selectedExerciseId, setSelectedExerciseId] = useState(
    exercises[0]?.id || ""
  );

  // If programme changes / first load, ensure selection is valid
  useEffect(() => {
    if (!exercises.some((e) => e?.id === selectedExerciseId)) {
      setSelectedExerciseId(exercises[0]?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programme?.type, exercises.length]);

  const selectedExercise = useMemo(
    () => exercises.find((e) => e?.id === selectedExerciseId) || exercises[0],
    [exercises, selectedExerciseId]
  );

  const series = useMemo(() => {
    if (!selectedExercise?.id) return [];
    return buildSeries(workouts, programme.type, selectedExercise.id, statsMetric);
  }, [workouts, programme.type, selectedExercise?.id, statsMetric]);

  // Build “Most progress” and “Needs attention”
  const insights = useMemo(() => {
    if (exercises.length === 0) return { best: null, worst: null };

    const scored = exercises.map((ex) => {
      const s = buildSeries(workouts, programme.type, ex.id, statsMetric);
      const score = computeProgressScore(s, 4);
      return {
        id: ex.id,
        name: ex.name,
        score,
        hasData: Array.isArray(s) && s.length > 0,
      };
    });

    // Best = highest score with data
    const withScore = scored.filter((x) => x.score != null);
    const best = withScore.length
      ? withScore.slice().sort((a, b) => b.score - a.score)[0]
      : null;

    // Worst = either:
    // 1) missing data (prioritize)
    // 2) lowest score
    const missing = scored.filter((x) => !x.hasData);
    const worst =
      missing.length > 0
        ? missing[0]
        : withScore.length
        ? withScore.slice().sort((a, b) => a.score - b.score)[0]
        : null;

    return { best, worst };
  }, [exercises, workouts, programme.type, statsMetric]);

  const metricLabel = statsMetric === "e1rm" ? "e1RM" : "Max";
  const chartEmpty = !series || series.length === 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
      {/* Programme header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground truncate">
              {programme?.name || `Programme ${programme?.type}`}
            </h2>
          </div>
          <div className="mt-1">
            <Badge className="bg-primary/20 text-primary border-primary/40">
              {safeUpper(programme?.type)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Insights row: 2 half-size boxes side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingUp className="w-4 h-4 text-primary" />
            Most progress
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {insights.best ? (
              <>
                <div className="font-semibold text-foreground truncate">
                  {insights.best.name}
                </div>
                <div className="text-xs mt-1">
                  +{insights.best.score}
                  {unit} ({metricLabel}, last 4)
                </div>
              </>
            ) : (
              <div className="text-xs">Not enough data yet</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Needs attention
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {insights.worst ? (
              <>
                <div className="font-semibold text-foreground truncate">
                  {insights.worst.name}
                </div>
                <div className="text-xs mt-1">
                  {insights.worst.hasData
                    ? `${insights.worst.score >= 0 ? "+" : ""}${insights.worst.score}${unit} (${metricLabel}, last 4)`
                    : "No history logged yet"}
                </div>
              </>
            ) : (
              <div className="text-xs">Not enough data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">Exercise</div>

        <select
          value={selectedExerciseId}
          onChange={(e) => setSelectedExerciseId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-background/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-foreground truncate">
            {selectedExercise?.name || "Exercise"}
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            {metricLabel}
          </Badge>
        </div>

        <div className="h-56 mt-3">
          {chartEmpty ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="text-sm font-semibold">No data yet</div>
              <div className="text-xs mt-1">
                Log this exercise in your workout to see a chart here.
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={
                    <TooltipContent unit={unit} statsMetric={statsMetric} />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

const StatsPage = () => {
  const { weightUnit, statsMetric } = useSettings();

  const workouts = useMemo(() => getWorkouts() || [], []);
  const programmes = useMemo(() => getProgrammes() || [], []);

  const usableProgrammes = useMemo(() => {
    return programmes.filter((p) => Array.isArray(p?.exercises) && p.exercises.length > 0);
  }, [programmes]);

  useEffect(() => {
    if (usableProgrammes.length === 0) {
      toast.message("No programmes yet", {
        description: "Add exercises to a programme to see stats by programme.",
      });
    }
  }, [usableProgrammes.length]);

  const unit = weightUnit === "lbs" ? "lbs" : "kg";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Stats</h1>
            <div className="text-sm text-muted-foreground mt-1">
              Viewing by programme • Metric:{" "}
              <span className="font-semibold text-foreground">
                {statsMetric === "e1rm" ? "Weight + Reps (e1RM)" : "Max Weight"}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Top
          </Button>
        </div>

        <div className="space-y-5">
          {usableProgrammes.map((p) => (
            <ProgrammeCard
              key={p.type}
              programme={p}
              workouts={workouts}
              statsMetric={statsMetric || "maxWeight"}
              unit={unit}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
    // Streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < workouts.length; i++) {
      const workoutDate = new Date(workouts[i].date);
      workoutDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today - workoutDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1 + i) {
        streak++;
      } else {
        break;
      }
    }

    // Total volume
    let totalVolume = 0;
    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          totalVolume += (set.weight || 0) * (set.reps || 0);
        });
      });
    });

    // This month's workouts
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthWorkouts = workouts.filter(w => {
      const date = new Date(w.date);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }).length;

    setStats({ totalWorkouts, streak, totalVolume, monthWorkouts });

    // Personal Records
    const prArray = Object.values(prData).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    setPrs(prArray.slice(0, 10));

    // Body weights
    setBodyWeights(weights);
  };

  const handleAddBodyWeight = () => {
    const weight = parseFloat(newBodyWeight);
    if (!weight || weight <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }

    addBodyWeight(weight, bodyWeightNote);
    setNewBodyWeight('');
    setBodyWeightNote('');
    setShowBodyWeightDialog(false);
    loadStats();
    toast.success('Body weight logged!');
  };

  const handleDeleteBodyWeight = (id) => {
    deleteBodyWeight(id);
    loadStats();
    toast.success('Entry deleted');
  };

  // Calendar Heatmap (12 weeks)
  const getCalendarData = () => {
    const workouts = getWorkouts();
    const weeks = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
      
      const week = [];
      for (let j = 0; j < 7; j++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + j);
        date.setHours(0, 0, 0, 0);
        
        const count = workouts.filter(w => {
          const wDate = new Date(w.date);
          wDate.setHours(0, 0, 0, 0);
          return wDate.getTime() === date.getTime();
        }).length;
        
        week.push({ date, count });
      }
      weeks.push(week);
    }
    
    return weeks;
  };

  const calendarData = getCalendarData();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">
            Stats & Records
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your progress and achievements
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Dumbbell className="w-5 h-5" />}
            label="Total Workouts"
            value={stats.totalWorkouts}
            color="primary"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Current Streak"
            value={`${stats.streak} days`}
            color="primary"
          />
          <StatCard
            icon={<Trophy className="w-5 h-5" />}
            label="Total Volume"
            value={`${Math.round(stats.totalVolume).toLocaleString()} ${weightUnit}`}
            color="gold"
          />
          <StatCard
            icon={<CalendarIcon className="w-5 h-5" />}
            label="This Month"
            value={`${stats.monthWorkouts} workouts`}
            color="success"
          />
        </div>

        {/* Calendar Heatmap */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-bold text-foreground mb-4">Training Frequency (12 weeks)</h2>
          <div className="space-y-1">
            {calendarData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                {week.map((day, dayIndex) => {
                  const intensity = day.count === 0 ? 'bg-muted' : 
                    day.count === 1 ? 'bg-primary/30' :
                    day.count === 2 ? 'bg-primary/60' :
                    'bg-primary';
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`w-6 h-6 rounded ${intensity} border border-border transition-all hover:scale-110`}
                      title={`${day.date.toLocaleDateString()}: ${day.count} workout${day.count !== 1 ? 's' : ''}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
            <span>Less</span>
            <div className="w-4 h-4 rounded bg-muted border border-border" />
            <div className="w-4 h-4 rounded bg-primary/30 border border-border" />
            <div className="w-4 h-4 rounded bg-primary/60 border border-border" />
            <div className="w-4 h-4 rounded bg-primary border border-border" />
            <span>More</span>
          </div>
        </div>

        {/* Recent PRs */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" />
              Recent Personal Records
            </h2>
          </div>
          
          {prs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No PRs yet. Keep training!
            </p>
          ) : (
            <div className="space-y-2">
              {prs.map((pr, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div>
                    <div className="font-semibold text-foreground">{pr.exerciseName}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(pr.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gold">
                      {pr.weight} {weightUnit}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pr.reps} reps
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body Weight Tracking */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Weight className="w-5 h-5 text-primary" />
              Body Weight
            </h2>
            <Button
              size="sm"
              onClick={() => setShowBodyWeightDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {bodyWeights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No body weight entries yet
            </p>
          ) : (
            <div className="space-y-2">
              {bodyWeights.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {entry.weight} {weightUnit}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                    {entry.note && (
                      <div className="text-xs text-muted-foreground mt-1">{entry.note}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBodyWeight(entry.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body Weight Dialog */}
      <Dialog open={showBodyWeightDialog} onOpenChange={setShowBodyWeightDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Body Weight</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Weight ({weightUnit})
              </label>
              <Input
                type="number"
                value={newBodyWeight}
                onChange={(e) => setNewBodyWeight(e.target.value)}
                placeholder="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Note (optional)
              </label>
              <Textarea
                value={bodyWeightNote}
                onChange={(e) => setBodyWeightNote(e.target.value)}
                placeholder="Morning weight, post-workout, etc."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowBodyWeightDialog(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleAddBodyWeight}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => {
  const colorClasses = {
    primary: 'text-primary',
    gold: 'text-gold',
    success: 'text-success'
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={`flex items-center gap-2 mb-2 ${colorClasses[color]}`}>
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
};

export default StatsPage;
