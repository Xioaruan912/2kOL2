import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PricePoint } from "../data/types";
import { formatPrice } from "../lib/format";

const PAD = { top: 18, right: 18, bottom: 26, left: 66 };
const HEIGHT = 264;

interface PriceTrendProps {
  points: PricePoint[];
  color?: string;
}

export function PriceTrend({ points, color = "#e1532b" }: PriceTrendProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const gradientId = useId().replace(/:/g, "");
  const [width, setWidth] = useState(860);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const bounds = useMemo(() => {
    if (!points.length) return { min: 0, max: 1 };
    const prices = points.map((point) => point.price);
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const span = high - low || Math.max(high * 0.02, 1);
    return { min: low - span * 0.18, max: high + span * 0.18 };
  }, [points]);

  const chartWidth = Math.max(280, width);
  const innerWidth = chartWidth - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;

  const xOf = (index: number) =>
    PAD.left + (points.length <= 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const yOf = (price: number) =>
    PAD.top + (1 - (price - bounds.min) / (bounds.max - bounds.min || 1)) * innerHeight;

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index).toFixed(1)},${yOf(point.price).toFixed(1)}`)
    .join(" ");
  const areaPath = points.length
    ? `${linePath} L${xOf(points.length - 1).toFixed(1)},${PAD.top + innerHeight} L${xOf(0).toFixed(1)},${
        PAD.top + innerHeight
      } Z`
    : "";

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return { value: bounds.min + (bounds.max - bounds.min) * (1 - ratio), y: PAD.top + innerHeight * ratio };
  });

  const xTickIndexes =
    points.length > 1
      ? Array.from(
          new Set([0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1]),
        )
      : points.length === 1
        ? [0]
        : [];

  const hoverPoint = hover !== null ? points[hover] : null;

  const handleMove = (event: React.MouseEvent<SVGRectElement>) => {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relative = event.clientX - rect.left - PAD.left;
    const ratio = Math.min(1, Math.max(0, relative / innerWidth));
    const index = Math.round(ratio * (points.length - 1));
    setHover(index);
  };

  if (!points.length) {
    return <div className="price-chart-empty">暂无身价走势数据</div>;
  }

  const tooltipWidth = 124;
  const tooltipX = hoverPoint ? Math.min(Math.max(xOf(hover!) - tooltipWidth / 2, PAD.left), chartWidth - PAD.right - tooltipWidth) : 0;
  const tooltipY = hoverPoint ? Math.max(PAD.top, yOf(hoverPoint.price) - 50) : 0;

  return (
    <div className="price-chart" ref={wrapRef}>
      <svg
        width={chartWidth}
        height={HEIGHT}
        role="img"
        aria-label="球员身价走势折线图"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`price-area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={PAD.left}
              y1={tick.y}
              x2={chartWidth - PAD.right}
              y2={tick.y}
              stroke="#e9e6df"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 10}
              y={tick.y + 3.5}
              textAnchor="end"
              fontSize={10}
              fill="#85888f"
            >
              {formatPrice(Math.round(tick.value))}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#price-area-${gradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

        {points.length === 1 ? (
          <circle cx={xOf(0)} cy={yOf(points[0].price)} r={3.5} fill={color} />
        ) : null}

        {xTickIndexes.map((index) => (
          <text
            key={index}
            x={xOf(index)}
            y={HEIGHT - 8}
            textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
            fontSize={10}
            fill="#85888f"
          >
            {points[index].date.slice(5)}
          </text>
        ))}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          onMouseMove={handleMove}
        />

        {hoverPoint ? (
          <g pointerEvents="none">
            <line
              x1={xOf(hover!)}
              y1={PAD.top}
              x2={xOf(hover!)}
              y2={PAD.top + innerHeight}
              stroke="#b9b4a9"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={xOf(hover!)} cy={yOf(hoverPoint.price)} r={4} fill="#fff" stroke={color} strokeWidth={2} />
            <g transform={`translate(${tooltipX}, ${tooltipY})`}>
              <rect width={tooltipWidth} height={40} rx={3} fill="#1a1b1e" />
              <text x={10} y={16} fontSize={10} fill="#a9adb6">
                {hoverPoint.date}
              </text>
              <text x={10} y={31} fontSize={11.5} fontWeight={600} fill="#f4f2ee">
                {formatPrice(hoverPoint.price)}
              </text>
            </g>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
