"""导出前端离线数据集（真实 2KOL2 数据快照）。

数据来源优先级：
1. 本地正在运行的 FastAPI 服务（http://127.0.0.1:8899），走官方 X25519 加密通道；
2. 若服务不可达，则仅导出 SQLite 中的球员目录，详情留空由前端降级生成。

产物：
  frontend/src/data/generated/catalog.json   全量球员目录（1469 名）
  frontend/src/data/generated/details.json   精选球员完整详情（默认 18 名）
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "backend", "2kol.db")
OUT_DIR = os.path.join(BASE_DIR, "frontend", "src", "data", "generated")
API = os.environ.get("EXPORT_API", "http://127.0.0.1:8899")

# 精选演示球员：覆盖五个位置、多个年代与卡系
FEATURED = [
    "4567",  # 姚明
    "4820",  # 库里
    "4101",  # 科比
    "4243",  # 乔丹
    "4750",  # 邓肯
    "4609",  # 杜兰特
    "4626",  # 奥尼尔
    "1747",  # 文班亚马
    "4464",  # 麦迪
    "4841",  # 伦纳德
    "4865",  # 欧文
    "1239",  # 约季奇
    "4576",  # 诺维斯基
    "1504",  # SGA
    "4914",  # 罗斯
    "4182",  # 韦德
    "4360",  # 拉里.伯德
    "4596",  # 加内特
]

LEVEL_MAP = {"铜": "bronze", "银": "silver", "金": "gold", "紫": "purple"}


def parse_cm(value) -> int | None:
    if not value:
        return None
    m = re.search(r"(\d+)", str(value))
    return int(m.group(1)) if m else None


def as_list(value):
    if value is None:
        return []
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return []
    return value


def as_dict(value):
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def fetch_detail(player_id: str, grade: int = 7, retries: int = 3):
    url = f"{API}/api/player/{player_id}?grade={grade}"
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            data = payload.get("data")
            if data:
                return data
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            print(f"  ! detail {player_id} attempt {attempt + 1} failed: {exc}")
            time.sleep(2)
    return None


def normalize_catalog_row(row: sqlite3.Row) -> dict:
    raw = as_dict(row["raw_json"])
    pos = [p for p in str(row["pos"] or "").split("|") if p]
    counts = as_dict(row["badge_counts"])
    price = int(row["price"] or 0)
    return {
        "id": str(row["player_id"]),
        "name": row["show_name"] or "",
        "nameEn": row["en_name"] or "",
        "team": row["team_abbr"] or "",
        "positions": pos,
        "archetype": row["player_sort"] or "",
        "series": row["card_series"] or "",
        "version": int(row["version"] or 0),
        "grade": int(row["grade"] or 7),
        "overall": int(row["overall"] or 0),
        "price": price,
        "portrait": row["player_img"] or "",
        "height": parse_cm(raw.get("Height")),
        "wingspan": parse_cm(raw.get("Wingspan")),
        "badgeCounts": {
            "bronze": int(counts.get("铜", 0) or 0),
            "silver": int(counts.get("银", 0) or 0),
            "gold": int(counts.get("金", 0) or 0),
            "purple": int(counts.get("紫", 0) or 0),
        },
    }


def normalize_detail(data: dict) -> dict:
    attributes = []
    base_attrs = {a.get("showName"): a.get("value") for a in as_list(data.get("Attribute"))}
    for item in as_list(data.get("TrainedAttribute")):
        name = item.get("showName")
        if not name:
            continue
        attributes.append(
            {
                "name": name,
                "value": int(item.get("value") or 0),
                "base": int(base_attrs.get(name) or item.get("value") or 0),
            }
        )

    radar = []
    for item in as_list(data.get("TrainedRadar")):
        radar.append(
            {
                "name": item.get("showName", ""),
                "score": int(item.get("score") or 0),
                "max": int(item.get("max") or 0),
                "rank": item.get("rank") or "",
            }
        )

    hidden = as_dict(data.get("hiddenAttributes"))
    other = hidden.get("otherAttributes") or {}
    raw_tendencies = other.get("tendencies_data") or []
    tendencies = []
    if raw_tendencies:
        first = raw_tendencies[0]
        for name, value in first.items():
            try:
                num = int(float(value))
            except (TypeError, ValueError):
                continue
            tendencies.append({"name": name, "value": num})
    else:
        for item in as_list(data.get("Tendency")):
            tendencies.append(
                {"name": item.get("showName", ""), "value": int(float(item.get("value") or 0))}
            )

    badges = []
    for item in as_list(data.get("ActiveBadges")) or as_list(data.get("ol2Badges")):
        level_cn = item.get("badgeLevel") or ""
        badges.append(
            {
                "id": str(item.get("badgeId") or ""),
                "name": item.get("badgeName") or "",
                "level": LEVEL_MAP.get(level_cn, "bronze"),
                "levelLabel": level_cn,
                "levelId": int(item.get("badgeLevelId") or 0),
                "isMax": bool(int(item.get("isMax") or 0)),
                "desc": item.get("qualityDesc") or "",
                "img": item.get("badgeImg") or "",
            }
        )

    hot_zones = []
    for item in as_list(data.get("hotZone")):
        hot_zones.append(
            {
                "district": item.get("district") or "",
                "heat": int(item.get("heat") or 0),
                "level": int(item.get("level") or 0),
            }
        )

    tactics = as_list(data.get("tacticsList"))
    shot_base = as_dict(data.get("shotBase"))

    num = lambda v: int(v) if str(v).isdigit() else 0
    return {
        "id": str(data.get("playerId")),
        "name": data.get("showName") or "",
        "nameEn": data.get("PlayerEnName") or "",
        "team": data.get("teamAbbr") or "",
        "positions": [p for p in str(data.get("Pos") or "").split("|") if p],
        "archetype": data.get("PlayerSort") or "",
        "series": data.get("cardSeries") or "",
        "version": num(data.get("version")),
        "grade": num(data.get("grade")),
        "overall": num(data.get("TrainedOverall")) or num(data.get("OverAll")),
        "baseOverall": num(data.get("OverAll")),
        "height": parse_cm(data.get("Height")),
        "wingspan": parse_cm(data.get("Wingspan")),
        "portrait": data.get("playerImg") or "",
        "dribbleStyle": data.get("dribble_style") or "",
        "radar": radar,
        "attributes": attributes,
        "tendencies": tendencies,
        "badges": badges,
        "hotZones": hot_zones,
        "tactics": {
            "primary": data.get("isPrimaryBallHandler") or "否",
            "types": tactics,
        },
        "actions": {
            "shotTiming": {
                "meter": num(shot_base.get("meterSpeed")),
                "release": num(shot_base.get("releaseSpeed")),
                "total": num(shot_base.get("overallSpeed")),
            },
            "ol2": as_dict(data.get("animations")),
            "k26": as_dict(data.get("animations2k26")),
        },
    }


def main() -> int:
    if not os.path.exists(DB_PATH):
        print(f"database not found: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM players").fetchall()
    catalog = [normalize_catalog_row(r) for r in rows]
    catalog.sort(key=lambda p: (-p["overall"], -p["price"]))
    by_id = {p["id"]: p for p in catalog}

    details = {}
    for pid in FEATURED:
        print(f"fetching {pid} ...")
        raw = fetch_detail(pid)
        if not raw:
            print(f"  x skip {pid} (no detail)")
            continue
        detail = normalize_detail(raw)
        summary = by_id.get(pid)
        if summary:
            for key in ("price", "portrait", "height", "wingspan", "badgeCounts"):
                detail.setdefault(key, summary.get(key))
            detail["price"] = summary["price"]
            detail["portrait"] = summary["portrait"] or detail.get("portrait", "")
        details[pid] = detail
        time.sleep(0.2)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "catalog.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DIR, "details.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(details, f, ensure_ascii=False, separators=(",", ":"))

    print(f"catalog: {len(catalog)} players -> catalog.json")
    print(f"details: {len(details)} players -> details.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
