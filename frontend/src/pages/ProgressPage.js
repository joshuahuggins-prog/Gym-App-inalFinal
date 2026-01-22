import React, { useMemo, useState } from "react";
import { TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getProgrammes, getWorkouts, getSettings } from "../utils/storage";

const cx = (...c) => c.filter(Boolean).join(" ");

/**
 * Metric:
 * - "max": best set weight
 * - "e1rm": estimated 1RM using Epley: w * (1 + reps/30)
 */
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
  // keep it neat
  return x >= 100 ? Math.round(x).toString() : (Math.round(x * 10) / 10).toString();
};

function Sparkline({ points = [], height = 24, padding = 2 }) {
  // points: [{x: Date, y: number}]
  const ys = points.map((p) => p.y).filter((v) => Number.isFinite(v));
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;

  const w = 120;
  const h = height;

  const norm = (y) => {
    if (maxY === minY) return h / 2;
    const t = (y - minY) / (maxY - minY);
    return h - padding - t * (h - padding * 2);
  };

  const step = points.length > 1 ? (w - padding * 2) / (points.length - 1) : 0;
  const d = points
    .map((p, i) => {
      const x = padding + i * step;
      const y = norm(p.y);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.9" />
    </svg>
  );
}

function BigLineChart({ points = [] }) {
  // Simple larger SVG line chart with dots + month labels
  const w = 900;
  const h = 260;
  const pad = 28;

  const ys = points.map((p) => p.y).filter((v) => Number.isFinite(v));
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;

  const normY = (y) => {
    if (maxY === minY) return h / 2;
    const t = (y - minY) / (maxY - minY);
    return h - pad - t * (h - pad * 2);
  };

  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;

  const pathD = points
    .map((p, i) => {
      const x = pad + i * step;
      const y = normY(p.y);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // sparse labels: show ~6 labels max
  const labelEvery = Math.max(1, Math.floor(points.length / 6));
  const formatLabel = (d) =>
    d
      ? d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
      : "";

  return (
    <div className="w-full overflow-x-auto">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
        {/* axis baseline */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" opacity="0.15" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="currentColor" opacity="0.15" />

        {/* line */}
        <path d={pathD} fill="none" stroke="currentColor" strokeWidth="3" opacity="0.95" />

        {/* dots */}
        {points.map((p, i) => {
          const x = pad + i * step;
          const y = normY(p.y);
          return <circle key={i} cx={x} cy={y} r="4" fill="currentColor" opacity="0.95" />;
        })}

        {/* labels */}
        {points.map((p, i) => {
          if (i % labelEvery !== 0 && i !== points.length - 1) return null;
          const x = pad + i * step;
          return (
            <text
              key={`t-${i}`}
              x={x}
              y={h - 8}
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
              opacity="0.7"
            >
              {formatLabel(p.x)}
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

  // NEW: progress metric setting (defaults to max)
  const progressMetric = settings?.progressMetric === "e1rm" ? "e1rm" : "max";

  const [range, setRange] = useState("all"); // all | 3m | 6m | 1y
  const [selected, setSelected] = useState(null); // { programmeType, exerciseKey, exerciseName }

  const data = useMemo(() => {
    const programmes = getProgrammes() || [];
    const workoutsRaw = getWorkouts() || [];

    // Filter workouts by time range
    const start = startOfRange(range);
    const workouts = workoutsRaw
      .map((w) => ({ ...w, _dateObj: toDate(w.date) }))
      .filter((w) => w._dateObj)
      .filter((w) => (start ? w._dateObj >= start : true))
      .sort((a, b) => a._dateObj - b._dateObj); // ascending for charts

    // Build map: exerciseKey -> [{x: Date, y: number}] where y is best per workout
    // We'll key by normalised exercise name primarily (safe with older data)
    const seriesByKey = new Map();

    const normKey = (nameOrId) =>
      (nameOrId || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

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

        // Determine best set metric within this exercise on this workout
        let best = 0;

        (ex.sets || []).forEach((s) => {
          const ww = Number(s?.weight);
          const rr = Number(s?.reps);

          if (!Number.isFinite(ww)) return;

          if (progressMetric === "e1rm") {
            const v = e1rm(ww, rr);
            if (v > best) best = v;
          } else {
            // max weight
            if (ww > best) best = ww;
          }
        });

        if (best > 0) addPoint(key, x, best);
      });
    });

    // compress per workout date so we don’t get multiple points same day (take max)
    const compress = (pts) => {
      const m = new Map(); // yyyy-mm-dd -> max
      pts.forEach((p) => {
        const k = p.x.toISOString().slice(0, 10);
        const prev = m.get(k) ?? 0;
        if (p.y > prev) m.set(k, p.y);
      });
      return Array.from(m.entries())
        .map(([k, y]) => ({ x: new Date(k), y }))
        .sort((a, b) => a.x - b.x);
    };

    const compressedByKey = new Map();
    seriesByKey.forEach((pts, key) => compressedByKey.set(key, compress(pts)));

    // Programme -> exercises list with computed summary
    const programmeCards = programmes.map((p) => {
      const type = String(p?.type || "").toUpperCase();
      const exercises = (p?.exercises || []).map((ex) => {
        const name = ex?.name || ex?.id || "";
        const key = normKey(name);
        const pts = compressedByKey.get(key) || [];
        const maxVal = pts.reduce((m, v) => (v.y > m ? v.y : m), 0);

        const first = pts.length ? pts[0].y : null;
        const latest = pts.length ? pts[pts.length - 1].y : null;
        const delta = first != null && latest != null ? latest - first : null;

        return {
          key,
          name,
          points: pts,
          maxVal,
          first,
          latest,
          delta,
        };
      });

      return { type, exercises };
    });

    // Build “most progress” / “needs attention” lists across ALL programme exercises
    const flat = programmeCards.flatMap((pc) =>
      pc.exercises.map((e) => ({
        programmeType: pc.type,
        ...e,
      }))
    );

    const withDelta = flat
      .filter((e) => Number.isFinite(e.delta))
      .sort((a, b) => b.delta - a.delta);

    const mostProgress = withDelta.slice(0, 5);
    const needsAttention = [...withDelta].reverse().slice(0, 5);

    return {
      programmeCards,
      mostProgress,
      needsAttention,
    };
  }, [range, progressMetric]);

  const metricLabel = progressMetric === "e1rm" ? "E1RM" : "Max";
  const unitLabel = progressMetric === "e1rm" ? weightUnit : weightUnit; // both are still in kg/lbs numbers

  const handleSelectExercise = (programmeType, ex) => {
    setSelected({
      programmeType,
      exerciseKey: ex.key,
      exerciseName: ex.name,
    });
  };

  const selectedPoints = useMemo(() => {
    if (!selected?.exerciseKey) return [];
    // search current computed data
    for (const pc of data.programmeCards) {
      for (const ex of pc.exercises) {
        if (ex.key === selected.exerciseKey) return ex.points || [];
      }
    }
    return [];
  }, [selected, data.programmeCards]);

  const selectedFirst = selectedPoints.length ? selectedPoints[0].y : null;
  const selectedLatest = selectedPoints.length ? selectedPoints[selectedPoints.length - 1].y : null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Progress</h1>
          <p className="text-sm text-muted-foreground">
            Metric: <span className="font-medium text-foreground">{metricLabel}</span> • Range:{" "}
            <span className="font-medium text-foreground">{range === "all" ? "All time" : range}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {[
            { k: "all", label: "All time" },
            { k: "3m", label: "3 months" },
            { k: "6m", label: "6 months" },
            { k: "1y", label: "1 year" },
          ].map((r) => (
            <Button
              key={r.k}
              variant={range === r.k ? "default" : "secondary"}
              size="sm"
              onClick={() => setRange(r.k)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Top summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <h2 className="font-semibold">Most progress</h2>
            <Badge className="ml-auto bg-success/15 text-success border border-success/30">Top</Badge>
          </div>

          {data.mostProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough data in this range yet.</p>
          ) : (
            <div className="space-y-2">
              {data.mostProgress.map((e) => (
                <button
                  key={`${e.programmeType}-${e.key}`}
                  onClick={() => handleSelectExercise(e.programmeType, e)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-muted/30 hover:bg-muted/50 transition"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.programmeType}</div>
                  </div>
                  <div className="text-sm font-semibold text-success">
                    +{formatNumber(e.delta)} {unitLabel}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="font-semibold">Needs attention</h2>
            <Badge className="ml-auto bg-destructive/15 text-destructive border border-destructive/30">
              Focus
            </Badge>
          </div>

          {data.needsAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough data in this range yet.</p>
          ) : (
            <div className="space-y-2">
              {data.needsAttention.map((e) => (
                <button
                  key={`${e.programmeType}-${e.key}`}
                  onClick={() => handleSelectExercise(e.programmeType, e)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-muted/30 hover:bg-muted/50 transition"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.programmeType}</div>
                  </div>
                  <div className={cx("text-sm font-semibold", e.delta < 0 ? "text-destructive" : "text-muted-foreground")}>
                    {formatNumber(e.delta)} {unitLabel}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Programme containers */}
      <div className="space-y-3">
        {data.programmeCards.map((pc) => (
          <div key={pc.type} className="rounded-xl border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Programme {pc.type}</h3>
              <span className="ml-auto text-xs text-muted-foreground">
                Tap an exercise to drill down
              </span>
            </div>

            <div className="p-3 space-y-2">
              {pc.exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2 py-2">
                  No exercises assigned to this programme.
                </p>
              ) : (
                pc.exercises.map((ex) => {
                  const isActive = selected?.exerciseKey === ex.key;
                  return (
                    <button
                      key={ex.key}
                      onClick={() => handleSelectExercise(pc.type, ex)}
                      className={cx(
                        "w-full rounded-lg border px-3 py-3 text-left transition",
                        isActive
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/40 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{ex.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {metricLabel} in range:{" "}
                            <span className="font-medium text-foreground">
                              {formatNumber(ex.maxVal)} {unitLabel}
                            </span>
                          </div>
                        </div>

                        <div className="text-muted-foreground">
                          <Sparkline points={ex.points} />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Big drill-down chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold">Exercise details</h3>
            <p className="text-sm text-muted-foreground">
              {selected?.exerciseName ? (
                <>
                  <span className="font-medium text-foreground">{selected.exerciseName}</span>{" "}
                  • Programme {selected.programmeType}
                </>
              ) : (
                "Select an exercise above to see the full chart."
              )}
            </p>
          </div>
          {selected?.exerciseName && (
            <Badge className="bg-primary/15 text-primary border border-primary/30">
              {metricLabel}
            </Badge>
          )}
        </div>

        {!selected?.exerciseName ? (
          <p className="text-sm text-muted-foreground">Nothing selected yet.</p>
        ) : selectedPoints.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Not enough data points for this exercise in the selected range.
          </p>
        ) : (
          <>
            <div className="text-foreground">
              <BigLineChart points={selectedPoints} />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <div className="text-xs text-muted-foreground">First</div>
                <div className="text-lg font-semibold">
                  {formatNumber(selectedFirst)} {unitLabel}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <div className="text-xs text-muted-foreground">Latest</div>
                <div className="text-lg font-semibold">
                  {formatNumber(selectedLatest)} {unitLabel}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
