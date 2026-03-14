// tests/unit/validation.test.ts
// ================================================================
// Validation工具函数单元测试
// ================================================================

import { describe, it, expect } from 'vitest';
import {
  validateString,
  validateEmail,
  validateUrl,
  validateApiKey,
  validateJson,
  validateNumber,
  validateObject,
  isAllValid,
  getFirstError,
  sanitizeFilename,
  sanitizePath,
  ValidationUtils
} from '@/common/utils/validation';

describe('Validation工具函数', () => {
  // ================================================================
  // validateString
  // ================================================================

  describe('validateString', () => {
    it('应该验证必填字段', () => {
      const result = validateString('', { required: true });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('此字段为必填项');
    });

    it('应该通过非必填的空字段', () => {
      const result = validateString('', { required: false });

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('');
    });

    it('应该验证最小长度', () => {
      const result = validateString('ab', { minLength: 3 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('最少需要 3 个字符');
    });

    it('应该验证最大长度', () => {
      const result = validateString('abcdef', { maxLength: 5 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('最多允许 5 个字符');
    });

    it('应该验证正则表达式', () => {
      const result = validateString('abc123', { pattern: /^[a-z]+$/ });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('输入格式不正确');
    });

    it('应该支持自定义验证函数', () => {
      const result = validateString('test', {
        custom: (value) => value.startsWith('valid')
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('输入不符合要求');
    });

    it('应该使用自定义错误消息', () => {
      const result = validateString('', {
        required: true,
        errorMessage: '自定义错误'
      });

      expect(result.error).toBe('自定义错误');
    });

    it('应该修剪空白字符', () => {
      const result = validateString('  test  ');

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('test');
    });

    it('应该通过所有验证规则', () => {
      const result = validateString('valid123', {
        required: true,
        minLength: 5,
        maxLength: 10,
        pattern: /^[a-z0-9]+$/
      });

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('valid123');
    });
  });

  // ================================================================
  // validateEmail
  // ================================================================

  describe('validateEmail', () => {
    it('应该验证有效的邮箱', () => {
      const result = validateEmail('test@example.com');

      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效的邮箱', () => {
      const result = validateEmail('invalid-email');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('有效的邮箱地址');
    });

    it('应该拒绝空邮箱', () => {
      const result = validateEmail('');

      expect(result.valid).toBe(false);
    });

    it('应该验证复杂的邮箱格式', () => {
      expect(validateEmail('user+tag@sub.domain.com').valid).toBe(true);
      expect(validateEmail('user.name@example.co.uk').valid).toBe(true);
    });

    it('应该拒绝缺少@的邮箱', () => {
      expect(validateEmail('userexample.com').valid).toBe(false);
    });

    it('应该拒绝缺少域名的邮箱', () => {
      expect(validateEmail('user@').valid).toBe(false);
    });
  });

  // ================================================================
  // validateUrl
  // ================================================================

  describe('validateUrl', () => {
    it('应该验证有效的URL', () => {
      const result = validateUrl('https://example.com');

      expect(result.valid).toBe(true);
    });

    it('应该验证带路径的URL', () => {
      const result = validateUrl('https://example.com/path/to/page');

      expect(result.valid).toBe(true);
    });

    it('应该验证带查询参数的URL', () => {
      const result = validateUrl('https://example.com?key=value&foo=bar');

      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效的URL', () => {
      const result = validateUrl('not-a-url');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('有效的URL地址');
    });

    it('应该支持不同的协议', () => {
      expect(validateUrl('http://example.com').valid).toBe(true);
      expect(validateUrl('ftp://example.com').valid).toBe(true);
    });

    it('应该拒绝空URL', () => {
      expect(validateUrl('').valid).toBe(false);
    });
  });

  // ================================================================
  // validateApiKey
  // ================================================================

  describe('validateApiKey', () => {
    it('应该验证有效的API Key', () => {
      const result = validateApiKey('sk-1234567890abcdef');

      expect(result.valid).toBe(true);
    });

    it('应该拒绝太短的API Key', () => {
      const result = validateApiKey('short');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('最少需要 10 个字符');
    });

    it('应该拒绝包含特殊字符的API Key', () => {
      const result = validateApiKey('invalid@key#123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('API Key格式不正确');
    });

    it('应该接受下划线和连字符', () => {
      expect(validateApiKey('valid_key-123').valid).toBe(true);
    });

    it('应该拒绝空API Key', () => {
      expect(validateApiKey('').valid).toBe(false);
    });
  });

  // ================================================================
  // validateJson
  // ================================================================

  describe('validateJson', () => {
    it('应该验证有效的JSON', () => {
      const result = validateJson('{"key": "value"}');

      expect(result.valid).toBe(true);
    });

    it('应该验证JSON数组', () => {
      const result = validateJson('[1, 2, 3]');

      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效的JSON', () => {
      const result = validateJson('{invalid json}');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('JSON格式不正确');
    });

    it('应该拒绝空字符串', () => {
      const result = validateJson('');

      expect(result.valid).toBe(false);
    });

    it('应该验证嵌套的JSON', () => {
      const json = '{"nested": {"deep": {"value": 123}}}';
      expect(validateJson(json).valid).toBe(true);
    });
  });

  // ================================================================
  // validateNumber
  // ================================================================

  describe('validateNumber', () => {
    it('应该验证有效的数字', () => {
      const result = validateNumber(42);

      expect(result.valid).toBe(true);
    });

    it('应该验证最小值', () => {
      const result = validateNumber(5, 10);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('不能小于 10');
    });

    it('应该验证最大值', () => {
      const result = validateNumber(15, undefined, 10);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('不能大于 10');
    });

    it('应该验证范围', () => {
      expect(validateNumber(5, 1, 10).valid).toBe(true);
      expect(validateNumber(0, 1, 10).valid).toBe(false);
      expect(validateNumber(11, 1, 10).valid).toBe(false);
    });

    it('应该拒绝NaN', () => {
      const result = validateNumber(NaN);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('有效的数字');
    });

    it('应该拒绝非数字类型', () => {
      const result = validateNumber('123' as any);

      expect(result.valid).toBe(false);
    });

    it('应该接受负数', () => {
      expect(validateNumber(-5).valid).toBe(true);
    });

    it('应该接受小数', () => {
      expect(validateNumber(3.14).valid).toBe(true);
    });
  });

  // ================================================================
  // validateObject
  // ================================================================

  describe('validateObject', () => {
    it('应该验证对象的所有字段', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        age: '25'
      };

      const rules = {
        name: { required: true, minLength: 2 },
        email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        age: { required: true }
      };

      const results = validateObject(data, rules);

      expect(results.name.valid).toBe(true);
      expect(results.email.valid).toBe(true);
      expect(results.age.valid).toBe(true);
    });

    it('应该返回所有字段的验证结果', () => {
      const data = {
        field1: '',
        field2: 'valid'
      };

      const rules = {
        field1: { required: true },
        field2: { required: true }
      };

      const results = validateObject(data, rules);

      expect(results.field1.valid).toBe(false);
      expect(results.field2.valid).toBe(true);
    });

    it('应该处理缺失的字段', () => {
      const data = {
        field1: 'value'
      };

      const rules = {
        field1: { required: true },
        field2: { required: true }
      };

      const results = validateObject(data, rules);

      expect(results.field2.valid).toBe(false);
    });
  });

  // ================================================================
  // isAllValid
  // ================================================================

  describe('isAllValid', () => {
    it('应该在所有字段有效时返回true', () => {
      const results = {
        field1: { valid: true },
        field2: { valid: true },
        field3: { valid: true }
      };

      expect(isAllValid(results)).toBe(true);
    });

    it('应该在有字段无效时返回false', () => {
      const results = {
        field1: { valid: true },
        field2: { valid: false, error: 'Error' },
        field3: { valid: true }
      };

      expect(isAllValid(results)).toBe(false);
    });

    it('应该处理空对象', () => {
      expect(isAllValid({})).toBe(true);
    });
  });

  // ================================================================
  // getFirstError
  // ================================================================

  describe('getFirstError', () => {
    it('应该返回第一个错误消息', () => {
      const results = {
        field1: { valid: true },
        field2: { valid: false, error: '错误1' },
        field3: { valid: false, error: '错误2' }
      };

      expect(getFirstError(results)).toBe('错误1');
    });

    it('应该在没有错误时返回null', () => {
      const results = {
        field1: { valid: true },
        field2: { valid: true }
      };

      expect(getFirstError(results)).toBeNull();
    });

    it('应该处理空对象', () => {
      expect(getFirstError({})).toBeNull();
    });
  });

  // ================================================================
  // sanitizeFilename
  // ================================================================

  describe('sanitizeFilename', () => {
    it('应该移除危险字符', () => {
      const result = sanitizeFilename('file<>:"/\\|?*.txt');

      expect(result).toBe('file.txt');
    });

    it('应该移除开头的点', () => {
      const result = sanitizeFilename('...file.txt');

      expect(result).toBe('file.txt');
    });

    it('应该移除结尾的点', () => {
      const result = sanitizeFilename('file.txt...');

      expect(result).toBe('file.txt');
    });

    it('应该修剪空白字符', () => {
      const result = sanitizeFilename('  file.txt  ');

      expect(result).toBe('file.txt');
    });

    it('应该保留有效的文件名', () => {
      const result = sanitizeFilename('valid-file_name.txt');

      expect(result).toBe('valid-file_name.txt');
    });

    it('应该处理中文文件名', () => {
      const result = sanitizeFilename('测试文件.txt');

      expect(result).toBe('测试文件.txt');
    });
  });

  // ================================================================
  // sanitizePath
  // ================================================================

  describe('sanitizePath', () => {
    it('应该移除路径遍历攻击', () => {
      const result = sanitizePath('../../../etc/passwd');

      expect(result).not.toContain('..');
    });

    it('应该移除危险字符', () => {
      const result = sanitizePath('path<>:"|?*');

      expect(result).toBe('path');
    });

    it('应该移除开头的斜杠', () => {
      const result = sanitizePath('///path/to/file');

      expect(result).toBe('path/to/file');
    });

    it('应该保留有效的路径', () => {
      const result = sanitizePath('path/to/file.txt');

      expect(result).toBe('path/to/file.txt');
    });

    it('应该修剪空白字符', () => {
      const result = sanitizePath('  path/to/file  ');

      expect(result).toBe('path/to/file');
    });
  });

  // ================================================================
  // ValidationUtils
  // ================================================================

  describe('ValidationUtils', () => {
    it('应该导出所有验证函数', () => {
      expect(ValidationUtils.validateString).toBeDefined();
      expect(ValidationUtils.validateEmail).toBeDefined();
      expect(ValidationUtils.validateUrl).toBeDefined();
      expect(ValidationUtils.validateApiKey).toBeDefined();
      expect(ValidationUtils.validateJson).toBeDefined();
      expect(ValidationUtils.validateNumber).toBeDefined();
      expect(ValidationUtils.validateObject).toBeDefined();
      expect(ValidationUtils.isAllValid).toBeDefined();
      expect(ValidationUtils.getFirstError).toBeDefined();
      expect(ValidationUtils.sanitizeFilename).toBeDefined();
      expect(ValidationUtils.sanitizePath).toBeDefined();
    });

    it('应该能够通过ValidationUtils调用函数', () => {
      const result = ValidationUtils.validateEmail('test@example.com');

      expect(result.valid).toBe(true);
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('应该处理极长的字符串', () => {
      const longString = 'a'.repeat(10000);
      const result = validateString(longString, { maxLength: 5000 });

      expect(result.valid).toBe(false);
    });

    it('应该处理特殊Unicode字符', () => {
      const result = validateString('测试🎉emoji', { required: true });

      expect(result.valid).toBe(true);
    });

    it('应该处理只包含空白的字符串', () => {
      const result = validateString('   ', { required: true });

      expect(result.valid).toBe(false);
    });

    it('应该处理null和undefined', () => {
      expect(validateString(null as any, { required: false }).valid).toBe(true);
      expect(validateString(undefined as any, { required: false }).valid).toBe(true);
    });

    it('应该处理极端数字值', () => {
      expect(validateNumber(Number.MAX_VALUE).valid).toBe(true);
      expect(validateNumber(Number.MIN_VALUE).valid).toBe(true);
      expect(validateNumber(Infinity).valid).toBe(true);
      expect(validateNumber(-Infinity).valid).toBe(true);
    });
  });
});
