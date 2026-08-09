import { describe, expect, it } from 'vitest';
import type { DeepChatMessage } from '../types';
import {
  findStoredMessageForToolbar,
  isToolbarCopyableContent,
  resolveToolbarStatusLabel,
  shouldMountMessageToolbarShell,
  syncToolbarContentBoundActions,
} from './messageToolbar';

describe('shouldMountMessageToolbarShell', () => {
  it('mounts shell for live AI with pending even when ZWSP and no liveLabel (TB-O1)', () => {
    expect(
      shouldMountMessageToolbarShell({
        isLiveAi: true,
        hasMeaningfulContent: false,
        liveLabel: null,
        hasActivePending: true,
      })
    ).toBe(true);
  });

  it('mounts when liveLabel is present without pending flag', () => {
    expect(
      shouldMountMessageToolbarShell({
        isLiveAi: true,
        hasMeaningfulContent: false,
        liveLabel: '深度思考中…',
        hasActivePending: false,
      })
    ).toBe(true);
  });

  it('does not mount empty non-live bubbles without content', () => {
    expect(
      shouldMountMessageToolbarShell({
        isLiveAi: false,
        hasMeaningfulContent: false,
        liveLabel: null,
        hasActivePending: false,
      })
    ).toBe(false);
  });
});

describe('isToolbarCopyableContent + syncToolbarContentBoundActions (TB2)', () => {
  it('treats empty and ZWSP-only as not copyable', () => {
    expect(isToolbarCopyableContent('')).toBe(false);
    expect(isToolbarCopyableContent('   ')).toBe(false);
    expect(isToolbarCopyableContent('\u200b')).toBe(false);
    expect(isToolbarCopyableContent('hello')).toBe(true);
  });

  it('disables copy/edit when content is empty and re-enables when text arrives', () => {
    const toolbar = document.createElement('div');
    const copy = document.createElement('button');
    copy.dataset.toolbarAction = 'copy';
    copy.setAttribute('aria-label', '复制消息');
    copy.title = '复制消息';
    const edit = document.createElement('button');
    edit.dataset.toolbarAction = 'edit';
    edit.setAttribute('aria-label', '编辑消息');
    edit.title = '编辑消息';
    toolbar.append(copy, edit);

    syncToolbarContentBoundActions(toolbar, '\u200b');
    expect(copy.disabled).toBe(true);
    expect(copy.getAttribute('aria-disabled')).toBe('true');
    expect(copy.title).toBe('暂无正文可复制');
    expect(edit.disabled).toBe(true);

    syncToolbarContentBoundActions(toolbar, 'final answer');
    expect(copy.disabled).toBe(false);
    expect(copy.getAttribute('aria-disabled')).toBe('false');
    expect(copy.title).toBe('复制消息');
    expect(edit.disabled).toBe(false);
  });

  it('keyword-hunter 按钮随 isPushReady 禁用/恢复，copy/edit 不受影响（P0 范围）', () => {
    const toolbar = document.createElement('div');
    const copy = document.createElement('button');
    copy.dataset.toolbarAction = 'copy';
    copy.setAttribute('aria-label', '复制消息');
    copy.title = '复制消息';
    const push = document.createElement('button');
    push.dataset.toolbarAction = 'keyword-hunter';
    push.setAttribute('aria-label', '推送到 Keyword Hunter 复核');
    push.title = '推送到 Keyword Hunter 复核';
    const edit = document.createElement('button');
    edit.dataset.toolbarAction = 'edit';
    edit.setAttribute('aria-label', '编辑消息');
    edit.title = '编辑消息';
    toolbar.append(copy, push, edit);

    // 有正文但生成未完成（打字机 drain 中）→ 仅 keyword-hunter 禁用
    syncToolbarContentBoundActions(toolbar, 'partial answer', false);
    expect(push.disabled).toBe(true);
    expect(push.getAttribute('aria-disabled')).toBe('true');
    expect(push.title).toBe('生成完成后可推送');
    expect(copy.disabled).toBe(false);
    expect(edit.disabled).toBe(false);

    // 生成完成 → 恢复可点，title 回到 aria-label
    syncToolbarContentBoundActions(toolbar, 'partial answer', true);
    expect(push.disabled).toBe(false);
    expect(push.getAttribute('aria-disabled')).toBe('false');
    expect(push.title).toBe('推送到 Keyword Hunter 复核');

    // 缺省（未传 isPushReady）→ 视为就绪，行为与旧版本一致
    syncToolbarContentBoundActions(toolbar, 'partial answer');
    expect(push.disabled).toBe(false);
  });
});

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
