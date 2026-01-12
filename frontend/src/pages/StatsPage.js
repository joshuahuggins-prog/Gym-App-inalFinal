// src/pages/StatsPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trophy,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

import { getWorkouts, getProgrammes } from "../utils/storage";
import { useSettings } from "../contexts/SettingsContext";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

/**
 * ----------------------------
 * Helpers
 * ----------------------------
 */

const safeUpper = (s) => String(s || "").toUpperCase();
const round1 = (n) => Math.round(n * 10) / 10;

const formatDateShort = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};

const formatDateLong = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const calcE1RM = (weight, reps) => {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return null;
  return w * (1 + r / 30);
};

const getExerciseBestForWorkoutEntry = (exerciseEntry, statsMetric) => {
  const sets = Array.isArray(exerciseEntry?.sets) ? exerciseEntry.sets : [];
  if (sets.length === 0) return null;

  if (statsMetric === "e1rm") {
    let best = null;
    for (const s of sets) {
      const v = calcE1RM(s?.weight, s?.reps);
      if (v == null) continue;
      if (best == null || v > best) best = v;
    }
    return best;
  }

  // maxWeight: allow negatives. Best = highest number.
  let best = null;
  for (const s of sets) {
    const w = Number(s?.weight);
    if (!Number.isFinite(w)) continue;
    if (best == null || w > best) best = w;
  }
  return best;
};

const getBestE1RMSetDetails = (exerciseEntry) => {
  const sets = Array.isArray(exerciseEntry?.sets) ? exerciseEntry.sets : [];
  let best = null;
  let bestWeight = 0;
  let bestReps = 0;

  for (const s of sets) {
    const v = calcE1RM(s?.weight, s?.reps);
    if (v == null) continue;
    if (best == null || v > best) {
      best = v;
      bestWeight = Number(s?.weight) || 0;
      bestReps = Number(s?.reps) || 0;
    }
  }

  return best == null ? null : { bestWeight, bestReps, bestE1RM: best };
};

const buildSeries = (workouts, programmeType, exerciseId, statsMetric) => {
  const type = safeUpper(programmeType);
  const id = String(exerciseId || "");
  const points = [];

  const filtered = (workouts || [])
    .filter((w) => safeUpper(w?.type) === type)
    .slice()
    .sort((a, b) => new Date(a?.date).getTime() - new Date(b?.date).getTime());

  for (const w of filtered) {
    const entry = (w?.exercises || []).find((e) => e?.id === id);
    if (!entry) continue;

    const value = getExerciseBestForWorkoutEntry(entry, statsMetric);
    if (value == null || !Number.isFinite(value)) continue;

    const e1 = statsMetric === "e1rm" ? getBestE1RMSetDetails(entry) : null;

    points.push({
      date: w.date,
      label: formatDateShort(w.date),
      value: round1(value),
      _e1: e1,
    });
  }

  return points;
};

const computeProgressScore = (series, lookback = 4) => {
  if (!Array.isArray(series) || series.length < 2) return null;
  const slice = series.slice(-lookback);
  if (slice.length < 2) return null;

  const first = slice[0].value;
  const last = slice[slice.length - 1].value;

  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  return round1(last - first);
};

const getPRFromSeries = (series) => {
  if (!Array.isArray(series) || series.length === 0) return null;

  let best = null;
  let bestDate = null;

  for (const p of series) {
    if (!Number.isFinite(p.value)) continue;
    if (best == null || p.value > best) {
      best = p.value;
      bestDate = p.date;
    }
  }

  return best == null ? null : { value: best, date: bestDate };
};

const getLastTrainedFromSeries = (series) => {
  if (!Array.isArray(series) || series.length === 0) return null;
  const last = series[series.length - 1];
  return last?.date ? last.date : null;
};

const getMinMax = (series) => {
  if (!Array.isArray(series) || series.length === 0) return null;
  let min = null;
  let max = null;
  for (const p of series) {
    const v = Number(p?.value);
    if (!Number.isFinite(v)) continue;
    if (min == null || v < min) min = v;
    if (max == null || v > max) max = v;
  }
  if (min == null || max == null) return null;
  return { min, max };
};

/**
 * ----------------------------
 * UI bits
 * ----------------------------
 */

const TooltipContent = ({ active, payload, label, unit, statsMetric }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="text-sm text-muted-foreground">
        {statsMetric === "e1rm" ? "e1RM" : "Max"}:{" "}
        <span className="font-semibold text-foreground">
          {p?.value}
          {unit}
        </span>
      </div>

      {statsMetric === "e1rm" && p?._e1?.bestWeight > 0 ? (
        <div className="text-xs text-muted-foreground mt-1">
          Based on {p._e1.bestWeight}
          {unit} × {p._e1.bestReps}
        </div>
      ) : null}
    </div>
  );
};

const Sparkline = ({ data }) => {
  if (!Array.isArray(data) || data.length < 2) {
    return <div className="h-10 rounded-md bg-muted/30 border border-border" />;
  }

  return (
    <div className="h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const ProgrammeCard = ({ programme, workouts, statsMetric, unit }) => {
  const exercises = Array.isArray(programme?.exercises) ? programme.exercises : [];
  const metricLabel = statsMetric === "e1rm" ? "e1RM" : "Max";

  const [collapsed, setCollapsed] = useState(true);
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.id || "");
  const chartRef = useRef(null);

  const exercisesKey = useMemo(
    () => exercises.map((e) => e?.id).filter(Boolean).join("|"),
    [exercises]
  );

  useEffect(() => {
    setSelectedExerciseId((prev) => {
      const stillValid = exercises.some((e) => e?.id === prev);
      return stillValid ? prev : exercises[0]?.id || "";
    });
  }, [programme?.type, exercisesKey]);

  const selectedExercise = useMemo(() => {
    return exercises.find((e) => e?.id === selectedExerciseId) || exercises[0] || null;
  }, [exercises, selectedExerciseId]);

  const perExercise = useMemo(() => {
    return exercises.map((ex) => {
      const series = buildSeries(workouts, programme.type, ex.id, statsMetric);
      const score = computeProgressScore(series, 4);
      const pr = getPRFromSeries(series);
      const lastTrained = getLastTrainedFromSeries(series);

      return {
        id: ex.id,
        name: ex.name,
        series,
        score,
        pr,
        lastTrained,
        hasData: Array.isArray(series) && series.length > 0,
      };
    });
  }, [exercisesKey, workouts, programme.type, statsMetric]);

  const insights = useMemo(() => {
    const withScore = perExercise.filter((x) => x.score != null);
    const best = withScore.length
      ? withScore.slice().sort((a, b) => b.score - a.score)[0]
      : null;

    const missing = perExercise.filter((x) => !x.hasData);
    const worst = missing.length
      ? missing[0]
      : withScore.length
      ? withScore.slice().sort((a, b) => a.score - b.score)[0]
      : null;

    return { best, worst };
  }, [perExercise]);

  const selectedData = useMemo(() => {
    if (!selectedExercise?.id) return [];
    const row = perExercise.find((x) => x.id === selectedExercise.id);
    return row?.series || [];
  }, [perExercise, selectedExercise]);

  const chartEmpty = selectedData.length === 0;
  const minMax = useMemo(() => getMinMax(selectedData), [selectedData]);
  const showZeroLine =
    statsMetric === "maxWeight" && minMax && minMax.min < 0 && minMax.max > 0;

  const onPickExerciseFromList = (id) => {
    setSelectedExerciseId(id);

    if (collapsed) {
      setCollapsed(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (chartRef.current) {
            chartRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      });
      return;
    }

    if (chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const InsightCard = ({ title, icon, tone, item }) => {
    const has = !!item;
    const scoreText =
      item?.score == null
        ? "—"
        : `${item.score >= 0 ? "+" : ""}${round1(item.score)}${unit}`;

    return (
      <div className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </div>

        {!has ? (
          <div className="text-xs text-muted-foreground">Not enough data yet</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-foreground truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Δ (last 4):{" "}
                  <span
                    className={
                      tone === "good"
                        ? "text-primary font-semibold"
                        : "text-destructive font-semibold"
                    }
                  >
                    {item.hasData ? scoreText : "No history"}
                  </span>
                </div>
              </div>

              <Badge variant="outline" className="text-muted-foreground">
                {metricLabel}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="rounded-lg border border-border bg-card/40 p-2">
                <div className="flex items-center gap-1 font-semibold text-foreground">
                  <Trophy className="w-3.5 h-3.5 text-primary" />
                  PR
                </div>
                <div className="mt-1">
                  {item.pr ? (
                    <>
                      <span className="font-semibold text-foreground">
                        {item.pr.value}
                        {unit}
                      </span>
                      <div className="opacity-80">{formatDateShort(item.pr.date)}</div>
                    </>
                  ) : (
                    <span className="opacity-80">—</span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card/40 p-2">
                <div className="flex items-center gap-1 font-semibold text-foreground">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Last
                </div>
                <div className="mt-1">
                  {item.lastTrained ? (
                    <span className="opacity-80">{formatDateShort(item.lastTrained)}</span>
                  ) : (
                    <span className="opacity-80">—</span>
                  )}
                </div>
              </div>
            </div>

            <Sparkline data={item.series} />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
      {/* Header always visible */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground truncate">
              {programme?.name || `Programme ${programme?.type}`}
            </h2>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/40">
              {safeUpper(programme?.type)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0"
        >
          {collapsed ? (
            <span className="flex items-center gap-2">
              Expand <ChevronDown className="w-4 h-4" />
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Collapse <ChevronUp className="w-4 h-4" />
            </span>
          )}
        </Button>
      </div>

      {collapsed ? null : (
        <>
          {/* Mini sparkline list */}
          <div className="rounded-xl border border-border bg-background/30 p-3 space-y-2">
            <div className="text-sm font-semibold text-foreground">Exercises</div>

            <div className="space-y-2">
              {perExercise.map((x) => {
                const active = x.id === selectedExerciseId;
                const delta =
                  x.score == null
                    ? null
                    : `${x.score >= 0 ? "+" : ""}${round1(x.score)}${unit}`;

                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => onPickExerciseFromList(x.id)}
                    className={
                      "w-full text-left rounded-lg border px-3 py-2 transition-colors " +
                      (active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/30")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate text-foreground">
                          {x.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {x.lastTrained
                            ? `Last: ${formatDateShort(x.lastTrained)}`
                            : "No history yet"}
                          {delta != null ? ` • Δ4: ${delta}` : ""}
                        </div>
                      </div>

                      <div className="w-28 shrink-0">
                        <Sparkline data={x.series} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Insights row */}
          <div className="grid grid-cols-2 gap-3">
            <InsightCard
              title="Most progress"
              tone="good"
              icon={<TrendingUp className="w-4 h-4 text-primary" />}
              item={insights.best}
            />
            <InsightCard
              title="Needs attention"
              tone="bad"
              icon={<AlertCircle className="w-4 h-4 text-destructive" />}
              item={insights.worst}
            />
          </div>

          {/* Dropdown + chart */}
          <div ref={chartRef} className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">Exercise chart</div>

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

              {selectedExerciseId ? (
                <div className="text-xs text-muted-foreground">
                  Showing: <span className="font-semibold text-foreground">{metricLabel}</span>
                </div>
              ) : null}
            </div>

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
                    <LineChart data={selectedData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis
                       tick={{ fontSize: 12 }}
                       domain={yDomain}
                       allowDataOverflow
                       />
                      {showZeroLine ? <ReferenceLine y={0} strokeDasharray="4 4" /> : null}
                      <Tooltip content={<TooltipContent unit={unit} statsMetric={statsMetric} />} />
                      <Line type="monotone" dataKey="value" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {(() => {
                const row = perExercise.find((x) => x.id === selectedExerciseId);
                if (!row) return null;

                return (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="rounded-lg border border-border bg-card/40 p-2">
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-primary" />
                        PR
                      </div>
                      <div className="mt-1">
                        {row.pr ? (
                          <>
                            <span className="font-semibold text-foreground">
                              {row.pr.value}
                              {unit}
                            </span>
                            <div className="opacity-80">{formatDateLong(row.pr.date)}</div>
                          </>
                        ) : (
                          <span className="opacity-80">—</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card/40 p-2">
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Last trained
                      </div>
                      <div className="mt-1">
                        {row.lastTrained ? (
                          <span className="opacity-80">{formatDateLong(row.lastTrained)}</span>
                        ) : (
                          <span className="opacity-80">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatsPage = () => {
  const ctx = useSettings();
  const weightUnit = ctx?.weightUnit || ctx?.settings?.weightUnit || "kg";
  const statsMetric = ctx?.statsMetric || ctx?.settings?.statsMetric || "maxWeight";

  const workouts = useMemo(() => getWorkouts() || [], []);
  const programmes = useMemo(() => getProgrammes() || [], []);

  const usableProgrammes = useMemo(() => {
    return (programmes || []).filter((p) => Array.isArray(p?.exercises) && p.exercises.length > 0);
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stats</h1>
          <div className="text-sm text-muted-foreground mt-1">
            By programme • Metric:{" "}
            <span className="font-semibold text-foreground">
              {statsMetric === "e1rm" ? "Weight + Reps (e1RM)" : "Max Weight"}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {usableProgrammes.map((p) => (
            <ProgrammeCard
              key={p.type}
              programme={p}
              workouts={workouts}
              statsMetric={statsMetric}
              unit={unit}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
