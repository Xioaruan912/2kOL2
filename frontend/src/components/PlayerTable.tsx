import { Link, useNavigate } from "react-router-dom";
import { Plus, Star } from "@phosphor-icons/react";
import type { PlayerSummary } from "../data/types";
import { Avatar } from "./Avatar";
import { BadgeCounts } from "./BadgeCounts";
import { formatHeight, formatPrice, formatPriceFull } from "../lib/format";
import { RARE_SERIES } from "../lib/constants";

interface PlayerTableProps {
  players: PlayerSummary[];
  favorites: string[];
  compare: string[];
  onToggleFavorite: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

function VersionPlate({ version }: { version: number }) {
  if (!version) return null;
  const short = String(version).slice(-2);
  return (
    <span
      style={{
        fontFamily: "var(--font-num)",
        fontSize: 10,
        letterSpacing: "0.04em",
        color: "var(--text-3)",
        border: "1px solid var(--line)",
        borderRadius: 2,
        padding: "0 4px",
        lineHeight: "15px",
      }}
      title={`卡牌年份 ${version}`}
    >
      {short}
    </span>
  );
}

function RowActions({
  player,
  isFavorite,
  isCompared,
  onToggleFavorite,
  onToggleCompare,
}: {
  player: PlayerSummary;
  isFavorite: boolean;
  isCompared: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleCompare: (id: string) => void;
}) {
  return (
    <div className="row-actions">
      <button
        type="button"
        className={isFavorite ? "icon-btn is-active" : "icon-btn"}
        aria-label={isFavorite ? `取消收藏 ${player.name}` : `收藏 ${player.name}`}
        title={isFavorite ? "取消收藏" : "加入收藏"}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(player.id);
        }}
      >
        <Star size={15} weight={isFavorite ? "fill" : "regular"} />
      </button>
      <button
        type="button"
        className={isCompared ? "icon-btn is-active" : "icon-btn"}
        aria-label={isCompared ? `将 ${player.name} 移出对比` : `将 ${player.name} 加入对比`}
        title={isCompared ? "移出对比" : "加入对比"}
        onClick={(event) => {
          event.stopPropagation();
          onToggleCompare(player.id);
        }}
      >
        <Plus size={15} weight="bold" />
      </button>
    </div>
  );
}

export function PlayerTable({
  players,
  favorites,
  compare,
  onToggleFavorite,
  onToggleCompare,
}: PlayerTableProps) {
  const navigate = useNavigate();

  return (
    <>
      <div className="table-shell">
        <table className="player-table">
          <thead>
            <tr>
              <th scope="col">球员</th>
              <th scope="col">位置</th>
              <th scope="col">球队</th>
              <th scope="col">类型</th>
              <th scope="col" className="is-num">
                总评
              </th>
              <th scope="col">徽章</th>
              <th scope="col" className="is-num">
                价格
              </th>
              <th scope="col" aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.id}
                onClick={() => navigate(`/player/${player.id}`)}
                className={compare.includes(player.id) ? "is-selected" : undefined}
              >
                <td>
                  <div className="pl-cell">
                    <Avatar name={player.name} portrait={player.portrait} size={36} />
                    <div className="pl-identity">
                      <span className="pl-name">
                        <Link
                          to={`/player/${player.id}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {player.name}
                        </Link>
                        <VersionPlate version={player.version} />
                        {player.series ? (
                          <span
                            className={
                              RARE_SERIES.has(player.series)
                                ? "series-chip is-rare"
                                : "series-chip"
                            }
                          >
                            {player.series}
                          </span>
                        ) : null}
                      </span>
                      <span className="pl-en">
                        {player.nameEn}
                        {player.height ? ` · ${formatHeight(player.height)}` : ""}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="pos-tags">
                    {Array.from(new Set(player.positions)).map((pos) => (
                      <span key={pos}>{pos}</span>
                    ))}
                  </span>
                </td>
                <td>{player.team || "—"}</td>
                <td style={{ color: "var(--text-2)", fontSize: 12 }}>{player.archetype || "—"}</td>
                <td className="is-num">
                  <span className={`overall-num${player.overall >= 130 ? " is-elite" : ""}`}>
                    {player.overall}
                  </span>
                </td>
                <td>
                  <BadgeCounts counts={player.badgeCounts} showZero={false} />
                </td>
                <td className="is-num">
                  <span className="price-cell">
                    <span className="price-cell__main">{formatPrice(player.price)}</span>
                    <span className="price-cell__sub">{formatPriceFull(player.price)}</span>
                  </span>
                </td>
                <td>
                  <RowActions
                    player={player}
                    isFavorite={favorites.includes(player.id)}
                    isCompared={compare.includes(player.id)}
                    onToggleFavorite={onToggleFavorite}
                    onToggleCompare={onToggleCompare}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="player-cards">
        {players.map((player) => (
          <div
            key={player.id}
            className="player-card"
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/player/${player.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/player/${player.id}`);
              }
            }}
          >
            <Avatar name={player.name} portrait={player.portrait} size={52} />
            <div className="player-card__body">
              <div className="player-card__top">
                <span className="player-card__name">{player.name}</span>
                <VersionPlate version={player.version} />
                <span className={`player-card__score${player.overall >= 130 ? " is-elite" : ""}`}>
                  <span className="num">{player.overall}</span>
                </span>
              </div>
              <div className="player-card__meta">
                <span className="pos-tags">
                  {Array.from(new Set(player.positions)).map((pos) => (
                    <span key={pos}>{pos}</span>
                  ))}
                </span>
                <span>{player.team}</span>
                <span>{player.archetype}</span>
              </div>
              <div className="player-card__bottom">
                <BadgeCounts counts={player.badgeCounts} showZero={false} />
                <span className="player-card__price">{formatPrice(player.price)}</span>
              </div>
            </div>
            <div className="player-card__actions" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className={favorites.includes(player.id) ? "icon-btn is-active" : "icon-btn"}
                aria-label={favorites.includes(player.id) ? "取消收藏" : "加入收藏"}
                onClick={() => onToggleFavorite(player.id)}
              >
                <Star size={16} weight={favorites.includes(player.id) ? "fill" : "regular"} />
              </button>
              <button
                type="button"
                className={compare.includes(player.id) ? "icon-btn is-active" : "icon-btn"}
                aria-label={compare.includes(player.id) ? "移出对比" : "加入对比"}
                onClick={() => onToggleCompare(player.id)}
              >
                <Plus size={16} weight="bold" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
