// tests/e2e/system-settings.spec.ts
import { test, expect } from '@playwright/test';
import { SystemSettingsPage } from './pages/SystemSettingsPage';

test.describe('system settings', () => {
  test('E2E-SMOKE-OPEN opens panel from global settings', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.expectOpen();
  });

  test('E2E-P0-01 dirty close shows confirmation', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();

    // Navigate to tool strategy and change maxRetries (runtime partition)
    await page.getByRole('button', { name: '工具策略' }).click();
    const maxRetries = page.locator('#settings-section-tool-strategy input[type="number"]').nth(1);
    await maxRetries.waitFor({ state: 'visible' });
    await maxRetries.fill('9');

    // Prefer the close button over Escape: Escape can also dismiss the confirm
    // modal on the same keydown if confirmWithModal mounts synchronously.
    await page.getByRole('button', { name: '关闭系统设置' }).click();

    await expect(page.getByRole('heading', { name: '放弃未保存的更改？' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/未保存修改/)).toBeVisible();
  });
});
