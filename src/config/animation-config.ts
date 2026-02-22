/**
 * 动画配置常量
 * 定义微交互动画系统的所有配置常量
 */

import type { AnimationConfig, AnimationSettings } from '../types/animation-types';

/**
 * 速度倍数映射
 * 定义不同速度预设对应的时长倍数
 */
export const SPEED_MULTIPLIERS: Record<'fast' | 'normal' | 'slow', number> = {
  fast: 0.7,    // 快速: 70%的正常时长
  normal: 1.0,  // 正常: 100%的正常时长
  slow: 1.5,    // 慢速: 150%的正常时长
};

/**
 * 默认动画配置
 * 系统初始化时使用的默认设置
 */
export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  enabled: true,
  speed: 'normal',
  disabledCategories: new Set(),
  respectSystemPreference: true,
};

/**
 * 性能阈值配置
 * 用于性能监控和降级决策
 */
export const PERFORMANCE_CONFIG = {
  /** FPS阈值: 低于55fps时触发性能降级 */
  fpsThreshold: 55,
  
  /** 最大动画数量: 同时执行的动画不应超过此数量 */
  maxAnimationCount: 20,
  
  /** 连续低帧数阈值: 连续N次低于阈值才触发降级 */
  consecutiveLowFramesThreshold: 3,
  
  /** 性能检查间隔(ms): 每隔N毫秒检查一次性能 */
  checkInterval: 1000,
};

/**
 * 动画时长常量 (毫秒)
 * 对应CSS变量中定义的时长
 */
export const ANIMATION_DURATIONS = {
  instant: 100,   // --micro-duration-instant
  quick: 150,     // --micro-duration-quick
  smooth: 250,    // --micro-duration-smooth
  gentle: 350,    // --micro-duration-gentle
} as const;

/**
 * 动画缓动函数常量
 * 对应CSS变量中定义的缓动函数
 */
export const ANIMATION_EASINGS = {
  button: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // --micro-ease-button (弹性)
  card: 'cubic-bezier(0.22, 1, 0.36, 1)',       // --micro-ease-card (平滑)
  modal: 'cubic-bezier(0.16, 1, 0.3, 1)',       // --micro-ease-modal (柔和)
} as const;

/**
 * 动画变换值常量
 * 对应CSS变量中定义的变换值
 */
export const ANIMATION_TRANSFORMS = {
  scalePress: 0.98,      // --micro-scale-press (按下缩小)
  scaleHover: 1.02,      // --micro-scale-hover (悬停放大)
  translateHover: -4,    // --micro-translate-hover (悬停上浮, px)
  translatePress: 0,     // --micro-translate-press (按下位置)
} as const;

/**
 * 列表交错动画配置
 */
export const STAGGER_CONFIG = {
  /** 每个列表项的延迟间隔(ms) */
  delay: 50,
  
  /** 列表项滑入距离(px) */
  translateDistance: 20,
} as const;

/**
 * Toast动画配置
 */
export const TOAST_CONFIG = {
  /** Toast进入动画时长(ms) */
  enterDuration: 400,
  
  /** Toast退出动画时长(ms) */
  exitDuration: 300,
  
  /** Toast堆叠间距(px) */
  stackSpacing: 8,
  
  /** Toast默认显示时长(ms) */
  defaultDuration: 3000,
} as const;

/**
 * 模态框动画配置
 */
export const MODAL_CONFIG = {
  /** 遮罩淡入时长(ms) */
  backdropDuration: 250,
  
  /** 内容动画时长(ms) */
  contentDuration: 300,
  
  /** 退出动画时长(ms) */
  exitDuration: 200,
} as const;

/**
 * 涟漪效果配置
 */
export const RIPPLE_CONFIG = {
  /** 涟漪动画时长(ms) */
  duration: 600,
  
  /** 涟漪扩散倍数 */
  scale: 4,
  
  /** 涟漪初始透明度 */
  initialOpacity: 0.5,
} as const;

/**
 * LocalStorage存储键名
 */
export const STORAGE_KEY = 'app:animation-settings';

/**
 * 配置版本号
 * 用于处理配置格式的向后兼容
 */
export const CONFIG_VERSION = '1.0.0';

/**
 * 完整的动画配置对象
 * 整合所有配置常量
 */
export const ANIMATION_CONFIG: AnimationConfig = {
  speedMultipliers: SPEED_MULTIPLIERS,
  defaults: DEFAULT_ANIMATION_SETTINGS,
  performance: {
    fpsThreshold: PERFORMANCE_CONFIG.fpsThreshold,
    maxAnimationCount: PERFORMANCE_CONFIG.maxAnimationCount,
  },
};

/**
 * 浏览器兼容性配置
 * 定义支持的最低浏览器版本
 */
export const BROWSER_SUPPORT = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90,
} as const;

/**
 * CSS类名常量
 * 用于动画控制的CSS类名
 */
export const ANIMATION_CLASSES = {
  // 全局控制
  noAnimations: 'no-animations',
  animationsFast: 'animations-fast',
  animationsSlow: 'animations-slow',
  
  // 分类控制
  noButtonAnimations: 'no-button-animations',
  noCardAnimations: 'no-card-animations',
  noToastAnimations: 'no-toast-animations',
  noModalAnimations: 'no-modal-animations',
  noListAnimations: 'no-list-animations',
  noFormAnimations: 'no-form-animations',
  noLoadingAnimations: 'no-loading-animations',
  noNavigationAnimations: 'no-navigation-animations',
  
  // 涟漪效果
  btnRipple: 'btn-ripple',
  btnRippleEffect: 'btn-ripple-effect',
  
  // Toast动画
  toastEnter: 'toast-enter',
  toastExit: 'toast-exit',
  toastStackShift: 'toast-stack-shift',
  
  // 模态框动画
  modalBackdropEnter: 'modal-backdrop-enter',
  modalBackdropExit: 'modal-backdrop-exit',
  modalContentEnter: 'modal-content-enter',
  modalContentExit: 'modal-content-exit',
  
  // 列表动画
  listStaggerItem: 'list-stagger-item',
  
  // 页面过渡
  pageEnter: 'page-enter',
  pageExit: 'page-exit',
  
  // 侧边栏
  sidebarEnter: 'sidebar-enter',
  sidebarExit: 'sidebar-exit',
  
  // 下拉菜单
  dropdownEnter: 'dropdown-enter',
  dropdownExit: 'dropdown-exit',
  
  // 表单
  formInputError: 'form-input-error',
  formInputSuccessIcon: 'form-input-success-icon',
  formLabelFloat: 'form-label-float',
} as const;

/**
 * 数据属性常量
 * 用于HTML元素的data属性
 */
export const DATA_ATTRIBUTES = {
  animations: 'data-animations',
  animationSpeed: 'data-animation-speed',
  staggerList: 'data-stagger-list',
  staggerIndex: 'data-stagger-index',
} as const;
