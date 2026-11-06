import { useState } from "react";
import { Clock, Repeat } from "@phosphor-icons/react";
import type { PlayerDetail } from "../../data/types";
import { ACTION_ROWS, SHOT_TIMING_ROWS } from "../../data/taxonomy";

type ActionView = "ol2" | "k26";

const STYLE_KEYS = ["运球风格", "移动风格", "横拉风格", "背后运球", "转身运球", "后撤步", "跳投动作", "上篮动作", "扣篮动作"];

function resolveValue(map: Record<string, string>, keys: string[], fallback?: string): string {
  for (const key of keys) {
    if (map[key]) return map[key];
  }
  return fallback ?? "—";
}

export function ActionsTab({ detail }: { detail: PlayerDetail }) {
  const [view, setView] = useState<ActionView>("ol2");
  const map = view === "ol2" ? detail.actions.ol2 : detail.actions.k26;
  const entries = Object.entries(map);
  const timing = detail.actions.shotTiming;

  return (
    <div>
      <div className="action-toggle-row">
        <div className="segmented" role="group" aria-label="动作数据版本">
          <button
            type="button"
            className={view === "ol2" ? "segmented__item is-active" : "segmented__item"}
            onClick={() => setView("ol2")}
          >
            OL2
          </button>
          <button
            type="button"
            className={view === "k26" ? "segmented__item is-active" : "segmented__item"}
            onClick={() => setView("k26")}
          >
            26 内核
          </button>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
          {view === "ol2" ? "OL2 现行动作包数据" : "2K26 内核动作包数据"}
        </span>
      </div>

      <div className="action-subhead">
        <h2 className="action-subhead__title">
          <Clock size={13} weight="bold" style={{ display: "inline", marginRight: 6 }} />
          投篮包时间
        </h2>
        <span className="action-subhead__hint">单位毫秒，数值越小出手越快</span>
      </div>
      <div className="data-rows" aria-label="投篮包时间">
        {SHOT_TIMING_ROWS.map((row) => (
          <div className="data-row data-row--timing" key={row.key}>
            <span className="data-row__label">{row.label}</span>
            <span className="data-row__value">
              {timing[row.key] ? timing[row.key] : "—"}
              {timing[row.key] ? <span>{row.unit}</span> : null}
            </span>
          </div>
        ))}
      </div>

      <div className="action-subhead">
        <h2 className="action-subhead__title">
          <Repeat size={13} weight="bold" style={{ display: "inline", marginRight: 6 }} />
          动作包
        </h2>
        <span className="action-subhead__hint">{view === "ol2" ? "OL2" : "26 内核"} · 核心动作</span>
      </div>
      <div className="data-rows" aria-label="核心动作包">
        {ACTION_ROWS.map((row) => {
          const value = resolveValue(map, row.keys, row.keys.includes("dribbleStyle") ? detail.dribbleStyle : undefined);
          return (
            <div className="data-row" key={row.label}>
              <span className="data-row__label">{row.label}</span>
              <span className={value === "—" ? "data-row__value is-muted" : "data-row__value"}>
                {value}
              </span>
            </div>
          );
        })}
      </div>

      {entries.length ? (
        <>
          <div className="action-subhead">
            <h2 className="action-subhead__title">全部动作</h2>
            <span className="action-subhead__hint">共 {entries.length} 项</span>
          </div>
          <div className="action-grid">
            {entries
              .filter(([key]) => !STYLE_KEYS.includes(key))
              .map(([key, value]) => (
                <div className="data-row" key={key}>
                  <span className="data-row__label">{key}</span>
                  <span className="data-row__value" style={{ fontSize: 12, maxWidth: "64%", whiteSpace: "normal" }}>
                    {value}
                  </span>
                </div>
              ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
