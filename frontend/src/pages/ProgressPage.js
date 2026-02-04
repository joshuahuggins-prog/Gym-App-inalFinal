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
    if (!(p.x instanceof Date)) return;
    const y = Number(p.y);
    if (!Number.isFinite(y)) return;
    const k = p.x.toISOString().slice(0, 10);
    const prev = m.get(k);
    if (!prev || y > prev.y) m.set(k, { y, meta: p.meta });
  });

  return Array.from(m.entries())
    .map(([k, v]) => ({
      x: new Date(k),
      y: v.y,
      meta: v.meta,
    }))
    .sort((a, b) => a.x - b.x);
};

const buildTicks10 = (values) => {
  const ys = values.map(Number).filter(Number.isFinite);
  if (!ys.length) return { ticks: [0, 10], domain: [0, 10] };
  const min = Math.floor(Math.min(...ys) / 10) * 10;
  const max = Math.ceil(Math.max(...ys) / 10) * 10;
  const ticks = [];
  for (let i = min; i <= max; i += 10) ticks.push(i);
  return { ticks, domain: [min, max] };
};

function CustomTooltip({ active, payload, unitLabel }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const d = p?.fullDate ? new Date(p.fullDate) : null;

  return (
    <div className="rounded-xl border bg-card px-3 py-2 shadow-sm">
      <div className="font-semibold text-sm">
        {formatNumber(p.weight)} {unitLabel}
      </div>
      <div className="text-xs text-muted-foreground">
        {d ? longDate(d) : ""}
      </div>
    </div>
  );
}

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

export default function ProgressPage() {
  const settings = getSettings();
  const weightUnit = settings?.weightUnit || "kg";
  const progressMetric = settings?.progressMetric === "e1rm" ? "e1rm" : "max";
  const metricLabel = progressMetric === "e1rm" ? "E1RM" : "Max";

  const [range, setRange] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedProgrammeKey, setSelectedProgrammeKey] = useState("");
  const [selectedExerciseKey, setSelectedExerciseKey] = useState("");

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
    const start = startOfRange(range);

    const series = new Map();

    workouts
      .map((w) => ({ ...w, d: toDate(w.date) }))
      .filter((w) => w.d && (!start || w.d >= start))
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
    series.forEach((pts, k) => compressed.set(k, compressByDayMax(pts)));

    const programmeCards = programmes.map((p) => {
      const exercises = (p.exercises || []).map((ex) => {
        const key = normKey(ex.id || ex.name);
        const pts = compressed.get(key) || [];

        const first = pts[0]?.y ?? null;
        const latest = pts[pts.length - 1]?.y ?? null;
        const previous = pts.length >= 2 ? pts[pts.length - 2].y : null;

        return {
          key,
          name: ex.name,
          points: pts,
          deltaAllTime:
            first != null && latest != null ? latest - first : null,
          deltaSinceLast:
            previous != null && latest != null ? latest - previous : null,
        };
      });

      return {
        programmeKey: normKey(p.type || p.name),
        displayName: p.name || `Workout ${p.type}`,
        exercises,
      };
    });

    return { programmeCards, compressed };
  }, [range, reloadKey, progressMetric]);

  const selectedProgramme = computed.programmeCards.find(
    (p) => p.programmeKey === selectedProgrammeKey
  ) || computed.programmeCards[0];

  const selectedExercise =
    selectedProgramme?.exercises.find((e) => e.key === selectedExerciseKey) ||
    selectedProgramme?.exercises[0];

  const selectedPoints = (selectedExercise?.points || []).map((p) => ({
    date: shortMD(p.x),
    weight: p.y,
    fullDate: p.x.toISOString(),
  }));

  const count = selectedPoints.length;
  const firstVal = count >= 1 ? selectedPoints[0].weight : null;
  const lastVal = count >= 1 ? selectedPoints[count - 1].weight : null;
  const prevVal = count >= 2 ? selectedPoints[count - 2].weight : null;

  const changeSinceLast =
    prevVal != null && lastVal != null ? lastVal - prevVal : null;
  const changeAllTime =
    firstVal != null && lastVal != null ? lastVal - firstVal : null;

  const ticksInfo = buildTicks10(selectedPoints.map((p) => p.weight));

  return (
    <AppHeader
      title="Progress"
      subtitle={`Metric: ${metricLabel} • Unit: ${weightUnit}`}
      rightIconSrc={`${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`}
    >
      <div className="space-y-4 p-4">
        <div className="rounded-xl border bg-card p-4 flex justify-between">
          {changeSinceLast != null && (
            <div className="text-right">
              <div
                className={cx(
                  "text-3xl font-bold",
                  changeSinceLast >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {changeSinceLast >= 0 ? "+" : ""}
                {formatNumber(changeSinceLast)} {weightUnit}
              </div>
              <div className="text-sm text-muted-foreground">Since last</div>
              {changeAllTime != null && (
                <div className="text-xs text-muted-foreground">
                  All time:{" "}
                  <span
                    className={cx(
                      changeAllTime >= 0
                        ? "text-success"
                        : "text-destructive"
                    )}
                  >
                    {changeAllTime >= 0 ? "+" : ""}
                    {formatNumber(changeAllTime)} {weightUnit}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={selectedPoints}>
              <CartesianGrid strokeDasharray="3 6" />
              <XAxis dataKey="date" />
              <YAxis
                ticks={ticksInfo.ticks}
                domain={ticksInfo.domain}
                label={{
                  value: `Weight (${weightUnit})`,
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip content={<CustomTooltip unitLabel={weightUnit} />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={4}
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppHeader>
  );
}