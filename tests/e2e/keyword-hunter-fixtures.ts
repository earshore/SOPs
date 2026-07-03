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
  const context = createKeywordHunterSnapshotContext(keywordTracker);
  const now = new Date().toISOString();

  return {
    id: 'kh-e2e-seeded',
    schemaVersion: 1,
    title: 'Seeded Keyword Hunter Snapshot',
    status: context.llmAnalysisResult ? 'reported' : 'matched',
    createdAt: now,
    updatedAt: now,
    source: { type: 'manual' },
    input: createSnapshotInput(keywordTracker, context),
    result: createSnapshotResult(keywordTracker, context),
    derived: createSnapshotDerived(context)
  };
}

function createKeywordHunterSnapshotContext(keywordTracker: Record<string, unknown>) {
  const keywords = getStringArray(keywordTracker.keywords);
  const matchedKeywords = getMatchedKeywords(keywordTracker.matchedKeywords);

  return {
    keywords,
    matchedKeywords,
    unmatchedKeywords: getStringArray(keywordTracker.unmatchedKeywords),
    processedCopy: String(keywordTracker.processedCopy || keywordTracker.copyInputText || ''),
    llmAnalysisResult: String(keywordTracker.llmAnalysisResult || '')
  };
}

function getStringArray(value: unknown): string[] {
  return (value as string[] | undefined) || [];
}

function getMatchedKeywords(value: unknown): Array<{ keyword: string; count: number }> {
  return (value as Array<{ keyword: string; count: number }> | undefined) || [];
}

function createSnapshotInput(
  keywordTracker: Record<string, unknown>,
  context: ReturnType<typeof createKeywordHunterSnapshotContext>
): Record<string, unknown> {
  return {
    keywordsInputText: String(keywordTracker.keywordsInputText || context.keywords.join('\n')),
    copyInputText: String(keywordTracker.copyInputText || context.processedCopy),
    settings: keywordTracker.settings
  };
}

function createSnapshotResult(
  keywordTracker: Record<string, unknown>,
  context: ReturnType<typeof createKeywordHunterSnapshotContext>
): Record<string, unknown> {
  return {
    keywords: context.keywords,
    processedCopy: context.processedCopy,
    matchedKeywords: context.matchedKeywords,
    unmatchedKeywords: context.unmatchedKeywords,
    wordFrequency: keywordTracker.wordFrequency || [],
    paragraphs: keywordTracker.paragraphs || [],
    llmAnalysisResult: context.llmAnalysisResult,
    showTranslation: keywordTracker.showTranslation,
    translationMode: keywordTracker.translationMode,
    coverageRate: calculateKeywordCoverage(context.keywords, context.matchedKeywords)
  };
}

function calculateKeywordCoverage(
  keywords: string[],
  matchedKeywords: Array<{ keyword: string; count: number }>
): number {
  return keywords.length === 0 ? 0 : Math.round((matchedKeywords.length / keywords.length) * 100);
}

function createSnapshotDerived(
  context: ReturnType<typeof createKeywordHunterSnapshotContext>
): Record<string, unknown> {
  return {
    keywordCount: context.keywords.length,
    matchedCount: context.matchedKeywords.length,
    unmatchedCount: context.unmatchedKeywords.length,
    copyHash: 'e2e',
    snapshotFingerprint: 'e2e'
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
