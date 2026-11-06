import time
import threading
from typing import Dict, Any, Optional, Callable


class MemoryCache:
    """Thread-safe In-Memory cache with Time-To-Live (TTL)."""
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            if time.time() > entry["expire_at"]:
                del self._store[key]
                return None
            return entry["value"]

    def set(self, key: str, value: Any, ttl_seconds: int):
        with self._lock:
            self._store[key] = {
                "value": value,
                "expire_at": time.time() + ttl_seconds
            }

    def delete(self, key: str):
        with self._lock:
            self._store.pop(key, None)

    def clear(self):
        with self._lock:
            self._store.clear()


class SingleFlight:
    """
    Prevents cache breakdown (Thundering Herd Problem).
    If 50 users request LeBron James simultaneously, only 1 request goes upstream.
    The other 49 wait and share the exact same returned value.
    """
    def __init__(self):
        self._calls: Dict[str, threading.Event] = {}
        self._results: Dict[str, Any] = {}
        self._errors: Dict[str, Exception] = {}
        self._lock = threading.Lock()

    def do(self, key: str, fn: Callable[[], Any]) -> Any:
        with self._lock:
            if key in self._calls:
                event = self._calls[key]
                # Another thread is already making this call, wait for it
                is_leader = False
            else:
                event = threading.Event()
                self._calls[key] = event
                is_leader = True

        if not is_leader:
            event.wait(timeout=15)
            with self._lock:
                if key in self._errors:
                    raise self._errors[key]
                return self._results.get(key)

        # Leader executes the request
        try:
            res = fn()
            with self._lock:
                self._results[key] = res
            return res
        except Exception as e:
            with self._lock:
                self._errors[key] = e
            raise e
        finally:
            with self._lock:
                event.set()
                self._calls.pop(key, None)
                self._results.pop(key, None)
                self._errors.pop(key, None)


class CircuitBreaker:
    """
    Tracks upstream errors. If consecutive failures exceed threshold,
    trips circuit to protect against IP banning and upstream abuse.
    """
    def __init__(self, failure_threshold: int = 4, recovery_timeout: float = 30.0):
        self.threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF-OPEN
        self.last_failure_time = 0.0
        self._lock = threading.Lock()

    def can_execute(self) -> bool:
        with self._lock:
            if self.state == "CLOSED":
                return True
            if self.state == "OPEN":
                if time.time() - self.last_failure_time > self.recovery_timeout:
                    self.state = "HALF-OPEN"
                    return True
                return False
            # HALF-OPEN allows one probe trial
            return True

    def record_success(self):
        with self._lock:
            self.failure_count = 0
            self.state = "CLOSED"

    def record_failure(self):
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.threshold:
                self.state = "OPEN"


# Global instances
cache = MemoryCache()
single_flight = SingleFlight()
breaker = CircuitBreaker()

