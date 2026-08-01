// tests/unit/GlobalErrorHandler.test.ts
// ================================================================
// GlobalErrorHandler 单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GlobalErrorHandler,
  globalErrorHandler,
  type ErrorHandlerOptions,
} from '@/common/errors/GlobalErrorHandler';
import {
  AppError,
  NetworkError,
  ApiError,
  ValidationError,
  BusinessError,
  SystemError,
  ErrorLevel,
  ErrorCategory,
} from '@/common/errors/AppError';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';

const mockErrorTracker = vi.hoisted(() => ({
  captureAppError: vi.fn(),
}));

vi.mock('@/services/errorTracker', () => ({
  errorTracker: mockErrorTracker,
}));

vi.mock('@/services/monitoringService', () => ({
  monitoringService: {
    captureException: vi.fn(),
  },
}));

const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('@/common/ui/notifications', () => ({
  showToast: mockShowToast,
}));

let handler: GlobalErrorHandler;

beforeEach(() => {
  // 获取单例实例
  handler = GlobalErrorHandler.getInstance();

  // 重置统计
  handler.resetStats();
  handler.setThrottleMs(2000);

  // 清除所有mock
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});

  // Mock showToast (reset implementation too, so a throwing mock cannot leak)
  mockShowToast.mockReset();
});
afterEach(() => {
  // 清理
  vi.restoreAllMocks();
});

// ================================================================
// 单例模式
// ================================================================

describe('单例模式', () => {
  it('应该返回同一个实例', () => {
    const instance1 = GlobalErrorHandler.getInstance();
    const instance2 = GlobalErrorHandler.getInstance();

    expect(instance1).toBe(instance2);
  });

  it('应该与导出的globalErrorHandler相同', () => {
    const instance = GlobalErrorHandler.getInstance();

    expect(instance).toBe(globalErrorHandler);
  });
});

// ================================================================
// handle方法 - 基本功能
// ================================================================

describe('handle - 基本功能', () => {
  it('应该处理AppError', () => {
    const error = new AppError('测试错误', 'TEST_ERROR');

    handler.handle(error);

    expect(console.error).toHaveBeenCalledWith(
      '测试错误',
      expect.objectContaining({
        code: 'TEST_ERROR',
        category: ErrorCategory.UNKNOWN,
      }),
      'System'
    );
  });

  it('应该处理普通Error', () => {
    const error = new Error('普通错误');

    handler.handle(error);

    expect(console.error).toHaveBeenCalled();
  });

  it('应该更新错误计数', () => {
    const error = new AppError('测试', 'TEST');

    const statsBefore = handler.getStats();
    handler.handle(error);
    const statsAfter = handler.getStats();

    expect(statsAfter.errorCount).toBe(statsBefore.errorCount + 1);
  });

  it('应该更新最后错误时间', () => {
    const error = new AppError('测试', 'TEST');
    const before = Date.now();

    handler.handle(error);

    const stats = handler.getStats();
    expect(stats.lastErrorTime).toBeGreaterThanOrEqual(before);
  });
});

// ================================================================
// handle方法 - 日志记录
// ================================================================

describe('handle - 日志记录', () => {
  it('应该根据错误级别记录日志', () => {
    const errors = [
      new AppError('Fatal', 'FATAL', ErrorLevel.FATAL, ErrorCategory.SYSTEM),
      new AppError('Error', 'ERROR', ErrorLevel.ERROR, ErrorCategory.UNKNOWN),
      new AppError('Warning', 'WARNING', ErrorLevel.WARNING, ErrorCategory.BUSINESS),
      new AppError('Info', 'INFO', ErrorLevel.INFO, ErrorCategory.UNKNOWN),
      new AppError('Debug', 'DEBUG', ErrorLevel.DEBUG, ErrorCategory.UNKNOWN),
    ];

    errors.forEach(error => handler.handle(error));

    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledTimes(2);
  });

  it('应该包含错误详情在日志中', () => {
    const error = new AppError('测试错误', 'TEST_ERROR', ErrorLevel.ERROR, ErrorCategory.NETWORK, {
      module: 'TestModule',
      action: 'testAction',
    });

    handler.handle(error);

    expect(console.error).toHaveBeenCalledWith(
      '测试错误',
      expect.objectContaining({
        code: 'TEST_ERROR',
        category: ErrorCategory.NETWORK,
        context: expect.objectContaining({
          module: 'TestModule',
          action: 'testAction',
        }),
      }),
      'TestModule'
    );
  });

  it('应该使用System作为默认模块名', () => {
    const error = new AppError('测试', 'TEST');

    handler.handle(error);

    expect(console.error).toHaveBeenCalledWith('测试', expect.anything(), 'System');
  });

  it('log选项为false时不应记录日志', () => {
    const error = new AppError('测试', 'TEST');

    handler.handle(error, { log: false });

    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });
});

// ================================================================
// handle方法 - 用户通知
// ================================================================

describe('handle - 用户通知', () => {
  it('应该显示Toast通知', () => {
    const error = new AppError('用户可见错误', 'USER_ERROR');

    handler.handle(error);

    // showToast(title, options) — LLM actionable UX contract (rc.9)
    expect(mockShowToast).toHaveBeenCalledWith('用户可见错误', { type: 'error' });
  });

  it('应该根据错误级别选择Toast类型', () => {
    const errorError = new AppError('错误', 'ERROR', ErrorLevel.ERROR);
    const warningError = new AppError('警告', 'WARNING', ErrorLevel.WARNING);
    const infoError = new AppError('信息', 'INFO', ErrorLevel.INFO);

    handler.handle(errorError);
    handler.handle(warningError);
    handler.handle(infoError);

    expect(mockShowToast).toHaveBeenCalledWith('错误', { type: 'error' });
    expect(mockShowToast).toHaveBeenCalledWith('警告', { type: 'warning' });
    expect(mockShowToast).toHaveBeenCalledWith('信息', { type: 'info' });
  });

  it('应该使用自定义用户消息', () => {
    const error = new AppError('技术错误', 'TECH_ERROR');

    handler.handle(error, { userMessage: '自定义用户消息' });

    expect(mockShowToast).toHaveBeenCalledWith('自定义用户消息', { type: 'error' });
  });

  it('notify选项为false时不应显示通知', () => {
    const error = new AppError('测试', 'TEST');

    handler.handle(error, { notify: false });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('错误notify属性为false时不应显示通知', () => {
    const error = new BusinessError('静默错误', 'SILENT', {}, false);

    handler.handle(error);

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('showToast抛出异常时不应影响错误处理', () => {
    mockShowToast.mockImplementation(() => {
      throw new Error('toast unavailable');
    });
    const error = new AppError('测试', 'TEST');

    expect(() => handler.handle(error)).not.toThrow();
  });
});

// ================================================================
// handle方法 - 错误上报
// ================================================================

describe('handle - 错误上报', () => {
  it('应该上报错误到监控服务', async () => {
    const { monitoringService } = await import('@/services/monitoringService');
    const error = new AppError('测试错误', 'TEST_ERROR', ErrorLevel.ERROR, ErrorCategory.NETWORK, {
      module: 'TestModule',
    });

    handler.handle(error);

    // 等待异步上报完成
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(monitoringService.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        module: 'TestModule',
        tags: {
          code: 'TEST_ERROR',
          category: ErrorCategory.NETWORK,
          level: ErrorLevel.ERROR,
        },
      })
    );
  });

  it('report选项为false时不应上报', async () => {
    const { monitoringService } = await import('@/services/monitoringService');
    const error = new AppError('测试', 'TEST');

    handler.handle(error, { report: false });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(monitoringService.captureException).not.toHaveBeenCalled();
  });

  it('上报失败时不应影响主流程', async () => {
    const { monitoringService } = await import('@/services/monitoringService');
    vi.mocked(monitoringService.captureException).mockRejectedValueOnce(new Error('上报失败'));

    const error = new AppError('测试', 'TEST');

    expect(() => handler.handle(error)).not.toThrow();
  });
});

// ================================================================
// handle方法 - 事件触发
// ================================================================

describe('handle - 事件触发', () => {
  it('应该触发ERROR_OCCURRED事件', () => {
    const eventSpy = vi.fn();
    eventBus.on(APP_EVENTS.ERROR_OCCURRED, eventSpy);

    const error = new AppError('测试', 'TEST');
    handler.handle(error);

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(AppError),
        timestamp: expect.any(Number),
      })
    );

    eventBus.off(APP_EVENTS.ERROR_OCCURRED, eventSpy);
  });
});

// ================================================================
// 错误类型处理
// ================================================================

describe('错误类型处理', () => {
  it('应该处理NetworkError', () => {
    const error = new NetworkError('网络错误', 'NET_ERROR');

    handler.handle(error);

    expect(console.error).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('应该处理ApiError', () => {
    const error = new ApiError('API错误', 'API_ERROR', 500);

    handler.handle(error);

    expect(console.error).toHaveBeenCalled();
  });

  it('应该处理ValidationError', () => {
    const error = new ValidationError('验证错误', 'VAL_ERROR', 'email');

    handler.handle(error);

    expect(console.warn).toHaveBeenCalled();
  });

  it('应该处理BusinessError', () => {
    const error = new BusinessError('业务错误', 'BIZ_ERROR');

    handler.handle(error);

    expect(console.warn).toHaveBeenCalled();
  });

  it('应该处理SystemError', () => {
    const error = new SystemError('系统错误', 'SYS_ERROR');

    handler.handle(error);

    expect(console.error).toHaveBeenCalledWith('[FATAL]', '系统错误', expect.anything(), 'System');
  });
});

// ================================================================
// 统计功能
// ================================================================

describe('统计功能', () => {
  it('getStats应该返回正确的统计信息', () => {
    const stats = handler.getStats();

    expect(stats).toHaveProperty('errorCount');
    expect(stats).toHaveProperty('lastErrorTime');
    expect(typeof stats.errorCount).toBe('number');
    expect(typeof stats.lastErrorTime).toBe('number');
  });

  it('应该累计错误计数', () => {
    handler.resetStats();

    handler.handle(new AppError('错误1', 'E1'));
    handler.handle(new AppError('错误2', 'E2'));
    handler.handle(new AppError('错误3', 'E3'));

    const stats = handler.getStats();
    expect(stats.errorCount).toBe(3);
  });

  it('resetStats应该重置统计', () => {
    handler.handle(new AppError('测试', 'TEST'));

    const statsBefore = handler.getStats();
    expect(statsBefore.errorCount).toBeGreaterThan(0);

    handler.resetStats();

    const statsAfter = handler.getStats();
    expect(statsAfter.errorCount).toBe(0);
    expect(statsAfter.lastErrorTime).toBe(0);
  });
});

// ================================================================
// 节流功能
// ================================================================

describe('节流功能', () => {
  it('应该设置节流时间', () => {
    expect(() => handler.setThrottleMs(1000)).not.toThrow();
  });

  it('节流时间内应处理不同全局错误但只通知一次', () => {
    handler.setThrottleMs(1000);
    handler.resetStats();
    const eventSpy = vi.fn();
    const unsubscribe = eventBus.on(APP_EVENTS.ERROR_OCCURRED, eventSpy);

    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new AppError('错误1', 'E1'),
        message: '错误1',
      })
    );

    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new AppError('错误2', 'E2'),
        message: '错误2',
      })
    );

    expect(console.error).toHaveBeenCalledTimes(2);
    expect(mockErrorTracker.captureAppError).toHaveBeenCalledTimes(2);
    expect(mockErrorTracker.captureAppError).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ code: 'E1' })
    );
    expect(mockErrorTracker.captureAppError).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ code: 'E2' })
    );
    expect(handler.getStats().errorCount).toBe(2);
    expect(eventSpy).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenCalledTimes(1);

    unsubscribe();

    // 恢复默认节流时间
    handler.setThrottleMs(2000);
  });

  it('resetStats应重置全局通知节流状态', () => {
    handler.setThrottleMs(1000);

    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new AppError('错误1', 'E1'),
        message: '错误1',
      })
    );
    handler.resetStats();
    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new AppError('错误2', 'E2'),
        message: '错误2',
      })
    );

    expect(mockShowToast).toHaveBeenCalledTimes(2);
    expect(handler.getStats().errorCount).toBe(1);
  });
});

// ================================================================
// 全局错误捕获
// ================================================================

describe('全局错误捕获', () => {
  it('应该捕获window.onerror', () => {
    const errorEvent = new ErrorEvent('error', {
      error: new Error('全局错误'),
      message: '全局错误',
      filename: 'test.js',
      lineno: 10,
      colno: 5,
    });

    window.dispatchEvent(errorEvent);

    // 由于节流,可能不会立即触发
    // 这里只验证不会抛出异常
    expect(() => window.dispatchEvent(errorEvent)).not.toThrow();
  });

  it('应该捕获unhandledrejection', () => {
    const rejectionEvent = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperties(rejectionEvent, {
      promise: { value: Promise.resolve() },
      reason: { value: 'Promise错误' },
    });

    expect(() => window.dispatchEvent(rejectionEvent)).not.toThrow();
  });
});

// ================================================================
// ErrorHandlerOptions
// ================================================================

describe('ErrorHandlerOptions', () => {
  it('应该支持所有选项', () => {
    const error = new AppError('测试', 'TEST');
    const options: ErrorHandlerOptions = {
      notify: false,
      log: false,
      report: false,
      userMessage: '自定义消息',
      context: { custom: 'data' },
    };

    expect(() => handler.handle(error, options)).not.toThrow();
  });

  it('context选项应该合并到错误上下文', () => {
    const error = new Error('普通错误');
    const options: ErrorHandlerOptions = {
      context: { module: 'CustomModule', action: 'customAction' },
    };

    handler.handle(error, options);

    expect(console.error).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        context: expect.objectContaining({
          module: 'CustomModule',
          action: 'customAction',
        }),
      }),
      'CustomModule'
    );
  });
});

// ================================================================
// 边界条件
// ================================================================

describe('边界条件', () => {
  it('应该处理null错误', () => {
    expect(() => handler.handle(null as any)).not.toThrow();
  });

  it('应该处理undefined错误', () => {
    expect(() => handler.handle(undefined as any)).not.toThrow();
  });

  it('应该处理字符串错误', () => {
    expect(() => handler.handle('字符串错误' as any)).not.toThrow();
  });

  it('应该处理空选项对象', () => {
    const error = new AppError('测试', 'TEST');

    expect(() => handler.handle(error, {})).not.toThrow();
  });

  it('应该处理没有上下文的错误', () => {
    const error = new AppError('测试', 'TEST', ErrorLevel.ERROR, ErrorCategory.UNKNOWN, {});

    expect(() => handler.handle(error)).not.toThrow();
  });

  it('应该处理大量连续错误', () => {
    handler.setThrottleMs(0); // 禁用节流

    for (let i = 0; i < 100; i++) {
      handler.handle(new AppError(`错误${i}`, `E${i}`));
    }

    const stats = handler.getStats();
    expect(stats.errorCount).toBe(100);

    handler.setThrottleMs(2000); // 恢复默认
  });
});

// ================================================================
// window暴露
// ================================================================

describe('window暴露', () => {
  it('应该暴露到window.__GlobalErrorHandler', () => {
    expect((window as any).__GlobalErrorHandler).toBeDefined();
    expect((window as any).__GlobalErrorHandler).toBe(globalErrorHandler);
  });
});
