import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Basketball,
  FunnelSimple,
  SortAscending,
  SortDescending,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { PlayerTable } from "../components/PlayerTable";
import { SearchField } from "../components/SearchField";
import { Select } from "../components/Select";
import { FilterDrawer, type DrawerValues } from "../components/FilterDrawer";
import { useCatalog } from "../hooks/useData";
import { useCompare, useFavorites, pushToast } from "../state/store";
import { BADGE_FILTER_OPTIONS, PAGE_SIZE } from "../lib/constants";
import { POSITIONS, SORT_OPTIONS, type SortKey } from "../data/taxonomy";
import type { PlayerSummary } from "../data/types";
import { formatPrice } from "../lib/format";
import { searchAdvanced } from "../data/repository";
import {
  buildFilterChips,
  buildServerFilters,
  countAdvancedFilters,
  hasDetailFilters,
  matchesFilters,
  parseFilters,
  serializeAttributeConditions,
  serializeBadgeConditions,
  totalBadges,
} from "../lib/filtering";

const SORT_KEYS = SORT_OPTIONS.map((option) => option.key);

function sortPlayers(list: PlayerSummary[], key: SortKey, dir: "asc" | "desc"): PlayerSummary[] {
  const factor = dir === "asc" ? 1 : -1;
  const value = (player: PlayerSummary): number | string => {
    switch (key) {
      case "price":
        return player.price;
      case "badges":
        return totalBadges(player);
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
    if (key === "price" || key === "height") {
      const missingA = !va;
      const missingB = !vb;
      if (missingA !== missingB) return missingA ? 1 : -1;
    }
    return (Number(va) - Number(vb)) * factor;
  });
}

interface AdvancedState {
  loading: boolean;
  error: string | null;
  players: PlayerSummary[];
  total: number;
}

export function PlayersPage() {
  const { catalog, loading, error, reload } = useCatalog();
  const { ids: favoriteIds, toggle: toggleFavorite } = useFavorites();
  const { ids: compareIds, toggle: toggleCompare } = useCompare();
  const [params, setParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advNonce, setAdvNonce] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [adv, setAdv] = useState<AdvancedState>({
    loading: false,
    error: null,
    players: [],
    total: 0,
  });

  const filters = useMemo(() => parseFilters(params), [params]);
  const sort = SORT_KEYS.includes((params.get("sort") ?? "") as SortKey)
    ? ((params.get("sort") ?? "overall") as SortKey)
    : "overall";
  const dir = params.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const advancedActive = hasDetailFilters(filters);
  const effectiveSort: SortKey = advancedActive ? (sort === "price" ? "price" : "overall") : sort;

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
    });
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

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

  const localFiltered = useMemo(() => {
    if (!catalog) return [];
    const keyword = filters.q.trim().toLowerCase();
    return catalog.filter((player) => {
      if (keyword) {
        const haystack = `${player.name} ${player.nameEn} ${player.team} ${player.archetype}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return matchesFilters(player, filters);
    });
  }, [catalog, filters]);

  const sortedLocal = useMemo(
    () => sortPlayers(localFiltered, sort, dir),
    [localFiltered, sort, dir],
  );

  const serverFilters = useMemo(() => buildServerFilters(filters), [filters]);
  const serverKey = JSON.stringify(serverFilters);

  useEffect(() => {
    if (!advancedActive) {
      setDebouncedQuery(filters.q);
      return;
    }
    const timer = window.setTimeout(() => setDebouncedQuery(filters.q), 400);
    return () => window.clearTimeout(timer);
  }, [filters.q, advancedActive]);

  useEffect(() => {
    if (!advancedActive) return;
    let alive = true;
    setAdv((prev) => ({ ...prev, loading: true, error: null }));
    searchAdvanced({
      filters: serverFilters,
      keyword: debouncedQuery.trim(),
      team: filters.team,
      page,
      pageSize: PAGE_SIZE,
      sortField: effectiveSort === "price" ? "price" : "overall",
      sortOrder: dir,
    })
      .then((result) => {
        if (!alive) return;
        setAdv({ loading: false, error: null, players: result.players, total: result.total });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setAdv({
          loading: false,
          error: err instanceof Error ? err.message : "细节筛选失败",
          players: [],
          total: 0,
        });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedActive, serverKey, debouncedQuery, filters.team, page, effectiveSort, dir, advNonce]);

  const total = advancedActive ? adv.total : localFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (advancedActive && adv.loading) return;
    if (page > totalPages) update({ page: String(totalPages) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages, advancedActive, adv.loading]);

  const pagePlayers = advancedActive
    ? adv.players
    : sortedLocal.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    if (!catalog) return null;
    const avgOverall = catalog.reduce((sum, player) => sum + player.overall, 0) / (catalog.length || 1);
    const maxPrice = catalog.reduce((max, player) => Math.max(max, player.price), 0);
    return { avgOverall: Math.round(avgOverall), maxPrice };
  }, [catalog]);

  const activeFilterCount = countAdvancedFilters(filters);
  const chips = useMemo(() => buildFilterChips(filters), [filters]);
  const busy = advancedActive ? adv.loading : loading;
  const failure = advancedActive ? adv.error : error;

  const handleToggleCompare = (id: string) => {
    const result = toggleCompare(id);
    if (!result.ok) pushToast(result.reason ?? "无法加入对比", "danger");
  };

  const handleToggleFavorite = (id: string) => {
    const wasFavorite = favoriteIds.includes(id);
    toggleFavorite(id);
    pushToast(wasFavorite ? "已取消收藏" : "已加入收藏", wasFavorite ? "neutral" : "accent");
  };

  const togglePosition = (position: string) => {
    const next = filters.positions.includes(position)
      ? filters.positions.filter((item) => item !== position)
      : [...filters.positions, position];
    update({ pos: next.join(",") || null });
  };

  const handleApply = (values: DrawerValues) => {
    const hasAdvanced =
      values.badges.length > 0 || values.attributes.length > 0 || values.playTypes.length > 0;
    update({
      ovr_min: values.overallMin !== undefined ? String(values.overallMin) : null,
      ovr_max: values.overallMax !== undefined ? String(values.overallMax) : null,
      price_min: values.priceMin !== undefined ? String(values.priceMin) : null,
      price_max: values.priceMax !== undefined ? String(values.priceMax) : null,
      h_min: values.heightMin !== undefined ? String(values.heightMin) : null,
      h_max: values.heightMax !== undefined ? String(values.heightMax) : null,
      adv_badges: values.badges.length ? serializeBadgeConditions(values.badges) : null,
      adv_attrs: values.attributes.length ? serializeAttributeConditions(values.attributes) : null,
      adv_plays: values.playTypes.length ? values.playTypes.join(",") : null,
      badge: hasAdvanced ? null : params.get("badge"),
    });
    setDrawerOpen(false);
  };

  const exitAdvanced = () => {
    update({ adv_badges: null, adv_attrs: null, adv_plays: null });
    pushToast("已退出精细筛选");
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
            2KOL2 PC 端全量球员检索 · 支持区间、徽章、属性与战术精细筛选
          </p>
        </div>
        <div className="meta-strip" aria-label="数据库概览">
          <div className="meta-item">
            <span className="meta-item__label">球员总数</span>
            <span className="meta-item__value">{catalog ? catalog.length : "—"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-item__label">当前结果</span>
            <span className="meta-item__value">{busy ? "—" : total}</span>
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
            value={filters.q}
            onChange={(value) => update({ q: value })}
            placeholder="搜索球员中文名、英文名或球队"
            className="filters__search"
          />
          <Select
            ariaLabel="球队筛选"
            value={filters.team}
            onChange={(value) => update({ team: value })}
            options={[{ value: "", label: "全部球队" }, ...options.teams]}
          />
          <Select
            ariaLabel="球员类型筛选"
            value={filters.type}
            onChange={(value) => update({ type: value })}
            options={[{ value: "", label: "全部类型" }, ...options.types]}
          />
          <Select
            ariaLabel="卡系筛选"
            value={filters.series}
            onChange={(value) => update({ series: value })}
            options={[{ value: "", label: "全部卡系" }, ...options.series]}
          />
        </div>

        <div className="filters__divider" />

        <div className="filters__row filters__row--split">
          <div className="pos-chips" role="group" aria-label="位置筛选（可多选）">
            <span className="filters__label">位置</span>
            <button
              type="button"
              className={filters.positions.length === 0 ? "chip is-active" : "chip"}
              onClick={() => update({ pos: null })}
            >
              全部
            </button>
            {POSITIONS.map((position) => (
              <button
                key={position}
                type="button"
                className={filters.positions.includes(position) ? "chip is-active" : "chip"}
                onClick={() => togglePosition(position)}
              >
                {position}
              </button>
            ))}
          </div>

          <div className="filters__row" style={{ gap: 8 }}>
            <Select
              ariaLabel="徽章数量筛选"
              value={filters.badge}
              onChange={(value) => update({ badge: value })}
              options={BADGE_FILTER_OPTIONS}
              disabled={advancedActive}
              title={advancedActive ? "精细筛选模式下请使用徽章条件" : undefined}
            />
            <button
              type="button"
              className="btn btn--primary btn--filter"
              onClick={() => setDrawerOpen(true)}
            >
              <FunnelSimple size={14} weight="bold" />
              筛选
              {activeFilterCount > 0 ? (
                <span className="btn__count">{activeFilterCount}</span>
              ) : null}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={clearAll}
              disabled={chips.length === 0}
            >
              清空
            </button>
          </div>
        </div>

        {chips.length ? (
          <div className="active-chips">
            <span className="filters__label">已选</span>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="active-chip"
                title={`移除条件：${chip.label} ${chip.value}`}
                onClick={() => update(chip.patch)}
              >
                <span className="active-chip__label">{chip.label}</span>
                <span className="active-chip__value">{chip.value}</span>
                <X size={10} weight="bold" />
              </button>
            ))}
            <button type="button" className="chip-link" onClick={clearAll}>
              清除全部
            </button>
          </div>
        ) : null}
      </section>

      <div className="list-toolbar">
        <span className="results-count">
          共<strong>{busy ? "—" : total}</strong>名球员
          {advancedActive ? (
            <span className="mode-tag">精细筛选 · 官方实时</span>
          ) : activeFilterCount ? (
            <span className="filter-count">· {activeFilterCount} 项筛选生效</span>
          ) : null}
        </span>
        <div className="sort-group" role="group" aria-label="排序方式">
          <span className="filters__label">排序</span>
          {SORT_OPTIONS.map((option) => {
            const disabled = advancedActive && option.key !== "overall" && option.key !== "price";
            return (
              <button
                key={option.key}
                type="button"
                className={effectiveSort === option.key ? "chip is-active" : "chip"}
                disabled={disabled}
                title={disabled ? "精细筛选模式仅支持总评 / 价格排序" : undefined}
                onClick={() =>
                  update({
                    sort: option.key,
                    dir:
                      sort === option.key
                        ? dir
                        : option.key === "name"
                          ? "asc"
                          : "desc",
                  })
                }
              >
                {option.label}
              </button>
            );
          })}
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

      {failure ? (
        <div className="state-block">
          <span className="state-block__icon">
            <WarningCircle size={22} />
          </span>
          <div className="state-block__title">
            {advancedActive ? "细节筛选需要官方实时接口" : "球员数据加载失败"}
          </div>
          <p className="state-block__text">
            {advancedActive
              ? `当前条件（徽章 / 属性 / 战术）需要向后端实时取数，可能由于网络或上游接口暂时不可用。可以重试，或退出精细筛选改用本地条件。`
              : failure}
          </p>
          <div className="state-block__actions">
            {advancedActive ? (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setAdvNonce((value) => value + 1)}
                >
                  重试
                </button>
                <button type="button" className="btn" onClick={exitAdvanced}>
                  退出精细筛选
                </button>
              </>
            ) : (
              <button type="button" className="btn btn--primary" onClick={reload}>
                重新加载
              </button>
            )}
          </div>
        </div>
      ) : busy ? (
        <div className="skeleton-page" aria-label="正在加载球员数据">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 58 }} />
          ))}
        </div>
      ) : pagePlayers.length === 0 ? (
        <div className="state-block">
          <span className="state-block__icon">
            <Basketball size={22} />
          </span>
          <div className="state-block__title">没有符合条件的球员</div>
          <p className="state-block__text">
            {advancedActive
              ? "当前徽章、属性或战术条件组合下没有匹配球员，可以降低属性阈值或移除部分徽章条件。"
              : "当前关键词与筛选条件组合下没有结果。可以放宽徽章或类型限制，或直接清空条件重新检索。"}
          </p>
          <div className="state-block__actions">
            <button type="button" className="btn btn--primary" onClick={clearAll}>
              清空全部条件
            </button>
            {advancedActive ? (
              <button type="button" className="btn" onClick={exitAdvanced}>
                退出精细筛选
              </button>
            ) : null}
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

      <FilterDrawer
        open={drawerOpen}
        filters={filters}
        onClose={() => setDrawerOpen(false)}
        onApply={handleApply}
      />
    </div>
  );
}
