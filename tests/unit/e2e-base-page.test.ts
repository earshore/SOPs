import type { Page } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';
import { BasePage } from '../e2e/pages/BasePage';

class TestPage extends BasePage {}

describe('BasePage navigation', () => {
  it('passes relative app routes to Playwright unchanged', async () => {
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
    } as unknown as Page;
    const testPage = new TestPage(page);

    await testPage.navigate('/#/app-center/master-analysis/ai-analysis');

    expect(page.goto).toHaveBeenCalledWith('/#/app-center/master-analysis/ai-analysis', {
      waitUntil: 'domcontentloaded',
    });
  });
});
