// src/common/config/defaults/routes.config.ts
// ================================================================
// 🎯 路由默认配置
// 从 menuConfig.ts 迁移而来，作为配置中心的一部分
// ================================================================

import type { MenuConfig } from '@/types/config';

/**
 * 默认路由配置
 * 用于路由预加载和导航管理
 */
export const defaultRoutesConfig: Partial<MenuConfig> = {
  contexts: {
    home: { id: 'home', label: '首页' },
    sops: { id: 'sops', label: 'SOPs 流程中心' },
    app_center: { id: 'app_center', label: '工作台' },
    hub: { id: 'hub', label: 'Amazon 智库' },
    more: { id: 'more', label: '更多' },
  },
  modules: {
    home: {
      id: 'home',
      contextId: 'home',
      title: '首页',
      version: '1.0',
      icon: 'fa-home',
      description: '系统首页',
    },
    sops: {
      id: 'sops',
      contextId: 'sops',
      title: 'SOPs 流程中心',
      version: '1.0',
      icon: 'fa-project-diagram',
      description: '标准操作流程管理',
    },
    app_center: {
      id: 'app_center',
      contextId: 'app_center',
      title: '工作台',
      version: '1.0',
      icon: 'fa-th-large',
      description: '工具工作台',
    },
  },
  routes: {
    home: {
      moduleId: 'home',
      label: '首页',
      icon: 'fa-home',
      panelId: 'home',
      viewPath: '/modules/home/homeDisplay.html',
    },
    sops: {
      moduleId: 'sops',
      label: 'SOPs',
      icon: 'fa-project-diagram',
      panelId: 'sops',
      viewPath: '/modules/sops/sops.html',
    },
    app_center: {
      moduleId: 'app_center',
      label: '工作台',
      icon: 'fa-th-large',
      panelId: 'app_center',
      viewPath: '/modules/app_center/app_center.html',
    },
  },
};

export default defaultRoutesConfig;
