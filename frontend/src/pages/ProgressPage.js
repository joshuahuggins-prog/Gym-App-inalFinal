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
d.toLocaleDateString(undefined, {
year: "numeric",
month: "short",
day: "numeric",
});

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
const dateText = dt ? longDate(dt) : label || "";

const lines = [];
if (p?.workoutType) lines.push(`Workout: ${p.workoutType}`);
if (Number.isFinite(Number(p?.reps))) lines.push(Reps: ${`Number(p.reps)}`);
if (p?.notes) lines.push(Notes: ${String(p.notes)});

return (

<div  
className="rounded-xl border border-border bg-card px-3 py-2 shadow-sm"  
style={{ maxWidth: 280 }}  
>  
<div className="text-sm font-semibold text-foreground">  
{formatNumber(p.weight)} {unitLabel}  
</div>  
<div className="text-xs text-muted-foreground">{dateText}</div>  {lines.length ? (
<div className="mt-1 space-y-0.5">
{lines.slice(0, 3).map((t, i) => (
<div key={i} className="text-xs text-muted-foreground">
{t}
</div>
))}
</div>
) : null}

</div>  );
}

/**

Mini sparkline (non-interactive) for the exercise pills

Uses the same data shape {x: Date, y: number}
*/
function Sparkline({ points }) {
const data = (points || []).slice(-14).map((p) => ({
x: p.x instanceof Date ? p.x.toISOString() : "",
y: Number(p.y),
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
}  // Best-effort "Weighted / Assisted" label from workout data
const inferWeightedOrAssisted = (pts) => {
// If any recorded weight is negative, assume Assisted.
const ys = (pts || []).map((p) => Number(p?.y)).filter(Number.isFinite);
if (!ys.length) return "Weighted";
return ys.some((y) => y < 0) ? "Assisted" : "Weighted";
};

export default function ProgressPage() {
const settings = getSettings();
const weightUnit = settings?.weightUnit || "kg";
const progressMetric = settings?.progressMetric === "e1rm" ? "e1rm" : "max";
const metricLabel = progressMetric === "e1rm" ? "E1RM" : "Max";

const [range, setRange] = useState("all");
const [reloadKey, setReloadKey] = useState(0);

// New UI state
const [selectedProgrammeKey, setSelectedProgrammeKey] = useState("");
const [selectedExerciseKey, setSelectedExerciseKey] = useState("");

// --- Auto refresh so edits in History show up here ---
useEffect(() => {
const bump = () => setReloadKey((k) => k + 1);

const onStorage = (e) => {
if (!e?.key || e.key === "workouts") bump();
};

const onFocus = () => bump();
const onVis = () => {
if (document.visibilityState === "visible") bump();
};

window.addEventListener("storage", onStorage);
window.addEventListener("focus", onFocus);
document.addEventListener("visibilitychange", onVis);

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
const programmesRaw = getProgrammes() || [];
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

// Build series per exercise key from workout history
const seriesByKey = new Map();

const addPoint = (key, x, y, meta) => {
if (!key || !(x instanceof Date) || Number.isNaN(x.getTime())) return;
if (!Number.isFinite(y)) return;
if (!seriesByKey.has(key)) seriesByKey.set(key, []);
seriesByKey.get(key).push({ x, y, meta });
};

workouts.forEach((w) => {
const x = w._dateObj;

const workoutType =
w?.type || w?.programmeType || w?.programme || w?.name || w?.title || "";

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
seriesByKey.forEach((pts, key) =>
compressedByKey.set(key, compressByDayMax(pts))
);

// Build programmes -> exercises list using programme definitions, but link to history series
const programmeCards = programmesRaw
.map((p) => {
const type = String(p?.type || "").toUpperCase();
const programmeKey = normKey(type || p?.name || p?.title || "programme");
const displayName =
p?.name || p?.title || p?.label || (type ? `Workout ${type}` : "Workout");

const exercises = (p?.exercises || [])    
  .map((ex) => {    
    const name = ex?.name || ex?.id || "";    
    const key = normKey(ex?.id || name);    
    const pts = compressedByKey.get(key) || [];    

    const first = pts.length ? pts[0].y : null;    
    const latest = pts.length ? pts[pts.length - 1].y : null;    
    const delta =    
      first != null && latest != null ? latest - first : null;    

    const mode = inferWeightedOrAssisted(pts);    

    return {    
      key,    
      name: name || "Exercise",    
      first,    
      latest,    
      delta,    
      points: pts,    
      mode,    
    };    
  })    
  .filter((e) => e.name);    

return { programmeKey, displayName, exercises };

})
.filter((pc) => pc.exercises.length > 0);

// Programme options
const programmeOptions = programmeCards.map((pc) => ({
key: pc.programmeKey,
label: pc.displayName,
}));

// Fallback option building (if someone has history but no programme definitions)
const keysFromHistory = Array.from(compressedByKey.keys());
const optionsMap = new Map();
exercisesList.forEach((ex) => optionsMap.set(normKey(ex.id), ex.name));
keysFromHistory.forEach((k) => {
if (!optionsMap.has(k)) optionsMap.set(k, k.replace(/_/g, " "));
});

return {
programmeCards,
programmeOptions,
compressedByKey,
};

}, [range, progressMetric, reloadKey]);

// Pick default programme + exercise when data changes
useEffect(() => {
if (!computed.programmeCards.length) return;

// Programme default
if (!selectedProgrammeKey) {
setSelectedProgrammeKey(computed.programmeCards[0].programmeKey);
return;
}

// If current selected programme no longer exists, reset
const stillExists = computed.programmeCards.some(
(p) => p.programmeKey === selectedProgrammeKey
);
if (!stillExists) {
setSelectedProgrammeKey(computed.programmeCards[0].programmeKey);
setSelectedExerciseKey("");
return;
}

}, [computed.programmeCards, selectedProgrammeKey]);

const selectedProgramme = useMemo(() => {
return computed.programmeCards.find(
(p) => p.programmeKey === selectedProgrammeKey
);
}, [computed.programmeCards, selectedProgrammeKey]);

useEffect(() => {
if (!selectedProgramme) return;

// If exercise already set and still exists, keep it
if (selectedExerciseKey) {
const ok = selectedProgramme.exercises.some((e) => e.key === selectedExerciseKey);
if (ok) return;
}

// Otherwise pick first with >=2 points, else first
const firstWithData =
selectedProgramme.exercises.find((e) => (e.points || []).length >= 2) ||
selectedProgramme.exercises[0];

if (firstWithData?.key) setSelectedExerciseKey(firstWithData.key);

}, [selectedProgramme, selectedExerciseKey]);

const selectedPoints = useMemo(() => {
const pts =
(selectedProgramme?.exercises.find((e) => e.key === selectedExerciseKey)?.points) ||
computed.compressedByKey.get(selectedExerciseKey) ||
[];

return pts.map((p) => ({
date: shortMD(p.x),
weight: p.y,
fullDate: p.x.toISOString(),
workoutType: p.meta?.workoutType || "",
reps: p.meta?.reps ?? null,
notes: p.meta?.notes || "",
}));

}, [computed.compressedByKey, selectedExerciseKey, selectedProgramme]);

const ticksInfo = useMemo(() => {
return buildTicks10(selectedPoints.map((d) => d.weight), true);
}, [selectedPoints]);

const firstVal = selectedPoints.length ? selectedPoints[0].weight : null;
const lastVal =
selectedPoints.length ? selectedPoints[selectedPoints.length - 1].weight : null;

const change =
firstVal != null && lastVal != null ? lastVal - firstVal : null;
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

const selectedExerciseLabel = useMemo(() => {
const ex = selectedProgramme?.exercises.find((e) => e.key === selectedExerciseKey);
return ex?.name || selectedExerciseKey.replace(/_/g, " ");
}, [selectedProgramme, selectedExerciseKey]);

return (
<AppHeader
  title="Progress"
  subtitle={`Metric: ${metricLabel} • Unit: ${weightUnit}`}
  rightIconSrc={`${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`}
  actions={

<div className="flex flex-col gap-2">  
{/* Range buttons */}  
<div className="flex flex-wrap gap-2">  
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
</div>  {/* Programme selector */}
<div className="flex items-center gap-2">
<div className="text-xs text-muted-foreground">Programme</div>
<div className="min-w-[220px] flex-1">
<Select
value={selectedProgrammeKey}
onValueChange={(v) => {
setSelectedProgrammeKey(v);
setSelectedExerciseKey("");
}}
>
<SelectTrigger>
<SelectValue placeholder="Select programme" />
</SelectTrigger>
<SelectContent>
{computed.programmeOptions.map((o) => (
<SelectItem key={o.key} value={o.key}>
{o.label}
</SelectItem>
))}
</SelectContent>
</Select>
</div>
</div>
</div>
}

> 

  <div className="space-y-3">    
    {/* Exercise pills/list for selected programme */}    
    <div className="rounded-xl border border-border bg-card p-4">    
      <div className="flex items-center justify-between gap-3 mb-3">    
        <div className="font-semibold flex items-center gap-2">    
          <TrendingUp className="w-5 h-5 text-primary" />    
          Exercises    
        </div>    
        <Badge variant="secondary">    
          {selectedProgramme?.displayName || "—"}    
        </Badge>    
      </div>    {!selectedProgramme?.exercises?.length ? (    
    <p className="text-sm text-muted-foreground">    
      No exercises found in this programme.    
    </p>    
  ) : (    
    <div className="space-y-2">    
      {selectedProgramme.exercises.map((e) => {    
        const active = e.key === selectedExerciseKey;    
        const pts = e.points || [];    
        const latest = pts.length ? pts[pts.length - 1].y : null;    
        const delta = e.delta;    

        return (    
          <button    
            key={e.key}    
            onClick={() => setSelectedExerciseKey(e.key)}    
            className={cx(    
              "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 border transition-all",    
              active    
                ? "border-primary bg-primary/10"    
                : "border-border bg-muted/20 hover:bg-muted/30"    
            )}    
          >    
            <div className="min-w-0 flex-1 text-left">    
              <div className="flex items-center gap-2 min-w-0">    
                <div className={cx("text-sm font-medium truncate", active && "text-primary")}>    
                  {e.name}    
                </div>    
                <Badge variant="secondary" className="shrink-0">    
                  {e.mode || "Weighted"}    
                </Badge>    
              </div>    

              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">    
                <span className="whitespace-nowrap">    
                  Latest:{" "}    
                  <span className="text-foreground font-medium">    
                    {latest != null ? `${formatNumber(latest)} ${weightUnit}` : "—"}    
                  </span>    
                </span>    

                {Number.isFinite(Number(delta)) ? (    
                  <span    
                    className={cx(    
                      "whitespace-nowrap font-medium",    
                      delta >= 0 ? "text-success" : "text-destructive"    
                    )}    
                  >    
                    {delta >= 0 ? "+" : ""}    
                    {formatNumber(delta)} {weightUnit}    
                  </span>    
                ) : null}    
              </div>    
            </div>    

            <Sparkline points={pts} />    
          </button>    
        );    
      })}    
    </div>    
  )}    
</div>    

{/* Main chart */}    
<div className="rounded-xl border border-border bg-card p-4">    
  <div className="flex items-start justify-between gap-4 flex-wrap">    
    <div className="min-w-[220px]">    
      <div className="text-sm font-medium text-muted-foreground mb-1">    
        Selected    
      </div>    
      <div className="text-lg font-semibold">{selectedExerciseLabel}</div>    
      <div className="text-xs text-muted-foreground">    
        Tap an exercise above to change the chart.    
      </div>    
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
        Not enough data points yet for{" "}    
        <span className="font-medium text-foreground">    
          {selectedExerciseLabel}    
        </span>    
        .    
      </div>    
    ) : (    
      <div className="h-[360px]">    
        <ResponsiveContainer width="100%" height="100%">    
          <LineChart    
            data={selectedPoints}    
            margin={{ top: 12, right: 14, bottom: 18, left: 12 }}    
          >    
            <CartesianGrid    
              strokeDasharray="3 6"    
              stroke="hsl(var(--border))"    
            />    
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
          {formatNumber(selectedPoints[selectedPoints.length - 1].weight)}{" "}    
          {weightUnit}    
        </span>    
      </span>    
    </div>    
  )}    
</div>    

<div className="text-xs text-muted-foreground px-1">    
  This page auto-refreshes workout history so edits in History update here.    
</div>

  </div>    
</AppHeader>  );
}
