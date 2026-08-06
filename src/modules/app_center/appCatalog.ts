import { SystemError } from '@/common/errors/AppError';
import { appCenterManifest } from './module.manifest';

type AppCenterManifestRoute = (typeof appCenterManifest.routes)[number];
export type AppCenterRouteId = AppCenterManifestRoute['routeId'];

export interface AppCenterCatalogCategory {
  id: string;
  label: string;
  icon: string;
}

export interface AppCenterCatalogGroup {
  id: string;
  category: AppCenterCatalogCategory['id'];
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  cardClass: string;
  badge: string;
  primaryRouteId: AppCenterRouteId;
  routeIds: readonly AppCenterRouteId[];
  tags: readonly string[];
  searchKeywords: readonly string[];
}

const manifestRouteIds = new Set(appCenterManifest.routes.map(route => route.routeId));

export const APP_CENTER_CATALOG_CATEGORIES: readonly AppCenterCatalogCategory[] = [
  { id: 'master_analysis', label: 'Master Analysis', icon: 'fas fa-cubes-stacked' },
  { id: 'playground', label: 'Playground', icon: 'fas fa-paper-plane' },
  { id: 'keyword_hunter', label: 'Keyword Hunter', icon: 'fas fa-search' },
  { id: 'ppc_tools', label: 'PPC Tools', icon: 'fas fa-bullhorn' },
] as const;

export const APP_CENTER_CATALOG_GROUPS: readonly AppCenterCatalogGroup[] = [
  {
    id: 'master-analysis',
    category: 'master_analysis',
    title: 'Master Analysis',
    subtitle: '采集、分析、Prompt 生成',
    description: '从竞品数据采集开始，沉淀分析报告，再进入 AI 分析和 Prompt Lab。',
    icon: 'fas fa-cubes-stacked',
    cardClass: 'app-card-qwen',
    badge: '3 入口',
    primaryRouteId: 'scraper',
    routeIds: ['scraper', 'ai_analysis', 'promptlab'],
    tags: ['数据采集', 'AI 分析'],
    searchKeywords: ['master analysis', '数据采集', 'ai 智能分析', 'prompt 生成'],
  },
  {
    id: 'playground',
    category: 'playground',
    title: 'Playground',
    subtitle: 'Deep Chat 与 Prompt 试验',
    description: '复用系统模型配置，进行快速问答、Prompt 验证和日常分析。',
    icon: 'fas fa-paper-plane',
    cardClass: 'app-card-claude',
    badge: '即时对话',
    primaryRouteId: 'playground_deep_chat',
    routeIds: ['playground_deep_chat'],
    tags: ['Deep Chat'],
    searchKeywords: ['playground', 'deep chat', 'prompt 试验', '即时对话'],
  },
  {
    id: 'keyword-hunter',
    category: 'keyword_hunter',
    title: 'Keyword Hunter',
    subtitle: '关键词输入、处理、分析',
    description: '检查 ASIN 关键词覆盖，整理手动补充词，并输出 SEO 复核结果。',
    icon: 'fas fa-search',
    cardClass: 'app-card-cyan',
    badge: '3 入口',
    primaryRouteId: 'keyword_hunter_input',
    routeIds: ['keyword_hunter_input', 'keyword_hunter_process', 'keyword_hunter_analysis'],
    tags: ['SEO 处理', 'Listing 评审'],
    searchKeywords: ['keyword hunter', '关键词', '输入格式化', 'seo 处理', 'listing 评审'],
  },
  {
    id: 'ppc-tools',
    category: 'ppc_tools',
    title: 'PPC Tools',
    subtitle: '广告搜索词动作清单',
    description: '导入 Search Term 报表，生成否词、加精准、加预算、降竞价和词池建议。',
    icon: 'fas fa-bullhorn',
    cardClass: 'app-card-emerald',
    badge: '动作清单',
    primaryRouteId: 'ppc_search_terms',
    routeIds: ['ppc_search_terms'],
    tags: ['搜索词'],
    searchKeywords: ['ppc tools', '广告', '搜索词', '分析器', '动作清单'],
  },
] as const;

export function getAppCenterCatalogRoute(routeId: AppCenterRouteId): AppCenterManifestRoute {
  const route = appCenterManifest.routes.find(item => item.routeId === routeId);

  if (!route) {
    throw new SystemError(
      `App Center catalog route "${routeId}" is not declared in module.manifest.ts`,
      'APP_CATALOG_001',
      { module: 'appCatalog', action: 'getAppCenterCatalogRoute', routeId }
    );
  }

  return route;
}

export function getAppCenterCatalogRouteIds(): AppCenterRouteId[] {
  return APP_CENTER_CATALOG_GROUPS.flatMap(group => [...group.routeIds]);
}

export function getAppCenterCatalogCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = { all: APP_CENTER_CATALOG_GROUPS.length };

  APP_CENTER_CATALOG_CATEGORIES.forEach(category => {
    counts[category.id] = APP_CENTER_CATALOG_GROUPS.filter(
      group => group.category === category.id
    ).length;
  });

  return counts;
}

APP_CENTER_CATALOG_GROUPS.forEach(group => {
  if (!group.routeIds.includes(group.primaryRouteId)) {
    throw new SystemError(
      `App Center catalog group "${group.id}" does not include its primary route`,
      'APP_CATALOG_002',
      { module: 'appCatalog', action: 'validateCatalog', groupId: group.id }
    );
  }

  group.routeIds.forEach(routeId => {
    if (!manifestRouteIds.has(routeId)) {
      throw new SystemError(
        `App Center catalog references unknown route "${routeId}"`,
        'APP_CATALOG_003',
        { module: 'appCatalog', action: 'validateCatalog', routeId }
      );
    }
  });
});

const catalogRouteIds = new Set(getAppCenterCatalogRouteIds());
appCenterManifest.routes.forEach(route => {
  if (route.routeId !== 'app_center_overview' && !catalogRouteIds.has(route.routeId)) {
    throw new SystemError(
      `App Center catalog is missing manifest route "${route.routeId}"`,
      'APP_CATALOG_004',
      { module: 'appCatalog', action: 'validateCatalog', routeId: route.routeId }
    );
  }
});
