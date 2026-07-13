import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPpcActionListSnapshots,
  consumePpcActionListResume,
  getPpcActionListSnapshotById,
  queuePpcActionListResume,
  savePpcActionListSnapshot,
  updatePpcActionListReview,
} from '@/modules/app_center/views/ppc_tools/ppc_search_terms/export/actionListSnapshotService';
import type { AnalyzedRow } from '@/modules/app_center/views/ppc_tools/ppc_search_terms/types';

const storeMocks = vi.hoisted(() => ({
  value: null as unknown,
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/services/localDataStore', () => ({
  LocalDataStore: {
    get: storeMocks.get,
    set: storeMocks.set,
    remove: storeMocks.remove,
  },
}));

function createRow(): AnalyzedRow {
  return {
    id: 'row-1',
    reportType: 'search_term',
    campaign: 'Campaign',
    adGroup: 'Ad group',
    searchTerm: 'waterproof dog jacket',
    keyword: 'dog jacket',
    matchType: 'broad',
    impressions: 100,
    clicks: 10,
    spend: 20,
    sales: 80,
    orders: 2,
    ctr: 0.1,
    cvr: 0.2,
    cpc: 2,
    acos: 0.25,
    action: 'scale_budget',
    actionLabel: '增加预算',
    reason: '表现良好',
    priority: 1,
  };
}

describe('App Center PPC action-list snapshots', () => {
  beforeEach(() => {
    storeMocks.value = [];
    storeMocks.get.mockReset().mockImplementation(async () => storeMocks.value);
    storeMocks.set.mockReset().mockImplementation(async (_key, value) => {
      storeMocks.value = value;
      return true;
    });
    storeMocks.remove.mockReset().mockImplementation(async () => {
      storeMocks.value = [];
    });
  });

  it('persists exact PPC suggestion rows and restores a clone', async () => {
    const saved = await savePpcActionListSnapshot({
      id: 'ppc-001',
      reportType: 'search_term',
      filter: 'scale_budget',
      owner: '广告小张',
      rows: [createRow()],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(saved?.rows[0]?.searchTerm).toBe('waterproof dog jacket');

    const restored = await getPpcActionListSnapshotById('ppc-001');
    expect(restored).toMatchObject({
      id: 'ppc-001',
      reviewStatus: 'pending',
      owner: '广告小张',
    });
    expect(restored?.rows).toHaveLength(1);
  });

  it('records manual confirmation without executing PPC actions', async () => {
    await savePpcActionListSnapshot({
      id: 'ppc-001',
      reportType: 'search_term',
      filter: 'all',
      owner: '广告小张',
      rows: [createRow()],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const updated = await updatePpcActionListReview('ppc-001', 'confirmed', '已在后台人工处理');
    expect(updated).toMatchObject({
      reviewStatus: 'confirmed',
      note: '已在后台人工处理',
    });
  });

  it('queues a snapshot for the PPC page exactly once', async () => {
    const saved = await savePpcActionListSnapshot({
      id: 'ppc-001',
      reportType: 'search_term',
      filter: 'all',
      owner: '广告小张',
      rows: [createRow()],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    if (!saved) throw new Error('Snapshot was not saved');
    queuePpcActionListResume(saved);
    expect(consumePpcActionListResume()?.id).toBe('ppc-001');
    expect(consumePpcActionListResume()).toBeNull();
    await clearPpcActionListSnapshots();
  });
});
