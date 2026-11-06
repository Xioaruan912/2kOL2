import type {
  AttributeEntry,
  BadgeEntry,
  BadgeLevel,
  HotZoneEntry,
  PlayerDetail,
  PlayerSummary,
  RadarEntry,
  TendencyEntry,
} from "./types";
import { BADGE_NAME_MAP } from "./taxonomy";
import { clamp } from "../lib/format";

/** 稳定伪随机：同一球员每次生成结果一致，避免页面刷新后数据跳动 */
function makeRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_ATTRIBUTES = [
  "突破上篮",
  "近距离投篮",
  "原地灌篮",
  "突破灌篮",
  "背身后仰跳投",
  "背身钩射",
  "背身控制",
  "造成对手犯规",
  "中投",
  "三分",
  "罚球",
  "控球",
  "传球智商",
  "传球准确性",
  "传球洞察力",
  "内线防守",
  "外线防守",
  "横向敏捷",
  "盖帽",
  "抢断",
  "防守稳定性",
  "协防智商",
  "进攻篮板",
  "防守篮板",
  "争抢",
  "速度",
  "运球速度",
  "敏捷",
  "弹跳",
  "力量",
  "体力",
  "投篮智商",
  "进攻稳定性",
  "接球",
];

/** 位置对属性的影响权重（正负偏移量，单位：能力点） */
const POSITION_BIAS: Record<string, Record<string, number>> = {
  PG: {
    控球: 14,
    传球智商: 12,
    传球准确性: 12,
    传球洞察力: 12,
    运球速度: 12,
    速度: 10,
    三分: 6,
    抢断: 5,
    背身钩射: -18,
    背身控制: -14,
    原地灌篮: -12,
    进攻篮板: -12,
    防守篮板: -10,
    盖帽: -14,
    力量: -8,
  },
  SG: {
    中投: 10,
    三分: 10,
    突破上篮: 8,
    速度: 8,
    运球速度: 7,
    抢断: 4,
    背身钩射: -12,
    盖帽: -10,
    防守篮板: -6,
    力量: -5,
  },
  SF: {
    突破上篮: 8,
    中投: 6,
    外线防守: 8,
    横向敏捷: 6,
    力量: 4,
    盖帽: -4,
  },
  PF: {
    近距离投篮: 8,
    防守篮板: 10,
    力量: 9,
    内线防守: 8,
    背身控制: 6,
    盖帽: 6,
    控球: -10,
    三分: -4,
    传球洞察力: -6,
  },
  C: {
    近距离投篮: 12,
    原地灌篮: 12,
    背身钩射: 12,
    背身控制: 10,
    进攻篮板: 14,
    防守篮板: 14,
    盖帽: 14,
    内线防守: 12,
    力量: 12,
    三分: -22,
    控球: -16,
    运球速度: -18,
    传球洞察力: -10,
    抢断: -8,
  },
};

const TENDENCY_NAMES = [
  "出手倾向",
  "原地扣篮倾向",
  "突破扣篮倾向",
  "花式扣篮倾向",
  "补篮倾向",
  "传球到空位倾向",
  "触球倾向",
  "背身单打倾向",
  "挡拆后三分倾向",
  "防守下三分跳投倾向",
  "球员纪律倾向",
  "持球抢断倾向",
  "干扰投篮倾向",
  "犯规倾向",
  "突破倾向",
  "抛投倾向",
  "背身切入倾向",
  "空接扣篮倾向",
  "打板投篮倾向",
  "背身转身倾向",
  "盖帽倾向",
  "花式传球倾向",
  "中距离投篮倾向",
  "油漆区投篮倾向",
  "转身突破倾向",
  "转身上篮倾向",
  "篮下投篮倾向",
  "切出接球倾向",
  "突破上篮倾向",
  "强力突破倾向",
  "三分投篮倾向",
  "定点中投倾向",
  "定点三分倾向",
  "受干扰中投倾向",
  "急停三分倾向",
  "后撤步中投倾向",
  "后撤步三分倾向",
  "低位背身推进倾向",
  "背身假动作倾向",
  "突破急停中投倾向",
];

const LEVELS: BadgeLevel[] = ["bronze", "silver", "gold", "purple"];

const LEVEL_CN: Record<BadgeLevel, string> = {
  bronze: "铜",
  silver: "银",
  gold: "金",
  purple: "紫",
};

const LEVEL_ID: Record<BadgeLevel, number> = { bronze: 1, silver: 2, gold: 3, purple: 4 };

const BADGE_DESC: Record<string, string> = {
  终结: "提升篮下终结与背身得分的成功率",
  投篮: "提升中远距离投篮的命中率",
  组织: "提升控球与传球的质量",
  防守: "提升对位防守与协防干扰能力",
  篮板: "提升争抢篮板球的成功率",
};

const TACTIC_POOL: Record<string, string[]> = {
  PG: ["挡拆持球人", "单打(弧顶)", "手递手接球人", "三分"],
  SG: ["单打(侧翼)", "挡拆(侧翼)", "中距离", "三分"],
  SF: ["挡拆(侧翼)", "单打(侧翼)", "中距离", "挡拆中负责切入的球员"],
  PF: ["挡拆得分", "高位背身单打", "中距离", "挡拆中负责切入的球员"],
  C: ["低位背身单打", "高位背身单打", "挡拆中负责切入的球员", "中距离"],
};

const DRIBBLE_STYLES = ["职业运球风格", "基础运球风格", "乔丹运球风格", "莫兰特运球风格"];
const JUMP_SHOTS = ["职业 2", "基础", "普通", "职业"];
const LAYUP_PACKS = ["默认摆动型", "职业", "基础", "普通"];

const ZONE_DISTRICTS: Array<{ district: string; heatBase: number }> = [
  { district: "under_basket", heatBase: 2 },
  { district: "close_left", heatBase: 2 },
  { district: "close_center", heatBase: 2 },
  { district: "close_right", heatBase: 2 },
  { district: "med_left", heatBase: 1 },
  { district: "med_left_center", heatBase: 1 },
  { district: "med_center", heatBase: 1 },
  { district: "med_right_center", heatBase: 1 },
  { district: "med_right", heatBase: 1 },
  { district: "three_left", heatBase: 1 },
  { district: "three_left_center", heatBase: 1 },
  { district: "three_center", heatBase: 1 },
  { district: "three_right_center", heatBase: 1 },
  { district: "three_right", heatBase: 1 },
];

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function pickByOverall(overall: number, random: () => number): BadgeLevel {
  const roll = random();
  if (overall >= 132) return roll > 0.55 ? "purple" : roll > 0.2 ? "gold" : "silver";
  if (overall >= 125) return roll > 0.72 ? "purple" : roll > 0.3 ? "gold" : "silver";
  if (overall >= 115) return roll > 0.4 ? "gold" : roll > 0.15 ? "silver" : "bronze";
  return roll > 0.7 ? "gold" : roll > 0.35 ? "silver" : "bronze";
}

function buildBadges(player: PlayerSummary, random: () => number): BadgeEntry[] {
  const archetype = player.archetype;
  const categories: Array<keyof typeof BADGE_NAME_MAP> = ["finish", "shoot", "playmaking", "defense", "rebound"];
  const emphasis: Array<keyof typeof BADGE_NAME_MAP> = [];
  if (archetype.includes("三分") || archetype.includes("投篮")) emphasis.push("shoot");
  if (archetype.includes("突破")) emphasis.push("finish");
  if (archetype.includes("篮板")) emphasis.push("rebound");
  if (archetype.includes("禁区") || archetype.includes("封锁")) emphasis.push("defense");
  if (archetype.includes("组织")) emphasis.push("playmaking");
  if (!emphasis.length) emphasis.push("defense");

  const badges: BadgeEntry[] = [];
  const seen = new Set<string>();
  const targetCount = 18 + Math.round(random() * 8);

  for (let i = 0; i < targetCount; i += 1) {
    const category =
      random() < 0.55
        ? emphasis[Math.floor(random() * emphasis.length)]
        : categories[Math.floor(random() * categories.length)];
    const pool = BADGE_NAME_MAP[category];
    const name = pool[Math.floor(random() * pool.length)];
    if (seen.has(name)) continue;
    seen.add(name);
    const level = pickByOverall(player.overall, random);
    badges.push({
      id: `${player.id}-${i}`,
      name,
      level,
      levelLabel: LEVEL_CN[level],
      levelId: LEVEL_ID[level],
      isMax: level === "purple",
      desc: BADGE_DESC[category] ?? "",
      img: "",
    });
  }

  return badges;
}

/**
 * 离线详情推演：当本地球员快照中没有该球员详情时，
 * 依据总评、位置与类型生成一份稳定的推演数据，并在 UI 上明确标注“模拟”。
 */
export function synthesizeDetail(player: PlayerSummary): PlayerDetail {
  const random = makeRandom(player.id);
  const bias: Record<string, number> = {};
  player.positions.forEach((pos) => {
    Object.entries(POSITION_BIAS[pos] ?? {}).forEach(([name, delta]) => {
      bias[name] = (bias[name] ?? 0) + delta / player.positions.length;
    });
  });

  const attributes: AttributeEntry[] = BASE_ATTRIBUTES.map((name) => {
    const jitter = Math.round((random() - 0.5) * 12);
    const value = clamp(Math.round(player.overall + (bias[name] ?? 0) + jitter), 42, 165);
    return { name, value, base: value };
  });

  const attrMap = new Map(attributes.map((a) => [a.name, a.value]));
  const at = (name: string) => attrMap.get(name) ?? player.overall;

  const radar: RadarEntry[] = [
    { name: "运动", score: average([at("速度"), at("敏捷"), at("弹跳")]) },
    { name: "突破", score: average([at("突破上篮"), at("控球"), at("运球速度")]) },
    { name: "篮下", score: average([at("近距离投篮"), at("原地灌篮"), at("突破灌篮")]) },
    { name: "背身", score: average([at("背身后仰跳投"), at("背身钩射"), at("背身控制")]) },
    { name: "中投", score: at("中投") },
    { name: "三分", score: at("三分") },
    { name: "组织", score: average([at("传球智商"), at("传球准确性"), at("控球")]) },
    { name: "内防", score: average([at("内线防守"), at("盖帽")]) },
    { name: "外防", score: average([at("外线防守"), at("横向敏捷")]) },
    { name: "抢断", score: at("抢断") },
    { name: "篮板", score: average([at("进攻篮板"), at("防守篮板")]) },
  ].map((entry) => ({
    ...entry,
    max: Math.round(entry.score * 1.05) + 4,
    rank: entry.score >= 120 ? "A+" : entry.score >= 105 ? "A" : entry.score >= 90 ? "B+" : "B",
  }));

  const tendencies: TendencyEntry[] = TENDENCY_NAMES.map((name) => {
    let base = 50;
    if (name.includes("三分")) base = at("三分") - 30;
    else if (name.includes("中投") || name.includes("中距离")) base = at("中投") - 20;
    else if (name.includes("背身")) base = at("背身控制") - 30;
    else if (name.includes("扣篮")) base = at("突破灌篮") - 25;
    else if (name.includes("上篮")) base = at("突破上篮") - 20;
    else if (name.includes("传球")) base = at("传球准确性") - 30;
    else if (name.includes("防守") || name.includes("抢断") || name.includes("盖帽")) base = at("外线防守") - 30;
    else if (name.includes("纪律")) base = 55;
    else if (name.includes("犯规")) base = 30;
    const value = clamp(Math.round(base + (random() - 0.5) * 26), 0, 99);
    return { name, value };
  });

  const badges = buildBadges(player, random);
  const badgeCounts = { bronze: 0, silver: 0, gold: 0, purple: 0 };
  badges.forEach((b) => {
    badgeCounts[b.level] += 1;
  });

  const hotZones: HotZoneEntry[] = ZONE_DISTRICTS.map(({ district, heatBase }) => {
    const roll = random();
    let heat = heatBase;
    if (district.startsWith("three")) heat = at("三分") >= 105 ? (roll > 0.25 ? 2 : 1) : roll > 0.7 ? 2 : roll > 0.4 ? 1 : 0;
    else if (district.startsWith("med")) heat = at("中投") >= 105 ? (roll > 0.3 ? 2 : 1) : roll > 0.65 ? 2 : roll > 0.35 ? 1 : 0;
    else heat = at("近距离投篮") >= 100 ? 2 : heatBase;
    return { district, heat, level: heat === 2 ? 3 : heat === 1 ? 0 : -1 };
  });

  const position = player.positions[0] ?? "SF";
  const tacticPool = TACTIC_POOL[position] ?? TACTIC_POOL.SF;

  return {
    ...player,
    baseOverall: Math.max(60, player.overall - 12),
    dribbleStyle: DRIBBLE_STYLES[Math.floor(random() * DRIBBLE_STYLES.length)],
    radar,
    attributes,
    tendencies,
    badges,
    hotZones,
    tactics: {
      primary: position === "PG" || position === "SG" ? "是" : "否",
      types: tacticPool.map((name, i) => ({ index: i + 1, name })),
    },
    actions: {
      shotTiming: {
        meter: 560 + Math.round(random() * 160),
        release: 60 + Math.round(random() * 40),
        total: 0,
      },
      ol2: {
        移动风格: DRIBBLE_STYLES[Math.floor(random() * DRIBBLE_STYLES.length)],
        横拉风格: random() > 0.6 ? "职业" : "基础",
        背后运球: random() > 0.5 ? "职业" : "普通",
        转身运球: random() > 0.6 ? "职业" : "基础",
        后撤步: random() > 0.5 ? "职业" : "基础",
        跳步投篮: JUMP_SHOTS[Math.floor(random() * JUMP_SHOTS.length)],
        上篮包: LAYUP_PACKS[Math.floor(random() * LAYUP_PACKS.length)],
        扣篮动作: "基础单手扣篮, 单手战斧扣篮",
      },
      k26: {
        运球风格: DRIBBLE_STYLES[Math.floor(random() * DRIBBLE_STYLES.length)],
        横拉风格: random() > 0.6 ? "职业" : "基础",
        背后运球: random() > 0.5 ? "职业" : "基础",
        转身运球: random() > 0.6 ? "职业" : "基础",
        移动后撤步: random() > 0.5 ? "职业" : "基础",
        跳步投篮: JUMP_SHOTS[Math.floor(random() * JUMP_SHOTS.length)],
        上篮包: LAYUP_PACKS[Math.floor(random() * LAYUP_PACKS.length)],
        扣篮动作: "篮下运动扣篮, 基础单脚双手扣篮, 篮下常规扣篮",
      },
    },
    synthetic: true,
  };
}

export { LEVELS };
