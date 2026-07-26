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

    await settings.goToSection('工具策略');
    const general = page.locator(
      '#settings-section-tool-strategy details[data-settings-focus="general-ai-runtime"]'
    );
    await general.locator('summary').click();
    const maxRetries = general
      .locator('label')
      .filter({ hasText: '模型重试次数' })
      .locator('input[type="number"]');
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
    await settings.goToSection('工具策略');
    const general = page.locator(
      '#settings-section-tool-strategy details[data-settings-focus="general-ai-runtime"]'
    );
    await general.locator('summary').click();

    const maxRetries = general
      .locator('label')
      .filter({ hasText: '模型重试次数' })
      .locator('input[type="number"]');
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

  test('E2E-P0-03 proxy test entry is under Master Analysis 数据采集', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.goToSection('工具策略');

    // Expand Master Analysis → 数据采集 (all closed by default)
    const master = page.locator(
      '#settings-section-tool-strategy details[data-settings-focus="master-analysis"]'
    );
    await master.locator(':scope > summary').click();
    const scrape = page.locator('#settings-section-network');
    await scrape.scrollIntoViewIfNeeded();
    await scrape.locator(':scope > summary').click();
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

  test('E2E-P1-02 general AI strategy is always listed and collapsible', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.goToSection('工具策略');

    const general = page.locator(
      '#settings-section-tool-strategy details[data-settings-focus="general-ai-runtime"]'
    );
    await expect(general).toBeVisible();
    // default closed — fields not visible until expand
    await expect(general.locator('input[type="number"]').first()).toBeHidden();
    await general.locator('summary').click();
    await expect(general.locator('input[type="number"]').first()).toBeVisible();
  });

  test('E2E-P1-03 search locates PPC ACOS thresholds', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();

    await page.getByTestId('settings-search').fill('ACOS');
    const thresholds = page.locator('#ppc-thresholds');
    await expect(thresholds).toBeVisible({ timeout: 5000 });
  });

  test('E2E-P1-04 appearance section is reachable without runtime presets', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.goToSection('外观与体验');

    await expect(settings.appearanceSection()).toBeVisible();
    await expect(page.getByTestId('settings-appearance-theme')).toBeVisible();
    await expect(page.getByTestId('settings-theme-select')).toBeVisible();
    // redesigned appearance: toggles always visible in grid
    await expect(page.getByTestId('settings-animations-enabled')).toBeVisible();
    await expect(page.getByTestId('settings-respect-reduced-motion')).toBeVisible();
    await expect(
      page.locator('#settings-section-appearance [data-testid="settings-runtime-presets"]')
    ).toHaveCount(0);
  });

  test('E2E-P1-06 runtime presets live inside 通用 AI 执行策略', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.goToSection('工具策略');

    const general = page.locator(
      '#settings-section-tool-strategy details[data-settings-focus="general-ai-runtime"]'
    );
    await general.locator('summary').click();
    const presets = page.getByTestId('settings-runtime-presets');
    await expect(presets).toBeVisible();
    await expect(page.getByTestId('settings-preset-reliability')).toBeVisible();
    await expect(page.getByTestId('settings-preset-cost')).toBeVisible();
    await page.getByTestId('settings-preset-cost').click();
    await expect(presets).toBeVisible();
  });

  test('E2E-P1-07 Master Analysis lists 数据采集 before AI 智能分析 and AI is collapsible', async ({
    page,
  }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.goToSection('工具策略');
    const master = page.locator(
      '#settings-section-tool-strategy details[data-settings-focus="master-analysis"]'
    );
    await expect(master).toBeVisible();
    await master.locator(':scope > summary').click();
    const body = await master.innerHTML();
    expect(body.indexOf('settings-section-network')).toBeLessThan(
      body.indexOf('master-analysis-ai')
    );
    expect(body).toContain('AI 智能分析');
    expect(body).toContain('数据采集');

    const aiBlock = master.locator('details[data-settings-focus="master-analysis-ai"]');
    await expect(aiBlock).toBeVisible();
    // default collapsed
    await expect(aiBlock.locator('.settings-submodule__body')).toBeHidden();
    await aiBlock.locator('summary').click();
    await expect(aiBlock.locator('.settings-submodule__body')).toBeVisible();
  });

  test('E2E-P1-nav primary and secondary menu levels', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();

    const nav = page.locator('nav.settings-panel-nav');
    for (const label of ['AI 模型与连接', '工具策略', '数据与备份', '外观与体验']) {
      await expect(nav.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole('button', { name: '采集代理与网络', exact: true })).toHaveCount(0);

    // Scroll-spy may already expand the in-view group (LLM) on open.
    // Prove collapse: re-click primary when that section is current.
    const llmPrimary = nav.getByRole('button', { name: 'AI 模型与连接', exact: true });
    const llmSecondary = nav.getByRole('button', { name: '基本信息', exact: true });
    if (await llmSecondary.isVisible()) {
      await llmPrimary.click();
    }
    await expect(llmSecondary).toBeHidden();
    await llmPrimary.click();
    await expect(llmSecondary).toBeVisible();
    await expect(nav.getByRole('button', { name: '模型与能力', exact: true })).toBeVisible();

    await nav.getByRole('button', { name: '工具策略', exact: true }).click();
    await expect(nav.getByRole('button', { name: '数据采集', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Master Analysis', exact: true })).toBeVisible();
  });

  test('E2E-P1-nav secondary jump opens target submodule (数据采集)', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();

    const nav = page.locator('nav.settings-panel-nav');
    await nav.getByRole('button', { name: '工具策略', exact: true }).click();
    await nav.getByRole('button', { name: '数据采集', exact: true }).click();

    const scrape = page.locator('#settings-section-network');
    await expect(scrape).toBeVisible({ timeout: 5000 });
    // Deep-link expands ancestor details so proxy test is reachable without manual nest-click
    await expect(settings.proxyTestButton()).toBeVisible({ timeout: 5000 });
  });

  test('E2E-P1-instant runtime preset saves without dirty-close confirm', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.goToSection('工具策略');

    const general = page.locator(
      '#settings-section-tool-strategy details[data-settings-focus="general-ai-runtime"]'
    );
    await general.locator('summary').click();
    await page.getByTestId('settings-preset-cost').click();
    await expect(page.getByText('已应用并保存运行策略预设', { exact: true })).toBeVisible({
      timeout: 5000,
    });

    // Instant persist: closing must not ask to discard
    await settings.closeButton().click();
    await expect(page.getByRole('heading', { name: '放弃未保存的更改？' })).toHaveCount(0, {
      timeout: 2000,
    });
    await expect(page.getByTestId('settings-panel')).toHaveAttribute('data-state', 'closed', {
      timeout: 3000,
    });
  });

  test('E2E-P1-nav secondary jump Keyword Hunter (TD-SET-05)', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();

    const nav = page.locator('nav.settings-panel-nav');
    await nav.getByRole('button', { name: '工具策略', exact: true }).click();
    await expect(page.getByTestId('settings-nav-keyword-hunter')).toBeVisible();
    await page.getByTestId('settings-nav-keyword-hunter').click();

    const kh = page.getByTestId('settings-keyword-hunter');
    await expect(kh).toBeVisible({ timeout: 5000 });
    await expect(kh).toHaveJSProperty('open', true);
    await expect(kh.getByText('SEO 与 Listing 默认模型')).toBeVisible();
    // Scroll-spy class wiring is covered by settingsNavScroll unit tests + :class binding in HTML.
  });

  test('E2E-P1-data strategy explicit save toast (TD-SET-03)', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.goToSection('数据与备份');

    const retention = page.locator('#settings-data-retention');
    await retention.locator('summary').click();
    const history = page.getByTestId('settings-storage-history-max');
    await history.waitFor({ state: 'visible' });
    await history.fill('120');
    await page.getByTestId('settings-save-data-strategy').click();
    await expect(page.getByText('数据策略已保存', { exact: true })).toBeVisible({
      timeout: 5000,
    });

    await settings.closeButton().click();
    await expect(page.getByRole('heading', { name: '放弃未保存的更改？' })).toHaveCount(0, {
      timeout: 2000,
    });
  });
});
