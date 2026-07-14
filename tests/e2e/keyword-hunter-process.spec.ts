import { test, expect, type Page } from '@playwright/test';
import {
  createKeywordHunterState,
  KEYWORD_HUNTER_ROUTES,
  seedKeywordHunterStorage,
} from './keyword-hunter-fixtures';

const MOCK_PROVIDER = 'keyword_hunter_process_mock';
const MOCK_MODEL = 'mock-keyword-hunter-process-model';
const MOCK_ENDPOINT = 'http://localhost:5173/keyword-hunter-process-mock';
const TRANSLATED_COPY = '带主动降噪和长续航的无线耳机。';

async function restoreSeededSnapshotFromInput(page: Page): Promise<void> {
  await page.goto(KEYWORD_HUNTER_ROUTES.input);
  await page.waitForSelector('#keyword-hunter-module-input', { timeout: 15000 });
  await page.locator('button[title="恢复到输入页"]').first().click();
}

async function openProcessWithState(
  page: Page,
  keywordTracker: Record<string, unknown>
): Promise<void> {
  await seedKeywordHunterStorage(page, keywordTracker);
  await restoreSeededSnapshotFromInput(page);
  await page.goto(KEYWORD_HUNTER_ROUTES.process);
  await page.waitForSelector('#keyword-hunter-module-process', { timeout: 15000 });
}

async function configureMockLLMProvider(page: Page): Promise<void> {
  await page.evaluate(
    ({ endpoint, model, provider }) => {
      window.localStorage.setItem('llm_active_provider', JSON.stringify(provider));
      window.localStorage.setItem(
        `llm_${provider}`,
        JSON.stringify({
          apiKey: '',
          enabled: true,
          endpoint,
          model,
          provider,
        })
      );
    },
    { endpoint: MOCK_ENDPOINT, model: MOCK_MODEL, provider: MOCK_PROVIDER }
  );

  await page.waitForFunction(() =>
    Boolean((window as Window & { SecureStorage?: unknown }).SecureStorage)
  );
  await page.evaluate(async provider => {
    const secureStorage = (
      window as Window & {
        SecureStorage?: { setSecure: (key: string, value: unknown) => Promise<boolean> };
      }
    ).SecureStorage;
    if (!secureStorage) {
      throw new Error('SecureStorage is not available');
    }
    await secureStorage.setSecure(`llm_key_${provider}`, 'playwright-test-key');
  }, MOCK_PROVIDER);
}

async function holdMockTranslationRequest(page: Page): Promise<{
  getRequestCount: () => number;
  releaseHeldRequest: () => void;
  requestStarted: Promise<void>;
}> {
  let requestCount = 0;
  let releaseHeldRequest = (): void => {};
  const releasePromise = new Promise<void>(resolve => {
    releaseHeldRequest = resolve;
  });
  let markRequestStarted = (): void => {};
  const requestStarted = new Promise<void>(resolve => {
    markRequestStarted = resolve;
  });

  await page.route('**/keyword-hunter-process-mock/chat/completions', async route => {
    requestCount += 1;
    markRequestStarted();
    await releasePromise;
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      body: [
        `data: ${JSON.stringify({ choices: [{ delta: { content: `【1】 ${TRANSLATED_COPY}` } }] })}`,
        'data: [DONE]',
        '',
      ].join('\n\n'),
    });
  });

  return {
    getRequestCount: () => requestCount,
    releaseHeldRequest,
    requestStarted,
  };
}

test.describe('Keyword Hunter 处理页', () => {
  test('恢复分析数据并展示匹配统计与词云图例', async ({ page }) => {
    await openProcessWithState(
      page,
      createKeywordHunterState({
        paragraphs: [
          {
            original: 'Wireless earbuds with active noise cancelling and long battery life.',
            translation: TRANSLATED_COPY,
          },
        ],
        translationMode: true,
        showTranslation: true,
      })
    );

    await expect(page.locator('#keyword-hunter-copy-display')).toContainText('Wireless earbuds');
    await expect(page.locator('#keyword-hunter-copy-display')).toContainText(TRANSLATED_COPY);
    await expect(page.locator('#keyword-hunter-stat-matched')).toHaveText('1');
    await expect(page.locator('#keyword-hunter-stat-unmatched')).toHaveText('1');
    await expect(page.locator('.keyword-hunter-word-legend')).toBeVisible();
    await expect(page.locator('.keyword-hunter-word-legend-swatch--matched')).toBeVisible();
    await expect(page.locator('.keyword-hunter-word-legend-swatch--unmatched')).toBeVisible();
    await expect(page.locator('.keyword-hunter-word-legend-swatch--other')).toBeVisible();
    await expect(page.locator('#keyword-hunter-sync-to-input-btn')).toHaveCount(0);
  });

  test('翻译期间切换页面后仍显示进行中状态', async ({ page }) => {
    await openProcessWithState(page, createKeywordHunterState());
    await configureMockLLMProvider(page);
    const heldRequest = await holdMockTranslationRequest(page);

    await expect(page.locator('#keyword-hunter-translate-btn')).toBeEnabled();
    await page.locator('#keyword-hunter-translate-btn').click();
    await heldRequest.requestStarted;
    await expect(page.locator('#keyword-hunter-translate-btn-text')).toHaveText('正在翻译...');
    await expect(page.locator('#keyword-hunter-translate-progress')).not.toHaveClass(/hidden/);

    await page.goto(KEYWORD_HUNTER_ROUTES.input);
    await expect(page.locator('#keyword-hunter-module-input')).toBeVisible();

    await page.goto(KEYWORD_HUNTER_ROUTES.process);
    await expect(page.locator('#keyword-hunter-module-process')).toBeVisible();
    await expect(page.locator('#keyword-hunter-translate-btn-text')).toHaveText('正在翻译...');
    await expect(page.locator('#keyword-hunter-translate-progress')).not.toHaveClass(/hidden/);
    expect(heldRequest.getRequestCount()).toBe(1);

    heldRequest.releaseHeldRequest();

    await expect(page.locator('#keyword-hunter-copy-display')).toContainText(TRANSLATED_COPY, {
      timeout: 10000,
    });
    await expect(page.locator('#keyword-hunter-translate-btn-text')).toHaveText('翻译已完成');
    expect(heldRequest.getRequestCount()).toBe(1);
  });
});
