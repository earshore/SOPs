// src/modules/app_center/app_center.ts
// ================================================================
// 🎯 App Center 核心模块 (TypeScript版本)
// ================================================================

import './app_center_style.css';
import { createModuleLoader, ModuleLoader } from '@/common/utils/ModuleLoader';
import type { ModuleLoaderFn } from '@/types/modules-business';
import { MODULE_MAP } from './module.loaders';

// ================= 使用通用ModuleLoader =================
const moduleLoader: ModuleLoader = createModuleLoader({
  containerId: 'app_center_content_area',
  shellId: 'panel-app_center',
  moduleMap: MODULE_MAP,
  loaderColor: 'rose',
  moduleName: 'AppCenter',
  contentEnterAnimation: true,
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
    return false;
  }

  // 验证loader参数是否为函数类型
  if (typeof loader !== 'function') {
    console.error(`❌ 无效的loader函数:`, loader);
    return false;
  }

  // 注册到MODULE_MAP
  MODULE_MAP[routeId] = loader;

  // 同时注册到moduleLoader
  moduleLoader.registerSubModule(routeId, loader);

  return true;
}
