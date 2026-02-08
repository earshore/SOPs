console.log('📋 More Core Module Loading...');
import './more_style.css';
import { createModuleLoader } from '../../common/utils/ModuleLoader';

// ================= 路由配置表 =================
const MODULE_MAP = {
    // 总览
    more_overview: () => import('./views/overview/index'),

    // 探索体系
    more_agents: () => import('./views/explore/agents/index'),
    more_prompts: () => import('./views/explore/prompts/index'),
    more_workflows: () => import('./views/explore/workflows/index'),
};

// ================= 使用通用ModuleLoader =================
const moduleLoader = createModuleLoader({
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
export function registerSubModule(routeId: string, loader: () => Promise<any>): void {
    moduleLoader.registerSubModule(routeId, loader);
}

console.log('✅ More Module 加载完成');
