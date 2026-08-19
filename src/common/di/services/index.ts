// src/common/di/services/index.ts
// ================================================================
// 服务注册配置统一导出
// ================================================================

export { registerCoreServices } from './coreServices';
export { registerBusinessServices } from './businessServices';

import { registerBusinessServices } from './businessServices';
import { registerCoreServices } from './coreServices';

import type { ServiceRegistry } from '../ServiceRegistry';

/**
 * 注册所有服务到注册表
 * 统一入口函数
 */
export function registerAllServices(registry: ServiceRegistry): void {
  // 注册核心服务
  registerCoreServices(registry);

  // 注册业务服务
  registerBusinessServices(registry);
}
