// src/pages/ProgressPage.js
import React, { useEffect, useMemo, useState } from "react";
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
  if (Math.abs(x) >= 100) return Math.round(x).toString();
  return (Math.round(x * 10) / 10).toString();
};

const monthYearShort = (d) =>
  d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });

const normKey = (nameOrId) =>
  (nameOrId || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

/**
 * One point per date (YYYY-MM-DD), keep MAX for that day.
 * SAFE: never throws if p.x is missing/invalid
 */
const compressByDayMax = (pts) => {
  const m = new Map(); // yyyy-mm-dd -> max

  (pts || []).forEach((p) => {
    const dx = p?.x instanceof Date ? p.x : null;
    if (!dx || Number.isNaN(dx.getTime())) return;

    const y = Number(p?.y);
    if (!Number.isFinite(y)) return;

    const k = dx.toISOString().slice(0, 10);
    const prev = m.get(k);
    if (prev == null || y > prev) m.set(k, y);
  });

  return Array.from(m.entries())
    .map(([k, y]) => ({ x: new Date(k), y }))
    .filter((p) => p.x instanceof Date && !Number.isNaN(p.x.getTime()))
    .sort((a, b) => a.x - b.x);
};

function LineChart({
  points = [],
  unitLabel = "kg",
  height = 240,
  maxXTicks = 6,
  allowNegative = true,
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 640;
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const w = 1000;
  const h = isMobile ? 320 : height;

  const padL = isMobile ? 68 : 56;
  const padR = 16;
  const padT = 16;
  const padB = isMobile ? 64 : 48;

  const safePoints = useMemo(() => {
    return (points || [])
      .filter((p) => p?.x instanceof Date && !Number.isNaN(p.x.getTime()))
      .map((p) => ({
        x: p.x,
        y: Number(p.y),
        meta: p.meta || null, // optional
      }))
      .filter((p) => Number.isFinite(p.y))
      .sort((a, b) => a.x - b.x);
  }, [points]);

  useEffect(() => {
    if (activeIndex == null) return;
    if (activeIndex < 0 || activeIndex >= safePoints.length) setActiveIndex(null);
  }, [activeIndex, safePoints.length]);

  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const xToPx = (i) => {
    if (safePoints.length <= 1) return padL + plotW / 2;
    return padL + (i * plotW) / (safePoints.length - 1);
  };

  // ✅ Y axis blocks of 10 based on timeframe min/max
  const ys = safePoints.map((p) => p.y);
  const minData = ys.length ? Math.min(...ys) : 0;
  const maxData = ys.length ? Math.max(...ys) : 0;

  const rawMin = allowNegative ? minData : Math.max(0, minData);
  const rawMax = Math.max(allowNegative ? maxData : Math.max(0, maxData), 0);

  const STEP = 10;
  let minTick = Math.floor(rawMin / STEP) * STEP;
  let maxTick = Math.ceil(rawMax / STEP) * STEP;

  if (minTick === maxTick) maxTick = minTick + STEP;

  const yToPx = (y) => {
    const t = (y - minTick) / (maxTick - minTick);
    return padT + (1 - t) * plotH;
  };

  const tickCount = Math.round((maxTick - minTick) / STEP) + 1;
  const ticks = Array.from({ length: tickCount }, (_, i) => minTick + i * STEP);

  const maxLabels = isMobile ? 7 : 9;
  const labelEvery = tickCount > maxLabels ? Math.ceil(tickCount / maxLabels) : 1;

  const ticksX = isMobile ? 3 : maxXTicks;
  const n = safePoints.length;
  const everyX = Math.max(1, Math.floor(n / ticksX));

  const pathD =
    safePoints.length >= 2
      ? safePoints
          .map((p, i) => {
            const x = xToPx(i);
            const y = yToPx(p.y);
            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ")
      : "";

  const formatTooltipDate = (d) =>
    d
      ? d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";

  const hitR = isMobile ? 22 : 16;
  const dotR = isMobile ? 6 : 4;
  const ringR = isMobile ? 10 : 8;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="block w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        onClick={() => setActiveIndex(null)}
      >
        {/* grid + y labels */}
        {ticks.map((yVal, i) => {
          const y = yToPx(yVal);
          const shouldLabel =
            i % labelEvery === 0 || i === ticks.length - 1 || i === 0;

          return (
            <g key={yVal}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="currentColor"
                opacity="0.12"
                strokeDasharray="3 6"
              />

              {shouldLabel && (
                <text
                  x={padL - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={isMobile ? "12" : "11"}
                  fill="currentColor"
                  opacity="0.65"
                >
                  {yVal}
                </text>
              )}
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

        {/* unit label */}
        <text
          x={padL}
          y={12}
          textAnchor="start"
          fontSize={isMobile ? "13" : "12"}
          fill="currentColor"
          opacity="0.75"
        >
          {unitLabel}
        </text>

        {/* line */}
        {safePoints.length >= 2 && (
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth={isMobile ? "4" : "3"}
            opacity="0.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* points */}
        {safePoints.map((p, i) => {
          const x = xToPx(i);
          const y = yToPx(p.y);
          const isActive = activeIndex === i;

          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={hitR}
                fill="transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev === i ? null : i));
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setActiveIndex(i);
                }}
                style={{ cursor: "pointer" }}
              />

              <circle
                cx={x}
                cy={y}
                r={ringR}
                fill="transparent"
                stroke="currentColor"
                opacity={isActive ? "0.35" : "0.18"}
                strokeWidth={isActive ? "3" : "2"}
              />

              <circle
                cx={x}
                cy={y}
                r={isActive ? dotR + 1 : dotR}
                fill="currentColor"
                opacity="0.95"
              />
            </g>
          );
        })}

        {/* ✅ Tooltip */}
        {activeIndex != null && safePoints[activeIndex] && (() => {
          const p = safePoints[activeIndex];
          const x = xToPx(activeIndex);
          const y = yToPx(p.y);

          const meta = p.meta || {};
          const dateText = formatTooltipDate(p.x);
          const valueText = `${formatNumber(p.y)} ${unitLabel}`;

          const extraLines = [];
          if (meta.workoutType) extraLines.push(`Workout: ${meta.workoutType}`);
          if (Number.isFinite(Number(meta.reps))) extraLines.push(`Reps: ${Number(meta.reps)}`);
          if (meta.notes) extraLines.push(`Notes: ${String(meta.notes)}`);

          const boxW = isMobile ? 280 : 220;
          const lineH = isMobile ? 18 : 16;
          const baseH = isMobile ? 54 : 46;
          const boxH = baseH + extraLines.length * lineH;

          let tx = x + 12;
          let ty = y - boxH - 12;

          if (tx + boxW > w - padR) tx = x - boxW - 12;
          if (ty < padT) ty = y + 12;

          return (
            <g>
              <line
                x1={x}
                y1={y}
                x2={Math.max(padL, Math.min(w - padR, tx + 10))}
                y2={Math.max(padT, Math.min(h - padB, ty + boxH - 10))}
                stroke="currentColor"
                opacity="0.25"
                strokeDasharray="2 4"
              />

              <rect
                x={tx}
                y={ty}
                width={boxW}
                height={boxH}
                rx="12"
                fill="hsl(var(--card))"
                stroke="hsl(var(--border))"
              />

              <text
                x={tx + 12}
                y={ty + (isMobile ? 22 : 20)}
                fontSize={isMobile ? "14" : "12"}
                fill="hsl(var(--foreground))"
                opacity="0.95"
              >
                {valueText}
              </text>

              <text
                x={tx + 12}
                y={ty + (isMobile ? 42 : 38)}
                fontSize={isMobile ? "12" : "11"}
                fill="hsl(var(--muted-foreground))"
                opacity="0.95"
              >
                {dateText}
              </text>

              {extraLines.map((t, idx) => (
                <text
                  key={idx}
                  x={tx + 12}
                  y={ty + (isMobile ? 62 : 56) + idx * lineH}
                  fontSize={isMobile ? "12" : "11"}
                  fill="hsl(var(--muted-foreground))"
                  opacity="0.95"
                >
                  {t}
                </text>
              ))}
            </g>
          );
        })()}

        {/* x labels */}
        {safePoints.map((p, i) => {
          if (i % everyX !== 0 && i !== safePoints.length - 1) return null;
          const x = xToPx(i);
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={h - 16}
              textAnchor="middle"
              fontSize={isMobile ? "12" : "11"}
              fill="currentColor"
              opacity="0.65"
            >
              {monthYearShort(p.x)}
            </text>
          );
        })}
      </svg>

      {safePoints.length >= 2 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Tip: tap a dot to see date + details
        </div>
      )}
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

    const seriesByKey = new Map();

    const addPoint = (key, x, y, meta) => {
      if (!key || !(x instanceof Date) || Number.isNaN(x.getTime())) return;
      const yy = Number(y);
      if (!Number.isFinite(yy)) return;

      if (!seriesByKey.has(key)) seriesByKey.set(key, []);
      seriesByKey.get(key).push({ x, y: yy, meta: meta || null });
    };

    workouts.forEach((w) => {
      const x = w._dateObj;
      (w.exercises || []).forEach((ex) => {
        const exName = ex?.name || ex?.id || "";
        const key = normKey(exName);

        let best = -Infinity;
        let bestMeta = null;

        (ex.sets || []).forEach((s) => {
          const ww = Number(s?.weight);
          const rr = Number(s?.reps);

          if (!Number.isFinite(ww)) return;

          let v;
          if (progressMetric === "e1rm") v = e1rm(ww, rr);
          else v = ww;

          if (Number.isFinite(v) && v > best) {
            best = v;
            bestMeta = {
              workoutType: w?.type || "",
              reps: Number.isFinite(rr) ? rr : null,
              notes: ex?.notes || "", // note: this is the saved exercise notes from history
            };
          }
        });

        if (best !== -Infinity) addPoint(key, x, best, bestMeta);
      });
    });

    // compress by day max (note: meta kept from the max point)
    const compressedByKey = new Map();
    seriesByKey.forEach((pts, key) => {
      const bestByDay = new Map(); // day -> {x,y,meta}
      (pts || []).forEach((p) => {
        const dx = p?.x instanceof Date ? p.x : null;
        if (!dx || Number.isNaN(dx.getTime())) return;
        const yy = Number(p?.y);
        if (!Number.isFinite(yy)) return;

        const day = dx.toISOString().slice(0, 10);
        const prev = bestByDay.get(day);
        if (!prev || yy > prev.y) bestByDay.set(day, { x: new Date(day), y: yy, meta: p.meta || null });
      });

      const out = Array.from(bestByDay.values())
        .filter((p) => p.x instanceof Date && !Number.isNaN(p.x.getTime()))
        .sort((a, b) => a.x - b.x);

      compressedByKey.set(key, out);
    });

    const programmeCards = programmes.map((p) => {
      const type = String(p?.type || "").toUpperCase();
      const programmeKey = normKey(type || p?.name || p?.title || "programme");

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
        const delta = first != null && latest != null ? latest - first : null;

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

    return { programmeCards, mostProgress, needsAttention };
  }, [range, progressMetric]);

  const unitLabel = weightUnit;

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

  return (
    <div className="p-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-primary">Progress</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Metric:{" "}
              <span className="font-medium text-foreground">{metricLabel}</span>
              <span className="mx-2 opacity-50">•</span>
              Unit:{" "}
              <span className="font-medium text-foreground">{unitLabel}</span>
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
            <p className="text-sm text-muted-foreground">
              Not enough data in this range yet.
            </p>
          ) : (
            <div className="space-y-2">
              {computed.mostProgress.map((e) => (
                <div
                  key={`${e.programmeKey}-${e.key}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {e.programme}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-success whitespace-nowrap">
                    +{formatNumber(e.delta)} {unitLabel}
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
            <p className="text-sm text-muted-foreground">
              Not enough data in this range yet.
            </p>
          ) : (
            <div className="space-y-2">
              {computed.needsAttention.map((e) => (
                <div
                  key={`${e.programmeKey}-${e.key}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {e.programme}
                    </div>
                  </div>
                  <div
                    className={cx(
                      "text-sm font-semibold whitespace-nowrap",
                      e.delta < 0 ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {formatNumber(e.delta)} {unitLabel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Programme containers */}
        <div className="space-y-3">
          {computed.programmeCards.map((pc) => (
            <div
              key={pc.programmeKey}
              className="rounded-xl border border-border bg-card"
            >
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
                          onClick={() =>
                            onToggleExercise(pc.programmeKey, ex.key)
                          }
                          className={cx(
                            "w-full rounded-lg border px-3 py-3 text-left transition",
                            isOpen
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background/40 hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">
                                {ex.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {metricLabel} in range:{" "}
                                <span className="font-medium text-foreground">
                                  {ex.maxVal == null
                                    ? "-"
                                    : `${formatNumber(ex.maxVal)} ${unitLabel}`}
                                </span>
                              </div>
                            </div>

                            <div
                              className={cx(
                                "text-xs font-semibold whitespace-nowrap mt-1",
                                Number.isFinite(ex.delta)
                                  ? ex.delta >= 0
                                    ? "text-success"
                                    : "text-destructive"
                                  : "text-muted-foreground"
                              )}
                            >
                              {Number.isFinite(ex.delta)
                                ? `${ex.delta >= 0 ? "+" : ""}${formatNumber(
                                    ex.delta
                                  )} ${unitLabel}`
                                : ""}
                            </div>
                          </div>
                        </button>

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
                                    <div className="text-xs text-muted-foreground">
                                      First
                                    </div>
                                    <div className="text-lg font-semibold">
                                      {formatNumber(ex.first)} {unitLabel}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-border bg-card p-3">
                                    <div className="text-xs text-muted-foreground">
                                      Latest
                                    </div>
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
          ))}
        </div>
      </div>
    </div>
  );
}