import time
import random
import threading
from typing import Dict, Any, List

from backend.crypto.client import default_client
from backend.service.database import db
from backend.config import SYNC_INTERVAL_HOURS, SYNC_JITTER_MIN, SYNC_JITTER_MAX


class SyncService:
    """
    Mode 2: Automated background data sync and caching.
    Features:
      - Full catalog collection (pages 1~N from /ol2-player-search, total ~598 players)
      - Anti-ban jitter & pacing between consecutive requests
      - Price history batch collector for high-value targets
      - Periodic player catalog updates & status tracking
    """

    def __init__(self):
        self.is_syncing = False
        self.is_warming_details = False
        self.last_sync_time = 0.0
        self.last_sync_status = "idle"
        self.last_sync_count = 0
        self._thread: threading.Thread = None

    def start_background_scheduler(self):
        def _loop():
            # Initial auto-check on startup: if DB has fewer than 500 players, do initial sync
            time.sleep(2)
            current_count = len(db.search_players(limit=1000))
            if current_count < 500:
                print(f"[SyncService] Local DB has only {current_count} players. Starting initial full sync...")
                try:
                    self.sync_all_players()
                except Exception as e:
                    print(f"[SyncService] Initial full sync error: {e}")

            while True:
                time.sleep(SYNC_INTERVAL_HOURS * 3600)
                try:
                    self.run_sync()
                except Exception as e:
                    print(f"[SyncService] Scheduled sync error: {e}")

        self._thread = threading.Thread(target=_loop, daemon=True)
        self._thread.start()

    def sync_all_players(self) -> int:
        """
        Paginates through /ol2-player-search to collect all ~598 players into SQLite.
        """
        print("[SyncService] Fetching all players from /ol2-player-search...")
        all_players = []
        page = 1
        page_size = 100

        while True:
            res = default_client.request("/ol2-player-search", method="POST", data={"page": page, "page_size": page_size})
            data = res.get("data", {})
            lst = data.get("list", [])
            total = data.get("total", 0)
            if not lst:
                break
            all_players.extend(lst)
            print(f"[SyncService] Page {page}: collected {len(lst)} players (accumulated {len(all_players)}/{total})")
            if len(all_players) >= total:
                break
            page += 1
            time.sleep(0.3)  # Gentle pacing

        if all_players:
            db.upsert_players(all_players)
            self.last_sync_count = len(all_players)
            self.last_sync_time = time.time()
            db.set_sync_meta("last_sync_time", str(int(self.last_sync_time)))
            db.set_sync_meta("last_sync_count", str(self.last_sync_count))
            print(f"[SyncService] Successfully upserted all {len(all_players)} players to local SQLite.")
            return len(all_players)
        return 0

    def run_sync(self, top_n_prices: int = 50) -> Dict[str, Any]:
        """
        Syncs full player catalog and collects price histories for top players with jitter.
        """
        if self.is_syncing:
            return {"status": "already_syncing", "message": "A sync job is currently running"}

        self.is_syncing = True
        self.last_sync_status = "running"
        start_time = time.time()

        def _worker():
            try:
                # 1. Full player catalog sync
                total_synced = self.sync_all_players()
                
                # 2. Sync price histories for top high-value players with randomized jitter
                print(f"[SyncService] Syncing price histories for top {top_n_prices} players...")
                top_players = db.search_players(sort_by="price", desc=True, limit=top_n_prices)
                
                success_histories = 0
                for p in top_players:
                    pid = str(p.get("playerId") or p.get("player_id"))
                    try:
                        h_res = default_client.request(f"/players/{pid}/price-history", params={"days": 30})
                        history = h_res.get("data", {}).get("price_history", [])
                        if history:
                            db.upsert_price_history(pid, history)
                            success_histories += 1
                    except Exception as he:
                        print(f"[SyncService] Failed price history for {pid}: {he}")

                    # Anti-scraping random delay (jitter)
                    delay = random.uniform(SYNC_JITTER_MIN, SYNC_JITTER_MAX)
                    time.sleep(delay)

                elapsed = round(time.time() - start_time, 2)
                self.last_sync_status = "success"
                print(f"[SyncService] Full sync completed in {elapsed}s. {total_synced} players, {success_histories} price histories.")
            except Exception as e:
                self.last_sync_status = f"failed: {str(e)}"
                print(f"[SyncService] Sync failed: {e}")
            finally:
                self.is_syncing = False

        threading.Thread(target=_worker, daemon=True).start()
        return {
            "status": "started",
            "message": "Background sync job started"
        }

    def warm_details(self, limit: int = 20, grade: int = 7) -> Dict[str, Any]:
        """低频预热球员详情：小批量 + 随机抖动，连续失败立即停止，避免触发风控。"""
        if self.is_warming_details:
            return {"status": "running", "message": "详情预热任务正在执行"}

        from backend.service.proxy_service import proxy_service  # 延迟导入避免循环依赖

        self.is_warming_details = True
        processed = success = failed = 0
        consecutive_failures = 0
        started = time.time()
        try:
            targets = db.list_detail_targets(limit=limit, grade=grade)
            for item in targets:
                pid = str(item["player_id"])
                try:
                    proxy_service.get_player_detail_realtime(pid, grade=grade, force=True)
                    success += 1
                    consecutive_failures = 0
                except Exception as exc:
                    failed += 1
                    consecutive_failures += 1
                    print(f"[WarmDetails] {pid} failed: {exc}")
                    if consecutive_failures >= 3:
                        print("[WarmDetails] 连续失败 3 次，提前停止")
                        break
                processed += 1
                if processed < len(targets):
                    time.sleep(random.uniform(2.0, 3.5))
        finally:
            self.is_warming_details = False

        stats = db.detail_stats(grade=grade)
        return {
            "status": "done",
            "processed": processed,
            "success": success,
            "failed": failed,
            "seconds": round(time.time() - started, 1),
            "coverage": stats,
        }

    def get_status(self) -> Dict[str, Any]:
        current_db_total = len(db.search_players(limit=1000))
        return {
            "is_syncing": self.is_syncing,
            "is_warming_details": self.is_warming_details,
            "last_sync_status": self.last_sync_status,
            "last_sync_time": self.last_sync_time,
            "last_sync_count": self.last_sync_count,
            "db_total_players": current_db_total,
            "db_last_sync": db.get_sync_meta("last_sync_time"),
            "details": db.detail_stats(),
        }


sync_service = SyncService()
