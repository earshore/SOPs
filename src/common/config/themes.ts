// src/common/config/themes.ts
// ================================================================
// 🎯 主题配置中心
// 统一管理所有颜色主题，支持动态切换和用户自定义
// ================================================================

import { StorageService } from '@services/storageService';

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  /** 主色 */
  primary: string;
  /** 主色悬停 */
  primaryHover: string;
  /** 主色激活 */
  primaryActive: string;
  /** 浅色背景 */
  light: string;
  /** 边框色 */
  border: string;
  /** 文字色 */
  text: string;
}

/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 主题ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 颜色配置 */
  colors: ThemeColors;
  /** TailwindCSS类名前缀 */
  tailwindPrefix: string;
}

/**
 * 预定义主题配置
 */
export const THEMES: Record<string, ThemeConfig> = {
  blue: {
    id: 'blue',
    name: '蓝色',
    tailwindPrefix: 'blue',
    colors: {
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      primaryActive: '#1D4ED8',
      light: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1E40AF',
    },
  },
  indigo: {
    id: 'indigo',
    name: '靛蓝',
    tailwindPrefix: 'indigo',
    colors: {
      primary: '#6366F1',
      primaryHover: '#4F46E5',
      primaryActive: '#4338CA',
      light: '#EEF2FF',
      border: '#C7D2FE',
      text: '#3730A3',
    },
  },
  purple: {
    id: 'purple',
    name: '紫色',
    tailwindPrefix: 'purple',
    colors: {
      primary: '#A855F7',
      primaryHover: '#9333EA',
      primaryActive: '#7E22CE',
      light: '#FAF5FF',
      border: '#E9D5FF',
      text: '#6B21A8',
    },
  },
  fuchsia: {
    id: 'fuchsia',
    name: '紫红',
    tailwindPrefix: 'fuchsia',
    colors: {
      primary: '#D946EF',
      primaryHover: '#C026D3',
      primaryActive: '#A21CAF',
      light: '#FDF4FF',
      border: '#F5D0FE',
      text: '#86198F',
    },
  },
  emerald: {
    id: 'emerald',
    name: '翠绿',
    tailwindPrefix: 'emerald',
    colors: {
      primary: '#10B981',
      primaryHover: '#059669',
      primaryActive: '#047857',
      light: '#ECFDF5',
      border: '#A7F3D0',
      text: '#065F46',
    },
  },
  green: {
    id: 'green',
    name: '绿色',
    tailwindPrefix: 'green',
    colors: {
      primary: '#22C55E',
      primaryHover: '#16A34A',
      primaryActive: '#15803D',
      light: '#F0FDF4',
      border: '#BBF7D0',
      text: '#166534',
    },
  },
  teal: {
    id: 'teal',
    name: '青色',
    tailwindPrefix: 'teal',
    colors: {
      primary: '#14B8A6',
      primaryHover: '#0D9488',
      primaryActive: '#0F766E',
      light: '#F0FDFA',
      border: '#99F6E4',
      text: '#115E59',
    },
  },
  amber: {
    id: 'amber',
    name: '琥珀',
    tailwindPrefix: 'amber',
    colors: {
      primary: '#F59E0B',
      primaryHover: '#D97706',
      primaryActive: '#B45309',
      light: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
    },
  },
  orange: {
    id: 'orange',
    name: '橙色',
    tailwindPrefix: 'orange',
    colors: {
      primary: '#F97316',
      primaryHover: '#EA580C',
      primaryActive: '#C2410C',
      light: '#FFF7ED',
      border: '#FED7AA',
      text: '#9A3412',
    },
  },
  red: {
    id: 'red',
    name: '红色',
    tailwindPrefix: 'red',
    colors: {
      primary: '#EF4444',
      primaryHover: '#DC2626',
      primaryActive: '#B91C1C',
      light: '#FEF2F2',
      border: '#FECACA',
      text: '#991B1B',
    },
  },
  violet: {
    id: 'violet',
    name: '紫罗兰',
    tailwindPrefix: 'violet',
    colors: {
      primary: '#8B5CF6',
      primaryHover: '#7C3AED',
      primaryActive: '#6D28D9',
      light: '#F5F3FF',
      border: '#DDD6FE',
      text: '#5B21B6',
    },
  },
  lime: {
    id: 'lime',
    name: '青柠',
    tailwindPrefix: 'lime',
    colors: {
      primary: '#84CC16',
      primaryHover: '#65A30D',
      primaryActive: '#4D7C0F',
      light: '#F7FEE7',
      border: '#D9F99D',
      text: '#3F6212',
    },
  },
};

/**
 * 默认主题
 */
export const DEFAULT_THEME = THEMES.blue;

/**
 * 获取主题配置
 */
export function getTheme(themeId: string): ThemeConfig | undefined {
  return THEMES[themeId];
}

/**
 * 获取主题配置（带默认值）
 */
export function getThemeOrDefault(themeId: string): ThemeConfig {
  const fallbackTheme = THEMES.blue;
  if (!fallbackTheme) {
    throw new Error('[themes] Default blue theme is not configured');
  }
  return THEMES[themeId] || fallbackTheme;
}

/**
 * 获取所有主题列表
 */
export function getAllThemes(): ThemeConfig[] {
  return Object.values(THEMES);
}

/**
 * 应用主题到DOM
 */
export function applyTheme(themeId: string): void {
  const theme = getThemeOrDefault(themeId);
  const root = document.documentElement;
  
  // 设置CSS变量
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-primary-hover', theme.colors.primaryHover);
  root.style.setProperty('--theme-primary-active', theme.colors.primaryActive);
  root.style.setProperty('--theme-light', theme.colors.light);
  root.style.setProperty('--theme-border', theme.colors.border);
  root.style.setProperty('--theme-text', theme.colors.text);
  
  // 设置data属性（用于TailwindCSS）
  root.setAttribute('data-theme', themeId);
}

/**
 * 从localStorage加载主题
 */
export function loadThemeFromStorage(): string {
  try {
    const theme = StorageService.get<string>('app_theme', null);
    return theme || 'blue';
  } catch (e) {
    return 'blue';
  }
}

/**
 * 保存主题到localStorage
 */
export function saveThemeToStorage(themeId: string): void {
  try {
    StorageService.set('app_theme', themeId);
  } catch {
    // Theme persistence is optional; the active theme has already been applied.
  }
}

export default THEMES;
