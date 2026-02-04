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

const normKey = (v) =>
  (v || "")
    .toString()
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

const compressByDayMax = (pts) => {
  const m = new Map();
  (pts || []).forEach((p) => {
    const dx = p?.x instanceof Date ? p.x : null;
    if (!dx) return;
    const y = Number(p?.y);
    if (!Number.isFinite(y)) return;
    const k = dx.toISOString().slice(0, 10);
    const prev = m.get(k);
    if (!prev || y > prev.y) m.set(k, { y, meta: p.meta || null });
  });

  return Array.from(m.entries())
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

  const count = Math.round((max - min) / STEP) + 1;
  return {
    ticks: Array.from({ length: count }, (_, i) => min + i * STEP),
    domain: [min, max],
  };
};

function CustomTooltip({ active, payload, unitLabel }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
      <div className="text-sm font-semibold text-foreground">
        {formatNumber(p.weight)} {unitLabel}
      </div>
      <div className="text-xs text-muted-foreground">
        {longDate(new Date(p.fullDate))}
      </div>
    </div>
  );
}

function Sparkline({ points }) {
  const data = (points || []).slice(-14).map((p) => ({
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

export default function ProgressPage() {
  const settings = getSettings();
  const weightUnit = settings?.weightUnit || "kg";
  const progressMetric = settings?.progressMetric === "e1rm" ? "e1rm" : "max";

  const [range, setRange] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedProgrammeKey, setSelectedProgrammeKey] = useState("");
  const [selectedExerciseKey, setSelectedExerciseKey] = useState("");

  useEffect(() => {
    const bump = () => setReloadKey((k) => k + 1);
    window.addEventListener("focus", bump);
    return () => window.removeEventListener("focus", bump);
  }, []);

  const computed = useMemo(() => {
    const programmes = getProgrammes() || [];
    const workouts = (getWorkouts() || [])
      .map((w) => ({ ...w, d: toDate(w.date) }))
      .filter((w) => w.d)
      .sort((a, b) => a.d - b.d);

    const series = new Map();

    workouts.forEach((w) => {
      (w.exercises || []).forEach((ex) => {
        const key = normKey(ex.id || ex.name);
        let best = -Infinity;

        (ex.sets || []).forEach((s) => {
          const v =
            progressMetric === "e1rm"
              ? e1rm(s.weight, s.reps)
              : Number(s.weight);
          if (Number.isFinite(v)) best = Math.max(best, v);
        });

        if (best !== -Infinity) {
          if (!series.has(key)) series.set(key, []);
          series.get(key).push({ x: w.d, y: best });
        }
      });
    });

    const compressed = new Map();
    series.forEach((pts, k) =>
      compressed.set(k, compressByDayMax(pts))
    );

    const programmeCards = programmes.map((p) => ({
      programmeKey: normKey(p.name || p.type),
      displayName: p.name || p.type,
      exercises: (p.exercises || []).map((ex) => {
        const key = normKey(ex.id || ex.name);
        const pts = compressed.get(key) || [];
        return {
          key,
          name: ex.name,
          points: pts,
        };
      }),
    }));

    return { programmeCards, compressed };
  }, [reloadKey, progressMetric]);

  const selectedProgramme = computed.programmeCards.find(
    (p) => p.programmeKey === selectedProgrammeKey
  );

  const selectedPoints =
    selectedProgramme?.exercises.find(
      (e) => e.key === selectedExerciseKey
    )?.points || [];

  // 🔥 PROGRESS CALCULATION (LAST + ALL TIME)
  const count = selectedPoints.length;
  const lastIdx = count - 1;

  const lastVal = lastIdx >= 0 ? selectedPoints[lastIdx].y : null;
  const prevVal = lastIdx > 0 ? selectedPoints[lastIdx - 1].y : null;
  const firstVal = count > 0 ? selectedPoints[0].y : null;

  const changeLast =
    prevVal != null && lastVal != null ? lastVal - prevVal : null;
  const percentLast =
    prevVal && lastVal
      ? ((changeLast / prevVal) * 100).toFixed(1)
      : null;

  const changeAll =
    firstVal != null && lastVal != null ? lastVal - firstVal : null;
  const percentAll =
    firstVal && lastVal
      ? ((changeAll / firstVal) * 100).toFixed(1)
      : null;

  return (
    <AppHeader title="Progress">
      <div className="rounded-xl border border-border bg-card p-4">
        {changeLast != null && (
          <div className="text-right">
            <div
              className={cx(
                "text-3xl font-bold",
                changeLast >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {changeLast >= 0 ? "+" : ""}
              {formatNumber(changeLast)} {weightUnit}
            </div>
            <div className="text-sm text-muted-foreground">
              Since last • {percentLast}%
            </div>
            {changeAll != null && (
              <div className="text-xs text-muted-foreground mt-1">
                All time:{" "}
                <span
                  className={cx(
                    "font-medium",
                    changeAll >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {changeAll >= 0 ? "+" : ""}
                  {formatNumber(changeAll)} {weightUnit} ({percentAll}%)
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </AppHeader>
  );
}