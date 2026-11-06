import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Basketball,
  Copy,
  Plus,
  ShareNetwork,
  Star,
  WarningCircle,
} from "@phosphor-icons/react";
import { usePlayerDetail } from "../hooks/useData";
import { useCompare, useFavorites, pushToast } from "../state/store";
import { Avatar } from "../components/Avatar";
import { BadgeCounts } from "../components/BadgeCounts";
import { OverviewTab } from "./detail/OverviewTab";
import { AttributesTab } from "./detail/AttributesTab";
import { BadgesTab } from "./detail/BadgesTab";
import { ActionsTab } from "./detail/ActionsTab";
import { TendenciesTab } from "./detail/TendenciesTab";
import { TacticsTab } from "./detail/TacticsTab";
import { RARE_SERIES } from "../lib/constants";
import { formatHeight, formatPositions, formatPrice } from "../lib/format";

const TABS = [
  { key: "overview", label: "综合" },
  { key: "attributes", label: "属性" },
  { key: "badges", label: "徽章" },
  { key: "actions", label: "动作" },
  { key: "tendencies", label: "倾向" },
  { key: "tactics", label: "战术类型" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

async function copyShareLink(): Promise<boolean> {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = url;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { detail, loading, error, reload } = usePlayerDetail(id);
  const { ids: favoriteIds, toggle: toggleFavorite } = useFavorites();
  const { ids: compareIds, toggle: toggleCompare } = useCompare();
  const [tab, setTab] = useState<TabKey>(() => {
    const value = params.get("tab");
    return TABS.some((item) => item.key === value) ? (value as TabKey) : "overview";
  });

  useEffect(() => {
    const value = params.get("tab");
    if (value && TABS.some((item) => item.key === value) && value !== tab) {
      setTab(value as TabKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const changeTab = (next: TabKey) => {
    setTab(next);
    const updated = new URLSearchParams(params);
    if (next === "overview") updated.delete("tab");
    else updated.set("tab", next);
    setParams(updated, { replace: true });
  };

  const isFavorite = Boolean(id && favoriteIds.includes(id));
  const isCompared = Boolean(id && compareIds.includes(id));

  if (loading) {
    return (
      <div className="container">
        <div className="skeleton-page">
          <div className="skeleton" style={{ height: 232 }} />
          <div className="skeleton" style={{ height: 48 }} />
          <div className="skeleton" style={{ height: 320 }} />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="container page">
        <div className="state-block" style={{ marginTop: 48 }}>
          <span className="state-block__icon">
            <WarningCircle size={22} />
          </span>
          <div className="state-block__title">无法加载该球员</div>
          <p className="state-block__text">{error ?? "球员不存在或数据尚未同步。"}</p>
          <div className="state-block__actions">
            <button type="button" className="btn btn--primary" onClick={reload}>
              重新加载
            </button>
            <Link className="btn" to="/">
              返回球员库
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const overallDelta = detail.overall - detail.baseOverall;

  return (
    <div>
      <section className="detail-hero">
        <div className="container detail-hero__inner">
          <div className="hero-portrait">
            <Avatar name={detail.name} portrait={detail.portrait} size={152} />
          </div>

          <div className="hero-main">
            <h1 className="hero-name">
              {detail.name}
              <span className="hero-name__en">{detail.nameEn}</span>
            </h1>
            <div className="hero-tags">
              <span className="hero-tag">{formatPositions(detail.positions)}</span>
              <span className="hero-tag">{detail.archetype || "未分类"}</span>
              {detail.series ? (
                <span className={RARE_SERIES.has(detail.series) ? "hero-tag is-gold" : "hero-tag"}>
                  {detail.series}
                </span>
              ) : null}
              {detail.synthetic ? <span className="hero-tag is-accent">离线推演数据</span> : null}
            </div>
            <div className="hero-meta">
              <span className="hero-meta__item">
                身高<b>{formatHeight(detail.height)}</b>
              </span>
              <span className="hero-meta__item">
                臂展<b>{formatHeight(detail.wingspan)}</b>
              </span>
              <span className="hero-meta__item">
                球队<b>{detail.team || "—"}</b>
              </span>
              <span className="hero-meta__item">
                卡牌<b>{detail.version || "—"}</b>
              </span>
              <span className="hero-meta__item">
                价格<b>{formatPrice(detail.price)}</b>
              </span>
            </div>
            <div className="hero-badges">
              {(["bronze", "silver", "gold", "purple"] as const).map((level) => {
                const colors = { bronze: "#9a6b45", silver: "#8e949c", gold: "#b08a2b", purple: "#7852ae" };
                const labels = { bronze: "铜", silver: "银", gold: "金", purple: "紫" };
                return (
                  <span className="hero-badges__item" key={level}>
                    <span className="hero-badges__hex" style={{ background: colors[level] }}>
                      {labels[level]}
                    </span>
                    {detail.badgeCounts[level]}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="btn btn--on-dark"
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate("/");
              }}
            >
              <ArrowLeft size={14} weight="bold" />
              返回
            </button>
            <button
              type="button"
              className={isFavorite ? "btn btn--primary" : "btn btn--on-dark"}
              onClick={() => {
                if (!id) return;
                toggleFavorite(id);
                pushToast(isFavorite ? "已取消收藏" : "已收藏该球员", isFavorite ? "neutral" : "accent");
              }}
            >
              <Star size={14} weight={isFavorite ? "fill" : "regular"} />
              {isFavorite ? "已收藏" : "收藏"}
            </button>
            <button
              type="button"
              className={isCompared ? "btn btn--primary" : "btn btn--on-dark"}
              onClick={() => {
                if (!id) return;
                const result = toggleCompare(id);
                if (!result.ok) pushToast(result.reason ?? "无法加入对比", "danger");
                else pushToast(isCompared ? "已移出对比" : "已加入对比");
              }}
            >
              <Plus size={14} weight="bold" />
              {isCompared ? "对比中" : "对比"}
            </button>
            <button
              type="button"
              className="btn btn--on-dark"
              onClick={async () => {
                const ok = await copyShareLink();
                pushToast(ok ? "球员链接已复制" : "复制失败，请手动复制地址栏链接", ok ? "accent" : "danger");
              }}
            >
              <ShareNetwork size={14} weight="bold" />
              分享
            </button>
          </div>

          <div className="hero-score">
            <div className="hero-score__block">
              <span className="hero-score__label">综合评分</span>
              <span className="hero-score__value">{detail.overall}</span>
              <span className="hero-score__delta">特训前 {detail.baseOverall} · 特训 +{Math.max(0, overallDelta)}</span>
            </div>
            <div className="hero-levels">
              <div className="hero-levels__row">
                <span>等级</span>
                <b>20</b>
              </div>
              <div className="hero-levels__row">
                <span>突破</span>
                <b>{detail.grade || 7}</b>
              </div>
              <div className="hero-levels__row">
                <span>特训</span>
                <b>5 满训</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="detail-tabs">
        <div className="container">
          <div className="detail-tabs__inner" role="tablist" aria-label="球员详情分类">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                className={tab === item.key ? "tab is-active" : "tab"}
                onClick={() => changeTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container detail-body">
        {detail.synthetic ? (
          <div
            className="panel"
            style={{ marginBottom: 16, borderColor: "rgba(225,83,43,0.35)", background: "var(--accent-soft)" }}
          >
            <div className="panel__body" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <WarningCircle size={16} weight="bold" color="var(--accent-ink)" style={{ marginTop: 2 }} />
              <p style={{ fontSize: 12, color: "var(--accent-ink)", lineHeight: 1.6 }}>
                该球员暂未收录详情快照。以下属性、徽章、动作与倾向均由本地按位置与总评推演生成，仅用于演示界面，
                不代表官方真实数值。启动后端服务后将自动改为实时官方数据。
              </p>
            </div>
          </div>
        ) : null}

        {tab === "overview" ? <OverviewTab detail={detail} /> : null}
        {tab === "attributes" ? <AttributesTab detail={detail} /> : null}
        {tab === "badges" ? <BadgesTab detail={detail} /> : null}
        {tab === "actions" ? (
          <div className="tab-narrow">
            <ActionsTab detail={detail} />
          </div>
        ) : null}
        {tab === "tendencies" ? (
          <div className="tab-narrow">
            <TendenciesTab detail={detail} />
          </div>
        ) : null}
        {tab === "tactics" ? (
          <div className="tab-narrow">
            <TacticsTab detail={detail} />
          </div>
        ) : null}

        <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn" to="/">
            <Basketball size={14} />
            返回球员库
          </Link>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const ok = await copyShareLink();
              pushToast(ok ? "球员链接已复制" : "复制失败，请手动复制地址栏链接", ok ? "accent" : "danger");
            }}
          >
            <Copy size={14} />
            复制当前链接
          </button>
          <BadgeCounts counts={detail.badgeCounts} />
        </div>
      </div>
    </div>
  );
}
