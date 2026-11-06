import type {
  BadgeEntry,
  BadgeLevel,
  DataSourceMode,
  PlayerDetail,
  PlayerSummary,
  RadarEntry,
} from "./types";
import { synthesizeDetail } from "./synthetic";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const REQUEST_TIMEOUT = 6000;

let catalogCache: PlayerSummary[] | null = null;
let detailsCache: Record<string, PlayerDetail> | null = null;
let mode: DataSourceMode = "local";
let modeListeners = new Set<() => void>();

function setMode(next: DataSourceMode) {
  if (mode === next) return;
  mode = next;
  modeListeners.forEach((listener) => listener());
}

export function getDataMode(): DataSourceMode {
  return mode;
}

export function subscribeDataMode(listener: () => void): () => void {
  modeListeners.add(listener);
  return () => modeListeners.delete(listener);
}

async function requestJson<T>(path: string, timeout = REQUEST_TIMEOUT): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const LEVEL_MAP: Record<string, BadgeLevel> = {
  铜: "bronze",
  银: "silver",
  金: "gold",
  紫: "purple",
};

function toInt(value: unknown, fallback = 0): number {
  const num = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(num) ? num : fallback;
}

function parseCm(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function asArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asRecord<T = Record<string, unknown>>(value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as T;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as T) : ({} as T);
    } catch {
      return {} as T;
    }
  }
  return {} as T;
}

/* ---------------------------------------------------------- API 数据归一化 */

interface ApiPlayerRow {
  player_id?: string | number;
  id?: string | number;
  show_name?: string;
  showName?: string;
  en_name?: string;
  PlayerEnName?: string;
  team_abbr?: string;
  teamAbbr?: string;
  pos?: string;
  Pos?: string;
  player_sort?: string;
  PlayerSort?: string;
  card_series?: string;
  cardSeries?: string;
  version?: number;
  grade?: number | string;
  overall?: number;
  price?: number;
  player_img?: string;
  playerImg?: string;
  badge_counts?: Record<string, number> | string;
  Height?: string;
  Wingspan?: string;
  height?: number | null;
  wingspan?: number | null;
  raw_json?: string;
}

function normalizeCounts(raw: unknown): PlayerSummary["badgeCounts"] {
  const rec = asRecord<Record<string, number>>(raw);
  const get = (key: string, alt: string) => toInt(rec[key] ?? rec[alt]);
  return {
    bronze: get("bronze", "铜"),
    silver: get("silver", "银"),
    gold: get("gold", "金"),
    purple: get("purple", "紫"),
  };
}

export function normalizeSummary(row: ApiPlayerRow): PlayerSummary {
  const badgeCounts = normalizeCounts(row.badge_counts);
  // SQLite 目录把身高臂展放在 raw_json 里，需要二次解析，否则身高筛选会失效
  const raw = asRecord<Record<string, unknown>>(row.raw_json);
  return {
    id: String(row.player_id ?? row.id ?? ""),
    name: row.show_name ?? row.showName ?? "",
    nameEn: row.en_name ?? row.PlayerEnName ?? "",
    team: row.team_abbr ?? row.teamAbbr ?? "",
    positions: Array.from(
      new Set(
        String(row.pos ?? row.Pos ?? "")
          .split("|")
          .filter(Boolean),
      ),
    ),
    archetype: row.player_sort ?? row.PlayerSort ?? "",
    series: row.card_series ?? row.cardSeries ?? "",
    version: toInt(row.version),
    grade: toInt(row.grade, 7),
    overall: toInt(row.overall),
    price: toInt(row.price),
    portrait: row.player_img ?? row.playerImg ?? "",
    height: row.height ?? parseCm(row.Height) ?? parseCm(raw.Height),
    wingspan: row.wingspan ?? parseCm(row.Wingspan) ?? parseCm(raw.Wingspan),
    badgeCounts,
  };
}

function normalizeApiDetail(raw: Record<string, unknown>, summary: PlayerSummary): PlayerDetail {
  const trainedAttributes = asArray<{ showName?: string; value?: number; oValue?: number }>(
    raw.TrainedAttribute ?? raw.Attribute,
  );
  const baseAttributes = new Map(
    asArray<{ showName?: string; value?: number }>(raw.Attribute).map((item) => [
      item.showName ?? "",
      toInt(item.value),
    ]),
  );

  const radar: RadarEntry[] = asArray<{ showName?: string; score?: number; max?: number; rank?: string }>(
    raw.TrainedRadar ?? raw.Radar,
  ).map((item) => ({
    name: item.showName ?? "",
    score: toInt(item.score),
    max: toInt(item.max),
    rank: item.rank,
  }));

  const hidden = asRecord<Record<string, unknown>>(raw.hiddenAttributes);
  const other = asRecord<{ tendencies_data?: Array<Record<string, number | string>> }>(
    hidden.otherAttributes,
  );
  const tendencySource = other.tendencies_data?.[0];
  let tendencies = Object.entries(tendencySource ?? {}).map(([name, value]) => ({
    name,
    value: toInt(value),
  }));
  if (!tendencies.length) {
    tendencies = asArray<{ showName?: string; value?: string }>(raw.Tendency).map((item) => ({
      name: item.showName ?? "",
      value: toInt(item.value),
    }));
  }

  const badges: BadgeEntry[] = asArray<Record<string, unknown>>(
    raw.ActiveBadges ?? raw.ol2Badges,
  ).map((item) => {
    const levelLabel = String(item.badgeLevel ?? "铜");
    return {
      id: String(item.badgeId ?? ""),
      name: String(item.badgeName ?? ""),
      level: LEVEL_MAP[levelLabel] ?? "bronze",
      levelLabel,
      levelId: toInt(item.badgeLevelId),
      isMax: toInt(item.isMax) === 1,
      desc: String(item.qualityDesc ?? ""),
      img: String(item.badgeImg ?? ""),
    };
  });

  const badgeCounts = { bronze: 0, silver: 0, gold: 0, purple: 0 };
  badges.forEach((badge) => {
    badgeCounts[badge.level] += 1;
  });

  const hotZones = asArray<{ district?: string; heat?: string | number; level?: string | number }>(
    raw.hotZone,
  ).map((item) => ({
    district: item.district ?? "",
    heat: toInt(item.heat),
    level: toInt(item.level),
  }));

  const tactics = asArray<{ index?: number; name?: string }>(raw.tacticsList).map((item, i) => ({
    index: toInt(item.index, i + 1),
    name: item.name ?? "未知战术",
  }));

  const shotBase = asRecord<{ meterSpeed?: number; releaseSpeed?: number; overallSpeed?: number }>(
    raw.shotBase,
  );

  return {
    ...summary,
    overall: toInt(raw.TrainedOverall, summary.overall) || summary.overall,
    baseOverall: toInt(raw.OverAll, summary.overall),
    badgeCounts: badges.length ? badgeCounts : summary.badgeCounts,
    dribbleStyle: String(raw.dribble_style ?? ""),
    radar,
    attributes: trainedAttributes.map((item) => ({
      name: item.showName ?? "",
      value: toInt(item.value),
      base: baseAttributes.get(item.showName ?? "") ?? toInt(item.value),
    })),
    tendencies,
    badges,
    hotZones,
    tactics: {
      primary: String(raw.isPrimaryBallHandler ?? "否"),
      types: tactics,
    },
    actions: {
      shotTiming: {
        meter: toInt(shotBase.meterSpeed),
        release: toInt(shotBase.releaseSpeed),
        total: toInt(shotBase.overallSpeed),
      },
      ol2: asRecord<Record<string, string>>(raw.animations),
      k26: asRecord<Record<string, string>>(raw.animations2k26),
    },
  };
}

/* ------------------------------------------------------------------ 数据入口 */

async function loadLocalCatalog(): Promise<PlayerSummary[]> {
  const module = await import("./generated/catalog.json");
  return module.default as unknown as PlayerSummary[];
}

async function loadLocalDetails(): Promise<Record<string, PlayerDetail>> {
  if (detailsCache) return detailsCache;
  const module = await import("./generated/details.json");
  detailsCache = module.default as unknown as Record<string, PlayerDetail>;
  return detailsCache;
}

export async function getCatalog(): Promise<PlayerSummary[]> {
  if (catalogCache) return catalogCache;
  try {
    const payload = await requestJson<{ list?: ApiPlayerRow[] }>("/api/players?mode=db&limit=2000");
    const list = payload.list ?? [];
    if (list.length) {
      catalogCache = list.map(normalizeSummary).filter((p) => p.id && p.name);
      setMode("live");
      return catalogCache;
    }
  } catch {
    // 后端不可用，降级为本地快照
  }
  catalogCache = await loadLocalCatalog();
  setMode("local");
  return catalogCache;
}

export async function getPlayerDetail(id: string): Promise<PlayerDetail> {
  const [catalog, localDetails] = await Promise.all([getCatalog(), loadLocalDetails()]);
  const summary = catalog.find((p) => p.id === id);
  if (!summary) throw new Error("未找到该球员");

  const localDetail = localDetails[id];
  if (localDetail) return withSummary(localDetail, summary);

  try {
    const payload = await requestJson<{ data?: Record<string, unknown> }>(
      `/api/player/${id}?grade=7`,
    );
    if (payload.data && payload.data.TrainedAttribute) {
      setMode("live");
      return normalizeApiDetail(payload.data, summary);
    }
  } catch {
    // 忽略，走推演
  }

  return synthesizeDetail(summary);
}

function withSummary(detail: PlayerDetail, summary: PlayerSummary): PlayerDetail {
  return {
    ...detail,
    price: summary.price,
    portrait: summary.portrait || detail.portrait,
    badgeCounts: summary.badgeCounts ?? detail.badgeCounts,
    height: detail.height ?? summary.height ?? null,
    wingspan: detail.wingspan ?? summary.wingspan ?? null,
  };
}

export async function probeDataMode(): Promise<DataSourceMode> {
  await getCatalog();
  return mode;
}


export interface AdvancedSearchOptions {
  filters: Record<string, unknown>;
  keyword?: string;
  team?: string;
  page: number;
  pageSize: number;
  sortField?: "overall" | "price";
  sortOrder?: "asc" | "desc";
}

export interface AdvancedSearchResult {
  players: PlayerSummary[];
  total: number;
}

/** 精细筛选：徽章 / 属性 / 战术等条件通过后端透传到官方接口 */
export async function searchAdvanced(
  options: AdvancedSearchOptions,
): Promise<AdvancedSearchResult> {
  const search = new URLSearchParams({
    filters: JSON.stringify(options.filters ?? {}),
    page: String(options.page),
    page_size: String(options.pageSize),
    sort_field: options.sortField ?? "overall",
    sort_order: options.sortOrder ?? "desc",
  });
  if (options.keyword) search.set("keyword", options.keyword);
  if (options.team) search.set("team", options.team);

  const payload = await requestJson<{ list?: ApiPlayerRow[]; total?: number }>(
    `/api/players/advanced?${search.toString()}`,
    15000,
  );
  const players = (payload.list ?? []).map(normalizeSummary).filter((player) => player.id && player.name);
  setMode("live");
  return { players, total: Number(payload.total ?? players.length) || 0 };
}
