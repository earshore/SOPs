/**
 * StorageService 单元测试
 * 运行方式: npm test
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService, STORAGE_KEYS } from './storageService.js';

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: vi.fn((key) => localStorageMock.store[key] || null),
    setItem: vi.fn((key, value) => { localStorageMock.store[key] = value; }),
    removeItem: vi.fn((key) => { delete localStorageMock.store[key]; }),
    clear: vi.fn(() => { localStorageMock.store = {}; }),
    get length() { return Object.keys(localStorageMock.store).length; },
    key: vi.fn((i) => Object.keys(localStorageMock.store)[i])
};

// 替换全局 localStorage
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('StorageService', () => {
    beforeEach(() => {
        localStorageMock.store = {};
        vi.clearAllMocks();
    });

    describe('get/set', () => {
        it('should store and retrieve values', () => {
            StorageService.set('test_key', { foo: 'bar' });
            const result = StorageService.get('test_key');
            expect(result).toEqual({ foo: 'bar' });
        });

        it('should return default value for missing key', () => {
            const result = StorageService.get('missing_key', 'default');
            expect(result).toBe('default');
        });

        it('should handle null default value', () => {
            const result = StorageService.get('missing_key');
            expect(result).toBeNull();
        });
    });

    describe('remove', () => {
        it('should remove stored value', () => {
            StorageService.set('to_remove', 'value');
            StorageService.remove('to_remove');
            expect(StorageService.get('to_remove')).toBeNull();
        });
    });

    describe('getLLMConfig', () => {
        it('should return null when no provider is set', () => {
            const result = StorageService.getLLMConfig();
            expect(result).toBeNull();
        });

        it('should return config for specified provider', () => {
            const config = { apiKey: 'sk-xxx', model: 'gpt-4' };
            StorageService.set('llm_openai', config);
            const result = StorageService.getLLMConfig('openai');
            expect(result).toEqual(config);
        });
    });

    describe('getProxyConfig', () => {
        it('should return default allorigins config', () => {
            const result = StorageService.getProxyConfig();
            expect(result.type).toBe('allorigins');
        });
    });

    describe('getScrapeHistory', () => {
        it('should return empty array by default', () => {
            const result = StorageService.getScrapeHistory();
            expect(result).toEqual([]);
        });

        it('should limit history to 50 items', () => {
            const history = Array.from({ length: 60 }, (_, i) => ({ id: i }));
            StorageService.setScrapeHistory(history);
            const result = StorageService.getScrapeHistory();
            expect(result.length).toBe(50);
        });
    });
});
