@echo off
chcp 65001 >nul
title 2KOL2 Market & Player Intelligence Web
echo ========================================================
echo   COURTSIDE DB - 2KOL2 球员数据库 (React + FastAPI)
echo   实时代理: 官方接口实时数据 / 本地快照: 1469 名球员离线可用
echo ========================================================
if not exist "frontend\dist\index.html" (
  echo [提示] 未找到前端构建产物，正在构建 frontend ...
  set NODE_ENV=development
  pushd frontend
  if exist node_modules (
    call npm run build
  ) else (
    call npm install && call npm run build
  )
  popd
)

echo 正在启动本地服务...
echo 提示：浏览器访问地址为 http://localhost:8899 或 http://127.0.0.1:8899
echo (请勿直接访问 0.0.0.0:8899，Windows 浏览器无法解析通配绑定地址)
echo.
timeout /t 2 /nobreak >nul
start http://localhost:8899
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8899
pause
