const { chromium } = require("C:/Users/Administrator/.pi/agent/npm/node_modules/playwright");
const BASE = "http://127.0.0.1:5173/#/";
let fails = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` (${extra})` : ""}`);
  if (!ok) fails += 1;
}
(async () => {
  const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(BASE, { waitUntil: "networkidle" });
  await p.waitForSelector(".player-table tbody tr");

  // 1. 打开筛选面板
  await p.locator(".btn--filter").click();
  await p.waitForSelector(".drawer");
  check("筛选面板可打开", await p.locator(".drawer").isVisible());
  await p.screenshot({ path: "shots/filter-drawer.png" });

  // 2. 总评 >= 135（本地）
  await p.locator('input[aria-label="总评最低值"]').fill("135");
  await p.locator('.drawer__foot .btn--primary').click();
  await p.waitForTimeout(600);
  const localCount = await p.locator(".results-count strong").textContent();
  const overalls = await p.locator(".overall-num").allTextContents();
  check("总评区间筛选", localCount === "6" && overalls.every((v) => Number(v) >= 135), `count=${localCount}`);
  check("条件标签显示", (await p.locator(".active-chip").count()) >= 1);

  // 3. 清除全部
  await p.locator(".active-chips .chip-link").click();
  await p.waitForTimeout(500);

  // 4. 徽章条件：神射手 + 紫 -> 2
  await p.locator(".btn--filter").click();
  await p.waitForSelector(".drawer");
  await p.locator('.drawer select[aria-label="徽章名称"]').selectOption("神射手");
  await p.locator('.drawer select[aria-label="徽章等级"]').selectOption("紫");
  await p.locator('.drawer button:has-text("添加")').first().click();
  await p.locator('.drawer__foot .btn--primary').click();
  await p.waitForTimeout(3500);
  const badgeCount = await p.locator(".results-count strong").textContent();
  const modeTag = await p.locator(".mode-tag").textContent().catch(() => "");
  const firstNames = await p.locator(".pl-name a").allTextContents();
  check("徽章精细筛选", badgeCount === "2" && (modeTag ?? "").includes("精细筛选"), `count=${badgeCount} names=${firstNames.join("/")}`);
  await p.screenshot({ path: "shots/filter-badge-result.png" });

  // 5. 退出精细筛选
  await p.locator(".active-chips .active-chip").first().click();
  await p.waitForTimeout(1200);
  check("移除徽章条件退出精细模式", (await p.locator(".mode-tag").count()) === 0);

  // 6. 属性筛选：三分投篮 >= 130 -> 4
  await p.locator(".btn--filter").click();
  await p.waitForSelector(".drawer");
  await p.locator('.drawer select[aria-label="属性名称"]').selectOption("三分投篮");
  await p.locator('input[aria-label="属性最低值"]').fill("130");
  await p.locator('.drawer button:has-text("添加")').nth(1).click();
  await p.locator('.drawer__foot .btn--primary').click();
  await p.waitForTimeout(3500);
  const attrCount = await p.locator(".results-count strong").textContent();
  check("属性精细筛选", attrCount === "4", `count=${attrCount}`);

  // 7. 战术条件
  await p.locator(".active-chips .chip-link").click();
  await p.waitForTimeout(500);
  await p.locator(".btn--filter").click();
  await p.waitForSelector(".drawer");
  await p.locator('.play-grid .chip:has-text("低位背身单打")').click();
  await p.locator('.drawer__foot .btn--primary').click();
  await p.waitForTimeout(3500);
  const playCount = await p.locator(".results-count strong").textContent();
  check("战术精细筛选", Number(playCount) > 0, `count=${playCount}`);
  await p.locator(".active-chips .chip-link").click();
  await p.waitForTimeout(500);

  // 8. 多位置
  await p.locator('.pos-chips button:has-text("PG")').click();
  await p.locator('.pos-chips button:has-text("C")').click();
  await p.waitForTimeout(600);
  const multiChips = await p.locator(".active-chips .active-chip").count();
  check("位置多选", multiChips >= 2, `chips=${multiChips}`);
  await p.locator(".active-chips .chip-link").click();
  await p.waitForTimeout(400);

  // 9. 移动端抽屉
  const mctx = await b.newContext({ viewport: { width: 390, height: 900 } });
  const mp = await mctx.newPage();
  await mp.goto(BASE, { waitUntil: "networkidle" });
  await mp.waitForSelector(".player-card");
  await mp.locator(".btn--filter").click();
  await mp.waitForSelector(".drawer");
  await mp.waitForTimeout(300);
  const drawerBox = await mp.locator(".drawer").boundingBox();
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await mp.screenshot({ path: "shots/filter-drawer-390.png" });
  check("移动端筛选面板", Boolean(drawerBox) && overflow === 0, `w=${drawerBox?.width}`);
  await mp.locator('input[aria-label="身高最低值"]').fill("210");
  await mp.locator('.drawer__foot .btn--primary').click();
  await mp.waitForTimeout(700);
  const mobileCount = await mp.locator(".results-count strong").textContent();
  check("移动端身高筛选", Number(mobileCount) > 0, `count=${mobileCount}`);

  check("控制台无报错", errors.length === 0, errors.slice(0, 2).join(" | "));
  console.log(fails === 0 ? "ALL FILTER TESTS PASSED" : `${fails} FILTER TEST(S) FAILED`);
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
