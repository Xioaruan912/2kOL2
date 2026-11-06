import { Strategy } from "@phosphor-icons/react";
import type { PlayerDetail } from "../../data/types";

export function TacticsTab({ detail }: { detail: PlayerDetail }) {
  const types = detail.tactics.types;
  const rows = [
    { label: "是否主控", value: detail.tactics.primary },
    ...Array.from({ length: 4 }, (_, index) => {
      const found = types.find((item) => item.index === index + 1);
      return {
        label: `战术类型${index + 1}`,
        value: found?.name ?? "无",
      };
    }),
  ];

  return (
    <div>
      <div className="data-rows">
        <div className="data-row data-row--head">
          <span className="data-row__label">
            <Strategy size={14} weight="bold" />
            战术角色
          </span>
          <span className="data-row__value" style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 400 }}>
            数据来自球员隐藏属性
          </span>
        </div>
        {rows.map((row, index) => (
          <div className="data-row" key={row.label}>
            <span className="data-row__label">{row.label}</span>
            <span
              className="data-row__value"
              style={index > 0 ? { fontSize: 14 } : undefined}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel__head">
          <h2 className="panel__title">战术说明</h2>
        </div>
        <div className="panel__body" style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.7 }}>
          战术类型决定该球员在自动战术与 AI 对局中的跑位倾向。主控球员通常承担持球发起进攻的职责；
          非主控球员更多依赖挡拆、切入与外线拉开空间。数值与战术配置以游戏内实际表现为准。
        </div>
      </div>
    </div>
  );
}
