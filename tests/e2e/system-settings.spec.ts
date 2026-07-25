// tests/e2e/system-settings.spec.ts
import { test, expect } from '@playwright/test';
import { SystemSettingsPage } from './pages/SystemSettingsPage';

test.describe('system settings', () => {
  test('E2E-SMOKE-OPEN opens panel from global settings', async ({ page }) => {
    const settings = new SystemSettingsPage(page);
    await settings.openFromNav();
    await settings.expectOpen();
  });
});
