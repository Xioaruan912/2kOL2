import time
import json
import threading
from typing import Dict, Any, List, Optional

from backend.crypto.client import default_client
from backend.utils.risk_control import cache, single_flight, breaker
from backend.service.database import db
from backend.config import CACHE_TTL_PLAYERS, CACHE_TTL_PRICE, CACHE_TTL_DETAIL

TACTICS_MAP = {
    1: "单打", 2: "单打(侧翼)", 3: "单打(弧顶)", 4: "挡拆持球人",
    5: "挡拆得分", 6: "挡拆(侧翼)", 7: "挡拆中负责切入的球员",
    8: "低位背身单打", 9: "高位背身单打", 10: "背身外线单打",
    11: "手递手接球人", 12: "手递手传球人", 13: "空切",
    14: "中距离", 15: "三分", 16: "定点投篮"
}

class ProxyService:
    def search_players_realtime(
        self,
        keyword: str = "",
        pos: str = "",
        sort_by: str = "price",
        desc: bool = True,
        limit: int = 1500
    ) -> List[Dict[str, Any]]:
        cache_key = f"proxy:search:{keyword}:{pos}:{sort_by}:{desc}:{limit}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        def _fetch_from_upstream():
            if not breaker.can_execute():
                return db.search_players(keyword=keyword, pos=pos, sort_by=sort_by, desc=desc, limit=limit)

            try:
                sort_field = "price" if sort_by == "price" else "overall"
                payload = {
                    "page": 1,
                    "page_size": min(limit, 100)
                }
                if keyword:
                    payload["keyword"] = keyword
                if pos:
                    payload["position"] = [pos.upper()]
                if sort_by:
                    payload["sort"] = {
                        "field": sort_field,
                        "order": "desc" if desc else "asc"
                    }

                res = default_client.request("/ol2-player-search", method="POST", data=payload)
                data = res.get("data", {})
                player_list = data.get("list", [])
                breaker.record_success()

                if player_list:
                    threading.Thread(target=db.upsert_players, args=(player_list,), daemon=True).start()

                cache.set(cache_key, player_list, 60)
                return player_list
            except Exception as e:
                breaker.record_failure()
                return db.search_players(keyword=keyword, pos=pos, sort_by=sort_by, desc=desc, limit=limit)

        return single_flight.do(cache_key, _fetch_from_upstream)

    def get_all_players_catalog(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        cache_key = "proxy:players:all_catalog"
        if not force_refresh:
            cached = cache.get(cache_key)
            if cached:
                return cached

        players = db.search_players(limit=2000)
        if players:
            cache.set(cache_key, players, CACHE_TTL_PLAYERS)
            return players

        def _fetch_all():
            try:
                from backend.service.sync_service import sync_service
                sync_service.sync_all_players()
                all_p = db.search_players(limit=2000)
                cache.set(cache_key, all_p, CACHE_TTL_PLAYERS)
                return all_p
            except Exception as e:
                breaker.record_failure()
                return []

        return single_flight.do(cache_key, _fetch_all)

    def get_price_history_realtime(self, player_id: str, days: int = 30) -> Dict[str, Any]:
        cache_key = f"proxy:price:{player_id}:{days}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        def _fetch():
            if not breaker.can_execute():
                history = db.get_price_history(player_id, days)
                player = db.get_player(player_id) or {}
                return {
                    "playerId": player_id,
                    "showName": player.get("showName", ""),
                    "current_price": player.get("price", 0),
                    "price_history": history,
                    "_fallback": True
                }

            try:
                res = default_client.request(f"/players/{player_id}/price-history", params={"days": days})
                data = res.get("data", {})
                breaker.record_success()

                history = data.get("price_history", [])
                if history:
                    threading.Thread(target=db.upsert_price_history, args=(player_id, history), daemon=True).start()

                cache.set(cache_key, data, CACHE_TTL_PRICE)
                return data
            except Exception as e:
                breaker.record_failure()
                history = db.get_price_history(player_id, days)
                player = db.get_player(player_id) or {}
                if history:
                    return {
                        "playerId": player_id,
                        "showName": player.get("showName", ""),
                        "current_price": player.get("price", 0),
                        "price_history": history,
                        "_fallback": True
                    }
                raise e

        return single_flight.do(cache_key, _fetch)

    def get_player_detail_realtime(self, player_id: str, grade: int = 7) -> Dict[str, Any]:
        cache_key = f"proxy:detail:{player_id}:{grade}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        def _fetch():
            if not breaker.can_execute():
                local_detail = db.get_player_detail(player_id, grade)
                if local_detail:
                    return local_detail
                raise RuntimeError("Circuit open and no local detail available")

            try:
                res = default_client.request(f"/players/{player_id}", params={"grade": grade})
                data = res.get("data", {})
                breaker.record_success()

                # Automatically unpack any JSON-encoded strings into real objects
                for k in ["Radar", "TrainedRadar", "hotZone", "ActiveBadges", "Attribute", "TrainedAttribute", "Tendency", "hiddenAttributes"]:
                    val = data.get(k)
                    if isinstance(val, str):
                        try:
                            data[k] = json.loads(val)
                        except Exception:
                            pass

                # Enrich tactics from hiddenAttributes
                hidden = data.get("hiddenAttributes") or {}
                tactics = []
                for i in range(1, 5):
                    t_val = hidden.get(f"playType{i}")
                    if t_val and t_val in TACTICS_MAP:
                        tactics.append({"index": i, "name": TACTICS_MAP[t_val]})
                    elif t_val:
                        tactics.append({"index": i, "name": f"战术{t_val}"})
                data["tacticsList"] = tactics
                data["isPrimaryBallHandler"] = "是" if hidden.get("is_primary_ball_handler") == 1 else "否"

                threading.Thread(target=db.upsert_player_detail, args=(player_id, grade, data), daemon=True).start()
                cache.set(cache_key, data, CACHE_TTL_DETAIL)
                return data
            except Exception as e:
                breaker.record_failure()
                local_detail = db.get_player_detail(player_id, grade)
                if local_detail:
                    return local_detail
                raise e

        return single_flight.do(cache_key, _fetch)


proxy_service = ProxyService()
