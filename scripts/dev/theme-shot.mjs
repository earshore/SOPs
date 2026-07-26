/**
 * Dual-theme route screenshotter for audit agents.
 * Usage: node scripts/dev/theme-shot.mjs <outDir> <routeId[,routeId...]> [baseURL]
 * Screenshots each #/<routeId> in light and dark into <outDir>/<routeId>-<mode>.png
 * Also emits <outDir>/probe.json with per-route computed-style probes.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, routesArg, baseArg] = process.argv.slice(2);
if (!outDir || !routesArg) {
  console.error('Usage: node theme-shot.mjs <outDir> <routeId[,routeId...]> [baseURL]');
  process.exit(2);
}
const BASE = baseArg || 'http://localhost:4273';
const routes = routesArg.split(',').filter(Boolean);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const probes = {};

for (const mode of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 2200 } });
  const page = await ctx.newPage();
  await page.addInitScript(m => {
    localStorage.setItem('app-color-mode', JSON.stringify(m));
  }, mode);

  for (const routeId of routes) {
    const hash = routeId === 'home' ? '' : `#/${routeId}`;
    try {
      await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(outDir, `${routeId}-${mode}.png`), fullPage: false });
      probes[`${routeId}-${mode}`] = await page.evaluate(() => {
        const readBg = el => (el ? getComputedStyle(el).backgroundColor : null);
        const main = document.querySelector('#main-content, main, .module-container');
        return {
          resolved: document.documentElement.dataset.colorModeResolved,
          mainBg: readBg(main),
          bodyBg: readBg(document.body),
        };
      });
      console.log(`ok ${routeId}-${mode}`);
    } catch (err) {
      probes[`${routeId}-${mode}`] = { error: err.message.split('\n')[0] };
      console.error(`FAIL ${routeId}-${mode}: ${err.message.split('\n')[0]}`);
    }
  }
  await ctx.close();
}

await browser.close();
writeFileSync(join(outDir, 'probe.json'), JSON.stringify(probes, null, 2));
console.log('done →', outDir);
