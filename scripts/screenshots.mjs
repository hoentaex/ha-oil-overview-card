// Renders the demo page with the simulated history at a fixed time (15 Nov 2026, 18:00 Berlin) and saves
// the README screenshots: the whole card (light / dark), each consumption view, the mini card and the popup.
// Usage: npm run screenshots
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const server = serve();
await new Promise((resolve, reject) => server.once("listening", resolve).once("error", reject));
const port = server.address().port;
const browser = await chromium.launch();
const TIME = new Date("2026-11-15T18:00:00+01:00");
const shot = (name) => `${root}screenshots/${name}.png`;

try {
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 4200 },
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
      timezoneId: "Europe/Berlin",
    });
    await page.clock.setFixedTime(TIME);
    await page.goto(`http://127.0.0.1:${port}/demo/?lang=de`);
    await page.locator(`#${theme}`).evaluate((el) => {
      el.style.padding = "16px";
      el.style.width = "492px";
    });
    const card = page.locator(`#${theme} oil-overview-card`).first();
    await card.locator(".footer").waitFor();
    await card.locator("#p-plot svg").waitFor();
    await page.waitForTimeout(400);
    await card.screenshot({ path: shot(`card-${theme}`) });
    console.log(`saved screenshots/card-${theme}.png`);
    for (const view of ["days", "months", "level"]) {
      await card.locator(`.seg button[data-view="${view}"]`).click();
      await page.waitForTimeout(200);
      await card.locator("section.consumption").screenshot({ path: shot(`view-${view}-${theme}`) });
      console.log(`saved screenshots/view-${view}-${theme}.png`);
    }
    const mini = page.locator(`#${theme} oil-overview-mini-card`).first();
    await mini.locator(".banner, .mini").first().waitFor();
    await page.waitForTimeout(300);
    await mini.screenshot({ path: shot(`mini-${theme}`) });
    console.log(`saved screenshots/mini-${theme}.png`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
