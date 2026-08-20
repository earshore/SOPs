/**
 * buildIndex.ts - 命令面板与统一搜索框的静态索引构建（纯函数，无 DOM 依赖）
 *
 * 数据源为 ROUTE_MANIFESTS（全量路由清单，随路由变更自动生效）与
 * MENU_CONFIG.modules（模块中文名）。索引在模块加载期构建一次并缓存，
 * 路由条目的顺序由 manifests 顺序决定（模块序 > 路由序），排序由
 * filterCommands 负责。
 */
import { MENU_CONFIG } from '@/common/config/menuConfig';
import { ROUTE_MANIFESTS } from '@/common/config/routeManifests';

import type { ActionCommandItem, CommandItem, RouteCommandItem } from './types';

export interface BuildIndexOptions {
  /** 路由条目附加的检索关键词（可选，路由 label 与类别外的别名）。 */
  routeKeywords?: Record<string, string[]>;
  /** 路由 id → 动作条目的映射（可选，与路由条目互斥，由 actions.ts 装配）。 */
  actionItems?: ActionCommandItem[];
}

/** 将路由清单转换为可检索的 CommandItem 索引。 */
export function buildCommandIndex(
  manifests: typeof ROUTE_MANIFESTS = ROUTE_MANIFESTS,
  options: BuildIndexOptions = {}
): CommandItem[] {
  const items: CommandItem[] = [];
  for (const manifest of manifests) {
    const moduleConfig = MENU_CONFIG.modules[manifest.moduleId];
    const moduleLabel = moduleConfig?.title ?? manifest.moduleId;
    for (const route of manifest.routes) {
      const item: RouteCommandItem = {
        kind: 'route',
        id: route.routeId,
        routeId: route.routeId as RouteCommandItem['routeId'],
        label: route.label,
        icon: route.icon,
        moduleLabel,
        moduleId: 'moduleId' in route ? (route.moduleId ?? manifest.moduleId) : manifest.moduleId,
        category: 'category' in route ? route.category : undefined,
        keywords: options.routeKeywords?.[route.routeId],
      };
      items.push(item);
    }
  }
  if (options.actionItems) {
    items.push(...options.actionItems);
  }
  return items;
}

/** 按模块过滤索引条目（供 SearchBox 单模块模式复用，保持与面板同口径）。 */
export function filterByModule(items: CommandItem[], moduleId: string): CommandItem[] {
  if (!moduleId) {
    return items;
  }
  return items.filter(item => item.kind !== 'action' && item.moduleId === moduleId);
}
