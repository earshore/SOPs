import type { Page } from '@playwright/test';
import { expect, it, vi } from 'vitest';
import { ScraperPage } from '../e2e/pages/ScraperPage';

it('passes the scrape timeout as waitForFunction options', async () => {
  const waitForFunction = vi.fn().mockResolvedValue(undefined);
  const waitForTimeout = vi.fn().mockResolvedValue(undefined);
  const page = { waitForFunction, waitForTimeout } as unknown as Page;

  await new ScraperPage(page).waitForScrapeComplete(12_345);

  expect(waitForFunction).toHaveBeenCalledWith(expect.any(Function), undefined, {
    timeout: 12_345,
  });
});
