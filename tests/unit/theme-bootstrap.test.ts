import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const bootstrapSource = readFileSync(
  resolve(process.cwd(), 'public/theme-bootstrap.js'),
  'utf8'
);

function runBootstrap(): void {
  // Evaluate the blocking pre-paint IIFE in the current jsdom context.
  // Source is a checked-in local file without imports (T1-2 FOUC contract).
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  new Function(bootstrapSource)();
}

function resetRoot(): void {
  const root = document.documentElement;
  root.removeAttribute('data-theme-ready');
  root.removeAttribute('data-color-mode');
  root.removeAttribute('data-color-mode-resolved');
  root.classList.remove('dark');
  root.style.colorScheme = '';
}

describe('theme-bootstrap (T1-2 FOUC)', () => {
  beforeEach(() => {
    resetRoot();
    localStorage.clear();
  });

  afterEach(() => {
    resetRoot();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('defaults to light and sets colorScheme style without indigo', () => {
    runBootstrap();

    const root = document.documentElement;
    expect(root.getAttribute('data-theme-ready')).toBe('0');
    expect(root.getAttribute('data-color-mode')).toBe('light');
    expect(root.getAttribute('data-color-mode-resolved')).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.style.colorScheme).toBe('light');
    expect(root.getAttribute('style') ?? '').not.toMatch(/indigo/i);
  });

  it('applies JSON-stringified dark preference with colorScheme dark', () => {
    localStorage.setItem('app-color-mode', JSON.stringify('dark'));

    runBootstrap();

    const root = document.documentElement;
    expect(root.getAttribute('data-color-mode')).toBe('dark');
    expect(root.getAttribute('data-color-mode-resolved')).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
  });

  it('accepts plain string dark storage and resolves system via matchMedia', () => {
    localStorage.setItem('app-color-mode', 'dark');
    runBootstrap();
    expect(document.documentElement.style.colorScheme).toBe('dark');

    resetRoot();
    localStorage.setItem('app-color-mode', JSON.stringify('system'));
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    });
    vi.stubGlobal('matchMedia', matchMedia);

    runBootstrap();

    expect(document.documentElement.getAttribute('data-color-mode')).toBe('system');
    expect(document.documentElement.getAttribute('data-color-mode-resolved')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });
});
