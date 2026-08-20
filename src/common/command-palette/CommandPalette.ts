/**
 * CommandPalette.ts - ⌘K 命令面板自定义元素（P1-2 一期）
 *
 * 实现形态：`<sops-command-palette>` 自定义元素，内部使用
 * `document.createElement('dialog')` 承载（recentPanel.ts 已验证的 CSP 友好模式），
 * 全部由 DOM API 构建，不依赖 Alpine 模板、无 inline script。
 *
 * 交互：combobox + listbox（aria-activedescendant 驱动高亮），↑↓/Ctrl+J/Tab
 * 移动焦点，Enter 执行，Esc 由 dialog 原生处理，focus trap 由 dialog 的
 * inert/默认行为承担。执行后写 recent 到 localStorage 并 showToast 反馈。
 */
import { filterCommands, writeRecentEntry } from '@/common/command-palette/filterCommands';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';
import { announceDone, showToast } from '@/common/ui/notifications';

import { createActionItems } from './actions';
import { buildCommandIndex } from './buildIndex';
import { COMMAND_PALETTE_STORAGE_KEY } from './types';

import type {
  ActionCommandItem,
  CommandItem,
  RecentItem,
  RouteCommandItem,
  RouteId,
} from './types';

const DEFAULT_MAX_RECENT = 8;
const PALETTE_LABEL = '命令面板';
const INPUT_PLACEHOLDER = '搜索功能、切换页面、执行命令...';
const EMPTY_HINT = '未找到匹配项，直接回车打开“设置搜索”';

type RenderItem = CommandItem & {
  group: 'recent' | 'routes' | 'actions';
};

export class CommandPaletteElement extends HTMLElement {
  private dialog: HTMLDialogElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLUListElement | null = null;
  private activeIndex = 0;
  private items: RenderItem[] = [];
  private previousFocus: HTMLElement | null = null;
  private boundOnKeydown: ((event: KeyboardEvent) => void) | null = null;

  connectedCallback(): void {
    if (this.dialog) {
      return;
    }
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'sops-command-palette-dialog';
    this.dialog.setAttribute('aria-label', PALETTE_LABEL);
    this.dialog.append(this.buildSurface());
    this.append(this.dialog);
  }

  disconnectedCallback(): void {
    // jsdom 会对挂载态元素反复触发 disconnect/reconnect；此处仅清理键盘监听，
    // 不销毁面板状态，避免重连后面板不可用。
    if (this.boundOnKeydown) {
      document.removeEventListener('keydown', this.boundOnKeydown);
      this.boundOnKeydown = null;
    }
  }

  open(initialQuery = ''): void {
    // 面板可能尚未挂载（单元测试或未走 connectedCallback 路径），惰性构建。
    if (!this.dialog) {
      this.connectedCallback();
    }
    if (!this.dialog) {
      return;
    }
    if (this.dialog.open) {
      return;
    }
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.rebuildIndex();
    this.refreshResults(initialQuery);
    document.body.append(this);
    try {
      this.dialog.showModal();
    } catch {
      // 兼容不支持 dialog 方法的环境（jsdom 与极旧浏览器）
      try {
        if (typeof this.dialog.show === 'function') {
          this.dialog.show();
        } else {
          this.dialog.setAttribute('open', '');
        }
      } catch {
        this.dialog.setAttribute('open', '');
      }
    }
    this.input?.focus();
    eventBus.emit(APP_EVENTS.COMMAND_PALETTE_OPEN);
    if (initialQuery && this.input) {
      this.input.value = initialQuery;
    }
  }

  close(): void {
    this.teardown();
  }

  private teardown(): void {
    if (this.dialog?.open) {
      this.dialog.close();
    }
    if (this.boundOnKeydown) {
      document.removeEventListener('keydown', this.boundOnKeydown);
    }
    this.boundOnKeydown = null;
    this.dialog = null;
    this.input = null;
    this.list = null;
    this.remove();
    eventBus.emit(APP_EVENTS.COMMAND_PALETTE_CLOSE);
    if (this.previousFocus && document.body.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }

  private rebuildIndex(): void {
    const routes = buildCommandIndex();
    const actions = createActionItems();
    const routesById = new Set<string>();
    const recentIds = new Set(this.getRecent().map(entry => entry.id));
    for (const item of routes) {
      this.items.push({ ...item, group: 'routes' });
      routesById.add(item.id);
    }
    for (const item of actions) {
      this.items.push({ ...item, group: 'actions' });
    }
    for (const id of recentIds) {
      const item = [...routes, ...actions].find(i => i.id === id && !routesById.has(id));
      if (!item) {
        continue;
      }
      const idx = this.items.findIndex(i => i.id === id);
      if (idx < 0) {
        this.items.push({ ...item, group: 'recent' });
        continue;
      }
      // 路由已被 recent 置顶：把已有条目标记到 recent 组，位置保持索引序。
      const existing: RenderItem = this.items[idx] as RenderItem;
      existing.group = 'recent';
    }
  }

  // 直接访问 localStorage 而非 StorageService：键为面板内部私有作用域
  //（sops:command-palette:recent），仅为 JSON 数组的简单读写，
  // 无跨模块共享与版本迁移需求，StorageService 封装不带来额外收益。
  private getRecent(): RecentItem[] {
    try {
      // eslint-disable-next-line no-restricted-globals -- 见上方块注释：面板私有键的简单读写。
      const raw = localStorage.getItem(COMMAND_PALETTE_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistRecent(recent: RecentItem[]): void {
    try {
      // eslint-disable-next-line no-restricted-globals -- 见上方块注释：面板私有键的简单读写。
      localStorage.setItem(COMMAND_PALETTE_STORAGE_KEY, JSON.stringify(recent));
    } catch {
      // 隐私模式写入失败静默忽略
    }
  }

  private buildSurface(): HTMLElement {
    const surface = document.createElement('div');
    surface.className = 'sops-command-palette-surface';

    const combobox = document.createElement('div');
    combobox.className = 'sops-command-palette-combobox';

    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'sops-command-palette-input';
    input.placeholder = INPUT_PLACEHOLDER;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', 'sops-command-palette-list');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.spellcheck = false;

    const kbd = document.createElement('kbd');
    kbd.className = 'sops-command-palette-kbd';
    kbd.textContent = 'Esc';
    kbd.setAttribute('aria-label', '按 Esc 关闭');

    combobox.append(input, kbd);

    const list = document.createElement('ul');
    list.id = 'sops-command-palette-list';
    list.className = 'sops-command-palette-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', '命令列表');

    surface.append(combobox, list);

    this.input = input;
    this.list = list;

    input.addEventListener('input', () => this.onInputChange());
    // keydown 委托到 surface：用户焦点位于 option（li）时按键同样能被捕获，
    // 且焦点位于 input 时事件照常冒泡到 surface。
    surface.addEventListener('keydown', event => this.onInputKeydown(event));

    this.boundOnKeydown = event => this.onGlobalKeydown(event);
    document.addEventListener('keydown', this.boundOnKeydown);

    return surface;
  }

  private onInputChange(): void {
    if (!this.input) {
      return;
    }
    this.refreshResults(this.input.value);
  }

  private refreshResults(query: string): void {
    const recent = this.getRecent();
    const trimmed = query.trim();
    const scoped = trimmed
      ? this.items
      : this.items.filter(item => item.kind === 'route' || item.kind === 'action');
    const matched = filterCommands(scoped, trimmed, {
      recent,
      maxRecent: DEFAULT_MAX_RECENT,
      showRecentWhenEmpty: true,
    });
    this.items = scoped;
    this.renderItems(matched, trimmed);
    if (this.input) {
      this.input.setAttribute('aria-expanded', String(matched.length > 0));
    }
  }

  private renderItems(items: CommandItem[], query: string): void {
    const list = this.list;
    if (!list) {
      return;
    }
    // 安全：仅清空列表容器（内容为空字符串），随后以 DOM API 逐项创建节点。
    // eslint-disable-next-line no-restricted-syntax -- 仅清空容器（空字符串），随后以 DOM API 逐项创建节点。
    list.innerHTML = '';
    if (items.length === 0) {
      const hint = document.createElement('li');
      hint.className = 'sops-command-palette-empty';
      hint.textContent = query ? EMPTY_HINT : '输入关键词搜索，或从常用命令开始';
      list.append(hint);
      this.activeIndex = 0;
      return;
    }
    let currentGroup: RenderItem['group'] | null = null;
    for (const item of items) {
      const group = this.itemGroup(item);
      if (group !== currentGroup) {
        list.append(this.renderGroupHeading(group));
        currentGroup = group;
      }
      list.append(this.renderOption(item));
    }
    this.activeIndex = 0;
    this.updateActiveDescendant();
  }

  private renderGroupHeading(group: RenderItem['group']): HTMLLIElement {
    const heading = document.createElement('li');
    heading.className = 'sops-command-palette-group-heading';
    heading.setAttribute('aria-hidden', 'true');
    heading.textContent = group === 'recent' ? '最近使用' : group === 'actions' ? '命令' : '页面';
    return heading;
  }

  private renderOption(item: CommandItem): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'sops-command-palette-option';
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '-1');
    li.id = `sops-cmdk-opt-${item.id}`;
    li.dataset.paletteId = item.id;
    const icon = document.createElement('i');
    icon.className = `fas ${item.icon || 'fa-angle-right'}`;
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'sops-command-palette-option-label';
    label.textContent = item.label;
    const suffix = document.createElement('span');
    suffix.className = 'sops-command-palette-option-suffix';
    suffix.textContent = item.kind === 'route' ? item.moduleLabel : item.description || '';
    li.append(icon, label, suffix);
    li.addEventListener('click', () => this.execute(item));
    return li;
  }

  private itemGroup(item: CommandItem): RenderItem['group'] {
    if (item.kind === 'action') {
      return 'actions';
    }
    const recent = this.getRecent();
    if (recent.some(entry => entry.id === item.id)) {
      return 'recent';
    }
    return 'routes';
  }

  /** 判断按键对应的导航方向：下 1 / 上 -1 / 非导航 0。 */
  private static directionOf(event: KeyboardEvent): 1 | -1 | 0 {
    const ctrlDown = event.ctrlKey && event.key.toLowerCase() === 'j';
    const ctrlUp = event.ctrlKey && event.key.toLowerCase() === 'k';
    if (event.key === 'ArrowDown' || ctrlDown) {
      return 1;
    }
    if (event.key === 'ArrowUp' || ctrlUp) {
      return -1;
    }
    return 0;
  }

  private onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = this.activeOption();
      if (option) {
        this.execute(option);
        return;
      }
      // 空结果兜底：进入设置搜索（LLM 接入配置，最常见意图）。
      this.close();
      this.runAction('open-settings-llm');
      return;
    }
    if (this.navigateByArrow(event)) {
      return;
    }
    if (this.navigateByTab(event)) {
      return;
    }
  }

  /** 方向键 / Ctrl+j/k 循环导航选项列表。 */
  private navigateByArrow(event: KeyboardEvent): boolean {
    const step = CommandPaletteElement.directionOf(event);
    if (!step) {
      return false;
    }
    event.preventDefault();
    const options = this.listOptions();
    if (options.length === 0) {
      return true;
    }
    const currentIndex = options.indexOf(document.activeElement as HTMLElement);
    const target = this.focusTarget(options, currentIndex, step);
    target?.focus();
    return true;
  }

  /** 由当前焦点位置与方向计算下一个聚焦目标。 */
  private focusTarget(
    options: HTMLElement[],
    currentIndex: number,
    step: 1 | -1
  ): HTMLElement | undefined {
    if (currentIndex < 0) {
      if (step < 0) {
        return (this.input as HTMLElement | undefined) ?? undefined;
      }
      return options[0];
    }
    if (step < 0) {
      return currentIndex > 0
        ? options[currentIndex - 1]
        : ((this.input as HTMLElement | undefined) ?? undefined);
    }
    return currentIndex < options.length - 1 ? options[currentIndex + 1] : options[0];
  }

  /** Tab 键在选项间跳转（保持循环）。 */
  private navigateByTab(event: KeyboardEvent): boolean {
    if (event.key !== 'Tab') {
      return false;
    }
    const options = this.listOptions();
    if (options.length === 0) {
      return false;
    }
    const currentIndex = options.indexOf(document.activeElement as HTMLElement);
    const next =
      currentIndex >= 0 && currentIndex < options.length - 1
        ? currentIndex + 1
        : currentIndex === -1
          ? 0
          : currentIndex;
    options[next]?.focus();
    event.preventDefault();
    return true;
  }

  private onGlobalKeydown(event: KeyboardEvent): void {
    // Esc 由 dialog 原生处理；此处保留焦点归还兜底
    if (event.key === 'Escape' && this.dialog?.open) {
      this.close();
    }
  }

  private listOptions(): HTMLElement[] {
    return this.list ? Array.from(this.list.querySelectorAll<HTMLElement>('[role="option"]')) : [];
  }

  private activeOption(): CommandItem | null {
    const option = this.listOptions().find(opt => opt === document.activeElement);
    if (!option) {
      return null;
    }
    return this.items.find(item => item.id === option.dataset.paletteId) || null;
  }

  private updateActiveDescendant(): void {
    const input = this.input;
    const option = this.listOptions()[this.activeIndex];
    if (!input) {
      return;
    }
    if (option) {
      input.setAttribute('aria-activedescendant', option.id);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  private executing = false;

  private async execute(item: CommandItem): Promise<void> {
    if (this.executing) return; // 防止重复执行（连点 / 环境异常重入）
    this.executing = true;
    try {
      await this.runExecute(item);
    } finally {
      this.executing = false;
    }
  }

  private async runExecute(item: CommandItem): Promise<void> {
    this.recordRecent(item);
    if (item.kind === 'action') {
      const action = item as ActionCommandItem;
      try {
        await action.execute();
      } catch (error) {
        showToast(`命令执行失败：${action.label}`, { type: 'error' });
        return;
      }
      this.close();
      announceDone(action.label);
      showToast(`已执行：${action.label}`);
      return;
    }
    const route = item as RouteCommandItem;
    // 使用延迟 resolve：静态导入会在模块图加载期被 vi.mock 注入 mock，
    // 同时避免动态 import 在测试环境出现模块命名空间缓存不一致问题。
    const ok = await runActionForRoute(route.routeId);
    if (!ok) {
      showToast(`无法跳转到 ${route.label}，请刷新后重试`, { type: 'error' });
      return;
    }
    this.close();
    announceDone(route.label);
  }

  private recordRecent(item: CommandItem): void {
    const recent = writeRecentEntry(this.getRecent(), item.id, DEFAULT_MAX_RECENT);
    this.persistRecent(recent);
  }

  private runAction(actionId: string): void {
    const action = createActionItems().find(item => item.id === actionId);
    if (action) {
      void action.execute();
    }
  }
}

/** 路由导航的延迟委托：运行时才取真实 navigateToRouteId，保证测试 mock 生效。 */
async function runActionForRoute(routeId: RouteId): Promise<boolean> {
  try {
    const mod = await import('@/common/router/index');
    return await mod.navigateToRouteId(routeId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[cmdk] runActionForRoute error:', (error as Error).message);
    return false;
  }
}

if (!customElements.get('sops-command-palette')) {
  customElements.define('sops-command-palette', CommandPaletteElement);
}

export function createCommandPaletteElement(): CommandPaletteElement {
  return document.createElement('sops-command-palette') as CommandPaletteElement;
}
