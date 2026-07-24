import { describe, expect, it } from 'vitest';
import type { DeepChatMessage } from '../types';
import { findStoredMessageForToolbar, resolveToolbarStatusLabel } from './messageToolbar';

describe('resolveToolbarStatusLabel', () => {
  it('maps store statuses to stable user-facing badges', () => {
    expect(resolveToolbarStatusLabel('partial')).toEqual({
      label: '未完成',
      statusKey: 'partial',
    });
    expect(resolveToolbarStatusLabel('stopped')).toEqual({
      label: '已停止',
      statusKey: 'stopped',
    });
    expect(resolveToolbarStatusLabel(undefined)).toBeNull();
  });
});

describe('findStoredMessageForToolbar', () => {
  const stored: DeepChatMessage[] = [
    { role: 'user', text: 'q1', createdAt: 1 },
    { role: 'ai', text: 'a1 complete', createdAt: 2 },
    { role: 'user', text: 'q2', createdAt: 3 },
    { role: 'ai', text: 'a2 half', createdAt: 4, status: 'partial' },
  ];

  it('exact-matches content so historical 「未完成」 stays on the right bubble', () => {
    const used = new Set<number>();
    const firstAi = findStoredMessageForToolbar(stored, used, 'ai', 'a1 complete');
    expect(firstAi).toMatchObject({ text: 'a1 complete' });
    expect(firstAi?.status).toBeUndefined();

    const secondAi = findStoredMessageForToolbar(stored, used, 'ai', 'a2 half');
    expect(secondAi).toMatchObject({ text: 'a2 half', status: 'partial' });
  });

  it('does not let an earlier mismatch steal the latest partial status', () => {
    const used = new Set<number>();
    // DOM text slightly off exact match (markdown / whitespace drift)
    const firstAi = findStoredMessageForToolbar(stored, used, 'ai', 'a1 complete!');
    // Chronological first unused AI — not the trailing partial
    expect(firstAi).toMatchObject({ text: 'a1 complete' });
    expect(firstAi?.status).toBeUndefined();

    const secondAi = findStoredMessageForToolbar(stored, used, 'ai', 'a2 half');
    expect(secondAi).toMatchObject({ text: 'a2 half', status: 'partial' });
  });

  it('uses latest-fallback only for the live last AI when stream lags store', () => {
    const used = new Set<number>();
    findStoredMessageForToolbar(stored, used, 'ai', 'a1 complete');
    // Live bubble shows a shorter stream snapshot than store
    const live = findStoredMessageForToolbar(stored, used, 'ai', 'a2', {
      preferLatestFallback: true,
    });
    expect(live).toMatchObject({ text: 'a2 half', status: 'partial' });
  });

  it('keeps stopped status match stable', () => {
    const withStopped: DeepChatMessage[] = [
      { role: 'user', text: 'q', createdAt: 1 },
      { role: 'ai', text: '已停止生成。', createdAt: 2, status: 'stopped' },
    ];
    const used = new Set<number>();
    const matched = findStoredMessageForToolbar(withStopped, used, 'ai', '已停止生成。');
    expect(matched?.status).toBe('stopped');
    expect(resolveToolbarStatusLabel(matched?.status)?.label).toBe('已停止');
  });
});
