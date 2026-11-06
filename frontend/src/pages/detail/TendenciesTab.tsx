import { useMemo, useState } from "react";
import type { PlayerDetail } from "../../data/types";
import {
  TENDENCY_CATEGORIES,
  tendencyCategoryOf,
  type TendencyCategoryKey,
} from "../../data/taxonomy";

export function TendenciesTab({ detail }: { detail: PlayerDetail }) {
  const [category, setCategory] = useState<"all" | TendencyCategoryKey>("all");

  const grouped = useMemo(() => {
    const order: Array<{ key: TendencyCategoryKey; label: string; items: typeof detail.tendencies }> = [];
    TENDENCY_CATEGORIES.filter((item) => item.key !== "all").forEach((item) => {
      const items = detail.tendencies.filter(
        (tendency) => tendencyCategoryOf(tendency.name) === item.key,
      );
      if (items.length) {
        order.push({ key: item.key as TendencyCategoryKey, label: item.label, items });
      }
    });
    return order;
  }, [detail.tendencies]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    detail.tendencies.forEach((tendency) => {
      const key = tendencyCategoryOf(tendency.name);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [detail.tendencies]);

  const visibleGroups = category === "all" ? grouped : grouped.filter((group) => group.key === category);

  return (
    <div>
      <div className="tendency-toolbar" role="group" aria-label="倾向分类筛选">
        {TENDENCY_CATEGORIES.map((item) => (
          <button
            key={item.key}
            type="button"
            className={category === item.key ? "chip is-active" : "chip"}
            onClick={() => setCategory(item.key as "all" | TendencyCategoryKey)}
          >
            {item.label}
            {item.key === "all" ? (
              <span className="chip__count">{detail.tendencies.length}</span>
            ) : (
              <span className="chip__count">{counts.get(item.key) ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {visibleGroups.map((group) => (
        <section className="tendency-group" key={group.key}>
          <div className="tendency-group__head">
            <h2 className="tendency-group__title">{group.label}倾向</h2>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{group.items.length} 项</span>
          </div>
          <div className="tendency-wrap">
            {group.items.map((item) => (
              <div className="tendency-row" key={item.name}>
                <span className="tendency-row__name" title={item.name}>
                  {item.name}
                </span>
                <span className="bar">
                  <span className="bar__fill" style={{ width: `${Math.min(100, item.value)}%` }} />
                </span>
                <span className="tendency-row__value">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {visibleGroups.length === 0 ? (
        <div className="state-block">
          <div className="state-block__title">该分类下暂无倾向数据</div>
          <p className="state-block__text">切换其他分类查看球员的出手与决策倾向。</p>
        </div>
      ) : null}
    </div>
  );
}
