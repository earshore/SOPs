// tests/e2e/pages/SystemSettingsPage.ts
import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class SystemSettingsPage {
  constructor(private readonly page: Page) {}

  root(): Locator {
    return this.page.getByTestId('settings-panel');
  }

  async openFromNav(): Promise<void> {
    await this.page.goto('/#/home');
    // Match release-smoke: Alpine settingsPanel must be mounted before open.
    await this.page.waitForFunction(() => {
      const root = document.querySelector('[x-data="settingsPanel"]') as
        | (HTMLElement & { _x_dataStack?: unknown[] })
        | null;
      return Array.isArray(root?._x_dataStack);
    });
    await this.page.locator('#nav-more').click();
    await this.page.getByRole('button', { name: '全局设置' }).click();
    await expect(this.page.getByRole('heading', { name: '系统设置' })).toBeVisible();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: '系统设置' })).toBeVisible();
    await expect(this.page.locator('#settings-section-llm')).toBeVisible();
  }

  saveToolStrategy(): Locator {
    return this.page.getByTestId('settings-save-tool-strategy');
  }
}
