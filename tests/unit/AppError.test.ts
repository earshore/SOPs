// tests/unit/AppError.test.ts
// ================================================================
// AppError 单元测试
// ================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AppError,
  NetworkError,
  ApiError,
  ValidationError,
  BusinessError,
  SystemError,
  ErrorLevel,
  ErrorCategory,
  isAppError,
  toAppError,
  type ErrorContext
} from '@/common/errors/AppError';

  // ================================================================
  // AppError基类
  // ================================================================

  describe('AppError基类', () => {
    it('应该创建基本错误实例', () => {
      const error = new AppError(
        '测试错误',
        'TEST_ERROR',
        ErrorLevel.ERROR,
        ErrorCategory.UNKNOWN
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('AppError');
      expect(error.message).toBe('测试错误');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.level).toBe(ErrorLevel.ERROR);
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
    });

    it('应该使用默认参数', () => {
      const error = new AppError('测试错误', 'TEST_ERROR');

      expect(error.level).toBe(ErrorLevel.ERROR);
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.context).toEqual({});
      expect(error.originalError).toBeUndefined();
      expect(error.notify).toBe(true);
    });

    it('应该包含时间戳', () => {
      const before = Date.now();
      const error = new AppError('测试错误', 'TEST_ERROR');
      const after = Date.now();

      expect(error.timestamp).toBeGreaterThanOrEqual(before);
      expect(error.timestamp).toBeLessThanOrEqual(after);
    });

    it('应该保存错误上下文', () => {
      const context: ErrorContext = {
        module: 'TestModule',
        action: 'testAction',
        userId: 'user123'
      };

      const error = new AppError(
        '测试错误',
        'TEST_ERROR',
        ErrorLevel.ERROR,
        ErrorCategory.UNKNOWN,
        context
      );

      expect(error.context).toEqual(context);
      expect(error.context.module).toBe('TestModule');
      expect(error.context.action).toBe('testAction');
      expect(error.context.userId).toBe('user123');
    });

    it('应该保存原始错误', () => {
      const originalError = new Error('原始错误');
      const error = new AppError(
        '包装错误',
        'WRAPPED_ERROR',
        ErrorLevel.ERROR,
        ErrorCategory.UNKNOWN,
        {},
        originalError
      );

      expect(error.originalError).toBe(originalError);
      expect(error.originalError?.message).toBe('原始错误');
    });

    it('应该支持对象式构造参数', () => {
      const originalError = new Error('原始错误');
      const context = { module: 'TestModule' };
      const error = new AppError('对象参数错误', 'OPTIONS_ERROR', {
        level: ErrorLevel.INFO,
        category: ErrorCategory.SYSTEM,
        context,
        originalError,
        notify: false
      });

      expect(error.level).toBe(ErrorLevel.INFO);
      expect(error.category).toBe(ErrorCategory.SYSTEM);
      expect(error.context).toBe(context);
      expect(error.originalError).toBe(originalError);
      expect(error.notify).toBe(false);
    });

    it('应该捕获堆栈跟踪', () => {
      const error = new AppError('测试错误', 'TEST_ERROR');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });

    it('应该保持正确的原型链', () => {
      const error = new AppError('测试错误', 'TEST_ERROR');

      expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  // ================================================================
  // toJSON方法
  // ================================================================

  describe('toJSON', () => {
    it('应该转换为JSON对象', () => {
      const error = new AppError(
        '测试错误',
        'TEST_ERROR',
        ErrorLevel.ERROR,
        ErrorCategory.UNKNOWN,
        { module: 'Test' }
      );

      const json = error.toJSON();

      expect(json.name).toBe('AppError');
      expect(json.message).toBe('测试错误');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.level).toBe(ErrorLevel.ERROR);
      expect(json.category).toBe(ErrorCategory.UNKNOWN);
      expect(json.context).toEqual({ module: 'Test' });
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });

    it('应该包含原始错误信息', () => {
      const originalError = new Error('原始错误');
      const error = new AppError(
        '包装错误',
        'WRAPPED_ERROR',
        ErrorLevel.ERROR,
        ErrorCategory.UNKNOWN,
        {},
        originalError
      );

      const json = error.toJSON();

      expect(json.originalError).toBeDefined();
      expect(json.originalError.name).toBe('Error');
      expect(json.originalError.message).toBe('原始错误');
      expect(json.originalError).not.toHaveProperty('stack');
    });

    it('原始错误为空时应该返回undefined', () => {
      const error = new AppError('测试错误', 'TEST_ERROR');
      const json = error.toJSON();

      expect(json.originalError).toBeUndefined();
    });
  });

  // ================================================================
  // toUserMessage方法
  // ================================================================

  describe('toUserMessage', () => {
    it('应该返回用户友好消息', () => {
      const error = new AppError('测试错误消息', 'TEST_ERROR');

      expect(error.toUserMessage()).toBe('测试错误消息');
    });
  });

  // ================================================================
  // NetworkError
  // ================================================================

  describe('NetworkError', () => {
    it('应该创建网络错误', () => {
      const error = new NetworkError('网络超时', 'NET_TIMEOUT');

      expect(error).toBeInstanceOf(NetworkError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('网络超时');
      expect(error.code).toBe('NET_TIMEOUT');
      expect(error.level).toBe(ErrorLevel.ERROR);
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.notify).toBe(true);
    });

    it('应该包含上下文和原始错误', () => {
      const originalError = new Error('连接失败');
      const context = { url: 'https://api.example.com' };
      const error = new NetworkError(
        '网络请求失败',
        'NET_REQUEST_FAILED',
        context,
        originalError
      );

      expect(error.context).toEqual(context);
      expect(error.originalError).toBe(originalError);
    });
  });

  // ================================================================
  // ApiError
  // ================================================================

  describe('ApiError', () => {
    it('应该创建API错误', () => {
      const error = new ApiError('API密钥无效', 'API_INVALID_KEY', 401);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('ApiError');
      expect(error.message).toBe('API密钥无效');
      expect(error.code).toBe('API_INVALID_KEY');
      expect(error.level).toBe(ErrorLevel.ERROR);
      expect(error.category).toBe(ErrorCategory.API);
      expect(error.statusCode).toBe(401);
    });

    it('应该包含响应数据', () => {
      const response = { error: 'Invalid API key' };
      const error = new ApiError(
        'API错误',
        'API_ERROR',
        400,
        response
      );

      expect(error.response).toEqual(response);
      expect(error.context.response).toEqual(response);
    });

    it('应该在上下文中包含statusCode', () => {
      const error = new ApiError('服务器错误', 'API_SERVER_ERROR', 500);

      expect(error.context.statusCode).toBe(500);
    });

    it('statusCode和response可以为空', () => {
      const error = new ApiError('API错误', 'API_ERROR');

      expect(error.statusCode).toBeUndefined();
      expect(error.response).toBeUndefined();
    });

    it('应该支持对象式API错误参数', () => {
      const originalError = new Error('请求失败');
      const response = { retryAfter: 30 };
      const error = new ApiError('限流', 'API_RATE_LIMIT', {
        statusCode: 429,
        response,
        context: { module: 'LLM' },
        originalError
      });

      expect(error.statusCode).toBe(429);
      expect(error.response).toBe(response);
      expect(error.context).toMatchObject({
        module: 'LLM',
        statusCode: 429,
        response
      });
      expect(error.originalError).toBe(originalError);
    });
  });

  // ================================================================
  // ValidationError
  // ================================================================

  describe('ValidationError', () => {
    it('应该创建验证错误', () => {
      const error = new ValidationError(
        '邮箱格式无效',
        'VAL_INVALID_EMAIL',
        'email',
        'invalid-email'
      );

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('邮箱格式无效');
      expect(error.code).toBe('VAL_INVALID_EMAIL');
      expect(error.level).toBe(ErrorLevel.WARNING);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.field).toBe('email');
      expect(error.value).toBe('invalid-email');
    });

    it('应该在上下文中包含field和value', () => {
      const error = new ValidationError(
        '必填字段',
        'VAL_REQUIRED_FIELD',
        'username',
        ''
      );

      expect(error.context.field).toBe('username');
      expect(error.context.value).toBe('');
    });

    it('field和value可以为空', () => {
      const error = new ValidationError('验证失败', 'VAL_FAILED');

      expect(error.field).toBeUndefined();
      expect(error.value).toBeUndefined();
    });
  });

  // ================================================================
  // BusinessError
  // ================================================================

  describe('BusinessError', () => {
    it('应该创建业务错误', () => {
      const error = new BusinessError('操作失败', 'BIZ_OPERATION_FAILED');

      expect(error).toBeInstanceOf(BusinessError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('BusinessError');
      expect(error.message).toBe('操作失败');
      expect(error.code).toBe('BIZ_OPERATION_FAILED');
      expect(error.level).toBe(ErrorLevel.WARNING);
      expect(error.category).toBe(ErrorCategory.BUSINESS);
      expect(error.notify).toBe(true);
    });

    it('应该支持自定义notify', () => {
      const error = new BusinessError(
        '静默失败',
        'BIZ_SILENT_FAIL',
        {},
        false
      );

      expect(error.notify).toBe(false);
    });

    it('应该包含业务上下文', () => {
      const context = { orderId: '12345', status: 'pending' };
      const error = new BusinessError(
        '订单处理失败',
        'BIZ_ORDER_FAILED',
        context
      );

      expect(error.context).toEqual(context);
    });
  });

  // ================================================================
  // SystemError
  // ================================================================

  describe('SystemError', () => {
    it('应该创建系统错误', () => {
      const error = new SystemError('系统初始化失败', 'SYS_INIT_FAILED');

      expect(error).toBeInstanceOf(SystemError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('SystemError');
      expect(error.message).toBe('系统初始化失败');
      expect(error.code).toBe('SYS_INIT_FAILED');
      expect(error.level).toBe(ErrorLevel.FATAL);
      expect(error.category).toBe(ErrorCategory.SYSTEM);
      expect(error.notify).toBe(true);
    });

    it('应该包含原始错误', () => {
      const originalError = new Error('模块加载失败');
      const error = new SystemError(
        '系统错误',
        'SYS_ERROR',
        {},
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });
  });

  // ================================================================
  // isAppError
  // ================================================================

  describe('isAppError', () => {
    it('应该识别AppError实例', () => {
      const error = new AppError('测试', 'TEST');

      expect(isAppError(error)).toBe(true);
    });

    it('应该识别AppError子类', () => {
      expect(isAppError(new NetworkError('网络错误', 'NET_ERROR'))).toBe(true);
      expect(isAppError(new ApiError('API错误', 'API_ERROR'))).toBe(true);
      expect(isAppError(new ValidationError('验证错误', 'VAL_ERROR'))).toBe(true);
      expect(isAppError(new BusinessError('业务错误', 'BIZ_ERROR'))).toBe(true);
      expect(isAppError(new SystemError('系统错误', 'SYS_ERROR'))).toBe(true);
    });

    it('应该拒绝普通Error', () => {
      const error = new Error('普通错误');

      expect(isAppError(error)).toBe(false);
    });

    it('应该拒绝非Error对象', () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError('string')).toBe(false);
      expect(isAppError(123)).toBe(false);
      expect(isAppError({})).toBe(false);
    });
  });

  // ================================================================
  // toAppError
  // ================================================================

  describe('toAppError', () => {
    it('应该保持AppError不变', () => {
      const original = new AppError('测试', 'TEST');
      const converted = toAppError(original);

      expect(converted).toBe(original);
    });

    it('应该转换普通Error', () => {
      const original = new Error('普通错误');
      const converted = toAppError(original);

      expect(converted).toBeInstanceOf(AppError);
      expect(converted.message).toBe('普通错误');
      expect(converted.code).toBe('UNKNOWN_ERROR');
      expect(converted.level).toBe(ErrorLevel.ERROR);
      expect(converted.category).toBe(ErrorCategory.UNKNOWN);
      expect(converted.originalError).toBe(original);
    });

    it('应该转换字符串错误', () => {
      const converted = toAppError('字符串错误');

      expect(converted).toBeInstanceOf(AppError);
      expect(converted.message).toBe('字符串错误');
      expect(converted.code).toBe('UNKNOWN_ERROR');
    });

    it('应该转换任意值', () => {
      const converted = toAppError(123);

      expect(converted).toBeInstanceOf(AppError);
      expect(converted.message).toBe('123');
      expect(converted.code).toBe('UNKNOWN_ERROR');
    });

    it('应该包含提供的上下文', () => {
      const context = { module: 'Test', action: 'convert' };
      const converted = toAppError(new Error('测试'), context);

      expect(converted.context).toEqual(context);
    });

    it('应该处理null和undefined', () => {
      const nullConverted = toAppError(null);
      expect(nullConverted).toBeInstanceOf(AppError);
      expect(nullConverted.message).toBe('null');

      const undefinedConverted = toAppError(undefined);
      expect(undefinedConverted).toBeInstanceOf(AppError);
      expect(undefinedConverted.message).toBe('undefined');
    });
  });

  // ================================================================
  // ErrorLevel枚举
  // ================================================================

  describe('ErrorLevel枚举', () => {
    it('应该定义所有错误级别', () => {
      expect(ErrorLevel.DEBUG).toBe('debug');
      expect(ErrorLevel.INFO).toBe('info');
      expect(ErrorLevel.WARNING).toBe('warning');
      expect(ErrorLevel.ERROR).toBe('error');
      expect(ErrorLevel.FATAL).toBe('fatal');
    });
  });

  // ================================================================
  // ErrorCategory枚举
  // ================================================================

  describe('ErrorCategory枚举', () => {
    it('应该定义所有错误类别', () => {
      expect(ErrorCategory.NETWORK).toBe('network');
      expect(ErrorCategory.API).toBe('api');
      expect(ErrorCategory.VALIDATION).toBe('validation');
      expect(ErrorCategory.BUSINESS).toBe('business');
      expect(ErrorCategory.SYSTEM).toBe('system');
      expect(ErrorCategory.UNKNOWN).toBe('unknown');
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('应该处理空消息', () => {
      const error = new AppError('', 'EMPTY_MESSAGE');

      expect(error.message).toBe('');
    });

    it('应该处理空错误码', () => {
      const error = new AppError('测试', '');

      expect(error.code).toBe('');
    });

    it('应该处理大量上下文数据', () => {
      const largeContext: ErrorContext = {};
      for (let i = 0; i < 100; i++) {
        largeContext[`key${i}`] = `value${i}`;
      }

      const error = new AppError('测试', 'TEST', ErrorLevel.ERROR, ErrorCategory.UNKNOWN, largeContext);

      expect(Object.keys(error.context).length).toBe(100);
    });

    it('应该处理嵌套的原始错误', () => {
      const level1 = new Error('Level 1');
      const level2 = new AppError('Level 2', 'L2', ErrorLevel.ERROR, ErrorCategory.UNKNOWN, {}, level1);
      const level3 = new AppError('Level 3', 'L3', ErrorLevel.ERROR, ErrorCategory.UNKNOWN, {}, level2);

      expect(level3.originalError).toBe(level2);
      expect((level3.originalError as AppError).originalError).toBe(level1);
    });
  });

  // ================================================================
  // 错误序列化
  // ================================================================

  describe('错误序列化', () => {
    it('应该能够JSON序列化', () => {
      const error = new AppError('测试', 'TEST', ErrorLevel.ERROR, ErrorCategory.UNKNOWN, { key: 'value' });
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('AppError');
      expect(parsed.message).toBe('测试');
      expect(parsed.code).toBe('TEST');
    });

    it('toJSON应该返回可序列化对象', () => {
      const error = new AppError('测试', 'TEST');
      const json = error.toJSON();

      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });
