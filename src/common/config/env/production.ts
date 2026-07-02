// src/common/config/env/production.ts
// ================================================================
// 🎯 生产环境配置
// ================================================================

import type { AppConfig } from '../ConfigCenter';

/**
 * 生产环境特定配置
 */
export const productionConfig: Partial<AppConfig> = {
  environment: 'production',
  api: {
    baseUrl: '/v1',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  performance: {
    enableMonitoring: true,
    enableDevTools: false, // 生产环境禁用DevTools
    logLevel: 'error', // 生产环境只记录错误
    maxCacheSize: 100,
  },
  features: {
    enableExperimentalFeatures: false, // 生产环境禁用实验性功能
    enableBetaFeatures: false,
    enableDebugMode: false,
  },
};

export default productionConfig;
