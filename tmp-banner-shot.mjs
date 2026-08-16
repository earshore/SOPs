// 临时调试脚本：渲染指定页面 welcome banner 截图（用完即删）
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const PORT = 5199;
const base = `http://localhost:${PORT}`;

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(base);
      if (res.ok) return;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('dev server did not start');
};

try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const route = process.env.SHOT_ROUTE ?? '/app-center/master-analysis/scraper';
  await page.goto(`${base}/#${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.locator('.wb-icon-wrapper').first().waitFor({ state: 'visible', timeout: 15000 });
  const info = await page.locator('.wb-icon-wrapper').first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const header = el.closest('.wb-header');
    const hr = header?.getBoundingClientRect();
    const hs = header ? getComputedStyle(header) : null;
    return {
      iconTop: r.top,
      iconBottom: r.bottom,
      headerTop: hr?.top,
      headerBottom: hr?.bottom,
      headerAlignItems: hs?.alignItems,
      headerJustifyContent: hs?.justifyContent,
    };
  });
  console.log(JSON.stringify({ route, ...info }, null, 2));
  await browser.close();
} finally {
  server.kill();
}