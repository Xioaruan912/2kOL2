import type { BadgeCounts as Counts } from "../data/types";
import { BADGE_LEVELS, BADGE_ORDER } from "../data/taxonomy";
import { classNames } from "../lib/format";

interface BadgeCountsProps {
  counts: Counts;
  showZero?: boolean;
  className?: string;
}

export function BadgeCounts({ counts, showZero = true, className }: BadgeCountsProps) {
  const visible = BADGE_ORDER.filter((level) => showZero || counts[level] > 0);
  return (
    <span className={classNames("mini-badges", className)}>
      {visible.map((level) => {
        const meta = BADGE_LEVELS[level];
        return (
          <span
            key={level}
            className={classNames("mini-badge", `mini-badge--${level}`, counts[level] === 0 && "is-zero")}
            title={`${meta.label}：${counts[level]} 枚`}
          >
            <span className="mini-badge__hex" aria-hidden="true">
              {meta.short}
            </span>
            <span>{String(counts[level]).padStart(2, "0")}</span>
          </span>
        );
      })}
    </span>
  );
}
