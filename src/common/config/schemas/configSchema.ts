// src/common/config/schemas/configSchema.ts
// ================================================================
// 🎯 配置Schema验证
// 使用Zod进行运行时配置验证
// ================================================================

import { z } from 'zod';

/**
 * 环境类型Schema
 */
export const EnvironmentSchema = z.enum(['development', 'production', 'test']);

/**
 * API配置Schema
 */
export const ApiConfigSchema = z.object({
  baseUrl: z.string().min(1, 'API基础URL不能为空'),
  timeout: z.number().min(0, '超时时间不能为负数'),
  retryAttempts: z.number().min(0, '重试次数不能为负数'),
  retryDelay: z.number().min(0, '重试延迟不能为负数')
});

/**
 * 性能配置Schema
 */
export const PerformanceConfigSchema = z.object({
  enableMonitoring: z.boolean(),
  enableDevTools: z.boolean(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
  maxCacheSize: z.number().min(0, '缓存大小不能为负数')
});

/**
 * 功能开关Schema
 */
export const FeatureFlagsSchema = z.object({
  enableExperimentalFeatures: z.boolean(),
  enableBetaFeatures: z.boolean(),
  enableDebugMode: z.boolean()
});

/**
 * 应用配置Schema
 */
export const AppConfigSchema = z.object({
  environment: EnvironmentSchema,
  api: ApiConfigSchema,
  performance: PerformanceConfigSchema,
  features: FeatureFlagsSchema,
  routes: z.any() // MenuConfig类型已在config.d.ts中定义
});

/**
 * 验证配置
 */
export function validateConfig(config: unknown): boolean {
  try {
    AppConfigSchema.parse(config);
    return true;
  } catch (error) {
    console.error('配置验证失败:', error);
    return false;
  }
}

export default AppConfigSchema;
