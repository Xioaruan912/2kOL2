# 2kOL2

## COURTSIDE DB · 2KOL2 球员数据库

面向 **NBA2K Online 2 (2KOL2)** 的球员数据查询与对比终端。前端已重构为 React + TypeScript 单页应用，后端为 FastAPI 代理层（X25519 + HKDF-SHA256 + AES-256-GCM 端到端解密），支持实时官方数据与本地快照双模式。

- 球员库：1469 名 PC 端球员，支持姓名 / 球队 / 位置 / 类型 / 卡系 / 徽章组合筛选
- 球员详情：综合、属性、徽章、动作、倾向、战术类型六个 Tab，含 SVG 雷达图与半场热区图
- 球员对比：最多 3 名球员，雷达叠加、矩阵对比、热区并排
- 收藏与对比状态本地持久化，分享按钮复制当前深链

---

## 1. 技术栈

| 层 | 选型 |
| :--- | :--- |
| 前端框架 | React 18 + TypeScript + Vite 5 |
| 路由 | react-router-dom（HashRouter，静态托管无需 rewrite） |
| 图标 | @phosphor-icons/react |
| 样式 | 原生 CSS + CSS Variables 设计令牌（无 UI 框架，4 个样式层） |
| 图表 | 手写 SVG 雷达图与半场热区图（无图表库依赖） |
| 后端 | FastAPI + SQLite + 自研加密客户端 |

## 2. 目录结构

```
2kol/
├── backend/                        # FastAPI 代理与解密核心（保留）
│   ├── app.py                      # 路由、MIME 校正、前端静态托管
│   ├── crypto/client.py            # X25519 + AES-GCM 端到端解密
│   ├── service/proxy_service.py    # 实时数据、缓存、熔断、降级
│   └── service/database.py         # SQLite 持久化
├── frontend/                       # React 前端（本次重构）
│   ├── index.html
│   ├── vite.config.ts              # /api 代理到 127.0.0.1:8899
│   ├── dist/                       # 生产构建产物（由 FastAPI 托管）
│   └── src/
│       ├── data/
│       │   ├── types.ts            # Player / PlayerDetail 等模型
│       │   ├── taxonomy.ts         # 属性分组、徽章分类、倾向分类、排序项
│       │   ├── repository.ts       # 数据入口：API 优先 + 本地快照降级
│       │   ├── synthetic.ts        # 无快照球员的离线推演（明确标注）
│       │   └── generated/
│       │       ├── catalog.json    # 1469 名球员目录快照
│       │       └── details.json    # 18 名精选球员完整详情快照
│       ├── components/             # 表格、雷达、热区、对比栏、选人弹层等
│       ├── pages/                  # 列表 / 详情（6 Tab）/ 对比 / 收藏
│       ├── state/store.ts          # 收藏、对比、Toast（localStorage）
│       ├── hooks/useData.ts        # 目录与详情加载
│       └── styles/                 # tokens / base / components / pages
├── frontend-legacy/                # 重构前的原生 HTML/CSS/JS 前端（保留备份）
├── scripts/
│   ├── export_dataset.py           # 从实时 API / SQLite 导出前端快照
│   ├── ui-smoke.cjs                # 四尺寸冒烟与截图
│   ├── ui-functions.cjs            # 16 项交互功能回归
│   └── ui-prod.cjs                 # 生产构建回归
├── start.bat / start.sh
└── requirements.txt
```

## 3. 快速开始

### 3.1 一键启动（推荐）

```bat
start.bat
```

浏览器访问 **http://localhost:8899**。启动脚本会在缺少 `frontend/dist` 时自动安装依赖并构建，然后启动 FastAPI 并托管前端。

手动方式：

```bash
pip install -r requirements.txt
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8899
```

### 3.2 前端开发模式（热更新）

```bash
# 终端 1：后端
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8899

# 终端 2：前端
cd frontend
npm install
npm run dev          # http://127.0.0.1:5173，/api 自动代理到 8899
```

### 3.3 生产构建

```bash
cd frontend
npm run build        # 输出到 frontend/dist，FastAPI 自动优先托管
```

> Windows 提示：npm 若因 `NODE_ENV=production` 跳过 devDependencies，请先执行 `set NODE_ENV=development`（或 PowerShell 下 `$env:NODE_ENV="development"`）再 `npm install`。

## 4. 数据来源与降级策略

1. **实时模式（实时代理）**：前端请求同源 `/api/players?mode=db` 与 `/api/player/{id}`，后端经官方加密接口取数；页面右上角显示「实时代理」。
2. **本地快照（本地快照）**：后端不可用时自动降级到 `frontend/src/data/generated/*.json`，全量 1469 名球员仍可搜索、筛选、排序，页面右上角显示「本地快照」。
3. **离线推演**：快照中未收录详情的球员（例如冷门卡），详情页顶部显示橙色提示条与「离线推演数据」标签，属性 / 徽章 / 动作 / 倾向由位置与总评确定性推演，不代表官方数值。

重新导出快照（后端需运行）：

```bash
python scripts/export_dataset.py
# 产物：frontend/src/data/generated/catalog.json、details.json
```

## 5. 数据模型与真实接口预留

前端所有数据访问集中在 `frontend/src/data/repository.ts`：

```ts
export async function getCatalog(): Promise<PlayerSummary[]>;
export async function getPlayerDetail(id: string): Promise<PlayerDetail>;
```

- 接入真实数据库时，只需替换这两个函数的实现（或修改 `API_BASE` 与返回字段归一化逻辑），页面与组件无需改动。
- 字段归一化层同时兼容后端当前返回（下划线字段 `player_id`、`badge_counts` 等）与旧版字段（`playerId`、`badge_counts`）。
- `PlayerDetail` 结构见 `src/data/types.ts`，包含 `radar`、`attributes`、`badges`、`tendencies`、`tactics`、`actions.ol2 / actions.k26`、`hotZones`。

后端接口：

| 接口 | 方法 | 参数 | 说明 |
| :--- | :---: | :--- | :--- |
| `/api/players` | GET | `keyword` `pos` `team` `sort_by` `desc` `mode` `limit` | 球员目录（`mode=db` 走本地库，`realtime` 走实时代理） |
| `/api/player/{playerId}` | GET | `grade` (1-7) | 球员完整详情：属性、徽章、雷达、热区、动作包、倾向、战术 |
| `/api/player/{playerId}/price-history` | GET | `days` | 身价走势（后端预留，前端尚未展示） |
| `/api/sync/status` / `/api/sync/trigger` | GET / POST | `top_n` | 同步任务状态与手动同步 |
| `/api/system/health` | GET | - | 熔断器与系统健康 |

## 6. 已实现功能清单

**球员库**
- 姓名（中/英）、球队、类型关键词搜索
- 球队、类型、卡系下拉筛选；PG/SG/SF/PF/C 位置筛选；徽章数量与紫/金徽章筛选
- 总评 / 价格 / 徽章数 / 身高 / 姓名排序，升降序切换
- 分页（24 条/页，含省略号分页器）、结果计数、生效筛选计数
- 空结果状态、加载骨架、错误重试、清空全部条件
- 行内收藏、加入对比；桌面表格与移动端卡片双布局
- 全部筛选状态写入 URL（`q / team / pos / type / series / badge / sort / dir / page`），可分享与回退

**球员详情**
- 深色球员头图：头像、姓名、位置、类型、卡系、身高、臂展、球队、卡牌年份、价格、徽章构成、总评与特训增量
- 操作：返回、收藏、对比、分享（复制当前链接，含 Tab 深链）
- 综合：11 维 SVG 雷达、能力概览条形、最强/最弱项、徽章构成、官方球场底纹热区卡片（14 区 + 球场分布说明）
- 属性：按终结、投篮、组织、防守、篮板、身体素质、精神属性分组，含平均与特训增量
- 徽章：铜/银/金/紫统计、终结/投篮/组织/防守/篮板分类筛选、等级标签、已是最高、真实徽章图标（失败兜底六边形）
- 动作：OL2 / 26 内核切换、投篮条 / 离手 / 总时间、核心动作行、全部动作两列
- 倾向：全部 / 防守 / 传球 / 决策 / 投篮 / 篮下 / 突破 / 背身分类，含数值条
- 战术类型：是否主控与战术类型 1-4

**对比**
- 最多 3 名球员，选人弹层支持搜索
- 槽位卡（总评 / 身高 / 价格）、雷达叠加（三色图例）
- 基本信息、能力维度、关键倾向、详细属性矩阵，最优项自动高亮（价格为最低优先）
- 三宫格热区并排、徽章构成
- 全局底部对比栏，超出 3 人时提示

**收藏**
- 本地持久化、导航角标、收藏页空状态

**其它**
- HashRouter 深链（`#/player/4567?tab=badges`）
- 数据源状态指示（实时代理 / 本地快照）
- 键盘可达（表单 label、按钮 aria-label、行内链接）、`prefers-reduced-motion` 降级
- 全站无第三方图表库与 UI 框架依赖

## 7. 浏览器测试结果

测试环境：Windows + Chrome（Playwright headless），后端运行于 `127.0.0.1:8899`。

| 项目 | 1440px | 1024px | 768px | 390px |
| :--- | :---: | :---: | :---: | :---: |
| 横向溢出 | 0 | 0 | 0 | 0 |
| 列表（表格/卡片） | 表格 | 表格 | 卡片 | 卡片 |
| 详情六 Tab | 正常 | 正常 | 正常 | 正常 |
| 雷达图 / 热区图 | 正常 | 正常 | 正常 | 正常 |
| 对比页 | 正常 | 正常 | 正常 | 正常 |
| 控制台错误 | 无 | 无 | 无 | 无 |

功能回归（`node scripts/ui-functions.cjs`，16 项全部 PASS）：

价格升序排序、分页切换、球队筛选、含紫徽章筛选、空结果状态、清空条件、收藏写入与取消、对比上限提示、详情 Tab 深链、徽章分类筛选、动作包切换、分享复制链接、后端不可用降级、离线推演标注、控制台无报错。

生产构建回归（`node scripts/ui-prod.cjs`）在 8899 端口同样通过四尺寸检查。

## 8. 数据与免责声明

本项目仅供网络安全技术研究、协议白盒审计与个人学习交流。球员姓名、头像与官方数值版权归属原版权方；总评、价格、徽章等数据通过本地代理从官方接口获取，仅供查询参考，实际以游戏内为准。缺少快照的球员详情会明确标注为离线推演，不代表官方数值。

## 9. 线上部署

线上实例（HostDZire VPS，Debian 12）：

- 访问地址：http://199.47.242.40:2369
- 进程管理：`systemd` 单元 `2kol.service`，端口 2369，开机自启
- 部署目录：`/opt/2kol`（`venv/` + `backend/` + `frontend/dist/`）
- 数据模式：后端可访问官方接口时为「实时代理」，异常时自动退回本地 SQLite 与前端快照

服务端常用命令：

```bash
systemctl status 2kol      # 查看状态
systemctl restart 2kol     # 重启
journalctl -u 2kol -f      # 实时日志
curl -s http://127.0.0.1:2369/api/system/health
```

更新发布流程（本地构建后覆盖上传）：

```bash
cd frontend && npm run build
scp -r frontend/dist root@199.47.242.40:/opt/2kol/frontend/
scp -r backend       root@199.47.242.40:/opt/2kol/
ssh root@199.47.242.40 'systemctl restart 2kol'
```
