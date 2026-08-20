/**
 * HeaderGlobalSearch.ts - 全局顶栏搜索框（P1-2 二期）
 *
 * 取代侧边栏 / SOPs overview / 智库 overview 的模块级搜索框，
 * 在顶栏系统设置齿轮左侧提供跨模块的全局搜索入口：
 * - 复用 SearchBox 组件的同一 DOM 工厂与模糊匹配核心
 * - 不传 moduleId，检索全模块命令索引
 * - 结果条目沿用 `data-action="switch-tab"` 语义，直接走 actionRegistry
 *
 * 无 Alpine 模板、无内联 Tailwind 类，纯 DOM 构建，CSP 友好。
 */
import { createSearchBox, type SearchBoxHandle } from './SearchBox';

const CONTAINER_ID = 'global-search-container';

let searchHandle: SearchBoxHandle | null = null;

/**
 * 在顶栏挂载全局搜索框（幂等：已挂载时直接聚焦）。
 */
export function initHeaderGlobalSearch(): void {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    return;
  }

  if (searchHandle) {
    return;
  }

  searchHandle = createSearchBox({
    placeholder: '搜索功能、页面…',
    ariaLabel: '全局搜索',
    inputId: 'global-search-input',
    styleVariant: 'header',
    maxResults: 8,
  });

  searchHandle.mount(container);
}

/** 移除全局搜索框（路由跳转/卸载场景可复用）。 */
export function disposeHeaderGlobalSearch(): void {
  if (!searchHandle) {
    return;
  }
  searchHandle.destroy();
  searchHandle = null;
}
