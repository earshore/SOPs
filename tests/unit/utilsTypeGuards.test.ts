import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  TypeGuards,
  isArray,
  isFunction,
  isHTMLElement,
  isNumber,
  isObject,
  isPromise,
  isString,
  safeParse,
  safeParseHTTPOptions,
  safeParseLLMOptions,
  validateLLMConfig,
  validateModuleConfig,
  validateProxyConfig,
  validateRouteConfig,
} from '@/common/utils/typeGuards';

describe('common utils typeGuards', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates supported config shapes', () => {
    expect(validateRouteConfig({
      moduleId: 'home',
      label: 'Home',
      icon: 'fa-home',
      panelId: 'home-panel',
      category: 'main',
    })).toBe(true);
    expect(validateModuleConfig({
      id: 'home',
      contextId: 'root',
      title: 'Home',
      version: '1.0.0',
      icon: 'fa-home',
      description: 'Home module',
    })).toBe(true);
    expect(validateLLMConfig({
      endpoint: 'https://api.example.com/v1',
      apiKey: 'test-key',
      model: 'gpt-test',
      models: ['gpt-test', { id: 'gpt-object', context: 128000 }],
    })).toBe(true);
    expect(validateProxyConfig({ type: 'custom_api', customUrl: 'https://proxy.example.com' })).toBe(true);
  });

  it('throws validation errors for invalid config shapes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => validateRouteConfig({ moduleId: 'home' })).toThrow('Route config validation failed');
    expect(() => validateModuleConfig({ id: 'home' })).toThrow('Module config validation failed');
    expect(() => validateLLMConfig({
      endpoint: 'not-a-url',
      apiKey: '',
      model: 'gpt-test',
      models: [],
    })).toThrow('LLM config validation failed');
    expect(() => validateProxyConfig({ type: 'allorigins' })).toThrow('Proxy config validation failed');
  });

  it('returns parsed values or defaults through safe parse helpers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const schema = z.object({ name: z.string() });

    expect(safeParse({ name: 'valid' }, schema, { name: 'default' })).toEqual({ name: 'valid' });
    expect(safeParse({ name: 1 }, schema, { name: 'default' })).toEqual({ name: 'default' });
    expect(safeParseHTTPOptions({ method: 'POST', timeout: 5000 })).toMatchObject({
      method: 'POST',
      timeout: 5000,
    });
    expect(safeParseHTTPOptions({ method: 'TRACE' })).toEqual({
      method: 'GET',
      headers: {},
      timeout: 30000,
      retries: 0,
    });
    expect(safeParseLLMOptions({ temperature: 0.2, jsonMode: true })).toMatchObject({
      temperature: 0.2,
      jsonMode: true,
    });
    expect(safeParseLLMOptions({ temperature: 10 })).toEqual({
      temperature: 0.7,
      jsonMode: false,
      timeout: 30000,
      retries: 2,
      retryDelay: 1000,
    });
    expect(warn).toHaveBeenCalled();
  });

  it('identifies primitive, function, promise, and DOM element values', () => {
    expect(isString('value')).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isNumber(1)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(false);
    expect(isObject({})).toBe(true);
    expect(isObject([])).toBe(false);
    expect(isArray([])).toBe(true);
    expect(isArray({})).toBe(false);
    expect(isFunction(() => undefined)).toBe(true);
    expect(isFunction('fn')).toBe(false);
    expect(isPromise(Promise.resolve())).toBe(true);
    expect(isPromise({ then: () => undefined })).toBe(true);
    expect(isPromise({})).toBe(false);
    expect(isHTMLElement(document.createElement('div'))).toBe(true);
    expect(isHTMLElement({})).toBe(false);
  });

  it('exposes the same helpers through TypeGuards and window', () => {
    expect(TypeGuards.validateRouteConfig).toBe(validateRouteConfig);
    expect(TypeGuards.safeParse).toBe(safeParse);
    expect((window as Window & { TypeGuards?: typeof TypeGuards }).TypeGuards).toBe(TypeGuards);
  });
});
