/**
 * 动画管理服务
 * 负责全局动画配置和控制
 *
 * Requirements: 10.1, 10.2, 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { APP_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';

import { StorageService } from './storageService';
import {
  DEFAULT_ANIMATION_SETTINGS,
  SPEED_MULTIPLIERS,
  STORAGE_KEY,
  CONFIG_VERSION,
  ANIMATION_CLASSES,
  DATA_ATTRIBUTES,
} from '../config/animation-config';

import type {
  AnimationSettings,
  AnimationSpeed,
  AnimationCategory,
  StoredAnimationSettings,
} from '@/types/animation-types';

/**
 * 动画管理器类
 * 单例模式，管理全局动画配置
 */
export class AnimationManager {
  private settings: AnimationSettings;
  private static instance: AnimationManager | null = null;

  /**
   * 初始化动画管理器
   */
  constructor() {
    // 深拷贝默认配置
    this.settings = {
      ...DEFAULT_ANIMATION_SETTINGS,
      disabledCategories: new Set(DEFAULT_ANIMATION_SETTINGS.disabledCategories),
    };

    // 从localStorage加载配置
    this.loadSettings();

    // 应用初始配置
    this.applySettings();

    // 监听系统偏好变化
    this.observeSystemPreference();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  /**
   * 启用所有动画
   */
  enableAnimations(): void {
    this.settings.enabled = true;
    this.applySettings();
    this.saveSettings();
  }

  /**
   * 禁用所有动画
   */
  disableAnimations(): void {
    this.settings.enabled = false;
    this.applySettings();
    this.saveSettings();
  }

  /**
   * 设置动画速度
   * @param speed - 'fast' | 'normal' | 'slow'
   */
  setAnimationSpeed(speed: AnimationSpeed): void {
    this.settings.speed = speed;
    this.applySettings();
    this.saveSettings();
  }

  /**
   * 禁用特定类别的动画
   * @param category - 动画类别
   */
  disableCategory(category: AnimationCategory): void {
    this.settings.disabledCategories.add(category);
    this.applySettings();
    this.saveSettings();
  }

  /**
   * 启用特定类别的动画
   * @param category - 动画类别
   */
  enableCategory(category: AnimationCategory): void {
    this.settings.disabledCategories.delete(category);
    this.applySettings();
    this.saveSettings();
  }

  /**
   * 获取当前配置
   */
  getSettings(): Readonly<AnimationSettings> {
    return {
      ...this.settings,
      disabledCategories: new Set(this.settings.disabledCategories),
    };
  }

  /**
   * 保存配置到localStorage
   */
  saveSettings(): void {
    try {
      const storedSettings: StoredAnimationSettings = {
        version: CONFIG_VERSION,
        enabled: this.settings.enabled,
        speed: this.settings.speed,
        disabledCategories: Array.from(this.settings.disabledCategories),
        respectSystemPreference: this.settings.respectSystemPreference,
        lastUpdated: Date.now(),
      };

      StorageService.set(STORAGE_KEY, storedSettings);
    } catch (error) {
      console.error('Failed to save animation settings:', error as Error);
    }
  }

  /**
   * 从localStorage加载配置
   */
  loadSettings(): void {
    try {
      const storedSettings = StorageService.get<StoredAnimationSettings>(STORAGE_KEY);
      if (!storedSettings) {
        return;
      }

      // 验证版本号
      if (storedSettings.version !== CONFIG_VERSION) {
        return;
      }

      // 恢复配置
      this.settings.enabled = storedSettings.enabled;
      this.settings.speed = storedSettings.speed;
      // 验证并过滤有效的动画类别
      const validCategories: AnimationCategory[] = [
        'button',
        'card',
        'toast',
        'modal',
        'list',
        'form',
        'loading',
        'navigation',
      ];
      const filteredCategories = storedSettings.disabledCategories.filter(
        (cat): cat is AnimationCategory => validCategories.includes(cat as AnimationCategory)
      );
      this.settings.disabledCategories = new Set(filteredCategories);
      this.settings.respectSystemPreference = storedSettings.respectSystemPreference;
    } catch (error) {
      console.error('Failed to load animation settings:', error as Error);
      // 加载失败时使用默认配置
    }
  }

  /**
   * 检查是否应该减少动画
   * 考虑用户配置和系统偏好
   */
  shouldReduceMotion(): boolean {
    // 如果全局禁用动画，返回true
    if (!this.settings.enabled) {
      return true;
    }

    // 如果尊重系统偏好，检查prefers-reduced-motion
    if (this.settings.respectSystemPreference) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查特定类别的动画是否启用
   * @param category - 动画类别
   */
  isCategoryEnabled(category: AnimationCategory): boolean {
    if (this.shouldReduceMotion()) {
      return false;
    }
    return !this.settings.disabledCategories.has(category);
  }

  /**
   * 应用当前配置到DOM
   */
  private applySettings(): void {
    const root = document.documentElement;

    // 应用全局动画开关
    if (this.shouldReduceMotion()) {
      root.setAttribute(DATA_ATTRIBUTES.animations, 'disabled');
      root.style.setProperty('--animations-enabled', '0');
    } else {
      root.setAttribute(DATA_ATTRIBUTES.animations, 'enabled');
      root.style.setProperty('--animations-enabled', '1');
    }

    // 应用速度设置
    root.setAttribute(DATA_ATTRIBUTES.animationSpeed, this.settings.speed);
    const speedMultiplier = SPEED_MULTIPLIERS[this.settings.speed];
    root.style.setProperty('--animation-speed-multiplier', speedMultiplier.toString());

    // 应用分类控制
    this.applyCategoryClasses();

    // 触发设置变化事件
    this.dispatchSettingsChangedEvent();
  }

  /**
   * 应用分类控制类名
   */
  private applyCategoryClasses(): void {
    const root = document.documentElement;

    // 定义类别到CSS类名的映射
    const categoryClassMap: Record<AnimationCategory, string> = {
      button: ANIMATION_CLASSES.noButtonAnimations,
      card: ANIMATION_CLASSES.noCardAnimations,
      toast: ANIMATION_CLASSES.noToastAnimations,
      modal: ANIMATION_CLASSES.noModalAnimations,
      list: ANIMATION_CLASSES.noListAnimations,
      form: ANIMATION_CLASSES.noFormAnimations,
      loading: ANIMATION_CLASSES.noLoadingAnimations,
      navigation: ANIMATION_CLASSES.noNavigationAnimations,
    };

    // 遍历所有类别
    Object.entries(categoryClassMap).forEach(([category, className]) => {
      if (this.settings.disabledCategories.has(category as AnimationCategory)) {
        root.classList.add(className);
      } else {
        root.classList.remove(className);
      }
    });
  }

  /**
   * 监听系统偏好变化
   */
  private observeSystemPreference(): void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // 监听变化
    const handleChange = () => {
      if (this.settings.respectSystemPreference) {
        this.applySettings();
      }
    };

    // 使用addEventListener（现代浏览器）
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // 降级支持（旧版浏览器）
      mediaQuery.addListener(handleChange);
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults(): void {
    this.settings = {
      ...DEFAULT_ANIMATION_SETTINGS,
      disabledCategories: new Set(DEFAULT_ANIMATION_SETTINGS.disabledCategories),
    };
    this.applySettings();
    this.saveSettings();
  }

  /**
   * 设置是否尊重系统偏好
   * @param respect - 是否尊重
   */
  setRespectSystemPreference(respect: boolean): void {
    this.settings.respectSystemPreference = respect;
    this.applySettings();
    this.saveSettings();
  }

  /**
   * 销毁管理器
   * 清理资源
   */
  destroy(): void {
    AnimationManager.instance = null;
  }

  /**
   * 触发设置变化事件
   * 通知其他模块动画设置已更改
   */
  private dispatchSettingsChangedEvent(): void {
    const settings = this.getSettings();
    eventBus.emit(APP_EVENTS.ANIMATION_SETTINGS_CHANGED, {
      enabled: settings.enabled,
      reducedMotion: this.shouldReduceMotion(),
      speed: settings.speed,
      disabledCategories: Array.from(settings.disabledCategories),
    });
  }
}

/**
 * 导出单例实例
 */
export const animationManager = AnimationManager.getInstance();
