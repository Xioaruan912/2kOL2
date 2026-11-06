import hashlib
import json
import mimetypes
import os
import sys
import urllib.request
from typing import Optional
from urllib.parse import urlparse
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Windows 注册表可能把 .js 映射为 application/octet-stream，
# 会导致浏览器拒绝执行 type="module" 脚本，这里强制校正前端资源 MIME。
for suffix, mime in {
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ico": "image/x-icon",
}.items():
    mimetypes.add_type(mime, suffix)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.config import PORT, HOST, USER_AGENT
from backend.service.proxy_service import proxy_service
from backend.service.sync_service import sync_service
from backend.service.database import db
from backend.utils.risk_control import breaker, cache

app = FastAPI(
    title="2KOL2 Market Intelligence API",
    description="Real-time proxy forwarding & offline database engine for 2K Online 2 player market stats.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    sync_service.start_background_scheduler()
    print("[Server] 2KOL2 Intelligence API started successfully on PC 2K mode.")


@app.get("/api/players")
def get_players(
    keyword: str = Query("", description="Search player name in Chinese or English"),
    pos: str = Query("", description="Position filter (PG, SG, SF, PF, C)"),
    team: str = Query("", description="Team filter"),
    sort_by: str = Query("price", description="Sort by price or overall"),
    desc: bool = Query(True, description="Descending order"),
    mode: str = Query("realtime", description="'realtime' (Mode 1 Proxy) or 'db' (Mode 2 Cached DB)"),
    limit: int = Query(1500, description="Max return items")
):
    try:
        if mode == "realtime":
            if keyword:
                items = proxy_service.search_players_realtime(
                    keyword=keyword,
                    pos=pos,
                    sort_by=sort_by,
                    desc=desc,
                    limit=limit
                )
            else:
                all_players = proxy_service.get_all_players_catalog()
                filtered = all_players
                if pos:
                    filtered = [p for p in filtered if pos.upper() in (p.get("Pos") or p.get("pos") or "").upper()]
                if team:
                    filtered = [p for p in filtered if team in (p.get("teamAbbr") or p.get("team_abbr") or "")]

                sort_key = "price" if sort_by == "price" else "overall"
                filtered = sorted(filtered, key=lambda x: x.get(sort_key, 0) or 0, reverse=desc)
                items = filtered[:limit]

            return {
                "code": 0,
                "mode": "realtime",
                "total": len(items),
                "list": items
            }
        else:
            items = db.search_players(keyword=keyword, pos=pos, team=team, sort_by=sort_by, desc=desc, limit=limit)
            return {
                "code": 0,
                "mode": "db",
                "total": len(items),
                "list": items
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


IMAGE_CACHE_DIR = os.path.join(BASE_DIR, "cache", "images")
ALLOWED_IMAGE_HOSTS = {"game.gtimg.cn"}


@app.get("/api/image")
def proxy_image(url: str = Query(..., description="官方 CDN 图片地址")):
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in ("http", "https") or host not in ALLOWED_IMAGE_HOSTS:
        raise HTTPException(status_code=400, detail="unsupported image source")

    ext = os.path.splitext(parsed.path)[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        ext = ".png"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()
    path = os.path.join(IMAGE_CACHE_DIR, digest + ext)

    if not os.path.exists(path):
        os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": USER_AGENT, "Referer": "https://game.qq.com/"},
            )
            with urllib.request.urlopen(request, timeout=10) as response:
                data = response.read(5 * 1024 * 1024 + 1)
            if len(data) > 5 * 1024 * 1024:
                raise HTTPException(status_code=502, detail="image too large")
            tmp_path = path + ".tmp"
            with open(tmp_path, "wb") as handle:
                handle.write(data)
            os.replace(tmp_path, path)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"image fetch failed: {exc}")

    media_type = mimetypes.guess_type(path)[0] or "image/png"
    return FileResponse(
        path, media_type=media_type, headers={"Cache-Control": "public, max-age=604800, immutable"}
    )


@app.get("/api/players/advanced")
def get_players_advanced(
    filters: str = Query("{}", description="JSON 字符串，包含徽章、属性、战术、区间等条件"),
    keyword: str = Query("", description="姓名 / 球队关键词"),
    team: str = Query("", description="球队筛选"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    sort_field: str = Query("overall", description="overall 或 price"),
    sort_order: str = Query("desc", description="asc 或 desc"),
):
    try:
        parsed = json.loads(filters or "{}")
        if not isinstance(parsed, dict):
            parsed = {}
        data = proxy_service.search_players_advanced(
            parsed,
            keyword=keyword,
            team=team,
            page=page,
            page_size=page_size,
            sort_field=sort_field,
            sort_order=sort_order,
        )
        return {"code": 0, **data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"细节筛选需要官方实时接口：{e}")


@app.get("/api/player/{player_id}")
def get_player_detail(
    player_id: str,
    grade: int = Query(7, ge=1, le=7, description="Breakthrough grade level (1~7)")
):
    try:
        data = proxy_service.get_player_detail_realtime(player_id, grade=grade)
        return {"code": 0, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/player/{player_id}/price-history")
def get_price_history(
    player_id: str,
    days: int = Query(30, description="History span (7, 30, 60, 90)")
):
    try:
        data = proxy_service.get_price_history_realtime(player_id, days=days)
        return {"code": 0, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sync/status")
def get_sync_status():
    return {"code": 0, "data": sync_service.get_status()}


@app.post("/api/sync/details")
def warm_player_details(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    grade: int = Query(7, ge=1, le=7),
):
    client_host = (request.client.host if request.client else "") or ""
    if client_host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=403, detail="only localhost can trigger detail warm-up")
    return {"code": 0, "data": sync_service.warm_details(limit=limit, grade=grade)}


@app.post("/api/sync/trigger")
def trigger_sync(top_n: int = Query(50, description="Number of top player price histories to sync")):
    res = sync_service.run_sync(top_n_prices=top_n)
    return {"code": 0, "data": res}


@app.get("/api/system/health")
def get_system_health():
    return {
        "code": 0,
        "circuit_breaker": {
            "state": breaker.state,
            "failure_count": breaker.failure_count,
            "threshold": breaker.threshold
        },
        "engine": "2kol-intelligence-proxy"
    }


# 前端：优先托管 Vite 生产构建产物（frontend/dist），回退到源码目录
DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")
FRONTEND_DIR = DIST_DIR if os.path.isdir(DIST_DIR) else os.path.join(BASE_DIR, "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host=HOST, port=PORT, reload=False)
