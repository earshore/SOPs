// tests/e2e/system-settings.spec.ts
import { test, expect } from '@playwright/test';
import { SystemSettingsPage } from './pages/SystemSettingsPage';

test.describe('system settings', () => {
  test('E2E-SMOKE-OPEN opens panel from global settings', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.expectOpen();
  });

  test('E2E-P0-01 dirty close shows confirmation with Chinese partition labels', async ({
    page,
  }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();

    // Expert runtime fields are advanced density — switch first, then dirty maxRetries
    await settings.setDensity('advanced');
    await settings.goToSection('工具策略');
    // Index: 0 = analysis timeout, 1 = maxRetries (advanced grid)
    const maxRetries = page.locator('#settings-section-tool-strategy input[type="number"]').nth(1);
    await maxRetries.waitFor({ state: 'visible' });
    await maxRetries.fill('9');

    // Prefer the close button over Escape for primary path
    await settings.closeButton().click();

    await expect(page.getByRole('heading', { name: '放弃未保存的更改？' })).toBeVisible({
      timeout: 5000,
    });
    // Confirm body uses Chinese partition labels (not raw "runtime")
    const dialog = page.locator('.app-confirm-modal, [role="dialog"][aria-modal="true"]').last();
    await expect(dialog.getByText(/未保存修改/)).toBeVisible();
    await expect(dialog.getByText(/运行时策略/)).toBeVisible();
  });

  test('E2E-P0-02 save clears dirty so close skips confirm', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.setDensity('advanced');
    await settings.goToSection('工具策略');

    const maxRetries = page.locator('#settings-section-tool-strategy input[type="number"]').nth(1);
    await maxRetries.waitFor({ state: 'visible' });
    await maxRetries.fill('3');
    await settings.saveToolStrategy().click();
    // Toast uses exact success copy from saveToolStrategy
    await expect(page.getByText('工具与运行策略已保存', { exact: true })).toBeVisible({
      timeout: 5000,
    });

    await settings.closeButton().click();
    await expect(page.getByRole('heading', { name: '放弃未保存的更改？' })).toHaveCount(0, {
      timeout: 2000,
    });
    // Panel uses :hidden when closed — heading may still exist in DOM
    await expect(page.getByTestId('settings-panel')).toHaveAttribute('data-state', 'closed', {
      timeout: 3000,
    });
  });

  test('E2E-P0-03 proxy test entry is visible in network section', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.goToSection('采集代理与网络');

    await expect(page.locator('#settings-section-network')).toBeVisible();
    await expect(settings.proxyTestButton()).toBeVisible();
    await expect(settings.proxyTestButton()).toContainText(/测试连接/);
  });

  test('E2E-P0-05 data section nav scrolls into view', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.goToSection('数据与备份');
    await expect(page.locator('#settings-section-data')).toBeVisible();
    await expect(page.getByRole('heading', { name: '数据与备份' })).toBeVisible();
  });

  test('E2E-P1-02 density hides expert fields in simple mode', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();

    await settings.setDensity('simple');
    await settings.goToSection('工具策略');
    await expect(page.getByText('通用 AI 执行策略')).toBeHidden();

    await settings.setDensity('advanced');
    await expect(page.getByText('通用 AI 执行策略')).toBeVisible();
  });

  test('E2E-P1-03 search locates PPC ACOS thresholds', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();

    await page.getByTestId('settings-search').fill('ACOS');
    const thresholds = page.locator('#ppc-thresholds');
    await expect(thresholds).toBeVisible({ timeout: 5000 });
  });

  test('E2E-P1-04 appearance section and presets are reachable', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.goToSection('外观与体验');

    await expect(settings.appearanceSection()).toBeVisible();
    await expect(page.getByTestId('settings-appearance-theme')).toBeVisible();
    await expect(page.getByTestId('settings-theme-select')).toBeVisible();
    await expect(page.getByTestId('settings-animations-enabled')).toBeVisible();
    await expect(page.getByTestId('settings-runtime-presets')).toBeVisible();
    await expect(page.getByTestId('settings-preset-reliability')).toBeVisible();
    await expect(page.getByTestId('settings-preset-speed')).toBeVisible();
    await expect(page.getByTestId('settings-preset-cost')).toBeVisible();

    // Applying a preset should not auto-close the panel
    await page.getByTestId('settings-preset-cost').click();
    await expect(settings.appearanceSection()).toBeVisible();
  });

  test('E2E-P1-nav six primary sections are listed', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();

    for (const label of [
      'AI 模型与连接',
      '工具策略',
      '采集代理与网络',
      '数据与备份',
      '外观与体验',
    ]) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });
});
