import { test, expect } from '@playwright/test';
import {
  createKeywordHunterState,
  KEYWORD_HUNTER_ROUTES,
  seedKeywordHunterStorage
} from './keyword-hunter-fixtures';

test.describe('Keyword Hunter 处理页', () => {
  test.beforeEach(async ({ page }) => {
    await seedKeywordHunterStorage(
      page,
      createKeywordHunterState({
        paragraphs: [
          {
            original: 'Wireless earbuds with active noise cancelling and long battery life.',
            translation: '带主动降噪和长续航的无线耳机。'
          }
        ],
        translationMode: true,
        showTranslation: true
      })
    );
    await page.goto(KEYWORD_HUNTER_ROUTES.process);
    await page.waitForSelector('#kt-module-process', { timeout: 15000 });
  });

  test('恢复分析数据并支持同步回输入页', async ({ page }) => {
    await expect(page.locator('#kt-copy-display')).toContainText('Wireless earbuds');
    await expect(page.locator('#kt-copy-display')).toContainText('带主动降噪和长续航的无线耳机。');
    await expect(page.locator('#kt-stat-matched')).toHaveText('1');
    await expect(page.locator('#kt-stat-unmatched')).toHaveText('1');

    await page.locator('#kt-sync-to-input-btn').click();

    await expect(page.locator('#kt-module-input')).toBeVisible();
    await expect(page.locator('#kt-copy-input')).toHaveValue(
      'Wireless earbuds with active noise cancelling and long battery life.'
    );
  });
});
