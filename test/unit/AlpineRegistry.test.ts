/**
 * AlpineRegistry 单元测试
 * 
 * 测试组件注册、注销和依赖管理功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AlpineRegistry, getAlpineRegistry } from '../../src/common/infrastructure/AlpineRegistry';

// Mock Alpine.js
const mockAlpine = {
  data: vi.fn(),
  start: vi.fn()
};

describe('AlpineRegistry - register 和 unregister', () => {
  let registry: AlpineRegistry;
  
  beforeEach(() => {
    // 重置单例
    (AlpineRegistry as any).instance = undefined;
    
    // 设置 Alpine mock
    (global as any).window = {
      Alpine: mockAlpine
    };
    
    // 清除 mock 调用记录
    mockAlpine.data.mockClear();
    mockAlpine.start.mockClear();
    
    // 创建新实例
    registry = AlpineRegistry.getInstance({ logLevel: 'error' });
  });
  
  afterEach(() => {
    // 清理
    delete (global as any).window;
  });
  
  describe('register 方法', () => {
    it('应该成功注册一个简单组件', () => {
      const factory = () => ({ data: 'test' });
      
      expect(() => {
        registry.register('testComponent', factory);
      }).not.toThrow();
      
      expect(registry.isComponentRegistered('testComponent')).toBe(true);
    });
    
    it('应该成功注册带依赖的组件', () => {
      const factory1 = () => ({ data: 'dep' });
      const factory2 = () => ({ data: 'main' });
      
      registry.register('dependency', factory1);
      registry.register('mainComponent', factory2, ['dependency']);
      
      expect(registry.isComponentRegistered('dependency')).toBe(true);
      expect(registry.isComponentRegistered('mainComponent')).toBe(true);
    });
    
    it('应该拒绝空组件名称', () => {
      const factory = () => ({ data: 'test' });
      
      expect(() => {
        registry.register('', factory);
      }).toThrow('组件名称必须是非空字符串');
    });
    
    it('应该拒绝非字符串的组件名称', () => {
      const factory = () => ({ data: 'test' });
      
      expect(() => {
        registry.register(null as any, factory);
      }).toThrow('组件名称必须是非空字符串');
    });
    
    it('应该拒绝非函数的工厂函数', () => {
      expect(() => {
        registry.register('testComponent', 'not a function' as any);
      }).toThrow('工厂函数必须是函数类型');
    });
    
    it('应该拒绝非数组的依赖项', () => {
      const factory = () => ({ data: 'test' });
      
      expect(() => {
        registry.register('testComponent', factory, 'not an array' as any);
      }).toThrow('依赖必须是数组');
    });
    
    it('应该拒绝空字符串依赖项', () => {
      const factory = () => ({ data: 'test' });
      
      expect(() => {
        registry.register('testComponent', factory, ['']);
      }).toThrow('依赖项必须是非空字符串');
    });
    
    it('应该拒绝自依赖', () => {
      const factory = () => ({ data: 'test' });
      
      expect(() => {
        registry.register('testComponent', factory, ['testComponent']);
      }).toThrow('不能依赖自己');
    });
    
    it('应该允许覆盖已存在的组件', () => {
      const factory1 = () => ({ data: 'v1' });
      const factory2 = () => ({ data: 'v2' });
      
      registry.register('testComponent', factory1);
      
      // 覆盖应该成功（会有警告日志）
      expect(() => {
        registry.register('testComponent', factory2);
      }).not.toThrow();
      
      expect(registry.isComponentRegistered('testComponent')).toBe(true);
    });
    
    it('应该将组件添加到待注册队列（Alpine 未初始化）', () => {
      const factory = () => ({ data: 'test' });
      
      registry.register('testComponent', factory);
      
      // 此时不应该调用 Alpine.data
      expect(mockAlpine.data).not.toHaveBeenCalled();
    });
  });
  
  describe('unregister 方法', () => {
    it('应该成功注销已注册的组件', () => {
      const factory = () => ({ data: 'test' });
      
      registry.register('testComponent', factory);
      expect(registry.isComponentRegistered('testComponent')).toBe(true);
      
      registry.unregister('testComponent');
      expect(registry.isComponentRegistered('testComponent')).toBe(false);
    });
    
    it('应该能注销不存在的组件（不抛出错误）', () => {
      expect(() => {
        registry.unregister('nonExistentComponent');
      }).not.toThrow();
    });
    
    it('应该从待注册队列中移除组件', () => {
      const factory = () => ({ data: 'test' });
      
      registry.register('testComponent', factory);
      registry.unregister('testComponent');
      
      // 初始化后不应该注册该组件
      registry.init();
      expect(mockAlpine.data).not.toHaveBeenCalled();
    });
  });
  
  describe('isComponentRegistered 方法', () => {
    it('应该正确返回组件注册状态', () => {
      const factory = () => ({ data: 'test' });
      
      expect(registry.isComponentRegistered('testComponent')).toBe(false);
      
      registry.register('testComponent', factory);
      expect(registry.isComponentRegistered('testComponent')).toBe(true);
      
      registry.unregister('testComponent');
      expect(registry.isComponentRegistered('testComponent')).toBe(false);
    });
  });
  
  describe('getRegisteredComponents 方法', () => {
    it('应该返回所有已注册组件的名称', () => {
      const factory = () => ({ data: 'test' });
      
      expect(registry.getRegisteredComponents()).toEqual([]);
      
      registry.register('component1', factory);
      registry.register('component2', factory);
      registry.register('component3', factory);
      
      const registered = registry.getRegisteredComponents();
      expect(registered).toHaveLength(3);
      expect(registered).toContain('component1');
      expect(registered).toContain('component2');
      expect(registered).toContain('component3');
    });
  });
  
  describe('组件注册流程', () => {
    it('应该在 init 后立即注册新组件', () => {
      const factory1 = () => ({ data: 'test1' });
      const factory2 = () => ({ data: 'test2' });
      
      // 先注册一个组件
      registry.register('component1', factory1);
      
      // 初始化
      registry.init();
      expect(mockAlpine.data).toHaveBeenCalledTimes(1);
      
      // 清除调用记录
      mockAlpine.data.mockClear();
      
      // 初始化后注册新组件应该立即注册到 Alpine
      registry.register('component2', factory2);
      expect(mockAlpine.data).toHaveBeenCalledTimes(1);
      expect(mockAlpine.data).toHaveBeenCalledWith('component2', factory2);
    });
  });
});

describe('AlpineRegistry - init 方法（批量注册）', () => {
  let registry: AlpineRegistry;
  
  beforeEach(() => {
    // 重置单例
    (AlpineRegistry as any).instance = undefined;
    
    // 设置 Alpine mock
    (global as any).window = {
      Alpine: mockAlpine
    };
    
    // 清除 mock 调用记录
    mockAlpine.data.mockClear();
    mockAlpine.start.mockClear();
    
    // 创建新实例
    registry = AlpineRegistry.getInstance({ logLevel: 'error' });
  });
  
  afterEach(() => {
    // 清理
    delete (global as any).window;
  });
  
  describe('基本功能', () => {
    it('应该在 Alpine 可用时成功初始化', () => {
      const factory = () => ({ data: 'test' });
      
      registry.register('component1', factory);
      registry.register('component2', factory);
      
      expect(() => {
        registry.init();
      }).not.toThrow();
      
      expect(mockAlpine.data).toHaveBeenCalledTimes(2);
    });
    
    it('应该在 Alpine 不可用时抛出错误', () => {
      const factory = () => ({ data: 'test' });
      
      registry.register('component1', factory);
      
      // 移除 Alpine
      delete (global as any).window.Alpine;
      
      expect(() => {
        registry.init();
      }).toThrow('Alpine.js 未就绪');
    });
    
    it('应该在没有待注册组件时正常返回', () => {
      expect(() => {
        registry.init();
      }).not.toThrow();
      
      expect(mockAlpine.data).not.toHaveBeenCalled();
    });
    
    it('应该清空待注册队列', () => {
      const factory = () => ({ data: 'test' });
      
      registry.register('component1', factory);
      registry.init();
      
      // 清除调用记录
      mockAlpine.data.mockClear();
      
      // 再次调用 init 不应该重复注册
      registry.init();
      expect(mockAlpine.data).not.toHaveBeenCalled();
    });
  });
  
  describe('autoStart 选项', () => {
    it('应该在 autoStart=true 时自动启动 Alpine', () => {
      // 重置单例并使用 autoStart 选项
      (AlpineRegistry as any).instance = undefined;
      registry = AlpineRegistry.getInstance({ autoStart: true, logLevel: 'error' });
      
      const factory = () => ({ data: 'test' });
      registry.register('component1', factory);
      
      registry.init();
      
      expect(mockAlpine.start).toHaveBeenCalledTimes(1);
    });
    
    it('应该在 autoStart=false 时不启动 Alpine', () => {
      const factory = () => ({ data: 'test' });
      registry.register('component1', factory);
      
      registry.init();
      
      expect(mockAlpine.start).not.toHaveBeenCalled();
    });
  });
  
  describe('错误处理', () => {
    it('应该处理组件注册失败的情况', () => {
      const factory1 = () => ({ data: 'test1' });
      const factory2 = () => ({ data: 'test2' });
      
      // 模拟第一个组件注册失败
      mockAlpine.data.mockImplementationOnce(() => {
        throw new Error('注册失败');
      });
      
      registry.register('component1', factory1);
      registry.register('component2', factory2);
      
      // 不应该抛出错误，应该继续注册其他组件
      expect(() => {
        registry.init();
      }).not.toThrow();
      
      // 应该尝试注册两个组件
      expect(mockAlpine.data).toHaveBeenCalledTimes(2);
    });
    
    it('应该在所有组件注册失败时仍然完成初始化', () => {
      const factory = () => ({ data: 'test' });
      
      // 模拟所有注册都失败
      mockAlpine.data.mockImplementation(() => {
        throw new Error('注册失败');
      });
      
      registry.register('component1', factory);
      registry.register('component2', factory);
      
      expect(() => {
        registry.init();
      }).not.toThrow();
    });
  });
  
  describe('批量注册性能', () => {
    it('应该一次性注册所有组件', () => {
      const factory = () => ({ data: 'test' });
      
      // 注册多个组件
      for (let i = 0; i < 5; i++) {
        registry.register(`component${i}`, factory);
      }
      
      registry.init();
      
      // 验证所有组件都被注册
      expect(mockAlpine.data).toHaveBeenCalledTimes(5);
    });
  });
});

describe('AlpineRegistry - 依赖解析算法', () => {
  let registry: AlpineRegistry;
  
  beforeEach(() => {
    // 重置单例
    (AlpineRegistry as any).instance = undefined;
    
    // 设置 Alpine mock
    (global as any).window = {
      Alpine: mockAlpine
    };
    
    // 清除 mock 调用记录
    mockAlpine.data.mockClear();
    mockAlpine.start.mockClear();
    
    // 创建新实例
    registry = AlpineRegistry.getInstance({ logLevel: 'error' });
  });
  
  afterEach(() => {
    // 清理
    delete (global as any).window;
  });
  
  describe('简单依赖解析', () => {
    it('应该按正确顺序注册有依赖关系的组件', () => {
      const factoryA = () => ({ data: 'A' });
      const factoryB = () => ({ data: 'B' });
      
      // B 依赖 A
      registry.register('componentA', factoryA);
      registry.register('componentB', factoryB, ['componentA']);
      
      registry.init();
      
      // 验证调用顺序：A 应该在 B 之前注册
      expect(mockAlpine.data).toHaveBeenCalledTimes(2);
      expect(mockAlpine.data.mock.calls[0][0]).toBe('componentA');
      expect(mockAlpine.data.mock.calls[1][0]).toBe('componentB');
    });
    
    it('应该处理多个依赖', () => {
      const factoryA = () => ({ data: 'A' });
      const factoryB = () => ({ data: 'B' });
      const factoryC = () => ({ data: 'C' });
      
      // C 依赖 A 和 B
      registry.register('componentA', factoryA);
      registry.register('componentB', factoryB);
      registry.register('componentC', factoryC, ['componentA', 'componentB']);
      
      registry.init();
      
      expect(mockAlpine.data).toHaveBeenCalledTimes(3);
      
      // 获取注册顺序
      const callOrder = mockAlpine.data.mock.calls.map(call => call[0]);
      
      // A 和 B 应该在 C 之前注册
      const indexA = callOrder.indexOf('componentA');
      const indexB = callOrder.indexOf('componentB');
      const indexC = callOrder.indexOf('componentC');
      
      expect(indexA).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexC);
    });
  });
  
  describe('链式依赖解析', () => {
    it('应该处理链式依赖 (A -> B -> C)', () => {
      const factoryA = () => ({ data: 'A' });
      const factoryB = () => ({ data: 'B' });
      const factoryC = () => ({ data: 'C' });
      
      // C 依赖 B，B 依赖 A
      registry.register('componentC', factoryC, ['componentB']);
      registry.register('componentB', factoryB, ['componentA']);
      registry.register('componentA', factoryA);
      
      registry.init();
      
      expect(mockAlpine.data).toHaveBeenCalledTimes(3);
      
      // 验证注册顺序：A -> B -> C
      expect(mockAlpine.data.mock.calls[0][0]).toBe('componentA');
      expect(mockAlpine.data.mock.calls[1][0]).toBe('componentB');
      expect(mockAlpine.data.mock.calls[2][0]).toBe('componentC');
    });
    
    it('应该处理复杂的依赖链', () => {
      const factory = () => ({ data: 'test' });
      
      // 依赖关系：D -> B -> A, D -> C -> A
      registry.register('componentA', factory);
      registry.register('componentB', factory, ['componentA']);
      registry.register('componentC', factory, ['componentA']);
      registry.register('componentD', factory, ['componentB', 'componentC']);
      
      registry.init();
      
      expect(mockAlpine.data).toHaveBeenCalledTimes(4);
      
      const callOrder = mockAlpine.data.mock.calls.map(call => call[0]);
      
      // A 应该最先注册
      expect(callOrder[0]).toBe('componentA');
      
      // D 应该最后注册
      expect(callOrder[3]).toBe('componentD');
      
      // B 和 C 应该在 A 之后、D 之前
      const indexA = callOrder.indexOf('componentA');
      const indexB = callOrder.indexOf('componentB');
      const indexC = callOrder.indexOf('componentC');
      const indexD = callOrder.indexOf('componentD');
      
      expect(indexB).toBeGreaterThan(indexA);
      expect(indexC).toBeGreaterThan(indexA);
      expect(indexB).toBeLessThan(indexD);
      expect(indexC).toBeLessThan(indexD);
    });
  });
  
  describe('循环依赖检测', () => {
    it('应该检测并拒绝简单的循环依赖 (A -> B -> A)', () => {
      const factoryA = () => ({ data: 'A' });
      const factoryB = () => ({ data: 'B' });
      
      // A 依赖 B，B 依赖 A
      registry.register('componentA', factoryA, ['componentB']);
      registry.register('componentB', factoryB, ['componentA']);
      
      expect(() => {
        registry.init();
      }).toThrow('检测到循环依赖');
    });
    
    it('应该检测并拒绝复杂的循环依赖 (A -> B -> C -> A)', () => {
      const factory = () => ({ data: 'test' });
      
      // A -> B -> C -> A
      registry.register('componentA', factory, ['componentB']);
      registry.register('componentB', factory, ['componentC']);
      registry.register('componentC', factory, ['componentA']);
      
      expect(() => {
        registry.init();
      }).toThrow('检测到循环依赖');
    });
    
    it('应该检测并拒绝间接循环依赖', () => {
      const factory = () => ({ data: 'test' });
      
      // A -> B -> C -> D -> B (循环)
      registry.register('componentA', factory, ['componentB']);
      registry.register('componentB', factory, ['componentC']);
      registry.register('componentC', factory, ['componentD']);
      registry.register('componentD', factory, ['componentB']);
      
      expect(() => {
        registry.init();
      }).toThrow('检测到循环依赖');
    });
  });
  
  describe('缺失依赖处理', () => {
    it('应该警告但不阻止注册（依赖未找到）', () => {
      const factory = () => ({ data: 'test' });
      
      // componentB 依赖不存在的 componentA
      registry.register('componentB', factory, ['componentA']);
      
      // 应该不抛出错误，但会有警告日志
      expect(() => {
        registry.init();
      }).not.toThrow();
      
      // componentB 应该被注册
      expect(mockAlpine.data).toHaveBeenCalledTimes(1);
      expect(mockAlpine.data).toHaveBeenCalledWith('componentB', factory);
    });
    
    it('应该处理部分依赖缺失的情况', () => {
      const factory = () => ({ data: 'test' });
      
      // C 依赖 A（存在）和 B（不存在）
      registry.register('componentA', factory);
      registry.register('componentC', factory, ['componentA', 'componentB']);
      
      expect(() => {
        registry.init();
      }).not.toThrow();
      
      expect(mockAlpine.data).toHaveBeenCalledTimes(2);
      
      // A 应该在 C 之前注册
      const callOrder = mockAlpine.data.mock.calls.map(call => call[0]);
      expect(callOrder.indexOf('componentA')).toBeLessThan(callOrder.indexOf('componentC'));
    });
  });
  
  describe('无依赖组件', () => {
    it('应该正确处理没有依赖的组件', () => {
      const factory = () => ({ data: 'test' });
      
      registry.register('componentA', factory);
      registry.register('componentB', factory);
      registry.register('componentC', factory);
      
      registry.init();
      
      // 所有组件都应该被注册
      expect(mockAlpine.data).toHaveBeenCalledTimes(3);
    });
    
    it('应该处理混合场景（有依赖和无依赖）', () => {
      const factory = () => ({ data: 'test' });
      
      // A 和 B 无依赖，C 依赖 A
      registry.register('componentA', factory);
      registry.register('componentB', factory);
      registry.register('componentC', factory, ['componentA']);
      
      registry.init();
      
      expect(mockAlpine.data).toHaveBeenCalledTimes(3);
      
      const callOrder = mockAlpine.data.mock.calls.map(call => call[0]);
      
      // A 应该在 C 之前
      expect(callOrder.indexOf('componentA')).toBeLessThan(callOrder.indexOf('componentC'));
    });
  });
  
  describe('边界情况', () => {
    it('应该处理空依赖数组', () => {
      const factory = () => ({ data: 'test' });
      
      registry.register('componentA', factory, []);
      
      expect(() => {
        registry.init();
      }).not.toThrow();
      
      expect(mockAlpine.data).toHaveBeenCalledTimes(1);
    });
    
    it('应该处理重复的依赖项', () => {
      const factoryA = () => ({ data: 'A' });
      const factoryB = () => ({ data: 'B' });
      
      // B 重复依赖 A
      registry.register('componentA', factoryA);
      registry.register('componentB', factoryB, ['componentA', 'componentA']);
      
      expect(() => {
        registry.init();
      }).not.toThrow();
      
      expect(mockAlpine.data).toHaveBeenCalledTimes(2);
    });
    
    it('应该处理大量组件的依赖解析', () => {
      const factory = () => ({ data: 'test' });
      
      // 创建 10 个组件，每个依赖前一个
      for (let i = 0; i < 10; i++) {
        const deps = i > 0 ? [`component${i - 1}`] : [];
        registry.register(`component${i}`, factory, deps);
      }
      
      expect(() => {
        registry.init();
      }).not.toThrow();
      
      expect(mockAlpine.data).toHaveBeenCalledTimes(10);
      
      // 验证顺序
      const callOrder = mockAlpine.data.mock.calls.map(call => call[0]);
      for (let i = 0; i < 10; i++) {
        expect(callOrder[i]).toBe(`component${i}`);
      }
    });
  });
});

describe('AlpineRegistry - 日志系统覆盖', () => {
  let registry: AlpineRegistry;
  let mockAlpine: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    // 重置单例
    (AlpineRegistry as any).instance = undefined;
    
    // Mock Alpine.js
    mockAlpine = {
      data: vi.fn(),
      start: vi.fn()
    };
    
    (global as any).window = {
      Alpine: mockAlpine
    };
    
    // Spy on console methods
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // 创建实例（使用 warn 级别以触发 warn 和 error 日志）
    registry = AlpineRegistry.getInstance({ logLevel: 'warn' });
  });
  
  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });
  
  describe('日志输出（无附加数据）', () => {
    it('应该输出 warn 级别日志（无附加数据）', () => {
      // 注册一个已存在的组件，触发 warn 日志
      const factory = () => ({ data: 'test' });
      registry.register('testComponent', factory);
      registry.register('testComponent', factory); // 覆盖，触发 warn
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCalls = consoleWarnSpy.mock.calls;
      const hasWarnWithoutData = warnCalls.some((call: any[]) => call.length === 1);
      expect(hasWarnWithoutData).toBe(true);
    });
    
    it('应该输出 error 级别日志（无附加数据）', () => {
      // 尝试注册空名称组件，触发 error 日志
      expect(() => {
        registry.register('', () => ({}));
      }).toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorCalls = consoleErrorSpy.mock.calls;
      const hasErrorWithoutData = errorCalls.some((call: any[]) => call.length === 1);
      expect(hasErrorWithoutData).toBe(true);
    });
  });
});

describe('AlpineRegistry - 导出函数', () => {
  beforeEach(() => {
    // 重置单例
    (AlpineRegistry as any).instance = undefined;
  });
  
  it('应该通过 getAlpineRegistry 函数获取实例', () => {
    const instance1 = getAlpineRegistry();
    const instance2 = getAlpineRegistry();
    
    expect(instance1).toBe(instance2);
    expect(instance1).toBeInstanceOf(AlpineRegistry);
  });
  
  it('应该通过 getAlpineRegistry 传递配置选项', () => {
    const instance = getAlpineRegistry({ autoStart: true, logLevel: 'error' });
    
    expect(instance).toBeInstanceOf(AlpineRegistry);
    // 验证实例已创建（单例模式）
    const instance2 = getAlpineRegistry();
    expect(instance2).toBe(instance);
  });
});
