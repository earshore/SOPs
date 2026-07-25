/**
 * Appearance theme runtime (Layer A) — ThemeManager SSOT.
 *
 * A2 dual-layer model (see docs/THEME_SYSTEM_GUIDELINES.md §2.2):
 *   1. Semantic status colors (success / warning / error / info) — not Appearance
 *   2. Module ownership (menuConfig / wb-theme-* / ColorContext.infer) — not Appearance
 *   3. Appearance primary / focus (this file) — user-selectable presets
 *   4. Neutral surface / text / border
 *
 * Runtime contract:
 * - Unique Appearance API: ThemeManager (no parallel themes.ts).
 * - Persistence key: `app-theme` (StorageService).
 * - applyTheme writes only global primary-family (+ optional focus) CSS vars and
 *   `document.documentElement.dataset.theme` (= appearance id).
 * - applyTheme MUST NOT call ColorContext.setModuleColor or rewrite module ownership.
 *
 * Caveat (debt D3): `data-theme` currently carries the Appearance preset id and is
 * also used by dark-mode selectors (`[data-theme='dark']`). Appearance apply can
 * clobber dark. Phase 1 should split `data-appearance` + `data-color-mode`.
 *
 * Debt D10: preview / types only promise primary-family + focus — not secondary
 * or status colors. Those live outside Appearance control.
 */

import type { ColorSchemeName } from '../constants/colorSchemes';
import { updateRuntimeCssRule } from '../utils/runtimeStyles';
import { StorageService } from '@/services/storageService';
import eventBus from '../EventBus';

/**
 * Colors actually controlled / previewed by Appearance (Layer A).
 * Matches getColorVars + optional customVars (`--color-focus-ring` on some presets).
 *
 * Does **not** include secondary, accent, or status colors — ThemeManager never
 * switches those (debt D10).
 */
export interface AppearanceThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryDarker: string;
  /**
   * Resolved focus ring. Only set by presets that include `--color-focus-ring`
   * in customVars (e.g. minimal); otherwise the current document value (or empty).
   */
  focusRing: string;
}

/**
 * @deprecated Use `AppearanceThemeColors`. Alias kept so existing imports keep
 * compiling while callers migrate off the old over-broad name.
 *
 * Historical `ThemeColors` listed secondary/accent/success/warning/error/info, but
 * Appearance never applied them. Prefer `AppearanceThemeColors` for new code.
 */
export type ThemeColors = AppearanceThemeColors;

export interface ThemeConfig {
  id: string;
  name: string;
  description?: string;
  colorScheme: ColorSchemeName;
  /** Optional CSS var overrides; Appearance-safe keys are primary* / focus-ring. */
  customVars?: Record<string, string>;
  darkMode?: boolean;
}

/**
 * 预设主题配置（Appearance presets only — Layer A）
 */
export const THEME_PRESETS: Record<string, ThemeConfig> = {
  default: {
    id: 'default',
    name: '默认',
    description: '经典蓝色主色，适合通用商务工作台',
    colorScheme: 'blue',
  },
  minimal: {
    id: 'minimal',
    name: '极简素色',
    description:
      '工业中性主色，低刺激、高对比，适合长时间运营作业；仅调整全局主色 token，不改变模块归属与页面 banner',
    colorScheme: 'slate',
    customVars: {
      '--color-primary': 'var(--color-slate-700)',
      '--color-primary-light': 'var(--color-slate-100)',
      '--color-primary-dark': 'var(--color-slate-800)',
      '--color-primary-darker': 'var(--color-slate-900)',
      '--color-focus-ring': 'var(--color-slate-700)',
    },
  },
  ocean: {
    id: 'ocean',
    name: '海洋',
    description: '青色主色，偏清爽的全局强调',
    colorScheme: 'cyan',
  },
  forest: {
    id: 'forest',
    name: '森林',
    description: '绿色主色，偏自然的全局强调',
    colorScheme: 'green',
  },
  sunset: {
    id: 'sunset',
    name: '日落',
    description: '橙色主色，偏暖的全局强调',
    colorScheme: 'orange',
  },
  purple: {
    id: 'purple',
    name: '紫罗兰',
    description: '紫色主色，偏沉稳的全局强调',
    colorScheme: 'purple',
  },
  rose: {
    id: 'rose',
    name: '玫瑰',
    description: '玫红主色，偏醒目的全局强调',
    colorScheme: 'rose',
  },
};

/**
 * 主题管理器 — Appearance-only runtime.
 * Does not own module colors, status colors, or color-mode (dark).
 */
export class ThemeManager {
  private static currentTheme: string = 'default';
  private static customThemes: Map<string, ThemeConfig> = new Map();

  /**
   * Apply an Appearance preset.
   * Writes primary-family (+ optional focus) CSS vars and data-theme = appearance id.
   * Does **not** call ColorContext.setModuleColor (A2 / Layer B remains ownership-only).
   * Persistence: StorageService key `app-theme`.
   *
   * Note (D3): overwriting data-theme can clear a concurrent dark-mode marker.
   */
  static applyTheme(themeId: string, options: { animate?: boolean } = {}): void {
    const theme = this.getTheme(themeId);
    if (!theme) {
      console.error(`主题不存在: ${themeId}`);
      return;
    }

    const { animate = true } = options;
    const previousTheme = this.currentTheme;
    const root = document.documentElement;

    // 更新CSS变量（primary 族 + customVars；不含状态色 / 模块色）
    const colorVars: Record<string, string> = this.getColorVars(theme.colorScheme);

    // 应用自定义变量
    if (theme.customVars) {
      Object.entries(theme.customVars).forEach(([key, value]) => {
        colorVars[key] = value;
      });
    }

    // 更新data属性（appearance id；D3: shared with dark until Phase 1 split）
    root.dataset.theme = themeId;
    const themeSelector = getThemeSelector(themeId);
    updateRuntimeCssRule('theme-manager-vars', themeSelector, {
      ...colorVars,
      ...(animate ? { '--theme-transition-duration': '200ms' } : {}),
    });

    // 持久化
    StorageService.set('app-theme', themeId);
    this.currentTheme = themeId;

    // 移除过渡
    if (animate) {
      setTimeout(() => {
        updateRuntimeCssRule('theme-manager-vars', themeSelector, colorVars);
      }, 200);
    }

    // 性能监控
    const windowWithPerf = window as unknown as Record<string, unknown>;
    if (windowWithPerf.__CSS_PERF__) {
      const cssPerf = windowWithPerf.__CSS_PERF__ as {
        trackThemeSwitch: (from: string, to: string) => void;
      };
      cssPerf.trackThemeSwitch(previousTheme, themeId);
    }

    // 触发事件
    eventBus.emit('theme-changed', { themeId, theme });
  }

  /**
   * Primary-family CSS vars for a color scheme (Appearance write surface).
   * Status / secondary / accent tokens are intentionally omitted.
   */
  private static getColorVars(colorScheme: ColorSchemeName): Record<string, string> {
    return {
      '--color-primary': `var(--color-${colorScheme}-500)`,
      '--color-primary-light': `var(--color-${colorScheme}-100)`,
      '--color-primary-dark': `var(--color-${colorScheme}-700)`,
      '--color-primary-darker': `var(--color-${colorScheme}-900)`,
    };
  }

  /**
   * 注册自定义主题
   */
  static registerTheme(config: ThemeConfig): void {
    this.customThemes.set(config.id, config);
  }

  /**
   * 获取主题
   */
  static getTheme(themeId: string): ThemeConfig | undefined {
    return THEME_PRESETS[themeId] || this.customThemes.get(themeId);
  }

  /**
   * 获取所有主题
   */
  static getAllThemes(): ThemeConfig[] {
    return [...Object.values(THEME_PRESETS), ...Array.from(this.customThemes.values())];
  }

  /**
   * 获取当前主题
   */
  static getCurrentTheme(): string {
    return this.currentTheme;
  }

  /**
   * 从本地存储恢复主题（key: `app-theme`）
   */
  static restoreTheme(): void {
    const savedTheme = StorageService.get<string>('app-theme', null);
    if (savedTheme && this.getTheme(savedTheme)) {
      this.applyTheme(savedTheme, { animate: false });
    }
  }

  /**
   * Preview Appearance colors without applying.
   * Uses the same getColorVars + customVars merge as applyTheme.
   * Returns only primary-family + focus (AppearanceThemeColors) — not status colors.
   */
  static previewTheme(themeId: string): AppearanceThemeColors | null {
    const theme = this.getTheme(themeId);
    if (!theme) return null;

    const root = document.documentElement;
    const style = getComputedStyle(root);
    const colorVars: Record<string, string> = {
      ...this.getColorVars(theme.colorScheme),
      ...(theme.customVars ?? {}),
    };

    const focusDeclaration = colorVars['--color-focus-ring'];
    const focusRing = focusDeclaration
      ? resolveCssColorToken(style, focusDeclaration)
      : style.getPropertyValue('--color-focus-ring').trim();

    return {
      primary: resolveCssColorToken(style, colorVars['--color-primary']),
      primaryLight: resolveCssColorToken(style, colorVars['--color-primary-light']),
      primaryDark: resolveCssColorToken(style, colorVars['--color-primary-dark']),
      primaryDarker: resolveCssColorToken(style, colorVars['--color-primary-darker']),
      focusRing,
    };
  }
}

/**
 * Resolve a theme color declaration to a concrete computed value.
 * Supports `var(--token)` references used by getColorVars / customVars.
 */
function resolveCssColorToken(style: CSSStyleDeclaration, declaration: string | undefined): string {
  if (!declaration) {
    return '';
  }
  const trimmed = declaration.trim();
  const varMatch = trimmed.match(/^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,[^)]*)?\)$/);
  if (varMatch?.[1]) {
    return style.getPropertyValue(varMatch[1]).trim();
  }
  return trimmed;
}

function getThemeSelector(themeId: string): string {
  return `:root[data-theme="${themeId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
}

// 初始化时恢复主题
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.restoreTheme();
  });
}
