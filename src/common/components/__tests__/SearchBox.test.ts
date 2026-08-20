/**
 * SearchBox.test.ts - 统一搜索框行为测试
 *
 * 回归覆盖：
 * - onFilter（页面内过滤）模式下 results 容器必须保持隐藏：
 *   此前 onFilter 分支从不调用 hideResults，导致空下拉面板常显
 *   （最近作业 / 提示词 / 技能 / 动作清单 / 高危词检索等页面复现）。
 * - 默认下拉模式：空查询隐藏、有查询展示选项、clear 后隐藏。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommandItem } from '@/common/command-palette/types';
import { createSearchBox, type SearchBoxHandle } from '../SearchBox';

const mocks = vi.hoisted(() => ({
  buildCommandIndex: vi.fn(),
}));

vi.mock('@/common/command-palette/buildIndex', () => ({
  buildCommandIndex: mocks.buildCommandIndex,
  filterByModule: (items: CommandItem[]) => items,
}));

const FAKE_ITEMS: CommandItem[] = [
  {
    kind: 'action',
    id: 'open-settings',
    label: '打开设置',
    icon: 'fa-cog',
    moduleLabel: '系统',
    moduleId: 'system',
    keywords: ['设置'],
    execute: () => undefined,
  },
  {
    kind: 'action',
    id: 'go-home',
    label: '回到首页',
    icon: 'fa-home',
    moduleLabel: '首页',
    moduleId: 'home',
    keywords: ['首页'],
    execute: () => undefined,
  },
];

let handle: SearchBoxHandle | null = null;

function mount(options: Parameters<typeof createSearchBox>[0]): SearchBoxHandle {
  handle = createSearchBox(options);
  handle.mount(document.body);
  return handle;
}

function resultsEl(): HTMLUListElement | null {
  return document.querySelector('.sops-search-box__results');
}

function typeQuery(query: string): void {
  const input = document.querySelector<HTMLInputElement>('.sops-search-box__input');
  if (!input) throw new Error('search input missing');
  input.value = query;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  mocks.buildCommandIndex.mockReturnValue(FAKE_ITEMS);
});

afterEach(() => {
  handle?.destroy();
  handle = null;
  document.body.innerHTML = '';
});

describe('onFilter（页面内过滤）模式', () => {
  it('挂载即隐藏 results 容器（修复常显空面板）', () => {
    const onFilter = vi.fn();
    mount({ onFilter });

    const results = resultsEl();
    expect(results).not.toBeNull();
    expect(results!.classList.contains('sops-hidden')).toBe(true);
    expect(results!.getAttribute('aria-hidden')).toBe('true');
    expect(onFilter).toHaveBeenCalledWith('');
  });

  it('输入过程中 results 容器始终隐藏，查询交给 onFilter', () => {
    const onFilter = vi.fn();
    mount({ onFilter });

    typeQuery('亚马逊');
    typeQuery('ASIN');

    const results = resultsEl();
    expect(results!.classList.contains('sops-hidden')).toBe(true);
    expect(results!.querySelectorAll('.sops-search-box__option').length).toBe(0);
    expect(onFilter).toHaveBeenNthCalledWith(2, '亚马逊');
    expect(onFilter).toHaveBeenNthCalledWith(3, 'ASIN');
  });

  it('clear 后 results 容器保持隐藏', () => {
    const onFilter = vi.fn();
    const box = mount({ onFilter });
    typeQuery('亚马逊');
    box.clear();

    const results = resultsEl();
    expect(results!.classList.contains('sops-hidden')).toBe(true);
    expect(onFilter).toHaveBeenLastCalledWith('');
  });
});

describe('默认下拉模式', () => {
  it('空查询时 results 隐藏', () => {
    mount({});

    const results = resultsEl();
    expect(results!.classList.contains('sops-hidden')).toBe(true);
    expect(results!.getAttribute('aria-hidden')).toBe('true');
  });

  it('输入查询后展示匹配选项，clear 后恢复隐藏', () => {
    const box = mount({});
    typeQuery('设置');

    const results = resultsEl();
    expect(results!.classList.contains('sops-hidden')).toBe(false);
    expect(results!.getAttribute('aria-hidden')).toBe('false');
    const labels = Array.from(results!.querySelectorAll('.sops-search-box__option-label')).map(
      el => el.textContent
    );
    expect(labels).toEqual(['打开设置']);

    box.clear();
    expect(results!.classList.contains('sops-hidden')).toBe(true);
  });

  it('无匹配时展示 empty 提示而非隐藏（有查询语义）', () => {
    mount({});
    typeQuery('不存在的关键词');

    const results = resultsEl();
    expect(results!.classList.contains('sops-hidden')).toBe(false);
    expect(results!.querySelector('.sops-search-box__empty')).not.toBeNull();
  });
});
