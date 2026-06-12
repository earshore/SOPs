import { describe, expect, it } from 'vitest';
import {
  MODULE_CSS_REGISTRY,
  getModuleAllCssImporters,
  getModuleCssConfig,
  getModulesByPriority,
  getPreloadModules,
} from '@/common/config/moduleCssRegistry';

describe('moduleCssRegistry', () => {
  it('returns a module CSS config by module id', () => {
    expect(getModuleCssConfig('home')).toMatchObject({
      moduleId: 'home',
      priority: 'high',
      preload: true,
    });
    expect(getModuleCssConfig('missing')).toBeUndefined();
  });

  it('lists only modules marked for preload', () => {
    const preloadModules = getPreloadModules();

    expect(preloadModules.map((config) => config.moduleId)).toEqual(['home', 'app_center', 'sops']);
    expect(preloadModules.every((config) => config.preload)).toBe(true);
  });

  it('filters modules by priority without changing registry order', () => {
    expect(getModulesByPriority('high').map((config) => config.moduleId)).toEqual([
      'home',
      'app_center',
      'sops',
    ]);
    expect(getModulesByPriority('low').map((config) => config.moduleId)).toEqual(['prompts']);
  });

  it('returns the main CSS importer plus dependency importers', () => {
    const importers = getModuleAllCssImporters('keyword_hunter');

    expect(importers).toHaveLength(3);
    expect(importers.every((importer) => typeof importer === 'function')).toBe(true);
  });

  it('returns an empty importer list for unknown modules', () => {
    expect(getModuleAllCssImporters('missing')).toEqual([]);
  });

  it('keeps registry keys aligned with their module ids', () => {
    for (const [key, config] of Object.entries(MODULE_CSS_REGISTRY)) {
      expect(config.moduleId).toBe(key);
    }
  });
});
