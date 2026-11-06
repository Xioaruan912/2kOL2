import type { HotZoneEntry } from "../data/types";

/**
 * 热区几何来自 2KOL2 小程序官方绘制逻辑：
 * 画布 300 x 250，底线在上方（y=0），篮下在顶部中央。
 * 14 个多边形按官方顺序排列，另含篮下月牙与两条距离弧线。
 */
interface ZoneShape {
  district: string;
  points: Array<[number, number]>;
  dashed?: string;
}

const ZONE_SHAPES: ZoneShape[] = [
  { district: "three_left", points: [[1, 0], [1, 175], [40, 150], [20, 130], [20, 0]] },
  { district: "med_left", points: [[20, 0], [20, 130], [40, 150], [90, 115], [70, 95], [70, 0]] },
  { district: "close_left", points: [[70, 0], [70, 95], [103, 127], [140, 60], [125, 45], [125, 0]] },
  { district: "close_center", points: [[103, 127], [140, 60], [160, 60], [197, 127], [150, 170]] },
  { district: "close_right", points: [[230, 0], [230, 95], [197, 127], [160, 60], [175, 45], [175, 0]] },
  { district: "med_left_center", points: [[1, 175], [90, 115], [112, 133], [125, 140], [105, 190]] },
  { district: "med_center", points: [[80, 250], [125, 140], [150, 143], [175, 140], [220, 250]] },
  { district: "med_right_center", points: [[299, 175], [210, 115], [188, 133], [175, 140], [195, 190]] },
  {
    district: "under_basket",
    points: [[125, 0], [175, 0], [175, 45], [125, 45]],
    dashed: "95 50",
  },
  { district: "med_right", points: [[280, 0], [280, 130], [260, 150], [210, 115], [230, 95], [230, 0]] },
  { district: "three_right", points: [[299, 0], [299, 175], [259, 150], [279, 130], [279, 0]] },
  {
    district: "three_left_center",
    points: [[1, 175], [1, 250], [80, 250], [105, 190], [80, 180], [40, 150]],
    dashed: "180 115",
  },
  {
    district: "three_center",
    points: [[80, 250], [220, 250], [195, 190], [154, 201], [105, 190]],
    dashed: "180 115",
  },
  {
    district: "three_right_center",
    points: [[299, 175], [299, 250], [220, 250], [195, 192], [220, 181], [260, 150]],
  },
];

/** 篮下区域用二次曲线补出的月牙，与官方绘制一致 */
const UNDER_BASKET_CRESCENT = "M175,45 Q150,80 125,45 Z";

const DISTANCE_ARCS = [
  "M70,95 Q150,192 230,95",
  "M40,150 Q150,250 260,150",
];

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

export const ZONE_ORDER = ZONE_SHAPES.map((shape) => shape.district);

/** 说明列表使用空间顺序：由外到内，从左到右 */
export const ZONE_DISPLAY_ORDER = [
  "three_left",
  "three_left_center",
  "three_center",
  "three_right_center",
  "three_right",
  "med_left",
  "med_left_center",
  "med_center",
  "med_right_center",
  "med_right",
  "close_left",
  "close_center",
  "close_right",
  "under_basket",
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

function toPath(points: Array<[number, number]>): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";
}

interface HotZoneCourtProps {
  zones: HotZoneEntry[];
  ariaLabel?: string;
}

export function HotZoneCourt({ zones, ariaLabel = "投篮热区分布" }: HotZoneCourtProps) {
  const zoneMap = new Map(zones.map((zone) => [zone.district, zone]));

  return (
    <svg
      className="court-svg"
      viewBox="0 0 300 250"
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="court-wood" width="48" height="46" patternUnits="userSpaceOnUse">
          <rect width="48" height="46" fill="#dfc9a4" />
          <rect x="0" y="0" width="1.1" height="46" fill="#c3a97f" />
          <rect x="24" y="0" width="1.1" height="46" fill="#c3a97f" />
          <path
            d="M5,0 C8,10 2,22 6,32 C8,39 5,43 5,46"
            stroke="#b99e72"
            strokeWidth="0.8"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M32,0 C36,12 30,24 34,36 C35,41 33,44 33,46"
            stroke="#b29669"
            strokeWidth="0.7"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M14,0 C16,9 12,19 15,30 C17,38 14,42 14,46"
            stroke="#bda379"
            strokeWidth="0.55"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M41,0 C43,11 39,23 42,34"
            stroke="#b29669"
            strokeWidth="0.5"
            fill="none"
            opacity="0.55"
          />
          <path
            d="M20,0 C22,14 18,26 21,38"
            stroke="#bda379"
            strokeWidth="0.45"
            fill="none"
            opacity="0.45"
          />
        </pattern>
      </defs>

      <rect x="0" y="0" width="300" height="250" fill="url(#court-wood)" />

      <g>
        {ZONE_SHAPES.map((shape) => {
          const zone = zoneMap.get(shape.district);
          const tone = zone ? zoneTone(zone) : 1;
          return (
            <path
              key={shape.district}
              d={toPath(shape.points)}
              fill={ZONE_COLORS[tone]}
              fillOpacity={0.9}
              stroke="#eaeaea"
              strokeWidth={1.1}
              strokeDasharray={shape.dashed}
              strokeLinejoin="round"
            >
              <title>
                {`${ZONE_LABELS[shape.district] ?? shape.district}：${
                  tone === 2 ? "热区" : tone === 1 ? "中性区" : "冷区"
                }`}
              </title>
            </path>
          );
        })}

        {/* 篮下月牙 */}
        {(() => {
          const zone = zoneMap.get("under_basket");
          const tone = zone ? zoneTone(zone) : 1;
          return (
            <path
              d={UNDER_BASKET_CRESCENT}
              fill={ZONE_COLORS[tone]}
              fillOpacity={0.9}
              stroke="#eaeaea"
              strokeWidth={1.1}
              strokeDasharray="95 50"
            />
          );
        })()}

        {/* 两条距离弧线 */}
        {DISTANCE_ARCS.map((d) => (
          <path key={d} d={d} fill="none" stroke="#eaeaea" strokeWidth={1.1} />
        ))}
      </g>
    </svg>
  );
}
