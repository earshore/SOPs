import { test, expect, type Page } from '@playwright/test';
import {
  createKeywordHunterState,
  KEYWORD_HUNTER_ROUTES,
  seedKeywordHunterStorage,
} from './keyword-hunter-fixtures';

const MOCK_PROVIDER = 'keyword_hunter_mock';
const MOCK_MODEL = 'mock-keyword-hunter-model';
const MOCK_ENDPOINT = 'http://localhost:5173/keyword-hunter-mock';
const MOCK_API_KEY = 'playwright-test-key';
const MOCK_PROVIDER_STORAGE = {
  llm_active_provider: JSON.stringify(MOCK_PROVIDER),
  [`llm_${MOCK_PROVIDER}`]: JSON.stringify({
    apiKey: '',
    enabled: true,
    endpoint: MOCK_ENDPOINT,
    model: MOCK_MODEL,
    provider: MOCK_PROVIDER,
  }),
  [`llm_key_${MOCK_PROVIDER}`]: JSON.stringify(MOCK_API_KEY),
};
const GENERATED_REPORT = [
  '## 88/100 — 良好',
  '',
  '### 评分',
  '',
  '| 维度 | 得分 | 评审结论 |',
  '|:--|:--|:--|',
  '| SEO覆盖 | 31/35 | 核心关键词已覆盖 |',
].join('\n');

const SEEDED_REPORT = [
  '## 80/100 — 良好',
  '',
  '### 评分',
  '',
  '| 维度 | 得分 | 评审结论 |',
  '|:--|:--|:--|',
  '| SEO覆盖 | 28/35 | 核心关键词已覆盖 |',
  '| 违规 | +0 | 未发现风险 |',
].join('\n');

async function holdMockAnalysisRequest(page: Page): Promise<{
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

  await page.route('**/keyword-hunter-mock/chat/completions', async route => {
    requestCount += 1;
    markRequestStarted();
    await releasePromise;
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      body: [
        `data: ${JSON.stringify({ choices: [{ delta: { content: GENERATED_REPORT } }] })}`,
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

async function restoreSeededSnapshotFromInput(page: Page): Promise<void> {
  await page.goto(KEYWORD_HUNTER_ROUTES.input);
  await page.waitForSelector('#keyword-hunter-module-input', { timeout: 15000 });
  await page.locator('button[title="恢复到输入页"]').first().click();
}

test.describe('Keyword Hunter 分析页', () => {
  test('不会直接显示未应用的历史报告', async ({ page }) => {
    await seedKeywordHunterStorage(
      page,
      createKeywordHunterState({
        llmAnalysisResult: SEEDED_REPORT,
      })
    );

    await page.goto(KEYWORD_HUNTER_ROUTES.analysis);
    await page.waitForSelector('#keyword-hunter-llm-analysis-result', { timeout: 15000 });

    await expect(page.locator('#keyword-hunter-llm-analysis-result')).not.toContainText('80/100');
    await expect(page.locator('#keyword-hunter-analyze-btn')).toBeDisabled();
  });

  test('应用快照后恢复当前 Markdown 报告并启用分析按钮', async ({ page }) => {
    await seedKeywordHunterStorage(
      page,
      createKeywordHunterState({
        llmAnalysisResult: SEEDED_REPORT,
      })
    );
    await restoreSeededSnapshotFromInput(page);

    await page.goto(KEYWORD_HUNTER_ROUTES.analysis);
    await page.waitForSelector('#keyword-hunter-llm-analysis-result', { timeout: 15000 });

    await expect(page.locator('#keyword-hunter-llm-analysis-result')).toContainText('80/100');
    await expect(page.locator('#keyword-hunter-llm-analysis-result')).toContainText(
      '核心关键词已覆盖'
    );
    await expect(page.locator('#keyword-hunter-analyze-btn')).toBeEnabled();
  });

  test('生成报告期间切换页面后仍显示进行中状态', async ({ page }) => {
    await seedKeywordHunterStorage(
      page,
      createKeywordHunterState(),
      MOCK_PROVIDER_STORAGE
    );
    const heldRequest = await holdMockAnalysisRequest(page);
    await restoreSeededSnapshotFromInput(page);

    await page.goto(KEYWORD_HUNTER_ROUTES.analysis);
    await page.waitForSelector('#keyword-hunter-llm-analysis-result', { timeout: 15000 });

    await expect(page.locator('#keyword-hunter-analyze-btn')).toBeEnabled();
    await page.locator('#keyword-hunter-analyze-btn').click();
    await heldRequest.requestStarted;
    await expect(page.locator('#keyword-hunter-loading-state')).toContainText(
      '正在读取文案与关键词数据'
    );

    await page.goto(KEYWORD_HUNTER_ROUTES.process);
    await expect(page.locator('#keyword-hunter-module-process')).toBeVisible();

    await page.goto(KEYWORD_HUNTER_ROUTES.analysis);
    await expect(page.locator('#keyword-hunter-loading-state')).toContainText(
      '正在读取文案与关键词数据'
    );
    await expect(page.locator('#keyword-hunter-analyze-btn-text')).toHaveText('分析中…');
    expect(heldRequest.getRequestCount()).toBe(1);

    heldRequest.releaseHeldRequest();

    await expect(page.locator('#keyword-hunter-llm-analysis-result')).toContainText('88/100', {
      timeout: 10000,
    });
    await expect(page.locator('#keyword-hunter-analyze-btn-text')).toHaveText('报告已生成');
    expect(heldRequest.getRequestCount()).toBe(1);
  });
});
