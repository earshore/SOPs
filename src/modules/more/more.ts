console.log('📋 More Core Module Loading...');
import './more_style.css';
import { createModuleLoader, ModuleLoader } from '../../common/utils/ModuleLoader';
import type { ModuleLoaderFn } from '@/types/modules-business';
import { MODULE_MAP } from './module.loaders';

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
