// src/common/di/services/index.ts
// ================================================================
// 服务注册配置统一导出
// ================================================================

export { registerCoreServices } from './coreServices';
export { registerBusinessServices } from './businessServices';

import type { ServiceRegistry } from '../ServiceRegistry';
import { registerCoreServices } from './coreServices';
import { registerBusinessServices } from './businessServices';

/**
 * 注册所有服务到注册表
 * 统一入口函数
 */
export function registerAllServices(registry: ServiceRegistry): void {
  console.log('[Services] 开始注册所有服务配置');
  
  // 注册核心服务
  registerCoreServices(registry);
  
  // 注册业务服务
  registerBusinessServices(registry);
  
  console.log(`[Services] 所有服务配置注册完成，共 ${registry.size} 个服务`);
}
