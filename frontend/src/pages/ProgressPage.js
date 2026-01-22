import React, { useMemo, useState } from "react";
import { TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getProgrammes, getWorkouts, getSettings } from "../utils/storage";

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
  // compact but readable
  if (Math.abs(x) >= 100) return Math.round(x).toString();
  return (Math.round(x * 10) / 10).toString();
};

const monthShort = (d) =>
  d.toLocaleDateString(undefined, { month: "short" });

const monthYearShort = (d) =>
  d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });

const normKey = (nameOrId) =>
  (nameOrId || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

/**
 * Build bar chart points: one point per workout-date (YYYY-MM-DD), keep MAX for that day.
 * Points: [{ x: Date, y: number }]
 */
const compressByDayMax = (pts) => {
  const m = new Map(); // yyyy-mm-dd -> max
  pts.forEach((p) => {
    const k = p.x.toISOString().slice(0, 10);
    const prev = m.get(k);
    if (prev == null || p.y > prev) m.set(k, p.y);
  });
  return Array.from(m.entries())
    .map(([k, y]) => ({ x: new Date(k), y }))
    .sort((a, b) => a.x - b.x);
};

function LineChart({
  points = [],
  unitLabel = "kg",
  height = 240,
  maxXTicks = 6,
  allowNegative = true,
}) {
  // SVG line chart with axes + dotted grid (supports negative)
  const w = 1000; // virtual width for layout math
  const h = height;
  const padL = 54;
  const padR = 16;
  const padT = 16;
  const padB = 44;

  const ys = points.map((p) => p.y).filter((v) => Number.isFinite(v));
  const minData = ys.length ? Math.min(...ys) : 0;
  const maxData = ys.length ? Math.max(...ys) : 1;

  // include 0 for context + allow negative
  let minY = allowNegative ? Math.min(minData, 0) : Math.max(minData, 0);
  let maxY = Math.max(maxData, 0);

  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const range = maxY - minY;
  minY -= range * 0.08;
  maxY += range * 0.08;

  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const yToPx = (y) => {
    const t = (y - minY) / (maxY - minY);
    return padT + (1 - t) * plotH;
  };

  const xToPx = (i) => {
    if (points.length <= 1) return padL + plotW / 2;
    return padL + (i * plotW) / (points.length - 1);
  };

  const zeroY = yToPx(0);

  // dotted horizontal grid
  const gridLines = 4;
  const grid = Array.from({ length: gridLines + 1 }, (_, i) => i);

  // x labels
  const n = points.length;
  const every = Math.max(1, Math.floor(n / maxXTicks));

  const pathD = points
    .map((p, i) => {
      const x = xToPx(i);
      const y = yToPx(p.y);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="w-full overflow-hidden">
      <svg
       viewBox={`0 0 ${w} ${h}`}
       className="block w-full h-auto"
       preserveAspectRatio="xMidYMid meet"
       >
        {/* horizontal dotted grid + y labels */}
        {grid.map((i) => {
          const t = i / gridLines;
          const yVal = minY + (1 - t) * (maxY - minY);
          const y = yToPx(yVal);

          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="currentColor"
                opacity="0.12"
                strokeDasharray="3 6"
              />
              <text
                x={padL - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="currentColor"
                opacity="0.65"
              >
                {formatNumber(yVal)}
              </text>
            </g>
          );
        })}

        {/* axes */}
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={h - padB}
          stroke="currentColor"
          opacity="0.18"
        />
        <line
          x1={padL}
          y1={h - padB}
          x2={w - padR}
          y2={h - padB}
          stroke="currentColor"
          opacity="0.18"
        />

        {/* zero line */}
        {zeroY >= padT && zeroY <= h - padB && (
          <line
            x1={padL}
            y1={zeroY}
            x2={w - padR}
            y2={zeroY}
            stroke="currentColor"
            opacity="0.25"
            strokeDasharray="2 4"
          />
        )}

        {/* y-axis unit label */}
        <text
          x={padL}
          y={12}
          textAnchor="start"
          fontSize="12"
          fill="currentColor"
          opacity="0.75"
        >
          {unitLabel}
        </text>

        {/* line */}
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.95"
        />

        {/* points */}
        {points.map((p, i) => {
          const x = xToPx(i);
          const y = yToPx(p.y);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="currentColor"
              opacity="0.95"
            />
          );
        })}

        {/* x labels */}
        {points.map((p, i) => {
          if (i % every !== 0 && i !== points.length - 1) return null;
          const x = xToPx(i);
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={h - 16}
              textAnchor="middle"
              fontSize="11"
              fill="currentColor"
              opacity="0.65"
            >
              {monthYearShort(p.x)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}


export default function ProgressPage() {
  const settings = getSettings();
  const weightUnit = settings?.weightUnit || "kg";
  const progressMetric = settings?.progressMetric === "e1rm" ? "e1rm" : "max";
  const metricLabel = progressMetric === "e1rm" ? "E1RM" : "Max";

  const [range, setRange] = useState("all");
  const [expanded, setExpanded] = useState(null); // { programmeKey, exerciseKey }

  const computed = useMemo(() => {
    const programmes = getProgrammes() || [];
    const workoutsRaw = getWorkouts() || [];

    const start = startOfRange(range);

    const workouts = workoutsRaw
      .map((w) => ({ ...w, _dateObj: toDate(w.date) }))
      .filter((w) => w._dateObj)
      .filter((w) => (start ? w._dateObj >= start : true))
      .sort((a, b) => a._dateObj - b._dateObj);

    // Build series by exercise key across filtered workouts
    const seriesByKey = new Map();

    const addPoint = (key, x, y) => {
      if (!key || !x || !Number.isFinite(y)) return;
      if (!seriesByKey.has(key)) seriesByKey.set(key, []);
      seriesByKey.get(key).push({ x, y });
    };

    workouts.forEach((w) => {
      const x = w._dateObj;
      (w.exercises || []).forEach((ex) => {
        const exName = ex?.name || ex?.id || "";
        const key = normKey(exName);

        let best = -Infinity;

        (ex.sets || []).forEach((s) => {
          const ww = Number(s?.weight);
          const rr = Number(s?.reps);

          if (!Number.isFinite(ww)) return;

          let v;
          if (progressMetric === "e1rm") {
            v = e1rm(ww, rr);
          } else {
            v = ww;
          }

          if (Number.isFinite(v) && v > best) best = v;
        });

        // Allow negative values too (assisted)
        if (best !== -Infinity) addPoint(key, x, best);
      });
    });

    const compressedByKey = new Map();
    seriesByKey.forEach((pts, key) => compressedByKey.set(key, compressByDayMax(pts)));

    const programmeCards = programmes.map((p) => {
      const type = String(p?.type || "").toUpperCase();
      const programmeKey = normKey(type || p?.name || p?.title || `programme_${Math.random()}`);

      const displayName =
        p?.name ||
        p?.title ||
        p?.label ||
        (type ? `Workout ${type}` : "Workout");

      const exercises = (p?.exercises || []).map((ex) => {
        const name = ex?.name || ex?.id || "";
        const key = normKey(name);
        const pts = compressedByKey.get(key) || [];

        const maxVal = pts.reduce((m, v) => (v.y > m ? v.y : m), -Infinity);
        const first = pts.length ? pts[0].y : null;
        const latest = pts.length ? pts[pts.length - 1].y : null;
        const delta =
          first != null && latest != null ? latest - first : null;

        return {
          key,
          name,
          points: pts,
          maxVal: maxVal === -Infinity ? null : maxVal,
          first,
          latest,
          delta,
        };
      });

      return { programmeKey, type, displayName, exercises };
    });

    // Top progress/attention across everything
    const flat = programmeCards.flatMap((pc) =>
      pc.exercises.map((e) => ({ programme: pc.displayName, programmeKey: pc.programmeKey, ...e }))
    );

    const withDelta = flat
      .filter((e) => Number.isFinite(e.delta))
      .sort((a, b) => b.delta - a.delta);

    const mostProgress = withDelta.slice(0, 2);
    const needsAttention = [...withDelta].reverse().slice(0, 2);

    return { programmeCards, mostProgress, needsAttention };
  }, [range, progressMetric]);

  const unitLabel = weightUnit; // Max and E1RM both use the chosen unit display

  const rangeButtons = [
    { k: "all", label: "All time" },
    { k: "3m", label: "3 months" },
    { k: "6m", label: "6 months" },
    { k: "1y", label: "1 year" },
  ];

  const onToggleExercise = (programmeKey, exerciseKey) => {
    const same =
      expanded?.programmeKey === programmeKey &&
      expanded?.exerciseKey === exerciseKey;

    setExpanded(same ? null : { programmeKey, exerciseKey });
  };

  const getExpandedExercise = (programmeKey) => {
    if (!expanded || expanded.programmeKey !== programmeKey) return null;
    const pc = computed.programmeCards.find((x) => x.programmeKey === programmeKey);
    if (!pc) return null;
    return pc.exercises.find((x) => x.key === expanded.exerciseKey) || null;
  };

  return (
    <div className="p-0">
      {/* Header (matches your other pages style: title + divider) */}
      <div className="px-4 pt-4 pb-3 bg-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-primary">Progress</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Metric:{" "}
              <span className="font-medium text-foreground">{metricLabel}</span>
              <span className="mx-2 opacity-50">•</span>
              Unit: <span className="font-medium text-foreground">{unitLabel}</span>
            </div>

            <div className="mt-2">
              <Badge className="bg-primary/15 text-primary border border-primary/30">
                {metricLabel}
              </Badge>
            </div>
          </div>
        </div>

        {/* Range buttons UNDER metric (wrap so they never go off-screen) */}
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

      {/* Divider line */}
      <div className="border-b border-border" />

      <div className="p-4 space-y-3">
        {/* Most progress (top 2) */}
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
                    +{formatNumber(e.delta)} {unitLabel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Needs attention (top 2) */}
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
                  <div className={cx(
                    "text-sm font-semibold whitespace-nowrap",
                    e.delta < 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {formatNumber(e.delta)} {unitLabel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Programme containers */}
        <div className="space-y-3">
          {computed.programmeCards.map((pc) => {
            const expandedExercise = getExpandedExercise(pc.programmeKey);

            return (
              <div key={pc.programmeKey} className="rounded-xl border border-border bg-card">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">{pc.displayName}</h3>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Tap an exercise to expand
                  </span>
                </div>

                <div className="p-3 space-y-2">
                  {pc.exercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-2 py-2">
                      No exercises assigned to this programme.
                    </p>
                  ) : (
                    pc.exercises.map((ex) => {
                      const isOpen =
                        expanded?.programmeKey === pc.programmeKey &&
                        expanded?.exerciseKey === ex.key;

                      return (
                        <div key={ex.key} className="space-y-2">
                          <button
                            onClick={() => onToggleExercise(pc.programmeKey, ex.key)}
                            className={cx(
                              "w-full rounded-lg border px-3 py-3 text-left transition",
                              isOpen
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background/40 hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">{ex.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {metricLabel} in range:{" "}
                                  <span className="font-medium text-foreground">
                                    {ex.maxVal == null ? "-" : `${formatNumber(ex.maxVal)} ${unitLabel}`}
                                  </span>
                                </div>
                              </div>

                              {/* tiny inline “trend” hint: just show last/first arrow feel via delta */}
                              <div className={cx(
                                "text-xs font-semibold whitespace-nowrap mt-1",
                                Number.isFinite(ex.delta)
                                  ? ex.delta >= 0 ? "text-success" : "text-destructive"
                                  : "text-muted-foreground"
                              )}>
                                {Number.isFinite(ex.delta)
                                  ? `${ex.delta >= 0 ? "+" : ""}${formatNumber(ex.delta)} ${unitLabel}`
                                  : ""}
                              </div>
                            </div>
                          </button>

                          {/* Expanded chart (inside programme container) */}
                          {isOpen && (
                            <div className="rounded-lg border border-border bg-background/40 p-3">
                              {!ex.points || ex.points.length < 2 ? (
                                <p className="text-sm text-muted-foreground">
                                  Not enough data points in this range.
                                </p>
                              ) : (
                                <>
                                  <div className="text-sm font-semibold mb-2">
                                    {ex.name} — {metricLabel}
                                  </div>

                                  <div className="text-foreground">
                                    <LineChart
                                     points={ex.points}
                                     unitLabel={unitLabel}
                                     allowNegative={true}
                                    />

                                  </div>

                                  <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <div className="text-xs text-muted-foreground">First</div>
                                      <div className="text-lg font-semibold">
                                        {formatNumber(ex.first)} {unitLabel}
                                      </div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <div className="text-xs text-muted-foreground">Latest</div>
                                      <div className="text-lg font-semibold">
                                        {formatNumber(ex.latest)} {unitLabel}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
