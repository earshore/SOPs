/**
 * routeConfigLoader 单元测试
 * 覆盖路由配置加载、完整性校验与统计
 */

import { describe, expect, it } from 'vitest';
import {
  getConfigStats,
  loadRouteConfig,
  validateRouteConfig,
} from '@/common/config/loaders/routeConfigLoader';

describe('routeConfigLoader', () => {
  it('加载非空路由配置', () => {
    const config = loadRouteConfig();
    expect(config).toBeDefined();
    expect(Object.keys(config.modules).length).toBeGreaterThan(0);
    expect(Object.keys(config.routes).length).toBeGreaterThan(0);
  });

  it('验证路由配置完整性通过', () => {
    const result = validateRouteConfig();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('统计各分类数量非负且 context/module/route 存在', () => {
    const stats = getConfigStats();
    expect(stats.contexts).toBeGreaterThan(0);
    expect(stats.modules).toBeGreaterThan(0);
    expect(stats.routes).toBeGreaterThan(0);
    expect(stats.sopCategories).toBeGreaterThanOrEqual(0);
    expect(stats.hubCategories).toBeGreaterThanOrEqual(0);
    expect(stats.moreCategories).toBeGreaterThanOrEqual(0);
    expect(stats.appCategories).toBeGreaterThanOrEqual(0);
  });
});
