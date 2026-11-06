export function formatPrice(value: number): string {
  if (!value) return "无市价";
  if (value >= 100_000_000) {
    const yi = value / 100_000_000;
    return `${trimZero(yi.toFixed(2))} 亿`;
  }
  if (value >= 10_000) {
    const wan = value / 10_000;
    return `${trimZero(wan.toFixed(1))} 万`;
  }
  return value.toLocaleString("zh-CN");
}

export function formatPriceFull(value: number): string {
  return value.toLocaleString("zh-CN");
}

function trimZero(text: string): string {
  return text.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
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
