import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HistoryItem, KeywordHunterSnapshot } from '@/types/modules-business';
import { mount, unmount } from '@/modules/app_center/views/keyword_hunter/history';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui';
import { KeywordHunterSnapshotService } from '@/modules/app_center/views/keyword_hunter/services/snapshotService';

const historyMocks = vi.hoisted(() => {
  const template = `
    <section>
      <input id="kh-history-search" type="search" />
      <select id="kh-history-status">
        <option value="all">全部状态</option>
        <option value="draft">草稿</option>
        <option value="matched">已匹配</option>
        <option value="reported">有报告</option>
      </select>
      <span id="kh-history-count"></span>
      <button id="kh-btn-clear-compare" type="button"></button>
      <div id="kh-history-empty" class="hidden"></div>
      <div id="kh-history-list"></div>
      <div id="kh-history-detail"></div>
    </section>
  `;

  const snapshots: KeywordHunterSnapshot[] = [];
  const historyItems: HistoryItem[] = [];
  const state = {
    setCurrentHistoryId: vi.fn(),
    setScrapedData: vi.fn(),
    setAnalysisReport: vi.fn(),
    setTranslatedReport: vi.fn(),
    setSelectedSite: vi.fn(),
  };

  function createSavedSnapshot(): KeywordHunterSnapshot {
    return {
      id: 'kh-saved',
      schemaVersion: 1,
      title: 'Saved Current Snapshot',
      status: 'draft',
      createdAt: '2026-06-14T08:00:00.000Z',
      updatedAt: '2026-06-14T08:00:00.000Z',
      source: { type: 'manual' },
      input: {
        keywordsInputText: 'saved',
        copyInputText: 'saved copy',
        settings: {
          matchPlural: true,
          matchStem: true,
          matchCase: false,
          matchPartial: false,
        },
      },
      result: {
        keywords: ['saved'],
        processedCopy: 'saved copy',
        matchedKeywords: [],
        unmatchedKeywords: ['saved'],
        wordFrequency: [],
        paragraphs: [],
        llmAnalysisResult: '',
        showTranslation: false,
        translationMode: false,
        coverageRate: 0,
      },
      derived: {
        keywordCount: 1,
        matchedCount: 0,
        unmatchedCount: 1,
        copyHash: 'saved',
        snapshotFingerprint: 'saved',
      },
    };
  }

  return {
    confirm: vi.fn(() => true),
    compare: vi.fn(() => ({
      addedKeywords: ['espresso'],
      removedKeywords: [],
      newlyMatchedKeywords: ['coffee grinder'],
      newlyUnmatchedKeywords: [],
      improvedKeywords: [],
      declinedKeywords: [],
      coverageDelta: 25,
    })),
    deleteByIdAsync: vi.fn(async (id: string) => {
      const index = snapshots.findIndex((snapshot) => snapshot.id === id);
      if (index >= 0) snapshots.splice(index, 1);
      return index >= 0;
    }),
    getAllAsync: vi.fn(async () => snapshots),
    getById: vi.fn((id: string | number) =>
      historyItems.find((item) => String(item.id) === String(id)),
    ),
    historyItems,
    loadTemplate: vi.fn(async () => template),
    masterGetAllAsync: vi.fn(async () => historyItems),
    navigateTo: vi.fn(async () => undefined),
    renderTemplate: vi.fn((container: HTMLElement, html: string) => {
      container.innerHTML = html;
    }),
    restore: vi.fn(),
    saveCurrentAsync: vi.fn(async () => {
      const saved = createSavedSnapshot();
      snapshots.unshift(saved);
      return saved;
    }),
    showToast: vi.fn(),
    snapshots,
    state,
  };
});

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeModuleLoader: {
    getInstance: vi.fn(() => ({
      loadTemplate: historyMocks.loadTemplate,
    })),
  },
}));

vi.mock('@/common/infrastructure/SafeRenderer', () => ({
  SafeRenderer: {
    getInstance: vi.fn(() => ({
      renderTemplate: historyMocks.renderTemplate,
    })),
  },
}));

vi.mock('@/common/ui', () => ({
  showToast: historyMocks.showToast,
}));

vi.mock('@/modules/app_center/views/keyword_hunter/services/snapshotService', () => ({
  KeywordHunterSnapshotService: {
    compare: historyMocks.compare,
    deleteByIdAsync: historyMocks.deleteByIdAsync,
    getAllAsync: historyMocks.getAllAsync,
    restore: historyMocks.restore,
    saveCurrentAsync: historyMocks.saveCurrentAsync,
  },
}));

vi.mock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
  HistoryService: {
    getAllAsync: historyMocks.masterGetAllAsync,
    getById: historyMocks.getById,
  },
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => historyMocks.state,
  },
}));

const baseSettings = {
  matchPlural: true,
  matchStem: true,
  matchCase: false,
  matchPartial: false,
};

function createSnapshot(
  id: string,
  title: string,
  overrides: Partial<KeywordHunterSnapshot> = {},
): KeywordHunterSnapshot {
  const matchedKeywords = overrides.result?.matchedKeywords || [{ keyword: 'coffee grinder', count: 2 }];
  const unmatchedKeywords = overrides.result?.unmatchedKeywords || ['espresso'];
  const keywords = overrides.result?.keywords || ['coffee grinder', 'espresso'];

  return {
    id,
    schemaVersion: 1,
    title,
    status: overrides.status || 'matched',
    createdAt: overrides.createdAt || '2026-06-12T08:00:00.000Z',
    updatedAt: overrides.updatedAt || '2026-06-12T09:00:00.000Z',
    source: overrides.source || { type: 'manual' },
    input: overrides.input || {
      keywordsInputText: keywords.join('\n'),
      copyInputText: `${title} copy`,
      settings: baseSettings,
    },
    result: {
      keywords,
      processedCopy: `${title} processed copy`,
      matchedKeywords,
      unmatchedKeywords,
      wordFrequency: [['coffee', 2]],
      paragraphs: [],
      llmAnalysisResult: '',
      showTranslation: false,
      translationMode: false,
      coverageRate: overrides.result?.coverageRate ?? 50,
      ...overrides.result,
    },
    derived: overrides.derived || {
      keywordCount: keywords.length,
      matchedCount: matchedKeywords.length,
      unmatchedCount: unmatchedKeywords.length,
      copyHash: `${id}-copy`,
      snapshotFingerprint: `${id}-fingerprint`,
    },
  };
}

function createMasterHistoryItem(): HistoryItem {
  return {
    id: 'hist-master-1',
    timestamp: '2026-06-12T08:00:00.000Z',
    site: 'FR',
    asins: ['B08N5WRWNW'],
    data: {
      metadata: { marketplace: 'FR' },
      products: [{ asin: 'B08N5WRWNW', productTitle: 'Master Coffee Grinder' }],
      reviews: [],
    },
  } as HistoryItem;
}

function click(element: Element | null): void {
  expect(element).not.toBeNull();
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function getButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button')]
    .find((item) => item.textContent?.includes(text));
  expect(button).not.toBeUndefined();
  return button!;
}

async function mountHistory(): Promise<HTMLElement> {
  const container = document.createElement('section');
  document.body.appendChild(container);
  await mount(container);
  return container;
}

beforeEach(() => {
  unmount();
  document.body.innerHTML = '';
  vi.clearAllMocks();
  historyMocks.snapshots.splice(0, historyMocks.snapshots.length);
  historyMocks.historyItems.splice(0, historyMocks.historyItems.length);
  historyMocks.historyItems.push(createMasterHistoryItem());
  historyMocks.snapshots.push(
    createSnapshot('kh-master', 'Master Snapshot', {
      status: 'reported',
      source: {
        type: 'master-analysis',
        masterHistoryId: 'hist-master-1',
        sourceDataFingerprint: 'fp-master',
        site: 'FR',
        asins: ['B08N5WRWNW'],
        productTitle: 'Master Coffee Grinder',
      },
      result: {
        keywords: ['coffee grinder', 'espresso'],
        processedCopy: 'Master processed copy',
        matchedKeywords: [{ keyword: 'coffee grinder', count: 3 }],
        unmatchedKeywords: ['espresso'],
        wordFrequency: [['coffee', 3]],
        paragraphs: [],
        llmAnalysisResult: '# Report',
        showTranslation: false,
        translationMode: false,
        coverageRate: 50,
      },
    }),
    createSnapshot('kh-manual', 'Manual Snapshot', {
      updatedAt: '2026-06-11T09:00:00.000Z',
      source: { type: 'manual' },
    }),
  );

  Object.defineProperty(window, 'confirm', {
    configurable: true,
    value: historyMocks.confirm,
  });
  Object.defineProperty(window, 'navigateTo', {
    configurable: true,
    value: historyMocks.navigateTo,
  });
});

describe('Keyword Hunter history module', () => {
  it('renders, filters, compares, restores, deletes, saves, and opens linked Master snapshots', async () => {
    const container = await mountHistory();

    expect(SafeModuleLoader.getInstance).toHaveBeenCalled();
    expect(SafeRenderer.getInstance).toHaveBeenCalled();
    expect(historyMocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/app_center/views/keyword_hunter/history/template.html',
      expect.any(Object),
    );
    expect(container.querySelector('#kh-history-count')?.textContent).toBe('2 / 2 个快照');
    expect(container.querySelector('#kh-history-list')?.textContent).toContain('Master Snapshot');
    expect(container.querySelector('#kh-history-list')?.textContent).toContain('Manual Snapshot');

    const initialItems = container.querySelectorAll<HTMLElement>('.kh-snapshot-item');
    click(initialItems[1]);
    expect(container.querySelector('#kh-history-detail')?.textContent).toContain('Manual Snapshot');
    expect(container.querySelector('#kh-history-source')).toBeNull();

    let compareButtons = container.querySelectorAll<HTMLButtonElement>('.kh-snapshot-item .kh-icon-action');
    click(compareButtons[0]);
    compareButtons = container.querySelectorAll<HTMLButtonElement>('.kh-snapshot-item .kh-icon-action');
    click(compareButtons[1]);

    expect(KeywordHunterSnapshotService.compare).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kh-master' }),
      expect.objectContaining({ id: 'kh-manual' }),
    );
    expect(container.querySelector('#kh-history-detail')?.textContent).toContain('快照对比');

    click(container.querySelectorAll<HTMLElement>('.kh-snapshot-item')[0]);
    click(getButtonByText(container, '恢复现场'));

    expect(KeywordHunterSnapshotService.restore).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kh-master' }),
    );
    expect(historyMocks.navigateTo).toHaveBeenCalledWith('/app-center/keyword-hunter/analysis');

    click(getButtonByText(container, '打开 Master'));
    await vi.waitFor(() => {
      expect(historyMocks.masterGetAllAsync).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(historyMocks.getById).toHaveBeenCalledWith('hist-master-1');
    });
    expect(historyMocks.state.setCurrentHistoryId).toHaveBeenCalledWith('hist-master-1');
    expect(historyMocks.state.setScrapedData).toHaveBeenCalledWith(historyMocks.historyItems[0].data);
    expect(historyMocks.state.setSelectedSite).toHaveBeenCalledWith('FR');
    expect(historyMocks.navigateTo).toHaveBeenCalledWith('/app-center/scraper');

    click(getButtonByText(container, '删除'));
    await vi.waitFor(() => {
      expect(KeywordHunterSnapshotService.deleteByIdAsync).toHaveBeenCalledWith('kh-master');
    });
    expect(historyMocks.confirm).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('快照已删除', { type: 'success' });
    });

    click(getButtonByText(container, '保存当前快照'));
    await vi.waitFor(() => {
      expect(KeywordHunterSnapshotService.saveCurrentAsync).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Keyword Hunter 快照已保存', { type: 'success' });
    });
  });
});
