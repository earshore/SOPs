import { expect, test, type Page } from '@playwright/test';

import { setupConsoleErrorListener } from '../helpers/playwright-utils';

const DEFAULT_LLM_ENDPOINT = 'https://new.hongecb.store/v1';
const DEFAULT_LLM_MODELS_URL = `${DEFAULT_LLM_ENDPOINT}/models`;
const DEEP_CHAT_PROMPT_ID = 'release-smoke-deep-chat-generated-prompt';
const DEEP_CHAT_PROMPT_MARKER = 'RELEASE_SMOKE_GENERATED_PROMPT_MARKER';

const CORE_ROUTES = [
  { label: 'Home', path: '/#/home', readySelector: '#panel-home:not(.hidden)', routeId: 'home' },
  {
    label: 'SOPs',
    path: '/#/sops',
    readySelector: '#panel-sops:not(.hidden) .sops-overview',
    routeId: 'sops_overview',
  },
  {
    label: 'App Center',
    path: '/#/app-center',
    readySelector: '#panel-app_center:not(.hidden) .app-overview-container',
    routeId: 'app_center_overview',
  },
  {
    label: 'Scraper',
    path: '/#/app-center/master-analysis/scraper',
    readySelector: '#panel-app_center:not(.hidden) [x-data="scraperPanel"]',
    routeId: 'scraper',
  },
  {
    label: 'AI Analysis',
    path: '/#/app-center/master-analysis/ai-analysis',
    readySelector: '#panel-app_center:not(.hidden) .ai-analysis-wrapper',
    routeId: 'ai_analysis',
  },
  {
    label: 'Promptlab',
    path: '/#/app-center/master-analysis/promptlab',
    readySelector: '#panel-app_center:not(.hidden) [x-data="promptlabPanel"]',
    routeId: 'promptlab',
  },
  {
    label: 'Deep Chat',
    path: '/#/app-center/playground/deep-chat',
    readySelector: '#panel-app_center:not(.hidden) #deep-chat-view',
    routeId: 'playground_deep_chat',
  },
  {
    label: 'Keyword Hunter Input',
    path: '/#/app-center/keyword-hunter/input',
    readySelector: '#panel-app_center:not(.hidden) #keyword-hunter-module-input',
    routeId: 'keyword_hunter_input',
  },
  {
    label: 'PPC Search Terms',
    path: '/#/app-center/ppc-tools/ppc-search-terms',
    readySelector: '#panel-app_center:not(.hidden) .ppc-search-terms-app',
    routeId: 'ppc_search_terms',
  },
  {
    label: 'AMZ Hub',
    path: '/#/amz-hub',
    readySelector: '#panel-amz_hub:not(.hidden) .amz-hub-overview',
    routeId: 'amz_hub_overview',
  },
  {
    label: 'More',
    path: '/#/more',
    readySelector: '#panel-more:not(.hidden) .more-overview',
    routeId: 'more_overview',
  },
  {
    label: 'Skills',
    path: '/#/more/explore/skills',
    readySelector: '#panel-more:not(.hidden) .skills-page',
    routeId: 'more_skills',
  },
] as const;

type CoreRoute = (typeof CORE_ROUTES)[number];
type AssetKind = 'script' | 'style';

interface AssetResponseEvidence {
  contentType: string;
  status: number;
  url: string;
}

interface FailedAssetRequestEvidence {
  errorText: string;
  kind: AssetKind;
  url: string;
}

function getAssetKind(url: string): AssetKind | null {
  const pathname = new URL(url).pathname;
  if (/\.(?:js|mjs)$/i.test(pathname)) return 'script';
  if (/\.css$/i.test(pathname)) return 'style';
  return null;
}

async function expectRouteReady(page: Page, route: CoreRoute): Promise<void> {
  await Promise.all([
    expect
      .poll(() => new URL(page.url()).hash, {
        message: `${route.label} should keep its canonical hash`,
      })
      .toBe(route.path.slice(1)),
    expect(page.locator('#main-content')).toHaveAttribute('data-current-route', route.routeId),
    expect(page.locator(route.readySelector)).toBeVisible(),
  ]);
}

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
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

async function expectNoSevereMobileOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - window.innerWidth;
  });

  expect(overflow, `${label} should not overflow the mobile viewport`).toBeLessThanOrEqual(24);
}

async function clearBrowserStorageBeforeLoad(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

function isLLMRequestUrl(url: string): boolean {
  return (
    url.startsWith(DEFAULT_LLM_ENDPOINT) ||
    /\/chat\/completions(?:[?#].*)?$/.test(url) ||
    /\/models(?:[?#].*)?$/.test(url) ||
    url.includes('/api/llm')
  );
}

async function seedDeepChatPromptDraftBeforeLoad(page: Page): Promise<void> {
  const now = Date.now();

  await page.addInitScript(
    ({ generatedAt, marker, promptId, timestamp }) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem(
        'app-storage',
        JSON.stringify({
          state: {
            promptlab: {
              history: [
                {
                  asins: ['B0SMOKE001'],
                  generatedAt,
                  id: promptId,
                  marketplace: 'US',
                  prompt: [
                    '# ROLE',
                    'Act as a senior Amazon listing strategist.',
                    '',
                    '# TASK',
                    `Use this generated Prompt marker: ${marker}.`,
                    'Create a concise listing improvement checklist for release smoke coverage.',
                  ].join('\n'),
                  promptType: 'listing',
                  response: '',
                  timestamp,
                },
              ],
            },
          },
          version: 0,
        })
      );
    },
    {
      generatedAt: new Date(now).toISOString(),
      marker: DEEP_CHAT_PROMPT_MARKER,
      promptId: DEEP_CHAT_PROMPT_ID,
      timestamp: now,
    }
  );
}

async function waitForSettingsPanel(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const root = document.querySelector('[x-data="settingsPanel"]') as
      | (HTMLElement & { _x_dataStack?: unknown[] })
      | null;
    return Array.isArray(root?._x_dataStack);
  });
}

async function openGlobalSettings(page: Page): Promise<void> {
  await openRoute(page, '/#/home');
  await expectNoRouteErrorText(page);
  await waitForSettingsPanel(page);

  await page.locator('#nav-more').click();
  await page.getByRole('button', { name: '全局设置' }).click();

  await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible();
  await expect(
    page.locator('#settings-section-llm').getByRole('heading', { name: 'AI 模型与连接' })
  ).toBeVisible();
}

/**
 * LLM setup uses collapsed <details> steps (凭证 / 模型与能力).
 * Expand them so endpoint, API key, and model sync controls are interactable.
 */
async function prepareLlmConnectionControls(page: Page): Promise<void> {
  const llmSection = page.locator('#settings-section-llm');
  await page
    .locator('nav.settings-panel-nav')
    .getByRole('button', { name: 'AI 模型与连接', exact: true })
    .click();

  await llmSection.locator('details.settings-llm-step').evaluateAll(nodes => {
    for (const node of nodes) {
      if (node instanceof HTMLDetailsElement) {
        node.open = true;
      }
    }
  });

  await expect(llmSection.locator('#llm-endpoint')).toBeVisible();
  await expect(llmSection.locator('#llm-api-key')).toBeVisible();
  await expect(llmSection.getByRole('button', { name: '获取模型列表' })).toBeVisible();
}

/**
 * Appearance settings are further down the panel; open the side-nav group so
 * theme + color-mode controls are visible and interactable.
 */
async function openAppearanceSettings(page: Page): Promise<void> {
  const appearanceSection = page.locator('#settings-section-appearance');
  await page
    .locator('nav.settings-panel-nav')
    .getByRole('button', { name: '外观与体验', exact: true })
    .click();

  await expect(appearanceSection).toBeVisible();
  await expect(page.getByTestId('settings-appearance-theme')).toBeVisible();
  await expect(page.getByTestId('settings-theme-select')).toBeVisible();
  await expect(page.getByTestId('settings-color-mode')).toBeVisible();
}

async function expectDocumentThemeState(
  page: Page,
  expected: { appearance: string; colorMode: string; darkClass?: boolean }
): Promise<void> {
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-appearance', expected.appearance);
  // Backward-compat: data-theme mirrors appearance id (never 'dark').
  await expect(root).toHaveAttribute('data-theme', expected.appearance);
  await expect(root).toHaveAttribute('data-color-mode', expected.colorMode);

  if (expected.darkClass === true) {
    await expect(root).toHaveClass(/\bdark\b/);
  } else if (expected.darkClass === false) {
    await expect(root).not.toHaveClass(/\bdark\b/);
  }
}

/**
 * Layer B ownership chrome must not be rewritten by Appearance (Layer A).
 * Keyword Hunter live templates use wb-theme-rose (menuConfig color: rose).
 * Prefer banner class; fall back to sidebar theme class when banner is hidden.
 */
async function expectKeywordHunterOwnershipChrome(page: Page): Promise<void> {
  const ownershipBanner = page.locator('#keyword-hunter-module-input .wb-container.wb-theme-rose');
  const ownershipSidebar = page.locator('.sidebar-shell.sidebar-theme-rose');

  if ((await ownershipBanner.count()) > 0 && (await ownershipBanner.first().isVisible())) {
    await expect(ownershipBanner.first()).toHaveClass(/\bwb-theme-rose\b/);
    return;
  }

  if ((await ownershipSidebar.count()) > 0) {
    await expect(ownershipSidebar.first()).toHaveClass(/\bsidebar-theme-rose\b/);
    return;
  }

  test.skip(
    true,
    'Keyword Hunter ownership chrome (wb-theme-rose / sidebar-theme-rose) not detectable in DOM'
  );
}

async function closeGlobalSettings(page: Page): Promise<void> {
  const settingsPanel = page.getByTestId('settings-panel');
  if ((await settingsPanel.getAttribute('data-state')) === 'closed') {
    return;
  }

  await page.getByRole('button', { name: '关闭系统设置' }).click();
  await expect(settingsPanel).toHaveAttribute('data-state', 'closed');
}

type SwitchTabTarget =
  | { kind: 'sops'; targetActionSelector: string | null }
  | { kind: 'sidebar'; menu: string; overview: string; trigger: string };

const APP_CENTER_TARGET = {
  kind: 'sidebar',
  menu: '#apps-mega-menu',
  overview: 'app_center_overview',
  trigger: '#nav-apps',
} as const;
const AMZ_HUB_TARGET = {
  kind: 'sidebar',
  menu: '#hub-mega-menu',
  overview: 'amz_hub_overview',
  trigger: '#nav-hub',
} as const;
const SWITCH_TAB_TARGETS: Record<string, SwitchTabTarget> = {
  ai_analysis: APP_CENTER_TARGET,
  amz_marketing_calendar: AMZ_HUB_TARGET,
  keyword_hunter_input: APP_CENTER_TARGET,
  playground_deep_chat: APP_CENTER_TARGET,
  ppc_search_terms: APP_CENTER_TARGET,
  promptlab: APP_CENTER_TARGET,
  scraper: APP_CENTER_TARGET,
  sops_npi_tracker: {
    kind: 'sops',
    targetActionSelector:
      '#sop-module-growth [data-action="switch-tab"][data-tab="sops_npi_tracker"]',
  },
  sops_overview: { kind: 'sops', targetActionSelector: null },
  sops_restricted_words: {
    kind: 'sops',
    targetActionSelector:
      '#sop-module-growth [data-action="switch-tab"][data-tab="sops_restricted_words"]',
  },
};

async function switchTabFromHome(page: Page, tab: string): Promise<void> {
  await openRoute(page, '/#/home');
  await expectNoRouteErrorText(page);

  const navigationTarget = SWITCH_TAB_TARGETS[tab];
  if (!navigationTarget) {
    throw new Error(`Unsupported release-smoke route target: ${tab}`);
  }

  if (navigationTarget.kind === 'sops') {
    const overviewAction = page.locator(
      '#panel-home [data-action="switch-tab"][data-tab="sops_overview"]'
    );
    await expect(overviewAction).toHaveCount(1);
    await expect(overviewAction).toBeVisible();
    await overviewAction.click();
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-current-route',
      'sops_overview'
    );
    if (!navigationTarget.targetActionSelector) return;

    const targetAction = page.locator(navigationTarget.targetActionSelector);
    await expect(targetAction).toHaveCount(1);
    await expect(targetAction).toBeVisible();
    await targetAction.click();
    await expect(page.locator('#main-content')).toHaveAttribute('data-current-route', tab);
    return;
  }

  const navTrigger = page.locator(navigationTarget.trigger);
  await expect(navTrigger).toHaveCount(1);
  await expect(navTrigger).toBeVisible();
  await navTrigger.click();

  const overviewAction = page.locator(
    `${navigationTarget.menu} [data-action="switch-tab"][data-tab="${navigationTarget.overview}"]`
  );
  await expect(overviewAction).toHaveCount(1);
  await expect(overviewAction).toBeVisible();
  await overviewAction.click();
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-current-route',
    navigationTarget.overview
  );

  const targetAction = page.locator(
    `#sidebar-btn-${tab}[data-action="switch-tab"][data-tab="${tab}"]`
  );
  await expect(targetAction).toHaveCount(1);
  const categoryGroup = targetAction.locator(
    'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " sidebar-category-group ")]'
  );
  await expect(categoryGroup).toHaveCount(1);

  const categoryToggle = categoryGroup.locator('.sidebar-category-btn');
  await expect(categoryToggle).toHaveCount(1);
  const categoryExpanded = (await categoryToggle.getAttribute('aria-expanded')) === 'true';
  if (!(await targetAction.isVisible()) && !categoryExpanded) {
    await expect(categoryToggle).toBeVisible();
    await categoryToggle.click();
  }

  await expect(targetAction).toBeVisible();
  await targetAction.click();
  await expect(page.locator('#main-content')).toHaveAttribute('data-current-route', tab);
}

test.describe('release candidate smoke', () => {
  for (const route of CORE_ROUTES) {
    test(`${route.label} renders without console or route errors`, async ({ page }) => {
      const consoleListener = setupConsoleErrorListener(page);
      const scriptResponses: AssetResponseEvidence[] = [];
      const styleResponses: AssetResponseEvidence[] = [];
      const failedAssetRequests: FailedAssetRequestEvidence[] = [];
      page.on('response', response => {
        const kind = getAssetKind(response.url());
        if (!kind) return;

        const evidence = {
          contentType: response.headers()['content-type'] ?? '',
          status: response.status(),
          url: response.url(),
        };
        if (kind === 'script') scriptResponses.push(evidence);
        else styleResponses.push(evidence);
      });
      page.on('requestfailed', request => {
        const kind = getAssetKind(request.url());
        if (!kind) return;

        failedAssetRequests.push({
          errorText: request.failure()?.errorText ?? 'unknown failure',
          kind,
          url: request.url(),
        });
      });

      await openRoute(page, route.path);
      await expectRouteReady(page, route);
      await expectNoRouteErrorText(page);
      expect(
        scriptResponses.length,
        `${route.label} should load JavaScript assets`
      ).toBeGreaterThan(0);
      expect(styleResponses.length, `${route.label} should load CSS assets`).toBeGreaterThan(0);
      for (const asset of scriptResponses) {
        expect(asset.status, asset.url).toBeGreaterThanOrEqual(200);
        expect(asset.status, asset.url).toBeLessThan(400);
        expect(asset.contentType, asset.url).toMatch(/javascript/i);
      }
      for (const asset of styleResponses) {
        expect(asset.status, asset.url).toBeGreaterThanOrEqual(200);
        expect(asset.status, asset.url).toBeLessThan(400);
        // preview 对部分动态 CSS 可能省略 Content-Type；有状态码即可，有则须为 css
        if (asset.contentType) {
          expect(asset.contentType, asset.url).toMatch(/css|stylesheet/i);
        }
      }
      expect(
        failedAssetRequests,
        `${route.label} should not have failed JavaScript or CSS requests`
      ).toEqual([]);

      expect(
        consoleListener.getErrors(),
        `${route.label} should not emit console/page errors`
      ).toEqual([]);
    });
  }

  test('core routes do not create severe mobile horizontal overflow', async ({ page }) => {
    const consoleListener = setupConsoleErrorListener(page);
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of CORE_ROUTES) {
      await openRoute(page, route.path);
      await expectRouteReady(page, route);
      await expectNoRouteErrorText(page);

      await expectNoSevereMobileOverflow(page, route.label);
      expect(
        consoleListener.getErrors(),
        `${route.label} mobile route should not emit console/page errors`
      ).toEqual([]);
    }
  });

  test('marketing calendar renders local flag icons without stylesheet CDN requests', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);
    const flagIconCdnRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('cdn.jsdelivr.net') && url.includes('flag-icons')) {
        flagIconCdnRequests.push(url);
      }
    });

    await switchTabFromHome(page, 'amz_marketing_calendar');
    await expectNoRouteErrorText(page);
    await expect(page.getByRole('heading', { name: 'EU营销日历' })).toBeVisible();

    const germanFlag = page.locator('.fi-de').first();
    await expect(germanFlag).toBeVisible();
    await expect
      .poll(
        () => germanFlag.evaluate(element => window.getComputedStyle(element).backgroundImage),
        { message: 'marketing calendar should render bundled flag icon backgrounds' }
      )
      .not.toBe('none');
    const flagBackgroundImage = await germanFlag.evaluate(
      element => window.getComputedStyle(element).backgroundImage
    );
    expect(flagBackgroundImage).not.toContain('cdn.jsdelivr.net');

    expect(flagIconCdnRequests, 'marketing calendar should not load flag icons from a CDN').toEqual(
      []
    );
    expect(
      consoleListener.getErrors(),
      'marketing calendar smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('scraper empty state and invalid ASIN input stay actionable without starting scrape', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);

    await switchTabFromHome(page, 'scraper');
    await expectNoRouteErrorText(page);

    await expect(page.locator('[x-data="scraperPanel"]')).toBeVisible();
    await expect(page.locator('#no-data-msg')).toContainText('还没有产品数据');
    await expect(page.locator('#no-data-msg')).toContainText('输入 ASIN');

    const asinInput = page.locator('#scraper-asin-input');
    const startButton = page.locator('.manual-start-button');
    const asinStatus = page.locator('#scraper-asin-status');

    if (!(await asinInput.isVisible())) {
      await page.locator('.config-header').click();
    }
    await expect(asinInput).toBeEditable();

    await expect(asinStatus).toContainText('等待输入');
    await expect(startButton).toBeDisabled();

    await asinInput.fill('INVALID-ASIN\n12345');

    await expect(asinStatus).toContainText('过滤');
    await expect(asinStatus).toContainText('2');
    await expect(startButton).toBeDisabled();

    await page.getByRole('button', { name: /清空/ }).click();

    await expect(asinInput).toHaveValue('');
    await expect(asinStatus).toContainText('等待输入');
    await expect(startButton).toBeDisabled();
    expect(
      consoleListener.getErrors(),
      'scraper invalid input smoke should not emit errors'
    ).toEqual([]);
  });

  test('AI Analysis empty data state blocks analysis and points back to data collection', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);

    await clearBrowserStorageBeforeLoad(page);
    await switchTabFromHome(page, 'ai_analysis');
    await expectNoRouteErrorText(page);

    await expect(page.locator('.ai-analysis-wrapper')).toBeVisible();
    await expect(page.getByRole('heading', { name: '还没有产品数据' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '去数据采集' }).first()).toBeVisible();
    await expect(page.locator('button:has-text("开始分析")').first()).toBeDisabled();

    expect(
      consoleListener.getErrors(),
      'AI Analysis empty-data smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('Keyword Hunter empty inputs block analysis and sample inputs reach process results', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);

    await clearBrowserStorageBeforeLoad(page);
    await switchTabFromHome(page, 'keyword_hunter_input');
    await expectNoRouteErrorText(page);

    await expect(page.locator('#keyword-hunter-module-input')).toBeVisible();
    await expect(page.locator('#keyword-hunter-input-draft-label')).toHaveText('空白');

    const startAnalysisButton = page.locator('#keyword-hunter-btn-start-analysis');
    const emptyInputToast = page.locator('#toast-container .toast').last();
    await expect(startAnalysisButton).toBeVisible();
    await expect(startAnalysisButton).toBeEnabled();
    await startAnalysisButton.click();
    await expect(emptyInputToast).toContainText('请先输入关键词和文案');
    await expect(page.locator('#keyword-hunter-module-input')).toBeVisible();
    await expect(page.locator('#keyword-hunter-module-process')).toHaveCount(0);

    await page
      .locator('#keyword-hunter-keywords-input')
      .fill(['wireless earbuds', 'noise cancelling', 'wireless earbuds'].join('\n'));
    await expect(page.locator('#keyword-hunter-keyword-count')).toHaveText('3');
    await expect(page.locator('#keyword-hunter-duplicate-count')).toHaveText('1');

    await page.locator('#keyword-hunter-btn-clean-kw').click();
    await expect(page.locator('#keyword-hunter-keyword-count')).toHaveText('2');
    await expect(page.locator('#keyword-hunter-keywords-input')).toHaveValue(
      'wireless earbuds\nnoise cancelling'
    );

    await page
      .locator('#keyword-hunter-copy-input')
      .fill('Wireless earbuds with active noise cancelling and long battery life.');
    await page.locator('#keyword-hunter-btn-start-analysis').click();

    await expect(page.locator('#keyword-hunter-module-process')).toBeVisible();
    await expect(page.locator('#keyword-hunter-stat-matched')).toHaveText('2');
    await expect(page.locator('#keyword-hunter-stat-unmatched')).toHaveText('0');

    // Floating chrome is moved onto document.body while process is mounted.
    // Leaving the route must tear it down (lifecycle / leak guard).
    await openRoute(page, '/#/home');
    await expect(page.locator('#panel-home:not(.hidden)')).toBeVisible();
    await expect(page.locator('#keyword-hunter-keywords-floating')).toHaveCount(0);
    await expect(page.locator('#keyword-hunter-keywords-minimized')).toHaveCount(0);

    expect(
      consoleListener.getErrors(),
      'Keyword Hunter smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('SOPs mobile workflow links Listing SEO to AMZ Hub SEO without overflow', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await switchTabFromHome(page, 'sops_overview');
    await expectNoRouteErrorText(page);
    await expectNoSevereMobileOverflow(page, 'SOPs overview before workflow navigation');

    const listingSeoCard = page
      .locator('.sops-overview [data-action="switch-tab"][data-tab="sops_listing_seo"]')
      .filter({ hasText: 'Listing 极致优化 (SEO) SOP' })
      .last();
    await expect(listingSeoCard).toBeVisible();
    await listingSeoCard.click();

    await expect(page).toHaveURL(/\/sops\/growth\/listing-seo/);
    await expect(page.locator('.listing-seo-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Listing 极致优化 (SEO) SOP' })).toBeVisible();
    await expectNoSevereMobileOverflow(page, 'Listing SEO SOP mobile page');

    await page
      .locator('.listing-seo-page [data-action="switch-tab"][data-tab="amz_seo_strategy"]')
      .click();

    await expect(page).toHaveURL(/\/amz-hub\/knowledge\/seo-strategy/);
    await expect(page.locator('.seo-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SEO 策略' })).toBeVisible();
    await expect(page.locator('#amz_keywordRadarChart')).toBeAttached();
    await expectNoSevereMobileOverflow(page, 'AMZ Hub SEO strategy mobile page');
    expect(
      consoleListener.getErrors(),
      'SOPs to AMZ Hub mobile smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('Restricted Words mobile search handles invalid regex and detail modal without overflow', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await switchTabFromHome(page, 'sops_restricted_words');
    await expectNoRouteErrorText(page);

    await expect(page.locator('#rw-search-input')).toBeVisible();
    await expectNoSevereMobileOverflow(page, 'Restricted Words mobile initial page');

    await page.locator('#rw-search-mode').selectOption('regex');
    await page.locator('#rw-search-input').fill('[');
    await page.locator('#rw-search-btn').click();

    await expect(page.locator('#rw-results-tbody')).toContainText('没有找到相关高危词条');
    await expect(page.locator('#rw-stats-display')).toContainText('显示 0 条结果');
    await expectNoSevereMobileOverflow(page, 'Restricted Words invalid-regex results');

    await page.locator('#rw-clear-btn').click();
    await expect(page.locator('#rw-search-input')).toHaveValue('');

    await page.locator('#rw-search-mode').selectOption('fuzzy');
    await page.locator('#rw-search-input').fill('Bamboo');
    await page.locator('#rw-search-btn').click();

    await expect(page.locator('#rw-results-tbody')).toContainText('Bamboo');
    await page.locator('#rw-results-tbody button:has-text("详情")').first().click();

    const detailModal = page.locator('#rw-detail-modal');
    await expect(detailModal).toHaveClass(/show/);
    await expect(page.locator('#rw-modal-header')).toContainText('Bamboo');
    await expect(page.locator('#rw-detail-content')).toBeVisible();
    await expectNoSevereMobileOverflow(page, 'Restricted Words detail modal');

    const closeDetailButton = detailModal.locator('[data-action="closeWordDetail"]');
    await expect
      .poll(
        async () => {
          const currentClass = (await detailModal.getAttribute('class')) || '';
          if (currentClass.includes('hidden')) {
            return currentClass;
          }
          await closeDetailButton.click({ force: true }).catch(() => undefined);
          await page.keyboard.press('Escape').catch(() => undefined);
          return (await detailModal.getAttribute('class')) || '';
        },
        {
          message: 'Restricted Words detail modal should close after a user close action',
          timeout: 10000,
        }
      )
      .toContain('hidden');
    expect(
      consoleListener.getErrors(),
      'Restricted Words mobile smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('NPI Tracker mobile table keeps Next Step modal editable after horizontal scroll', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await switchTabFromHome(page, 'sops_npi_tracker');
    await expectNoRouteErrorText(page);

    await expect(page.locator('.npi-tracker-page')).toBeVisible();
    await expect(page.locator('#npi-table-body tr').first()).toBeVisible();
    await expectNoSevereMobileOverflow(page, 'NPI Tracker mobile initial page');

    const tableScroller = page.locator('.npi-lifecycle-table-scroll');
    await tableScroller.evaluate(element => {
      element.scrollLeft = element.scrollWidth;
    });

    const firstRow = page.locator('#npi-table-body tr').first();
    const nextStepButton = firstRow.locator('button[data-action="open-next-step-editor"]');
    await nextStepButton.scrollIntoViewIfNeeded();
    await nextStepButton.click();

    const modal = page.locator('#next-step-modal');
    await expect(modal).toBeVisible();
    await expect(page.locator('#next-step-checkboxes')).toContainText('降价/Coupon');

    const viewport = page.viewportSize();
    expect(viewport, 'mobile viewport should be available').not.toBeNull();

    const dialogPanel = page.locator('#next-step-modal .modal-panel');
    await expect
      .poll(
        async () => {
          const box = await dialogPanel.boundingBox();
          if (!box || !viewport) return false;
          return box.y >= 0 && box.y + box.height <= viewport.height + 1;
        },
        {
          message: 'NPI Next Step modal should settle within the mobile viewport',
          timeout: 5000,
        }
      )
      .toBe(true);

    const dialogBox = await dialogPanel.boundingBox();
    expect(dialogBox, 'NPI Next Step modal should have a measurable dialog box').not.toBeNull();
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height + 1);

    await page.locator('#next-step-checkboxes input[value="降价/Coupon (CVR低)"]').check();
    await page.locator('button[data-action="saveNextSteps"]').click();

    await expect(modal).toBeHidden();
    await expect(firstRow.locator('td').last()).toContainText('降价/Coupon (CVR低)');
    await expectNoSevereMobileOverflow(page, 'NPI Tracker mobile after Next Step edit');
    expect(
      consoleListener.getErrors(),
      'NPI Tracker mobile smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('PPC Search Terms blocks empty input and analyzes sample data locally', async ({ page }) => {
    const consoleListener = setupConsoleErrorListener(page);

    await clearBrowserStorageBeforeLoad(page);
    await switchTabFromHome(page, 'ppc_search_terms');
    await expectNoRouteErrorText(page);

    const pasteInput = page.locator('#ppc-search-terms-paste-input');
    const parseButton = page.locator('#ppc-search-terms-btn-parse');
    await expect(pasteInput).toBeVisible();
    await expect
      .poll(
        async () => {
          const invalid = await pasteInput.getAttribute('aria-invalid').catch(() => '');
          if (invalid === 'true') {
            return invalid;
          }
          await parseButton.click().catch(() => undefined);
          return (await pasteInput.getAttribute('aria-invalid').catch(() => '')) || '';
        },
        {
          message: 'PPC Search Terms should mark empty input invalid before parsing',
          timeout: 10000,
        }
      )
      .toBe('true');
    await expect(page.locator('#ppc-search-terms-paste-error')).toContainText(
      '请先粘贴报表内容或选择报表文件'
    );
    await expect(page.locator('#ppc-search-terms-mapping-status')).toContainText(
      '没有可分析的数据'
    );

    await page.locator('#ppc-search-terms-btn-sample').click();
    await expect(page.locator('#ppc-search-terms-paste-input')).not.toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await expect(page.locator('#ppc-search-terms-paste-error')).toHaveText('');
    await expect(page.locator('#ppc-search-terms-mapping-status')).toContainText('样例数据已加载');
    await expect(page.locator('#ppc-search-terms-stat-rows')).toHaveText('0');

    const useAgent = page.locator('#ppc-search-terms-use-agent');
    if (await useAgent.isChecked()) {
      await useAgent.uncheck();
    }
    await expect(useAgent).not.toBeChecked();

    await page.locator('#ppc-search-terms-btn-parse').click();

    await expect(page.locator('#ppc-search-terms-stat-rows')).toHaveText('10');
    await expect(page.locator('#ppc-search-terms-result-count')).toContainText('共 10 行');
    await expect(page.locator('#ppc-search-terms-table-wrapper')).toBeVisible();
    await expect(page.locator('#ppc-search-terms-results-body tr')).toHaveCount(10);

    await page.locator('#ppc-search-terms-action-search').fill('wireless');
    await expect(page.locator('#ppc-search-terms-result-count')).toContainText('当前筛选');
    expect(
      consoleListener.getErrors(),
      'PPC Search Terms smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('Promptlab empty report state generates a manual Listing prompt locally without LLM requests', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);
    const llmRequestUrls: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (isLLMRequestUrl(url)) {
        llmRequestUrls.push(url);
      }
    });

    await clearBrowserStorageBeforeLoad(page);
    await switchTabFromHome(page, 'promptlab');
    await expectNoRouteErrorText(page);

    await expect(page.locator('[x-data="promptlabPanel"]')).toBeVisible();
    await page.waitForFunction(() => {
      const root = document.querySelector('[x-data="promptlabPanel"]');
      const alpine = (window as Window & { Alpine?: { $data?: (element: Element) => unknown } })
        .Alpine;
      const data =
        root && typeof alpine?.$data === 'function'
          ? (alpine.$data(root) as { generateListingPrompt?: unknown; profile?: unknown })
          : undefined;
      return !!data?.profile && typeof data.generateListingPrompt === 'function';
    });

    await expect(page.locator('#lab-analysis-status')).toContainText('未检测到分析报告');
    await expect(page.locator('#report-sections-container')).toContainText('还没有报告维度');
    await expect(page.locator('#report-sections-container')).toContainText('手动填写下方产品 DNA');

    const generateButton = page.locator('#btn-generate-prompt');
    await expect(generateButton).toBeDisabled();

    await page.locator('#lab-target-market').selectOption('English (US)');
    await page.locator('#lab-keywords-tier1').fill('wireless earbuds');
    await page.locator('#lab-keywords-tier2').fill('bluetooth 5.0, noise cancelling, waterproof');
    await page.locator('#lab-audience').fill('Remote workers who need focused calls.');
    await page.locator('#lab-usps').fill('Hybrid ANC, pocket charging case, multipoint pairing.');
    await page.locator('#lab-specs').fill('Bluetooth 5.3, 40 hour battery life, IPX5 resistance.');

    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    await expect(
      page.locator('#toast-container .toast.toast-success .toast-content strong').last()
    ).toContainText('Listing Prompt 已生成');
    await expect(page.locator('#final-prompt-output')).toHaveValue(/# ROLE/);
    await expect(page.locator('#prompt-word-count')).toHaveText(/^[1-9]/);

    const prompt = await page.locator('#final-prompt-output').inputValue();
    expect(prompt).toContain('# INPUT CONTEXT');
    expect(prompt).toContain('Manual Product DNA provided');
    expect(prompt).toContain('SEO keyword inputs provided');
    expect(prompt).toContain('AI analysis report not available');
    expect(prompt).toContain('wireless earbuds');
    expect(prompt).toContain('bluetooth 5.0');
    expect(prompt).toContain('English (US) Amazon marketplace (amazon.com)');
    expect(llmRequestUrls, 'Promptlab manual generation should not call LLM endpoints').toEqual([]);
    expect(
      consoleListener.getErrors(),
      'Promptlab manual generation smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('Deep Chat uses a generated Prompt draft without sending an LLM request', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);
    const llmRequestUrls: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (isLLMRequestUrl(url)) {
        llmRequestUrls.push(url);
      }
    });

    await seedDeepChatPromptDraftBeforeLoad(page);
    await switchTabFromHome(page, 'playground_deep_chat');
    await expectNoRouteErrorText(page);

    await expect(page.locator('#deep-chat-view')).toBeVisible();
    const promptButton = page.locator(`[data-preview-prompt-id="${DEEP_CHAT_PROMPT_ID}"]`);
    await expect(promptButton).toBeVisible();

    await promptButton.click();
    await expect(page.locator('#deep-chat-prompt-preview-popover')).toHaveClass(/is-visible/);
    await expect(page.locator('#deep-chat-prompt-preview-popover')).toContainText(
      DEEP_CHAT_PROMPT_MARKER
    );

    await page.locator(`[data-use-prompt-draft-id="${DEEP_CHAT_PROMPT_ID}"]`).click();

    const chatInput = page.locator('#deep-chat-view #text-input');
    await expect(chatInput).toContainText(DEEP_CHAT_PROMPT_MARKER, { timeout: 5000 });
    await expect(
      page.locator('#toast-container .toast.toast-success .toast-content strong').last()
    ).toContainText('已创建新会话并填入 Prompt');
    expect(llmRequestUrls, 'using a Deep Chat prompt draft should not call LLM endpoints').toEqual(
      []
    );
    expect(
      consoleListener.getErrors(),
      'Deep Chat prompt draft smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('Skills catalog loads and trial handoff opens Deep Chat without LLM requests', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);
    const llmRequestUrls: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (isLLMRequestUrl(url)) {
        llmRequestUrls.push(url);
      }
    });

    await clearBrowserStorageBeforeLoad(page);
    await openRoute(page, '/#/more/explore/skills');
    await expectNoRouteErrorText(page);

    await expect(page.locator('#panel-more:not(.hidden) .skills-page')).toBeVisible();
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-current-route',
      'more_skills'
    );
    await expect(page.locator('.skill-card').first()).toBeVisible({
      timeout: 10_000,
    });

    const tryButton = page.locator('button[data-skill-action="try-deep-chat"]').first();
    await expect(tryButton).toBeVisible({ timeout: 10_000 });
    await tryButton.click();

    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-current-route',
      'playground_deep_chat',
      { timeout: 15_000 }
    );
    await expect(page.locator('#panel-app_center:not(.hidden) #deep-chat-view')).toBeVisible({
      timeout: 15_000,
    });

    const inlineSkillChip = page.locator(
      '#deep-chat-view #text-input .deep-chat-context-chip--dismissible'
    );
    await expect(inlineSkillChip).toBeVisible({ timeout: 15_000 });
    await expect(inlineSkillChip.locator('[data-action="dismiss-skill-context"]')).toHaveCount(1);
    await expect(page.locator('#deep-chat-skill-context-bar')).toHaveCount(0);

    expect(llmRequestUrls, 'Skills trial handoff should not call LLM endpoints').toEqual([]);
    expect(
      consoleListener.getErrors(),
      'Skills trial smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('settings LLM config defaults to the direct new-api endpoint and blocks empty key model sync', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);
    const modelRequestUrls: string[] = [];

    page.on('request', request => {
      if (/\/models(?:[?#].*)?$/.test(request.url())) {
        modelRequestUrls.push(request.url());
      }
    });

    await page.addInitScript(() => {
      window.localStorage.removeItem('llm_active_provider');
      window.localStorage.removeItem('llm_new_api');
      window.localStorage.removeItem('secure_llm_key_new_api');
    });

    await page.route(/\/models(?:[?#].*)?$/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 'gpt-5.5' }] }),
      });
    });

    await openGlobalSettings(page);
    await prepareLlmConnectionControls(page);

    const llmSection = page.locator('#settings-section-llm');
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
      modelRequestUrls,
      'empty API key should stop model sync before any direct /models request'
    ).toEqual([]);

    await llmSection.locator('#llm-api-key').fill('fake-browser-key');
    const directModelRequest = page.waitForRequest(request =>
      /\/models(?:[?#].*)?$/.test(request.url())
    );

    await llmSection.getByRole('button', { name: '获取模型列表' }).click();

    const request = await directModelRequest;
    expect(request.url(), 'model sync should request the direct new-api /models endpoint').toBe(
      DEFAULT_LLM_MODELS_URL
    );
    await expect
      .poll(() => modelRequestUrls, {
        message: 'model sync should not fall back to a proxy /models endpoint',
      })
      .toEqual([DEFAULT_LLM_MODELS_URL]);
    expect(
      consoleListener.getErrors(),
      'settings LLM smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('settings LLM model sync surfaces gateway auth and rate-limit failures', async ({
    page,
  }) => {
    const modelRequests: string[] = [];
    const responses = [
      { status: 401, message: 'Invalid API key' },
      { status: 429, message: 'Rate limit exceeded' },
    ];

    await page.addInitScript(() => {
      window.localStorage.removeItem('llm_active_provider');
      window.localStorage.removeItem('llm_new_api');
      window.localStorage.removeItem('secure_llm_key_new_api');
    });

    await page.route(/\/models(?:[?#].*)?$/, async route => {
      modelRequests.push(route.request().url());
      const response = responses.shift() ?? { status: 500, message: 'Unexpected request' };
      await route.fulfill({
        status: response.status,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: response.message } }),
      });
    });

    await openGlobalSettings(page);
    await prepareLlmConnectionControls(page);

    const llmSection = page.locator('#settings-section-llm');
    const toastTitle = page.locator('#toast-container .toast .toast-content strong');
    await llmSection.locator('#llm-api-key').fill('fake-browser-key');

    await llmSection.getByRole('button', { name: '获取模型列表' }).click();
    await expect(toastTitle.filter({ hasText: 'API Key 无效或已过期' }).last()).toBeVisible();

    await llmSection.getByRole('button', { name: '获取模型列表' }).click();
    // Rate-limit uses warning toast + actionable LLM UX title (not raw gateway body).
    await expect(toastTitle.filter({ hasText: '请求过于频繁' }).last()).toBeVisible();

    expect(modelRequests).toEqual([DEFAULT_LLM_MODELS_URL, DEFAULT_LLM_MODELS_URL]);
  });

  test('settings appearance theme and color mode update document root attributes independently', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);

    await page.addInitScript(() => {
      window.localStorage.removeItem('app-theme');
      // Deterministic light starting point (new-user default is now `system`).
      window.localStorage.setItem('app-color-mode', JSON.stringify('light'));
    });

    await openGlobalSettings(page);
    await openAppearanceSettings(page);

    const themeSelect = page.getByTestId('settings-theme-select');
    await themeSelect.selectOption('minimal');
    await expect(themeSelect).toHaveValue('minimal');
    // Fresh user: preference defaults to system (T1-5); Playwright emulates light OS.
    await expectDocumentThemeState(page, {
      appearance: 'minimal',
      colorMode: 'system',
      darkClass: false,
    });

    // R4 / R7-C5: Appearance must not rewrite module ownership chrome.
    // Persist minimal, leave settings, open Keyword Hunter, assert wb-theme-rose
    // (live template class; docs still say fuchsia historically).
    await closeGlobalSettings(page);
    const keywordHunterRoute = CORE_ROUTES.find(route => route.routeId === 'keyword_hunter_input');
    if (!keywordHunterRoute) {
      throw new Error('Keyword Hunter Input missing from CORE_ROUTES');
    }
    await openRoute(page, keywordHunterRoute.path);
    await expectRouteReady(page, keywordHunterRoute);
    await expectNoRouteErrorText(page);
    await expectDocumentThemeState(page, {
      appearance: 'minimal',
      colorMode: 'system',
      darkClass: false,
    });
    await expectKeywordHunterOwnershipChrome(page);

    await openGlobalSettings(page);
    await openAppearanceSettings(page);

    await page.getByTestId('settings-color-mode-dark').click();
    await expect(page.getByTestId('settings-color-mode-dark')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // Dark mode must not wipe Appearance (Layer A stays independent of Layer M).
    await expectDocumentThemeState(page, {
      appearance: 'minimal',
      colorMode: 'dark',
      darkClass: true,
    });

    await themeSelect.selectOption('default');
    await expect(themeSelect).toHaveValue('default');
    await page.getByTestId('settings-color-mode-light').click();
    await expect(page.getByTestId('settings-color-mode-light')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expectDocumentThemeState(page, {
      appearance: 'default',
      colorMode: 'light',
      darkClass: false,
    });

    expect(
      consoleListener.getErrors(),
      'settings appearance smoke should not emit console/page errors'
    ).toEqual([]);
  });

  // D3/D11 residual: dark × minimal dual axes must coexist across KH route load.
  // Contract only (document markers + ownership chrome) — no visual baseline.
  test('dark and minimal appearance coexist on Keyword Hunter without clearing axes', async ({
    page,
  }) => {
    const consoleListener = setupConsoleErrorListener(page);

    await page.addInitScript(() => {
      window.localStorage.removeItem('app-theme');
      // Deterministic light starting point (new-user default is now `system`).
      window.localStorage.setItem('app-color-mode', JSON.stringify('light'));
    });

    await openGlobalSettings(page);
    await openAppearanceSettings(page);

    const themeSelect = page.getByTestId('settings-theme-select');
    await themeSelect.selectOption('minimal');
    await expect(themeSelect).toHaveValue('minimal');

    await page.getByTestId('settings-color-mode-dark').click();
    await expect(page.getByTestId('settings-color-mode-dark')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Appearance must not clear color mode; color mode must not clear appearance.
    await expectDocumentThemeState(page, {
      appearance: 'minimal',
      colorMode: 'dark',
      darkClass: true,
    });

    await closeGlobalSettings(page);
    const keywordHunterRoute = CORE_ROUTES.find(route => route.routeId === 'keyword_hunter_input');
    if (!keywordHunterRoute) {
      throw new Error('Keyword Hunter Input missing from CORE_ROUTES');
    }
    await openRoute(page, keywordHunterRoute.path);
    await expectRouteReady(page, keywordHunterRoute);
    await expectNoRouteErrorText(page);
    await expectDocumentThemeState(page, {
      appearance: 'minimal',
      colorMode: 'dark',
      darkClass: true,
    });
    // Layer B rose ownership must survive dark + minimal (Layer A / Layer M).
    await expectKeywordHunterOwnershipChrome(page);

    expect(
      consoleListener.getErrors(),
      'dark × minimal Keyword Hunter smoke should not emit console/page errors'
    ).toEqual([]);
  });

  test('minimal appearance persists on Promptlab without console errors', async ({ page }) => {
    const consoleListener = setupConsoleErrorListener(page);

    await page.addInitScript(() => {
      window.localStorage.removeItem('app-theme');
      // Deterministic light starting point (new-user default is now `system`).
      window.localStorage.setItem('app-color-mode', JSON.stringify('light'));
    });

    await openGlobalSettings(page);
    await openAppearanceSettings(page);

    const themeSelect = page.getByTestId('settings-theme-select');
    await themeSelect.selectOption('minimal');
    await expect(themeSelect).toHaveValue('minimal');
    // Fresh user: preference defaults to system (T1-5); Playwright emulates light OS.
    await expectDocumentThemeState(page, {
      appearance: 'minimal',
      colorMode: 'system',
      darkClass: false,
    });

    // R4: Appearance (Layer A) must survive Master Analysis route loads and must not
    // rewrite ownership chrome (wb-theme-indigo on Promptlab).
    await closeGlobalSettings(page);
    const promptlabRoute = CORE_ROUTES.find(route => route.routeId === 'promptlab');
    if (!promptlabRoute) {
      throw new Error('Promptlab missing from CORE_ROUTES');
    }
    await openRoute(page, promptlabRoute.path);
    await expectRouteReady(page, promptlabRoute);
    await expectNoRouteErrorText(page);
    await expectDocumentThemeState(page, {
      appearance: 'minimal',
      colorMode: 'system',
      darkClass: false,
    });

    // Soft ownership check: if indigo banner is in DOM, class must still be present.
    const indigoBanner = page.locator(
      '#panel-app_center:not(.hidden) .wb-container.wb-theme-indigo'
    );
    if ((await indigoBanner.count()) > 0 && (await indigoBanner.first().isVisible())) {
      await expect(indigoBanner.first()).toHaveClass(/\bwb-theme-indigo\b/);
    }

    expect(
      consoleListener.getErrors(),
      'minimal appearance Promptlab smoke should not emit console/page errors'
    ).toEqual([]);
  });
});
