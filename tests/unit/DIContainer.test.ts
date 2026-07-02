/**
 * DIContainer 单元测试
 * 测试依赖注入容器的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DIContainer } from '@/common/di/Container';

  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  describe('服务注册', () => {
    it('应该成功注册服务', () => {
      container.register('testService', () => ({ name: 'test' }));
      
      expect(container.has('testService')).toBe(true);
    });

    it('应该抛出错误如果工厂不是函数', () => {
      expect(() => {
        container.register('testService', 'not a function' as any);
      }).toThrow();
    });
  });

  describe('服务解析', () => {
    it('应该成功解析单例服务', () => {
      container.register('testService', () => ({ id: Math.random() }), {
        lifetime: 'singleton'
      });
      
      const instance1 = container.resolve('testService');
      const instance2 = container.resolve('testService');
      
      expect(instance1).toBe(instance2);
    });

    it('应该为瞬态服务创建新实例', () => {
      container.register('testService', () => ({ id: Math.random() }), {
        lifetime: 'transient'
      });
      
      const instance1 = container.resolve('testService');
      const instance2 = container.resolve('testService');
      
      expect(instance1).not.toBe(instance2);
    });

    it('应该抛出错误如果服务未注册', () => {
      expect(() => {
        container.resolve('nonExistentService');
      }).toThrow('服务未注册');
    });
  });

  describe('依赖注入', () => {
    it('应该正确注入依赖', () => {
      container.register('logger', () => ({
        log: vi.fn()
      }));
      
      container.register('userService', (c) => {
        const logger = c.resolve('logger');
        return {
          logger,
          getUser: () => 'user'
        };
      }, {
        dependencies: ['logger']
      });
      
      const userService = container.resolve<any>('userService');
      
      expect(userService.logger).toBeDefined();
      expect(userService.logger.log).toBeDefined();
    });
  });

  describe('循环依赖检测', () => {
    it('应该检测循环依赖', () => {
      container.register('serviceA', () => ({}), {
        dependencies: ['serviceB']
      });
      
      container.register('serviceB', () => ({}), {
        dependencies: ['serviceA']
      });
      
      const validation = container.validateDependencies();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('缓存管理', () => {
    it('应该清除指定服务的缓存', () => {
      container.register('testService', () => ({ id: Math.random() }));
      
      const instance1 = container.resolve('testService');
      container.clearCache('testService');
      const instance2 = container.resolve('testService');
      
      expect(instance1).not.toBe(instance2);
    });

    it('应该清除所有缓存', () => {
      container.register('service1', () => ({ id: 1 }));
      container.register('service2', () => ({ id: 2 }));
      
      container.resolve('service1');
      container.resolve('service2');
      
      container.clearCache();
      
      // 解析后应该创建新实例
      const newInstance1 = container.resolve('service1');
      const newInstance2 = container.resolve('service2');
      
      expect(newInstance1).toBeDefined();
      expect(newInstance2).toBeDefined();
    });
  });

  describe('元数据', () => {
    it('应该记录服务元数据', () => {
      container.register('testService', () => ({}), {
        lifetime: 'singleton',
        dependencies: ['dep1', 'dep2']
      });
      
      const metadata = container.getMetadata('testService');
      
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('testService');
      expect(metadata?.lifetime).toBe('singleton');
      expect(metadata?.dependencies).toEqual(['dep1', 'dep2']);
    });

    it('应该获取所有服务元数据', () => {
      container.register('service1', () => ({}));
      container.register('service2', () => ({}));
      
      const allMetadata = container.getAllMetadata();
      
      expect(allMetadata.length).toBe(2);
    });
  });

  describe('重置容器', () => {
    it('应该清除所有注册和缓存', () => {
      container.register('service1', () => ({}));
      container.register('service2', () => ({}));
      container.resolve('service1');
      
      container.reset();
      
      expect(container.has('service1')).toBe(false);
      expect(container.has('service2')).toBe(false);
      expect(container.getRegisteredServices().length).toBe(0);
    });
  });
