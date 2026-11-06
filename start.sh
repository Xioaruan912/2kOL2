#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  COURTSIDE DB - 2KOL2 球员数据库 (React + FastAPI)"
echo "  实时代理: 官方接口实时数据 / 本地快照: 1469 名球员离线可用"
echo "========================================================"
if [ ! -f frontend/dist/index.html ]; then
  echo "frontend/dist missing, building ..."
  ( cd frontend && npm install && npm run build )
fi
echo "Starting server on http://0.0.0.0:8899 ..."
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8899
