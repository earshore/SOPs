// src/common/config/loaders/routeConfigLoader.ts
// ================================================================
// 🎯 路由配置加载器
// 负责加载和整合路由配置到配置中心
// ================================================================

import { MENU_CONFIG } from '../menuConfig';
import type { MenuConfig } from '../../../types/config';

/**
 * 加载路由配置
 */
export function loadRouteConfig(): MenuConfig {
  return MENU_CONFIG;
}

/**
 * 获取指定上下文的路由
 */
export function getContextRoutes(contextId: string): string[] {
  const routes: string[] = [];
  
  Object.entries(MENU_CONFIG.routes).forEach(([routeId, route]) => {
    const module = MENU_CONFIG.modules[route.moduleId];
    if (module && module.contextId === contextId) {
      routes.push(routeId);
    }
  });
  
  return routes;
}

/**
 * 获取指定模块的路由
 */
export function getModuleRoutes(moduleId: string): string[] {
  const routes: string[] = [];
  
  Object.entries(MENU_CONFIG.routes).forEach(([routeId, route]) => {
    if (route.moduleId === moduleId) {
      routes.push(routeId);
    }
  });
  
  return routes;
}

export default loadRouteConfig;
