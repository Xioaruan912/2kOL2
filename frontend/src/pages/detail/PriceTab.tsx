import { useState } from "react";
import { ChartLine, WarningCircle } from "@phosphor-icons/react";
import type { PlayerDetail } from "../../data/types";
import { usePriceHistory } from "../../hooks/useData";
import { PriceTrend } from "../../components/PriceTrend";
import { formatPrice } from "../../lib/format";

const RANGES = [7, 30, 60, 90] as const;

function ChangeValue({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="price-change is-flat">—</span>;
  }
  const tone = value > 0 ? "is-up" : value < 0 ? "is-down" : "is-flat";
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "•";
  return (
    <span className={`price-change ${tone}`}>
      {arrow} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export function PriceTab({ detail }: { detail: PlayerDetail }) {
  const [days, setDays] = useState<number>(30);
  const { history, loading, error, reload } = usePriceHistory(detail.id, days);

  const points = history?.points ?? [];
  const prices = points.map((point) => point.price);
  const high = prices.length ? Math.max(...prices) : 0;
  const low = prices.length ? Math.min(...prices) : 0;
  const current = history?.currentPrice || detail.price;

  return (
    <div className="tab-narrow">
      <section className="panel" aria-label="身价走势">
        <div className="panel__head">
          <h2 className="panel__title">
            <ChartLine size={15} weight="bold" />
            身价走势
          </h2>
          <div className="segmented" role="group" aria-label="走势区间">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                className={days === range ? "segmented__item is-active" : "segmented__item"}
                onClick={() => setDays(range)}
              >
                {range} 天
              </button>
            ))}
          </div>
        </div>

        <div className="panel__body">
          {loading ? (
            <div className="price-loading">
              <div className="skeleton" style={{ height: 64 }} />
              <div className="skeleton" style={{ height: 264, marginTop: 16 }} />
            </div>
          ) : error ? (
            <div className="price-error">
              <WarningCircle size={20} />
              <div>
                <div className="price-error__title">身价走势暂时不可用</div>
                <p>{error}</p>
              </div>
              <button type="button" className="btn btn--sm" onClick={reload}>
                重试
              </button>
            </div>
          ) : (
            <>
              <div className="price-stats">
                <div className="price-stat price-stat--main">
                  <span className="price-stat__label">当前身价</span>
                  <span className="price-stat__value">{formatPrice(current)}</span>
                </div>
                <div className="price-stat">
                  <span className="price-stat__label">7 日涨跌</span>
                  <ChangeValue value={history?.change7d} />
                </div>
                <div className="price-stat">
                  <span className="price-stat__label">30 日涨跌</span>
                  <ChangeValue value={history?.change30d} />
                </div>
                <div className="price-stat">
                  <span className="price-stat__label">区间最高</span>
                  <span className="price-stat__value">{high ? formatPrice(high) : "—"}</span>
                </div>
                <div className="price-stat">
                  <span className="price-stat__label">区间最低</span>
                  <span className="price-stat__value">{low ? formatPrice(low) : "—"}</span>
                </div>
              </div>

              <PriceTrend points={points} />
              <p className="price-note">
                按天采样，最近 {days} 天 · 数据来自官方接口，仅供参考
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
