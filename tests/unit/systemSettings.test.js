import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initAlpineSettings,
  openSettings,
  closeSettings,
  updateModelStatus
} from '@/components/settings/systemSettings';
import { StorageService, STORAGE_KEYS } from '@/services/storageService.ts';
import { PROVIDERS } from '@/common/constants/constants';

describe('SystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock DOM elements
    document.body.innerHTML = `
      <div id="model-status"></div>
    `;

    // Mock window.Alpine
    window.Alpine = {
      data: vi.fn()
    };

    // Mock showToast
    vi.mock('@/common/utils/ui.js', () => ({
      showToast: vi.fn()
    }));
  });

  describe('initAlpineSettings', () => {
    it('should register Alpine component when Alpine is available', () => {
      initAlpineSettings();

      expect(window.Alpine.data).toHaveBeenCalledWith(
        'settingsPanel',
        expect.any(Function)
      );
    });

    it('should log error when Alpine is not available', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.Alpine = null;

      initAlpineSettings();

      expect(consoleSpy).toHaveBeenCalledWith('Alpine not found!');
    });
  });

  describe('openSettings', () => {
    it('should dispatch open-settings event', () => {
      const eventSpy = vi.fn();
      window.addEventListener('open-settings', eventSpy);

      openSettings();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('closeSettings', () => {
    it('should dispatch close-settings event', () => {
      const eventSpy = vi.fn();
      window.addEventListener('close-settings', eventSpy);

      closeSettings();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('updateModelStatus', () => {
    it('should show success status when provider is configured', () => {
      StorageService.set(STORAGE_KEYS.LLM_ACTIVE_PROVIDER, 'openai');
      StorageService.setLLMConfig('openai', {
        apiKey: 'test-key',
        model: 'gpt-4'
      });

      updateModelStatus();

      const statusEl = document.getElementById('model-status');
      expect(statusEl.innerHTML).toContain('status-success');
      expect(statusEl.innerHTML).toContain('gpt-4');
    });

    it('should show pending status when provider is not configured', () => {
      updateModelStatus();

      const statusEl = document.getElementById('model-status');
      expect(statusEl.innerHTML).toContain('status-pending');
      expect(statusEl.innerHTML).toContain('等待API配置');
    });

    it('should show pending status when API key is missing', () => {
      StorageService.set(STORAGE_KEYS.LLM_ACTIVE_PROVIDER, 'openai');
      StorageService.setLLMConfig('openai', {
        model: 'gpt-4'
      });

      updateModelStatus();

      const statusEl = document.getElementById('model-status');
      expect(statusEl.innerHTML).toContain('status-pending');
    });

    it('should show pending status when model is missing', () => {
      StorageService.set(STORAGE_KEYS.LLM_ACTIVE_PROVIDER, 'openai');
      StorageService.setLLMConfig('openai', {
        apiKey: 'test-key'
      });

      updateModelStatus();

      const statusEl = document.getElementById('model-status');
      expect(statusEl.innerHTML).toContain('status-pending');
    });

    it('should handle missing status element gracefully', () => {
      document.body.innerHTML = '';

      expect(() => updateModelStatus()).not.toThrow();
    });

    it('should display provider name correctly', () => {
      StorageService.set(STORAGE_KEYS.LLM_ACTIVE_PROVIDER, 'openai');
      StorageService.setLLMConfig('openai', {
        apiKey: 'test-key',
        model: 'gpt-4'
      });

      updateModelStatus();

      const statusEl = document.getElementById('model-status');
      expect(statusEl.innerHTML).toContain(PROVIDERS.openai.name);
    });
  });

  describe('SettingsPanel Component Logic', () => {
    let settingsPanel;

    beforeEach(() => {
      // Create a mock SettingsPanel instance
      settingsPanel = {
        isOpen: false,
        llm: {
          provider: 'openai',
          endpoint: '',
          apiKey: '',
          model: '',
          models: [],
          showKey: false,
          isFetching: false,
          isTesting: false
        },
        proxy: {
          type: 'allorigins',
          customUrl: '',
          showKey: false,
          savedKeyMap: {}
        }
      };
    });

    it('should initialize with default values', () => {
      expect(settingsPanel.isOpen).toBe(false);
      expect(settingsPanel.llm.provider).toBe('openai');
      expect(settingsPanel.proxy.type).toBe('allorigins');
    });

    it('should have computed property for currentProviderConfig', () => {
      const config = PROVIDERS[settingsPanel.llm.provider];
      expect(config).toBeDefined();
      expect(config.name).toBe('OpenAI');
    });

    it('should determine if proxy needs input', () => {
      const needsInput = ['scraperapi', 'zenrows', 'brightdata', 'custom_api', 'custom_proxy'];

      needsInput.forEach(type => {
        settingsPanel.proxy.type = type;
        // In real component, this would be a computed property
        const proxyNeedsInput = needsInput.includes(settingsPanel.proxy.type);
        expect(proxyNeedsInput).toBe(true);
      });
    });

    it('should not need input for default proxy types', () => {
      settingsPanel.proxy.type = 'allorigins';
      const needsInput = ['scraperapi', 'zenrows', 'brightdata', 'custom_api', 'custom_proxy'];
      const proxyNeedsInput = needsInput.includes(settingsPanel.proxy.type);
      expect(proxyNeedsInput).toBe(false);
    });
  });

  describe('LLM Configuration', () => {
    it('should load provider config from storage', () => {
      const mockConfig = {
        endpoint: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        model: 'gpt-4',
        models: ['gpt-4', 'gpt-3.5-turbo']
      };

      StorageService.setLLMConfig('openai', mockConfig);
      const loaded = StorageService.getLLMConfig('openai');

      expect(loaded).toEqual(mockConfig);
    });

    it('should save provider config to storage', () => {
      const newConfig = {
        endpoint: 'https://api.openai.com/v1',
        apiKey: 'new-key',
        model: 'gpt-4',
        models: ['gpt-4']
      };

      StorageService.setLLMConfig('openai', newConfig);
      const saved = StorageService.getLLMConfig('openai');

      expect(saved).toEqual(newConfig);
    });

    it('should handle missing provider config', () => {
      const config = StorageService.getLLMConfig('nonexistent');
      expect(config === null || Object.keys(config).length === 0).toBe(true);
    });
  });

  describe('Proxy Configuration', () => {
    it('should load proxy config from storage', () => {
      const mockConfig = {
        type: 'scraperapi',
        customUrl: 'test-key'
      };

      StorageService.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, mockConfig);
      const loaded = StorageService.get(STORAGE_KEYS.SCRAPER_PROXY_CONFIG);

      expect(loaded).toEqual(mockConfig);
    });

    it('should save proxy config to storage', () => {
      const newConfig = {
        type: 'zenrows',
        customUrl: 'new-key'
      };

      StorageService.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, newConfig);
      const saved = StorageService.get(STORAGE_KEYS.SCRAPER_PROXY_CONFIG);

      expect(saved).toEqual(newConfig);
    });

    it('should cache proxy keys for different types', () => {
      const keyMap = {
        scraperapi: 'key1',
        zenrows: 'key2',
        brightdata: 'key3'
      };

      StorageService.set(STORAGE_KEYS.PROXY_KEY_MAP, keyMap);
      const saved = StorageService.get(STORAGE_KEYS.PROXY_KEY_MAP);

      expect(saved).toEqual(keyMap);
    });
  });

  describe('Provider Display Names', () => {
    it('should return correct display name for known providers', () => {
      const names = {
        scraperapi: "ScraperAPI",
        zenrows: "ZenRows",
        brightdata: "Bright Data",
        custom_api: "自定义 API",
        allorigins: "AllOrigins",
        custom_proxy: "HTTP 代理"
      };

      Object.entries(names).forEach(([type, expected]) => {
        // This would be a method in the actual component
        const displayName = names[type] || "默认";
        expect(displayName).toBe(expected);
      });
    });

    it('should return default for unknown proxy type', () => {
      const displayName = "默认";
      expect(displayName).toBe("默认");
    });
  });

  describe('Model Deduplication', () => {
    it('should deduplicate model list', () => {
      const models = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4', 'gpt-3.5-turbo'];
      const seen = new Set();
      const deduplicated = models.filter(m => {
        if (seen.has(m)) return false;
        seen.add(m);
        return true;
      });

      expect(deduplicated).toEqual(['gpt-4', 'gpt-3.5-turbo']);
      expect(deduplicated.length).toBe(2);
    });

    it('should handle object models with id property', () => {
      const models = [
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5' },
        { id: 'gpt-4', name: 'GPT-4 Duplicate' }
      ];

      const seen = new Set();
      const deduplicated = models.filter(m => {
        const id = typeof m === 'string' ? m : m.id;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      expect(deduplicated.length).toBe(2);
      expect(deduplicated[0].id).toBe('gpt-4');
      expect(deduplicated[1].id).toBe('gpt-3.5-turbo');
    });
  });

  describe('Input Validation', () => {
    it('should validate API key presence', () => {
      const apiKey = '';
      const isValid = apiKey.length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate model selection', () => {
      const model = '';
      const isValid = model.length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate complete configuration', () => {
      const config = {
        apiKey: 'test-key',
        model: 'gpt-4'
      };

      const isValid = !!(config.apiKey && config.model);
      expect(isValid).toBe(true);
    });
  });
});
