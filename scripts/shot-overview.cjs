const { chromium } = require("C:/Users/Administrator/.pi/agent/npm/node_modules/playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  await p.goto("http://127.0.0.1:5173/#/player/4567", { waitUntil: "networkidle" });
  await p.waitForSelector(".court-card", { timeout: 20000 });
  await p.waitForTimeout(700);
  await p.screenshot({ path: "shots/overview-new.png", fullPage: true });
  // compare mini courts
  const ctx2 = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p2 = await ctx2.newPage();
  await p2.goto("http://127.0.0.1:5173/#/compare", { waitUntil: "networkidle" });
  await p2.evaluate(() => localStorage.setItem("courtside.compare.v1", JSON.stringify(["4567", "4820"])));
  await p2.reload({ waitUntil: "networkidle" });
  await p2.waitForSelector(".mini-court", { timeout: 20000 });
  await p2.waitForTimeout(900);
  await p2.locator(".mini-courts").screenshot({ path: "shots/compare-courts.png" });
  await b.close();
})();
