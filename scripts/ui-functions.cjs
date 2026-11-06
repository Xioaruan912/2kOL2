const { chromium } = require("C:/Users/Administrator/.pi/agent/npm/node_modules/playwright");

const BASE = "http://127.0.0.1:5173/#/";
let failures = 0;

function check(name, condition, extra = "") {
  if (condition) {
    console.log(`PASS  ${name}${extra ? ` (${extra})` : ""}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${extra ? ` (${extra})` : ""}`);
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:5173",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".player-table tbody tr");

  // 1. 排序：价格升序
  await page.locator('.sort-group .chip:has-text("价格")').click();
  await page.waitForTimeout(200);
  await page.locator(".sort-dir").click();
  await page.waitForTimeout(300);
  const prices = await page.locator(".price-cell__main").allTextContents();
  check("价格升序排序生效", prices[0] !== prices[prices.length - 1], `${prices[0]} -> ${prices[prices.length - 1]}`);

  // 2. 重置并分页
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".player-table tbody tr");
  const firstRowName = await page.locator(".pl-name a").first().textContent();
  await page.locator('.pager__btn:has-text("下一页")').click();
  await page.waitForTimeout(400);
  const secondPageFirst = await page.locator(".pl-name a").first().textContent();
  const url = page.url();
  check("分页切换生效", firstRowName !== secondPageFirst && url.includes("page=2"), `${firstRowName} -> ${secondPageFirst}`);

  // 3. 球队筛选
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".player-table tbody tr");
  await page.locator('.select select[aria-label="球队筛选"]').selectOption("勇士");
  await page.waitForTimeout(400);
  const teams = await page.locator(".player-table tbody tr td:nth-child(3)").allTextContents();
  check("球队筛选生效", teams.length > 0 && teams.every((t) => t.trim() === "勇士"), `${teams.length} 行`);

  // 4. 徽章筛选
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".player-table tbody tr");
  await page.locator('.select select[aria-label="徽章数量筛选"]').selectOption("has-purple");
  await page.waitForTimeout(400);
  const purpleCounts = await page.locator(".mini-badge--purple span:last-child").allTextContents();
  check(
    "含紫徽章筛选生效",
    purpleCounts.length > 0 && purpleCounts.every((v) => Number(v) > 0),
    `${purpleCounts.length} 行`,
  );

  // 5. 搜索 + 空结果状态
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".player-table tbody tr");
  await page.locator(".filters__search input").fill("不存在的球员xyz");
  await page.waitForTimeout(500);
  const emptyVisible = await page.locator(".state-block__title:has-text('没有符合条件的球员')").isVisible();
  check("空结果状态显示", emptyVisible);
  await page.locator('.state-block button:has-text("清空全部条件")').click();
  await page.waitForTimeout(400);
  const rowsBack = await page.locator(".player-table tbody tr").count();
  check("清空条件恢复列表", rowsBack === 24, `${rowsBack} 行`);

  // 6. 收藏
  await page.locator(".player-table tbody tr").first().locator('button[title="加入收藏"]').click();
  await page.waitForTimeout(300);
  const navCount = await page.locator('.nav-link:has-text("收藏球员") .nav-count').first().textContent();
  await page.locator('.nav-link:has-text("收藏球员")').first().click();
  await page.waitForTimeout(600);
  const favRows = await page.locator(".player-table tbody tr").count();
  check("收藏写入并可在收藏页查看", navCount === "1" && favRows === 1, `nav=${navCount} rows=${favRows}`);
  await page.locator(".player-table tbody tr").first().locator('button[title="取消收藏"]').click();
  await page.waitForTimeout(400);
  const favEmpty = await page.locator(".state-block__title:has-text('还没有收藏任何球员')").isVisible();
  check("取消收藏后空状态", favEmpty);

  // 7. 对比上限
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".player-table tbody tr");
  for (let i = 1; i <= 3; i += 1) {
    await page.locator(`.player-table tbody tr:nth-child(${i}) button[title="加入对比"]`).click();
    await page.waitForTimeout(120);
  }
  await page.locator('.player-table tbody tr:nth-child(4) button[title="加入对比"]').click();
  await page.waitForTimeout(400);
  const toast = await page.locator(".toast").last().textContent();
  const traySlots = await page.locator(".tray-slot").count();
  check("对比上限 3 名并提示", (toast ?? "").includes("最多同时对比 3 名球员") && traySlots === 3, `slots=${traySlots}`);
  await page.screenshot({ path: "shots/func-compare-limit.png" });

  // 8. 详情 deeplink + tab 切换
  await page.goto(`${BASE}player/4567?tab=badges`, { waitUntil: "networkidle" });
  await page.waitForSelector(".detail-tabs");
  await page.waitForTimeout(800);
  const activeTab = await page.locator(".tab.is-active").textContent();
  check("详情页 tab 深链", activeTab === "徽章", activeTab ?? "");
  await page.locator('.badge-toolbar .chip:has-text("防守")').click();
  await page.waitForTimeout(400);
  const badgeCount = await page.locator(".badge-item").count();
  check("徽章分类筛选", badgeCount > 0, `${badgeCount} 枚`);

  // 9. 动作 OL2 / 26 内核
  await page.locator('.tab:has-text("动作")').click();
  await page.waitForTimeout(400);
  const ol2Value = await page.locator('.data-row:has-text("运球风格") .data-row__value').first().textContent();
  await page.locator('.segmented__item:has-text("26 内核")').click();
  await page.waitForTimeout(300);
  const k26Value = await page.locator('.data-row:has-text("运球风格") .data-row__value').first().textContent();
  check("动作包 OL2 / 26 内核切换", Boolean(ol2Value) && Boolean(k26Value), `${ol2Value} vs ${k26Value}`);

  // 10. 分享复制链接
  await page.locator('.hero-actions button:has-text("分享")').click();
  await page.waitForTimeout(400);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check("分享复制当前链接", clip.includes("/player/4567"), clip.slice(0, 48));

  // 11. 离线降级（模拟后端不可用）
  const offline = await context.newPage();
  await offline.route("**/api/**", (route) => route.abort());
  await offline.goto(BASE, { waitUntil: "networkidle" });
  await offline.waitForSelector(".player-table tbody tr", { timeout: 20000 });
  const pill = await offline.locator(".source-pill").textContent();
  check("后端不可用时降级本地快照", (pill ?? "").includes("本地快照"), pill ?? "");
  await offline.goto(`${BASE}player/1018`, { waitUntil: "networkidle" });
  await offline.waitForSelector(".detail-tabs", { timeout: 20000 });
  await offline.waitForTimeout(500);
  const synthetic = await offline.locator(".hero-tag.is-accent").first().textContent().catch(() => "");
  check("无快照球员标注离线推演", (synthetic ?? "").includes("离线推演"), synthetic ?? "");
  await offline.screenshot({ path: "shots/func-offline.png", fullPage: false });

  check("控制台无报错", errors.length === 0, errors.slice(0, 3).join(" | "));
  console.log(failures === 0 ? "ALL FUNCTION TESTS PASSED" : `${failures} TEST(S) FAILED`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error("TEST CRASH", err);
  process.exit(1);
});
