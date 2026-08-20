/**
 * types.ts - ⌘K 命令面板与统一搜索框的共享类型定义
 *
 * 单一数据源：CommandItem 由 buildCommandIndex 从 ROUTE_MANIFESTS 生成，
 * 路由条目天然携带类型安全的 routeId。SearchBox 与 CommandPalette 共用
 * filterCommands 的同一匹配口径。
 */
import type { RouteId } from '@/common/constants/routes';

/** 统一索引中可被搜索的条目（供 SearchBox 与命令面板共用）。 */
export interface SearchIndexItem {
  /** 唯一标识，路由条目为 routeId，动作条目为动作 id。 */
  id: string;
  /** 显示标签（路由为 MENU_CONFIG label）。 */
  label: string;
  /** FontAwesome 图标类，如 'fas fa-seedling'。 */
  icon: string;
  /** 所属模块中文名，如 'SOPs 流程中心'。 */
  moduleLabel: string;
  /** 所属模块 id（用于单模块过滤）。 */
  moduleId: string;
  /** 路由类别（growth/backend/safety/service/knowledge 等），可为空。 */
  category?: string;
  /** 附加检索关键词（动作命令必填，路由条目可为空）。 */
  keywords?: string[];
  /** 条目类型：路由跳转 / 静态动作 / 最近使用。 */
  kind: 'route' | 'action' | 'recent';
}

/** 路由命令条目。 */
export interface RouteCommandItem extends SearchIndexItem {
  kind: 'route';
  routeId: RouteId;
}

/** 静态动作命令条目。 */
export interface ActionCommandItem extends SearchIndexItem {
  kind: 'action';
  /** 中文描述，供面板列表副标题展示。 */
  description?: string;
  /** 检索关键词必填。 */
  keywords: string[];
  /** 执行器：纯函数，测试可 mock。 */
  execute: () => void | Promise<void>;
}

/** 最近使用条目（由 localStorage 读出，仅用于排序置顶）。 */
export interface RecentItem {
  id: string;
  at: number;
}

export type CommandItem = RouteCommandItem | ActionCommandItem;

export type { RouteId } from '@/common/constants/routes';
export const COMMAND_PALETTE_STORAGE_KEY = 'sops:command-palette:recent';
