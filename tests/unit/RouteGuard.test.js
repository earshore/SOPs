import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RouteGuardManager, createAuthGuard, createPreloadGuard, createValidationGuard } from '@/common/router/RouteGuard.ts';

describe('RouteGuard', () => {
  let guardManager;

  beforeEach(() => {
    guardManager = new RouteGuardManager();
  });

  describe('RouteGuardManager', () => {
    it('should add guard', () => {
      const guard = vi.fn((to, from, next) => next(true));
      guardManager.addGuard(guard);
      
      expect(guardManager.getGuardCount()).toBe(1);
    });

    it('should remove guard', () => {
      const guard = vi.fn((to, from, next) => next(true));
      guardManager.addGuard(guard);
      
      const removed = guardManager.removeGuard(guard);
      
      expect(removed).toBe(true);
      expect(guardManager.getGuardCount()).toBe(0);
    });

    it('should run all guards', async () => {
      const guard1 = vi.fn((to, from, next) => next(true));
      const guard2 = vi.fn((to, from, next) => next(true));
      
      guardManager.addGuard(guard1);
      guardManager.addGuard(guard2);
      
      const to = { path: '/test' };
      const from = { path: '/home' };
      
      const result = await guardManager.runGuards(to, from);
      
      expect(result).toBe(true);
      expect(guard1).toHaveBeenCalled();
      expect(guard2).toHaveBeenCalled();
    });

    it('should block navigation when guard returns false', async () => {
      const guard = vi.fn((to, from, next) => next(false));
      guardManager.addGuard(guard);
      
      const to = { path: '/test' };
      const from = { path: '/home' };
      
      const result = await guardManager.runGuards(to, from);
      
      expect(result).toBe(false);
    });

    it('should stop at first blocking guard', async () => {
      const guard1 = vi.fn((to, from, next) => next(false));
      const guard2 = vi.fn((to, from, next) => next(true));
      
      guardManager.addGuard(guard1);
      guardManager.addGuard(guard2);
      
      const to = { path: '/test' };
      const from = { path: '/home' };
      
      const result = await guardManager.runGuards(to, from);
      
      expect(result).toBe(false);
      expect(guard1).toHaveBeenCalled();
      expect(guard2).not.toHaveBeenCalled();
    });

    it('should handle guard errors', async () => {
      const guard = vi.fn(() => {
        throw new Error('Guard error');
      });
      guardManager.addGuard(guard);
      
      const to = { path: '/test' };
      const from = { path: '/home' };
      
      const result = await guardManager.runGuards(to, from);
      
      expect(result).toBe(false);
    });

    it('should clear all guards', () => {
      guardManager.addGuard(vi.fn());
      guardManager.addGuard(vi.fn());
      
      guardManager.clearGuards();
      
      expect(guardManager.getGuardCount()).toBe(0);
    });
  });

  describe('createAuthGuard', () => {
    it('should allow navigation when authenticated', async () => {
      const isAuthenticated = vi.fn(() => true);
      const guard = createAuthGuard(isAuthenticated);
      
      const to = { path: '/test', meta: { requiresAuth: true } };
      const from = { path: '/home' };
      
      const result = await new Promise(resolve => {
        guard(to, from, resolve);
      });
      
      expect(result).toBe(true);
      expect(isAuthenticated).toHaveBeenCalled();
    });

    it('should block navigation when not authenticated', async () => {
      const isAuthenticated = vi.fn(() => false);
      const guard = createAuthGuard(isAuthenticated);
      
      const to = { path: '/test', meta: { requiresAuth: true } };
      const from = { path: '/home' };
      
      const result = await new Promise(resolve => {
        guard(to, from, resolve);
      });
      
      expect(result).toBe(false);
    });

    it('should allow navigation when auth not required', async () => {
      const isAuthenticated = vi.fn(() => false);
      const guard = createAuthGuard(isAuthenticated);
      
      const to = { path: '/test', meta: {} };
      const from = { path: '/home' };
      
      const result = await new Promise(resolve => {
        guard(to, from, resolve);
      });
      
      expect(result).toBe(true);
    });
  });

  describe('createPreloadGuard', () => {
    it('should preload data before navigation', async () => {
      const preload = vi.fn().mockResolvedValue(undefined);
      const guard = createPreloadGuard();
      
      const to = { path: '/test', meta: { preload } };
      const from = { path: '/home' };
      
      const result = await new Promise(resolve => {
        guard(to, from, resolve);
      });
      
      expect(result).toBe(true);
      expect(preload).toHaveBeenCalled();
    });

    it('should block navigation when preload fails', async () => {
      const preload = vi.fn().mockRejectedValue(new Error('Preload failed'));
      const guard = createPreloadGuard();
      
      const to = { path: '/test', meta: { preload } };
      const from = { path: '/home' };
      
      const result = await new Promise(resolve => {
        guard(to, from, resolve);
      });
      
      expect(result).toBe(false);
    });

    it('should allow navigation when no preload', async () => {
      const guard = createPreloadGuard();
      
      const to = { path: '/test', meta: {} };
      const from = { path: '/home' };
      
      const result = await new Promise(resolve => {
        guard(to, from, resolve);
      });
      
      expect(result).toBe(true);
    });
  });

  describe('createValidationGuard', () => {
    it('should allow navigation for valid route', async () => {
      const validateRoute = vi.fn(() => true);
      const guard = createValidationGuard(validateRoute);
      
      const to = { path: '/test' };
      const from = { path: '/home' };
      
      const result = await new Promise(resolve => {
        guard(to, from, resolve);
      });
      
      expect(result).toBe(true);
      expect(validateRoute).toHaveBeenCalledWith('/test');
    });

    it('should block navigation for invalid route', async () => {
      const validateRoute = vi.fn(() => false);
      const guard = createValidationGuard(validateRoute);
      
      const to = { path: '/invalid' };
      const from = { path: '/home' };
      
      const result = await new Promise(resolve => {
        guard(to, from, resolve);
      });
      
      expect(result).toBe(false);
    });
  });
});
