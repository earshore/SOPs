// src/modules/app_center/app_center.ts
// ================================================================
// 🎯 App Center 核心模块 (TypeScript版本)
// ================================================================

Logger.debug('🎯 App Center Core Module Loading...');
import './app_center_style.css';
import { createModuleLoader, ModuleLoader } from '@/common/utils/ModuleLoader';
import { APP_CENTER_ROUTES } from '@/common/constants/routes';

import { Logger } from '../../services/loggerService';
/**
 * 模块加载器函数类型
 */
type ModuleLoaderFn = () => Promise<any>;

/**
 * 模块映射类型
 */
type ModuleMap = Record<string, ModuleLoaderFn>;

// ================= 路由配置表 =================
// 使用路由常量，避免硬编码
const MODULE_MAP: ModuleMap = {
  // App Center Overview
  [APP_CENTER_ROUTES.OVERVIEW]: () => import('./views/overview/index'),

  // Master Analysis 子模块
  [APP_CENTER_ROUTES.SCRAPER]: () => import('./views/master_analysis/scraper/index'),
  [APP_CENTER_ROUTES.AI_ANALYSIS]: () => import('./views/master_analysis/ai_analysis/index'),
  [APP_CENTER_ROUTES.PROMPTLAB]: () => import('./views/master_analysis/promptlab/index'),

  // Keyword Hunter 子模块
  [APP_CENTER_ROUTES.KW_INPUT]: () => import('./views/keyword_hunter/input/index'),
  [APP_CENTER_ROUTES.KW_PROCESS]: () => import('./views/keyword_hunter/process/index'),
  [APP_CENTER_ROUTES.KW_ANALYSIS]: () => import('./views/keyword_hunter/analysis/index'),
};

// ================= 使用通用ModuleLoader =================
const moduleLoader: ModuleLoader = createModuleLoader({
  containerId: 'app_center_content_area',
  shellId: 'panel-app_center',
  moduleMap: MODULE_MAP,
  loaderColor: 'blue',
  moduleName: 'AppCenter',
});

/**
 * 注册子模块 (Plugin API)
 * @param routeId - 路由 ID
 * @param loader - 动态导入函数
 * @returns 是否注册成功
 */
export function registerSubModule(routeId: string, loader: ModuleLoaderFn): boolean {
  // 检查路由ID是否已存在
  if (MODULE_MAP[routeId]) {
    Logger.warn(`⚠️ 路由 "${routeId}" 已存在，跳过注册`);
    return false;
  }

  // 验证loader参数是否为函数类型
  if (typeof loader !== 'function') {
    Logger.error(`❌ 无效的loader函数:`, loader);
    return false;
  }

  // 注册到MODULE_MAP
  MODULE_MAP[routeId] = loader;

  // 同时注册到moduleLoader
  moduleLoader.registerSubModule(routeId, loader);

  Logger.debug(`✅ 动态注册子模块: ${routeId}`);
  return true;
}

Logger.debug('✅ App Center Module 加载完成');
