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

const formatNumber = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "-";
  if (Math.abs(x) >= 100) return Math.round(x).toString();
  return (Math.round(x * 10) / 10).toString();
};

const normKey = (v) =>
  (v || "").toString().trim().toLowerCase().replace(/\s+/g, "_");

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

export default function ProgressPage() {
  const settings = getSettings();
  const weightUnit = settings?.weightUnit || "kg";
  const progressMetric = settings?.progressMetric === "e1rm" ? "e1rm" : "max";
  const metricLabel = progressMetric === "e1rm" ? "E1RM" : "Max";

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
        const first = pts.length ? pts[0].y : null;
        const last = pts.length ? pts[pts.length - 1].y : null;
        return {
          key,
          name: ex.name,
          points: pts,
          deltaAll:
            first != null && last != null ? last - first : null,
        };
      }),
    }));

    return { programmeCards, compressed };
  }, [reloadKey, progressMetric]);

  const selectedProgramme =
    computed.programmeCards.find(
      (p) => p.programmeKey === selectedProgrammeKey
    ) || computed.programmeCards[0];

  const selectedExercise =
    selectedProgramme?.exercises.find(
      (e) => e.key === selectedExerciseKey
    ) || selectedProgramme?.exercises[0];

  const selectedPoints =
    selectedExercise?.points?.map((p) => ({
      date: shortMD(p.x),
      weight: p.y,
      fullDate: p.x.toISOString(),
    })) || [];

  const count = selectedPoints.length;
  const lastVal = count >= 1 ? selectedPoints[count - 1].weight : null;
  const prevVal = count >= 2 ? selectedPoints[count - 2].weight : null;
  const firstVal = count >= 1 ? selectedPoints[0].weight : null;

  const changeLast =
    lastVal != null && prevVal != null ? lastVal - prevVal : null;
  const changeAll =
    lastVal != null && firstVal != null ? lastVal - firstVal : null;

  return (
    <AppHeader
      title="Progress"
      subtitle={`Metric: ${metricLabel} • Unit: ${weightUnit}`}
      rightIconSrc="/icons/icon-overlay-white-32-v1.png"
    >
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
              Since last
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
                  {formatNumber(changeAll)} {weightUnit}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </AppHeader>
  );
}