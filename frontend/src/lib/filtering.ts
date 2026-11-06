import type {
  AdvancedFilterState,
  AttributeCondition,
  BadgeCondition,
  BadgeLevelCn,
  PlayerSummary,
} from "../data/types";
import { BADGE_FILTER_OPTIONS } from "./constants";
import { playTypeLabel } from "../data/filters";

export interface FilterState {
  q: string;
  team: string;
  positions: string[];
  type: string;
  series: string;
  badge: string;
  overallMin?: number;
  overallMax?: number;
  priceMin?: number;
  priceMax?: number;
  heightMin?: number;
  heightMax?: number;
  purpleMin?: number;
  goldMin?: number;
  badgeTotalMin?: number;
  advanced: AdvancedFilterState;
}

export const RANGE_LIMITS = {
  overall: { min: 0, max: 200, step: 1, unit: "" },
  price: { min: 0, max: 20, step: 0.1, unit: "亿" },
  height: { min: 150, max: 240, step: 1, unit: "cm" },
};

function toNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseBadgeConditions(raw: string | null): BadgeCondition[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const [name, level] = part.split(":");
      if (!name) return null;
      return { name, level: (level || "紫") as BadgeLevelCn };
    })
    .filter((item): item is BadgeCondition => Boolean(item));
}

function parseAttributeConditions(raw: string | null): AttributeCondition[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const [name, min] = part.split(":");
      const value = Number(min);
      if (!name || !Number.isFinite(value)) return null;
      return { name, min: value };
    })
    .filter((item): item is AttributeCondition => Boolean(item));
}

function parsePlayTypes(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function serializeBadgeConditions(conditions: BadgeCondition[]): string {
  return conditions.map((item) => `${item.name}:${item.level}`).join(",");
}

export function serializeAttributeConditions(conditions: AttributeCondition[]): string {
  return conditions.map((item) => `${item.name}:${item.min}`).join(",");
}

export function hasDetailFilters(filters: FilterState): boolean {
  const advanced = filters.advanced;
  return (
    advanced.badges.length > 0 ||
    advanced.attributes.length > 0 ||
    advanced.playTypes.length > 0
  );
}

export function parseFilters(params: URLSearchParams): FilterState {
  return {
    q: params.get("q") ?? "",
    team: params.get("team") ?? "",
    positions: (params.get("pos") ?? "").split(",").filter(Boolean),
    type: params.get("type") ?? "",
    series: params.get("series") ?? "",
    badge: params.get("badge") ?? "all",
    overallMin: toNumber(params.get("ovr_min")),
    overallMax: toNumber(params.get("ovr_max")),
    priceMin: toNumber(params.get("price_min")),
    priceMax: toNumber(params.get("price_max")),
    heightMin: toNumber(params.get("h_min")),
    heightMax: toNumber(params.get("h_max")),
    purpleMin: toNumber(params.get("b_purple")),
    goldMin: toNumber(params.get("b_gold")),
    badgeTotalMin: toNumber(params.get("b_total")),
    advanced: {
      badges: parseBadgeConditions(params.get("adv_badges")),
      attributes: parseAttributeConditions(params.get("adv_attrs")),
      playTypes: parsePlayTypes(params.get("adv_plays")),
    },
  };
}

export function totalBadges(player: PlayerSummary): number {
  const counts = player.badgeCounts;
  return counts.bronze + counts.silver + counts.gold + counts.purple;
}

function matchesBadgePreset(player: PlayerSummary, preset: string): boolean {
  const total = totalBadges(player);
  switch (preset) {
    case "total-15":
      return total >= 15;
    case "total-25":
      return total >= 25;
    case "total-35":
      return total >= 35;
    case "has-purple":
      return player.badgeCounts.purple > 0;
    case "has-gold":
      return player.badgeCounts.gold > 0;
    default:
      return true;
  }
}

export function matchesFilters(player: PlayerSummary, filters: FilterState): boolean {
  if (filters.positions.length) {
    const hit = player.positions.some((pos) => filters.positions.includes(pos));
    if (!hit) return false;
  }
  if (filters.team && player.team !== filters.team) return false;
  if (filters.type && player.archetype !== filters.type) return false;
  if (filters.series && player.series !== filters.series) return false;
  if (!matchesBadgePreset(player, filters.badge)) return false;

  if (filters.overallMin !== undefined && player.overall < filters.overallMin) return false;
  if (filters.overallMax !== undefined && player.overall > filters.overallMax) return false;

  const price = player.price;
  const hasPriceFilter = filters.priceMin !== undefined || filters.priceMax !== undefined;
  if (hasPriceFilter) {
    if (!price) return false;
    const inYi = price / 100000000;
    if (filters.priceMin !== undefined && inYi < filters.priceMin) return false;
    if (filters.priceMax !== undefined && inYi > filters.priceMax) return false;
  }

  const hasHeightFilter = filters.heightMin !== undefined || filters.heightMax !== undefined;
  if (hasHeightFilter) {
    if (!player.height) return false;
    if (filters.heightMin !== undefined && player.height < filters.heightMin) return false;
    if (filters.heightMax !== undefined && player.height > filters.heightMax) return false;
  }

  if (filters.purpleMin !== undefined && player.badgeCounts.purple < filters.purpleMin) return false;
  if (filters.goldMin !== undefined && player.badgeCounts.gold < filters.goldMin) return false;
  if (filters.badgeTotalMin !== undefined && totalBadges(player) < filters.badgeTotalMin) return false;

  return true;
}

export function countAdvancedFilters(filters: FilterState): number {
  let count = 0;
  if (filters.overallMin !== undefined || filters.overallMax !== undefined) count += 1;
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) count += 1;
  if (filters.heightMin !== undefined || filters.heightMax !== undefined) count += 1;
  if (filters.purpleMin !== undefined) count += 1;
  if (filters.goldMin !== undefined) count += 1;
  if (filters.badgeTotalMin !== undefined) count += 1;
  count += filters.advanced.badges.length;
  count += filters.advanced.attributes.length;
  count += filters.advanced.playTypes.length;
  return count;
}

export interface FilterChip {
  key: string;
  label: string;
  value: string;
  patch: Record<string, string | null>;
}

function rangeLabel(min?: number, max?: number, unit = ""): string | null {
  if (min === undefined && max === undefined) return null;
  if (min !== undefined && max !== undefined) return `${min} - ${max}${unit}`;
  if (min !== undefined) return `≥ ${min}${unit}`;
  return `≤ ${max}${unit}`;
}

export function buildFilterChips(filters: FilterState): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.q.trim()) {
    chips.push({
      key: "q",
      label: "搜索",
      value: filters.q.trim(),
      patch: { q: null },
    });
  }
  if (filters.team) {
    chips.push({ key: "team", label: "球队", value: filters.team, patch: { team: null } });
  }
  filters.positions.forEach((pos) => {
    chips.push({
      key: `pos-${pos}`,
      label: "位置",
      value: pos,
      patch: {
        pos: filters.positions.filter((item) => item !== pos).join(",") || null,
      },
    });
  });
  if (filters.type) {
    chips.push({ key: "type", label: "类型", value: filters.type, patch: { type: null } });
  }
  if (filters.series) {
    chips.push({ key: "series", label: "卡系", value: filters.series, patch: { series: null } });
  }
  if (filters.badge !== "all") {
    const option = BADGE_FILTER_OPTIONS.find((item) => item.value === filters.badge);
    chips.push({
      key: "badge",
      label: "徽章",
      value: option?.label ?? filters.badge,
      patch: { badge: null },
    });
  }

  const overall = rangeLabel(filters.overallMin, filters.overallMax);
  if (overall) {
    chips.push({
      key: "overall",
      label: "总评",
      value: overall,
      patch: { ovr_min: null, ovr_max: null },
    });
  }
  const price = rangeLabel(filters.priceMin, filters.priceMax, "亿");
  if (price) {
    chips.push({
      key: "price",
      label: "价格",
      value: price,
      patch: { price_min: null, price_max: null },
    });
  }
  const height = rangeLabel(filters.heightMin, filters.heightMax, "cm");
  if (height) {
    chips.push({
      key: "height",
      label: "身高",
      value: height,
      patch: { h_min: null, h_max: null },
    });
  }
  if (filters.purpleMin !== undefined) {
    chips.push({
      key: "purple",
      label: "紫徽章",
      value: `≥ ${filters.purpleMin}`,
      patch: { b_purple: null },
    });
  }
  if (filters.goldMin !== undefined) {
    chips.push({
      key: "gold",
      label: "金徽章",
      value: `≥ ${filters.goldMin}`,
      patch: { b_gold: null },
    });
  }
  if (filters.badgeTotalMin !== undefined) {
    chips.push({
      key: "badgeTotal",
      label: "徽章总数",
      value: `≥ ${filters.badgeTotalMin}`,
      patch: { b_total: null },
    });
  }

  filters.advanced.badges.forEach((badge) => {
    const rest = filters.advanced.badges.filter(
      (item) => !(item.name === badge.name && item.level === badge.level),
    );
    chips.push({
      key: `badge-${badge.name}-${badge.level}`,
      label: "徽章",
      value: `${badge.name} · ${badge.level}`,
      patch: { adv_badges: rest.length ? serializeBadgeConditions(rest) : null },
    });
  });

  filters.advanced.attributes.forEach((attribute) => {
    const rest = filters.advanced.attributes.filter((item) => item.name !== attribute.name);
    chips.push({
      key: `attr-${attribute.name}`,
      label: "属性",
      value: `${attribute.name} ≥ ${attribute.min}`,
      patch: { adv_attrs: rest.length ? serializeAttributeConditions(rest) : null },
    });
  });

  filters.advanced.playTypes.forEach((id) => {
    const rest = filters.advanced.playTypes.filter((item) => item !== id);
    chips.push({
      key: `play-${id}`,
      label: "战术",
      value: playTypeLabel(id),
      patch: { adv_plays: rest.length ? rest.join(",") : null },
    });
  });

  return chips;
}

/** 把前端筛选状态转换为官方搜索接口的 filters 负载 */
export function buildServerFilters(filters: FilterState): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (filters.positions.length) payload.position = filters.positions;
  if (filters.type) payload.archetypes = [filters.type];
  if (filters.series) payload.card_series = [filters.series];
  if (filters.overallMin !== undefined) payload.overall_min = filters.overallMin;
  if (filters.overallMax !== undefined) payload.overall_max = filters.overallMax;
  if (filters.priceMin !== undefined) payload.price_min = Math.round(filters.priceMin * 100000000);
  if (filters.priceMax !== undefined) payload.price_max = Math.round(filters.priceMax * 100000000);
  if (filters.heightMin !== undefined) payload.height_min = filters.heightMin;
  if (filters.heightMax !== undefined) payload.height_max = filters.heightMax;
  if (filters.advanced.badges.length) payload.badges = filters.advanced.badges;
  if (filters.advanced.attributes.length) {
    payload.attributes = filters.advanced.attributes.map((item) => ({
      name: item.name,
      min: item.min,
    }));
  }
  if (filters.advanced.playTypes.length) payload.play_types = filters.advanced.playTypes;
  return payload;
}
