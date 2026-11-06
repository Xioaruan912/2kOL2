export function formatPrice(value: number): string {
  if (!value) return "无市价";
  return `${Math.round(value / 10_000).toLocaleString("zh-CN")} 万`;
}

/** 把「万」为单位的数值转成亿 / 千万 / 百万的简短描述 */
export function formatWanShort(wan: number): string {
  if (!Number.isFinite(wan)) return "";
  if (wan >= 10000) return `${trimDecimal(wan / 10000)} 亿`;
  if (wan >= 1000) return `${trimDecimal(wan / 1000)} 千万`;
  if (wan >= 100) return `${trimDecimal(wan / 100)} 百万`;
  return `${wan.toLocaleString("zh-CN")} 万`;
}

function trimDecimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatPriceFull(value: number): string {
  return value.toLocaleString("zh-CN");
}

export function formatHeight(value?: number | null): string {
  return value ? `${value}cm` : "—";
}

export function formatPositions(positions: string[]): string {
  return positions.length ? positions.join(" / ") : "—";
}

/** 数值档位：用于染色，不改变数值本身 */
export function valueTone(value: number): "elite" | "strong" | "normal" | "weak" {
  if (value >= 130) return "elite";
  if (value >= 110) return "strong";
  if (value >= 90) return "normal";
  return "weak";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatVersion(version: number): string {
  if (!version) return "—";
  return `${version}`;
}
