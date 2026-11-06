const { chromium } = require("C:/Users/Administrator/.pi/agent/npm/node_modules/playwright");
const BASE = "http://127.0.0.1:8899/#/";
(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const errors = [];
  for (const width of [1440, 1024, 768, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && errors.push(`${width}: ${m.text()}`));
    page.on("pageerror", (e) => errors.push(`${width}: ${e.message}`));
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector(width < 900 ? ".player-cards .player-card" : ".player-table tbody tr", { timeout: 20000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const mode = await page.locator(".source-pill").textContent();
    await page.goto(BASE + "player/4567?tab=overview", { waitUntil: "networkidle" });
    await page.waitForSelector(".court-svg", { timeout: 20000 });
    await page.waitForTimeout(600);
    const detailOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const courtBox = await page.locator(".court-svg").first().boundingBox();
    await page.screenshot({ path: `shots/prod-${width}.png` });
    console.log(`width ${width}: list-overflow=${overflow} detail-overflow=${detailOverflow} court=${courtBox ? Math.round(courtBox.width) + "x" + Math.round(courtBox.height) : "none"} mode=${mode}`);
    await ctx.close();
  }
  console.log("console errors:", errors.length ? errors.join("\n") : "none");
  await browser.close();
})();
