console.log("📋 SOPs Core Module Loading...");
import './sops_style.css';
import { createModuleLoader, ModuleLoader } from '../../common/utils/ModuleLoader';
import { buildModuleMap } from '@/common/config/moduleManifest';
import type { ModuleMap, ModuleLoaderFn } from '@/types/modules-business';
import { sopsManifest } from './module.manifest';

// ================= 路由配置表 =================
const MODULE_MAP: ModuleMap = buildModuleMap(sopsManifest);

// ================= 使用通用ModuleLoader =================
const moduleLoader: ModuleLoader = createModuleLoader({
    containerId: 'sops_content_area',
    shellId: 'panel-sops',
    moduleMap: MODULE_MAP,
    loaderColor: 'blue',
    moduleName: 'SOPs'
});

/**
 * 注册子模块 (Plugin API)
 * @param routeId - 路由 ID
 * @param loader - 动态导入函数
 */
export function registerSubModule(routeId: string, loader: ModuleLoaderFn): void {
    moduleLoader.registerSubModule(routeId, loader);
}
