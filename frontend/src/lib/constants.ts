/** 稀缺卡系（用于列表中的金色标签） */
export const RARE_SERIES = new Set([
  "陈列室",
  "致敬传奇",
  "收藏球员",
  "世界球员系列",
]);

export const PAGE_SIZE = 24;

export const BADGE_FILTER_OPTIONS = [
  { value: "all", label: "徽章不限" },
  { value: "total-15", label: "徽章 ≥ 15" },
  { value: "total-25", label: "徽章 ≥ 25" },
  { value: "total-35", label: "徽章 ≥ 35" },
  { value: "has-purple", label: "含紫徽章" },
  { value: "has-gold", label: "含金徽章" },
];

export const COMPARE_COLORS = ["#e1532b", "#2f6f7e", "#b08a2b"];
