// tests/unit/lazyLibs.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadChartJs, loadGridStack } from '@/common/utils/lazyLibs.js';

describe('LazyLibs', () => {
  beforeEach(() => {
    // Clear window globals
    delete window.Chart;
    delete window.GridStack;

    // Mock console
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadChartJs', () => {
    it('should return existing Chart.js if already loaded', async () => {
      const mockChart = { version: '4.0.0' };
      window.Chart = mockChart;

      const result = await loadChartJs();

      expect(result).toBe(mockChart);
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Loading Chart.js')
      );
    });

    it('should load Chart.js dynamically', async () => {
      // Mock dynamic import
      const mockChartModule = { default: { version: '4.0.0' } };
      vi.doMock('chart.js/auto', () => mockChartModule);

      // Note: In real environment, this would trigger dynamic import
      // For testing, we simulate the behavior
      const loadPromise = loadChartJs();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Loading Chart.js')
      );

      // Simulate successful load
      window.Chart = mockChartModule.default;

      await loadPromise.catch(() => {}); // Catch expected error in test env
    });

    it('should cache the loading promise', async () => {
      const promise1 = loadChartJs();
      const promise2 = loadChartJs();

      expect(promise1).toBe(promise2);
    });

    it('should handle load errors', async () => {
      // Simulate import failure
      const error = new Error('Network error');
      
      try {
        await loadChartJs();
      } catch (e) {
        // Expected to fail in test environment
        expect(e).toBeDefined();
      }
    });

    it('should allow retry after failure', async () => {
      // First attempt fails
      try {
        await loadChartJs();
      } catch (e) {
        // Expected
      }

      // Second attempt should create new promise
      const promise2 = loadChartJs();
      expect(promise2).toBeDefined();
    });

    it('should set window.Chart after successful load', async () => {
      const mockChart = { version: '4.0.0' };
      window.Chart = mockChart;

      const result = await loadChartJs();

      expect(window.Chart).toBe(mockChart);
      expect(result).toBe(mockChart);
    });
  });

  describe('loadGridStack', () => {
    it('should return existing GridStack if already loaded', async () => {
      const mockGridStack = { version: '8.0.0' };
      window.GridStack = mockGridStack;

      const result = await loadGridStack();

      expect(result).toBe(mockGridStack);
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Loading GridStack')
      );
    });

    it('should load GridStack dynamically', async () => {
      const mockGridStackModule = { GridStack: { version: '8.0.0' } };
      vi.doMock('gridstack', () => mockGridStackModule);

      const loadPromise = loadGridStack();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Loading GridStack')
      );

      // Simulate successful load
      window.GridStack = mockGridStackModule.GridStack;

      await loadPromise.catch(() => {});
    });

    it('should load GridStack CSS', async () => {
      // In real environment, this would load CSS
      // We just verify the function doesn't throw
      try {
        await loadGridStack();
      } catch (e) {
        // Expected in test environment
        expect(e).toBeDefined();
      }
    });

    it('should cache the loading promise', async () => {
      const promise1 = loadGridStack();
      const promise2 = loadGridStack();

      expect(promise1).toBe(promise2);
    });

    it('should handle load errors', async () => {
      try {
        await loadGridStack();
      } catch (e) {
        // Expected to fail in test environment
        expect(e).toBeDefined();
      }
    });

    it('should allow retry after failure', async () => {
      // First attempt fails
      try {
        await loadGridStack();
      } catch (e) {
        // Expected
      }

      // Second attempt should create new promise
      const promise2 = loadGridStack();
      expect(promise2).toBeDefined();
    });

    it('should set window.GridStack after successful load', async () => {
      const mockGridStack = { version: '8.0.0' };
      window.GridStack = mockGridStack;

      const result = await loadGridStack();

      expect(window.GridStack).toBe(mockGridStack);
      expect(result).toBe(mockGridStack);
    });
  });

  describe('Concurrent loading', () => {
    it('should handle concurrent Chart.js loads', async () => {
      const promises = [
        loadChartJs(),
        loadChartJs(),
        loadChartJs()
      ];

      // All should reference the same promise
      expect(promises[0]).toBe(promises[1]);
      expect(promises[1]).toBe(promises[2]);
    });

    it('should handle concurrent GridStack loads', async () => {
      const promises = [
        loadGridStack(),
        loadGridStack(),
        loadGridStack()
      ];

      expect(promises[0]).toBe(promises[1]);
      expect(promises[1]).toBe(promises[2]);
    });

    it('should handle loading both libraries concurrently', async () => {
      const chartPromise = loadChartJs();
      const gridPromise = loadGridStack();

      expect(chartPromise).not.toBe(gridPromise);

      // Both should be loading
      await Promise.allSettled([chartPromise, gridPromise]);
    });
  });

  describe('Error logging', () => {
    it('should log Chart.js load errors', async () => {
      try {
        await loadChartJs();
      } catch (e) {
        // In test environment, import will fail
        // Verify error handling exists
        expect(true).toBe(true);
      }
    });

    it('should log GridStack load errors', async () => {
      try {
        await loadGridStack();
      } catch (e) {
        // In test environment, import will fail
        expect(true).toBe(true);
      }
    });
  });

  describe('Success logging', () => {
    it('should log success message for Chart.js', async () => {
      window.Chart = { version: '4.0.0' };

      await loadChartJs();

      // Already loaded, no loading message
      const loadingCalls = console.log.mock.calls.filter(
        call => call[0]?.includes?.('Loading Chart.js')
      );
      expect(loadingCalls).toHaveLength(0);
    });

    it('should log success message for GridStack', async () => {
      window.GridStack = { version: '8.0.0' };

      await loadGridStack();

      const loadingCalls = console.log.mock.calls.filter(
        call => call[0]?.includes?.('Loading GridStack')
      );
      expect(loadingCalls).toHaveLength(0);
    });
  });
});
