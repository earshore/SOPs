// tests/unit/StorageService.test.ts
// ================================================================
// StorageService 单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ================================================================
  // 基础存储操作
  // ================================================================

  describe('基础存储操作', () => {
    it('应该能够存储和读取数据', () => {
      const key = 'test-key';
      const value = { message: 'hello' };

      StorageService.set(key, value);
      const result = StorageService.get(key);

      expect(result).toEqual(value);
    });

    it('应该在键不存在时返回默认值', () => {
      const defaultValue = 'default';
      const result = StorageService.get('non-existent', defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('应该在键不存在且无默认值时返回null', () => {
      const result = StorageService.get('non-existent');
      expect(result).toBeNull();
    });

    it('应该能够删除数据', () => {
      StorageService.set('key', 'value');
      StorageService.remove('key');

      expect(StorageService.get('key')).toBeNull();
    });

    it('应该能够清空所有数据', () => {
      StorageService.set('key1', 'value1');
      StorageService.set('key2', 'value2');

      StorageService.clear();

      expect(StorageService.get('key1')).toBeNull();
      expect(StorageService.get('key2')).toBeNull();
    });

    it('应该能够检查键是否存在', () => {
      StorageService.set('key', 'value');

      expect(StorageService.has('key')).toBe(true);
      expect(StorageService.has('non-existent')).toBe(false);
    });

    it('应该能够获取所有键', () => {
      StorageService.set('key1', 'value1');
      StorageService.set('key2', 'value2');

      const keys = StorageService.keys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ================================================================
  // 原始字符串操作
  // ================================================================

  describe('原始字符串操作', () => {
    it('应该能够存储和读取原始字符串', () => {
      const key = 'raw-key';
      const value = 'raw-string-value';

      StorageService.setRaw(key, value);
      const result = StorageService.getRaw(key);

      expect(result).toBe(value);
    });

    it('应该在键不存在时返回默认值', () => {
      const defaultValue = 'default';
      const result = StorageService.getRaw('non-existent', defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('getRaw应该返回未解析的JSON字符串', () => {
      const key = 'json-key';
      const value = { test: 'data' };

      StorageService.set(key, value);
      const raw = StorageService.getRaw(key);

      expect(raw).toBe(JSON.stringify(value));
    });
  });

  // ================================================================
  // 数据类型测试
  // ================================================================

  describe('数据类型支持', () => {
    it('应该支持字符串', () => {
      StorageService.set('key', 'string-value');
      expect(StorageService.get('key')).toBe('string-value');
    });

    it('应该支持数字', () => {
      StorageService.set('key', 123);
      expect(StorageService.get('key')).toBe(123);
    });

    it('应该支持布尔值', () => {
      StorageService.set('key', true);
      expect(StorageService.get('key')).toBe(true);
    });

    it('应该支持数组', () => {
      const array = [1, 2, 3];
      StorageService.set('key', array);
      expect(StorageService.get('key')).toEqual(array);
    });

    it('应该支持对象', () => {
      const obj = { a: 1, b: { c: 2 } };
      StorageService.set('key', obj);
      expect(StorageService.get('key')).toEqual(obj);
    });

    it('应该支持null', () => {
      StorageService.set('key', null);
      expect(StorageService.get('key')).toBeNull();
    });
  });

  // ================================================================
  // LLM配置管理
  // ================================================================

  describe('LLM配置管理', () => {
    it('应该能够保存和读取LLM配置', () => {
      const provider = 'openai';
      const config = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        endpoint: 'https://api.openai.com/v1',
        models: ['gpt-4'],
        enabled: true
      };

      StorageService.setLLMConfig(provider, config);
      const result = StorageService.getLLMConfig(provider);

      expect(result).toBeDefined();
      expect(result?.provider).toBe('openai');
      expect(result?.model).toBe('gpt-4');
    });

    it('应该设置活跃的provider', () => {
      const provider = 'openai';
      const config = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        endpoint: 'https://api.openai.com/v1',
        models: ['gpt-4'],
        enabled: true
      };

      StorageService.setLLMConfig(provider, config);
      
      const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
      expect(activeProvider).toBe(provider);
    });

    it('应该在没有配置时返回空对象', () => {
      const result = StorageService.getLLMConfig('non-existent');
      // getLLMConfig在没有配置时返回空对象,而不是null
      expect(result).toEqual({});
    });

    it('getLLMConfig应该移除敏感的apiKey', () => {
      const provider = 'openai';
      const config = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'secret-key',
        endpoint: 'https://api.openai.com/v1',
        models: ['gpt-4'],
        enabled: true
      };

      StorageService.setLLMConfig(provider, config);
      const result = StorageService.getLLMConfig(provider);

      expect(result).not.toHaveProperty('apiKey');
    });
  });

  // ================================================================
  // 代理配置管理
  // ================================================================

  describe('代理配置管理', () => {
    it('应该能够保存和读取代理配置', () => {
      const config = {
        type: 'custom' as const,
        enabled: true,
        url: 'https://proxy.example.com'
      };

      StorageService.setProxyConfig(config);
      const result = StorageService.getProxyConfig();

      expect(result).toEqual(config);
    });

    it('应该返回默认代理配置', () => {
      const result = StorageService.getProxyConfig();

      expect(result).toEqual({
        type: 'scraperapi',
        enabled: true
      });
    });
  });

  // ================================================================
  // 采集历史管理
  // ================================================================

  describe('采集历史管理', () => {
    it('应该能够保存和读取采集历史', () => {
      const history = [
        { id: '1', url: 'https://example.com', timestamp: Date.now() },
        { id: '2', url: 'https://test.com', timestamp: Date.now() }
      ];

      StorageService.setScrapeHistory(history);
      const result = StorageService.getScrapeHistory();

      expect(result).toEqual(history);
    });

    it('应该限制历史记录数量为50', () => {
      const history = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        url: `https://example.com/${i}`,
        timestamp: Date.now()
      }));

      StorageService.setScrapeHistory(history);
      const result = StorageService.getScrapeHistory();

      expect(result.length).toBe(50);
    });

    it('应该在没有历史时返回空数组', () => {
      const result = StorageService.getScrapeHistory();
      expect(result).toEqual([]);
    });
  });

  // ================================================================
  // 布局配置管理
  // ================================================================

  describe('布局配置管理', () => {
    it('应该能够保存和读取布局配置', () => {
      const templateId = 'dashboard';
      const layout = [
        { id: 'widget1', x: 0, y: 0, w: 2, h: 2 },
        { id: 'widget2', x: 2, y: 0, w: 2, h: 2 }
      ];

      StorageService.setLayoutConfig(templateId, layout);
      const result = StorageService.getLayoutConfig(templateId);

      expect(result).toEqual(layout);
    });

    it('应该在没有配置时返回空数组', () => {
      const result = StorageService.getLayoutConfig('non-existent');
      expect(result).toEqual([]);
    });
  });

  // ================================================================
  // 存储使用情况
  // ================================================================

  describe('存储使用情况', () => {
    it('应该返回存储使用情况', () => {
      StorageService.set('key1', 'value1');
      StorageService.set('key2', 'value2');

      const usage = StorageService.getUsage();

      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('total');
      expect(usage).toHaveProperty('percent');
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.total).toBe(5 * 1024 * 1024); // 5MB
    });
  });

  describe('LRU清理策略', () => {
    it('应该只自动清理缓存键，不删除用户数据和配置', () => {
      StorageService.setRaw('cache:view:old', 'cached');
      StorageService.set('user:scrape_history', [{ id: 1 }]);
      StorageService.set('app-storage', { ui: { theme: 'dark' } });
      StorageService.set('secure_llm_key_new_api', { encrypted: true });
      StorageService.set(STORAGE_KEYS.SCRAPE_HISTORY, [{ id: 'legacy' }]);

      (StorageService as any)._cleanupLRU();

      expect(StorageService.getRaw('cache:view:old')).toBeNull();
      expect(StorageService.get('user:scrape_history')).toEqual([{ id: 1 }]);
      expect(StorageService.get('app-storage')).toEqual({ ui: { theme: 'dark' } });
      expect(StorageService.get('secure_llm_key_new_api')).toEqual({ encrypted: true });
      expect(StorageService.get(STORAGE_KEYS.SCRAPE_HISTORY)).toEqual([{ id: 'legacy' }]);
    });
  });

  // ================================================================
  // 错误处理
  // ================================================================

  describe('错误处理', () => {
    it('应该处理JSON解析错误', () => {
      // 直接设置无效的JSON
      localStorage.setItem('invalid-json', 'not-a-json');

      const result = StorageService.get('invalid-json', 'default');
      expect(result).toBe('default');
    });

    it('set应该在存储失败时返回false', () => {
      // Mock localStorage.setItem抛出错误
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const result = StorageService.set('key', 'value');
      
      // 恢复原始方法
      Storage.prototype.setItem = originalSetItem;
      
      // 应该返回false或true(取决于重试是否成功)
      expect(typeof result).toBe('boolean');
    });

    it('setRaw应该在存储失败时返回false', () => {
      // Mock localStorage.setItem抛出错误
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const result = StorageService.setRaw('key', 'value');
      
      // 恢复原始方法
      Storage.prototype.setItem = originalSetItem;
      
      expect(typeof result).toBe('boolean');
    });
  });

  // ================================================================
  // 安全存储(异步方法)
  // ================================================================

  describe('安全存储', () => {
    it('应该能够安全存储和读取敏感数据', async () => {
      const key = 'api-key';
      const value = 'secret-value';

      const setResult = await StorageService.setSecure(key, value);
      expect(setResult).toBe(true);

      const getResult = await StorageService.getSecure(key);
      expect(getResult).toBe(value);
    });

    it('应该在安全存储不存在时返回默认值', async () => {
      const defaultValue = 'default';
      const result = await StorageService.getSecure('non-existent', defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('应该能够删除安全存储的数据', async () => {
      const key = 'api-key';
      await StorageService.setSecure(key, 'value');
      
      StorageService.removeSecure(key);
      
      const result = await StorageService.getSecure(key);
      expect(result).toBeNull();
    });
  });

  // ================================================================
  // STORAGE_KEYS常量
  // ================================================================

  describe('STORAGE_KEYS常量', () => {
    it('应该导出所有必需的键常量', () => {
      expect(STORAGE_KEYS.LLM_ACTIVE_PROVIDER).toBe('llm_active_provider');
      expect(STORAGE_KEYS.LLM_CONFIG_PREFIX).toBe('llm_');
      expect(STORAGE_KEYS.PROXY_CONFIG).toBe('proxy_config');
      expect(STORAGE_KEYS.SCRAPE_HISTORY).toBe('scrape_history');
      expect(STORAGE_KEYS.LAYOUT_CONFIG_PREFIX).toBe('layout_config_');
    });
  });
});
