/**
 * Utility Bridge dual-theme smoke — screenshots + computed-style probes.
 * Usage: node scripts/dev/bridge-smoke.mjs [baseURL]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:4273';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../docs/superpowers/plans/bridge-smoke');
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { id: 'sops-ppc', hash: '#/sops_ppc_advertising' },
  { id: 'sops-account-security', hash: '#/sops_account_security' },
  { id: 'sops-competitor', hash: '#/sops_competitor_monitoring' },
  { id: 'home', hash: '' },
];

const browser = await chromium.launch();
const failures = [];

for (const mode of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  const page = await ctx.newPage();
  await page.addInitScript(m => {
    localStorage.setItem('app-color-mode', JSON.stringify(m));
  }, mode);

  for (const route of ROUTES) {
    try {
      await page.goto(`${BASE}/${route.hash}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: join(OUT, `${route.id}-${mode}.png`), fullPage: false });

      const probe = await page.evaluate(() => {
        const readBg = el => (el ? getComputedStyle(el).backgroundColor : null);
        const readColor = el => (el ? getComputedStyle(el).color : null);
        const card =
          document.querySelector('.bg-white, .ui-card') ||
          document.querySelector('[class*="bg-white"]');
        const heading = document.querySelector(
          '.text-slate-800, .text-slate-900, .ui-card__title'
        );
        const softBadge = document.querySelector(
          '[class*="bg-amber-50"], [class*="bg-blue-50"], [class*="bg-emerald-50"]'
        );
        return {
          resolved: document.documentElement.dataset.colorModeResolved,
          cardBg: readBg(card),
          headingColor: readColor(heading),
          softBadgeBg: readBg(softBadge),
        };
      });
      console.log(`[${mode}] ${route.id}`, JSON.stringify(probe));

      if (mode === 'dark') {
        if (probe.resolved !== 'dark') failures.push(`${route.id}: resolved=${probe.resolved}`);
        if (probe.cardBg === 'rgb(255, 255, 255)')
          failures.push(`${route.id}: card still pure white in dark`);
        if (probe.headingColor && /rgb\((1[0-9]|2[0-9]|3[0-9]|4[0-9]),/.test(probe.headingColor))
          failures.push(`${route.id}: heading still near-black in dark (${probe.headingColor})`);
      }
    } catch (err) {
      failures.push(`${route.id}-${mode}: ${err.message.split('\n')[0]}`);
    }
  }
  await ctx.close();
}

await browser.close();

if (failures.length) {
  console.error('\nFAILURES:');
  for (const f of failures) console.error(' ✗ ' + f);
  process.exit(1);
}
console.log('\n✅ bridge smoke passed — screenshots in', OUT);
