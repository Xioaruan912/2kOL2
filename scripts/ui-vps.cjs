const { chromium } = require("C:/Users/Administrator/.pi/agent/npm/node_modules/playwright");
const BASE = "http://199.47.242.40:2369/#/";
(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const errors = [];
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && errors.push(`${width}: ${m.text()}`));
    page.on("pageerror", (e) => errors.push(`${width}: ${e.message}`));
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector(width < 900 ? ".player-cards .player-card" : ".player-table tbody tr", { timeout: 30000 });
    const mode = (await page.locator(".source-pill").textContent()).trim();
    const rows = await page.locator(".player-table tbody tr").count();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.locator(".filters__search input").fill("库里");
    await page.waitForTimeout(600);
    const first = await page.locator(".pl-name a, .player-card__name").first().textContent();
    await page.goto(BASE + "player/4567", { waitUntil: "networkidle" });
    await page.waitForSelector(".court-svg", { timeout: 30000 });
    const overall = await page.locator(".hero-score__value").textContent();
    const badges = await page.locator(".hero-badges__item").count();
    await page.screenshot({ path: `shots/vps-${width}.png` });
    console.log(`width ${width}: mode=${mode} rows=${rows} overflow=${overflow} search=${first} overall=${overall} badges=${badges}`);
    await ctx.close();
  }
  console.log("console errors:", errors.length ? errors.join(" | ") : "none");
  await browser.close();
})();
