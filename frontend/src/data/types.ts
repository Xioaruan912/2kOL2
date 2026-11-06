export type PositionCode = "PG" | "SG" | "SF" | "PF" | "C";

export type BadgeLevel = "bronze" | "silver" | "gold" | "purple";

export interface BadgeCounts {
  bronze: number;
  silver: number;
  gold: number;
  purple: number;
}

/** 列表页使用的球员摘要 */
export interface PlayerSummary {
  id: string;
  name: string;
  nameEn: string;
  team: string;
  positions: string[];
  archetype: string;
  series: string;
  version: number;
  grade: number;
  overall: number;
  price: number;
  portrait: string;
  height?: number | null;
  wingspan?: number | null;
  badgeCounts: BadgeCounts;
}

export interface RadarEntry {
  name: string;
  score: number;
  max: number;
  rank?: string;
}

export interface AttributeEntry {
  name: string;
  value: number;
  base: number;
}

export interface TendencyEntry {
  name: string;
  value: number;
}

export interface BadgeEntry {
  id: string;
  name: string;
  level: BadgeLevel;
  levelLabel: string;
  levelId: number;
  isMax: boolean;
  desc: string;
  img: string;
}

export interface HotZoneEntry {
  district: string;
  heat: number;
  level: number;
}

export interface TacticRow {
  index: number;
  name: string;
}

export interface ShotTiming {
  meter: number;
  release: number;
  total: number;
}

export interface PlayerActions {
  shotTiming: ShotTiming;
  ol2: Record<string, string>;
  k26: Record<string, string>;
}

/** 详情页完整球员数据 */
export interface PlayerDetail extends PlayerSummary {
  baseOverall: number;
  dribbleStyle: string;
  radar: RadarEntry[];
  attributes: AttributeEntry[];
  tendencies: TendencyEntry[];
  badges: BadgeEntry[];
  hotZones: HotZoneEntry[];
  tactics: {
    primary: string;
    types: TacticRow[];
  };
  actions: PlayerActions;
  /** true 表示该详情由前端离线推演生成，并非官方真实数据 */
  synthetic?: boolean;
}

export type BadgeLevelCn = "紫" | "金" | "银" | "铜";

export interface BadgeCondition {
  name: string;
  level: BadgeLevelCn;
}

export interface AttributeCondition {
  name: string;
  min: number;
}

export interface AdvancedFilterState {
  badges: BadgeCondition[];
  attributes: AttributeCondition[];
  playTypes: number[];
}

export type DataSourceMode = "live" | "local";

export interface DatasetMeta {
  mode: DataSourceMode;
  total: number;
  note?: string;
}
