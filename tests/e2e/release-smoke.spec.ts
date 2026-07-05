import { expect, test, type Page } from '@playwright/test';

import { setupConsoleErrorListener } from '../helpers/playwright-utils';

const CORE_ROUTES = [
  { label: 'Home', path: '/home' },
  { label: 'SOPs', path: '/sops' },
  { label: 'App Center', path: '/app-center' },
  { label: 'Scraper', path: '/app-center/master-analysis/scraper' },
  { label: 'AI Analysis', path: '/app-center/master-analysis/ai-analysis' },
  { label: 'Promptlab', path: '/app-center/master-analysis/promptlab' },
  { label: 'Deep Chat', path: '/app-center/playground/deep-chat' },
  { label: 'Keyword Hunter Input', path: '/app-center/keyword-hunter/input' },
  { label: 'PPC Search Terms', path: '/app-center/ppc-tools/ppc-search-terms' },
  { label: 'AMZ Hub', path: '/amz-hub' },
  { label: 'More', path: '/more' },
] as const;

const OVERFLOW_ROUTES = [
  { label: 'Home', path: '/home' },
  { label: 'SOPs', path: '/sops' },
  { label: 'App Center', path: '/app-center' },
  { label: 'PPC Search Terms', path: '/app-center/ppc-tools/ppc-search-terms' },
  { label: 'AMZ Hub', path: '/amz-hub' },
  { label: 'More', path: '/more' },
] as const;

const ERROR_TEXT_PATTERNS = [
  /module load failed/i,
  /page load failed/i,
  /cannot read properties/i,
  /is not a function/i,
  /is not defined/i,
  /模块加载失败/,
  /页面加载失败/,
  /尚未开发或未注册/,
  /服务未注册/,
] as const;

async function waitForMainContent(page: Page): Promise<string> {
  const mainContent = page.locator('#main-content');
  await expect(mainContent).toBeVisible();
  await expect
    .poll(
      async () => {
        const text = await mainContent.innerText();
        return text.trim().length;
      },
      { message: 'main content should be populated after route load' }
    )
    .toBeGreaterThan(40);

  return (await mainContent.innerText()).trim();
}

async function expectNoRouteErrorText(page: Page): Promise<void> {
  const mainText = await waitForMainContent(page);
  const matchedPattern = ERROR_TEXT_PATTERNS.find(pattern => pattern.test(mainText));

  expect(
    matchedPattern?.toString() ?? '',
    `route rendered an error fallback in #main-content:\n${mainText.slice(0, 800)}`
  ).toBe('');
}

async function openRoute(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
}

test.describe('release candidate smoke', () => {
  for (const route of CORE_ROUTES) {
    test(`${route.label} renders without console or route errors`, async ({ page }) => {
      const consoleListener = setupConsoleErrorListener(page);

      await openRoute(page, route.path);
      await expectNoRouteErrorText(page);

      expect(
        consoleListener.getErrors(),
        `${route.label} should not emit console/page errors`
      ).toEqual([]);
    });
  }

  test('core routes do not create severe mobile horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of OVERFLOW_ROUTES) {
      await openRoute(page, route.path);
      await expectNoRouteErrorText(page);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - window.innerWidth;
      });

      expect(
        overflow,
        `${route.label} should not overflow the mobile viewport`
      ).toBeLessThanOrEqual(24);
    }
  });
});
