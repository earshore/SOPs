/**
 * ConfigCenter.test.ts - 配置中心单元测试
 * 测试配置管理、环境适配和热更新功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigCenter } from '@/common/config/ConfigCenter';

describe('ConfigCenter', () => {
  let configCenter: ConfigCenter;

  beforeEach(() => {
    // 每次测试创建新实例
    configCenter = ConfigCenter.getInstance();
  });

  describe('配置获取', () => {
    it('应该获取完整配置', () => {
      const config = configCenter.getConfig();
      
      expect(config).toBeDefined();
      expect(config.environment).toBeDefined();
      expect(config.api).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.features).toBeDefined();
    });

    it('应该获取指定路径的配置', () => {
      const timeout = configCenter.get<number>('api.timeout');
      expect(typeof timeout).toBe('number');
      expect(timeout).toBeGreaterThan(0);
    });

    it('应该获取嵌套配置', () => {
      const logLevel = configCenter.get<string>('performance.logLevel');
      expect(logLevel).toBeDefined();
      expect(['debug', 'info', 'warn', 'error']).toContain(logLevel);
    });

    it('应该返回undefined当路径不存在', () => {
      const value = configCenter.get('nonexistent.path');
      expect(value).toBeUndefined();
    });
  });

  describe('配置设置', () => {
    it('应该设置配置值', () => {
      configCenter.set('api.timeout', 60000);
      const timeout = configCenter.get<number>('api.timeout');
      expect(timeout).toBe(60000);
    });

    it('应该设置嵌套配置', () => {
      configCenter.set('performance.logLevel', 'debug');
      const logLevel = configCenter.get<string>('performance.logLevel');
      expect(logLevel).toBe('debug');
    });

    it('应该创建不存在的路径', () => {
      configCenter.set('new.nested.path', 'value');
      const value = configCenter.get<string>('new.nested.path');
      expect(value).toBe('value');
    });
  });

  describe('配置监听', () => {
    it('应该监听配置变更', () => {
      const listener = vi.fn();
      configCenter.watch('api.timeout', listener);
      
      configCenter.set('api.timeout', 45000);
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('api.timeout', 45000, expect.any(Number));
    });

    it('应该支持多个监听器', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      configCenter.watch('api.timeout', listener1);
      configCenter.watch('api.timeout', listener2);
      
      configCenter.set('api.timeout', 50000);
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('应该返回取消监听函数', () => {
      const listener = vi.fn();
      const unwatch = configCenter.watch('api.timeout', listener);
      
      unwatch();
      configCenter.set('api.timeout', 55000);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('应该处理监听器中的错误', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const listener = vi.fn(() => {
        throw new Error('Listener error');
      });
      
      configCenter.watch('api.timeout', listener);
      
      expect(() => {
        configCenter.set('api.timeout', 60000);
      }).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('环境判断', () => {
    it('应该判断开发环境', () => {
      const isDev = configCenter.isDevelopment();
      expect(typeof isDev).toBe('boolean');
    });

    it('应该判断生产环境', () => {
      const isProd = configCenter.isProduction();
      expect(typeof isProd).toBe('boolean');
    });

    it('应该判断测试环境', () => {
      const isTest = configCenter.isTest();
      expect(typeof isTest).toBe('boolean');
    });

    it('环境判断应该互斥', () => {
      const isDev = configCenter.isDevelopment();
      const isProd = configCenter.isProduction();
      const isTest = configCenter.isTest();
      
      // 只有一个应该为true
      const trueCount = [isDev, isProd, isTest].filter(Boolean).length;
      expect(trueCount).toBe(1);
    });
  });

  describe('配置验证', () => {
    it('应该验证配置', () => {
      const isValid = configCenter.validate();
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('配置导出', () => {
    it('应该导出配置为JSON', () => {
      const exported = configCenter.export();
      expect(typeof exported).toBe('string');
      
      const parsed = JSON.parse(exported);
      expect(parsed).toBeDefined();
      expect(parsed.environment).toBeDefined();
    });
  });

  describe('配置重载', () => {
    it('应该重新加载配置', () => {
      const oldEnv = configCenter.get('environment');
      configCenter.reload();
      const newEnv = configCenter.get('environment');
      
      expect(newEnv).toBeDefined();
      // 环境应该保持一致
      expect(newEnv).toBe(oldEnv);
    });
  });

  describe('边界条件', () => {
    it('应该处理空路径', () => {
      const config = configCenter.get('');
      expect(config).toBeUndefined();
    });

    it('应该处理无效路径', () => {
      const value = configCenter.get('invalid..path');
      expect(value).toBeUndefined();
    });

    it('应该处理设置undefined值', () => {
      configCenter.set('test.value', undefined);
      const value = configCenter.get('test.value');
      expect(value).toBeUndefined();
    });

    it('应该处理设置null值', () => {
      configCenter.set('test.value', null);
      const value = configCenter.get('test.value');
      expect(value).toBeNull();
    });

    it('应该处理重复取消监听', () => {
      const listener = vi.fn();
      const unwatch = configCenter.watch('api.timeout', listener);
      
      unwatch();
      unwatch(); // 第二次调用
      
      expect(() => unwatch()).not.toThrow();
    });
  });
});
