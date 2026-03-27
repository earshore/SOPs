import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/common/config/ConfigCenter', () => ({
  configCenter: {
    get: vi.fn((key: string) => {
      const config: Record<string, unknown> = {
        'environment': 'production',
        'api.baseUrl': '/v1',
        'api.timeout': 30000,
        'api.retryAttempts': 3
      };
      return config[key];
    }),
    isProduction: vi.fn(() => true),
    isDevelopment: vi.fn(() => false),
    isTest: vi.fn(() => false)
  }
}));

describe('EnvConfig.api.normalizeEndpoint', () => {
  it('应保留显式配置端点中的 /v1 路径', async () => {
    const { EnvConfig } = await import('../../src/common/config/envConfig');

    expect(EnvConfig.api.normalizeEndpoint('https://ai.ijunze.cn/v1')).toBe('https://ai.ijunze.cn/v1');
  });

  it('应移除端点末尾多余斜杠', async () => {
    const { EnvConfig } = await import('../../src/common/config/envConfig');

    expect(EnvConfig.api.normalizeEndpoint('https://ai.ijunze.cn/v1/')).toBe('https://ai.ijunze.cn/v1');
  });

  it('应在未传完整 URL 时回退到基础路径', async () => {
    const { EnvConfig } = await import('../../src/common/config/envConfig');

    expect(EnvConfig.api.normalizeEndpoint('')).toBe('/v1');
  });
});
