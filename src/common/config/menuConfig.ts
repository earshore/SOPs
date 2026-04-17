/**
 * menuConfig.ts - v3.0 Enterprise Edition (TypeScript)
 * 采用 Context -> Module -> Route 三层架构
 */

import { validateRouteConfig, validateModuleConfig } from "../utils/typeGuards";
import {
  SOPS_ROUTES,
  APP_CENTER_ROUTES,
  AMZ_HUB_ROUTES,
  MORE_ROUTES,
  SYSTEM_ROUTES,
} from "../constants/routes";

import { Logger } from "../../services/loggerService";
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
    sops: { id: "sops", label: "SOPs 流程中心" },
    apps: { id: "apps", label: "应用中心" },
    hub: { id: "hub", label: "Amazon 智库" },
    more: { id: "more", label: "更多" },
    sys: { id: "sys", label: "系统设置" },
  },

  // ==========================================
  // Tier 2: Modules (业务模块/子应用实体)
  // 作用：决定侧边栏 (Sidebar) 显示什么标题和哪些菜单
  // ==========================================
  modules: {
    // [系统] 首页模块
    home: {
      id: "home",
      contextId: "sys",
      title: "首页",
      version: "v1.0",
      icon: "fas fa-home",
      description: "系统首页，快速访问常用功能。",
      themeColor: "slate",
    },

    // [应用 SOPs] 标准作业程序
    sops: {
      id: "sops",
      contextId: "sops",
      title: "SOPs 流程中心",
      version: "v1.0",
      icon: "fas fa-clipboard-list",
      description: "集成所有亚马逊运营标准化流程指引,确保团队执行一致性。",
      themeColor: "blue", // ✅ 蓝色 - 清新明亮的流程管理主题
    },

    // [应用中心] App Center 容器模块
    app_center: {
      id: "app_center",
      contextId: "apps",
      title: "应用中心",
      version: "v1.0",
      icon: "fas fa-cubes",
      description: "集成多个专业工具的应用中心，提供数据采集、分析与优化功能。",
      themeColor: "purple", // ✅ 紫色 - 应用中心主题
    },

    // [应用 A] Master Analysis
    master_analysis: {
      id: "master_analysis",
      contextId: "apps",
      parentModuleId: "app_center",
      title: "Master Analysis",
      version: "v2.1 Pro",
      icon: "fas fa-cubes-stacked",
      description: "集成数据采集、管理、AI分析与提示词工程的一站式解决方案。",
      themeColor: "indigo", // ✅ 靛蓝色 - 保持不变，与紫色相近
    },

    // Keyword Tracker 模块配置
    keyword_tracker: {
      id: "keyword_tracker",
      contextId: "apps",
      parentModuleId: "app_center",
      title: "Keyword Hunter",
      version: "v1.0 Pro",
      icon: "fas fa-search",
      description: "ASIN 关键词覆盖情况查询，手动补充与 SEO 合规性审查工具。",
      themeColor: "fuchsia", // ✅ 紫红色 - 鲜艳醒目的搜索主题
    },

    // [智库] Knowledge Base
    amz_hub_core: {
      id: "amz_hub_core",
      contextId: "hub",
      title: "Amazon 智库",
      version: "KB v1.0",
      icon: "fas fa-book-open",
      description:
        "亚马逊市场洞察报告、SEO策略、A10 算法知识库、营销日历与旺季攻略。",
      themeColor: "orange", // ✅ 调整为 orange，避免与分类冲突
    },

    // [更多] More Core Module
    more_core: {
      id: "more_core",
      contextId: "more",
      title: "更多",
      version: "v1.0",
      icon: "fas fa-compass",
      description: "探索更多实用功能和工具，提升工作效率。",
      themeColor: "green", // ✅ 绿色 - 清新自然的探索主题
    },
  },

  // ==========================================
  // SOP Categories (用于SOPs模块的侧边栏分组)
  // ==========================================
  sopCategories: {
    growth: {
      id: "growth",
      label: "运营与推广体系",
      icon: "fas fa-rocket",
      color: "emerald",
      order: 1,
      version: "v2.0",
      description: "从新品上架到爆款打造的全链路运营推广策略集合。",
    },
    backend: {
      id: "backend",
      label: "供应链与物流体系",
      icon: "fas fa-warehouse",
      color: "amber",
      order: 2,
      version: "v1.5",
      description: "构建高效供应链，优化库存周转与物流成本。",
    },
    safety: {
      id: "safety",
      label: "账号安全与风控体系",
      icon: "fas fa-shield-halved",
      color: "red",
      order: 3,
      version: "v3.0",
      description: "全方位账号健康监控与风险防御机制。",
    },
    service: {
      id: "service",
      label: "客服与客户体验体系",
      icon: "fas fa-headset",
      color: "teal", // ✅ 调整为 teal，避免占用蓝色
      order: 4,
      version: "v1.2",
      description: "提升客户满意度，打造极致的品牌服务体验。",
    },
  },

  // ==========================================
  // Hub Categories (用于Amazon智库模块的侧边栏分组)
  // ==========================================
  hubCategories: {
    knowledge: {
      id: "knowledge",
      label: "Amazon知识早知道",
      icon: "fas fa-lightbulb",
      color: "indigo", // ✅ 调整为 indigo，避免占用蓝色
      order: 1,
      version: "v1.0",
      description: "深入了解Amazon市场洞察、SEO策略与A10算法核心知识。",
    },
    practice: {
      id: "practice",
      label: "入门实操宝典",
      icon: "fas fa-hands",
      color: "green", // ✅ 调整为 green，避免与 SOPs 冲突
      order: 2,
      version: "v1.0",
      description: "从零开始的实战指南，掌握营销日历与促销工具使用技巧。",
    },
    advanced: {
      id: "advanced",
      label: "运营提升全攻略",
      icon: "fas fa-chart-line",
      color: "violet", // ✅ 调整为 violet，避免与 keyword_tracker 冲突
      order: 3,
      version: "v1.0",
      description: "进阶运营策略，提升转化率与销售表现的系统方法论。",
    },
  },

  // ==========================================
  // More Categories (用于More模块的侧边栏分组)
  // ==========================================
  moreCategories: {
    explore: {
      id: "explore",
      label: "大模型探索",
      icon: "fas fa-compass",
      color: "lime",
      order: 1,
      version: "v1.0",
      description: "智能体、提示词、工作流等实用功能。",
    },
  },

  // ==========================================
  // App Center Categories (用于应用中心模块的侧边栏分组)
  // 按应用分组，而非功能分类
  // ==========================================
  appCategories: {
    master_analysis: {
      id: "master_analysis",
      label: "Master Analysis",
      icon: "fas fa-robot",
      color: "indigo", // ✅ 靛蓝色，与模块主题色一致
      order: 1,
      version: "v2.1 Pro",
      description: "集成数据采集、管理、AI分析与提示词工程的一站式解决方案。",
    },
    keyword_tracker: {
      id: "keyword_tracker",
      label: "Keyword Hunter",
      icon: "fas fa-search",
      color: "fuchsia", // ✅ 紫红色，与模块主题色一致
      order: 2,
      version: "v1.0 Pro",
      description: "ASIN 关键词覆盖情况查询，手动补充与 SEO 合规性审查工具。",
    },
  },

  // ==========================================
  // Tier 3: Routes (具体页面路由)
  // 作用：定义点击行为、图标、目标 Panel
  // ==========================================
  routes: {
    // ==========================================
    // 系统路由
    // ==========================================
    [SYSTEM_ROUTES.HOME]: {
      moduleId: "home",
      label: "首页",
      icon: "fas fa-home",
      panelId: "panel-home",
      viewPath: "/src/modules/home/homeDisplay.html",
    },

    // ==========================================
    // SOPs 流程中心路由
    // ==========================================

    // --- 属于 SOPs 应用的页面 ---
    [SOPS_ROUTES.OVERVIEW]: {
      moduleId: "sops",
      label: "SOP 总览",
      icon: "fas fa-th-large",
      panelId: "panel-sops",
      viewPath: "/src/modules/sops/sops.html",
    },

    // === 第一模块：运营与推广体系 (The Growth Layer) ===
    [SOPS_ROUTES.NPI_TRACKER]: {
      moduleId: "sops",
      label: "新品生命周期跟踪",
      icon: "fas fa-seedling",
      panelId: "panel-sops",
      category: "growth",
    },
    [SOPS_ROUTES.LISTING_SEO]: {
      moduleId: "sops",
      label: "Listing 极致优化 (SEO)",
      icon: "fas fa-magnifying-glass-chart",
      panelId: "panel-sops",
      category: "growth",
    },
    [SOPS_ROUTES.PPC_ADVERTISING]: {
      moduleId: "sops",
      label: "PPC 广告投放与优化",
      icon: "fas fa-chart-line",
      panelId: "panel-sops",
      category: "growth",
    },
    [SOPS_ROUTES.RESTRICTED_WORDS]: {
      moduleId: "sops",
      label: "欧洲本土化高危词库",
      icon: "fas fa-book-dead",
      panelId: "panel-sops",
      category: "growth",
    },
    [SOPS_ROUTES.PROMOTION_SUBMISSION]: {
      moduleId: "sops",
      label: "促销活动提报",
      icon: "fas fa-tags",
      panelId: "panel-sops",
      category: "growth",
    },
    [SOPS_ROUTES.COMPETITOR_MONITORING]: {
      moduleId: "sops",
      label: "竞品监控与分析",
      icon: "fas fa-binoculars",
      panelId: "panel-sops",
      category: "growth",
    },

    // === 第二模块：供应链与物流体系 (The Backend Layer) ===
    [SOPS_ROUTES.FBA_SHIPPING]: {
      moduleId: "sops",
      label: "FBA 发货标准操作",
      icon: "fas fa-truck-fast",
      panelId: "panel-sops",
      category: "backend",
    },
    [SOPS_ROUTES.PROCUREMENT_QC]: {
      moduleId: "sops",
      label: "采购与质检 (QC)",
      icon: "fas fa-clipboard-check",
      panelId: "panel-sops",
      category: "backend",
    },
    [SOPS_ROUTES.INVENTORY_REPLENISHMENT]: {
      moduleId: "sops",
      label: "库存预警与补货",
      icon: "fas fa-cubes",
      panelId: "panel-sops",
      category: "backend",
    },

    // === 第三模块：账号安全与风控体系 (The Safety Layer) ===
    [SOPS_ROUTES.ACCOUNT_SECURITY]: {
      moduleId: "sops",
      label: "账号登录与环境安全",
      icon: "fas fa-shield-halved",
      panelId: "panel-sops",
      category: "safety",
    },
    [SOPS_ROUTES.PERMISSION_MANAGEMENT]: {
      moduleId: "sops",
      label: "后台权限管理",
      icon: "fas fa-user-lock",
      panelId: "panel-sops",
      category: "safety",
    },
    [SOPS_ROUTES.BRAND_INFRINGEMENT]: {
      moduleId: "sops",
      label: "品牌与侵权审核",
      icon: "fas fa-trademark",
      panelId: "panel-sops",
      category: "safety",
    },
    [SOPS_ROUTES.PERFORMANCE_NOTIFICATION]: {
      moduleId: "sops",
      label: "绩效通知处理",
      icon: "fas fa-bell",
      panelId: "panel-sops",
      category: "safety",
    },
    [SOPS_ROUTES.PRODUCT_COMPLIANCE]: {
      moduleId: "sops",
      label: "敏感产品合规销售",
      icon: "fas fa-file-shield",
      panelId: "panel-sops",
      category: "safety",
    },
    [SOPS_ROUTES.EU_GPSR_COMPLIANCE]: {
      moduleId: "sops",
      label: "欧洲GPSR合规",
      icon: "fa-solid fa-shield-dog",
      panelId: "panel-sops",
      category: "safety",
    },

    // === 第四模块：客服与客户体验体系 (The Service Layer) ===
    [SOPS_ROUTES.EMAIL_TEMPLATES]: {
      moduleId: "sops",
      label: "邮件回复模板",
      icon: "fas fa-envelope-open-text",
      panelId: "panel-sops",
      category: "service",
    },
    [SOPS_ROUTES.NEGATIVE_REVIEW]: {
      moduleId: "sops",
      label: "差评处理与分析",
      icon: "fas fa-comment-dots",
      panelId: "panel-sops",
      category: "service",
    },
    [SOPS_ROUTES.QA_MAINTENANCE]: {
      moduleId: "sops",
      label: "QA 问答维护",
      icon: "fas fa-comments",
      panelId: "panel-sops",
      category: "service",
    },

    // ==========================================
    // App Center 应用中心路由
    // ==========================================

    // App Center 总览页面
    [APP_CENTER_ROUTES.OVERVIEW]: {
      moduleId: "app_center",
      label: "应用总览",
      icon: "fas fa-th-large",
      panelId: "panel-app_center",
    },

    // --- Master Analysis 应用 ---
    [APP_CENTER_ROUTES.SCRAPER]: {
      moduleId: "master_analysis",
      label: "数据采集",
      icon: "fas fa-spider",
      panelId: "panel-app_center",
      category: "master_analysis",
    },
    [APP_CENTER_ROUTES.AI_ANALYSIS]: {
      moduleId: "master_analysis",
      label: "AI智能分析",
      icon: "fas fa-brain",
      panelId: "panel-app_center",
      category: "master_analysis",
    },
    [APP_CENTER_ROUTES.PROMPTLAB]: {
      moduleId: "master_analysis",
      label: "Prompt 生成",
      icon: "fas fa-wand-magic-sparkles",
      panelId: "panel-app_center",
      category: "master_analysis",
    },

    // --- Keyword Hunter 应用 ---
    [APP_CENTER_ROUTES.KW_INPUT]: {
      moduleId: "keyword_tracker",
      label: "输入模块",
      icon: "fas fa-keyboard",
      panelId: "panel-app_center",
      category: "keyword_tracker",
    },
    [APP_CENTER_ROUTES.KW_PROCESS]: {
      moduleId: "keyword_tracker",
      label: "处理模块",
      icon: "fas fa-cogs",
      panelId: "panel-app_center",
      category: "keyword_tracker",
    },
    [APP_CENTER_ROUTES.KW_ANALYSIS]: {
      moduleId: "keyword_tracker",
      label: "分析统计",
      icon: "fas fa-chart-pie",
      panelId: "panel-app_center",
      category: "keyword_tracker",
    },

    // ==========================================
    // Amazon 智库路由
    // ==========================================

    // 总览页面
    [AMZ_HUB_ROUTES.OVERVIEW]: {
      moduleId: "amz_hub_core",
      label: "智库总览",
      icon: "fas fa-th-large",
      panelId: "panel-amz_hub",
    },

    // === Amazon知识早知道 ===
    [AMZ_HUB_ROUTES.EU_INSIGHTS]: {
      moduleId: "amz_hub_core",
      label: "市场洞察",
      icon: "fas fa-globe-europe",
      panelId: "panel-amz_hub",
      category: "knowledge",
    },
    [AMZ_HUB_ROUTES.SEO_STRATEGY]: {
      moduleId: "amz_hub_core",
      label: "SEO 策略",
      icon: "fas fa-magnifying-glass-chart",
      panelId: "panel-amz_hub",
      category: "knowledge",
    },
    [AMZ_HUB_ROUTES.ECOSYSTEM]: {
      moduleId: "amz_hub_core",
      label: "A10 & COSMO",
      icon: "fas fa-network-wired",
      panelId: "panel-amz_hub",
      category: "knowledge",
    },

    // === 入门实操宝典 ===
    [AMZ_HUB_ROUTES.QUALITY_LISTING]: {
      moduleId: "amz_hub_core",
      label: "教你打造优质Listing",
      icon: "fas fa-star",
      panelId: "panel-amz_hub",
      category: "practice",
    },
    [AMZ_HUB_ROUTES.MARKETING_CALENDAR]: {
      moduleId: "amz_hub_core",
      label: "EU营销日历",
      icon: "fas fa-calendar-alt",
      panelId: "panel-amz_hub",
      category: "practice",
    },
    [AMZ_HUB_ROUTES.PROMO_ACTIVITIES]: {
      moduleId: "amz_hub_core",
      label: "促销活动",
      icon: "fa-solid fa-gift",
      panelId: "panel-amz_hub",
      category: "practice",
    },
    [AMZ_HUB_ROUTES.PROMO_TOOLS]: {
      moduleId: "amz_hub_core",
      label: "促销工具",
      icon: "fas fa-tools",
      panelId: "panel-amz_hub",
      category: "practice",
    },

    // === 运营提升全攻略 ===
    [AMZ_HUB_ROUTES.NEW_PRODUCT_30DAYS]: {
      moduleId: "amz_hub_core",
      label: "新品30天极速突围",
      icon: "fas fa-rocket",
      panelId: "panel-amz_hub",
      category: "advanced",
    },
    [AMZ_HUB_ROUTES.CONVERSION_OPTIMIZATION]: {
      moduleId: "amz_hub_core",
      label: "链接转化率低自查优化",
      icon: "fas fa-chart-line",
      panelId: "panel-amz_hub",
      category: "advanced",
    },

    // ==========================================
    // More 更多模块路由
    // ==========================================

    // --- 属于 More 模块的页面 ---
    [MORE_ROUTES.OVERVIEW]: {
      moduleId: "more_core",
      label: "更多总览",
      icon: "fas fa-th-large",
      panelId: "panel-more",
    },

    // === 探索体系 (The Explore Layer) ===
    [MORE_ROUTES.AGENTS]: {
      moduleId: "more_core",
      label: "智能体",
      icon: "fas fa-robot",
      panelId: "panel-more",
      category: "explore",
    },
    [MORE_ROUTES.PROMPTS]: {
      moduleId: "more_core",
      label: "提示词",
      icon: "fas fa-message",
      panelId: "panel-more",
      category: "explore",
    },
    [MORE_ROUTES.WORKFLOWS]: {
      moduleId: "more_core",
      label: "工作流",
      icon: "fas fa-diagram-project",
      panelId: "panel-more",
      category: "explore",
    },
  },
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
  // 运行时类型校验
  try {
    validateRouteConfig(config);
  } catch (error) {
    Logger.error(
      `[MenuConfig] 路由注册失败 "${routeId}":`,
      (error as Error).message,
    );
    return false;
  }

  if (MENU_CONFIG.routes[routeId]) {
    Logger.warn(`[MenuConfig] 路由 "${routeId}" 已存在，跳过注册`);
    return false;
  }

  MENU_CONFIG.routes[routeId] = config;
  Logger.debug(`✅ [MenuConfig] 动态注册路由: ${routeId}`);
  return true;
}

/**
 * 动态注册模块（带类型校验）
 * @param moduleId - 模块 ID
 * @param config - 模块配置
 * @returns 是否注册成功
 */
export function registerModule(
  moduleId: string,
  config: Omit<ModuleConfig, "id">,
): boolean {
  // 运行时类型校验
  try {
    validateModuleConfig({
      id: moduleId,
      ...config,
    });
  } catch (error) {
    Logger.error(
      `[MenuConfig] 模块注册失败 "${moduleId}":`,
      (error as Error).message,
    );
    return false;
  }

  if (MENU_CONFIG.modules[moduleId]) {
    Logger.warn(`[MenuConfig] 模块 "${moduleId}" 已存在，跳过注册`);
    return false;
  }

  MENU_CONFIG.modules[moduleId] = {
    id: moduleId,
    ...config,
  };
  Logger.debug(`✅ [MenuConfig] 动态注册模块: ${moduleId}`);
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
    "panel-sops": "/src/modules/sops/sops.html",
    "panel-app_center": "/src/modules/app_center/app_center.html",
    "panel-amz_hub": "/src/modules/amz_hub/amz_hub.html",
    "panel-more": "/src/modules/more/more.html",
  };

  return viewPathMap[route.panelId] || null;
}
