/**
 * 模块CSS注册表
 * 定义每个模块需要加载的CSS文件
 * 支持按需懒加载和预加载策略
 *
 * 注意：生产环境中CSS通过import动态导入，路径由Vite处理
 *
 * Phase 3 优化：
 * - 所有模块自动依赖全局组件CSS (timeline, icon-container, badges, containers)
 * - 全局动画已整合到 keyframes.css
 */

export interface ModuleCssConfig {
  moduleId: string;
  cssImporter: () => Promise<unknown>; // 动态import函数
  priority: 'critical' | 'high' | 'normal' | 'low';
  preload?: boolean;
  dependencies?: (() => Promise<unknown>)[]; // 依赖的CSS导入函数
}

/**
 * 通用组件CSS依赖说明
 * 这些组件由全局 CSS 加载，模块无需重复导入:
 * - src/css/components/timeline.css
 * - src/css/components/icon-container.css
 * - src/css/components/badges.css
 * - src/css/utilities/containers.css
 * - src/css/animations/keyframes.css
 */

/**
 * 模块CSS配置注册表
 */
export const MODULE_CSS_REGISTRY: Record<string, ModuleCssConfig> = {
  // 首页模块
  home: {
    moduleId: 'home',
    cssImporter: () => import('../../modules/home/homeDisplay.css'),
    priority: 'high',
    preload: true,
  },

  // 应用中心
  app_center: {
    moduleId: 'app_center',
    cssImporter: () => import('../../modules/app_center/app_center_style.css'),
    priority: 'high',
    preload: true,
  },

  // 关键词猎手
  keyword_hunter: {
    moduleId: 'keyword_hunter',
    cssImporter: () =>
      import('../../modules/app_center/views/keyword_hunter/keyword_hunter_style.css'),
    priority: 'normal',
    preload: false,
    dependencies: [
      () => import('../../css/components/code-highlight.css'),
      () => import('../../css/components/markdown.css'),
    ],
  },

  // Master Analysis
  master_analysis: {
    moduleId: 'master_analysis',
    cssImporter: () =>
      import('../../modules/app_center/views/master_analysis/master_analysis_style.css'),
    priority: 'normal',
    preload: false,
  },

  // Scraper
  scraper: {
    moduleId: 'scraper',
    cssImporter: () =>
      import('../../modules/app_center/views/master_analysis/scraper/scraper_style.css'),
    priority: 'normal',
    preload: false,
  },

  // AI Analysis
  ai_analysis: {
    moduleId: 'ai_analysis',
    cssImporter: () =>
      import('../../modules/app_center/views/master_analysis/ai_analysis/ai_analysis_style.css'),
    priority: 'normal',
    preload: false,
    dependencies: [() => import('../../css/components/markdown.css')],
  },

  // SOPs模块
  sops: {
    moduleId: 'sops',
    cssImporter: () => import('../../modules/sops/sops_style.css'),
    priority: 'high',
    preload: true,
  },

  // Amazon Hub
  amz_hub: {
    moduleId: 'amz_hub',
    cssImporter: () => import('../../modules/amz_hub/amz_hub_style.css'),
    priority: 'normal',
    preload: false,
  },

  // More模块
  more: {
    moduleId: 'more',
    cssImporter: () => import('../../modules/more/more_style.css'),
    priority: 'normal',
    preload: false,
  },

  // Prompts探索
  prompts: {
    moduleId: 'prompts',
    cssImporter: () => import('../../modules/more/views/explore/prompts/prompts_style.css'),
    priority: 'low',
    preload: false,
  },
};

/**
 * 根据模块ID获取CSS配置
 */
export function getModuleCssConfig(moduleId: string): ModuleCssConfig | undefined {
  return MODULE_CSS_REGISTRY[moduleId];
}

/**
 * 获取所有需要预加载的模块
 */
export function getPreloadModules(): ModuleCssConfig[] {
  return Object.values(MODULE_CSS_REGISTRY).filter(config => config.preload);
}

/**
 * 根据优先级获取模块
 */
export function getModulesByPriority(priority: ModuleCssConfig['priority']): ModuleCssConfig[] {
  return Object.values(MODULE_CSS_REGISTRY).filter(config => config.priority === priority);
}

/**
 * 获取模块的所有CSS导入函数（包括依赖）
 */
export function getModuleAllCssImporters(moduleId: string): (() => Promise<unknown>)[] {
  const config = MODULE_CSS_REGISTRY[moduleId];
  if (!config) return [];

  const allImporters = [config.cssImporter];

  // 添加依赖导入函数
  if (config.dependencies) {
    allImporters.push(...config.dependencies);
  }

  return allImporters;
}
