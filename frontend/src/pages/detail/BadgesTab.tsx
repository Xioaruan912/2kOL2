import { useMemo, useState } from "react";
import type { BadgeEntry, BadgeLevel, PlayerDetail } from "../../data/types";
import { imageUrl } from "../../lib/image";
import {
  BADGE_CATEGORIES,
  BADGE_LEVELS,
  badgeCategoryOf,
  type BadgeCategoryKey,
} from "../../data/taxonomy";

const LEVEL_RANK: Record<BadgeLevel, number> = { purple: 4, gold: 3, silver: 2, bronze: 1 };

function BadgeIcon({ badge, color }: { badge: BadgeEntry; color: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="badge-hex" style={{ ["--badge-color" as string]: color }}>
      <span className="badge-hex__frame" aria-hidden="true" />
      <span className="badge-hex__inner">
        {badge.img && !failed ? (
          <img
            src={imageUrl(badge.img)}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="badge-hex__fallback">{badge.name.slice(0, 1)}</span>
        )}
      </span>
    </span>
  );
}

export function BadgesTab({ detail }: { detail: PlayerDetail }) {
  const [category, setCategory] = useState<"all" | BadgeCategoryKey>("all");

  const counts = useMemo(() => {
    const map = new Map<string, number>([
      ["all", detail.badges.length],
      ...BADGE_CATEGORIES.map((item) => [item.key, 0] as [string, number]),
      ["other", 0],
    ]);
    detail.badges.forEach((badge) => {
      const key = badgeCategoryOf(badge.name);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [detail.badges]);

  const badges = useMemo(() => {
    const filtered =
      category === "all"
        ? detail.badges
        : detail.badges.filter((badge) => badgeCategoryOf(badge.name) === category);
    return [...filtered].sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]);
  }, [detail.badges, category]);

  return (
    <div>
      <div className="badge-summary">
        <div className="badge-summary__counts">
          {(["bronze", "silver", "gold", "purple"] as BadgeLevel[]).map((level) => (
            <span className="badge-summary__item" key={level}>
              <span
                className="badge-summary__hex"
                style={{ background: BADGE_LEVELS[level].color }}
                aria-hidden="true"
              >
                {BADGE_LEVELS[level].short}
              </span>
              {detail.badgeCounts[level]}
            </span>
          ))}
        </div>
        <span className="badge-summary__note">
          徽章以紫徽章为最高等级 · 当前显示 {badges.length} 枚
        </span>
      </div>

      <div className="badge-toolbar" role="group" aria-label="徽章分类筛选">
        <button
          type="button"
          className={category === "all" ? "chip is-active" : "chip"}
          onClick={() => setCategory("all")}
        >
          全部
          <span className="chip__count">{counts.get("all") ?? 0}</span>
        </button>
        {BADGE_CATEGORIES.map((item) => (
          <button
            key={item.key}
            type="button"
            className={category === item.key ? "chip is-active" : "chip"}
            onClick={() => setCategory(item.key)}
          >
            {item.label}
            <span className="chip__count">{counts.get(item.key) ?? 0}</span>
          </button>
        ))}
        {(counts.get("other") ?? 0) > 0 ? (
          <button
            type="button"
            className={category === "other" ? "chip is-active" : "chip"}
            onClick={() => setCategory("other")}
          >
            其他
            <span className="chip__count">{counts.get("other") ?? 0}</span>
          </button>
        ) : null}
      </div>

      {badges.length === 0 ? (
        <div className="state-block">
          <div className="state-block__title">该分类下暂无徽章</div>
          <p className="state-block__text">切换其他徽章分类查看。</p>
        </div>
      ) : (
        <div className="badge-grid">
          {badges.map((badge) => {
            const meta = BADGE_LEVELS[badge.level];
            return (
              <article className="badge-item" key={`${badge.id}-${badge.name}`}>
                <BadgeIcon badge={badge} color={meta.color} />
                <div className="badge-item__body">
                  <div className="badge-item__name">
                    {badge.name}
                    <span
                      className="badge-level-tag"
                      style={{
                        ["--badge-color" as string]: meta.color,
                        ["--badge-tint" as string]: meta.tint,
                      }}
                    >
                      {meta.label}
                    </span>
                    {badge.isMax ? <span className="badge-max-tag">已是最高</span> : null}
                  </div>
                  <p className="badge-item__desc">
                    {badge.desc || `${badgeCategoryOf(badge.name) === "other" ? "特殊" : ""}徽章效果以游戏内为准`}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
