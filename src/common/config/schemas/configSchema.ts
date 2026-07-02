// src/common/config/schemas/configSchema.ts
// ================================================================
// 配置Schema验证
// 使用Zod进行运行时类型验证
// ================================================================

import { z } from 'zod';
/**
 * 环境类型Schema
 */
const EnvironmentSchema = z.enum(['development', 'production', 'test']);

/**
 * API配置Schema
 */
const ApiConfigSchema = z.object({
  baseUrl: z.string().min(1, 'API baseUrl不能为空'),
  timeout: z.number().positive('timeout必须为正数'),
  retryAttempts: z.number().min(0, 'retryAttempts不能为负数'),
  retryDelay: z.number().positive('retryDelay必须为正数'),
});

/**
 * 性能配置Schema
 */
const PerformanceConfigSchema = z.object({
  enableMonitoring: z.boolean(),
  enableDevTools: z.boolean(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
  maxCacheSize: z.number().positive('maxCacheSize必须为正数'),
});

/**
 * 功能开关Schema
 */
const FeatureFlagsSchema = z.object({
  enableExperimentalFeatures: z.boolean(),
  enableBetaFeatures: z.boolean(),
  enableDebugMode: z.boolean(),
});

/**
 * 应用配置Schema
 */
export const AppConfigSchema = z.object({
  environment: EnvironmentSchema,
  api: ApiConfigSchema,
  performance: PerformanceConfigSchema,
  features: FeatureFlagsSchema,
  routes: z.any(), // MenuConfig类型复杂,暂时使用any
});

/**
 * 验证配置
 * @param config - 待验证的配置对象
 * @returns 是否验证通过
 */
export function validateConfig(config: unknown): boolean {
  try {
    AppConfigSchema.parse(config);
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[ConfigSchema] 配置验证失败:', error.issues);
      error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
    }
    return false;
  }
}

/**
 * 验证配置并返回详细错误
 * @param config - 待验证的配置对象
 * @returns 验证结果
 */
export function validateConfigWithErrors(config: unknown): {
  success: boolean;
  errors?: z.ZodError;
} {
  const result = AppConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * 导出Schema类型
 */
export type AppConfigType = z.infer<typeof AppConfigSchema>;
