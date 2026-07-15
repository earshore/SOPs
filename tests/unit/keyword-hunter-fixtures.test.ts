import type { Page } from '@playwright/test';
import { expect, it } from 'vitest';
import { createKeywordHunterState, seedKeywordHunterStorage } from '../e2e/keyword-hunter-fixtures';

it('seeds the snapshot and additional storage in one init script', async () => {
  const additionalStorage = {
    llm_active_provider: JSON.stringify('keyword_hunter_mock'),
    llm_keyword_hunter_mock: JSON.stringify({ provider: 'keyword_hunter_mock' }),
    llm_key_keyword_hunter_mock: JSON.stringify('playwright-test-key'),
  };
  let initScriptCount = 0;
  const page = {
    addInitScript: async (script: (payload: unknown) => void, payload: unknown): Promise<void> => {
      initScriptCount += 1;
      script(payload);
    },
  } as unknown as Page;
  localStorage.setItem('stale-key', 'stale-value');

  await seedKeywordHunterStorage(page, createKeywordHunterState(), additionalStorage);

  expect(initScriptCount).toBe(1);
  expect(localStorage.getItem('stale-key')).toBeNull();
  expect(JSON.parse(localStorage.getItem('keyword_hunter_snapshots') || '[]')).toHaveLength(1);
  for (const [key, value] of Object.entries(additionalStorage)) {
    expect(localStorage.getItem(key)).toBe(value);
  }
});
