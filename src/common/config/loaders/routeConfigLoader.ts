// src/common/config/loaders/routeConfigLoader.ts
// ================================================================
// 路由配置加载器
// 从menuConfig加载路由配置
// ================================================================

import { MENU_CONFIG } from '../menuConfig';

import type { MenuConfig } from '@/types/config';

/**
 * 加载路由配置
 * @returns 菜单配置对象
 */
export function loadRouteConfig(): MenuConfig {
  return MENU_CONFIG;
}

/**
 * 验证路由配置完整性
 * @returns 验证结果
 */
export function validateRouteConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证contexts
  if (!MENU_CONFIG.contexts || Object.keys(MENU_CONFIG.contexts).length === 0) {
    errors.push('contexts配置为空');
  }

  // 验证modules
  if (!MENU_CONFIG.modules || Object.keys(MENU_CONFIG.modules).length === 0) {
    errors.push('modules配置为空');
  }

  // 验证routes
  if (!MENU_CONFIG.routes || Object.keys(MENU_CONFIG.routes).length === 0) {
    errors.push('routes配置为空');
  }

  // 验证模块引用的context是否存在
  Object.entries(MENU_CONFIG.modules).forEach(([moduleId, module]) => {
    if (!MENU_CONFIG.contexts[module.contextId]) {
      errors.push(`模块 "${moduleId}" 引用的context "${module.contextId}" 不存在`);
    }
  });

  // 验证路由引用的module是否存在
  Object.entries(MENU_CONFIG.routes).forEach(([routeId, route]) => {
    if (!MENU_CONFIG.modules[route.moduleId]) {
      errors.push(`路由 "${routeId}" 引用的module "${route.moduleId}" 不存在`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取配置统计信息
 * @returns 统计信息
 */
export function getConfigStats() {
  return {
    contexts: Object.keys(MENU_CONFIG.contexts).length,
    modules: Object.keys(MENU_CONFIG.modules).length,
    routes: Object.keys(MENU_CONFIG.routes).length,
    sopCategories: Object.keys(MENU_CONFIG.sopCategories || {}).length,
    hubCategories: Object.keys(MENU_CONFIG.hubCategories || {}).length,
    moreCategories: Object.keys(MENU_CONFIG.moreCategories || {}).length,
    appCategories: Object.keys(MENU_CONFIG.appCategories || {}).length,
  };
}
