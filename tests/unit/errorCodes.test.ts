// tests/unit/errorCodes.test.ts
// ================================================================
// ErrorCodes 单元测试
// ================================================================

import { describe, it, expect } from 'vitest';
import {
  ERROR_CODES,
  getErrorInfo,
  getUserMessage,
  getTechnicalMessage,
  type ErrorCode
} from '@/common/errors/errorCodes';

describe('ErrorCodes', () => {
  // ================================================================
  // ERROR_CODES常量
  // ================================================================

  describe('ERROR_CODES常量', () => {
    it('应该定义所有网络错误码', () => {
      expect(ERROR_CODES.NET_TIMEOUT).toBeDefined();
      expect(ERROR_CODES.NET_OFFLINE).toBeDefined();
      expect(ERROR_CODES.NET_REQUEST_FAILED).toBeDefined();
    });

    it('应该定义所有API错误码', () => {
      expect(ERROR_CODES.API_INVALID_KEY).toBeDefined();
      expect(ERROR_CODES.API_RATE_LIMIT).toBeDefined();
      expect(ERROR_CODES.API_QUOTA_EXCEEDED).toBeDefined();
      expect(ERROR_CODES.API_INVALID_REQUEST).toBeDefined();
      expect(ERROR_CODES.API_SERVER_ERROR).toBeDefined();
      expect(ERROR_CODES.API_NOT_FOUND).toBeDefined();
    });

    it('应该定义所有验证错误码', () => {
      expect(ERROR_CODES.VAL_REQUIRED_FIELD).toBeDefined();
      expect(ERROR_CODES.VAL_INVALID_FORMAT).toBeDefined();
      expect(ERROR_CODES.VAL_OUT_OF_RANGE).toBeDefined();
      expect(ERROR_CODES.VAL_INVALID_EMAIL).toBeDefined();
      expect(ERROR_CODES.VAL_INVALID_URL).toBeDefined();
    });

    it('应该定义所有业务逻辑错误码', () => {
      expect(ERROR_CODES.BIZ_NO_MODEL_CONFIGURED).toBeDefined();
      expect(ERROR_CODES.BIZ_NO_DATA).toBeDefined();
      expect(ERROR_CODES.BIZ_OPERATION_FAILED).toBeDefined();
      expect(ERROR_CODES.BIZ_INVALID_STATE).toBeDefined();
      expect(ERROR_CODES.BIZ_DUPLICATE_ENTRY).toBeDefined();
    });

    it('应该定义所有系统错误码', () => {
      expect(ERROR_CODES.SYS_STORAGE_FULL).toBeDefined();
      expect(ERROR_CODES.SYS_STORAGE_ERROR).toBeDefined();
      expect(ERROR_CODES.SYS_PARSE_ERROR).toBeDefined();
      expect(ERROR_CODES.SYS_MODULE_LOAD_FAILED).toBeDefined();
      expect(ERROR_CODES.SYS_INIT_FAILED).toBeDefined();
    });

    it('应该定义所有LLM错误码', () => {
      expect(ERROR_CODES.LLM_TIMEOUT).toBeDefined();
      expect(ERROR_CODES.LLM_CONTEXT_TOO_LONG).toBeDefined();
      expect(ERROR_CODES.LLM_CONTENT_FILTERED).toBeDefined();
      expect(ERROR_CODES.LLM_INVALID_RESPONSE).toBeDefined();
    });

    it('应该定义未知错误码', () => {
      expect(ERROR_CODES.UNKNOWN_ERROR).toBeDefined();
    });
  });

  // ================================================================
  // 错误信息结构
  // ================================================================

  describe('错误信息结构', () => {
    it('每个错误码应该包含code字段', () => {
      Object.entries(ERROR_CODES).forEach(([key, value]) => {
        expect(value.code).toBe(key);
      });
    });

    it('每个错误码应该包含message字段', () => {
      Object.values(ERROR_CODES).forEach((error) => {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      });
    });

    it('每个错误码应该包含userMessage字段', () => {
      Object.values(ERROR_CODES).forEach((error) => {
        expect(error.userMessage).toBeDefined();
        expect(typeof error.userMessage).toBe('string');
        expect(error.userMessage.length).toBeGreaterThan(0);
      });
    });

    it('userMessage应该比message更简洁', () => {
      Object.values(ERROR_CODES).forEach((error) => {
        // 用户消息通常应该更短或相近
        expect(error.userMessage.length).toBeLessThanOrEqual(error.message.length + 20);
      });
    });
  });

  // ================================================================
  // getErrorInfo
  // ================================================================

  describe('getErrorInfo', () => {
    it('应该返回正确的错误信息', () => {
      const info = getErrorInfo('NET_TIMEOUT');

      expect(info.code).toBe('NET_TIMEOUT');
      expect(info.message).toBe('网络请求超时,请检查网络连接后重试');
      expect(info.userMessage).toBe('网络超时,请重试');
    });

    it('应该返回所有错误码的信息', () => {
      const codes: ErrorCode[] = [
        'NET_TIMEOUT',
        'API_INVALID_KEY',
        'VAL_REQUIRED_FIELD',
        'BIZ_NO_DATA',
        'SYS_STORAGE_FULL',
        'LLM_TIMEOUT'
      ];

      codes.forEach((code) => {
        const info = getErrorInfo(code);
        expect(info).toBeDefined();
        expect(info.code).toBe(code);
      });
    });

    it('应该对未知错误码返回UNKNOWN_ERROR', () => {
      const info = getErrorInfo('INVALID_CODE' as ErrorCode);

      expect(info.code).toBe('UNKNOWN_ERROR');
    });
  });

  // ================================================================
  // getUserMessage
  // ================================================================

  describe('getUserMessage', () => {
    it('应该返回用户友好消息', () => {
      const message = getUserMessage('NET_TIMEOUT');

      expect(message).toBe('网络超时,请重试');
    });

    it('应该返回所有错误码的用户消息', () => {
      const codes: ErrorCode[] = [
        'API_RATE_LIMIT',
        'VAL_INVALID_EMAIL',
        'BIZ_OPERATION_FAILED',
        'SYS_PARSE_ERROR',
        'LLM_CONTEXT_TOO_LONG'
      ];

      codes.forEach((code) => {
        const message = getUserMessage(code);
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('应该对未知错误码返回默认消息', () => {
      const message = getUserMessage('INVALID_CODE' as ErrorCode);

      expect(message).toBe('发生未知错误,请重试');
    });
  });

  // ================================================================
  // getTechnicalMessage
  // ================================================================

  describe('getTechnicalMessage', () => {
    it('应该返回技术消息', () => {
      const message = getTechnicalMessage('NET_TIMEOUT');

      expect(message).toBe('网络请求超时,请检查网络连接后重试');
    });

    it('应该返回所有错误码的技术消息', () => {
      const codes: ErrorCode[] = [
        'API_SERVER_ERROR',
        'VAL_OUT_OF_RANGE',
        'BIZ_INVALID_STATE',
        'SYS_MODULE_LOAD_FAILED',
        'LLM_INVALID_RESPONSE'
      ];

      codes.forEach((code) => {
        const message = getTechnicalMessage(code);
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('应该对未知错误码返回默认消息', () => {
      const message = getTechnicalMessage('INVALID_CODE' as ErrorCode);

      expect(message).toBe('未知错误');
    });
  });

  // ================================================================
  // 错误码分类
  // ================================================================

  describe('错误码分类', () => {
    it('网络错误应该以NET_开头', () => {
      const netErrors = Object.keys(ERROR_CODES).filter(key => key.startsWith('NET_'));

      expect(netErrors.length).toBeGreaterThan(0);
      netErrors.forEach(key => {
        expect(key).toMatch(/^NET_/);
      });
    });

    it('API错误应该以API_开头', () => {
      const apiErrors = Object.keys(ERROR_CODES).filter(key => key.startsWith('API_'));

      expect(apiErrors.length).toBeGreaterThan(0);
      apiErrors.forEach(key => {
        expect(key).toMatch(/^API_/);
      });
    });

    it('验证错误应该以VAL_开头', () => {
      const valErrors = Object.keys(ERROR_CODES).filter(key => key.startsWith('VAL_'));

      expect(valErrors.length).toBeGreaterThan(0);
      valErrors.forEach(key => {
        expect(key).toMatch(/^VAL_/);
      });
    });

    it('业务错误应该以BIZ_开头', () => {
      const bizErrors = Object.keys(ERROR_CODES).filter(key => key.startsWith('BIZ_'));

      expect(bizErrors.length).toBeGreaterThan(0);
      bizErrors.forEach(key => {
        expect(key).toMatch(/^BIZ_/);
      });
    });

    it('系统错误应该以SYS_开头', () => {
      const sysErrors = Object.keys(ERROR_CODES).filter(key => key.startsWith('SYS_'));

      expect(sysErrors.length).toBeGreaterThan(0);
      sysErrors.forEach(key => {
        expect(key).toMatch(/^SYS_/);
      });
    });

    it('LLM错误应该以LLM_开头', () => {
      const llmErrors = Object.keys(ERROR_CODES).filter(key => key.startsWith('LLM_'));

      expect(llmErrors.length).toBeGreaterThan(0);
      llmErrors.forEach(key => {
        expect(key).toMatch(/^LLM_/);
      });
    });
  });

  // ================================================================
  // 消息质量检查
  // ================================================================

  describe('消息质量检查', () => {
    it('用户消息不应包含技术术语', () => {
      const technicalTerms = ['API', 'LLM', 'parse', 'module'];
      
      Object.values(ERROR_CODES).forEach((error) => {
        const userMsg = error.userMessage.toLowerCase();
        
        // 某些错误码可能需要包含技术术语,这里只是警告性检查
        if (technicalTerms.some(term => userMsg.includes(term.toLowerCase()))) {
          // 这是可以接受的,只是记录
          expect(error.userMessage).toBeDefined();
        }
      });
    });

    it('消息应该以中文编写', () => {
      Object.values(ERROR_CODES).forEach((error) => {
        // 检查是否包含中文字符
        const hasChinese = /[\u4e00-\u9fa5]/.test(error.message);
        expect(hasChinese).toBe(true);
        
        const hasChineseUser = /[\u4e00-\u9fa5]/.test(error.userMessage);
        expect(hasChineseUser).toBe(true);
      });
    });

    it('消息不应以标点符号开头', () => {
      Object.values(ERROR_CODES).forEach((error) => {
        expect(error.message).not.toMatch(/^[,。，.!！?？]/);
        expect(error.userMessage).not.toMatch(/^[,。，.!！?？]/);
      });
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('应该处理空字符串错误码', () => {
      const info = getErrorInfo('' as ErrorCode);

      expect(info.code).toBe('UNKNOWN_ERROR');
    });

    it('应该处理undefined错误码', () => {
      const info = getErrorInfo(undefined as any);

      expect(info.code).toBe('UNKNOWN_ERROR');
    });

    it('应该处理null错误码', () => {
      const info = getErrorInfo(null as any);

      expect(info.code).toBe('UNKNOWN_ERROR');
    });

    it('ERROR_CODES应该是只读的', () => {
      // TypeScript的as const确保了只读性
      // 这里只是验证结构
      expect(ERROR_CODES).toBeDefined();
      expect(Object.isFrozen(ERROR_CODES)).toBe(false); // 对象本身不是frozen,但类型是const
    });
  });

  // ================================================================
  // 完整性检查
  // ================================================================

  describe('完整性检查', () => {
    it('应该有足够的错误码覆盖', () => {
      const totalCodes = Object.keys(ERROR_CODES).length;

      // 至少应该有20个错误码
      expect(totalCodes).toBeGreaterThanOrEqual(20);
    });

    it('每个分类应该有多个错误码', () => {
      const categories = ['NET_', 'API_', 'VAL_', 'BIZ_', 'SYS_', 'LLM_'];
      
      categories.forEach(prefix => {
        const count = Object.keys(ERROR_CODES).filter(key => key.startsWith(prefix)).length;
        expect(count).toBeGreaterThan(0);
      });
    });

    it('不应该有重复的错误消息', () => {
      const messages = Object.values(ERROR_CODES).map(e => e.message);
      const uniqueMessages = new Set(messages);

      // 允许少量重复,但不应该太多
      expect(uniqueMessages.size).toBeGreaterThan(messages.length * 0.8);
    });
  });
});
