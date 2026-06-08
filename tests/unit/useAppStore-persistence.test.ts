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
});
