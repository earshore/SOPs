import { describe, it, expect } from 'vitest';
import {
  validateRouteConfig,
  validateModuleConfig,
  validateLLMConfig,
  validateProxyConfig,
  safeParse,
  safeParseHTTPOptions,
  safeParseLLMOptions,
  isString,
  isNumber,
  isObject,
  isArray,
  isFunction,
  isPromise,
  isHTMLElement
} from '@/common/utils/typeGuards';
import {
  LLMConfigSchema
} from '@/common/validators/schemas';

describe('TypeGuards', () => {
  describe('validateRouteConfig', () => {
    it('should validate valid route config', () => {
      const validConfig = {
        moduleId: 'test-module',
        label: 'Test Module',
        icon: 'fa-test',
        panelId: 'panel-test'
      };

      expect(() => validateRouteConfig(validConfig)).not.toThrow();
      expect(validateRouteConfig(validConfig)).toBe(true);
    });

    it('should throw on invalid route config', () => {
      const invalidConfig = {
        moduleId: 'test-module',
        // missing required fields
      };

      expect(() => validateRouteConfig(invalidConfig)).toThrow();
    });

    it('should accept optional category', () => {
      const configWithCategory = {
        moduleId: 'test-module',
        label: 'Test Module',
        icon: 'fa-test',
        panelId: 'panel-test',
        category: 'test-category'
      };

      expect(() => validateRouteConfig(configWithCategory)).not.toThrow();
    });
  });

  describe('validateModuleConfig', () => {
    it('should validate valid module config', () => {
      const validConfig = {
        id: 'test-module',
        contextId: 'test-context',
        title: 'Test Module',
        version: '1.0.0',
        icon: 'fa-test',
        description: 'Test description'
      };

      expect(() => validateModuleConfig(validConfig)).not.toThrow();
      expect(validateModuleConfig(validConfig)).toBe(true);
    });

    it('should throw on invalid module config', () => {
      const invalidConfig = {
        id: 'test-module'
        // missing required fields
      };

      expect(() => validateModuleConfig(invalidConfig)).toThrow();
    });
  });

  describe('validateLLMConfig', () => {
    it('should validate valid LLM config', () => {
      const validConfig = {
        endpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        model: 'gpt-4',
        models: ['gpt-4', 'gpt-3.5-turbo']
      };

      expect(() => validateLLMConfig(validConfig)).not.toThrow();
      expect(validateLLMConfig(validConfig)).toBe(true);
    });

    it('should throw on invalid endpoint', () => {
      const invalidConfig = {
        endpoint: 'not-a-url',
        apiKey: 'sk-test-key',
        model: 'gpt-4',
        models: []
      };

      expect(() => validateLLMConfig(invalidConfig)).toThrow();
    });

    it('should throw on empty API key', () => {
      const invalidConfig = {
        endpoint: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4',
        models: []
      };

      expect(() => validateLLMConfig(invalidConfig)).toThrow();
    });
  });

  describe('validateProxyConfig', () => {
    it('should validate valid proxy config', () => {
      const validConfig = {
        type: 'allorigins'
      };

      expect(() => validateProxyConfig(validConfig)).not.toThrow();
      expect(validateProxyConfig(validConfig)).toBe(true);
    });

    it('should accept custom URL', () => {
      const configWithUrl = {
        type: 'custom_api',
        customUrl: 'https://proxy.example.com'
      };

      expect(() => validateProxyConfig(configWithUrl)).not.toThrow();
    });

    it('should throw on invalid proxy type', () => {
      const invalidConfig = {
        type: 'invalid-type'
      };

      expect(() => validateProxyConfig(invalidConfig)).toThrow();
    });
  });

  describe('safeParse', () => {
    it('should return parsed value on success', () => {
      const value = {
        endpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4',
        models: []
      };

      const result = safeParse(value, LLMConfigSchema, null);
      expect(result).toEqual(value);
    });

    it('should return default value on failure', () => {
      const invalidValue = {
        endpoint: 'not-a-url'
      };

      const defaultValue = { endpoint: 'https://default.com', apiKey: 'default', model: 'default', models: [] };
      const result = safeParse(invalidValue, LLMConfigSchema, defaultValue);
      expect(result).toEqual(defaultValue);
    });
  });

  describe('safeParseHTTPOptions', () => {
    it('should parse valid HTTP options', () => {
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
        retries: 0
      };

      const result = safeParseHTTPOptions(options);
      expect(result.method).toBe('POST');
      expect(result.timeout).toBe(5000);
    });

    it('should return defaults for invalid options', () => {
      const invalidOptions = {
        method: 'INVALID'
      };

      const result = safeParseHTTPOptions(invalidOptions);
      expect(result.method).toBe('GET');
      expect(result.timeout).toBe(30000);
    });
  });

  describe('safeParseLLMOptions', () => {
    it('should parse valid LLM options', () => {
      const options = {
        temperature: 0.5,
        maxTokens: 1000,
        jsonMode: true
      };

      const result = safeParseLLMOptions(options);
      expect(result.temperature).toBe(0.5);
      expect(result.maxTokens).toBe(1000);
      expect(result.jsonMode).toBe(true);
    });

    it('should return defaults for invalid options', () => {
      const invalidOptions = {
        temperature: 5 // out of range
      };

      const result = safeParseLLMOptions(invalidOptions);
      expect(result.temperature).toBe(0.7);
      expect(result.jsonMode).toBe(false);
    });
  });

  describe('Type Assertions', () => {
    describe('isString', () => {
      it('should return true for strings', () => {
        expect(isString('test')).toBe(true);
        expect(isString('')).toBe(true);
      });

      it('should return false for non-strings', () => {
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
      });
    });

    describe('isNumber', () => {
      it('should return true for numbers', () => {
        expect(isNumber(123)).toBe(true);
        expect(isNumber(0)).toBe(true);
        expect(isNumber(-1)).toBe(true);
      });

      it('should return false for NaN', () => {
        expect(isNumber(NaN)).toBe(false);
      });

      it('should return false for non-numbers', () => {
        expect(isNumber('123')).toBe(false);
        expect(isNumber(null)).toBe(false);
      });
    });

    describe('isObject', () => {
      it('should return true for objects', () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ key: 'value' })).toBe(true);
      });

      it('should return false for null', () => {
        expect(isObject(null)).toBe(false);
      });

      it('should return false for arrays', () => {
        expect(isObject([])).toBe(false);
      });
    });

    describe('isArray', () => {
      it('should return true for arrays', () => {
        expect(isArray([])).toBe(true);
        expect(isArray([1, 2, 3])).toBe(true);
      });

      it('should return false for non-arrays', () => {
        expect(isArray({})).toBe(false);
        expect(isArray('test')).toBe(false);
      });
    });

    describe('isFunction', () => {
      it('should return true for functions', () => {
        expect(isFunction(() => {})).toBe(true);
        expect(isFunction(function() {})).toBe(true);
      });

      it('should return false for non-functions', () => {
        expect(isFunction({})).toBe(false);
        expect(isFunction('test')).toBe(false);
      });
    });

    describe('isPromise', () => {
      it('should return true for promises', () => {
        expect(isPromise(Promise.resolve())).toBe(true);
        expect(isPromise(new Promise(() => {}))).toBe(true);
      });

      it('should return true for thenable objects', () => {
        const thenable = { then: () => {} };
        expect(isPromise(thenable)).toBe(true);
      });

      it('should return false for non-promises', () => {
        expect(isPromise({})).toBe(false);
        expect(isPromise('test')).toBe(false);
      });
    });

    describe('isHTMLElement', () => {
      it('should return true for HTML elements', () => {
        const div = document.createElement('div');
        expect(isHTMLElement(div)).toBe(true);
      });

      it('should return false for non-HTML elements', () => {
        expect(isHTMLElement({})).toBe(false);
        expect(isHTMLElement('test')).toBe(false);
      });
    });
  });

  describe('Window API', () => {
    it('should expose TypeGuards on window', () => {
      expect(window.TypeGuards).toBeDefined();
      expect(window.TypeGuards.validateRouteConfig).toBe(validateRouteConfig);
      expect(window.TypeGuards.safeParse).toBe(safeParse);
    });
  });
});
