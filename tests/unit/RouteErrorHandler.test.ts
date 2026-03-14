// tests/unit/RouteErrorHandler.test.ts
// ================================================================
// RouteErrorHandler 单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RouteErrorHandlerManager } from '@/common/router/ErrorHandler';
import type { RouteErrorContext, RouteErrorHandler } from '@/types/config';

// Mock DOM
const mockContainer = document.createElement('div');
mockContainer.id = 'main-content';
document.body.appendChild(mockContainer);

describe('RouteErrorHandlerManager', () => {
  let manager: RouteErrorHandlerManager;

  beforeEach(() => {
    manager = new RouteErrorHandlerManager();
    mockContainer.innerHTML = '';
    
    // Mock console方法
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ================================================================
  // 错误处理器注册
  // ================================================================

  describe('错误处理器注册', () => {
    it('应该注册自定义错误处理器', () => {
      const handler = vi.fn();
      
      manager.register('NOT_FOUND', handler);
      
      const types = manager.getRegisteredTypes();
      expect(types).toContain('NOT_FOUND');
    });

    it('应该覆盖已存在的处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      manager.register('NOT_FOUND', handler1);
      manager.register('NOT_FOUND', handler2);
      
      const error = new Error('Route not found');
      manager.handle(error, { routeId: 'test' });
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('应该支持注册所有错误类型', () => {
      const handler = vi.fn();
      
      manager.register('NOT_FOUND', handler);
      manager.register('PERMISSION_DENIED', handler);
      manager.register('LOAD_FAILED', handler);
      manager.register('TIMEOUT', handler);
      manager.register('NETWORK_ERROR', handler);
      manager.register('UNKNOWN', handler);
      
      const types = manager.getRegisteredTypes();
      expect(types.length).toBeGreaterThanOrEqual(6);
    });
  });

  // ================================================================
  // 错误分类
  // ================================================================

  describe('错误分类', () => {
    it('应该识别NOT_FOUND错误', () => {
      const handler = vi.fn();
      manager.register('NOT_FOUND', handler);
      
      const error = new Error('Route not found');
      manager.handle(error);
      
      expect(handler).toHaveBeenCalled();
    });

    it('应该识别PERMISSION_DENIED错误', () => {
      const handler = vi.fn();
      manager.register('PERMISSION_DENIED', handler);
      
      const error = new Error('Permission denied');
      manager.handle(error);
      
      expect(handler).toHaveBeenCalled();
    });

    it('应该识别LOAD_FAILED错误', () => {
      const handler = vi.fn();
      manager.register('LOAD_FAILED', handler);
      
      const error = new Error('Failed to load module');
      manager.handle(error);
      
      expect(handler).toHaveBeenCalled();
    });

    it('应该识别TIMEOUT错误', () => {
      const handler = vi.fn();
      manager.register('TIMEOUT', handler);
      
      const error = new Error('Request timeout');
      manager.handle(error);
      
      expect(handler).toHaveBeenCalled();
    });

    it('应该识别NETWORK_ERROR错误', () => {
      const handler = vi.fn();
      manager.register('NETWORK_ERROR', handler);
      
      const error = new Error('Network connection failed');
      manager.handle(error);
      
      expect(handler).toHaveBeenCalled();
    });

    it('应该将未知错误分类为UNKNOWN', () => {
      const handler = vi.fn();
      manager.register('UNKNOWN', handler);
      
      const error = new Error('Some random error');
      manager.handle(error);
      
      expect(handler).toHaveBeenCalled();
    });

    it('应该支持中文错误消息', () => {
      const handler = vi.fn();
      manager.register('NOT_FOUND', handler);
      
      const error = new Error('路由不存在');
      manager.handle(error);
      
      expect(handler).toHaveBeenCalled();
    });
  });

  // ================================================================
  // 错误处理
  // ================================================================

  describe('错误处理', () => {
    it('应该传递错误对象和上下文', () => {
      const handler = vi.fn();
      manager.register('NOT_FOUND', handler);
      
      const error = new Error('Not found');
      const context: RouteErrorContext = {
        routeId: 'test_route',
        from: {
          path: 'source',
          config: {
            moduleId: 'source',
            label: 'Source',
            icon: 'icon',
            panelId: 'panel',
            viewPath: '/source.html'
          },
          state: {}
        }
      };
      
      manager.handle(error, context);
      
      expect(handler).toHaveBeenCalledWith(error, context);
    });

    it('应该在处理器抛出错误时使用默认处理器', () => {
      const faultyHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const defaultHandler = vi.spyOn(manager, 'defaultHandler');
      
      manager.register('NOT_FOUND', faultyHandler);
      
      const error = new Error('Not found');
      manager.handle(error);
      
      expect(faultyHandler).toHaveBeenCalled();
      expect(defaultHandler).toHaveBeenCalled();
    });

    it('应该在没有注册处理器时使用默认处理器', () => {
      const defaultHandler = vi.spyOn(manager, 'defaultHandler');
      
      // 清空所有处理器
      manager.clearHandlers();
      manager.clearHandlers(); // 第二次清空确保没有默认处理器
      
      const error = new Error('Some error');
      manager.handle(error, {});
      
      expect(defaultHandler).toHaveBeenCalled();
    });

    it('应该处理空上下文', () => {
      const handler = vi.fn();
      manager.register('NOT_FOUND', handler);
      
      const error = new Error('Not found');
      manager.handle(error);
      
      expect(handler).toHaveBeenCalledWith(error, {});
    });
  });

  // ================================================================
  // 默认处理器
  // ================================================================

  describe('默认处理器', () => {
    it('应该执行默认错误处理', () => {
      const error = new Error('Test error');
      const context: RouteErrorContext = { routeId: 'test' };
      
      expect(() => {
        manager.defaultHandler(error, context);
      }).not.toThrow();
    });

    it('应该在window.showToast存在时调用', () => {
      const mockShowToast = vi.fn();
      (window as any).showToast = mockShowToast;
      
      const error = new Error('Test error');
      manager.defaultHandler(error, {});
      
      expect(mockShowToast).toHaveBeenCalledWith(
        '页面加载失败，请重试',
        'error'
      );
      
      delete (window as any).showToast;
    });
  });

  // ================================================================
  // 处理器管理
  // ================================================================

  describe('处理器管理', () => {
    it('应该清空所有处理器', () => {
      const handler = vi.fn();
      
      manager.register('NOT_FOUND', handler);
      manager.register('TIMEOUT', handler);
      
      manager.clearHandlers();
      
      // 清空后应该重新注册默认处理器
      const types = manager.getRegisteredTypes();
      expect(types.length).toBeGreaterThan(0);
    });

    it('应该获取已注册的错误类型', () => {
      const types = manager.getRegisteredTypes();
      
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('清空后应该重新注册默认处理器', () => {
      manager.clearHandlers();
      
      const types = manager.getRegisteredTypes();
      expect(types).toContain('NOT_FOUND');
      expect(types).toContain('PERMISSION_DENIED');
      expect(types).toContain('LOAD_FAILED');
    });
  });

  // ================================================================
  // 默认处理器行为
  // ================================================================

  describe('默认处理器行为', () => {
    it('NOT_FOUND处理器应该渲染404页面', () => {
      const error = new Error('Route not found');
      manager.handle(error, { routeId: 'test_route' });
      
      // 验证容器内容被修改
      expect(mockContainer.innerHTML).not.toBe('');
    });

    it('PERMISSION_DENIED处理器应该显示权限提示', () => {
      const mockShowToast = vi.fn();
      (window as any).showToast = mockShowToast;
      
      const error = new Error('Permission denied');
      manager.handle(error);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        '您没有权限访问此页面',
        'warning'
      );
      
      delete (window as any).showToast;
    });

    it('TIMEOUT处理器应该显示超时提示', () => {
      const mockShowToast = vi.fn();
      (window as any).showToast = mockShowToast;
      
      const error = new Error('Request timeout');
      manager.handle(error);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        '页面加载超时，请检查网络连接',
        'error'
      );
      
      delete (window as any).showToast;
    });

    it('NETWORK_ERROR处理器应该显示网络错误提示', () => {
      const mockShowToast = vi.fn();
      (window as any).showToast = mockShowToast;
      
      const error = new Error('Network error');
      manager.handle(error);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        '网络连接失败，请检查网络设置',
        'error'
      );
      
      delete (window as any).showToast;
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('应该处理空错误消息', () => {
      const handler = vi.fn();
      manager.register('UNKNOWN', handler);
      
      const error = new Error('');
      manager.handle(error);
      
      expect(handler).toHaveBeenCalled();
    });

    it('应该处理非Error对象', () => {
      const handler = vi.fn();
      manager.register('UNKNOWN', handler);
      
      // 虽然类型定义要求Error,但测试健壮性
      manager.handle({ message: 'Not an Error' } as any);
      
      expect(handler).toHaveBeenCalled();
    });

    it('应该处理大小写不敏感的错误消息', () => {
      const handler = vi.fn();
      manager.register('NOT_FOUND', handler);
      
      const error = new Error('NOT FOUND');
      manager.handle(error);
      
      expect(handler).toHaveBeenCalled();
    });

    it('应该处理包含多个关键词的错误消息', () => {
      const notFoundHandler = vi.fn();
      const timeoutHandler = vi.fn();
      
      manager.register('NOT_FOUND', notFoundHandler);
      manager.register('TIMEOUT', timeoutHandler);
      
      // 包含多个关键词,应该匹配第一个
      const error = new Error('Route not found due to timeout');
      manager.handle(error);
      
      expect(notFoundHandler).toHaveBeenCalled();
      expect(timeoutHandler).not.toHaveBeenCalled();
    });

    it('应该处理retryCount上下文', () => {
      const handler = vi.fn();
      manager.register('LOAD_FAILED', handler);
      
      const error = new Error('Load failed');
      const context: RouteErrorContext = {
        routeId: 'test',
        retryCount: 2
      };
      
      manager.handle(error, context);
      
      expect(handler).toHaveBeenCalledWith(error, context);
    });
  });

  // ================================================================
  // 处理器链
  // ================================================================

  describe('处理器链', () => {
    it('应该只执行匹配的处理器', () => {
      const notFoundHandler = vi.fn();
      const timeoutHandler = vi.fn();
      
      manager.register('NOT_FOUND', notFoundHandler);
      manager.register('TIMEOUT', timeoutHandler);
      
      const error = new Error('Not found');
      manager.handle(error);
      
      expect(notFoundHandler).toHaveBeenCalled();
      expect(timeoutHandler).not.toHaveBeenCalled();
    });

    it('应该支持处理器内部调用其他处理器', () => {
      const innerHandler = vi.fn();
      const outerHandler: RouteErrorHandler = (error, context) => {
        innerHandler(error, context);
      };
      
      manager.register('NOT_FOUND', outerHandler);
      
      const error = new Error('Not found');
      manager.handle(error);
      
      expect(innerHandler).toHaveBeenCalled();
    });
  });
});
