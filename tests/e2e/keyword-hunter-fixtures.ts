import type { Page } from '@playwright/test';

export const KEYWORD_HUNTER_ROUTES = {
  input: '/#/app-center/keyword-hunter/input',
  process: '/#/app-center/keyword-hunter/process',
  analysis: '/#/app-center/keyword-hunter/analysis'
} as const;

export function createKeywordHunterState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    keywords: ['wireless earbuds', 'noise cancelling'],
    processedCopy: 'Wireless earbuds with active noise cancelling and long battery life.',
    formattedCopy: '',
    matchedKeywords: [{ keyword: 'wireless earbuds', count: 1 }],
    unmatchedKeywords: ['noise cancelling'],
    wordFrequency: [
      ['wireless', 1],
      ['earbuds', 1],
      ['active', 1],
      ['noise', 1],
      ['cancelling', 1]
    ],
    paragraphs: [],
    translationMode: false,
    keywordLocationIndex: {},
    settings: {
      matchPlural: true,
      matchStem: true,
      matchCase: false,
      matchPartial: false
    },
    isWindowMinimized: false,
    trackingData: null,
    isTracking: false,
    keywordsInputText: 'wireless earbuds\nnoise cancelling',
    copyInputText: 'Wireless earbuds with active noise cancelling and long battery life.',
    llmAnalysisResult: '',
    showTranslation: false,
    ...overrides
  };
}

export async function seedKeywordHunterStorage(
  page: Page,
  keywordTracker: Record<string, unknown> = createKeywordHunterState()
): Promise<void> {
  await page.addInitScript((state) => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'app-storage',
      JSON.stringify({
        version: 0,
        state: {
          keywordTracker: state
        }
      })
    );
  }, keywordTracker);
}

export async function clearAppStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
}
