import os

# Upstream API Configuration
UPSTREAM_BASE_URL = os.getenv("UPSTREAM_BASE_URL", "https://nbatoday.cn/ol2")
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key_here_change_it")
APPNAME = os.getenv("APPNAME", "pc_2k")  # Default to PC 2K (1469 players, Yao Ming 7.36亿)
CLIENT_VERSION = "1.4.2"

# Security & Network Headers
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) XWEB/11275"
REQUEST_TIMEOUT = 10  # Seconds

# Risk Control & Caching (Anti-Scraping / Anti-Ban)
CACHE_TTL_PLAYERS = 180       # 3 minutes for player list (frequently updated prices)
CACHE_TTL_PRICE = 600         # 10 minutes for price history
CACHE_TTL_DETAIL = 3600       # 1 hour for player attributes (rarely change)

# Sync Engine (Mode 2)
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "2kol.db")
SYNC_INTERVAL_HOURS = 2       # Auto sync every 2 hours
SYNC_JITTER_MIN = 1.0         # Random delay between queries (anti-risk)
SYNC_JITTER_MAX = 2.2

# Server Port
PORT = int(os.getenv("PORT", "8899"))
HOST = os.getenv("HOST", "0.0.0.0")
