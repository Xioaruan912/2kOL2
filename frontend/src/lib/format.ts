function adaptivePrice(raw: number): string {
  if (raw >= 100_000_000) return `${formatScaled(raw / 100_000_000)} 亿`;
  if (raw >= 10_000_000) return `${formatScaled(raw / 10_000_000)} 千万`;
  if (raw >= 1_000_000) return `${formatScaled(raw / 1_000_000)} 百万`;
  if (raw >= 10_000) return `${formatScaled(raw / 10_000)} 万`;
  return raw.toLocaleString("zh-CN");
}

function formatScaled(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? rounded.toLocaleString("zh-CN")
    : rounded.toFixed(2).replace(/0$/, "");
}

export function formatPrice(value: number): string {
  if (!value) return "无市价";
  return adaptivePrice(value);
}

/** 把「万」为单位的数值转成亿 / 千万 / 百万的简短描述 */
export function formatWanShort(wan: number): string {
  if (!Number.isFinite(wan)) return "";
  return adaptivePrice(wan * 10_000);
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
