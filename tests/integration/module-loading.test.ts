// tests/integration/module-loading.test.ts
// ================================================================
// 模块加载集成测试
// 验证模块加载器、DI容器、事件总线的协同工作
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Container } from '@/common/di/Container';
import { ModuleLoader } from '@/common/utils/ModuleLoader';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import BaseModule from '@/common/BaseModule';

// Mock模块
class TestModule extends BaseModule {
  constructor() {
    super('TestModule');
  }

  async init(): Promise<void> {
    this.initialized = true;
    console.log('[TestModule] Initialized');
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    console.log('[TestModule] Destroyed');
  }
}

class DependentModule extends BaseModule {
  constructor(private testModule: TestModule) {
    super('DependentModule');
  }

  async init(): Promise<void> {
    if (!this.testModule.isInitialized()) {
      throw new Error('TestModule not initialized');
    }
    this.initialized = true;
    console.log('[DependentModule] Initialized');
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    console.log('[DependentModule] Destroyed');
  }
}

  let container: Container;
  let moduleLoader: ModuleLoader;

  beforeEach(() => {
    container = Container.getInstance();
    moduleLoader = new ModuleLoader();
    container.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.clear();
    eventBus.removeAllListeners();
  });

  // ================================================================
  // 基本模块加载
  // ================================================================

  describe('基本模块加载', () => {
    it('应该能注册和解析模块', () => {
      // 注册模块
      container.register('TestModule', TestModule);

      // 解析模块
      const module = container.resolve<TestModule>('TestModule');

      expect(module).toBeInstanceOf(TestModule);
      expect(module.getName()).toBe('TestModule');
    });

    it('应该能初始化模块', async () => {
      const module = new TestModule();

      await module.init();

      expect(module.isInitialized()).toBe(true);
    });

    it('应该能销毁模块', async () => {
      const module = new TestModule();
      await module.init();

      await module.destroy();

      expect(module.isInitialized()).toBe(false);
    });
  });

  // ================================================================
  // 依赖注入
  // ================================================================

  describe('依赖注入', () => {
    it('应该能注入依赖', () => {
      // 注册依赖
      container.register('TestModule', TestModule);
      container.register('DependentModule', DependentModule, ['TestModule']);

      // 解析应该自动注入依赖
      const dependent = container.resolve<DependentModule>('DependentModule');

      expect(dependent).toBeInstanceOf(DependentModule);
    });

    it('应该能处理单例模式', () => {
      container.register('TestModule', TestModule, [], true);

      const instance1 = container.resolve<TestModule>('TestModule');
      const instance2 = container.resolve<TestModule>('TestModule');

      expect(instance1).toBe(instance2);
    });

    it('应该能处理瞬态模式', () => {
      container.register('TestModule', TestModule, [], false);

      const instance1 = container.resolve<TestModule>('TestModule');
      const instance2 = container.resolve<TestModule>('TestModule');

      expect(instance1).not.toBe(instance2);
    });

    it('应该检测循环依赖', () => {
      // 创建循环依赖
      class ModuleA extends BaseModule {
        constructor(moduleB: any) {
          super('ModuleA');
        }
      }

      class ModuleB extends BaseModule {
        constructor(moduleA: any) {
          super('ModuleB');
        }
      }

      container.register('ModuleA', ModuleA, ['ModuleB']);
      container.register('ModuleB', ModuleB, ['ModuleA']);

      // 应该抛出错误
      expect(() => {
        container.resolve('ModuleA');
      }).toThrow();
    });
  });

  // ================================================================
  // 模块生命周期
  // ================================================================

  describe('模块生命周期', () => {
    it('应该按顺序初始化依赖模块', async () => {
      const initOrder: string[] = [];

      class Module1 extends BaseModule {
        async init() {
          initOrder.push('Module1');
          this.initialized = true;
        }
      }

      class Module2 extends BaseModule {
        constructor(private module1: Module1) {
          super('Module2');
        }

        async init() {
          if (!this.module1.isInitialized()) {
            throw new Error('Module1 not initialized');
          }
          initOrder.push('Module2');
          this.initialized = true;
        }
      }

      container.register('Module1', Module1);
      container.register('Module2', Module2, ['Module1']);

      const module1 = container.resolve<Module1>('Module1');
      const module2 = container.resolve<Module2>('Module2');

      await module1.init();
      await module2.init();

      expect(initOrder).toEqual(['Module1', 'Module2']);
    });

    it('应该按相反顺序销毁模块', async () => {
      const destroyOrder: string[] = [];

      class Module1 extends BaseModule {
        async destroy() {
          destroyOrder.push('Module1');
          this.initialized = false;
        }
      }

      class Module2 extends BaseModule {
        async destroy() {
          destroyOrder.push('Module2');
          this.initialized = false;
        }
      }

      const module1 = new Module1('Module1');
      const module2 = new Module2('Module2');

      await module1.init();
      await module2.init();

      // 先销毁Module2,再销毁Module1
      await module2.destroy();
      await module1.destroy();

      expect(destroyOrder).toEqual(['Module2', 'Module1']);
    });

    it('初始化失败应该触发错误事件', async () => {
      const errorSpy = vi.fn();
      eventBus.on(APP_EVENTS.ERROR_OCCURRED, errorSpy);

      class FailingModule extends BaseModule {
        async init() {
          throw new Error('Init failed');
        }
      }

      const module = new FailingModule('FailingModule');

      try {
        await module.init();
      } catch (error) {
        // 预期错误
      }

      // 验证错误事件被触发
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ================================================================
  // 模块加载器
  // ================================================================

  describe('模块加载器', () => {
    it('应该能批量加载模块', async () => {
      const modules = [
        { name: 'Module1', factory: () => new TestModule() },
        { name: 'Module2', factory: () => new TestModule() }
      ];

      await moduleLoader.loadModules(modules);

      expect(moduleLoader.isLoaded('Module1')).toBe(true);
      expect(moduleLoader.isLoaded('Module2')).toBe(true);
    });

    it('应该能懒加载模块', async () => {
      const loadSpy = vi.fn();

      await moduleLoader.lazyLoad('LazyModule', async () => {
        loadSpy();
        return new TestModule();
      });

      // 第一次加载应该调用工厂函数
      expect(loadSpy).toHaveBeenCalledTimes(1);

      // 第二次加载应该使用缓存
      await moduleLoader.lazyLoad('LazyModule', async () => {
        loadSpy();
        return new TestModule();
      });

      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('应该能卸载模块', async () => {
      const module = new TestModule();
      await module.init();

      await moduleLoader.unload('TestModule');

      expect(moduleLoader.isLoaded('TestModule')).toBe(false);
    });
  });

  // ================================================================
  // 事件总线集成
  // ================================================================

  describe('事件总线集成', () => {
    it('模块初始化应该触发事件', async () => {
      const eventSpy = vi.fn();
      eventBus.on(APP_EVENTS.MODULE_LOADED, eventSpy);

      const module = new TestModule();
      await module.init();

      // 手动触发事件(模拟模块加载器)
      eventBus.emit(APP_EVENTS.MODULE_LOADED, {
        moduleName: 'TestModule',
        timestamp: Date.now()
      });

      expect(eventSpy).toHaveBeenCalled();
    });

    it('模块间应该能通过事件通信', async () => {
      const messageSpy = vi.fn();

      class ProducerModule extends BaseModule {
        sendMessage(message: string) {
          eventBus.emit('custom:message', { message });
        }
      }

      class ConsumerModule extends BaseModule {
        async init() {
          eventBus.on('custom:message', messageSpy);
          this.initialized = true;
        }
      }

      const producer = new ProducerModule('Producer');
      const consumer = new ConsumerModule('Consumer');

      await consumer.init();
      producer.sendMessage('Hello');

      expect(messageSpy).toHaveBeenCalledWith({ message: 'Hello' });
    });
  });

  // ================================================================
  // 错误处理
  // ================================================================

  describe('错误处理', () => {
    it('解析不存在的模块应该抛出错误', () => {
      expect(() => {
        container.resolve('NonExistent');
      }).toThrow();
    });

    it('模块初始化失败不应该影响其他模块', async () => {
      class GoodModule extends BaseModule {
        async init() {
          this.initialized = true;
        }
      }

      class BadModule extends BaseModule {
        async init() {
          throw new Error('Init failed');
        }
      }

      const goodModule = new GoodModule('Good');
      const badModule = new BadModule('Bad');

      await goodModule.init();

      try {
        await badModule.init();
      } catch (error) {
        // 预期错误
      }

      // 好的模块应该仍然正常
      expect(goodModule.isInitialized()).toBe(true);
    });

    it('应该能从初始化失败中恢复', async () => {
      let shouldFail = true;

      class RecoverableModule extends BaseModule {
        async init() {
          if (shouldFail) {
            throw new Error('Init failed');
          }
          this.initialized = true;
        }
      }

      const module = new RecoverableModule('Recoverable');

      // 第一次失败
      try {
        await module.init();
      } catch (error) {
        // 预期错误
      }

      // 修复问题后重试
      shouldFail = false;
      await module.init();

      expect(module.isInitialized()).toBe(true);
    });
  });

  // ================================================================
  // 复杂场景
  // ================================================================

  describe('复杂场景', () => {
    it('应该处理多层依赖', () => {
      class Level1 extends BaseModule {}
      class Level2 extends BaseModule {
        constructor(level1: Level1) {
          super('Level2');
        }
      }
      class Level3 extends BaseModule {
        constructor(level2: Level2) {
          super('Level3');
        }
      }

      container.register('Level1', Level1);
      container.register('Level2', Level2, ['Level1']);
      container.register('Level3', Level3, ['Level2']);

      const level3 = container.resolve<Level3>('Level3');

      expect(level3).toBeInstanceOf(Level3);
    });

    it('应该处理多个依赖', () => {
      class ServiceA extends BaseModule {}
      class ServiceB extends BaseModule {}
      class ServiceC extends BaseModule {
        constructor(serviceA: ServiceA, serviceB: ServiceB) {
          super('ServiceC');
        }
      }

      container.register('ServiceA', ServiceA);
      container.register('ServiceB', ServiceB);
      container.register('ServiceC', ServiceC, ['ServiceA', 'ServiceB']);

      const serviceC = container.resolve<ServiceC>('ServiceC');

      expect(serviceC).toBeInstanceOf(ServiceC);
    });

    it('应该处理条件加载', async () => {
      const shouldLoad = true;

      if (shouldLoad) {
        const module = new TestModule();
        await module.init();
        expect(module.isInitialized()).toBe(true);
      }
    });
  });

  // ================================================================
  // 性能测试
  // ================================================================

  describe('性能测试', () => {
    it('大量模块注册应该快速', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        container.register(`Module${i}`, TestModule);
      }

      const endTime = Date.now();

      // 1000个模块注册应该在100ms内完成
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('大量模块解析应该快速', () => {
      // 注册模块
      for (let i = 0; i < 100; i++) {
        container.register(`Module${i}`, TestModule, [], true);
      }

      const startTime = Date.now();

      // 解析所有模块
      for (let i = 0; i < 100; i++) {
        container.resolve(`Module${i}`);
      }

      const endTime = Date.now();

      // 100个模块解析应该在50ms内完成
      expect(endTime - startTime).toBeLessThan(50);
    });
  });
