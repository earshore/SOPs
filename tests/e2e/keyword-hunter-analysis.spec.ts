import { test, expect } from '@playwright/test';
import {
  createKeywordHunterState,
  KEYWORD_HUNTER_ROUTES,
  seedKeywordHunterStorage
} from './keyword-hunter-fixtures';

test.describe('Keyword Hunter 分析页', () => {
  test.beforeEach(async ({ page }) => {
    await seedKeywordHunterStorage(
      page,
      createKeywordHunterState({
        llmAnalysisResult: [
          '## 80/100 — 良好',
          '',
          '### 评分',
          '',
          '| 维度 | 得分 | 评审结论 |',
          '|:--|:--|:--|',
          '| SEO覆盖 | 28/35 | 核心关键词已覆盖 |',
          '| 违规 | +0 | 未发现风险 |'
        ].join('\n')
      })
    );
    await page.goto(KEYWORD_HUNTER_ROUTES.analysis);
    await page.waitForSelector('#kt-llm-analysis-result', { timeout: 15000 });
  });

  test('恢复已生成的 Markdown 报告并启用分析按钮', async ({ page }) => {
    await expect(page.locator('#kt-llm-analysis-result')).toContainText('80/100');
    await expect(page.locator('#kt-llm-analysis-result')).toContainText('核心关键词已覆盖');
    await expect(page.locator('#kt-analyze-btn')).toBeEnabled();
  });
});
