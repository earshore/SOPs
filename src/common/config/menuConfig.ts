/**
 * menuConfig.ts - v3.0 Enterprise Edition (TypeScript)
 * 采用 Context -> Module -> Route 三层架构
 */

import { buildMenuRoutes } from './moduleManifest';
import { ROUTE_MANIFESTS } from './routeManifests';
import { validateModuleConfig, validateRouteConfig } from '../utils/typeGuards';
import type { RouteMeta } from '@/common/router/navigo/types';
// ==================== 类型定义 ====================

/**
 * Context配置（顶层导航上下文）
 */
export interface ContextConfig {
  id: string;
  label: string;
}

/**
 * Module配置（业务模块/子应用实体）
 */
export interface ModuleConfig {
  id: string;
  contextId: string;
  title: string;
  version: string;
  icon: string;
  description: string;
  parentModuleId?: string;
  themeColor?: string; // 模块主题色，如 'blue', 'emerald', 'purple' 等
}

/**
 * Category配置（分类）
 */
export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  color: string; // 颜色方案名称，如 'blue', 'emerald', 'amber' 等
  order: number;
  version: string;
  description: string;
}

/**
 * Route配置（具体页面路由）
 */
export interface RouteConfig {
  moduleId: string;
  label: string;
  icon: string;
  panelId: string;
  category?: string;
  viewPath?: string;
  meta?: RouteMeta;
}

/**
 * 完整路由配置（包含ID）
 */
export interface RouteWithId extends RouteConfig {
  id: string;
}

/**
 * 完整路由配置链
 */
export interface RouteFullConfig {
  route: RouteConfig;
  module: ModuleConfig;
  context: ContextConfig;
}

/**
 * 菜单配置结构
 */
export interface MenuConfig {
  contexts: Record<string, ContextConfig>;
  modules: Record<string, ModuleConfig>;
  sopCategories: Record<string, CategoryConfig>;
  hubCategories: Record<string, CategoryConfig>;
  moreCategories: Record<string, CategoryConfig>;
  appCategories: Record<string, CategoryConfig>;
  routes: Record<string, RouteConfig>;
}

// ==================== 配置数据 ====================

export const MENU_CONFIG: MenuConfig = {
  // ==========================================
  // Tier 1: Contexts (顶层导航上下文)
  // 作用：决定 Header 哪个按钮高亮
  // ==========================================
  contexts: {
    sops: { id: 'sops', label: 'SOPs 流程中心' },
    apps: { id: 'apps', label: '应用中心' },
    hub: { id: 'hub', label: 'Amazon 智库' },
    more: { id: 'more', label: '更多' },
    sys: { id: 'sys', label: '系统设置' },
  },

  // ==========================================
  // Tier 2: Modules (业务模块/子应用实体)
  // 作用：决定侧边栏 (Sidebar) 显示什么标题和哪些菜单
  // ==========================================
  modules: {
    // [系统] 首页模块
    home: {
      id: 'home',
      contextId: 'sys',
      title: '首页',
      version: 'v1.0',
      icon: 'fas fa-home',
      description: '系统首页，快速访问常用功能。',
      themeColor: 'slate',
    },

    // [应用 SOPs] 标准作业程序
    sops: {
      id: 'sops',
      contextId: 'sops',
      title: 'SOPs 流程中心',
      version: 'v1.0',
      icon: 'fas fa-clipboard-list',
      description: '集成所有亚马逊运营标准化流程指引,确保团队执行一致性。',
      themeColor: 'blue', // ✅ 蓝色 - 清新明亮的流程管理主题
    },

    // [应用中心] App Center 容器模块
    app_center: {
      id: 'app_center',
      contextId: 'apps',
      title: '应用中心',
      version: 'v1.0',
      icon: 'fas fa-cubes',
      description: '集成多个专业工具的应用中心，提供数据采集、分析与优化功能。',
      themeColor: 'cyan', // ✅ 青色 - 应用中心容器主题，避开 Keyword Hunter 紫红色
    },

    // [应用 A] Master Analysis
    master_analysis: {
      id: 'master_analysis',
      contextId: 'apps',
      parentModuleId: 'app_center',
      title: 'Master Analysis',
      version: 'v2.1 Pro',
      icon: 'fas fa-cubes-stacked',
      description: '集成数据采集、管理、AI分析与提示词工程的一站式解决方案。',
      themeColor: 'indigo', // ✅ 靛蓝色 - 保持不变，与紫色相近
    },

    // Playground 模块配置
    playground: {
      id: 'playground',
      contextId: 'apps',
      parentModuleId: 'app_center',
      title: 'Playground',
      version: 'v1.0',
      icon: 'fas fa-paper-plane',
      description: '轻量级 AI 对话试验台，当前内置 Deep Chat 页面用于快速问答与 Prompt 试验。',
      themeColor: 'orange',
    },

    // Keyword Tracker 模块配置
    keyword_tracker: {
      id: 'keyword_tracker',
      contextId: 'apps',
      parentModuleId: 'app_center',
      title: 'Keyword Hunter',
      version: 'v1.0 Pro',
      icon: 'fas fa-search',
      description: 'ASIN 关键词覆盖情况查询，手动补充与 SEO 合规性审查工具。',
      themeColor: 'rose', // ✅ 玫红色 - 鲜艳醒目的搜索主题
    },

    // PPC Tools 模块配置
    ppc_tools: {
      id: 'ppc_tools',
      contextId: 'apps',
      parentModuleId: 'app_center',
      title: 'PPC Tools',
      version: 'v1.0',
      icon: 'fas fa-bullhorn',
      description: '广告搜索词报表分析、否词与加词建议工具。',
      themeColor: 'emerald',
    },

    // [智库] Knowledge Base
    amz_hub: {
      id: 'amz_hub',
      contextId: 'hub',
      title: 'Amazon 智库',
      version: 'KB v1.0',
      icon: 'fas fa-book-open',
      description: '亚马逊市场洞察报告、SEO策略、A10 算法知识库、营销日历与旺季攻略。',
      themeColor: 'orange', // ✅ 调整为 orange，避免与分类冲突
    },

    // [更多] More Core Module
    more_core: {
      id: 'more_core',
      contextId: 'more',
      title: '更多',
      version: 'v1.0',
      icon: 'fas fa-compass',
      description: '探索更多实用功能和工具，提升工作效率。',
      themeColor: 'green', // ✅ 绿色 - 清新自然的探索主题
    },
  },

  // ==========================================
  // SOP Categories (用于SOPs模块的侧边栏分组)
  // ==========================================
  sopCategories: {
    growth: {
      id: 'growth',
      label: '运营与推广体系',
      icon: 'fas fa-rocket',
      color: 'emerald',
      order: 1,
      version: 'v2.0',
      description: '从新品上架到爆款打造的全链路运营推广策略集合。',
    },
    backend: {
      id: 'backend',
      label: '供应链与物流体系',
      icon: 'fas fa-warehouse',
      color: 'amber',
      order: 2,
      version: 'v1.5',
      description: '构建高效供应链，优化库存周转与物流成本。',
    },
    safety: {
      id: 'safety',
      label: '账号安全与风控体系',
      icon: 'fas fa-shield-halved',
      color: 'red',
      order: 3,
      version: 'v3.0',
      description: '全方位账号健康监控与风险防御机制。',
    },
    service: {
      id: 'service',
      label: '客服与客户体验体系',
      icon: 'fas fa-headset',
      color: 'teal', // ✅ 调整为 teal，避免占用蓝色
      order: 4,
      version: 'v1.2',
      description: '提升客户满意度，打造极致的品牌服务体验。',
    },
  },

  // ==========================================
  // Hub Categories (用于Amazon智库模块的侧边栏分组)
  // ==========================================
  hubCategories: {
    knowledge: {
      id: 'knowledge',
      label: 'Amazon知识早知道',
      icon: 'fas fa-lightbulb',
      color: 'indigo', // ✅ 调整为 indigo，避免占用蓝色
      order: 1,
      version: 'v1.0',
      description: '深入了解Amazon市场洞察、SEO策略与A10算法核心知识。',
    },
    practice: {
      id: 'practice',
      label: '入门实操宝典',
      icon: 'fas fa-hands',
      color: 'green', // ✅ 调整为 green，避免与 SOPs 冲突
      order: 2,
      version: 'v1.0',
      description: '从零开始的实战指南，掌握营销日历与促销工具使用技巧。',
    },
    advanced: {
      id: 'advanced',
      label: '运营提升全攻略',
      icon: 'fas fa-chart-line',
      color: 'rose', // ✅ 调整为 rose，避免与 Amazon知识早知道 的 indigo 过近
      order: 3,
      version: 'v1.0',
      description: '进阶运营策略，提升转化率与销售表现的系统方法论。',
    },
  },

  // ==========================================
  // More Categories (用于More模块的侧边栏分组)
  // ==========================================
  moreCategories: {
    explore: {
      id: 'explore',
      label: '大模型探索',
      icon: 'fas fa-compass',
      color: 'teal',
      order: 1,
      version: 'v1.0',
      description: '智能体、提示词、工作流等实用功能。',
    },
    business_scenarios: {
      id: 'business_scenarios',
      label: '示例业务场景',
      icon: 'fas fa-briefcase',
      color: 'cyan',
      order: 2,
      version: 'v1.0',
      description: 'OpenClaw 控制紫鸟浏览器的典型业务场景示例。',
    },
  },

  // ==========================================
  // App Center Categories (用于应用中心模块的侧边栏分组)
  // 按应用分组，而非功能分类
  // ==========================================
  appCategories: {
    master_analysis: {
      id: 'master_analysis',
      label: 'Master Analysis',
      icon: 'fas fa-cubes-stacked',
      color: 'indigo', // ✅ 靛蓝色，与模块主题色一致
      order: 1,
      version: 'v2.1 Pro',
      description: '集成数据采集、管理、AI分析与提示词工程的一站式解决方案。',
    },
    playground: {
      id: 'playground',
      label: 'Playground',
      icon: 'fas fa-paper-plane',
      color: 'orange',
      order: 2,
      version: 'v1.0',
      description: '轻量级 AI 对话试验台，当前内置 Deep Chat 页面用于快速问答与 Prompt 试验。',
    },
    keyword_tracker: {
      id: 'keyword_tracker',
      label: 'Keyword Hunter',
      icon: 'fas fa-search',
      color: 'rose', // 与应用总览的 Keyword Hunter 玫红主视觉保持一致
      order: 3,
      version: 'v1.0 Pro',
      description: 'ASIN 关键词覆盖情况查询，手动补充与 SEO 合规性审查工具。',
    },
    ppc_tools: {
      id: 'ppc_tools',
      label: 'PPC Tools',
      icon: 'fas fa-bullhorn',
      color: 'emerald',
      order: 4,
      version: 'v1.0',
      description: '广告搜索词报表分析、否词与加词建议工具。',
    },
  },

  // ==========================================
  // Tier 3: Routes (具体页面路由)
  // 作用：由各模块 module.manifest.ts 派生 routeId、菜单元数据和目标 Panel
  // ==========================================
  routes: buildMenuRoutes(ROUTE_MANIFESTS),
};

// ==================== Helper Functions ====================

/**
 * 获取某模块下的所有路由 (用于生成侧边栏)
 */
export function getRoutesByModule(moduleId: string): RouteWithId[] {
  return Object.entries(MENU_CONFIG.routes)
    .filter(([_, config]) => config.moduleId === moduleId)
    .map(([id, config]) => ({ id, ...config }));
}

/**
 * 获取路由的完整配置链 (Route -> Module -> Context)
 */
export function getRouteFullConfig(routeId: string): RouteFullConfig | null {
  const route = MENU_CONFIG.routes[routeId];
  if (!route) return null;

  const module = MENU_CONFIG.modules[route.moduleId];
  if (!module) return null;

  const context = MENU_CONFIG.contexts[module.contextId];
  if (!context) return null;

  return {
    route,
    module,
    context,
  };
}

// ================================================================
// 🎯 P2 增强: 模块自注册机制
// ================================================================

/**
 * 动态注册路由（带类型校验）
 * 允许模块在运行时注册自己的路由，无需修改此文件
 *
 * @param routeId - 路由 ID
 * @param config - 路由配置
 * @returns 是否注册成功
 *
 * @example
 * registerRoute('sops_new_feature', {
 *   moduleId: 'sops',
 *   label: '新功能',
 *   icon: 'fas fa-star',
 *   panelId: 'panel-sops',
 *   category: 'growth'
 * });
 */
export function registerRoute(routeId: string, config: RouteConfig): boolean {
  try {
    validateRouteConfig(config);
  } catch (error) {
    console.error(`[MenuConfig] 路由注册失败 "${routeId}":`, (error as Error).message);
    return false;
  }

  if (MENU_CONFIG.routes[routeId]) {
    return false;
  }

  MENU_CONFIG.routes[routeId] = config;
  return true;
}

/**
 * 动态注册模块（带类型校验）
 * @param moduleId - 模块 ID
 * @param config - 模块配置
 * @returns 是否注册成功
 */
export function registerModule(moduleId: string, config: Omit<ModuleConfig, 'id'>): boolean {
  try {
    validateModuleConfig({
      id: moduleId,
      ...config,
    });
  } catch (error) {
    console.error(`[MenuConfig] 模块注册失败 "${moduleId}":`, (error as Error).message);
    return false;
  }

  if (MENU_CONFIG.modules[moduleId]) {
    return false;
  }

  MENU_CONFIG.modules[moduleId] = {
    id: moduleId,
    ...config,
  };
  return true;
}

/**
 * 获取所有已注册的路由 ID
 */
export function getAllRouteIds(): string[] {
  return Object.keys(MENU_CONFIG.routes);
}

/**
 * 根据路由ID获取视图路径
 * @param routeId - 路由ID
 * @returns 视图路径
 */
export function getViewPathByRoute(routeId: string): string | null {
  const route = MENU_CONFIG.routes[routeId];
  if (!route) return null;

  // 根据panelId映射到对应的视图路径
  const viewPathMap: Record<string, string> = {
    'panel-sops': '/src/modules/sops/sops.html',
    'panel-app_center': '/src/modules/app_center/app_center.html',
    'panel-amz_hub': '/src/modules/amz_hub/amz_hub.html',
    'panel-more': '/src/modules/more/more.html',
  };

  return viewPathMap[route.panelId] || null;
}
