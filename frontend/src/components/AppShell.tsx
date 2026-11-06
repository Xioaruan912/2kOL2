import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Basketball } from "@phosphor-icons/react";
import { SearchField } from "./SearchField";
import { CompareTray } from "./CompareTray";
import { useCatalog, useDataMode } from "../hooks/useData";
import { useCompare, useFavorites, useToasts } from "../state/store";
import { pushToast } from "../state/store";

const NAV_ITEMS = [
  { to: "/", label: "球员数据库", end: true },
  { to: "/compare", label: "球员对比", end: false },
  { to: "/favorites", label: "收藏球员", end: false },
];

function ToastStack() {
  const toasts = useToasts();
  if (!toasts.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={
            toast.tone === "accent" ? "toast is-accent" : toast.tone === "danger" ? "toast is-danger" : "toast"
          }
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { catalog, loading } = useCatalog();
  const mode = useDataMode();
  const { ids: favoriteIds } = useFavorites();
  const { ids: compareIds, setIds: setCompareIds } = useCompare();
  const [navQuery, setNavQuery] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  const comparePlayers = compareIds
    .map((id) => catalog?.find((player) => player.id === id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  const showTray = comparePlayers.length > 0 && location.pathname !== "/compare";

  return (
    <div className={showTray ? "app-shell has-tray" : "app-shell"}>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" aria-label="COURTSIDE DB 首页">
            <span className="brand-mark" aria-hidden="true">
              <Basketball size={18} weight="fill" />
            </span>
            <span className="brand-text">
              <span className="brand-name">Courtside DB</span>
              <span className="brand-sub">2KOL2 球员数据库</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="主导航">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? "nav-link is-active" : "nav-link")}
              >
                {item.label}
                {item.to === "/favorites" && favoriteIds.length ? (
                  <span className="nav-count">{favoriteIds.length}</span>
                ) : null}
                {item.to === "/compare" && compareIds.length ? (
                  <span className="nav-count">{compareIds.length}</span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="nav-right">
            <div className="nav-search">
              <SearchField
                value={navQuery}
                variant="nav"
                placeholder="搜索球员并回车"
                onChange={setNavQuery}
                ariaLabel="顶部搜索球员"
                onEnter={(value) => {
                  if (!value.trim()) return;
                  navigate(`/?q=${encodeURIComponent(value.trim())}`);
                  setNavQuery("");
                }}
              />
            </div>
            <span
              className={mode === "live" ? "source-pill is-live" : "source-pill"}
              title={
                mode === "live"
                  ? "已连接本地 FastAPI 代理，数据来自官方接口"
                  : "未连接后端，使用本地快照数据"
              }
            >
              <span className="source-pill__dot" aria-hidden="true" />
              <span>{loading ? "数据加载中" : mode === "live" ? "实时代理" : "本地快照"}</span>
            </span>
          </div>
        </div>

        <div className="nav-mobile-links" aria-label="主导航（移动端）">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-link is-active" : "nav-link")}
            >
              {item.label}
              {item.to === "/favorites" && favoriteIds.length ? (
                <span className="nav-count">{favoriteIds.length}</span>
              ) : null}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div>
            <div className="site-footer__brand">COURTSIDE DB</div>
            <div>2KOL2 球员数据查询与对比终端</div>
          </div>
          <p className="site-footer__note">
            球员总评、价格、徽章等数据通过本地代理从官方小程序接口获取，仅供查询参考，实际以游戏内为准。
            缺少快照的球员详情会在页面明确标注「离线推演数据」，不代表官方数值。
          </p>
        </div>
      </footer>

      <CompareTray
        players={comparePlayers}
        onRemove={(id) => setCompareIds(compareIds.filter((item) => item !== id))}
        onClear={() => {
          setCompareIds([]);
          pushToast("已清空对比栏");
        }}
        onStart={() => navigate("/compare")}
      />

      <ToastStack />
    </div>
  );
}
