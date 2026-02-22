/**
 * 动画设置状态管理
 * 使用Zustand管理动画配置状态
 * 
 * Requirements: 11.1, 11.2, 11.3
 */

import { createStore } from 'zustand/vanilla';
import { devtools } from './middleware/devtools';
import type { AnimationSettings, AnimationSpeed, AnimationCategory } from '../types/animation-types';
import { animationManager } from '../services/animation-manager';

/**
 * 动画设置Store接口
 * 定义状态和操作方法
 */
interface AnimationSettingsStore {
  /** 当前动画配置 */
  settings: AnimationSettings;
  
  /** 当前FPS（由性能监控器更新） */
  currentFPS: number;
  
  /** 是否处于性能降级模式 */
  isPerformanceDegraded: boolean;
  
  // Actions
  
  /**
   * 启用所有动画
   */
  enableAnimations: () => void;
  
  /**
   * 禁用所有动画
   */
  disableAnimations: () => void;
  
  /**
   * 切换动画启用状态
   */
  toggleAnimations: () => void;
  
  /**
   * 设置动画速度
   * @param speed - 'fast' | 'normal' | 'slow'
   */
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  
  /**
   * 禁用特定类别的动画
   * @param category - 动画类别
   */
  disableCategory: (category: AnimationCategory) => void;
  
  /**
   * 启用特定类别的动画
   * @param category - 动画类别
   */
  enableCategory: (category: AnimationCategory) => void;
  
  /**
   * 切换特定类别的动画
   * @param category - 动画类别
   */
  toggleCategory: (category: AnimationCategory) => void;
  
  /**
   * 设置是否尊重系统偏好
   * @param respect - 是否尊重
   */
  setRespectSystemPreference: (respect: boolean) => void;
  
  /**
   * 切换系统偏好设置
   */
  toggleRespectSystemPreference: () => void;
  
  /**
   * 重置为默认配置
   */
  resetToDefaults: () => void;
  
  /**
   * 更新当前FPS
   * @param fps - 当前帧率
   */
  updateFPS: (fps: number) => void;
  
  /**
   * 设置性能降级状态
   * @param degraded - 是否降级
   */
  setPerformanceDegraded: (degraded: boolean) => void;
  
  /**
   * 从AnimationManager同步设置
   */
  syncFromManager: () => void;
}

/**
 * 创建动画设置Store
 * 使用DevTools中间件（仅开发环境）
 */
export const animationSettingsStore = createStore<AnimationSettingsStore>()(
  devtools(
    (set, get) => ({
      // 初始状态：从AnimationManager获取
      settings: animationManager.getSettings(),
      currentFPS: 60,
      isPerformanceDegraded: false,
      
      // 启用所有动画
      enableAnimations: () => {
        animationManager.enableAnimations();
        set({ settings: animationManager.getSettings() });
      },
      
      // 禁用所有动画
      disableAnimations: () => {
        animationManager.disableAnimations();
        set({ settings: animationManager.getSettings() });
      },
      
      // 切换动画启用状态
      toggleAnimations: () => {
        const { settings } = get();
        if (settings.enabled) {
          animationManager.disableAnimations();
        } else {
          animationManager.enableAnimations();
        }
        set({ settings: animationManager.getSettings() });
      },
      
      // 设置动画速度
      setAnimationSpeed: (speed) => {
        animationManager.setAnimationSpeed(speed);
        set({ settings: animationManager.getSettings() });
      },
      
      // 禁用特定类别
      disableCategory: (category) => {
        animationManager.disableCategory(category);
        set({ settings: animationManager.getSettings() });
      },
      
      // 启用特定类别
      enableCategory: (category) => {
        animationManager.enableCategory(category);
        set({ settings: animationManager.getSettings() });
      },
      
      // 切换特定类别
      toggleCategory: (category) => {
        const { settings } = get();
        if (settings.disabledCategories.has(category)) {
          animationManager.enableCategory(category);
        } else {
          animationManager.disableCategory(category);
        }
        set({ settings: animationManager.getSettings() });
      },
      
      // 设置是否尊重系统偏好
      setRespectSystemPreference: (respect) => {
        animationManager.setRespectSystemPreference(respect);
        set({ settings: animationManager.getSettings() });
      },
      
      // 切换系统偏好设置
      toggleRespectSystemPreference: () => {
        const { settings } = get();
        animationManager.setRespectSystemPreference(!settings.respectSystemPreference);
        set({ settings: animationManager.getSettings() });
      },
      
      // 重置为默认配置
      resetToDefaults: () => {
        animationManager.resetToDefaults();
        set({ 
          settings: animationManager.getSettings(),
          isPerformanceDegraded: false
        });
      },
      
      // 更新当前FPS
      updateFPS: (fps) => {
        set({ currentFPS: fps });
      },
      
      // 设置性能降级状态
      setPerformanceDegraded: (degraded) => {
        set({ isPerformanceDegraded: degraded });
      },
      
      // 从AnimationManager同步设置
      syncFromManager: () => {
        set({ settings: animationManager.getSettings() });
      }
    }),
    {
      name: 'AnimationSettingsStore',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);

/**
 * 状态选择器
 * 用于优化性能，避免不必要的重渲染
 */
export const animationSelectors = {
  /** 获取完整设置 */
  settings: (state: AnimationSettingsStore) => state.settings,
  
  /** 动画是否启用 */
  enabled: (state: AnimationSettingsStore) => state.settings.enabled,
  
  /** 当前速度 */
  speed: (state: AnimationSettingsStore) => state.settings.speed,
  
  /** 禁用的类别 */
  disabledCategories: (state: AnimationSettingsStore) => state.settings.disabledCategories,
  
  /** 是否尊重系统偏好 */
  respectSystemPreference: (state: AnimationSettingsStore) => state.settings.respectSystemPreference,
  
  /** 当前FPS */
  currentFPS: (state: AnimationSettingsStore) => state.currentFPS,
  
  /** 是否性能降级 */
  isPerformanceDegraded: (state: AnimationSettingsStore) => state.isPerformanceDegraded,
  
  /** 检查特定类别是否启用 */
  isCategoryEnabled: (category: AnimationCategory) => (state: AnimationSettingsStore) => 
    !state.settings.disabledCategories.has(category),
  
  /** 是否应该减少动画 */
  shouldReduceMotion: (state: AnimationSettingsStore) => 
    !state.settings.enabled || 
    (state.settings.respectSystemPreference && 
     window.matchMedia('(prefers-reduced-motion: reduce)').matches)
};

/**
 * 初始化动画设置store
 * 设置性能监控回调和系统偏好监听
 */
export function initializeAnimationStore(): void {
  const performanceMonitor = animationManager.getPerformanceMonitor();
  
  // 注册性能降级回调
  performanceMonitor.onPerformanceDrop(() => {
    const currentFPS = performanceMonitor.getCurrentFPS();
    animationSettingsStore.setState({ 
      currentFPS,
      isPerformanceDegraded: true 
    });
    
    // 自动禁用非关键动画类别
    animationManager.disableCategory('card');
    animationManager.disableCategory('list');
    
    // 同步设置
    animationSettingsStore.getState().syncFromManager();
    
    console.info('Performance degradation detected, non-critical animations disabled');
  });
  
  // 监听系统偏好变化
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handlePreferenceChange = () => {
    animationSettingsStore.getState().syncFromManager();
  };
  
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handlePreferenceChange);
  }
  
  // 定期更新FPS
  const updateFPS = () => {
    const currentFPS = performanceMonitor.getCurrentFPS();
    animationSettingsStore.setState({ currentFPS });
  };
  
  // 每秒更新一次FPS
  setInterval(updateFPS, 1000);
}

/**
 * 订阅动画设置变化
 * @param callback - 回调函数
 * @returns 取消订阅函数
 */
export function subscribeToAnimationSettings(
  callback: (settings: AnimationSettings) => void
): () => void {
  let previousSettings = animationSettingsStore.getState().settings;
  
  return animationSettingsStore.subscribe((state) => {
    const currentSettings = state.settings;
    if (currentSettings !== previousSettings) {
      previousSettings = currentSettings;
      callback(currentSettings);
    }
  });
}

/**
 * 订阅FPS变化
 * @param callback - 回调函数
 * @returns 取消订阅函数
 */
export function subscribeToFPS(
  callback: (fps: number) => void
): () => void {
  let previousFPS = animationSettingsStore.getState().currentFPS;
  
  return animationSettingsStore.subscribe((state) => {
    const currentFPS = state.currentFPS;
    if (currentFPS !== previousFPS) {
      previousFPS = currentFPS;
      callback(currentFPS);
    }
  });
}

/**
 * 订阅性能降级状态
 * @param callback - 回调函数
 * @returns 取消订阅函数
 */
export function subscribeToPerformanceDegradation(
  callback: (degraded: boolean) => void
): () => void {
  let previousDegraded = animationSettingsStore.getState().isPerformanceDegraded;
  
  return animationSettingsStore.subscribe((state) => {
    const currentDegraded = state.isPerformanceDegraded;
    if (currentDegraded !== previousDegraded) {
      previousDegraded = currentDegraded;
      callback(currentDegraded);
    }
  });
}

/**
 * 获取当前动画设置（快照）
 */
export function getAnimationSettings(): AnimationSettings {
  return animationSettingsStore.getState().settings;
}

/**
 * 获取当前FPS（快照）
 */
export function getCurrentFPS(): number {
  return animationSettingsStore.getState().currentFPS;
}

/**
 * 检查是否应该减少动画（快照）
 */
export function shouldReduceMotion(): boolean {
  return animationSelectors.shouldReduceMotion(animationSettingsStore.getState());
}

/**
 * 检查特定类别是否启用（快照）
 */
export function isCategoryEnabled(category: AnimationCategory): boolean {
  return animationSelectors.isCategoryEnabled(category)(animationSettingsStore.getState());
}
