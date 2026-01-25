import React, { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";

const nivoTheme = {
  text: { fill: "hsl(var(--foreground))" },
  axis: {
    domain: { line: { stroke: "hsl(var(--border))" } },
    ticks: {
      line: { stroke: "hsl(var(--border))" },
      text: { fill: "hsl(var(--muted-foreground))" },
    },
    legend: { text: { fill: "hsl(var(--muted-foreground))" } },
  },
  grid: {
    line: {
      stroke: "hsl(var(--border))",
      strokeDasharray: "3 6",
    },
  },
  tooltip: {
    container: {
      background: "hsl(var(--card))",
      color: "hsl(var(--foreground))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 12,
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    },
  },
};

const fmtDate = (d) => {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const fmtNum = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "-";
  if (Math.abs(x) >= 100) return Math.round(x).toString();
  return (Math.round(x * 10) / 10).toString();
};

/**
 * Supports:
 *  A) multi-series: <ProgressLineChart data={[{id, data:[{x,y,meta}]}]} />
 *  B) legacy single-series: <ProgressLineChart points={[{x,y}]} />
 */
export default function ProgressLineChart({
  data,
  points,
  unitLabel = "kg",
  metricLabel = "Max",
  height = 360,
}) {
  const chartData = useMemo(() => {
    if (Array.isArray(data) && data.length) {
      return data
        .filter((s) => s && s.id && Array.isArray(s.data))
        .map((s) => ({
          id: s.id,
          data: s.data
            .filter((p) => p && p.x != null && Number.isFinite(Number(p.y)))
            .map((p) => ({
              x: p.x instanceof Date ? p.x : new Date(p.x),
              y: Number(p.y),
              meta: p.meta || null,
            }))
            .filter((p) => p.x instanceof Date && !Number.isNaN(p.x.getTime())),
        }))
        .filter((s) => s.data.length > 0);
    }

    // legacy mode
    const pts = Array.isArray(points) ? points : [];
    return [
      {
        id: "progress",
        data: pts
          .filter((p) => p && p.x != null && Number.isFinite(Number(p.y)))
          .map((p) => ({
            x: p.x instanceof Date ? p.x : new Date(p.x),
            y: Number(p.y),
            meta: p.meta || null,
          }))
          .filter((p) => p.x instanceof Date && !Number.isNaN(p.x.getTime())),
      },
    ];
  }, [data, points]);

  const hasEnough = chartData.some((s) => (s.data || []).length >= 2);

  if (!hasEnough) {
    return (
      <div className="h-[220px] w-full flex items-center justify-center text-sm text-muted-foreground">
        Not enough data points yet.
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveLine
        data={chartData}
        theme={nivoTheme}
        margin={{ top: 18, right: 18, bottom: 60, left: 58 }}
        xScale={{ type: "time", format: "native", precision: "day" }}
        xFormat="time:%b %y"
        yScale={{ type: "linear", stacked: false }}
        axisBottom={{
          format: "%b %y",
          tickValues: "every 1 month",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 8,
          legend: unitLabel,
          legendOffset: -46,
          legendPosition: "middle",
        }}
        enableGridX={false}
        enableGridY
        curve="monotoneX"
        useMesh
        // tap/click a point nicely on mobile
        pointSize={9}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        pointColor="hsl(var(--background))"
        // multiple lines need multiple colors
        colors={{ scheme: "category10" }}
        // ✅ Tooltip with exercise/date/value/workout/notes (from meta)
        tooltip={({ point }) => {
          const x = point?.data?.x;
          const y = point?.data?.y;
          const meta = point?.data?.meta || null;

          const exerciseName =
            meta?.exerciseName || point?.serieId || "Exercise";
          const workoutName = meta?.workoutName || meta?.programmeName || "";
          const notes = meta?.notes ? String(meta.notes).trim() : "";

          return (
            <div className="px-3 py-2">
              <div className="text-sm font-semibold">
                {exerciseName}
              </div>

              <div className="text-xs text-muted-foreground mt-0.5">
                {fmtDate(x)}
              </div>

              <div className="mt-2 text-sm font-semibold">
                {metricLabel}: {fmtNum(y)} {unitLabel}
              </div>

              {workoutName ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {workoutName}
                </div>
              ) : null}

              {notes ? (
                <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                  Notes: {notes}
                </div>
              ) : null}
            </div>
          );
        }}
        legends={[
          {
            anchor: "bottom-left",
            direction: "row",
            translateY: 54,
            itemWidth: 90,
            itemHeight: 18,
            itemsSpacing: 10,
            symbolSize: 10,
            symbolShape: "circle",
          },
        ]}
      />
    </div>
  );
}