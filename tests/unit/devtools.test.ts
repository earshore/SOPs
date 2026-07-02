// tests/unit/devtools.test.ts
// ================================================================
// DevTools中间件单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { devtools, devtoolsHelper } from '@/stores/middleware/devtools';

  let mockDevtools: any;

  beforeEach(() => {
    // Mock Redux DevTools Extension
    mockDevtools = {
      init: vi.fn(),
      send: vi.fn(),
      subscribe: vi.fn(() => vi.fn())
    };

    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
      connect: vi.fn(() => mockDevtools)
    };
  });

  afterEach(() => {
    delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
    vi.restoreAllMocks();
  });

  // ================================================================
  // 基础功能
  // ================================================================

  describe('基础功能', () => {
    it('应该在开发环境连接DevTools', () => {
      interface TestState {
        count: number;
      }

      createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          { enabled: true }
        )
      );

      expect((window as any).__REDUX_DEVTOOLS_EXTENSION__.connect).toHaveBeenCalled();
    });

    it('应该初始化DevTools状态', () => {
      interface TestState {
        count: number;
        name: string;
      }

      createStore<TestState>()(
        devtools(
          () => ({
            count: 0,
            name: 'test'
          }),
          { enabled: true }
        )
      );

      expect(mockDevtools.init).toHaveBeenCalledWith({
        count: 0,
        name: 'test'
      });
    });

    it('应该在禁用时不连接DevTools', () => {
      interface TestState {
        count: number;
      }

      createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          { enabled: false }
        )
      );

      expect((window as any).__REDUX_DEVTOOLS_EXTENSION__.connect).not.toHaveBeenCalled();
    });

    it('应该在DevTools不可用时正常工作', () => {
      delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;

      interface TestState {
        count: number;
      }

      const store = createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          { enabled: true }
        )
      );

      expect(store.getState().count).toBe(0);
    });
  });

  // ================================================================
  // Action追踪
  // ================================================================

  describe('Action追踪', () => {
    it('应该发送状态更新到DevTools', () => {
      interface TestState {
        count: number;
        increment: () => void;
      }

      const store = createStore<TestState>()(
        devtools(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }))
          }),
          { enabled: true }
        )
      );

      store.getState().increment();

      expect(mockDevtools.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'anonymous'
        }),
        expect.objectContaining({
          count: 1
        })
      );
    });

    it('应该支持自定义action类型', () => {
      interface TestState {
        count: number;
        increment: () => void;
      }

      const store = createStore<TestState>()(
        devtools(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }))
          }),
          {
            enabled: true,
            anonymousActionType: 'UPDATE'
          }
        )
      );

      store.getState().increment();

      expect(mockDevtools.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE'
        }),
        expect.any(Object)
      );
    });

    it('应该包含payload信息', () => {
      interface TestState {
        data: any;
        setData: (data: any) => void;
      }

      const store = createStore<TestState>()(
        devtools(
          (set) => ({
            data: null,
            setData: (data) => set({ data })
          }),
          { enabled: true }
        )
      );

      const testData = { id: 1, name: 'test' };
      store.getState().setData(testData);

      expect(mockDevtools.send).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            data: testData
          })
        }),
        expect.any(Object)
      );
    });
  });

  // ================================================================
  // 时间旅行
  // ================================================================

  describe('时间旅行', () => {
    it('应该订阅DevTools消息', () => {
      interface TestState {
        count: number;
      }

      createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          { enabled: true }
        )
      );

      expect(mockDevtools.subscribe).toHaveBeenCalled();
    });

    it('应该处理时间旅行DISPATCH消息', () => {
      interface TestState {
        count: number;
      }

      const store = createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          { enabled: true }
        )
      );

      // 获取subscribe的回调函数
      const subscribeCallback = mockDevtools.subscribe.mock.calls[0][0];

      // 模拟时间旅行
      subscribeCallback({
        type: 'DISPATCH',
        state: JSON.stringify({ count: 5 })
      });

      expect(store.getState().count).toBe(5);
    });

    it('应该处理无效的时间旅行状态', () => {
      interface TestState {
        count: number;
      }

      const store = createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          { enabled: true }
        )
      );

      const subscribeCallback = mockDevtools.subscribe.mock.calls[0][0];

      // 模拟无效的JSON
      expect(() => {
        subscribeCallback({
          type: 'DISPATCH',
          state: 'invalid-json'
        });
      }).not.toThrow();

      // 状态应该保持不变
      expect(store.getState().count).toBe(0);
    });

    it('应该忽略非DISPATCH消息', () => {
      interface TestState {
        count: number;
      }

      const store = createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          { enabled: true }
        )
      );

      const subscribeCallback = mockDevtools.subscribe.mock.calls[0][0];

      subscribeCallback({
        type: 'OTHER_MESSAGE',
        state: JSON.stringify({ count: 5 })
      });

      // 状态不应该改变
      expect(store.getState().count).toBe(0);
    });
  });

  // ================================================================
  // 配置选项
  // ================================================================

  describe('配置选项', () => {
    it('应该使用自定义名称', () => {
      interface TestState {
        count: number;
      }

      createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          {
            enabled: true,
            name: 'CustomStore'
          }
        )
      );

      expect((window as any).__REDUX_DEVTOOLS_EXTENSION__.connect).toHaveBeenCalledWith({
        name: 'CustomStore'
      });
    });

    it('应该使用默认名称', () => {
      interface TestState {
        count: number;
      }

      createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          { enabled: true }
        )
      );

      expect((window as any).__REDUX_DEVTOOLS_EXTENSION__.connect).toHaveBeenCalledWith({
        name: 'AppStore'
      });
    });
  });

  // ================================================================
  // DevTools Helper
  // ================================================================

  describe('DevTools Helper', () => {
    it('isAvailable应该检测DevTools是否可用', () => {
      expect(devtoolsHelper.isAvailable()).toBe(true);

      delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
      expect(devtoolsHelper.isAvailable()).toBe(false);
    });

    it('logStateChange应该在开发环境记录日志', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      const originalNodeEnv = process.env.NODE_ENV;

      const prevState = { count: 0 };
      const nextState = { count: 1 };

      try {
        process.env.NODE_ENV = 'development';
        devtoolsHelper.logStateChange('TestStore', 'increment', prevState, nextState);

        expect(consoleSpy).toHaveBeenCalledWith('[TestStore] increment');
        expect(consoleLogSpy).toHaveBeenCalledWith('Previous State:', prevState);
        expect(consoleLogSpy).toHaveBeenCalledWith('Next State:', nextState);
        expect(consoleGroupEndSpy).toHaveBeenCalled();
      } finally {
        if (originalNodeEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = originalNodeEnv;
        }
        consoleSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleGroupEndSpy.mockRestore();
      }
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('应该处理复杂状态对象', () => {
      interface TestState {
        nested: {
          deep: {
            value: number;
          };
        };
        array: number[];
      }

      const store = createStore<TestState>()(
        devtools(
          () => ({
            nested: { deep: { value: 0 } },
            array: [1, 2, 3]
          }),
          { enabled: true }
        )
      );

      expect(mockDevtools.init).toHaveBeenCalledWith({
        nested: { deep: { value: 0 } },
        array: [1, 2, 3]
      });
    });

    it('应该处理函数式更新', () => {
      interface TestState {
        count: number;
        increment: () => void;
      }

      const store = createStore<TestState>()(
        devtools(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }))
          }),
          { enabled: true }
        )
      );

      store.getState().increment();

      expect(mockDevtools.send).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: undefined // 函数式更新没有payload
        }),
        expect.objectContaining({
          count: 1
        })
      );
    });

    it('应该处理replace模式', () => {
      interface TestState {
        count: number;
        name: string;
        reset: () => void;
      }

      const store = createStore<TestState>()(
        devtools(
          (set) => ({
            count: 0,
            name: 'test',
            reset: () => set({ count: 0, name: 'test', reset: () => {} } as any, true)
          }),
          { enabled: true }
        )
      );

      store.getState().reset();

      expect(mockDevtools.send).toHaveBeenCalled();
    });

    it('应该在服务器端环境正常工作', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      interface TestState {
        count: number;
      }

      const store = createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          { enabled: true }
        )
      );

      expect(store.getState().count).toBe(0);

      (global as any).window = originalWindow;
    });
  });

  // ================================================================
  // 集成测试
  // ================================================================

  describe('集成测试', () => {
    it('应该与多个状态更新一起工作', () => {
      interface TestState {
        count: number;
        name: string;
        increment: () => void;
        setName: (name: string) => void;
      }

      const store = createStore<TestState>()(
        devtools(
          (set) => ({
            count: 0,
            name: 'initial',
            increment: () => set((state) => ({ count: state.count + 1 })),
            setName: (name) => set({ name })
          }),
          { enabled: true }
        )
      );

      store.getState().increment();
      store.getState().setName('updated');
      store.getState().increment();

      expect(mockDevtools.send).toHaveBeenCalledTimes(3);
      expect(store.getState().count).toBe(2);
      expect(store.getState().name).toBe('updated');
    });

    it('应该正确处理连续的时间旅行', () => {
      interface TestState {
        count: number;
      }

      const store = createStore<TestState>()(
        devtools(
          () => ({
            count: 0
          }),
          { enabled: true }
        )
      );

      const subscribeCallback = mockDevtools.subscribe.mock.calls[0][0];

      // 第一次时间旅行
      subscribeCallback({
        type: 'DISPATCH',
        state: JSON.stringify({ count: 5 })
      });
      expect(store.getState().count).toBe(5);

      // 第二次时间旅行
      subscribeCallback({
        type: 'DISPATCH',
        state: JSON.stringify({ count: 3 })
      });
      expect(store.getState().count).toBe(3);
    });
  });
