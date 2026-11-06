import type { BadgeLevel, PlayerDetail, RadarEntry } from "./types";

export const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

export const POSITION_LABEL: Record<string, string> = {
  PG: "控球后卫",
  SG: "得分后卫",
  SF: "小前锋",
  PF: "大前锋",
  C: "中锋",
};

/* ------------------------------------------------------------------ 属性分组 */

export interface AttributeGroup {
  key: string;
  label: string;
  hint: string;
  names: string[];
}

export const ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    key: "finish",
    label: "终结与内线",
    hint: "篮下完成度、背身技巧与造杀伤",
    names: [
      "突破上篮",
      "原地近距离投篮",
      "近距离投篮",
      "原地灌篮",
      "突破灌篮",
      "背身后仰跳投",
      "背身钩射",
      "背身控制",
      "造成对手犯规",
    ],
  },
  {
    key: "shoot",
    label: "投篮",
    hint: "中远距离投射与罚球稳定性",
    names: ["中距离投篮", "中投", "三分投篮", "三分", "罚球"],
  },
  {
    key: "playmaking",
    label: "组织进攻",
    hint: "控球与传球质量",
    names: ["控球", "传球智商", "传球准确性", "传球视野", "传球洞察力"],
  },
  {
    key: "defense",
    label: "防守",
    hint: "一对一压迫、协防与护框",
    names: [
      "内线防守",
      "外线防守",
      "横向移动速度",
      "横向敏捷",
      "盖帽",
      "运球抢断",
      "传球抢断",
      "抢断",
      "防守稳定性",
      "协防智商",
    ],
  },
  {
    key: "rebound",
    label: "篮板",
    hint: "前后场篮板与争抢",
    names: ["进攻篮板", "防守篮板", "争抢"],
  },
  {
    key: "physical",
    label: "身体素质",
    hint: "速度、弹跳与对抗",
    names: ["速度", "加速", "敏捷", "运球速度", "弹跳力", "弹跳", "力量", "体力"],
  },
  {
    key: "mental",
    label: "精神属性",
    hint: "投篮决策与进攻稳定性",
    names: ["投篮智商", "进攻稳定性", "接球"],
  },
];

const ATTRIBUTE_GROUP_INDEX = new Map<string, string>();
ATTRIBUTE_GROUPS.forEach((g) => g.names.forEach((n) => ATTRIBUTE_GROUP_INDEX.set(n, g.key)));

export function attributeGroupOf(name: string): string {
  return ATTRIBUTE_GROUP_INDEX.get(name) ?? "other";
}

/* ------------------------------------------------------------------ 徽章分类 */

export const BADGE_CATEGORIES = [
  { key: "finish", label: "终结" },
  { key: "shoot", label: "投篮" },
  { key: "playmaking", label: "组织" },
  { key: "defense", label: "防守" },
  { key: "rebound", label: "篮板" },
] as const;

export type BadgeCategoryKey = (typeof BADGE_CATEGORIES)[number]["key"] | "other";

export const BADGE_NAME_MAP: Record<string, string[]> = {
  finish: [
    "特技演员",
    "空中作业",
    "背打惩罚者",
    "对抗冲筐",
    "梦幻脚步",
    "沉底步大师",
    "篮下快起高手",
    "无畏终结者",
    "巨人克星",
    "无限起飞",
    "大打小高手",
    "背篮转身技师",
    "隔扣达人",
    "卓越手感",
    "强硬篮下",
    "闪躲终结者",
    "背身投篮大师",
    "勾手专家",
    "抛投高手",
    "挡拆终结者",
    "空接终结者",
  ],
  shoot: [
    "三分特工",
    "不知疲倦",
    "强投高手",
    "接球投篮手",
    "定点射手",
    "关键射手",
    "逆转小子",
    "底线三分球手",
    "神射手",
    "绿色机器",
    "保持警惕",
    "射程无限",
    "中投王者",
    "无球跑位",
    "空隙猎手",
    "进入节奏",
    "火枪手",
    "挡拆投篮手",
  ],
  playmaking: [
    "脚踝终结者",
    "应变大师",
    "一传大师",
    "运球好手",
    "连招好手",
    "十美分",
    "组织核心",
    "运球老手",
    "光速引擎",
    "错位专家",
    "见缝插针",
    "内线组织者",
    "第一步大师",
    "特别派送",
    "护球大师",
    "战术大师",
    "转换发动机",
  ],
  defense: [
    "铁钳双手",
    "禁区防守大师",
    "护踝",
    "防守干扰",
    "追帽大师",
    "死亡缠绕",
    "持球抢断大师",
    "拦截者",
    "盯防高手",
    "无球跑位克星",
    "挡拆躲闪者",
    "背篮防守悍将",
    "弹跳大师",
    "争球狂人",
    "防守核心",
    "协防专家",
  ],
  rebound: ["卡位怪兽", "冲板大师", "铜墙铁壁", "篮板精英", "补篮大师", "禁区霸主"],
};

const BADGE_CATEGORY_INDEX = new Map<string, BadgeCategoryKey>();
Object.entries(BADGE_NAME_MAP).forEach(([key, names]) =>
  names.forEach((n) => BADGE_CATEGORY_INDEX.set(n, key as BadgeCategoryKey)),
);

export function badgeCategoryOf(name: string): BadgeCategoryKey {
  return BADGE_CATEGORY_INDEX.get(name) ?? "other";
}

export const BADGE_LEVELS: Record<
  BadgeLevel,
  { label: string; short: string; color: string; tint: string; rank: number }
> = {
  bronze: { label: "铜徽章", short: "铜", color: "#9d6b45", tint: "#f0e2d6", rank: 1 },
  silver: { label: "银徽章", short: "银", color: "#7c848f", tint: "#e7e9ec", rank: 2 },
  gold: { label: "金徽章", short: "金", color: "#b9922c", tint: "#f6eccf", rank: 3 },
  purple: { label: "紫徽章", short: "紫", color: "#7952b3", tint: "#ece4f7", rank: 4 },
};

export const BADGE_ORDER: BadgeLevel[] = ["bronze", "silver", "gold", "purple"];

export function totalBadges(detail: Pick<PlayerDetail, "badgeCounts">): number {
  const c = detail.badgeCounts;
  return c.bronze + c.silver + c.gold + c.purple;
}

/* ------------------------------------------------------------------ 倾向分类 */

export const TENDENCY_CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "defense", label: "防守" },
  { key: "pass", label: "传球" },
  { key: "decision", label: "决策" },
  { key: "shoot", label: "投篮" },
  { key: "paint", label: "篮下" },
  { key: "drive", label: "突破" },
  { key: "post", label: "背身" },
] as const;

export type TendencyCategoryKey = Exclude<(typeof TENDENCY_CATEGORIES)[number]["key"], "all">;

const TENDENCY_RULES: Array<{ key: TendencyCategoryKey; pattern: RegExp }> = [
  { key: "post", pattern: /背身|背篮|低位|勾手/ },
  { key: "defense", pattern: /抢断|盖帽|干扰|犯规|纪律|盯防|争抢|篮板/ },
  { key: "pass", pattern: /传球|空接传/ },
  { key: "paint", pattern: /扣篮|上篮|补篮|篮下|油漆区|抛投/ },
  { key: "drive", pattern: /突破|交叉步|里外|运球突破|犹豫步突破/ },
  { key: "shoot", pattern: /投篮|中投|三分|跳投|出手|打板|后仰|罚球/ },
  { key: "decision", pattern: /触球|三威胁|单挑|切出|运球|犹豫步|调整/ },
];

export function tendencyCategoryOf(name: string): TendencyCategoryKey {
  for (const rule of TENDENCY_RULES) {
    if (rule.pattern.test(name)) return rule.key;
  }
  return "decision";
}

/* ------------------------------------------------------------------ 雷达维度 */

export const RADAR_ORDER = [
  "运动",
  "突破",
  "篮下",
  "背身",
  "中投",
  "三分",
  "组织",
  "内防",
  "外防",
  "抢断",
  "篮板",
];

export function sortRadar(radar: RadarEntry[]): RadarEntry[] {
  return [...radar].sort(
    (a, b) => RADAR_ORDER.indexOf(a.name) - RADAR_ORDER.indexOf(b.name),
  );
}

/* ------------------------------------------------------------------ 能力概览 */

export interface CapabilitySummary {
  key: string;
  label: string;
  names: string[];
}

export const CAPABILITY_SUMMARY: CapabilitySummary[] = [
  { key: "offense", label: "进攻能力", names: ["突破", "篮下", "背身", "中投", "三分"] },
  { key: "defense", label: "防守能力", names: ["内防", "外防", "抢断"] },
  { key: "rebound", label: "篮板能力", names: ["篮板"] },
  { key: "playmaking", label: "组织能力", names: ["组织"] },
  { key: "athletic", label: "运动能力", names: ["运动"] },
];

export function capabilityAverage(radar: RadarEntry[], names: string[]): number {
  const picked = radar.filter((r) => names.includes(r.name));
  if (!picked.length) return 0;
  return Math.round(picked.reduce((sum, r) => sum + r.score, 0) / picked.length);
}

/* ------------------------------------------------------------------ 排序 */

export const SORT_OPTIONS = [
  { key: "price", label: "价格" },
  { key: "badges", label: "徽章数" },
  { key: "height", label: "身高" },
  { key: "name", label: "姓名" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["key"];

/* ------------------------------------------------------------------ 动作 */

export const ACTION_ROWS: Array<{ label: string; keys: string[] }> = [
  { label: "运球风格", keys: ["运球风格", "移动风格", "dribbleStyle"] },
  { label: "横拉风格", keys: ["横拉风格"] },
  { label: "行进间背后运球", keys: ["背后运球"] },
  { label: "转身运球", keys: ["转身运球", "移动转身"] },
  { label: "后撤步", keys: ["后撤步", "移动后撤步"] },
  { label: "跳投动作", keys: ["下半身投篮姿势", "上半身出手姿势", "跳步投篮"] },
  { label: "上篮动作", keys: ["上篮包"] },
  { label: "扣篮动作", keys: ["扣篮动作"] },
];

export const SHOT_TIMING_ROWS = [
  { key: "meter", label: "投篮条时间", unit: "ms" },
  { key: "release", label: "球离手时间", unit: "ms" },
  { key: "total", label: "投篮总时间", unit: "ms" },
] as const;
