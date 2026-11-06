import { useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import type { PlayerSummary } from "../data/types";
import { Avatar } from "./Avatar";
import { SearchField } from "./SearchField";
import { formatPrice } from "../lib/format";

interface PlayerPickerProps {
  open: boolean;
  catalog: PlayerSummary[];
  exclude: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}

export function PlayerPicker({ open, catalog, exclude, onPick, onClose }: PlayerPickerProps) {
  const [query, setQuery] = useState("");
  const inputWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    inputWrap.current?.querySelector("input")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const keyword = query.trim().toLowerCase();
  const results = catalog
    .filter((player) => {
      if (!keyword) return true;
      return (
        player.name.toLowerCase().includes(keyword) ||
        player.nameEn.toLowerCase().includes(keyword) ||
        player.team.toLowerCase().includes(keyword)
      );
    })
    .slice(0, 60);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="选择对比球员"
      onClick={onClose}
    >
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <div>
            <div className="modal__title">添加对比球员</div>
          </div>
          <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
            <X size={15} weight="bold" />
          </button>
        </div>
        <div style={{ padding: "12px 16px 4px" }} ref={inputWrap}>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="按姓名、球队搜索"
            ariaLabel="搜索要加入对比的球员"
          />
        </div>
        <div className="modal__body">
          {results.length === 0 ? (
            <div className="modal__empty">没有找到匹配的球员</div>
          ) : (
            results.map((player) => {
              const disabled = exclude.includes(player.id);
              return (
                <button
                  key={player.id}
                  type="button"
                  className="modal__item"
                  disabled={disabled}
                  onClick={() => {
                    onPick(player.id);
                    onClose();
                  }}
                >
                  <Avatar name={player.name} portrait={player.portrait} size={32} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
                      {player.name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {player.positions.join("/")} · {player.team} · {player.archetype}
                    </span>
                  </span>
                  <span className="num" style={{ fontWeight: 700 }}>
                    {player.overall}
                  </span>
                  <span className="num" style={{ fontSize: 11, color: "var(--text-3)", width: 74, textAlign: "right" }}>
                    {formatPrice(player.price)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
