// src/common/config/env/development.ts
// ================================================================
// 🎯 开发环境配置
// ================================================================

import type { AppConfig } from '../ConfigCenter';

/**
 * 开发环境特定配置
 */
export const developmentConfig: Partial<AppConfig> = {
  environment: 'development',
  api: {
    baseUrl: '/v1',
    timeout: 60000, // 开发环境超时时间更长
    retryAttempts: 1, // 开发环境减少重试
    retryDelay: 1000,
  },
  performance: {
    enableMonitoring: true,
    enableDevTools: true, // 开发环境启用DevTools
    logLevel: 'debug', // 开发环境详细日志
    maxCacheSize: 50, // 开发环境减少缓存
  },
  features: {
    enableExperimentalFeatures: true, // 开发环境启用实验性功能
    enableBetaFeatures: true,
    enableDebugMode: true,
  },
};

export default developmentConfig;
