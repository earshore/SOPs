import { test, expect } from '@playwright/test';
import { clearAppStorage, KEYWORD_HUNTER_ROUTES } from './keyword-hunter-fixtures';

test.describe('Keyword Hunter 输入页', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await page.goto(KEYWORD_HUNTER_ROUTES.input);
    await page.waitForSelector('#kt-module-input', { timeout: 15000 });
  });

  test('填写关键词和文案后可以进入处理页', async ({ page }) => {
    await page.locator('#kt-keywords-input').fill([
      'wireless earbuds',
      'noise cancelling',
      'wireless earbuds'
    ].join('\n'));
    await expect(page.locator('#kt-keyword-count')).toHaveText('3');
    await expect(page.locator('#kt-duplicate-count')).toHaveText('1');

    await page.locator('#kt-btn-clean-kw').click();
    await expect(page.locator('#kt-keyword-count')).toHaveText('2');
    await expect(page.locator('#kt-keywords-input')).toHaveValue('wireless earbuds\nnoise cancelling');

    await page.locator('#kt-copy-input').fill(
      'Wireless earbuds with active noise cancelling and long battery life.'
    );
    await expect(page.locator('#copy-char-count')).not.toHaveText('0');

    await page.locator('#kt-btn-start-analysis').click();

    await expect(page.locator('#kt-module-process')).toBeVisible();
    await expect(page.locator('#kt-stat-matched')).toHaveText('2');
    await expect(page.locator('#kt-stat-unmatched')).toHaveText('0');
  });

  test('清理逗号分隔关键词后可撤回上一步', async ({ page }) => {
    const rawKeywords = 'wireless earbuds, noise cancelling; long battery-life';

    await expect(page.locator('#kt-btn-undo-kw-clean')).toBeDisabled();

    await page.locator('#kt-keywords-input').fill(rawKeywords);
    await page.locator('#kt-btn-clean-kw').click();

    await expect(page.locator('#kt-keywords-input')).toHaveValue(
      'wireless earbuds\nnoise cancelling\nlong battery-life'
    );
    await expect(page.locator('#kt-btn-undo-kw-clean')).toBeEnabled();

    await page.locator('#kt-btn-undo-kw-clean').click();

    await expect(page.locator('#kt-keywords-input')).toHaveValue(rawKeywords);
    await expect(page.locator('#kt-btn-undo-kw-clean')).toBeDisabled();
  });
});
