const { chromium } = require("C:/Users/Administrator/.pi/agent/npm/node_modules/playwright");
const path = require("path");

const BASE = "http://127.0.0.1:5173/#/";
const OUT = path.resolve(__dirname, "shots");
const fs = require("fs");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".player-table tbody tr", { timeout: 15000 });
  const rows = await page.locator(".player-table tbody tr").count();
  console.log("list rows:", rows);
  await page.screenshot({ path: path.join(OUT, "01-list-1440.png"), fullPage: false });

  // search
  const search = page.locator(".filters__search input");
  await search.fill("库里");
  await page.waitForTimeout(400);
  const searchRows = await page.locator(".player-table tbody tr").count();
  const firstName = await page.locator(".player-table tbody tr .pl-name a").first().textContent();
  console.log("search 库里 ->", searchRows, firstName);

  // filter position PG
  await search.fill("");
  await page.waitForTimeout(300);
  await page.locator('.pos-chips button:has-text("PG")').click();
  await page.waitForTimeout(300);
  const pgCount = await page.locator(".player-table tbody tr").count();
  console.log("PG filter rows:", pgCount);
  await page.locator('.pos-chips button:has-text("全部")').click();
  await page.waitForTimeout(300);

  // open detail
  await page.locator(".player-table tbody tr").first().click();
  await page.waitForSelector(".detail-tabs", { timeout: 15000 });
  await page.waitForTimeout(800);
  console.log("detail url:", page.url());
  console.log("hero name:", await page.locator(".hero-name").first().textContent());
  await page.screenshot({ path: path.join(OUT, "02-detail-overview-1440.png"), fullPage: false });

  for (const [key, label] of [
    ["attributes", "属性"],
    ["badges", "徽章"],
    ["actions", "动作"],
    ["tendencies", "倾向"],
    ["tactics", "战术类型"],
  ]) {
    await page.locator(`.detail-tabs .tab:has-text("${label}")`).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `03-detail-${key}-1440.png`), fullPage: true });
  }

  // compare flow
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".player-table tbody tr");
  await page.locator('.player-table tbody tr:nth-child(1) button[title="加入对比"]').click();
  await page.locator('.player-table tbody tr:nth-child(2) button[title="加入对比"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "04-list-tray-1440.png") });
  await page.locator('.compare-tray button:has-text("开始对比")').click();
  await page.waitForSelector(".compare-slots");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "05-compare-1440.png"), fullPage: true });

  // widths
  for (const width of [1024, 768, 390]) {
    const ctx2 = await browser.newContext({ viewport: { width, height: 900 } });
    const p2 = await ctx2.newPage();
    await p2.goto(BASE, { waitUntil: "networkidle" });
    await p2.waitForSelector(".player-cards .player-card, .player-table tbody tr", { state: "attached", timeout: 15000 });
    await p2.waitForTimeout(500);
    const overflow = await p2.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    console.log(`width ${width}: overflow=${overflow}`);
    await p2.screenshot({ path: path.join(OUT, `06-list-${width}.png`), fullPage: false });

    await p2.goto(BASE + "player/4567", { waitUntil: "networkidle" });
    await p2.waitForSelector(".detail-tabs", { timeout: 15000 });
    await p2.waitForTimeout(800);
    const overflowDetail = await p2.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    console.log(`width ${width} detail: overflow=${overflowDetail}`);
    await p2.screenshot({ path: path.join(OUT, `07-detail-${width}.png`), fullPage: false });
    await ctx2.close();
  }

  console.log("ERRORS:", errors.length ? errors.join("\n") : "none");
  await browser.close();
})().catch((err) => {
  console.error("TEST FAILED", err);
  process.exit(1);
});
