import { X } from "@phosphor-icons/react";
import type { PlayerSummary } from "../data/types";
import { Avatar } from "./Avatar";
import { formatPrice } from "../lib/format";

interface CompareTrayProps {
  players: PlayerSummary[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onStart: () => void;
}

export function CompareTray({ players, onRemove, onClear, onStart }: CompareTrayProps) {
  if (!players.length) return null;
  const emptySlots = Math.max(0, 3 - players.length);

  return (
    <div className="compare-tray" role="region" aria-label="球员对比栏">
      <div className="container">
        <div className="compare-tray__inner">
          <span className="compare-tray__label">
            <strong>{players.length}</strong>/3 已选对比
          </span>
          <div className="tray-slots">
            {players.map((player) => (
              <div className="tray-slot" key={player.id}>
                <Avatar name={player.name} portrait={player.portrait} size={26} />
                <span className="tray-slot__name" title={player.name}>
                  {player.name}
                </span>
                <span className="tray-slot__price">{formatPrice(player.price)}</span>
                <button
                  type="button"
                  className="tray-slot__remove"
                  aria-label={`移出对比 ${player.name}`}
                  onClick={() => onRemove(player.id)}
                >
                  <X size={11} weight="bold" />
                </button>
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, index) => (
              <span className="tray-slot tray-slot--empty" key={`empty-${index}`}>
                空位
              </span>
            ))}
          </div>
          <div className="compare-tray__actions">
            <button type="button" className="btn btn--on-dark btn--sm" onClick={onClear}>
              清空
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={onStart}
              disabled={players.length < 2}
              title={players.length < 2 ? "至少选择 2 名球员" : "进入对比页"}
            >
              开始对比
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
