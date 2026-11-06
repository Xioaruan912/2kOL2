import type { HotZoneEntry } from "../data/types";

const HOOP = { x: 250, y: 430 };
const ARC_R = 240;
const CORNER_Y = 330;

function arcY(x: number): number {
  const dx = x - HOOP.x;
  const inside = ARC_R * ARC_R - dx * dx;
  return inside > 0 ? HOOP.y - Math.sqrt(inside) : CORNER_Y;
}

/** 三分线与中距离之间的分界线：中间跟随弧线，底角走直线 */
function boundaryY(x: number): number {
  if (x < 30 || x > 470) return CORNER_Y;
  return arcY(x);
}

function boundaryPoints(fromX: number, toX: number, steps = 16): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = fromX + ((toX - fromX) * i) / steps;
    points.push([x, boundaryY(x)]);
  }
  return points;
}

function path(points: Array<[number, number]>): string {
  return (
    points
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ") + " Z"
  );
}

const ZONE_PATHS: Record<string, string> = {
  three_left: path([[0, 0], [100, 0], ...boundaryPoints(100, 0, 16)]),
  three_left_center: path([[100, 0], [200, 0], ...boundaryPoints(200, 100, 12)]),
  three_center: path([[200, 0], [300, 0], ...boundaryPoints(300, 200, 12)]),
  three_right_center: path([[300, 0], [400, 0], ...boundaryPoints(400, 300, 12)]),
  three_right: path([[400, 0], [500, 0], ...boundaryPoints(500, 400, 16)]),

  med_left: path([[0, CORNER_Y], ...boundaryPoints(0, 100, 12), [100, 470], [0, 470]]),
  med_left_center: path([
    ...boundaryPoints(100, 200, 10),
    [200, CORNER_Y],
    [100, CORNER_Y],
  ]),
  med_center: path([...boundaryPoints(200, 300, 10), [300, CORNER_Y], [200, CORNER_Y]]),
  med_right_center: path([
    ...boundaryPoints(300, 400, 10),
    [400, CORNER_Y],
    [300, CORNER_Y],
  ]),
  med_right: path([...boundaryPoints(400, 500, 12), [500, 470], [400, 470]]),

  close_left: path([[100, CORNER_Y], [200, CORNER_Y], [200, 470], [100, 470]]),
  close_center: path([[200, CORNER_Y], [300, CORNER_Y], [300, 470], [200, 470]]),
  close_right: path([[300, CORNER_Y], [400, CORNER_Y], [400, 470], [300, 470]]),

  under_basket: path([
    [212, 470],
    [212, 402],
    ...Array.from({ length: 11 }, (_, i): [number, number] => {
      const t = i / 10;
      return [212 + 76 * t, 402 - Math.sin(Math.PI * t) * 18];
    }),
    [288, 470],
  ]),
};

export const ZONE_LABELS: Record<string, string> = {
  under_basket: "篮下",
  close_left: "近区左侧",
  close_center: "近区中路",
  close_right: "近区右侧",
  med_left: "中距左侧底角",
  med_left_center: "中距左中",
  med_center: "中距中路",
  med_right_center: "中距右中",
  med_right: "中距右侧底角",
  three_left: "三分左侧底角",
  three_left_center: "三分左翼",
  three_center: "三分弧顶",
  three_right_center: "三分右翼",
  three_right: "三分右侧底角",
};

export const ZONE_ORDER = [
  "under_basket",
  "close_left",
  "close_center",
  "close_right",
  "med_left",
  "med_left_center",
  "med_center",
  "med_right_center",
  "med_right",
  "three_left",
  "three_left_center",
  "three_center",
  "three_right_center",
  "three_right",
];

const ZONE_COLORS: Record<number, string> = {
  2: "var(--zone-hot)",
  1: "var(--zone-neutral)",
  0: "var(--zone-cold)",
};

export function zoneTone(zone: HotZoneEntry): 0 | 1 | 2 {
  if (zone.heat >= 2) return 2;
  if (zone.heat === 1) return 1;
  return 0;
}

interface HotZoneCourtProps {
  zones: HotZoneEntry[];
  ariaLabel?: string;
}

const THREE_ARC = (() => {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= 26; i += 1) {
    const x = 30 + ((470 - 30) * i) / 26;
    points.push([x, arcY(x)]);
  }
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
})();

export function HotZoneCourt({ zones, ariaLabel = "投篮热区分布" }: HotZoneCourtProps) {
  const zoneMap = new Map(zones.map((zone) => [zone.district, zone]));

  return (
    <svg className="court-svg" viewBox="0 0 500 470" role="img" aria-label={ariaLabel}>
      <rect x="0" y="0" width="500" height="470" fill="#efece5" />

      {ZONE_ORDER.map((district) => {
        const zone = zoneMap.get(district);
        const tone = zone ? zoneTone(zone) : 1;
        return (
          <path
            key={`fill-${district}`}
            d={ZONE_PATHS[district]}
            fill={ZONE_COLORS[tone]}
            stroke="none"
          >
            <title>
              {`${ZONE_LABELS[district] ?? district}：${tone === 2 ? "热区" : tone === 1 ? "中性区" : "冷区"}`}
            </title>
          </path>
        );
      })}

      <g fill="none" stroke="#fbf9f4" strokeWidth={1.7} strokeLinejoin="round">
        {ZONE_ORDER.map((district) => (
          <path key={`stroke-${district}`} d={ZONE_PATHS[district]} />
        ))}
        <rect x="1" y="1" width="498" height="469" />
        <rect x="170" y="280" width="160" height="189" />
        <circle cx="250" cy="280" r="60" />
        <line x1="30" y1="470" x2="30" y2={arcY(30).toFixed(1)} />
        <line x1="470" y1="470" x2="470" y2={arcY(470).toFixed(1)} />
        <polyline points={THREE_ARC} />
        <path d={`M210,430 A40,40 0 0 1 290,430`} />
        <line x1="224" y1="446" x2="276" y2="446" strokeWidth={2.4} />
        <circle cx="250" cy="430" r="8" strokeWidth={2} />
      </g>
    </svg>
  );
}
