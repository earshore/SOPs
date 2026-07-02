import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useAppStore persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('恢复旧 app-storage 时不带入历史产品快照作为当前数据', async () => {
    localStorage.setItem(
      'app-storage',
      JSON.stringify({
        version: 0,
        state: {
          ui: {
            currentTab: 'app-center',
            currentDataTab: 'preview',
            currentReportTab: 'report',
            theme: 'dark'
          },
          scraper: {
            isScraping: true,
            status: 'success',
            selectedSite: 'DE',
            scrapedData: {
              metadata: {
                scrape_timestamp: '2026-01-01T00:00:00.000Z',
                marketplace: 'DE',
                domain: 'amazon.de',
                language: 'German',
                total_asins: 1
              },
              products: [
                {
                  asin: 'B012345678',
                  url: '',
                  language: 'German',
                  productTitle: 'Historical Product',
                  feature_bullets: [],
                  customer_reviews: [],
                  scrape_status: 'success',
                  error: ''
                }
              ]
            },
            currentHistoryId: 'history-1',
            currentDataTab: 'json'
          }
        }
      })
    );

    const { appStore } = await import('@/stores/useAppStore');
    const state = appStore.getState();

    expect(state.ui.theme).toBe('dark');
    expect(state.scraper.selectedSite).toBe('DE');
    expect(state.scraper.currentDataTab).toBe('json');
    expect(state.scraper.isScraping).toBe(false);
    expect(state.scraper.scrapedData).toBeNull();
    expect(state.scraper.currentHistoryId).toBeNull();

    const persisted = JSON.parse(localStorage.getItem('app-storage') || '{}');
    expect(persisted.state.scraper.scrapedData).toBeNull();
    expect(persisted.state.scraper.currentHistoryId).toBeNull();
  });

  it('恢复 app-storage 时保留 PromptLab 生成历史', async () => {
    localStorage.setItem(
      'app-storage',
      JSON.stringify({
        version: 0,
        state: {
          promptlab: {
            currentPrompt: 'Persisted Listing Prompt',
            history: [
              {
                id: 'listing-1',
                prompt: 'Persisted Listing Prompt',
                response: '',
                timestamp: 1770000000000,
                promptType: 'listing',
                generatedAt: '2026-02-02T00:00:00.000Z',
                historyId: 'hist-001',
                asins: ['B000000001'],
                marketplace: 'US',
                profile: {
                  targetMarket: 'English',
                  keywordsTier1: 'keyword',
                  keywordsTier2: 'longtail'
                }
              }
            ]
          }
        }
      })
    );

    const { appStore } = await import('@/stores/useAppStore');
    const state = appStore.getState();

    expect(state.promptlab.currentPrompt).toBe('Persisted Listing Prompt');
    expect(state.promptlab.history?.[0]?.promptType).toBe('listing');
    expect(state.promptlab.history?.[0]?.historyId).toBe('hist-001');
  });

  it('恢复 app-storage 时清空 Keyword Hunter 页面工作数据并保留设置', async () => {
    localStorage.setItem(
      'app-storage',
      JSON.stringify({
        version: 0,
        state: {
          keywordTracker: {
            keywords: ['wireless earbuds', 'noise cancelling'],
            processedCopy: 'Wireless earbuds with active noise cancelling.',
            matchedKeywords: [{ keyword: 'wireless earbuds', count: 1 }],
            unmatchedKeywords: ['noise cancelling'],
            wordFrequency: [['wireless', 1]],
            paragraphs: [
              {
                original: 'Wireless earbuds with active noise cancelling.',
                translation: '带主动降噪的无线耳机。'
              }
            ],
            translationMode: true,
            settings: {
              matchPlural: false,
              matchStem: false,
              matchCase: true,
              matchPartial: true
            },
            keywordLocationIndex: { 'wireless earbuds': 3 },
            isWindowMinimized: true,
            trackingData: {
              asin: 'B000000001',
              keywords: [],
              lastUpdated: 1770000000000
            },
            isTracking: true,
            keywordsInputText: 'wireless earbuds\nnoise cancelling',
            copyInputText: 'Wireless earbuds with active noise cancelling.',
            llmAnalysisResult: '## 80/100 — 良好',
            showTranslation: true,
            currentSnapshotId: 'kh-history'
          }
        }
      })
    );

    const { appStore } = await import('@/stores/useAppStore');
    const state = appStore.getState().keywordTracker;

    expect(state.keywords).toEqual([]);
    expect(state.processedCopy).toBe('');
    expect(state.formattedCopy).toBe('');
    expect(state.matchedKeywords).toEqual([]);
    expect(state.unmatchedKeywords).toEqual([]);
    expect(state.wordFrequency).toEqual([]);
    expect(state.paragraphs).toEqual([]);
    expect(state.translationMode).toBe(false);
    expect(state.settings.matchCase).toBe(true);
    expect(state.settings.matchPartial).toBe(true);
    expect(state.keywordLocationIndex).toEqual({});
    expect(state.isWindowMinimized).toBe(false);
    expect(state.trackingData).toBeNull();
    expect(state.isTracking).toBe(false);
    expect(state.keywordsInputText).toBe('');
    expect(state.copyInputText).toBe('');
    expect(state.llmAnalysisResult).toBe('');
    expect(state.showTranslation).toBe(false);
    expect(state.currentSnapshotId).toBeNull();

    const persisted = JSON.parse(localStorage.getItem('app-storage') || '{}');
    expect(persisted.state.keywordTracker).toEqual(
      expect.objectContaining({
        keywords: [],
        processedCopy: '',
        matchedKeywords: [],
        paragraphs: [],
        keywordsInputText: '',
        copyInputText: '',
        llmAnalysisResult: '',
        showTranslation: false,
        currentSnapshotId: null
      })
    );
  });

  it('保存状态时不持久化 Keyword Hunter 页面工作数据', async () => {
    const { appStore } = await import('@/stores/useAppStore');

    appStore.getState().updateKeywordTracker({
      keywords: ['wireless earbuds'],
      processedCopy: 'Wireless earbuds copy',
      matchedKeywords: [{ keyword: 'wireless earbuds', count: 1 }],
      unmatchedKeywords: [],
      wordFrequency: [['wireless', 1]],
      paragraphs: [{ original: 'Wireless earbuds copy', translation: '无线耳机文案' }],
      translationMode: true,
      keywordLocationIndex: { 'wireless earbuds': 2 },
      isWindowMinimized: true,
      keywordsInputText: 'wireless earbuds',
      copyInputText: 'Wireless earbuds copy',
      llmAnalysisResult: '## 80/100 — 良好',
      showTranslation: true,
      currentSnapshotId: 'kh-current',
      settings: {
        matchPlural: false,
        matchStem: false,
        matchCase: true,
        matchPartial: true
      }
    });

    const persisted = JSON.parse(localStorage.getItem('app-storage') || '{}');

    expect(persisted.state.keywordTracker).toEqual(
      expect.objectContaining({
        keywords: [],
        processedCopy: '',
        formattedCopy: '',
        matchedKeywords: [],
        unmatchedKeywords: [],
        wordFrequency: [],
        paragraphs: [],
        translationMode: false,
        keywordsInputText: '',
        copyInputText: '',
        llmAnalysisResult: '',
        showTranslation: false,
        currentSnapshotId: null,
        settings: {
          matchPlural: false,
          matchStem: false,
          matchCase: true,
          matchPartial: true
        }
      })
    );
    expect(persisted.state.keywordTracker.keywordLocationIndex).toEqual({});
    expect(persisted.state.keywordTracker.isWindowMinimized).toBe(false);
  });

  it('支持删除 PromptLab 生成历史', async () => {
    const { appStore } = await import('@/stores/useAppStore');

    appStore.getState().addPromptHistory({
      id: 'listing-1',
      prompt: 'Listing Prompt',
      response: '',
      timestamp: 1770000000000,
      promptType: 'listing',
      generatedAt: '2026-02-02T00:00:00.000Z',
      historyId: 'hist-001',
      asins: ['B000000001'],
      marketplace: 'US',
      profile: {
        targetMarket: 'English',
        keywordsTier1: 'keyword',
        keywordsTier2: 'longtail'
      }
    });
    appStore.getState().addPromptHistory({
      id: 'visual-1',
      prompt: 'Visual Prompt',
      response: '',
      timestamp: 1770000001000,
      promptType: 'visual',
      generatedAt: '2026-02-02T00:00:01.000Z',
      historyId: 'hist-001',
      asins: ['B000000001'],
      marketplace: 'US',
      profile: {
        targetMarket: 'English',
        keywordsTier1: 'keyword',
        keywordsTier2: 'longtail'
      }
    });

    appStore.getState().removePromptHistory('listing-1');

    expect(appStore.getState().promptlab.history).toEqual([
      expect.objectContaining({ id: 'visual-1' })
    ]);
  });
});
