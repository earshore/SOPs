// src/common/config/defaults/routes.config.ts
// ================================================================
// 🎯 路由默认配置
// 从 menuConfig.ts 迁移而来，作为配置中心的一部分
// ================================================================

import type { MenuConfig } from '../../../types/config';

/**
 * 默认路由配置
 * 注意：实际的路由配置仍在 menuConfig.ts 中维护
 * 这里仅作为配置中心的接口定义
 */
export const defaultRoutesConfig: Partial<MenuConfig> = {
  contexts: {},
  modules: {},
  routes: {}
};

export default defaultRoutesConfig;
