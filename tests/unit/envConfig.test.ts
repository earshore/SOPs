/**
 * envConfig 单元测试
 * 覆盖环境/API/性能/功能开关/日志等向后兼容接口
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/common/config/ConfigCenter', () => ({
  configCenter: {
    get: vi.fn((key: string) => {
      const values: Record<string, unknown> = {
        environment: 'test',
        'api.baseUrl': '/v1',
        'api.timeout': 30000,
        'api.retryAttempts': 2,
        'performance.enableMonitoring': true,
        'performance.enableDevTools': false,
        'performance.logLevel': 'debug',
        'features.enableExperimentalFeatures': false,
        'features.enableBetaFeatures': true,
        'features.enableDebugMode': false,
      };
      return values[key];
    }),
    isDevelopment: vi.fn(() => false),
    isProduction: vi.fn(() => false),
    isTest: vi.fn(() => true),
  },
}));

import { EnvConfig } from '@/common/config/envConfig';

describe('EnvConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('透出环境与运行模式判断', () => {
    expect(EnvConfig.environment).toBe('test');
    expect(EnvConfig.isDevelopment).toBe(false);
    expect(EnvConfig.isProduction).toBe(false);
    expect(EnvConfig.isTest).toBe(true);
  });

  it('API 配置与 endpoint 标准化', () => {
    expect(EnvConfig.api.baseUrl).toBe('/v1');
    expect(EnvConfig.api.timeout).toBe(30000);
    expect(EnvConfig.api.retryAttempts).toBe(2);
    expect(EnvConfig.api.normalizeEndpoint('https://example.com///')).toBe('https://example.com');
    expect(EnvConfig.api.normalizeEndpoint('/')).toBe('/');
  });

  it('性能/功能开关/日志配置透出', () => {
    expect(EnvConfig.performance.enableMonitoring).toBe(true);
    expect(EnvConfig.performance.enableDevTools).toBe(false);
    expect(EnvConfig.performance.logLevel).toBe('debug');
    expect(EnvConfig.features.enableExperimentalFeatures).toBe(false);
    expect(EnvConfig.features.enableBetaFeatures).toBe(true);
    expect(EnvConfig.features.enableDebugMode).toBe(false);
    expect(EnvConfig.logging.level).toBe('debug');
    expect(EnvConfig.logging.verbose).toBe(true);
  });

  it('getAll 汇总全部环境变量', () => {
    const all = EnvConfig.getAll();
    expect(all.environment).toBe('test');
    expect(all.api.baseUrl).toBe('/v1');
    expect(all.features.enableBetaFeatures).toBe(true);
    expect(all.performance.logLevel).toBe('debug');
  });
});
