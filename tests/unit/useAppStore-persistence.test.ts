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
