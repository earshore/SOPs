/**
 * 主题配置中心
 * 管理应用的主题系统，支持运行时主题切换
 */

import type { ColorSchemeName } from '../constants/colorSchemes';
import { ColorContext } from '../utils/ColorContext';
import { StorageService } from '../../services/storageService';
import eventBus from '../EventBus';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description?: string;
  colorScheme: ColorSchemeName;
  customVars?: Record<string, string>;
  darkMode?: boolean;
}

/**
 * 预设主题配置
 */
export const THEME_PRESETS: Record<string, ThemeConfig> = {
  default: {
    id: 'default',
    name: '默认主题',
    description: '经典蓝色主题，适合商务场景',
    colorScheme: 'blue'
  },
  ocean: {
    id: 'ocean',
    name: '海洋主题',
    description: '清新的青色调，营造宁静氛围',
    colorScheme: 'cyan'
  },
  sunset: {
    id: 'sunset',
    name: '日落主题',
    description: '温暖的橙色调，充满活力',
    colorScheme: 'orange'
  },
  forest: {
    id: 'forest',
    name: '森林主题',
    description: '自然的绿色调，舒适护眼',
    colorScheme: 'green'
  },
  purple: {
    id: 'purple',
    name: '紫罗兰主题',
    description: '优雅的紫色调，彰显品味',
    colorScheme: 'purple'
  },
  rose: {
    id: 'rose',
    name: '玫瑰主题',
    description: '浪漫的粉色调，温柔细腻',
    colorScheme: 'rose'
  }
};

/**
 * 主题管理器
 */
export class ThemeManager {
  private static currentTheme: string = 'default';
  private static customThemes: Map<string, ThemeConfig> = new Map();
  
  /**
   * 应用主题
   */
  static applyTheme(themeId: string, options: { animate?: boolean } = {}): void {
    const theme = this.getTheme(themeId);
    if (!theme) {
      console.error(`主题不存在: ${themeId}`);
      return;
    }
    
    const { animate = true } = options;
    const root = document.documentElement;
    
    // 添加过渡动画
    if (animate) {
      root.style.setProperty('--theme-transition-duration', '200ms');
    }
    
    // 应用颜色方案
    ColorContext.setModuleColor(theme.colorScheme);
    
    // 更新CSS变量
    const colorVars = this.getColorVars(theme.colorScheme);
    Object.entries(colorVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // 应用自定义变量
    if (theme.customVars) {
      Object.entries(theme.customVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }
    
    // 更新data属性
    root.dataset.theme = themeId;
    
    // 持久化
    StorageService.set('app-theme', themeId);
    this.currentTheme = themeId;
    
    // 移除过渡
    if (animate) {
      setTimeout(() => {
        root.style.removeProperty('--theme-transition-duration');
      }, 200);
    }
    
    // 性能监控
    const windowWithPerf = window as unknown as Record<string, unknown>;
    if (windowWithPerf.__CSS_PERF__) {
      const cssPerf = windowWithPerf.__CSS_PERF__ as { trackThemeSwitch: (from: string, to: string) => void };
      cssPerf.trackThemeSwitch(this.currentTheme, themeId);
    }
    
    // 触发事件
    eventBus.emit('theme-changed', { themeId, theme });
  }
  
  /**
   * 获取颜色变量
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
    return [
      ...Object.values(THEME_PRESETS),
      ...Array.from(this.customThemes.values())
    ];
  }
  
  /**
   * 获取当前主题
   */
  static getCurrentTheme(): string {
    return this.currentTheme;
  }
  
  /**
   * 从本地存储恢复主题
   */
  static restoreTheme(): void {
    const savedTheme = StorageService.get<string>('app-theme', null);
    if (savedTheme && this.getTheme(savedTheme)) {
      this.applyTheme(savedTheme, { animate: false });
    }
  }
  
  /**
   * 预览主题（不应用）
   */
  static previewTheme(themeId: string): ThemeColors | null {
    const theme = this.getTheme(themeId);
    if (!theme) return null;
    
    const root = document.documentElement;
    const style = getComputedStyle(root);
    
    return {
      primary: style.getPropertyValue(`--color-${theme.colorScheme}-500`),
      primaryLight: style.getPropertyValue(`--color-${theme.colorScheme}-100`),
      primaryDark: style.getPropertyValue(`--color-${theme.colorScheme}-700`),
      secondary: style.getPropertyValue('--color-secondary'),
      accent: style.getPropertyValue('--color-accent'),
      success: style.getPropertyValue('--color-success'),
      warning: style.getPropertyValue('--color-warning'),
      error: style.getPropertyValue('--color-error'),
      info: style.getPropertyValue('--color-info')
    };
  }
}

// 初始化时恢复主题
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.restoreTheme();
  });
}
