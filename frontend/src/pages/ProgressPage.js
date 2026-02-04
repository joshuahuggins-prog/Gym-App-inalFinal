// src/pages/ProgressPage.js
import React, { useEffect, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import { TrendingUp } from "lucide-react";
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
import {
  getProgrammes,
  getWorkouts,
  getSettings,
  getExercises,
} from "../utils/storage";

/* ---------------- utils ---------------- */

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
  if (rangeKey === "all") return null;
  const d = new Date();
  if (rangeKey === "3m") d.setMonth(d.getMonth() - 3);
  if (rangeKey === "6m") d.setMonth(d.getMonth() - 6);
  if (rangeKey === "1y") d.setFullYear(d.getFullYear() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatNumber = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "-";
  return Math.abs(x) >= 100
    ? Math.round(x).toString()
    : (Math.round(x * 10) / 10).toString();
};

const normKey = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const shortMD = (d) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const longDate = (d) =>
  d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/* keep one max point per day */
const compressByDayMax = (pts) => {
  const map = new Map();
  (pts || []).forEach((p) => {
    if (!(p.x instanceof Date)) return;
    const y = Number(p.y);
    if (!Number.isFinite(y)) return;
    const k = p.x.toISOString().slice(0, 10);
    const prev = map.get(k);
    if (!prev || y > prev.y) map.set(k, { y, meta: p.meta });
  });

  return Array.from(map.entries())
    .map(([k, v]) => ({ x: new Date(k), y: v.y, meta: v.meta }))
    .sort((a, b) => a.x - b.x);
};

const buildTicks10 = (values) => {
  const STEP = 10;
  const ys = values.map(Number).filter(Number.isFinite);
  if (!ys.length) return { ticks: [0, 10], domain: [0, 10] };

  let min = Math.floor(Math.min(...ys) / STEP) * STEP;
  let max = Math.ceil(Math.max(...ys) / STEP) * STEP;
  if (min === max) max += STEP;

  const ticks = [];
  for (let v = min; v <= max; v += STEP) ticks.push(v);
  return { ticks, domain: [min, max] };
};

/* ---------------- tooltip ---------------- */

function CustomTooltip({ active, payload, label, unitLabel }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const dt = toDate(p.fullDate);

  return (
    <div className="rounded-xl border bg-card px-3 py-2 shadow-sm">
      <div className="font-semibold">
        {formatNumber(p.weight)} {unitLabel}
      </div>
      <div className="text-xs text-muted-foreground">
        {dt ? longDate(dt) : label}
      </div>
      {p.workoutType && (
        <div className="text-xs text-muted-foreground">
          {`Workout: ${p.workoutType}`}
        </div>
      )}
      {Number.isFinite(p.reps) && (
        <div className="text-xs text-muted-foreground">
          {`Reps: ${p.reps}`}
        </div>
      )}
      {p.notes && (
        <div className="text-xs text-muted-foreground">
          {`Notes: ${p.notes}`}
        </div>
      )}
    </div>
  );
}

/* ---------------- sparkline ---------------- */

function Sparkline({ points }) {
  const data = points.slice(-14).map((p) => ({
    x: p.x.toISOString(),
    y: p.y,
  }));

  if (data.length < 2) {
    return <div className="w-[88px] h-[28px] rounded-md bg-muted/30" />;
  }

  return (
    <div className="w-[88px] h-[28px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="y"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================= PAGE ================= */

export default function ProgressPage() {
  const settings = getSettings();
  const weightUnit = settings?.weightUnit || "kg";
  const progressMetric = settings?.progressMetric === "e1rm" ? "e1rm" : "max";
  const metricLabel = progressMetric === "e1rm" ? "E1RM" : "Max";

  const [range, setRange] = useState("all");
  const [programmeKey, setProgrammeKey] = useState("");
  const [exerciseKey, setExerciseKey] = useState("");

  /* -------- compute -------- */

  const computed = useMemo(() => {
    const workouts = (getWorkouts() || [])
      .map((w) => ({ ...w, d: toDate(w.date) }))
      .filter((w) => w.d)
      .sort((a, b) => a.d - b.d);

    const start = startOfRange(range);
    const filtered = start ? workouts.filter((w) => w.d >= start) : workouts;

    const series = new Map();

    filtered.forEach((w) => {
      const wt = w.type || "";
      (w.exercises || []).forEach((ex) => {
        const key = normKey(ex.id || ex.name);
        let best = -Infinity;
        let meta = null;

        (ex.sets || []).forEach((s) => {
          const v =
            progressMetric === "e1rm"
              ? e1rm(s.weight, s.reps)
              : Number(s.weight);
          if (Number.isFinite(v) && v > best) {
            best = v;
            meta = {
              workoutType: wt,
              reps: s.reps,
              notes: ex.notes || "",
            };
          }
        });

        if (best > -Infinity) {
          if (!series.has(key)) series.set(key, []);
          series.get(key).push({ x: w.d, y: best, meta });
        }
      });
    });

    const compressed = new Map();
    series.forEach((pts, k) =>
      compressed.set(k, compressByDayMax(pts))
    );

    const programmes = (getProgrammes() || []).map((p) => {
      const pKey = normKey(p.type || p.name);
      return {
        key: pKey,
        label: p.name || `Workout ${p.type}`,
        exercises: (p.exercises || []).map((ex) => {
          const k = normKey(ex.id || ex.name);
          const pts = compressed.get(k) || [];
          return {
            key: k,
            name: ex.name,
            points: pts,
          };
        }),
      };
    });

    return { programmes, compressed };
  }, [range, progressMetric]);

  const programme =
    computed.programmes.find((p) => p.key === programmeKey) ||
    computed.programmes[0];

  const exercise =
    programme?.exercises.find((e) => e.key === exerciseKey) ||
    programme?.exercises[0];

  const points = exercise?.points || [];

  const first = points[0]?.y ?? null;
  const last = points.at(-1)?.y ?? null;
  const prev = points.length >= 2 ? points.at(-2).y : null;

  const allTime = first != null && last != null ? last - first : null;
  const sinceLast = prev != null && last != null ? last - prev : null;
  const percent =
    prev != null && prev !== 0
      ? ((sinceLast / prev) * 100).toFixed(1)
      : null;

  const chartData = points.map((p) => ({
    date: shortMD(p.x),
    weight: p.y,
    fullDate: p.x.toISOString(),
    ...p.meta,
  }));

  const ticks = buildTicks10(chartData.map((d) => d.weight));

  /* ---------------- render ---------------- */

  return (
    <AppHeader
      title="Progress"
      subtitle={`Metric: ${metricLabel} • Unit: ${weightUnit}`}
      rightIconSrc={`${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`}
    >
      <div className="space-y-4">
        {/* summary card */}
        <div className="rounded-xl border bg-card p-4 flex justify-between">
          <div>
            <div className="text-3xl font-bold text-success">
              {sinceLast != null ? `+${formatNumber(sinceLast)} ${weightUnit}` : "—"}
            </div>
            {percent && <div className="text-sm">+{percent}%</div>}
            <div className="text-sm text-muted-foreground">Since last</div>
            {allTime != null && (
              <div className="text-xs text-muted-foreground mt-1">
                All time: +{formatNumber(allTime)} {weightUnit}
              </div>
            )}
          </div>
        </div>

        {/* chart */}
        <div className="rounded-xl border bg-card p-4 h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 6" />
              <XAxis dataKey="date" />
              <YAxis ticks={ticks.ticks} domain={ticks.domain} />
              <Tooltip content={<CustomTooltip unitLabel={weightUnit} />} />
              <Line
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={4}
                dot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppHeader>
  );
}