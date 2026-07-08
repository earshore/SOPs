import { beforeEach, describe, expect, it, vi } from 'vitest';
import eventBus from '@/common/EventBus';
import type { HistoryItem, ScrapedData } from '@/types/modules-business';
import {
  APP_CENTER_WORKSPACE_CONTEXT_CHANGED,
  APP_CENTER_WORKSPACE_CONTEXT_STORAGE_KEY,
  clearWorkspaceContext,
  getWorkspaceContext,
  setWorkspaceContext,
  setWorkspaceContextFromHistoryItem,
} from '@/modules/app_center/workspaceContext';

function createScrapedData(): ScrapedData {
  return {
    metadata: {
      scrape_timestamp: '2026-01-01T00:00:00.000Z',
      marketplace: 'DE',
      domain: 'amazon.de',
      language: 'German',
      total_asins: 2,
    },
    products: [
      {
        asin: 'B000000001',
        url: '',
        language: 'German',
        productTitle: 'First product',
        feature_bullets: [],
        customer_reviews: [],
        scrape_status: 'success',
        error: '',
      },
      {
        asin: 'B000000002',
        url: '',
        language: 'German',
        productTitle: 'Second product',
        feature_bullets: [],
        customer_reviews: [],
        scrape_status: 'success',
        error: '',
      },
    ],
  };
}

function createHistoryItem(): HistoryItem {
  return {
    id: 'hist-001',
    timestamp: '2026-01-01T00:00:00.000Z',
    site: 'DE',
    asins: ['B000000001', 'B000000002'],
    data: createScrapedData(),
  };
}

describe('App Center workspace context', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('derives the current work context from a saved scraper history item', () => {
    const emit = vi.spyOn(eventBus, 'emit');

    const context = setWorkspaceContextFromHistoryItem(createHistoryItem(), 'scraper');

    expect(context).toMatchObject({
      workItemId: 'competitor_listing:hist-001',
      marketplace: 'DE',
      language: 'German',
      asinOrSku: 'B000000001, B000000002',
      sourceRoute: 'scraper',
    });
    expect(context.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(getWorkspaceContext()).toEqual(context);
    expect(emit).toHaveBeenCalledWith(APP_CENTER_WORKSPACE_CONTEXT_CHANGED, context);
  });

  it('patches only the supported v1 fields and persists them locally', () => {
    const context = setWorkspaceContext({
      marketplace: 'FR',
      language: 'French',
      asinOrSku: 'SKU-123',
      sourceRoute: 'promptlab',
    });

    expect(context).toMatchObject({
      workItemId: null,
      marketplace: 'FR',
      language: 'French',
      asinOrSku: 'SKU-123',
      sourceRoute: 'promptlab',
    });
    expect(
      JSON.parse(localStorage.getItem(APP_CENTER_WORKSPACE_CONTEXT_STORAGE_KEY) || '{}')
    ).toEqual(context);
  });

  it('falls back to an empty context when persisted storage is invalid', () => {
    localStorage.setItem(
      APP_CENTER_WORKSPACE_CONTEXT_STORAGE_KEY,
      JSON.stringify({ workItemId: 42, marketplace: 'DE' })
    );

    expect(getWorkspaceContext()).toEqual({
      workItemId: null,
      marketplace: '',
      language: '',
      asinOrSku: '',
      sourceRoute: '',
      updatedAt: '',
    });
  });

  it('clears the context and emits the reset payload', () => {
    const emit = vi.spyOn(eventBus, 'emit');
    setWorkspaceContext({ workItemId: 'competitor_listing:hist-001', marketplace: 'DE' });
    emit.mockClear();

    const context = clearWorkspaceContext();

    expect(context.workItemId).toBeNull();
    expect(context.marketplace).toBe('');
    expect(getWorkspaceContext()).toEqual(context);
    expect(emit).toHaveBeenCalledWith(APP_CENTER_WORKSPACE_CONTEXT_CHANGED, context);
  });
});
