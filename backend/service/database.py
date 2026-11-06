import sqlite3
import json
import time
import os
from typing import List, Dict, Any, Optional
from backend.config import DATABASE_PATH


class Database:
    def __init__(self, db_path: str = DATABASE_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS players (
                player_id TEXT PRIMARY KEY,
                show_name TEXT,
                en_name TEXT,
                team_abbr TEXT,
                pos TEXT,
                player_sort TEXT,
                card_series TEXT,
                version INTEGER,
                card_type TEXT,
                grade INTEGER,
                overall INTEGER,
                price INTEGER,
                player_img TEXT,
                badge_counts TEXT,
                raw_json TEXT,
                updated_at REAL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS price_history (
                player_id TEXT,
                date TEXT,
                price INTEGER,
                created_at REAL,
                PRIMARY KEY (player_id, date)
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS player_details (
                player_id TEXT,
                grade INTEGER,
                data_json TEXT,
                updated_at REAL,
                PRIMARY KEY (player_id, grade)
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_meta (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at REAL
            );
            """)
            conn.commit()

    def upsert_players(self, player_list: List[Dict[str, Any]]):
        now = time.time()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for p in player_list:
                badge_json = json.dumps(p.get("badge_counts", {}), ensure_ascii=False)
                raw_str = json.dumps(p, ensure_ascii=False)
                cursor.execute("""
                INSERT INTO players (
                    player_id, show_name, en_name, team_abbr, pos, player_sort,
                    card_series, version, card_type, grade, overall, price, player_img, badge_counts, raw_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(player_id) DO UPDATE SET
                    show_name=excluded.show_name,
                    en_name=excluded.en_name,
                    team_abbr=excluded.team_abbr,
                    pos=excluded.pos,
                    player_sort=excluded.player_sort,
                    card_series=excluded.card_series,
                    version=excluded.version,
                    card_type=excluded.card_type,
                    grade=excluded.grade,
                    overall=excluded.overall,
                    price=excluded.price,
                    player_img=excluded.player_img,
                    badge_counts=excluded.badge_counts,
                    raw_json=excluded.raw_json,
                    updated_at=excluded.updated_at
                """, (
                    str(p.get("playerId") or p.get("id")),
                    p.get("showName", ""),
                    p.get("PlayerEnName", ""),
                    p.get("teamAbbr", ""),
                    p.get("Pos", ""),
                    p.get("PlayerSort", ""),
                    p.get("cardSeries", ""),
                    p.get("version", 0),
                    str(p.get("cardType", "")),
                    p.get("grade", 7),
                    p.get("overall", 0),
                    p.get("price", 0),
                    p.get("playerImg", ""),
                    badge_json,
                    raw_str,
                    now
                ))
            conn.commit()

    def upsert_price_history(self, player_id: str, history_list: List[Dict[str, Any]]):
        now = time.time()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for h in history_list:
                d = h.get("date")
                p = h.get("price")
                if d and p is not None:
                    cursor.execute("""
                    INSERT OR REPLACE INTO price_history (player_id, date, price, created_at)
                    VALUES (?, ?, ?, ?)
                    """, (str(player_id), d, int(p), now))
            conn.commit()

    def upsert_player_detail(self, player_id: str, grade: int, detail_data: Dict[str, Any]):
        now = time.time()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO player_details (player_id, grade, data_json, updated_at)
            VALUES (?, ?, ?, ?)
            """, (str(player_id), grade, json.dumps(detail_data, ensure_ascii=False), now))
            conn.commit()

    def get_player(self, player_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM players WHERE player_id = ?", (str(player_id),))
            row = cursor.fetchone()
            if not row:
                return None
            d = dict(row)
            d["badge_counts"] = json.loads(d["badge_counts"]) if d.get("badge_counts") else {}
            d["playerId"] = d["player_id"]
            d["showName"] = d["show_name"]
            d["PlayerEnName"] = d["en_name"]
            d["teamAbbr"] = d["team_abbr"]
            d["Pos"] = d["pos"]
            d["cardSeries"] = d["card_series"]
            d["playerImg"] = d["player_img"]
            d["PlayerSort"] = d.get("player_sort", "")
            return d

    def resolve_player_id(self, value: str) -> Optional[str]:
        """官方分享链接可能使用内部 id（raw_json 的 id），这里解析成 player_id。"""
        try:
            num = int(str(value))
        except (TypeError, ValueError):
            return None
        patterns = [
            f'%"id": {num},%',
            f'%"id": {num}}}%',
            f'%"id":{num},%',
            f'%"id":{num}}}%',
        ]
        with self._get_connection() as conn:
            for pattern in patterns:
                row = conn.execute(
                    "SELECT player_id FROM players WHERE raw_json LIKE ? LIMIT 1", (pattern,)
                ).fetchone()
                if row:
                    return row["player_id"]
        return None

    def get_player_detail(self, player_id: str, grade: int = 7) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM player_details WHERE player_id = ? AND grade = ?", (str(player_id), grade))
            row = cursor.fetchone()
            if not row:
                return None
            return json.loads(row["data_json"])

    def get_price_history(self, player_id: str, days: int = 30) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT date, price FROM price_history 
            WHERE player_id = ? 
            ORDER BY date DESC LIMIT ?
            """, (str(player_id), days))
            rows = cursor.fetchall()
            result = [{"date": r["date"], "price": r["price"]} for r in rows]
            result.reverse()
            return result

    def search_players(self, keyword: str = "", pos: str = "", team: str = "", sort_by: str = "price", desc: bool = True, limit: int = 1500) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM players WHERE 1=1"
            params = []

            if keyword:
                query += " AND (show_name LIKE ? OR en_name LIKE ? OR player_id LIKE ?)"
                params.extend([f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"])
            if pos:
                query += " AND pos LIKE ?"
                params.append(f"%{pos}%")
            if team:
                query += " AND team_abbr = ?"
                params.append(team)

            sort_column = "price" if sort_by == "price" else "overall"
            direction = "DESC" if desc else "ASC"
            query += f" ORDER BY {sort_column} {direction} LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["badge_counts"] = json.loads(item["badge_counts"]) if item.get("badge_counts") else {}
                item["playerId"] = item["player_id"]
                item["showName"] = item["show_name"]
                item["PlayerEnName"] = item["en_name"]
                item["teamAbbr"] = item["team_abbr"]
                item["Pos"] = item["pos"]
                item["cardSeries"] = item["card_series"]
                item["playerImg"] = item["player_img"]
                item["PlayerSort"] = item.get("player_sort", "")
                results.append(item)
            return results

    def get_sync_meta(self, key: str) -> Optional[str]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM sync_meta WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else None

    def set_sync_meta(self, key: str, value: str):
        now = time.time()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO sync_meta (key, value, updated_at) VALUES (?, ?, ?)
            """, (key, value, now))
            conn.commit()


db = Database()
