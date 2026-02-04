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
} from "../utils/storage";

const cx = (...c) => c.filter(Boolean).join(" ");

const e1rm = (w, r) => {
  const ww = Number(w);
  const rr = Number(r);
  if (!Number.isFinite(ww) || !Number.isFinite(rr) || rr <= 0) return 0;
  return ww * (1 + rr / 30);
};

const normKey = (v) =>
  (v || "").toString().trim().toLowerCase().replace(/\s+/g, "_");

const shortMD = (d) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const formatNumber = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "-";
  if (Math.abs(x) >= 100) return Math.round(x).toString();
  return (Math.round(x * 10) / 10).toString();
};

const percentChange = (from, to) => {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
};

const inferMode = (pts) => {
  const ys = pts.map((p) => p.y).filter(Number.isFinite);
  return ys.some((y) => y < 0) ? "Assisted" : "Weighted";
};

const compressByDayMax = (pts) => {
  const map = new Map();
  pts.forEach((p) => {
    const key = p.x.toISOString().slice(0, 10);
    if (!map.has(key) || p.y > map.get(key).y) map.set(key, p);
  });
  return Array.from(map.values()).sort((a, b) => a.x - b.x);
};

function CustomTooltip({ active, payload, unitLabel }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border bg-card px-3 py-2 shadow-sm">
      <div className="text-sm font-semibold">
        {formatNumber(p.weight)} {unitLabel}
      </div>
      <div className="text-xs text-muted-foreground">{p.date}</div>
    </div>
  );
}

export default function ProgressPage() {
  const settings = getSettings();
  const weightUnit = settings?.weightUnit || "kg";
  const progressMetric = settings?.progressMetric === "e1rm" ? "e1rm" : "max";
  const metricLabel = progressMetric === "e1rm" ? "E1RM" : "Max";

  const [reloadKey, setReloadKey] = useState(0);
  const [selectedProgrammeKey, setSelectedProgrammeKey] = useState("");
  const [selectedExerciseKey, setSelectedExerciseKey] = useState("");
  const [viewMode, setViewMode] = useState("last"); // last | all

  useEffect(() => {
    const bump = () => setReloadKey((k) => k + 1);
    window.addEventListener("focus", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("focus", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const computed = useMemo(() => {
    const programmes = getProgrammes() || [];
    const workouts = getWorkouts() || [];

    const series = new Map();

    workouts
      .map((w) => ({ ...w, d: new Date(w.date) }))
      .filter((w) => !Number.isNaN(w.d.getTime()))
      .sort((a, b) => a.d - b.d)
      .forEach((w) => {
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

    const programmeCards = programmes.map((p) => {
      const exercises = (p.exercises || []).map((ex) => {
        const key = normKey(ex.id || ex.name);
        const pts = compressed.get(key) || [];

        const first = pts[0]?.y ?? null;
        const last = pts[pts.length - 1]?.y ?? null;
        const prev = pts.length >= 2 ? pts[pts.length - 2].y : null;

        return {
          key,
          name: ex.name,
          points: pts,
          mode: inferMode(pts),
          deltaAll: first != null && last != null ? last - first : null,
          deltaLast: prev != null && last != null ? last - prev : null,
          percentAll: percentChange(first, last),
          percentLast: percentChange(prev, last),
        };
      });

      return {
        programmeKey: normKey(p.type || p.name),
        displayName: p.name || `Workout ${p.type}`,
        exercises,
      };
    });

    return { programmeCards };
  }, [reloadKey, progressMetric]);

  const selectedProgramme =
    computed.programmeCards.find((p) => p.programmeKey === selectedProgrammeKey) ||
    computed.programmeCards[0];

  const selectedExercise =
    selectedProgramme?.exercises.find((e) => e.key === selectedExerciseKey) ||
    selectedProgramme?.exercises[0];

  const selectedPoints =
    selectedExercise?.points.map((p) => ({
      date: shortMD(p.x),
      weight: p.y,
    })) || [];

  const isAssisted = selectedExercise?.mode === "Assisted";

  const value =
    viewMode === "last"
      ? selectedExercise?.deltaLast
      : selectedExercise?.deltaAll;

  const percent =
    viewMode === "last"
      ? selectedExercise?.percentLast
      : selectedExercise?.percentAll;

  const valueClass = isAssisted
    ? "text-amber-600"
    : value >= 0
    ? "text-success"
    : "text-destructive";

  return (
    <AppHeader
      title="Progress"
      subtitle={`Metric: ${metricLabel} • Unit: ${weightUnit}`}
      rightIconSrc={`${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`}
    >
      <div className="p-4 space-y-4">
        {/* Stat container */}
        <div className="rounded-xl border bg-card p-4 flex justify-between items-center">
          <div>
            <div className={cx("text-3xl font-bold", valueClass)}>
              {value >= 0 ? "+" : ""}
              {formatNumber(value)} {weightUnit}
            </div>
            {Number.isFinite(percent) && (
              <div className="text-sm text-muted-foreground">
                {percent >= 0 ? "+" : ""}
                {percent.toFixed(1)}%
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {viewMode === "last" ? "Since last" : "All time"}
            </div>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setViewMode((m) => (m === "last" ? "all" : "last"))
            }
          >
            View: {viewMode === "last" ? "All time" : "Since last"}
          </Button>
        </div>

        {/* Chart */}
        <div className="rounded-xl border bg-card p-4 h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={selectedPoints}>
              <CartesianGrid strokeDasharray="3 6" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                content={<CustomTooltip unitLabel={weightUnit} />}
              />
              <Line
                type="monotone"
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