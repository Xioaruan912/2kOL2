import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Basketball, FunnelSimple, SortAscending, SortDescending } from "@phosphor-icons/react";
import { PlayerTable } from "../components/PlayerTable";
import { SearchField } from "../components/SearchField";
import { Select } from "../components/Select";
import { useCatalog } from "../hooks/useData";
import { useCompare, useFavorites, pushToast } from "../state/store";
import { BADGE_FILTER_OPTIONS, PAGE_SIZE } from "../lib/constants";
import { POSITIONS, SORT_OPTIONS, type SortKey } from "../data/taxonomy";
import type { PlayerSummary } from "../data/types";
import { formatPrice } from "../lib/format";

const SORT_KEYS = SORT_OPTIONS.map((option) => option.key);
const BADGE_KEYS = BADGE_FILTER_OPTIONS.map((option) => option.value);

function totalBadgeCount(player: PlayerSummary): number {
  const c = player.badgeCounts;
  return c.bronze + c.silver + c.gold + c.purple;
}

function applyBadgeFilter(player: PlayerSummary, filter: string): boolean {
  const total = totalBadgeCount(player);
  switch (filter) {
    case "total-15":
      return total >= 15;
    case "total-25":
      return total >= 25;
    case "total-35":
      return total >= 35;
    case "has-purple":
      return player.badgeCounts.purple > 0;
    case "has-gold":
      return player.badgeCounts.gold > 0;
    default:
      return true;
  }
}

function sortPlayers(list: PlayerSummary[], key: SortKey, dir: "asc" | "desc"): PlayerSummary[] {
  const factor = dir === "asc" ? 1 : -1;
  const value = (player: PlayerSummary): number | string => {
    switch (key) {
      case "price":
        return player.price;
      case "badges":
        return totalBadgeCount(player);
      case "height":
        return player.height ?? 0;
      case "name":
        return player.name;
      default:
        return player.overall;
    }
  };
  return [...list].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (typeof va === "string" && typeof vb === "string") {
      return va.localeCompare(vb, "zh-Hans-CN") * factor;
    }
    // 无市价 / 无身高的球员始终排在末尾，避免 0 值干扰排序结果
    if (key === "price" || key === "height") {
      const missingA = !va;
      const missingB = !vb;
      if (missingA !== missingB) return missingA ? 1 : -1;
    }
    return (Number(va) - Number(vb)) * factor;
  });
}

export function PlayersPage() {
  const { catalog, loading, error, reload } = useCatalog();
  const { ids: favoriteIds, toggle: toggleFavorite } = useFavorites();
  const { ids: compareIds, toggle: toggleCompare } = useCompare();
  const [params, setParams] = useSearchParams();

  const query = params.get("q") ?? "";
  const team = params.get("team") ?? "";
  const pos = params.get("pos") ?? "";
  const type = params.get("type") ?? "";
  const series = params.get("series") ?? "";
  const badge = BADGE_KEYS.includes(params.get("badge") ?? "") ? (params.get("badge") as string) : "all";
  const sort = SORT_KEYS.includes((params.get("sort") ?? "") as SortKey)
    ? ((params.get("sort") ?? "overall") as SortKey)
    : "overall";
  const dir = params.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
    });
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  const options = useMemo(() => {
    if (!catalog) return { teams: [], types: [], series: [] };
    const teams = new Map<string, number>();
    const types = new Map<string, number>();
    const seriesList = new Map<string, number>();
    catalog.forEach((player) => {
      if (player.team) teams.set(player.team, (teams.get(player.team) ?? 0) + 1);
      if (player.archetype) types.set(player.archetype, (types.get(player.archetype) ?? 0) + 1);
      if (player.series) seriesList.set(player.series, (seriesList.get(player.series) ?? 0) + 1);
    });
    const toOptions = (map: Map<string, number>) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => ({ value, label: value }));
    return {
      teams: toOptions(teams),
      types: toOptions(types),
      series: toOptions(seriesList),
    };
  }, [catalog]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const keyword = query.trim().toLowerCase();
    return catalog.filter((player) => {
      if (keyword) {
        const haystack = `${player.name} ${player.nameEn} ${player.team} ${player.archetype}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      if (team && player.team !== team) return false;
      if (pos && !player.positions.includes(pos)) return false;
      if (type && player.archetype !== type) return false;
      if (series && player.series !== series) return false;
      if (!applyBadgeFilter(player, badge)) return false;
      return true;
    });
  }, [catalog, query, team, pos, type, series, badge]);

  const sorted = useMemo(() => sortPlayers(filtered, sort, dir), [filtered, sort, dir]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagePlayers = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) update({ page: String(totalPages) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages]);

  const stats = useMemo(() => {
    if (!catalog) return null;
    const avgOverall = catalog.reduce((sum, p) => sum + p.overall, 0) / (catalog.length || 1);
    const maxPrice = catalog.reduce((max, p) => Math.max(max, p.price), 0);
    return { avgOverall: Math.round(avgOverall), maxPrice };
  }, [catalog]);

  const activeFilterCount = [team, pos, type, series, badge !== "all" ? badge : "", query.trim() ? "q" : ""]
    .filter(Boolean).length;

  const handleToggleCompare = (id: string) => {
    const result = toggleCompare(id);
    if (!result.ok) pushToast(result.reason ?? "无法加入对比", "danger");
  };

  const handleToggleFavorite = (id: string) => {
    const wasFavorite = favoriteIds.includes(id);
    toggleFavorite(id);
    pushToast(wasFavorite ? "已取消收藏" : "已加入收藏", wasFavorite ? "neutral" : "accent");
  };

  const pageNumbers = useMemo(() => {
    const pages: Array<number | "…"> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push("…");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i += 1) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1 className="page-title">球员数据库</h1>
          <p className="page-sub">
            2KOL2 PC 端全量球员检索 · 支持姓名、球队、位置、类型与徽章组合筛选
          </p>
        </div>
        <div className="meta-strip" aria-label="数据库概览">
          <div className="meta-item">
            <span className="meta-item__label">球员总数</span>
            <span className="meta-item__value">{catalog ? catalog.length : "—"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-item__label">当前结果</span>
            <span className="meta-item__value">{loading ? "—" : filtered.length}</span>
          </div>
          <div className="meta-item">
            <span className="meta-item__label">平均总评</span>
            <span className="meta-item__value">{stats ? stats.avgOverall : "—"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-item__label">最高身价</span>
            <span className="meta-item__value">{stats ? formatPrice(stats.maxPrice) : "—"}</span>
          </div>
        </div>
      </div>

      <section className="filters" aria-label="筛选条件">
        <div className="filters__row">
          <SearchField
            value={query}
            onChange={(value) => update({ q: value })}
            placeholder="搜索球员中文名、英文名或球队"
            className="filters__search"
          />
          <Select
            ariaLabel="球队筛选"
            value={team}
            onChange={(value) => update({ team: value })}
            options={[{ value: "", label: "全部球队" }, ...options.teams]}
          />
          <Select
            ariaLabel="球员类型筛选"
            value={type}
            onChange={(value) => update({ type: value })}
            options={[{ value: "", label: "全部类型" }, ...options.types]}
          />
          <Select
            ariaLabel="卡系筛选"
            value={series}
            onChange={(value) => update({ series: value })}
            options={[{ value: "", label: "全部卡系" }, ...options.series]}
          />
        </div>

        <div className="filters__divider" />

        <div className="filters__row filters__row--split">
          <div className="pos-chips" role="group" aria-label="位置筛选">
            <span className="filters__label">位置</span>
            <button
              type="button"
              className={pos === "" ? "chip is-active" : "chip"}
              onClick={() => update({ pos: "" })}
            >
              全部
            </button>
            {POSITIONS.map((position) => (
              <button
                key={position}
                type="button"
                className={pos === position ? "chip is-active" : "chip"}
                onClick={() => update({ pos: position })}
              >
                {position}
              </button>
            ))}
          </div>

          <div className="filters__row" style={{ gap: 8 }}>
            <Select
              ariaLabel="徽章数量筛选"
              value={badge}
              onChange={(value) => update({ badge: value })}
              options={BADGE_FILTER_OPTIONS}
            />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() =>
                setParams(new URLSearchParams(), { replace: true })
              }
              disabled={!activeFilterCount}
            >
              <FunnelSimple size={13} weight="bold" />
              清空筛选
            </button>
          </div>
        </div>
      </section>

      <div className="list-toolbar">
        <span className="results-count">
          共<strong>{filtered.length}</strong>名球员
          {activeFilterCount ? (
            <span className="filter-count" style={{ marginLeft: 8 }}>
              · {activeFilterCount} 项筛选生效
            </span>
          ) : null}
        </span>
        <div className="sort-group" role="group" aria-label="排序方式">
          <span className="filters__label">排序</span>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={sort === option.key ? "chip is-active" : "chip"}
              onClick={() => update({ sort: option.key, dir: sort === option.key ? dir : option.key === "name" ? "asc" : "desc" })}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            className="sort-dir"
            aria-label={dir === "desc" ? "当前降序，点击切换升序" : "当前升序，点击切换降序"}
            title={dir === "desc" ? "降序" : "升序"}
            onClick={() => update({ sort, dir: dir === "desc" ? "asc" : "desc" })}
          >
            {dir === "desc" ? (
              <SortDescending size={14} weight="bold" />
            ) : (
              <SortAscending size={14} weight="bold" />
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton-page" aria-label="正在加载球员数据">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 58 }} />
          ))}
        </div>
      ) : error ? (
        <div className="state-block">
          <span className="state-block__icon">
            <Basketball size={22} />
          </span>
          <div className="state-block__title">球员数据加载失败</div>
          <p className="state-block__text">{error}</p>
          <div className="state-block__actions">
            <button type="button" className="btn btn--primary" onClick={reload}>
              重新加载
            </button>
          </div>
        </div>
      ) : pagePlayers.length === 0 ? (
        <div className="state-block">
          <span className="state-block__icon">
            <Basketball size={22} />
          </span>
          <div className="state-block__title">没有符合条件的球员</div>
          <p className="state-block__text">
            当前关键词与筛选条件组合下没有结果。可以放宽徽章或类型限制，或直接清空条件重新检索。
          </p>
          <div className="state-block__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
            >
              清空全部条件
            </button>
          </div>
        </div>
      ) : (
        <>
          <PlayerTable
            players={pagePlayers}
            favorites={favoriteIds}
            compare={compareIds}
            onToggleFavorite={handleToggleFavorite}
            onToggleCompare={handleToggleCompare}
          />

          {totalPages > 1 ? (
            <div className="pagination">
              <span className="pagination__info">
                第 {currentPage} / {totalPages} 页 · 每页 {PAGE_SIZE} 名
              </span>
              <div className="pager">
                <button
                  type="button"
                  className="pager__btn"
                  disabled={currentPage === 1}
                  onClick={() => update({ page: String(currentPage - 1) })}
                  aria-label="上一页"
                >
                  上一页
                </button>
                {pageNumbers.map((item, index) =>
                  item === "…" ? (
                    <span className="pager__ellipsis" key={`ellipsis-${index}`}>
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={item === currentPage ? "pager__btn is-active" : "pager__btn"}
                      aria-current={item === currentPage ? "page" : undefined}
                      onClick={() => update({ page: String(item) })}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="pager__btn"
                  disabled={currentPage === totalPages}
                  onClick={() => update({ page: String(currentPage + 1) })}
                  aria-label="下一页"
                >
                  下一页
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
