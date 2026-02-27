/**
 * 动画类型定义
 * 定义微交互动画系统的所有TypeScript类型
 */

/**
 * 动画速度类型
 * - fast: 快速动画 (0.7x)
 * - normal: 正常速度 (1.0x)
 * - slow: 慢速动画 (1.5x)
 */
export type AnimationSpeed = 'fast' | 'normal' | 'slow';

/**
 * 动画类别
 * 用于独立控制不同类型的动画
 */
export type AnimationCategory =
  | 'button'      // 按钮交互动画
  | 'card'        // 卡片悬停效果
  | 'toast'       // Toast通知动画
  | 'modal'       // 模态框动画
  | 'list'        // 列表项动画
  | 'form'        // 表单输入动画
  | 'loading'     // 加载状态动画
  | 'navigation'; // 导航动画

/**
 * 动画配置接口
 * 定义全局动画系统的配置选项
 */
export interface AnimationSettings {
  /** 是否启用动画 */
  enabled: boolean;
  
  /** 动画速度预设 */
  speed: AnimationSpeed;
  
  /** 禁用的动画类别集合 */
  disabledCategories: Set<AnimationCategory>;
  
  /** 是否尊重系统的减少动画偏好 (prefers-reduced-motion) */
  respectSystemPreference: boolean;
}

/**
 * 动画配置常量接口
 * 定义动画系统的常量配置
 */
export interface AnimationConfig {
  /** 速度倍数映射 */
  speedMultipliers: Record<AnimationSpeed, number>;
  
  /** 默认配置 */
  defaults: AnimationSettings;
  
  /** 性能相关配置 */
  performance: {
    /** FPS阈值,低于此值触发性能降级 */
    fpsThreshold: number;
    
    /** 同时执行的最大动画数量 */
    maxAnimationCount: number;
  };
}

/**
 * LocalStorage中存储的动画配置
 * 用于持久化用户的动画偏好设置
 */
export interface StoredAnimationSettings {
  /** 配置版本号 */
  version: string;
  
  /** 是否启用动画 */
  enabled: boolean;
  
  /** 动画速度预设 */
  speed: AnimationSpeed;
  
  /** 禁用的动画类别数组 */
  disabledCategories: string[];
  
  /** 是否尊重系统偏好 */
  respectSystemPreference: boolean;
  
  /** 最后更新时间戳 */
  lastUpdated: number;
}

/**
 * 动画事件回调类型
 */
export type AnimationCallback = () => void;
