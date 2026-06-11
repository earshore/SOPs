import { expect, test } from '@playwright/test';

const routes = {
  scraper: '/#/app-center/scraper',
  aiAnalysis: '/#/app-center/ai-analysis',
  promptlab: '/#/app-center/promptlab'
};

async function openMasterAnalysisPage(page: import('@playwright/test').Page, route: string, readySelector: string) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);
  await expect(page.locator(readySelector)).toBeVisible();
  await expect(page.locator('.ma-workflow-step')).toHaveCount(3);
}

test.describe('Master Analysis PC 工作流体验', () => {
  test('三步流程条在 PC 端保持清晰并支持跨页跳转', async ({ page }) => {
    await openMasterAnalysisPage(page, routes.scraper, '[x-data="scraperPanel"]');
    await expect(page.locator('.ma-workflow-step.is-active .ma-workflow-title')).toHaveText('数据采集');
    await expect(page.locator('.ma-workflow')).toContainText('AI 分析');
    await expect(page.locator('.ma-workflow')).toContainText('Prompt 生成');

    await openMasterAnalysisPage(page, routes.aiAnalysis, '[x-data="aiAnalysisPanel"]');
    await expect(page.locator('.ma-workflow-step.is-active .ma-workflow-title')).toHaveText('AI 分析');
    await expect(page.getByRole('heading', { name: /执行 AI 分析|AI 正在分析中|分析完成/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /性能设置/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /开始分析|分析中/ })).toBeVisible();

    await openMasterAnalysisPage(page, routes.promptlab, '[x-data="promptlabPanel"]');
    await expect(page.locator('.ma-workflow-step.is-active .ma-workflow-title')).toHaveText('Prompt 生成');
    await expect(page.getByText('Product DNA Supplement')).toHaveCount(0);
    await expect(page.getByText('Insights Injection')).toHaveCount(0);
    await expect(page.getByText('Strategy', { exact: true })).toHaveCount(0);
    await expect(page.locator('button[title^="从AI分析报告自动提取"]:visible')).toHaveCount(0);
    await expect(page.locator('button[title="仅重新提取此字段"]:visible')).toHaveCount(0);

    await page.locator('.ma-workflow-step[data-tab="ai_analysis"]').click();
    await expect(page).toHaveURL(/#\/app-center\/ai-analysis$/);
    await expect(page.locator('[x-data="aiAnalysisPanel"]')).toBeVisible();
    await expect(page.locator('.ma-workflow-step.is-active .ma-workflow-title')).toHaveText('AI 分析');
  });
});
