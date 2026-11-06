import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Star } from "@phosphor-icons/react";
import { useCatalog } from "../hooks/useData";
import { useCompare, useFavorites, pushToast } from "../state/store";
import { PlayerTable } from "../components/PlayerTable";

export function FavoritesPage() {
  const { catalog, loading, error, reload } = useCatalog();
  const { ids: favoriteIds, toggle: toggleFavorite } = useFavorites();
  const { ids: compareIds, toggle: toggleCompare } = useCompare();

  const players = useMemo(() => {
    if (!catalog) return [];
    return catalog
      .filter((player) => favoriteIds.includes(player.id))
      .sort((a, b) => b.overall - a.overall);
  }, [catalog, favoriteIds]);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1 className="page-title">收藏球员</h1>
          <p className="page-sub">收藏状态保存在浏览器本地，换设备不会同步</p>
        </div>
        <div className="meta-strip">
          <div className="meta-item">
            <span className="meta-item__label">已收藏</span>
            <span className="meta-item__value">{favoriteIds.length}</span>
          </div>
          <div className="meta-item">
            <span className="meta-item__label">平均总评</span>
            <span className="meta-item__value">
              {players.length
                ? Math.round(players.reduce((sum, player) => sum + player.overall, 0) / players.length)
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton-page">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 58 }} />
          ))}
        </div>
      ) : error ? (
        <div className="state-block">
          <div className="state-block__title">收藏数据加载失败</div>
          <p className="state-block__text">{error}</p>
          <div className="state-block__actions">
            <button type="button" className="btn btn--primary" onClick={reload}>
              重新加载
            </button>
          </div>
        </div>
      ) : players.length === 0 ? (
        <div className="state-block">
          <span className="state-block__icon">
            <Star size={22} />
          </span>
          <div className="state-block__title">还没有收藏任何球员</div>
          <p className="state-block__text">
            在球员库列表点击行尾的星标即可收藏。收藏的球员会一直保留，方便快速回看。
          </p>
          <div className="state-block__actions">
            <Link className="btn btn--primary" to="/">
              去球员库挑选
            </Link>
          </div>
        </div>
      ) : (
        <PlayerTable
          players={players}
          favorites={favoriteIds}
          compare={compareIds}
          onToggleFavorite={(id) => {
            toggleFavorite(id);
            pushToast("已取消收藏");
          }}
          onToggleCompare={(id) => {
            const result = toggleCompare(id);
            if (!result.ok) pushToast(result.reason ?? "无法加入对比", "danger");
          }}
        />
      )}
    </div>
  );
}
