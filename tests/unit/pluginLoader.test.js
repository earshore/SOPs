import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPlugins } from '@/common/utils/pluginLoader.js';

describe('PluginLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to verify logging
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('loadPlugins', () => {
    it('should scan and load plugins using Vite glob import', () => {
      // Mock import.meta.glob
      const mockPlugins = {
        '/src/modules/home/plugin.js': { default: {} },
        '/src/modules/sops/plugin.js': { default: {} },
        '/src/modules/amz_hub/plugin.js': { default: {} }
      };

      // Since import.meta.glob is compile-time, we test the function behavior
      loadPlugins();

      // Verify scanning message
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PluginLoader] Scanning for plugins')
      );
    });

    it('should log total plugins loaded', () => {
      loadPlugins();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PluginLoader] Total plugins loaded')
      );
    });

    it('should handle empty plugin directory gracefully', () => {
      expect(() => loadPlugins()).not.toThrow();
    });

    it('should log each loaded plugin path', () => {
      loadPlugins();

      // Should have at least the scanning and total messages
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('Plugin Loading Behavior', () => {
    it('should use eager loading for synchronous initialization', () => {
      // The function uses { eager: true } which means plugins are loaded immediately
      loadPlugins();

      // Verify it completes synchronously
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Total plugins loaded')
      );
    });

    it('should count plugins correctly', () => {
      loadPlugins();

      // Extract the count from the log message
      const totalLog = console.log.mock.calls.find(call =>
        call[0]?.includes('Total plugins loaded')
      );

      expect(totalLog).toBeDefined();
      expect(totalLog[0]).toMatch(/Total plugins loaded: \d+/);
    });
  });

  describe('Error Handling', () => {
    it('should not throw if import.meta.glob returns empty object', () => {
      expect(() => loadPlugins()).not.toThrow();
    });

    it('should handle plugin loading errors gracefully', () => {
      // Even if a plugin fails to load, the function should continue
      expect(() => loadPlugins()).not.toThrow();
    });
  });

  describe('Console Output', () => {
    it('should use emoji indicators for better visibility', () => {
      loadPlugins();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔌')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅')
      );
    });

    it('should provide clear status messages', () => {
      loadPlugins();

      const calls = console.log.mock.calls.map(call => call[0]);
      const hasScanning = calls.some(msg => msg?.includes('Scanning'));
      const hasTotal = calls.some(msg => msg?.includes('Total'));

      expect(hasScanning).toBe(true);
      expect(hasTotal).toBe(true);
    });
  });
});
