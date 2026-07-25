import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '@/services/storageService';
import { saveThresholds, restoreThresholds } from '@/modules/app_center/views/ppc_tools/ppc_search_terms/settings/thresholdSettings';
import {
  saveAnalysisSettings,
  restoreAnalysisSettings,
} from '@/modules/app_center/views/ppc_tools/ppc_search_terms/settings/analysisSettings';

vi.mock('@/services/storageService', () => {
  const store = new Map<string, unknown>();
  return {
    STORAGE_KEYS: {
      RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings',
    },
    StorageService: {
      get: vi.fn((key: string, fallback?: unknown) =>
        store.has(key) ? store.get(key) : (fallback ?? null)
      ),
      set: vi.fn((key: string, value: unknown) => {
        store.set(key, value);
      }),
      remove: vi.fn((key: string) => {
        store.delete(key);
      }),
      __store: store,
    },
  };
});

const store = () =>
  (StorageService as unknown as { __store: Map<string, unknown> }).__store;

beforeEach(() => {
  store().clear();
  vi.clearAllMocks();
});

describe('UT-P1-01 / UT-P1-02 stop dual-write', () => {
  it('UT-P1-01 saveThresholds does not write legacy storage key', () => {
    const setSpy = vi.spyOn(StorageService, 'set');
    saveThresholds({
      targetAcos: 40,
      highAcos: 60,
      minClicksNoOrder: 10,
      minSpendNoOrder: 12,
      minOrdersHarvest: 2,
      minCtr: 0.4,
    });

    expect(setSpy).not.toHaveBeenCalledWith(
      'ppc_search_terms_thresholds_v1',
      expect.anything()
    );
    expect(setSpy).toHaveBeenCalledWith(
      'runtime_strategy_settings',
      expect.objectContaining({
        ppcSearchTerms: expect.objectContaining({
          thresholds: expect.objectContaining({ targetAcos: 40 }),
        }),
      })
    );
  });

  it('UT-P1-02 saveAnalysisSettings does not write legacy strategy key', () => {
    const setSpy = vi.spyOn(StorageService, 'set');
    saveAnalysisSettings({
      useAgent: true,
      allowLocalFallback: true,
      useContext: false,
      context: { asin: 'B00', category: 'cat', listing: 'text' },
    });

    expect(setSpy).not.toHaveBeenCalledWith(
      'ppc_search_terms_analysis_settings_v1',
      expect.anything()
    );
    expect(setSpy).toHaveBeenCalledWith(
      'runtime_strategy_settings',
      expect.objectContaining({
        ppcSearchTerms: expect.objectContaining({
          useAgent: true,
          allowLocalFallback: true,
          useContext: false,
        }),
      })
    );
  });

  it('migrates legacy thresholds into runtime once then removes key', () => {
    store().set('ppc_search_terms_thresholds_v1', {
      targetAcos: 42,
      highAcos: 63,
      minClicksNoOrder: 18,
      minSpendNoOrder: 24,
      minOrdersHarvest: 4,
      minCtr: 0.5,
    });

    const container = document.createElement('div');
    for (const id of [
      'ppc-search-terms-target-acos',
      'ppc-search-terms-high-acos',
      'ppc-search-terms-min-clicks',
      'ppc-search-terms-min-spend',
      'ppc-search-terms-min-orders',
      'ppc-search-terms-min-ctr',
    ]) {
      const input = document.createElement('input');
      input.id = id;
      container.append(input);
    }

    restoreThresholds(container);

    expect(StorageService.remove).toHaveBeenCalledWith('ppc_search_terms_thresholds_v1');
    expect(store().get('runtime_strategy_settings')).toMatchObject({
      ppcSearchTerms: {
        thresholds: { targetAcos: 42, highAcos: 63 },
      },
    });
  });

  it('migrates legacy analysis strategy flags into runtime once then removes key', () => {
    store().set('ppc_search_terms_analysis_settings_v1', {
      useAgent: true,
      allowLocalFallback: true,
      useContext: true,
    });

    const container = document.createElement('div');
    for (const id of [
      'ppc-search-terms-use-agent',
      'ppc-search-terms-allow-local-fallback',
      'ppc-search-terms-use-context',
    ]) {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      container.append(input);
    }

    restoreAnalysisSettings(container);

    expect(StorageService.remove).toHaveBeenCalledWith(
      'ppc_search_terms_analysis_settings_v1'
    );
    expect(store().get('runtime_strategy_settings')).toMatchObject({
      ppcSearchTerms: {
        useAgent: true,
        allowLocalFallback: true,
        useContext: true,
      },
    });
  });
});
