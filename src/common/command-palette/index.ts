/**
 * command-palette/index.ts - P1-2 ⌘K 命令面板公开 API
 *
 * 生命周期：应用初始化时调用一次 initCommandPalette（在 initRouter 之后），
 * 注册全局 ⌘K / Ctrl+K 快捷键。面板按需创建，仅在 openCommandPalette()
 * 调用时插入 DOM 并 showModal()，非首屏开销为零。
 */
import './CommandPalette';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';

import { CommandPaletteElement } from './CommandPalette';

let palette: CommandPaletteElement | null = null;
let initialized = false;

function ensurePalette(): CommandPaletteElement {
  if (!palette || !document.body.contains(palette)) {
    palette = new CommandPaletteElement();
  }
  return palette;
}

/** 唤起命令面板，可带初始查询。 */
export function openCommandPalette(initialQuery?: string): void {
  ensurePalette().open(initialQuery || '');
  eventBus.emit(APP_EVENTS.COMMAND_PALETTE_OPEN);
}

/** 关闭命令面板。 */
export function closeCommandPalette(): void {
  palette?.close();
  eventBus.emit(APP_EVENTS.COMMAND_PALETTE_CLOSE);
}

/** 全局快捷键：任意位置 ⌘K / Ctrl+K 唤起；输入框聚焦时不拦截（允许浏览器默认行为）。 */
export function initCommandPalette(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  document.addEventListener('keydown', event => {
    const isMetaK = event.metaKey && event.key.toLowerCase() === 'k';
    const isCtrlK = event.ctrlKey && event.key.toLowerCase() === 'k';
    if (!isMetaK && !isCtrlK) {
      return;
    }
    const active = document.activeElement;
    const isTyping =
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable);
    if (isTyping) {
      return;
    }
    event.preventDefault();
    openCommandPalette();
  });
}
