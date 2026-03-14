/**
 * Container.test.ts - DI容器单元测试
 * 测试依赖注入容器的核心功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DIContainer } from '@/common/di/Container';

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  afterEach(() => {
    container.reset();
  });

  describe('服务注册', () => {
    it('应该成功注册单例服务', () => {
      const factory = () => ({ name: 'test' });
      container.register('testService', factory, { lifetime: 'singleton' });
      
      expect(container.has('testService')).toBe(true);
    });

    it('应该成功注册瞬态服务', () => {
      const factory = () => ({ name: 'test' });
      container.register('testService', factory, { lifetime: 'transient' });
      
      expect(container.has('testService')).toBe(true);
    });

    it('应该记录服务依赖关系', () => {
      container.register('serviceA', () => ({}), { dependencies: [] });
      container.register('serviceB', () => ({}), { dependencies: ['serviceA'] });
      
      const metadata = container.getMetadata('serviceB');
      expect(metadata?.dependencies).toEqual(['serviceA']);
    });

    it('应该覆盖已存在的服务', () => {
      container.register('testService', () => ({ version: 1 }));
      container.register('testService', () => ({ version: 2 }));
      
      const service = container.resolve<{ version: number }>('testService');
      expect(service.version).toBe(2);
    });
  });

  describe('服务解析', () => {
    it('应该正确解析单例服务', () => {
      let counter = 0;
      container.register('testService', () => ({ id: ++counter }), { lifetime: 'singleton' });
      
      const service1 = container.resolve<{ id: number }>('testService');
      const service2 = container.resolve<{ id: number }>('testService');
      
      expect(service1.id).toBe(1);
      expect(service2.id).toBe(1); // 同一个实例
      expect(service1).toBe(service2);
    });

    it('应该正确解析瞬态服务', () => {
      let counter = 0;
      container.register('testService', () => ({ id: ++counter }), { lifetime: 'transient' });
      
      const service1 = container.resolve<{ id: number }>('testService');
      const service2 = container.resolve<{ id: number }>('testService');
      
      expect(service1.id).toBe(1);
      expect(service2.id).toBe(2); // 不同实例
      expect(service1).not.toBe(service2);
    });

    it('应该抛出错误当服务未注册', () => {
      expect(() => container.resolve('nonExistent')).toThrow('服务未注册');
    });

    it('应该传递容器实例给工厂函数', () => {
      let receivedContainer: DIContainer | null = null;
      container.register('testService', (c) => {
        receivedContainer = c;
        return {};
      });
      
      container.resolve('testService');
      expect(receivedContainer).toBe(container);
    });
  });

  describe('依赖管理', () => {
    it('应该检测循环依赖', () => {
      container.register('serviceA', () => ({}), { dependencies: ['serviceB'] });
      container.register('serviceB', () => ({}), { dependencies: ['serviceA'] });
      
      const validation = container.validateDependencies();
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('循环依赖');
    });

    it('应该检测缺失的依赖', () => {
      container.register('serviceA', () => ({}), { dependencies: ['nonExistent'] });
      
      const validation = container.validateDependencies();
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('未注册');
    });

    it('应该验证正确的依赖关系', () => {
      container.register('serviceA', () => ({}), { dependencies: [] });
      container.register('serviceB', () => ({}), { dependencies: ['serviceA'] });
      
      const validation = container.validateDependencies();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('缓存管理', () => {
    it('应该清除指定服务的缓存', () => {
      let counter = 0;
      container.register('testService', () => ({ id: ++counter }), { lifetime: 'singleton' });
      
      const service1 = container.resolve<{ id: number }>('testService');
      expect(service1.id).toBe(1);
      
      container.clearCache('testService');
      
      const service2 = container.resolve<{ id: number }>('testService');
      expect(service2.id).toBe(2); // 新实例
    });

    it('应该清除所有缓存', () => {
      let counterA = 0;
      let counterB = 0;
      container.register('serviceA', () => ({ id: ++counterA }), { lifetime: 'singleton' });
      container.register('serviceB', () => ({ id: ++counterB }), { lifetime: 'singleton' });
      
      container.resolve('serviceA');
      container.resolve('serviceB');
      
      container.clearCache();
      
      const serviceA = container.resolve<{ id: number }>('serviceA');
      const serviceB = container.resolve<{ id: number }>('serviceB');
      
      expect(serviceA.id).toBe(2);
      expect(serviceB.id).toBe(2);
    });
  });

  describe('元信息', () => {
    it('应该返回所有已注册的服务名称', () => {
      container.register('serviceA', () => ({}));
      container.register('serviceB', () => ({}));
      
      const services = container.getRegisteredServices();
      expect(services).toContain('serviceA');
      expect(services).toContain('serviceB');
      expect(services).toHaveLength(2);
    });

    it('应该返回服务元信息', () => {
      container.register('testService', () => ({}), {
        lifetime: 'singleton',
        dependencies: ['dep1', 'dep2']
      });
      
      const metadata = container.getMetadata('testService');
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('testService');
      expect(metadata?.lifetime).toBe('singleton');
      expect(metadata?.dependencies).toEqual(['dep1', 'dep2']);
      expect(metadata?.registered).toBeGreaterThan(0);
    });

    it('应该返回所有服务元信息', () => {
      container.register('serviceA', () => ({}));
      container.register('serviceB', () => ({}));
      
      const allMetadata = container.getAllMetadata();
      expect(allMetadata).toHaveLength(2);
      expect(allMetadata.map(m => m.name)).toContain('serviceA');
      expect(allMetadata.map(m => m.name)).toContain('serviceB');
    });
  });

  describe('重置', () => {
    it('应该清除所有注册和缓存', () => {
      container.register('serviceA', () => ({}));
      container.register('serviceB', () => ({}));
      container.resolve('serviceA');
      
      container.reset();
      
      expect(container.getRegisteredServices()).toHaveLength(0);
      expect(() => container.resolve('serviceA')).toThrow();
    });
  });

  describe('边界条件', () => {
    it('应该处理空工厂函数', () => {
      expect(() => {
        container.register('test', null as any);
      }).toThrow('Factory must be a function');
    });

    it('应该处理工厂函数抛出错误', () => {
      container.register('testService', () => {
        throw new Error('Factory error');
      });
      
      expect(() => container.resolve('testService')).toThrow('Factory error');
    });

    it('应该处理复杂的依赖链', () => {
      container.register('serviceA', () => ({ name: 'A' }), { dependencies: [] });
      container.register('serviceB', () => ({ name: 'B' }), { dependencies: ['serviceA'] });
      container.register('serviceC', () => ({ name: 'C' }), { dependencies: ['serviceB'] });
      container.register('serviceD', () => ({ name: 'D' }), { dependencies: ['serviceC'] });
      
      const validation = container.validateDependencies();
      expect(validation.valid).toBe(true);
    });
  });
});
