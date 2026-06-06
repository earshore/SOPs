console.log('📋 More Core Module Loading...');
import './more_style.css';
import { createModuleLoader, ModuleLoader } from '../../common/utils/ModuleLoader';
import type { ModuleMap, ModuleLoaderFn } from '@/types/modules-business';

// ================= 路由配置表 =================
const MODULE_MAP: ModuleMap = {
    // 总览
    more_overview: () => import('./views/overview/index'),

    // 探索体系
    more_agents: () => import('./views/explore/agents/index'),
    more_prompts: () => import('./views/explore/prompts/index'),
    more_workflows: () => import('./views/explore/workflows/index'),
};

// ================= 使用通用ModuleLoader =================
const moduleLoader: ModuleLoader = createModuleLoader({
    containerId: 'more_content_area',
    shellId: 'panel-more',
    moduleMap: MODULE_MAP,
    loaderColor: 'green',
    moduleName: 'More',
});

/**
 * 注册子模块 (Plugin API)
 * @param routeId - 路由 ID
 * @param loader - 动态导入函数
 */
export function registerSubModule(routeId: string, loader: ModuleLoaderFn): void {
    moduleLoader.registerSubModule(routeId, loader);
}

console.log('✅ More Module 加载完成');
