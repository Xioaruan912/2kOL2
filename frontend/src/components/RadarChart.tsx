import type { RadarEntry } from "../data/types";
import { RADAR_ORDER } from "../data/taxonomy";

export interface RadarSeriesInput {
  name: string;
  color: string;
  radar: RadarEntry[];
}

interface RadarChartProps {
  series: RadarSeriesInput[];
  size?: number;
  showLabels?: boolean;
}

function polar(cx: number, cy: number, radius: number, index: number, total: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

export function RadarChart({ series, size = 380, showLabels = true }: RadarChartProps) {
  const axes = RADAR_ORDER.filter((name) =>
    series.some((item) => item.radar.some((entry) => entry.name === name)),
  );
  const total = axes.length || 11;
  const pad = showLabels ? 46 : 18;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - pad;

  return (
    <svg
      className="radar-svg"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`能力雷达图，包含 ${axes.join("、")} 共 ${total} 个维度`}
    >
      <g>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <polygon
            key={ratio}
            points={axes
              .map((_, i) => {
                const p = polar(cx, cy, radius * ratio, i, total);
                return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
              })
              .join(" ")}
            fill={ratio === 1 ? "#faf8f4" : "none"}
            stroke="#e2ded4"
            strokeWidth={ratio === 1 ? 1.2 : 1}
          />
        ))}
        {axes.map((name, i) => {
          const p = polar(cx, cy, radius, i, total);
          return (
            <line
              key={name}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="#e2ded4"
              strokeWidth={1}
            />
          );
        })}
      </g>

      {series.map((item) => {
        const points = axes.map((name, i) => {
          const entry = item.radar.find((r) => r.name === name);
          const max = entry?.max && entry.max > 0 ? entry.max : 130;
          const ratio = entry ? Math.min(1, entry.score / max) : 0;
          return polar(cx, cy, radius * Math.max(ratio, 0.04), i, total);
        });
        return (
          <g key={item.name}>
            <polygon
              points={points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}
              fill={item.color}
              fillOpacity={series.length > 1 ? 0.12 : 0.16}
              stroke={item.color}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <circle key={axes[i]} cx={p.x} cy={p.y} r={2.4} fill={item.color}>
                <title>
                  {`${axes[i]} ${item.radar.find((r) => r.name === axes[i])?.score ?? 0}`}
                </title>
              </circle>
            ))}
          </g>
        );
      })}

      {showLabels
        ? axes.map((name, i) => {
            const p = polar(cx, cy, radius + 22, i, total);
            const anchor = Math.abs(p.x - cx) < 6 ? "middle" : p.x > cx ? "start" : "end";
            const entry = series[0]?.radar.find((r) => r.name === name);
            return (
              <g key={name}>
                <text
                  x={p.x}
                  y={p.y - (entry ? 3 : 0)}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fontSize={11.5}
                  fill="#6d7078"
                >
                  {name}
                </text>
                {series.length === 1 && entry ? (
                  <text
                    x={p.x}
                    y={p.y + 12}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="#1a1b1e"
                    style={{ fontFamily: "var(--font-num)" }}
                  >
                    {entry.score}
                  </text>
                ) : null}
              </g>
            );
          })
        : null}
    </svg>
  );
}
