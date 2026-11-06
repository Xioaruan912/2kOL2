import { useState } from "react";
import { CaretDown, ChartPolar, Gauge, Sneaker } from "@phosphor-icons/react";
import type { PlayerDetail } from "../../data/types";
import { RadarChart } from "../../components/RadarChart";
import {
  HotZoneCourt,
  ZONE_DISPLAY_ORDER,
  ZONE_LABELS,
  ZONE_ORDER,
  zoneTone,
} from "../../components/HotZoneCourt";
import { CAPABILITY_SUMMARY, capabilityAverage, sortRadar } from "../../data/taxonomy";
import { BadgeCounts } from "../../components/BadgeCounts";
import { formatPositions } from "../../lib/format";

export function OverviewTab({ detail }: { detail: PlayerDetail }) {
  const [zoneDetailOpen, setZoneDetailOpen] = useState(false);
  const radar = sortRadar(detail.radar);
  const zones = ZONE_ORDER.map((district) => {
    const found = detail.hotZones.find((zone) => zone.district === district);
    return found ?? { district, heat: 1, level: 0 };
  });
  const toneCounts = zones.reduce(
    (acc, zone) => {
      const tone = zoneTone(zone);
      acc[tone] += 1;
      return acc;
    },
    { 0: 0, 1: 0, 2: 0 } as Record<0 | 1 | 2, number>,
  );

  const overallDelta = detail.overall - detail.baseOverall;
  const sortedAttributes = [...detail.attributes].sort((a, b) => b.value - a.value);
  const highlights = sortedAttributes.slice(0, 3);
  const weaknesses = sortedAttributes.slice(-3).reverse();
  const toneLabels = { 2: "热区", 1: "中性", 0: "冷区" } as const;

  return (
    <div className="detail-stack">
      <div className="detail-grid">
        <section className="panel" aria-label="能力雷达图">
          <div className="panel__head">
            <h2 className="panel__title">
              <ChartPolar size={15} weight="bold" />
              能力雷达
            </h2>
            <span className="panel__hint">共 11 个维度 · 数值为特训后</span>
          </div>
          <div className="panel__body">
            <div className="radar-wrap">
              <RadarChart series={[{ name: detail.name, color: "#e1532b", radar }]} size={380} />
            </div>
            <div className="radar-legend">
              {radar.map((entry) => (
                <div className="radar-legend__item" key={entry.name}>
                  <span>{entry.name}</span>
                  <span>
                    <span className="radar-legend__value">{entry.score}</span>
                    {entry.rank ? <span className="radar-legend__rank">{entry.rank}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="detail-stack">
          <section className="panel" aria-label="综合能力">
            <div className="panel__head">
              <h2 className="panel__title">
                <Gauge size={15} weight="bold" />
                综合能力
              </h2>
              <span className="panel__hint">
                位置 {formatPositions(detail.positions)} · {detail.archetype || "未分类"}
              </span>
            </div>
            <div className="panel__body">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                <span className="num" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1 }}>
                  {detail.overall}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-3)", paddingBottom: 6 }}>
                  特训前 {detail.baseOverall}
                  {overallDelta > 0 ? ` · 特训 +${overallDelta}` : ""}
                </span>
              </div>
              <div className="cap-list" style={{ marginTop: 12 }}>
                {CAPABILITY_SUMMARY.map((capability) => {
                  const value = capabilityAverage(radar, capability.names);
                  const max = Math.max(
                    ...radar.filter((entry) => capability.names.includes(entry.name)).map((entry) => entry.max),
                    1,
                  );
                  return (
                    <div className="cap-row" key={capability.key}>
                      <span className="cap-row__label">{capability.label}</span>
                      <span className="bar">
                        <span
                          className="bar__fill"
                          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                        />
                      </span>
                      <span className="cap-row__value">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="panel" aria-label="徽章构成">
            <div className="panel__head">
              <h2 className="panel__title">
                <Sneaker size={15} weight="bold" />
                徽章构成
              </h2>
              <span className="panel__hint">最高等级为紫徽章</span>
            </div>
            <div className="panel__body" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <BadgeCounts counts={detail.badgeCounts} />
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                共 {detail.badges.length || "—"} 枚徽章 · 明细见「徽章」标签
              </span>
            </div>
          </section>

          <section className="panel" aria-label="能力亮点">
            <div className="panel__head">
              <h2 className="panel__title">能力亮点</h2>
              <span className="panel__hint">取自 {detail.attributes.length} 项属性</span>
            </div>
            <div className="panel__body" style={{ display: "grid", gap: 16 }}>
              <div>
                <div className="highlight-title">最强项</div>
                <div className="highlight-list">
                  {highlights.map((attr) => (
                    <div className="highlight-row" key={attr.name}>
                      <span>{attr.name}</span>
                      <span className="highlight-row__value is-top">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="highlight-title">最弱项</div>
                <div className="highlight-list">
                  {weaknesses.map((attr) => (
                    <div className="highlight-row" key={attr.name}>
                      <span>{attr.name}</span>
                      <span className="highlight-row__value">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="panel court-card" aria-label="投篮热区">
        <div className="court-card__surface">
          <HotZoneCourt zones={zones} ariaLabel={`${detail.name} 投篮热区`} />
        </div>
        <div className="court-card__foot">
          <button
            type="button"
            className="court-disclosure"
            aria-expanded={zoneDetailOpen}
            onClick={() => setZoneDetailOpen((open) => !open)}
          >
            球场分布说明
            <CaretDown size={11} weight="bold" className={zoneDetailOpen ? "is-open" : undefined} />
          </button>

          {zoneDetailOpen ? (
            <div className="court-zone-detail">
              {ZONE_DISPLAY_ORDER.map((district) => {
                const zone = zones.find((item) => item.district === district);
                if (!zone) return null;
                const tone = zoneTone(zone);
                return (
                  <div className="zone-list__row" key={zone.district}>
                    <span
                      className="zone-list__swatch"
                      style={{
                        background:
                          tone === 2
                            ? "var(--zone-hot)"
                            : tone === 1
                              ? "var(--zone-neutral)"
                              : "var(--zone-cold)",
                      }}
                    />
                    <span className="zone-list__name">{ZONE_LABELS[zone.district] ?? zone.district}</span>
                    <span className="zone-list__tone">{toneLabels[tone]}</span>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="court-legend">
            <span className="court-legend__item">
              <span className="court-legend__swatch" style={{ background: "var(--zone-hot)" }} />
              热区
              <span className="court-legend__count">{toneCounts[2]}</span>
            </span>
            <span className="court-legend__item">
              <span className="court-legend__swatch" style={{ background: "var(--zone-neutral)" }} />
              中性
              <span className="court-legend__count">{toneCounts[1]}</span>
            </span>
            <span className="court-legend__item">
              <span className="court-legend__swatch" style={{ background: "var(--zone-cold)" }} />
              冷区
              <span className="court-legend__count">{toneCounts[0]}</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
