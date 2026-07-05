import { expect, test, type Page } from '@playwright/test';

import { setupConsoleErrorListener } from '../helpers/playwright-utils';

const DEFAULT_LLM_ENDPOINT = 'https://new.hongecb.store/v1';
const DEFAULT_LLM_MODELS_URL = `${DEFAULT_LLM_ENDPOINT}/models`;

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

async function waitForSettingsPanel(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const root = document.querySelector('[x-data="settingsPanel"]') as
      | (HTMLElement & { _x_dataStack?: unknown[] })
      | null;
    return Array.isArray(root?._x_dataStack);
  });
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

  test('marketing calendar renders local flag icons without stylesheet CDN requests', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);
    const stylesheetCdnRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('cdn.jsdelivr.net')) {
        stylesheetCdnRequests.push(url);
      }
    });

    await openRoute(page, '/amz-hub/practice/marketing-calendar');
    await expectNoRouteErrorText(page);

    const germanFlag = page.locator('.fi-de').first();
    await expect(germanFlag).toBeVisible();
    await expect
      .poll(
        () =>
          germanFlag.evaluate(element => window.getComputedStyle(element).backgroundImage),
        { message: 'marketing calendar should render bundled flag icon backgrounds' }
      )
      .not.toBe('none');

    expect(stylesheetCdnRequests, 'marketing calendar should not load flag icons from a CDN').toEqual(
      []
    );
    expect(
      consoleListener.getErrors(),
      'marketing calendar smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('settings LLM config defaults to the direct new-api endpoint and blocks empty key model sync', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);
    const interceptedModelRequests: string[] = [];

    await page.addInitScript(() => {
      window.localStorage.removeItem('llm_active_provider');
      window.localStorage.removeItem('llm_new_api');
      window.localStorage.removeItem('secure_llm_key_new_api');
    });

    await page.route(`${DEFAULT_LLM_MODELS_URL}**`, async route => {
      interceptedModelRequests.push(route.request().url());
      await route.abort('blockedbyclient');
    });

    await openRoute(page, '/home');
    await expectNoRouteErrorText(page);
    await waitForSettingsPanel(page);

    await page.locator('#nav-more').click();
    await page.getByRole('button', { name: '全局设置' }).click();

    await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible();

    const llmSection = page.locator('#settings-section-llm');
    await expect(llmSection.getByRole('heading', { name: 'LLM 模型配置' })).toBeVisible();
    await expect(llmSection.locator('#llm-endpoint')).toHaveValue(DEFAULT_LLM_ENDPOINT);
    await expect(llmSection.locator('#llm-api-key')).toHaveValue('');

    const modelRequest = page
      .waitForRequest(request => request.url().startsWith(DEFAULT_LLM_MODELS_URL), {
        timeout: 1000,
      })
      .then(() => true)
      .catch(() => false);

    await llmSection.getByRole('button', { name: '获取模型列表' }).click();

    await expect(
      page.locator('#toast-container .toast.toast-warning .toast-content strong').last()
    ).toHaveText('请先输入 API Key');
    expect(await modelRequest, 'empty API key should not issue any direct /models request').toBe(
      false
    );
    expect(
      interceptedModelRequests,
      'empty API key should stop model sync before any direct /models request'
    ).toEqual([]);
    expect(
      consoleListener.getErrors(),
      'settings LLM smoke should not emit console/page errors'
    ).toEqual([]);
  });
});
