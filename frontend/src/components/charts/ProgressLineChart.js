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
    },
  },
};

export default function ProgressLineChart({ points, unitLabel }) {
  const data = [
    {
      id: "progress",
      data: points.map((p) => ({
        x: p.x,
        y: p.y,
      })),
    },
  ];

  return (
    <div className="h-[320px] w-full">
      <ResponsiveLine
        data={data}
        theme={nivoTheme}
        margin={{ top: 20, right: 20, bottom: 56, left: 56 }}
        xScale={{ type: "time", format: "native" }}
        xFormat="time:%b %y"
        yScale={{ type: "linear", stacked: false }}
        axisBottom={{
          format: "%b %y",
          tickValues: "every 1 month",
        }}
        enableGridX={false}
        useMesh
        enableSlices="x"
        pointSize={8}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        pointColor="hsl(var(--background))"
        colors={["hsl(var(--foreground))"]}
      />
    </div>
  );
}