import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Scales, ShareNetwork, Trash, X } from "@phosphor-icons/react";
import { useCatalog } from "../hooks/useData";
import { getPlayerDetail } from "../data/repository";
import { useCompare, pushToast } from "../state/store";
import type { PlayerDetail } from "../data/types";
import { Avatar } from "../components/Avatar";
import { PlayerPicker } from "../components/PlayerPicker";
import { RadarChart } from "../components/RadarChart";
import { HotZoneCourt, ZONE_ORDER } from "../components/HotZoneCourt";
import { BadgeCounts } from "../components/BadgeCounts";
import { COMPARE_COLORS } from "../lib/constants";
import { ATTRIBUTE_GROUPS } from "../data/taxonomy";
import { formatHeight, formatPositions, formatPrice } from "../lib/format";
import { copyText } from "../lib/clipboard";

const KEY_TENDENCIES = [
  "出手倾向",
  "突破倾向",
  "三分投篮倾向",
  "中距离投篮倾向",
  "背身单打倾向",
  "原地扣篮倾向",
  "突破扣篮倾向",
  "传球到空位倾向",
  "持球抢断倾向",
  "干扰投篮倾向",
];

interface Row {
  label: string;
  values: Array<number | string>;
  best?: number | string;
}

export function ComparePage() {
  const navigate = useNavigate();
  const { catalog, loading } = useCatalog();
  const { ids, toggle, clear, setIds } = useCompare();
  const [params, setParams] = useSearchParams();
  const urlInitialised = useRef(false);
  const [details, setDetails] = useState<PlayerDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // 支持通过 ?ids=4567,4820 直接打开一组对比
  useEffect(() => {
    if (urlInitialised.current) return;
    urlInitialised.current = true;
    const raw = params.get("ids");
    if (!raw) return;
    const incoming = Array.from(
      new Set(raw.split(",").map((item) => item.trim()).filter(Boolean)),
    ).slice(0, 3);
    if (incoming.length && incoming.join(",") !== ids.join(",")) setIds(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 目录就绪后剔除失效 id，避免分享链接里夹带无效球员
  useEffect(() => {
    if (!catalog || !ids.length) return;
    const valid = ids.filter((id) => catalog.some((player) => player.id === id));
    if (valid.length !== ids.length) setIds(valid);
  }, [catalog, ids, setIds]);

  // 选人变化时同步到地址栏，便于分享与刷新
  useEffect(() => {
    const wanted = ids.join(",");
    if ((params.get("ids") ?? "") === wanted) return;
    const next = new URLSearchParams(params);
    if (wanted) next.set("ids", wanted);
    else next.delete("ids");
    setParams(next, { replace: true });
  }, [ids, params, setParams]);

  useEffect(() => {
    if (!ids.length) {
      setDetails([]);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    Promise.all(ids.map((id) => getPlayerDetail(id).catch(() => null)))
      .then((result) => {
        if (!alive) return;
        setDetails(result.filter((item): item is PlayerDetail => Boolean(item)));
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [ids]);

  const slots = useMemo(
    () =>
      Array.from({ length: 3 }, (_, index) => {
        const id = ids[index];
        const player = details.find((item) => item.id === id);
        const summary = catalog?.find((item) => item.id === id);
        return { id, player, summary };
      }),
    [ids, details, catalog],
  );

  const hasEnough = details.length >= 2;
  const radarSeries = details.map((detail, index) => ({
    name: detail.name,
    color: COMPARE_COLORS[index % COMPARE_COLORS.length],
    radar: detail.radar,
  }));

  const basicRows: Row[] = [
    { label: "位置", values: details.map((item) => formatPositions(item.positions)) },
    { label: "球队", values: details.map((item) => item.team || "—") },
    { label: "类型", values: details.map((item) => item.archetype || "—") },
    { label: "卡系", values: details.map((item) => item.series || "—") },
    { label: "身高", values: details.map((item) => formatHeight(item.height)) },
    { label: "臂展", values: details.map((item) => formatHeight(item.wingspan)) },
    {
      label: "总评",
      values: details.map((item) => item.overall),
      best: Math.max(...details.map((item) => item.overall)),
    },
    {
      label: "徽章总数",
      values: details.map(
        (item) =>
          item.badgeCounts.bronze + item.badgeCounts.silver + item.badgeCounts.gold + item.badgeCounts.purple,
      ),
      best: Math.max(
        ...details.map(
          (item) =>
            item.badgeCounts.bronze + item.badgeCounts.silver + item.badgeCounts.gold + item.badgeCounts.purple,
        ),
      ),
    },
    {
      label: "价格",
      values: details.map((item) => formatPrice(item.price)),
      best: (() => {
        const prices = details.filter((item) => item.price > 0).map((item) => item.price);
        return prices.length ? formatPrice(Math.min(...prices)) : undefined;
      })(),
    },
  ];

  const radarRows: Row[] = (details[0]?.radar ?? []).map((entry) => {
    const values = details.map(
      (detail) => detail.radar.find((item) => item.name === entry.name)?.score ?? 0,
    );
    return { label: entry.name, values, best: Math.max(...values) };
  });

  const attributeRows = ATTRIBUTE_GROUPS.map((group) => ({
    group,
    rows: group.names
      .map((name) => {
        const values = details.map(
          (detail) => detail.attributes.find((attr) => attr.name === name)?.value ?? 0,
        );
        return { label: name, values, best: Math.max(...values) };
      })
      .filter((row) => row.values.some((value) => value > 0)),
  })).filter((group) => group.rows.length);

  const attributeGroups = [
    attributeRows.slice(0, 4),
    attributeRows.slice(4),
  ];

  const tendencyRows: Row[] = KEY_TENDENCIES.map((name) => {
    const values = details.map(
      (detail) => detail.tendencies.find((item) => item.name === name)?.value ?? 0,
    );
    return { label: name, values, best: Math.max(...values) };
  }).filter((row) => row.values.some((value) => value > 0));

  const hotZones = details.map((detail) =>
    ZONE_ORDER.map((district) => {
      const found = detail.hotZones.find((zone) => zone.district === district);
      return found ?? { district, heat: 1, level: 0 };
    }),
  );

  function CompareMatrix({
    headLabel,
    groups,
  }: {
    headLabel: string;
    groups: Array<{ label?: string; rows: Row[] }>;
  }) {
    return (
      <div className="cmp-matrix">
        <div className="cmp-matrix__row cmp-matrix__row--head">
          <span className="cmp-matrix__label">{headLabel}</span>
          {details.map((detail) => (
            <span className="cmp-matrix__value" key={detail.id}>
              {detail.name}
            </span>
          ))}
        </div>
        {groups.map((group, groupIndex) => (
          <Fragment key={group.label ?? `group-${groupIndex}`}>
            {group.label ? <div className="cmp-matrix__group">{group.label}</div> : null}
            {group.rows.map((row) => (
              <div className="cmp-matrix__row" key={row.label}>
                <span className="cmp-matrix__label">{row.label}</span>
                {row.values.map((value, index) => {
                  const isBest =
                    row.best !== undefined && value === row.best && details.length > 1;
                  return (
                    <span
                      key={`${row.label}-${index}`}
                      className={isBest ? "cmp-matrix__value is-best" : "cmp-matrix__value"}
                    >
                      {typeof value === "number" ? value.toLocaleString("zh-CN") : value}
                    </span>
                  );
                })}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="compare-head">
        <div>
          <h1 className="page-title">球员对比</h1>
          <p className="page-sub">
            最多同时对比 3 名球员 · 数值最高项自动高亮 · 收藏与对比状态保存在本地
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            disabled={ids.length < 2}
            title={ids.length < 2 ? "至少选择 2 名球员后可分享" : "复制包含球员 ID 的对比链接"}
            onClick={async () => {
              const url = `${window.location.origin}${window.location.pathname}#/compare?ids=${ids.join(",")}`;
              const ok = await copyText(url);
              pushToast(
                ok ? "对比链接已复制，可直接分享" : "复制失败，请手动复制地址栏",
                ok ? "accent" : "danger",
              );
            }}
          >
            <ShareNetwork size={14} weight="bold" />
            分享对比
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setPickerOpen(true)}
            disabled={ids.length >= 3}
            title={ids.length >= 3 ? "最多 3 名球员" : "添加球员"}
          >
            <Plus size={14} weight="bold" />
            添加球员
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              clear();
              pushToast("已清空对比");
            }}
            disabled={!ids.length}
          >
            <Trash size={14} />
            清空
          </button>
        </div>
      </div>

      {ids.length > 0 ? (
      <div className="compare-slots">
        {slots.map((slot, index) => {
          if (!slot.id) {
            return (
              <button
                type="button"
                className="slot slot--empty"
                key={`empty-${index}`}
                onClick={() => setPickerOpen(true)}
              >
                <Plus size={18} weight="bold" color="var(--accent)" />
                <span className="slot--empty__text">添加第 {index + 1} 名球员</span>
                <span className="slot--empty__hint">按姓名或球队检索</span>
              </button>
            );
          }
          const player = slot.player ?? slot.summary;
          return (
            <div className="slot" key={slot.id}>
              <div className="slot__head">
                <Avatar name={player?.name ?? "球员"} portrait={player?.portrait} size={44} />
                <div style={{ minWidth: 0 }}>
                  <div className="slot__name">{player?.name ?? "加载中"}</div>
                  <div className="slot__meta">
                    {(player?.positions ?? []).join("/")} · {player?.team ?? "—"}
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-btn slot__remove"
                  aria-label="移出对比"
                  onClick={() => {
                    if (!slot.id) return;
                    toggle(slot.id);
                  }}
                >
                  <X size={13} weight="bold" />
                </button>
              </div>
              <div className="slot__stats">
                <div className="slot__stat">
                  <span className="slot__stat-label">总评</span>
                  <span className="slot__stat-value">{player?.overall ?? "—"}</span>
                </div>
                <div className="slot__stat">
                  <span className="slot__stat-label">身高</span>
                  <span className="slot__stat-value">
                    {player?.height ? `${player.height}` : "—"}
                  </span>
                </div>
                <div className="slot__stat">
                  <span className="slot__stat-label">价格</span>
                  <span className="slot__stat-value" style={{ fontSize: 11 }}>
                    {player ? formatPrice(player.price) : "—"}
                  </span>
                </div>
              </div>
              <div className="slot__actions">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => navigate(`/player/${slot.id}`)}
                >
                  查看详情
                </button>
              </div>
            </div>
          );
        })}
      </div>
      ) : null}

      {detailLoading ? (
        <div className="skeleton-page">
          <div className="skeleton" style={{ height: 260 }} />
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      ) : !ids.length ? (
        <div className="state-block" style={{ marginTop: 20 }}>
          <span className="state-block__icon">
            <Scales size={22} />
          </span>
          <div className="state-block__title">还没有选择球员</div>
          <p className="state-block__text">
            从球员库列表点击「+」加入对比栏，或直接在上方空位中添加球员。至少选择 2 名球员生成对比报告。
          </p>
          <div className="state-block__actions">
            <Link className="btn btn--primary" to="/">
              去球员库挑选
            </Link>
            <button type="button" className="btn" onClick={() => setPickerOpen(true)}>
              直接添加
            </button>
          </div>
        </div>
      ) : !hasEnough ? (
        <div className="state-block" style={{ marginTop: 20 }}>
          <span className="state-block__icon">
            <Scales size={22} />
          </span>
          <div className="state-block__title">再选 1 名球员即可开始对比</div>
          <p className="state-block__text">当前只选择了 {ids.length} 名球员，对比至少需要 2 名。</p>
          <div className="state-block__actions">
            <button type="button" className="btn btn--primary" onClick={() => setPickerOpen(true)}>
              添加球员
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="compare-grid">
            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">能力雷达对比</h2>
                <span className="panel__hint">11 个维度归一化叠加</span>
              </div>
              <div className="panel__body">
                <div className="radar-wrap">
                  <RadarChart series={radarSeries} size={400} />
                </div>
                <div className="cmp-series" style={{ marginTop: 12 }}>
                  {details.map((detail, index) => (
                    <span className="cmp-series__item" key={detail.id}>
                      <span
                        className="cmp-series__swatch"
                        style={{ background: COMPARE_COLORS[index % COMPARE_COLORS.length] }}
                      />
                      {detail.name}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">基本信息</h2>
                <span className="panel__hint">价格按最低优先高亮</span>
              </div>
              <div className="panel__body panel__body--tight">
                <CompareMatrix headLabel="项目" groups={[{ rows: basicRows }]} />
              </div>
            </section>
          </div>

          <div className="compare-grid">
            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">能力维度</h2>
                <span className="panel__hint">特训后数值</span>
              </div>
              <div className="panel__body panel__body--tight">
                <CompareMatrix headLabel="维度" groups={[{ rows: radarRows }]} />
              </div>
            </section>

            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">关键倾向</h2>
                <span className="panel__hint">取值 0 - 99</span>
              </div>
              <div className="panel__body panel__body--tight">
                <CompareMatrix headLabel="倾向" groups={[{ rows: tendencyRows }]} />
              </div>
            </section>
          </div>

          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel__head">
              <h2 className="panel__title">详细属性对比</h2>
              <span className="panel__hint">按终结、投篮、组织、防守、篮板、身体与精神分组</span>
            </div>
            <div className="panel__body panel__body--tight">
              <div className="cmp-split">
                {[0, 1].map((column) => (
                  <CompareMatrix
                    key={column}
                    headLabel="属性"
                    groups={attributeGroups[column].map((group) => ({
                      label: group.group.label,
                      rows: group.rows,
                    }))}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel__head">
              <h2 className="panel__title">投篮热区对比</h2>
              <span className="panel__hint">红为热区，金为中性，蓝为冷区</span>
            </div>
            <div className="panel__body">
              <div className="mini-courts">
                {details.map((detail, index) => (
                  <div className="mini-court" key={detail.id}>
                    <HotZoneCourt zones={hotZones[index]} ariaLabel={`${detail.name} 投篮热区`} />
                    <span className="mini-court__label">{detail.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel__head">
              <h2 className="panel__title">徽章构成</h2>
              <span className="panel__hint">铜 / 银 / 金 / 紫</span>
            </div>
            <div className="panel__body" style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {details.map((detail) => (
                <div key={detail.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--text-2)" }}>{detail.name}</span>
                  <BadgeCounts counts={detail.badgeCounts} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <PlayerPicker
        open={pickerOpen}
        catalog={catalog ?? []}
        exclude={ids}
        onPick={(id) => {
          const result = toggle(id);
          if (!result.ok) pushToast(result.reason ?? "无法加入对比", "danger");
        }}
        onClose={() => setPickerOpen(false)}
      />

      {loading ? <div className="skeleton" style={{ height: 1 }} /> : null}
      {details.length ? (
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setIds([])}>
            重置对比栏
          </button>
        </div>
      ) : null}
    </div>
  );
}
