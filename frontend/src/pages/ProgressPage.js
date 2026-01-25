import React, { useEffect, useMemo, useState } from "react";
import { TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { getProgrammes, getWorkouts, getSettings, getExercises } from "../utils/storage";

const cx = (...c) => c.filter(Boolean).join(" ");

const e1rm = (w, r) => {
  const ww = Number(w);
  const rr = Number(r);
  if (!Number.isFinite(ww) || !Number.isFinite(rr) || rr <= 0) return 0;
  return ww * (1 + rr / 30);
};

const toDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfRange = (rangeKey) => {
  const now = new Date();
  if (rangeKey === "all") return null;

  const d = new Date(now);
  if (rangeKey === "3m") d.setMonth(d.getMonth() - 3);
  if (rangeKey === "6m") d.setMonth(d.getMonth() - 6);
  if (rangeKey === "1y") d.setFullYear(d.getFullYear() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatNumber = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "-";
  if (Math.abs(x) >= 100) return Math.round(x).toString();
  return (Math.round(x * 10) / 10).toString();
};

const normKey = (nameOrId) =>
  (nameOrId || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const shortMD = (d) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const longDate = (d) =>
  d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/** Keep 1 point per day, taking MAX for that day */
const compressByDayMax = (pts) => {
  const m = new Map(); // yyyy-mm-dd -> {y, meta}
  (pts || []).forEach((p) => {
    const dx = p?.x instanceof Date ? p.x : null;
    if (!dx || Number.isNaN(dx.getTime())) return;

    const y = Number(p?.y);
    if (!Number.isFinite(y)) return;

    const k = dx.toISOString().slice(0, 10);
    const prev = m.get(k);
    if (!prev || y > prev.y) m.set(k, { y, meta: p.meta || null });
  });

  return Array.from(m.entries())
    .map(([k, v]) => ({ x: new Date(k), y: v.y, meta: v.meta || null }))
    .filter((p) => p.x instanceof Date && !Number.isNaN(p.x.getTime()))
    .sort((a, b) => a.x - b.x);
};

/** build nice 10-step ticks based on visible values */
const buildTicks10 = (values, allowNegative = true) => {
  const STEP = 10;

  const ys = (values || []).map(Number).filter(Number.isFinite);
  if (!ys.length) return { ticks: [0, 10], domain: [0, 10] };

  let minData = Math.min(...ys);
  let maxData = Math.max(...ys);

  if (!allowNegative) minData = Math.max(0, minData);
  if (!allowNegative) maxData = Math.max(0, maxData);

  let minTick = Math.floor(minData / STEP) * STEP;
  let maxTick = Math.ceil(maxData / STEP) * STEP;

  if (!Number.isFinite(minTick)) minTick = 0;
  if (!Number.isFinite(maxTick)) maxTick = STEP;
  if (minTick === maxTick) maxTick = minTick + STEP;

  const count = Math.round((maxTick - minTick) / STEP) + 1;
  const ticks = Array.from({ length: count }, (_, i) => minTick + i * STEP);

  return { ticks, domain: [minTick, maxTick] };
};

function CustomTooltip({ active, payload, label, unitLabel }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;

  const dt = p?.fullDate ? toDate(p.fullDate) : null;
  const dateText = dt ? longDate(dt) : (label || "");

  const lines = [];
  if (p?.workoutType) lines.push(`Workout: ${p.workoutType}`);
  if (Number.isFinite(Number(p?.reps))) lines.push(`Reps: ${Number(p.reps)}`);
  if (p?.notes) lines.push(`Notes: ${String(p.notes)}`);

  return (
    <div
      className="rounded-xl border border-border bg-card px-3 py-2 shadow-sm"
      style={{ maxWidth: 280 }}
    >
      <div className="text-sm font-semibold text-foreground">
        {formatNumber(p.weight)} {unitLabel}
      </div>
      <div className="text-xs text-muted-foreground">{dateText}</div>

      {lines.length ? (
        <div className="mt-1 space-y-0.5">
          {lines.slice(0, 3).map((t, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              {t}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ProgressPage() {
  const settings = getSettings();
  const weightUnit = settings?.weightUnit || "kg";
  const progressMetric = settings?.progressMetric === "e1rm" ? "e1rm" : "max";
  const metricLabel = progressMetric === "e1rm" ? "E1RM" : "Max";

  const [range, setRange] = useState("all");

  // ✅ This key forces recompute when storage changes
  const [reloadKey, setReloadKey] = useState(0);

  // ✅ Keep the “old UI” idea: select an exercise, show ONE chart
  const [selectedExerciseKey, setSelectedExerciseKey] = useState("");

  // --- Auto refresh so edits in History show up here ---
  useEffect(() => {
    const bump = () => setReloadKey((k) => k + 1);

    const onStorage = (e) => {
      // other tabs OR same tab if your app writes localStorage and triggers storage in some browsers
      if (!e?.key || e.key === "workouts") bump();
    };

    const onFocus = () => bump();
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    // tiny fallback: when visible, check occasionally (covers “same-tab edits” reliably)
    let t = null;
    const start = () => {
      if (t) return;
      t = window.setInterval(() => {
        if (document.visibilityState === "visible") bump();
      }, 2000);
    };
    const stop = () => {
      if (t) window.clearInterval(t);
      t = null;
    };
    start();

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, []);

  const computed = useMemo(() => {
    // Pull fresh each time reloadKey bumps
    const programmes = getProgrammes() || [];
    const workoutsRaw = getWorkouts() || [];
    const exercisesList = (getExercises?.() || []).map((ex) => ({
      id: ex?.id || normKey(ex?.name),
      name: ex?.name || ex?.id || "Exercise",
    }));

    const start = startOfRange(range);

    const workouts = workoutsRaw
      .map((w) => ({ ...w, _dateObj: toDate(w.date) }))
      .filter((w) => w._dateObj)
      .filter((w) => (start ? w._dateObj >= start : true))
      .sort((a, b) => a._dateObj - b._dateObj);

    // Build per-exercise time series from history (robust)
    const seriesByKey = new Map(); // key -> pts[]

    const addPoint = (key, x, y, meta) => {
      if (!key || !(x instanceof Date) || Number.isNaN(x.getTime())) return;
      if (!Number.isFinite(y)) return;
      if (!seriesByKey.has(key)) seriesByKey.set(key, []);
      seriesByKey.get(key).push({ x, y, meta });
    };

    workouts.forEach((w) => {
      const x = w._dateObj;

      const workoutType =
        w?.type ||
        w?.programmeType ||
        w?.programme ||
        w?.name ||
        w?.title ||
        "";

      (w.exercises || []).forEach((ex) => {
        const name = ex?.name || ex?.id || "Exercise";
        const key = normKey(ex?.id || name);

        let best = -Infinity;
        let bestMeta = null;

        (ex.sets || []).forEach((s) => {
          const ww = Number(s?.weight);
          const rr = Number(s?.reps);

          if (!Number.isFinite(ww)) return;

          const v = progressMetric === "e1rm" ? e1rm(ww, rr) : ww;

          if (Number.isFinite(v) && v > best) {
            best = v;
            bestMeta = {
              workoutType: workoutType || "",
              reps: Number.isFinite(rr) ? rr : null,
              notes: ex?.userNotes || ex?.notes || w?.notes || "",
            };
          }
        });

        if (best !== -Infinity) addPoint(key, x, best, bestMeta);
      });
    });

    const compressedByKey = new Map();
    seriesByKey.forEach((pts, key) => compressedByKey.set(key, compressByDayMax(pts)));

    // Cards (most progress / needs attention) based on programme exercises
    const programmeCards = programmes.map((p) => {
      const type = String(p?.type || "").toUpperCase();
      const programmeKey = normKey(type || p?.name || p?.title || "programme");
      const displayName =
        p?.name || p?.title || p?.label || (type ? `Workout ${type}` : "Workout");

      const exercises = (p?.exercises || []).map((ex) => {
        const name = ex?.name || ex?.id || "";
        const key = normKey(ex?.id || name);
        const pts = compressedByKey.get(key) || [];

        const first = pts.length ? pts[0].y : null;
        const latest = pts.length ? pts[pts.length - 1].y : null;
        const delta = first != null && latest != null ? latest - first : null;

        return { key, name: name || "Exercise", first, latest, delta, points: pts };
      });

      return { programmeKey, displayName, exercises };
    });

    const flat = programmeCards.flatMap((pc) =>
      pc.exercises.map((e) => ({
        programme: pc.displayName,
        programmeKey: pc.programmeKey,
        ...e,
      }))
    );

    const withDelta = flat
      .filter((e) => Number.isFinite(e.delta))
      .sort((a, b) => b.delta - a.delta);

    const mostProgress = withDelta.slice(0, 2);
    const needsAttention = [...withDelta].reverse().slice(0, 2);

    // Exercise dropdown options: prefer your master list, fallback to anything in history
    const keysFromHistory = Array.from(compressedByKey.keys());
    const optionsMap = new Map();
    exercisesList.forEach((ex) => optionsMap.set(normKey(ex.id), ex.name));
    keysFromHistory.forEach((k) => {
      if (!optionsMap.has(k)) optionsMap.set(k, k.replace(/_/g, " "));
    });

    const exerciseOptions = Array.from(optionsMap.entries())
      .map(([k, label]) => ({ key: k, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      programmeCards,
      mostProgress,
      needsAttention,
      compressedByKey,
      exerciseOptions,
    };
  }, [range, progressMetric, reloadKey]);

  // pick a default selection (first with data) if none chosen yet
  useEffect(() => {
    if (selectedExerciseKey) return;
    const firstWithData =
      computed.exerciseOptions.find((o) => (computed.compressedByKey.get(o.key) || []).length >= 2) ||
      computed.exerciseOptions[0];
    if (firstWithData?.key) setSelectedExerciseKey(firstWithData.key);
  }, [computed.exerciseOptions, computed.compressedByKey, selectedExerciseKey]);

  const selectedPoints = useMemo(() => {
    const pts = computed.compressedByKey.get(selectedExerciseKey) || [];
    // Turn into recharts-friendly rows
    return pts.map((p) => ({
      date: shortMD(p.x),
      weight: p.y,
      fullDate: p.x.toISOString(),
      workoutType: p.meta?.workoutType || "",
      reps: p.meta?.reps ?? null,
      notes: p.meta?.notes || "",
    }));
  }, [computed.compressedByKey, selectedExerciseKey]);

  const ticksInfo = useMemo(() => {
    return buildTicks10(selectedPoints.map((d) => d.weight), true);
  }, [selectedPoints]);

  const firstVal = selectedPoints.length ? selectedPoints[0].weight : null;
  const lastVal = selectedPoints.length ? selectedPoints[selectedPoints.length - 1].weight : null;

  const change = firstVal != null && lastVal != null ? lastVal - firstVal : null;
  const percent =
    firstVal != null && lastVal != null && Number(firstVal) !== 0
      ? ((change / firstVal) * 100).toFixed(1)
      : null;

  const rangeButtons = [
    { k: "all", label: "All time" },
    { k: "3m", label: "3 months" },
    { k: "6m", label: "6 months" },
    { k: "1y", label: "1 year" },
  ];

  const selectedLabel =
    computed.exerciseOptions.find((o) => o.key === selectedExerciseKey)?.label ||
    selectedExerciseKey.replace(/_/g, " ");

  return (
    <div className="p-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-primary">Progress</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Metric: <span className="font-medium text-foreground">{metricLabel}</span>
              <span className="mx-2 opacity-50">•</span>
              Unit: <span className="font-medium text-foreground">{weightUnit}</span>
            </div>
            <div className="mt-2">
              <Badge className="bg-primary/15 text-primary border border-primary/30">
                {metricLabel}
              </Badge>
            </div>
          </div>
        </div>

        {/* Range buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          {rangeButtons.map((r) => (
            <Button
              key={r.k}
              size="sm"
              variant={range === r.k ? "default" : "secondary"}
              onClick={() => setRange(r.k)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-b border-border" />

      <div className="p-4 space-y-3">
        {/* Most progress */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <h2 className="font-semibold">Most progress</h2>
            <Badge className="ml-auto bg-success/15 text-success border border-success/30">
              Top
            </Badge>
          </div>

          {computed.mostProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough data in this range yet.</p>
          ) : (
            <div className="space-y-2">
              {computed.mostProgress.map((e) => (
                <div
                  key={`${e.programmeKey}-${e.key}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{e.programme}</div>
                  </div>
                  <div className="text-sm font-semibold text-success whitespace-nowrap">
                    +{formatNumber(e.delta)} {weightUnit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Needs attention */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="font-semibold">Needs attention</h2>
            <Badge className="ml-auto bg-destructive/15 text-destructive border border-destructive/30">
              Focus
            </Badge>
          </div>

          {computed.needsAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough data in this range yet.</p>
          ) : (
            <div className="space-y-2">
              {computed.needsAttention.map((e) => (
                <div
                  key={`${e.programmeKey}-${e.key}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{e.programme}</div>
                  </div>
                  <div className="text-sm font-semibold text-destructive whitespace-nowrap">
                    {formatNumber(e.delta)} {weightUnit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ Recharts chart container (your preferred look) */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Select Exercise
              </div>
              <Select value={selectedExerciseKey} onValueChange={setSelectedExerciseKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {computed.exerciseOptions.map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {change != null && percent != null ? (
              <div className="text-right">
                <div
                  className={cx(
                    "text-3xl font-bold",
                    change >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {change >= 0 ? "+" : ""}
                  {formatNumber(change)} {weightUnit}
                </div>
                <div className="text-sm text-muted-foreground">
                  {Number(percent) >= 0 ? "+" : ""}
                  {percent}%
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            {selectedPoints.length < 2 ? (
              <div className="text-sm text-muted-foreground py-10 text-center">
                Not enough data points yet for <span className="font-medium text-foreground">{selectedLabel}</span>.
              </div>
            ) : (
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedPoints} margin={{ top: 12, right: 14, bottom: 18, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: 12 }}
                      tickMargin={8}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: 12 }}
                      ticks={ticksInfo.ticks}
                      domain={ticksInfo.domain}
                      tickMargin={8}
                      label={{
                        value: `Weight (${weightUnit})`,
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "hsl(var(--muted-foreground))" },
                      }}
                    />
                    <Tooltip
                      content={<CustomTooltip unitLabel={weightUnit} />}
                      wrapperStyle={{ outline: "none" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={4}
                      dot={{ fill: "hsl(var(--primary))", r: 6 }}
                      activeDot={{ r: 9, fill: "hsl(var(--primary))" }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {selectedPoints.length >= 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                First:{" "}
                <span className="text-foreground font-medium">
                  {formatNumber(selectedPoints[0].weight)} {weightUnit}
                </span>
              </span>
              <span>
                Latest:{" "}
                <span className="text-foreground font-medium">
                  {formatNumber(selectedPoints[selectedPoints.length - 1].weight)} {weightUnit}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Small note so you know it’s live */}
        <div className="text-xs text-muted-foreground px-1">
          This page auto-refreshes workout history (focus/visibility + background check) so edits in History update here.
        </div>
      </div>
    </div>
  );
}