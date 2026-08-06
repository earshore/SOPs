import { afterEach, describe, expect, it } from 'vitest';
import { ColorContext } from './ColorContext';

describe('ColorContext', () => {
  afterEach(() => {
    ColorContext.clearCache();
    // Reset legacy global write channel without relying on production callers.
    ColorContext.setModuleColor('blue');
  });

  it('infers module ownership color from menuConfig themeColor', () => {
    expect(ColorContext.inferColorFromModule('sops')).toBe('indigo');
    expect(ColorContext.inferColorFromModule('keyword_hunter')).toBe('fuchsia');
    expect(ColorContext.inferColorFromModule('home')).toBe('slate');
    expect(ColorContext.inferColorFromModule('ppc_tools')).toBe('emerald');
  });

  it('falls back to blue for unknown modules', () => {
    expect(ColorContext.inferColorFromModule('does_not_exist')).toBe('blue');
  });

  it('keeps deprecated setModuleColor as legacy write for getModuleColor / onThemeChange', () => {
    const seen: string[] = [];
    const unsubscribe = ColorContext.onThemeChange(color => {
      seen.push(color);
    });

    ColorContext.setModuleColor('emerald');

    expect(ColorContext.getModuleColor()).toBe('emerald');
    expect(seen).toEqual(['emerald']);

    unsubscribe();
  });

  it('does not couple inferColorFromModule to the global setModuleColor channel', () => {
    ColorContext.setModuleColor('cyan');

    // Ownership remains menu-driven; global write must not rewrite infer results.
    expect(ColorContext.inferColorFromModule('ppc_tools')).toBe('emerald');
    expect(ColorContext.getModuleColor()).toBe('cyan');
  });
});
