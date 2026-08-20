import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSearchBox, resetSearchBoxIndexCache } from '@/common/components/SearchBox';
import type { SearchBoxHandle } from '@/common/components/SearchBox';
import type { CommandItem, RouteCommandItem } from '@/common/command-palette/types';

vi.mock('@/common/command-palette/buildIndex', () => ({
  buildCommandIndex: vi.fn(() => [
    makeRouteItem('sop_list', 'SOP 列表', 'fa-list', 'sop_center'),
    makeRouteItem('keyword_hunter', '关键词猎人', 'fa-bullseye', 'sop_center'),
    makeRouteItem('ppc_manager', 'PPC 管理', 'fa-chart-bar', 'tools'),
  ]),
  filterByModule: vi.fn((_items, moduleId) => [
    makeRouteItem('sop_list', 'SOP 列表', 'fa-list', moduleId),
  ]),
}));
vi.mock('@/common/command-palette/filterCommands', () => ({
  filterCommands: vi.fn((_items, query: string) => {
    if (query.includes('ppc')) return [makeRouteItem('ppc_manager', 'PPC 管理', 'fa-chart-bar', 'tools')];
    return [makeRouteItem('sop_list', 'SOP 列表', 'fa-list', 'sop_center')];
  }),
  filterByModule: vi.fn(items => items),
}));
vi.mock('@/common/command-palette/actions', () => ({}));

import { buildCommandIndex, filterByModule } from '@/common/command-palette/buildIndex';
import { filterCommands } from '@/common/command-palette/filterCommands';

function makeRouteItem(
  routeId: string,
  label: string,
  icon: string,
  moduleId: string
): RouteCommandItem {
  return {
    kind: 'route',
    id: routeId,
    routeId: routeId as never,
    label,
    icon,
    moduleLabel: moduleId,
    moduleId,
  };
}

describe('SearchBox 统一搜索框组件', () => {
  let container: HTMLDivElement;
  let onExecute: ReturnType<typeof vi.fn>;
  let onFilter: ReturnType<typeof vi.fn>;
  let externalQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    (buildCommandIndex as ReturnType<typeof vi.fn>).mockReturnValue([
      makeRouteItem('sop_list', 'SOP 列表', 'fa-list', 'sop_center'),
      makeRouteItem('keyword_hunter', '关键词猎人', 'fa-bullseye', 'sop_center'),
      makeRouteItem('ppc_manager', 'PPC 管理', 'fa-chart-bar', 'tools'),
    ]);
    (filterByModule as ReturnType<typeof vi.fn>).mockImplementation((_items, moduleId) => [
      makeRouteItem('sop_list', 'SOP 列表', 'fa-list', moduleId),
    ]);
    (filterCommands as ReturnType<typeof vi.fn>).mockImplementation((_items, query: string) =>
      query.includes('ppc')
        ? [makeRouteItem('ppc_manager', 'PPC 管理', 'fa-chart-bar', 'tools')]
        : [makeRouteItem('sop_list', 'SOP 列表', 'fa-list', 'sop_center')]
    );
    resetSearchBoxIndexCache();
    container = document.createElement('div');
    document.body.append(container);
    onExecute = vi.fn();
    onFilter = vi.fn();
    externalQuery = vi.fn(() => '');
  });

  afterEach(() => {
    resetSearchBoxIndexCache();
    document.body.innerHTML = '';
  });

  function mount(options = {}): SearchBoxHandle {
    const handle = createSearchBox(options);
    handle.mount(container);
    return handle;
  }

  describe('DOM 结构与样式变体', () => {
    it('默认渲染 sidebar 变体、role=search、图标/输入/清除/结果容器', () => {
      const h = mount();
      const root = container.querySelector('.sops-search-box') as HTMLDivElement;
      expect(root.className).toContain('sops-search-box--sidebar');
      expect(root.getAttribute('role')).toBe('search');
      expect(container.querySelector('.sops-search-box__prefix i.fas')).toBeTruthy();
      expect(container.querySelector('.sops-search-box__input')).toBeTruthy();
      expect(container.querySelector('.sops-search-box__clear')).toBeTruthy();
      expect(container.querySelector('.sops-search-box__results')).toBeTruthy();
      h.destroy();
    });

    it('styleVariant=header/page 切换根 class 后缀', () => {
      const h1 = mount({ styleVariant: 'header' });
      expect(h1.element.className).toContain('sops-search-box--header');
      h1.destroy();
      const h2 = mount({ styleVariant: 'page' });
      expect(h2.element.className).toContain('sops-search-box--page');
      h2.destroy();
    });

    it('placeholder/ariaLabel/inputId 透传', () => {
      const h = mount({
        placeholder: '搜 SOP...',
        ariaLabel: '全局搜索',
        inputId: 'global-search-input',
      });
      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.placeholder).toBe('搜 SOP...');
      expect(input.getAttribute('aria-label')).toBe('全局搜索');
      expect(input.id).toBe('global-search-input');
      h.destroy();
    });

    it('清除按钮带 aria-label 与隐藏态', () => {
      const h = mount();
      const clearBtn = container.querySelector('.sops-search-box__clear') as HTMLButtonElement;
      expect(clearBtn.getAttribute('aria-label')).toBe('清除搜索');
      expect(clearBtn.classList.contains('sops-hidden')).toBe(true);
      h.destroy();
    });
  });

  describe('生命周期句柄', () => {
    it('mount 渲染到目标容器并自动执行首次搜索（空查询直接隐藏结果面板）', () => {
      const h = mount();
      expect(container.querySelector('.sops-search-box')).toBeTruthy();
      // 空查询：hideResultsWhenEmpty 默认 true → 直接隐藏结果面板（不走索引渲染）
      const results = container.querySelector('.sops-search-box__results')!;
      expect(results.classList.contains('sops-hidden')).toBe(true);
      expect(buildCommandIndex).not.toHaveBeenCalled();
      h.destroy();
    });

    it('initialValue 挂载时写入并立即执行搜索', () => {
      const h = mount({ initialValue: 'ppc' });
      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('ppc');
      expect(filterCommands).toHaveBeenCalled();
      h.destroy();
    });

    it('focus 聚焦输入框；clear 清空输入并重新渲染', () => {
      const h = mount({ initialValue: 'x' });
      const input = container.querySelector('input') as HTMLInputElement;
      h.focus();
      expect(document.activeElement).toBe(input);
      h.clear();
      expect(input.value).toBe('');
      const clearBtn = container.querySelector('.sops-search-box__clear') as HTMLButtonElement;
      expect(clearBtn.classList.contains('sops-hidden')).toBe(true);
      h.destroy();
    });

    it('destroy 移除监听与 DOM，后续 input 事件不再触发搜索', () => {
      const h = mount();
      const input = container.querySelector('input') as HTMLInputElement;
      h.destroy();
      expect(container.querySelector('.sops-search-box')).toBeNull();
      input.value = 'x';
      input.dispatchEvent(new Event('input'));
      expect(filterCommands).not.toHaveBeenCalled();
    });

    it('resetSearchBoxIndexCache 清除索引缓存，下次搜索重建', () => {
      mount({ initialValue: 'ppc' });
      expect(buildCommandIndex).toHaveBeenCalledOnce();
      resetSearchBoxIndexCache();
      mount({ initialValue: 'ppc' });
      expect(buildCommandIndex).toHaveBeenCalledTimes(2);
    });
  });

  describe('搜索行为', () => {
    it('输入触发过滤并渲染命中结果（maxResults 默认 8）', async () => {
      const h = mount();
      const input = container.querySelector('input') as HTMLInputElement;
      input.value = 'ppc';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() => expect(filterCommands).toHaveBeenCalled());
      const options = container.querySelectorAll('.sops-search-box__option');
      expect(options.length).toBe(1);
      expect(options[0].querySelector('.sops-search-box__option-label')?.textContent).toBe(
        'PPC 管理'
      );
      h.destroy();
    });

    it('路由类结果带 switch-tab/tab/clearSearch 数据集', async () => {
      const h = mount();
      const input = container.querySelector('input') as HTMLInputElement;
      input.value = 'sop';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() =>
        expect(container.querySelectorAll('.sops-search-box__option').length).toBeGreaterThan(0)
      );
      const option = container.querySelector('.sops-search-box__option') as HTMLLIElement;
      expect(option.dataset.action).toBe('switch-tab');
      expect(option.dataset.tab).toBe('sop_list');
      expect(option.dataset.clearSearch).toBe('sop_center');
      expect(option.getAttribute('role')).toBe('option');
      expect(option.getAttribute('aria-hidden')).toBeNull();
      h.destroy();
    });

    it('无命中渲染 empty 占位（hideResultsWhenEmpty=false 时保留结果面板）', async () => {
      (filterCommands as ReturnType<typeof vi.fn>).mockReturnValue([]);
      const h = mount({ hideResultsWhenEmpty: false });
      const input = container.querySelector('input') as HTMLInputElement;
      input.value = 'zzz-no-match';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() =>
        expect(container.querySelector('.sops-search-box__empty')?.textContent).toBe('未找到匹配项')
      );
      h.destroy();
    });

    it('hideResultsWhenEmpty=true（默认）时空查询隐藏结果面板', () => {
      const h = mount();
      const results = container.querySelector('.sops-search-box__results') as HTMLUListElement;
      expect(results.classList.contains('sops-hidden')).toBe(true);
      expect(results.getAttribute('aria-hidden')).toBe('true');
      h.destroy();
    });

    it('moduleId 过滤走 filterByModule 候选索引', async () => {
      const h = mount({ moduleId: 'sop_center' });
      const input = container.querySelector('input') as HTMLInputElement;
      input.value = 'x';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() => expect(filterByModule).toHaveBeenCalled());
      h.destroy();
    });

    it('onExecute 回调优先，默认 onSelect 不清除走 switch-tab（断言 onExecute 未设时直接执行动作）', async () => {
      const h = mount();
      const input = container.querySelector('input') as HTMLInputElement;
      input.value = 'sop';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() =>
        expect(container.querySelectorAll('.sops-search-box__option').length).toBeGreaterThan(0)
      );
      (container.querySelector('.sops-search-box__option') as HTMLLIElement).click();
      // 默认 onSelect：未设置 onExecute → clear（清空输入）
      expect(input.value).toBe('');
      expect(onExecute).not.toHaveBeenCalled();
      h.destroy();
    });

    it('onExecute 传入时 onSelect 直接调用回调不执行默认清除', async () => {
      const h = mount({ onExecute });
      const input = container.querySelector('input') as HTMLInputElement;
      input.value = 'ppc';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() =>
        expect(container.querySelectorAll('.sops-search-box__option').length).toBeGreaterThan(0)
      );
      (container.querySelector('.sops-search-box__option') as HTMLLIElement).click();
      expect(onExecute).toHaveBeenCalledOnce();
      expect(onExecute.mock.calls[0][0].routeId).toBe('ppc_manager');
      expect(input.value).toBe('ppc');
      h.destroy();
    });
  });

  describe('页面内过滤模式（onFilter）', () => {
    it('输入变化回调 onFilter，不渲染默认下拉', async () => {
      const h = mount({ onFilter });
      const input = container.querySelector('input') as HTMLInputElement;
      input.value = 'abc';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() => expect(onFilter).toHaveBeenCalledWith('abc'));
      expect(container.querySelectorAll('.sops-search-box__option').length).toBe(0);
      h.destroy();
    });

    it('clear 同步回调 onFilter(空串)', () => {
      const h = mount({ onFilter, initialValue: 'x' });
      h.clear();
      expect(onFilter).toHaveBeenCalledWith('');
      h.destroy();
    });

    it('externalQuery 由调用方提供查询值', async () => {
      externalQuery.mockReturnValue('external-q');
      const h = mount({ onFilter, externalQuery });
      const input = container.querySelector('input') as HTMLInputElement;
      input.value = 'ignored';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() => expect(onFilter).toHaveBeenCalledWith('external-q'));
      h.destroy();
    });
  });

  describe('键盘导航与清除', () => {
    it('Esc 清空输入并失焦', () => {
      const h = mount({ initialValue: 'x' });
      const input = container.querySelector('input') as HTMLInputElement;
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(input.value).toBe('');
      expect(document.activeElement).not.toBe(input);
      h.destroy();
    });

    it('ArrowDown 在选项间循环聚焦；Enter 点击当前选项', async () => {
      const h = mount();
      const input = container.querySelector('input') as HTMLInputElement;
      input.value = 'x';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() =>
        expect(container.querySelectorAll('.sops-search-box__option').length).toBeGreaterThan(0)
      );
      const opts = Array.from(container.querySelectorAll<HTMLElement>('.sops-search-box__option'));
      // keydown listener 注册在 input 上，选项通过 tabIndex 可聚焦；键盘事件由 input 收到
      // 循环目标 opts[0] 也需要 tabIndex=0，否则 handleSearchBoxKeydown 中 target.focus() 无效
      opts.forEach(o => {
        o.tabIndex = 0;
      });
      opts[opts.length - 1].focus();
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(opts[0]);
      // Enter 点击当前聚焦选项（keydown listener 注册在 input 上，事件直接 dispatch 到 input；
      // activeElement 保持 opts[0]，用于 handleSearchBoxKeydown 计算 currentIndex）
      expect(document.activeElement).toBe(opts[0]);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      // 输入被默认 onSelect 清空
      expect(input.value).toBe('');
      h.destroy();
    });

    it('ArrowUp 无前置选项时回到输入框，有前置时跳回上一选项', async () => {
      (filterCommands as ReturnType<typeof vi.fn>).mockReturnValue([
        makeRouteItem('sop_list', 'SOP 列表', 'fa-list', 'sop_center'),
        makeRouteItem('keyword_hunter', '关键词猎人', 'fa-bullseye', 'sop_center'),
      ]);
      const h = mount();
      const input = container.querySelector('input') as HTMLInputElement;
      input.value = 'x';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() =>
        expect(container.querySelectorAll('.sops-search-box__option').length).toBe(2)
      );
      const opts = Array.from(container.querySelectorAll<HTMLElement>('.sops-search-box__option'));
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(document.activeElement).toBe(input);
      // activeElement 位于 opts[1] 时 ArrowUp → 回到 opts[0]（事件由 input 的 listener 处理；
      // 回退目标 opts[0] 需 tabIndex=0 才能 focus 生效）
      opts[0].tabIndex = 0;
      opts[1].tabIndex = 0;
      opts[1].focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(document.activeElement).toBe(opts[0]);
      h.destroy();
    });

    it('清除按钮点击清空输入、阻止冒泡且不触发默认行为', () => {
      const h = mount({ initialValue: 'y' });
      const clearBtn = container.querySelector('.sops-search-box__clear') as HTMLButtonElement;
      const ev = new Event('click', { bubbles: true, cancelable: true });
      clearBtn.dispatchEvent(ev);
      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('');
      expect(ev.defaultPrevented).toBe(true);
      // 清除回调同步触发空查询搜索（hideResults 隐藏结果面板）
      const results = container.querySelector('.sops-search-box__results') as HTMLUListElement;
      expect(results.classList.contains('sops-hidden')).toBe(true);
      h.destroy();
    });

    it('输入时清除按钮显隐：非空显示、清空隐藏', async () => {
      const h = mount();
      const input = container.querySelector('input') as HTMLInputElement;
      const clearBtn = container.querySelector('.sops-search-box__clear') as HTMLButtonElement;
      input.value = 'q';
      input.dispatchEvent(new Event('input'));
      await vi.waitFor(() => expect(clearBtn.classList.contains('sops-hidden')).toBe(false));
      h.clear();
      expect(clearBtn.classList.contains('sops-hidden')).toBe(true);
      h.destroy();
    });

    it('hideResultsWhenEmpty=false 时清空输入渲染全量候选', () => {
      const h = mount({ hideResultsWhenEmpty: false });
      h.clear();
      const options = container.querySelectorAll('.sops-search-box__option');
      expect(options.length).toBeGreaterThan(0);
      h.destroy();
    });

    it('destroy 后输入事件与键盘事件均不再触发渲染', async () => {
      const h = mount();
      const input = container.querySelector('input') as HTMLInputElement;
      const before = (filterCommands as ReturnType<typeof vi.fn>).mock.calls.length;
      h.destroy();
      input.value = 'ppc';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect((filterCommands as ReturnType<typeof vi.fn>).mock.calls.length).toBe(before);
    });
  });
});
