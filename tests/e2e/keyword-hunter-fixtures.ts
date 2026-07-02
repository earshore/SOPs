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

function createKeywordHunterSnapshot(keywordTracker: Record<string, unknown>): Record<string, unknown> {
  const keywords = (keywordTracker.keywords as string[] | undefined) || [];
  const matchedKeywords =
    (keywordTracker.matchedKeywords as Array<{ keyword: string; count: number }> | undefined) || [];
  const unmatchedKeywords = (keywordTracker.unmatchedKeywords as string[] | undefined) || [];
  const processedCopy = String(keywordTracker.processedCopy || keywordTracker.copyInputText || '');
  const llmAnalysisResult = String(keywordTracker.llmAnalysisResult || '');
  const now = new Date().toISOString();

  return {
    id: 'kh-e2e-seeded',
    schemaVersion: 1,
    title: 'Seeded Keyword Hunter Snapshot',
    status: llmAnalysisResult ? 'reported' : 'matched',
    createdAt: now,
    updatedAt: now,
    source: { type: 'manual' },
    input: {
      keywordsInputText: String(keywordTracker.keywordsInputText || keywords.join('\n')),
      copyInputText: String(keywordTracker.copyInputText || processedCopy),
      settings: keywordTracker.settings
    },
    result: {
      keywords,
      processedCopy,
      matchedKeywords,
      unmatchedKeywords,
      wordFrequency: keywordTracker.wordFrequency || [],
      paragraphs: keywordTracker.paragraphs || [],
      llmAnalysisResult,
      showTranslation: keywordTracker.showTranslation,
      translationMode: keywordTracker.translationMode,
      coverageRate: keywords.length === 0 ? 0 : Math.round((matchedKeywords.length / keywords.length) * 100)
    },
    derived: {
      keywordCount: keywords.length,
      matchedCount: matchedKeywords.length,
      unmatchedCount: unmatchedKeywords.length,
      copyHash: 'e2e',
      snapshotFingerprint: 'e2e'
    }
  };
}

export async function seedKeywordHunterStorage(
  page: Page,
  keywordTracker: Record<string, unknown> = createKeywordHunterState()
): Promise<void> {
  await page.addInitScript((snapshot) => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'keyword_hunter_snapshots',
      JSON.stringify([snapshot])
    );
  }, createKeywordHunterSnapshot(keywordTracker));
}

export async function clearAppStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
}
