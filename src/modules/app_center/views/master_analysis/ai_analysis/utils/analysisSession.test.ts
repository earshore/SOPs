/**
 * AI 分析断点会话工具测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearAnalysisSession,
  getSessionCompletedTargetIds,
  loadAnalysisSession,
  saveAnalysisSession,
  type AnalysisSessionSnapshot,
} from './analysisSession';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

function createSnapshot(overrides: Partial<AnalysisSessionSnapshot> = {}): AnalysisSessionSnapshot {
  return {
    version: 1,
    sourceHistoryId: 'h1',
    sourceAsins: ['B0ASIN1'],
    sourceDataFingerprint: 'fp-1',
    targetIds: ['title-keywords', 'selling-points'],
    completedTargetIds: ['title-keywords'],
    report: {
      'title-keywords': { primary_keywords: ['a'] },
    } as unknown as import('./analysisSession').AnalysisSessionSnapshot['report'],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorageMock.clear();
});

describe('analysisSession', () => {
  it('保存后可原样读取', () => {
    const snapshot = createSnapshot();
    saveAnalysisSession(snapshot);
    const loaded = loadAnalysisSession();
    expect(loaded).toEqual(snapshot);
  });

  it('clear 后读取返回 null', () => {
    saveAnalysisSession(createSnapshot());
    clearAnalysisSession();
    expect(loadAnalysisSession()).toBeNull();
  });

  it('过期的会话返回 null 并自动清除', () => {
    const stale = createSnapshot({
      updatedAt: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
    });
    saveAnalysisSession(stale);
    expect(loadAnalysisSession()).toBeNull();
    expect(localStorageMock.getItem('ai_analysis_in_progress_v1')).toBeNull();
  });

  it('结构无效的会话返回 null', () => {
    localStorageMock.setItem(
      'ai_analysis_in_progress_v1',
      JSON.stringify({ version: 2, targetIds: [] })
    );
    expect(loadAnalysisSession()).toBeNull();

    localStorageMock.setItem(
      'ai_analysis_in_progress_v1',
      JSON.stringify({ version: 1, targetIds: 'not-array', sourceAsins: [] })
    );
    expect(loadAnalysisSession()).toBeNull();

    localStorageMock.setItem('ai_analysis_in_progress_v1', '{broken json');
    expect(loadAnalysisSession()).toBeNull();
  });

  it('completedTargetIds 只返回目标列表中的已完成项', () => {
    const snapshot = createSnapshot({
      targetIds: ['a', 'b', 'c'],
      completedTargetIds: ['a', 'x', 'c'],
    });
    expect(getSessionCompletedTargetIds(snapshot)).toEqual(['a', 'c']);
  });
});
