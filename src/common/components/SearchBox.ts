/**
 * SearchBox.ts - 统一搜索框组件（P1-2 一期）
 *
 * 侧边栏 / SOPs overview / 智库 overview 三处搜索位共用同一工厂：
 * - 同一段 DOM 生成代码、同一份 CSS token（search-box.css）
 * - 同一模糊匹配核心（command-palette/filterCommands）
 * - 结果条目沿用既有 `data-action="switch-tab"` / `data-tab=<routeId>` 语义，
 *   直接复用 actionRegistry 的 switch-tab 处理，无需新增路由逻辑
 *
 * 无 Alpine 模板、无内联 Tailwind 类，纯 DOM 构建，CSP 友好。
 * 视觉 token 全部收敛在 src/css/components/search-box.css。
 */
import { buildCommandIndex, filterByModule } from '@/common/command-palette/buildIndex';
import { filterCommands } from '@/common/command-palette/filterCommands';

import type { CommandItem } from '@/common/command-palette/types';

export type SearchBoxStyleVariant = 'sidebar' | 'page';

export interface SearchBoxOptions {
  /** 占位文案，默认 "搜索功能..."。 */
  placeholder?: string;
  /** input 的 aria-label，默认 "搜索"。 */
  ariaLabel?: string;
  /** 单模块过滤：缺省时使用全模块索引（命令面板场景）。 */
  moduleId?: string;
  /** 结果选中后的执行回调，默认走 switch-tab（navigateToRouteId）。 */
  onExecute?: (item: CommandItem) => void;
  /** 挂载时给 input 设置的 id，用于与既有全局事件委托（ui/index.ts 侧边栏搜索代理）兼容。 */
  inputId?: string;
  /** 初始值（挂载时自动触发一次搜索）。 */
  initialValue?: string;
  /** 尺寸/圆角变体：sidebar 紧凑、page 标准。 */
  styleVariant?: SearchBoxStyleVariant;
  /** 展示的最大结果数，默认 8。 */
  maxResults?: number;
  /** 无结果时展示的文案。 */
  emptyMessage?: string;
  /** 未输入时是否隐藏结果区，默认 true（page 变体适用）。 */
  hideResultsWhenEmpty?: boolean;
}

export interface SearchBoxHandle {
  element: HTMLDivElement;
  mount(target: HTMLElement): void;
  destroy(): void;
  focus(): void;
  clear(): void;
  refresh(): void;
}

const DEFAULT_MAX_RESULTS = 8;
const DEFAULT_EMPTY_MESSAGE = '未找到匹配项';

let cachedIndex: CommandItem[] | null = null;

function getIndex(): CommandItem[] {
  if (!cachedIndex) {
    cachedIndex = buildCommandIndex();
  }
  return cachedIndex;
}

/** 清除缓存（路由变更后 HMR 场景使用）。 */
export function resetSearchBoxIndexCache(): void {
  cachedIndex = null;
}

function createIcon(iconClass: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'sops-search-box__icon-wrap';
  const icon = document.createElement('i');
  icon.className = `fas ${iconClass}`;
  icon.setAttribute('aria-hidden', 'true');
  span.append(icon);
  return span;
}

/**
 * 搜索框 DOM 结构（纯创建，无行为）。
 */
function createSearchBoxDom(
  options: Pick<SearchBoxOptions, 'styleVariant' | 'placeholder' | 'ariaLabel' | 'inputId'>
): {
  root: HTMLDivElement;
  input: HTMLInputElement;
  clearButton: HTMLButtonElement;
  results: HTMLUListElement;
} {
  const styleVariant = options.styleVariant ?? 'sidebar';
  const placeholder = options.placeholder ?? '搜索功能...';
  const ariaLabel = options.ariaLabel ?? '搜索';

  const root = document.createElement('div');
  root.className = `sops-search-box sops-search-box--${styleVariant}`;
  root.setAttribute('role', 'search');

  const prefix = document.createElement('span');
  prefix.className = 'sops-search-box__prefix';
  prefix.append(createIcon('fa-search'));

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'sops-search-box__input';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', ariaLabel);
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.spellcheck = false;
  if (options.inputId) {
    input.id = options.inputId;
  }

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'sops-search-box__clear';
  clearButton.setAttribute('aria-label', '清除搜索');
  clearButton.title = '清除搜索';
  clearButton.append(createIcon('fa-times'));

  const results = document.createElement('ul');
  results.className = 'sops-search-box__results';
  results.setAttribute('role', 'listbox');
  results.setAttribute('aria-label', '搜索结果');

  root.append(prefix, input, clearButton, results);
  return { root, input, clearButton, results };
}

interface SearchQueryContext {
  input: HTMLInputElement;
  clearButton: HTMLButtonElement;
  placeholder: string;
  emptyMessage: string;
  hideResultsWhenEmpty: boolean;
  /** 按当前输入范围取的候选索引（受 moduleId 约束）。 */
  getCandidates(): CommandItem[];
  render(items: CommandItem[], emptyFallback: string): void;
  hideResults(): void;
}

/** 按当前输入值执行一次搜索渲染（纯逻辑，便于单测）。 */
function applySearchQuery(ctx: SearchQueryContext): void {
  const { input, clearButton, placeholder, emptyMessage, hideResultsWhenEmpty } = ctx;
  const query = input.value;
  const hasQuery = query.trim().length > 0;
  clearButton.classList.toggle('sops-hidden', query.length === 0);
  if (!hasQuery) {
    if (hideResultsWhenEmpty) {
      ctx.hideResults();
    } else {
      ctx.render(ctx.getCandidates(), placeholder);
    }
    return;
  }
  ctx.render(filterCommands(ctx.getCandidates(), query), emptyMessage);
}

interface SearchBoxDestroyState {
  destroyed: boolean;
  mountedInput: boolean;
}

interface SearchBoxHandleDeps {
  root: HTMLDivElement;
  input: HTMLInputElement;
  clearButton: HTMLButtonElement;
  initialValue: string;
  runSearch(): void;
  onInput(): void;
  onKeydown(event: KeyboardEvent): void;
  onClearClick(event: Event): void;
  destroyState: SearchBoxDestroyState;
}

/** 组合生命周期句柄（mount/destroy/focus/clear/refresh）。 */
function buildSearchBoxHandle(deps: SearchBoxHandleDeps): SearchBoxHandle {
  const {
    root,
    input,
    clearButton,
    initialValue,
    runSearch,
    onInput,
    onKeydown,
    onClearClick,
    destroyState,
  } = deps;
  return {
    element: root,
    mount(target: HTMLElement) {
      target.append(root);
      if (initialValue) {
        input.value = initialValue;
      }
      runSearch();
    },
    destroy() {
      destroyState.destroyed = true;
      destroyState.mountedInput = false;
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeydown);
      clearButton.removeEventListener('click', onClearClick);
      root.remove();
    },
    focus() {
      input.focus();
    },
    clear() {
      input.value = '';
      clearButton.classList.add('sops-hidden');
      runSearch();
    },
    refresh: runSearch,
  };
}

function renderSearchResults(
  container: HTMLUListElement,
  items: CommandItem[],
  maxResults: number,
  emptyFallback: string,
  onSelect: (item: CommandItem) => void
): void {
  // 安全：仅清空结果容器（内容为空字符串），随后以 DOM API 逐项创建节点。
  // eslint-disable-next-line no-restricted-syntax -- 仅清空容器（空字符串），随后以 DOM API 逐项创建节点。
  container.innerHTML = '';
  if (items.length === 0) {
    createEmptyOption(container, emptyFallback);
  } else {
    for (const item of items.slice(0, maxResults)) {
      createResultOption(container, item, item.kind === 'route' ? item.moduleId : undefined, () =>
        onSelect(item)
      );
    }
  }
  container.classList.remove('sops-hidden');
  container.setAttribute('aria-hidden', 'false');
}

function createEmptyOption(container: HTMLUListElement, message: string): void {
  const li = document.createElement('li');
  li.className = 'sops-search-box__empty';
  li.textContent = message;
  container.append(li);
}

interface SearchBoxKeydownContext {
  input: HTMLInputElement;
  results: HTMLUListElement;
  clear(): void;
  executeAt(index: number, options_: HTMLElement[]): void;
}

/** Esc 清除并失焦；方向键/回车导航选项（纯逻辑，便于单测）。 */
function handleSearchBoxKeydown(event: KeyboardEvent, ctx: SearchBoxKeydownContext): void {
  if (event.key === 'Escape') {
    ctx.clear();
    return;
  }
  const active = document.activeElement as HTMLElement | null;
  const options_ = Array.from(
    ctx.results.querySelectorAll<HTMLElement>('.sops-search-box__option')
  );
  const currentIndex = options_.findIndex(opt => opt === active);
  const target = computeArrowFocusTarget(options_, currentIndex, event.key, ctx.input);
  if (target) {
    target.focus();
    return;
  }
  ctx.executeAt(currentIndex, options_);
}

function computeArrowFocusTarget(
  options_: HTMLElement[],
  currentIndex: number,
  key: string,
  input: HTMLInputElement
): HTMLElement | undefined {
  if (key === 'ArrowDown') {
    const next = currentIndex < options_.length - 1 ? currentIndex + 1 : 0;
    return options_[next];
  }
  if (key === 'ArrowUp') {
    const prev = currentIndex > 0 ? currentIndex - 1 : -1;
    return prev >= 0 ? options_[prev] : input;
  }
  return undefined;
}

function createResultOption(
  container: HTMLUListElement,
  item: CommandItem,
  moduleId: string | undefined,
  onSelect: () => void
): void {
  const li = document.createElement('li');
  li.setAttribute('role', 'option');
  li.className = 'sops-search-box__option';
  const icon = createIcon(item.icon || 'fa-angle-right');
  const label = document.createElement('span');
  label.className = 'sops-search-box__option-label';
  label.textContent = item.label;
  li.append(icon, label);
  if (item.kind === 'route') {
    li.dataset.action = 'switch-tab';
    li.dataset.tab = item.routeId;
    li.dataset.clearSearch = moduleId || 'all';
  }
  li.addEventListener('click', onSelect);
  container.append(li);
}

/**
 * 搜索框行为（渲染/搜索/导航/生命周期），DOM 与逻辑分离便于单测。
 */
function attachSearchBoxBehavior(
  dom: {
    root: HTMLDivElement;
    input: HTMLInputElement;
    clearButton: HTMLButtonElement;
    results: HTMLUListElement;
  },
  options: SearchBoxOptions
): SearchBoxHandle {
  const { root, input, clearButton, results } = dom;
  const moduleId = options.moduleId;
  const onExecute = options.onExecute;
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const emptyMessage = options.emptyMessage ?? DEFAULT_EMPTY_MESSAGE;
  const placeholder = options.placeholder ?? '搜索功能...';
  const initialValue = options.initialValue ?? '';
  const hideResultsWhenEmpty = options.hideResultsWhenEmpty ?? true;

  const destroyState: SearchBoxDestroyState = {
    destroyed: false,
    mountedInput: false,
  };
  const getCandidates = (): CommandItem[] =>
    moduleId ? filterByModule(getIndex(), moduleId) : getIndex();

  function clear(): void {
    input.value = '';
    clearButton.classList.add('sops-hidden');
    if (hideResultsWhenEmpty) {
      hideResults();
      return;
    }
    render(getCandidates(), placeholder);
  }

  function hideResults(): void {
    results.classList.add('sops-hidden');
    results.setAttribute('aria-hidden', 'true');
    // 安全：仅清空容器（空字符串），随后以 DOM API 逐项创建节点。
    // eslint-disable-next-line no-restricted-syntax
    results.innerHTML = '';
  }

  function onSelect(item: CommandItem): void {
    if (onExecute) {
      onExecute(item);
      return;
    }
    // 默认走 actionRegistry 的 switch-tab 语义（navigateToRouteId）。
    clear();
  }

  function render(items: CommandItem[], emptyFallback: string): void {
    renderSearchResults(results, items, maxResults, emptyFallback, onSelect);
  }

  const runSearch = (): void => {
    if (destroyState.destroyed) return;
    applySearchQuery({
      input,
      clearButton,
      placeholder,
      emptyMessage,
      hideResultsWhenEmpty,
      getCandidates,
      render,
      hideResults,
    });
  };
  const onInput = (): void => {
    if (!destroyState.destroyed && destroyState.mountedInput) runSearch();
  };

  const onClearClick = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    clear();
  };

  function onKeydown(event: KeyboardEvent): void {
    handleSearchBoxKeydown(event, {
      input,
      results,
      clear: () => {
        clear();
        input.blur();
      },
      executeAt: (index, opts) => {
        if (opts[index]) {
          event.preventDefault();
          opts[index].click();
        }
      },
    });
  }

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeydown);
  clearButton.addEventListener('click', onClearClick);
  destroyState.mountedInput = true;

  return buildSearchBoxHandle({
    root,
    input,
    clearButton,
    initialValue,
    runSearch,
    onInput,
    onKeydown,
    onClearClick,
    destroyState,
  });
}

/**
 * 创建统一搜索框。返回句柄由调用方决定挂载位置与生命周期。
 *
 * DOM 创建与行为绑定已分离为 `createSearchBoxDom` / `attachSearchBoxBehavior`，
 * 便于单测（行为逻辑）与样式调试（DOM 结构）独立进行。
 */
export function createSearchBox(options: SearchBoxOptions = {}): SearchBoxHandle {
  return attachSearchBoxBehavior(createSearchBoxDom(options), options);
}
