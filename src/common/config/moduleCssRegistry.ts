/**
 * 模块CSS注册表
 * 定义每个模块需要加载的CSS文件
 * 支持按需懒加载和预加载策略
 */

export interface ModuleCssConfig {
  moduleId: string;
  cssFiles: string[];
  priority: 'critical' | 'high' | 'normal' | 'low';
  preload?: boolean;
  dependencies?: string[]; // 依赖的其他CSS文件
}

/**
 * 模块CSS配置注册表
 */
export const MODULE_CSS_REGISTRY: Record<string, ModuleCssConfig> = {
  // 首页模块
  home: {
    moduleId: 'home',
    cssFiles: [
      '/src/modules/home/homeDisplay.css'
    ],
    priority: 'high',
    preload: true
  },
  
  // 应用中心
  app_center: {
    moduleId: 'app_center',
    cssFiles: [
      '/src/modules/app_center/app_center_style.css'
    ],
    priority: 'high',
    preload: true
  },
  
  // 关键词猎手
  keyword_hunter: {
    moduleId: 'keyword_hunter',
    cssFiles: [
      '/src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css'
    ],
    priority: 'normal',
    preload: false,
    dependencies: [
      '/src/css/components/code-highlight.css',
      '/src/css/components/markdown.css'
    ]
  },
  
  // Master Analysis
  master_analysis: {
    moduleId: 'master_analysis',
    cssFiles: [
      '/src/modules/app_center/views/master_analysis/master_analysis_style.css'
    ],
    priority: 'normal',
    preload: false
  },
  
  // Scraper
  scraper: {
    moduleId: 'scraper',
    cssFiles: [
      '/src/modules/app_center/views/master_analysis/scraper/scraper_style.css'
    ],
    priority: 'normal',
    preload: false
  },
  
  // AI Analysis
  ai_analysis: {
    moduleId: 'ai_analysis',
    cssFiles: [
      '/src/modules/app_center/views/master_analysis/ai_analysis/ai_analysis_style.css'
    ],
    priority: 'normal',
    preload: false,
    dependencies: [
      '/src/css/components/markdown.css'
    ]
  },
  
  // SOPs模块
  sops: {
    moduleId: 'sops',
    cssFiles: [
      '/src/modules/sops/sops_style.css'
    ],
    priority: 'high',
    preload: true
  },
  
  // Amazon Hub
  amz_hub: {
    moduleId: 'amz_hub',
    cssFiles: [
      '/src/modules/amz_hub/amz_hub_style.css'
    ],
    priority: 'normal',
    preload: false
  },
  
  // More模块
  more: {
    moduleId: 'more',
    cssFiles: [
      '/src/modules/more/more_style.css'
    ],
    priority: 'normal',
    preload: false
  },
  
  // Prompts探索
  prompts: {
    moduleId: 'prompts',
    cssFiles: [
      '/src/modules/more/views/explore/prompts/prompts_style.css'
    ],
    priority: 'low',
    preload: false
  }
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
 * 获取模块的所有CSS文件（包括依赖）
 */
export function getModuleAllCssFiles(moduleId: string): string[] {
  const config = MODULE_CSS_REGISTRY[moduleId];
  if (!config) return [];
  
  const allFiles = [...config.cssFiles];
  
  // 添加依赖文件
  if (config.dependencies) {
    allFiles.push(...config.dependencies);
  }
  
  return allFiles;
}
