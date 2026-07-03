// tests/visual/threshold-config.ts
// ================================================================
// 🎯 视觉回归测试差异阈值配置
// ================================================================
//
// 本文件定义了不同场景下的差异阈值配置
// 根据页面类型、测试目的和内容特性选择合适的阈值
//
// ================================================================

import { ImageCompareOptions } from './image-comparator';

/**
 * 阈值配置级别
 */
export enum ThresholdLevel {
  /** 极严格 - 用于关键 UI 组件，几乎不允许任何差异 */
  VERY_STRICT = 'very_strict',
  
  /** 严格 - 用于重要页面，允许极小差异（抗锯齿等） */
  STRICT = 'strict',
  
  /** 标准 - 默认级别，平衡准确性和容忍度 */
  STANDARD = 'standard',
  
  /** 宽松 - 用于动态内容较多的页面 */
  LENIENT = 'lenient',
  
  /** 极宽松 - 用于高度动态的页面或原型测试 */
  VERY_LENIENT = 'very_lenient'
}

/**
 * 页面类型
 */
export enum PageType {
  /** 静态页面 - 内容固定，很少变化 */
  STATIC = 'static',
  
  /** 表单页面 - 包含输入框、按钮等交互元素 */
  FORM = 'form',
  
  /** 数据展示页面 - 显示动态数据 */
  DATA_DISPLAY = 'data_display',
  
  /** 仪表板 - 包含图表、统计数据 */
  DASHBOARD = 'dashboard',
  
  /** 列表页面 - 显示列表数据 */
  LIST = 'list',
  
  /** 详情页面 - 显示详细信息 */
  DETAIL = 'detail'
}

/**
 * 预定义的阈值配置
 */
export const THRESHOLD_PRESETS: Record<ThresholdLevel, ImageCompareOptions> = {
  [ThresholdLevel.VERY_STRICT]: {
    threshold: 0.001,        // 0.1% 差异容忍度
    maxDiffPixels: 10,       // 最多 10 个像素差异
    includeAA: true,         // 包含抗锯齿检测
    alpha: 0.05,             // 透明度阈值
    aaThreshold: 0.05,       // 抗锯齿检测阈值
    diffColor: [255, 0, 0],  // 红色高亮
    generateDiffImage: true
  },
  
  [ThresholdLevel.STRICT]: {
    threshold: 0.01,         // 1% 差异容忍度
    maxDiffPixels: 100,      // 最多 100 个像素差异
    includeAA: true,
    alpha: 0.1,
    aaThreshold: 0.1,
    diffColor: [255, 0, 0],
    generateDiffImage: true
  },
  
  [ThresholdLevel.STANDARD]: {
    threshold: 0.05,         // 5% 差异容忍度
    maxDiffPixels: 500,      // 最多 500 个像素差异
    includeAA: true,
    alpha: 0.1,
    aaThreshold: 0.1,
    diffColor: [255, 0, 0],
    generateDiffImage: true
  },
  
  [ThresholdLevel.LENIENT]: {
    threshold: 0.1,          // 10% 差异容忍度
    maxDiffPixels: 1000,     // 最多 1000 个像素差异
    includeAA: true,
    alpha: 0.15,
    aaThreshold: 0.15,
    diffColor: [255, 128, 0], // 橙色高亮
    generateDiffImage: true
  },
  
  [ThresholdLevel.VERY_LENIENT]: {
    threshold: 0.2,          // 20% 差异容忍度
    maxDiffPixels: 2000,     // 最多 2000 个像素差异
    includeAA: true,
    alpha: 0.2,
    aaThreshold: 0.2,
    diffColor: [255, 255, 0], // 黄色高亮
    generateDiffImage: true
  }
};

/**
 * 页面类型推荐的阈值级别
 */
export const PAGE_TYPE_RECOMMENDATIONS: Record<PageType, ThresholdLevel> = {
  [PageType.STATIC]: ThresholdLevel.VERY_STRICT,
  [PageType.FORM]: ThresholdLevel.STRICT,
  [PageType.DATA_DISPLAY]: ThresholdLevel.STANDARD,
  [PageType.DASHBOARD]: ThresholdLevel.LENIENT,
  [PageType.LIST]: ThresholdLevel.STANDARD,
  [PageType.DETAIL]: ThresholdLevel.STRICT
};

/**
 * 视口尺寸的阈值调整系数
 * 移动端由于屏幕小，像素密度高，需要更宽松的阈值
 */
export const VIEWPORT_THRESHOLD_MULTIPLIERS = {
  desktop: 1.0,    // 基准
  tablet: 1.2,     // 增加 20%
  mobile: 1.5      // 增加 50%
};

/**
 * 组件级测试的阈值配置
 */
export const COMPONENT_THRESHOLDS: Record<string, ImageCompareOptions> = {
  // 导航栏 - 严格，因为是关键 UI
  navigation: {
    ...THRESHOLD_PRESETS[ThresholdLevel.STRICT],
    maxDiffPixels: 50
  },
  
  // 按钮 - 极严格，因为是小组件
  button: {
    ...THRESHOLD_PRESETS[ThresholdLevel.VERY_STRICT],
    maxDiffPixels: 5
  },
  
  // 输入框 - 严格
  input: {
    ...THRESHOLD_PRESETS[ThresholdLevel.STRICT],
    maxDiffPixels: 20
  },
  
  // 卡片 - 标准
  card: {
    ...THRESHOLD_PRESETS[ThresholdLevel.STANDARD],
    maxDiffPixels: 200
  },
  
  // 表格 - 宽松，因为内容可能变化
  table: {
    ...THRESHOLD_PRESETS[ThresholdLevel.LENIENT],
    maxDiffPixels: 800
  },
  
  // 图表 - 极宽松，因为数据驱动
  chart: {
    ...THRESHOLD_PRESETS[ThresholdLevel.VERY_LENIENT],
    maxDiffPixels: 1500
  }
};

/**
 * 交互状态的阈值配置
 */
export const INTERACTION_STATE_THRESHOLDS: Record<string, ImageCompareOptions> = {
  // 悬停状态 - 严格，因为是明确的视觉反馈
  hover: {
    ...THRESHOLD_PRESETS[ThresholdLevel.STRICT],
    maxDiffPixels: 100
  },
  
  // 聚焦状态 - 严格
  focus: {
    ...THRESHOLD_PRESETS[ThresholdLevel.STRICT],
    maxDiffPixels: 100
  },
  
  // 激活状态 - 严格
  active: {
    ...THRESHOLD_PRESETS[ThresholdLevel.STRICT],
    maxDiffPixels: 100
  },
  
  // 禁用状态 - 标准
  disabled: {
    ...THRESHOLD_PRESETS[ThresholdLevel.STANDARD],
    maxDiffPixels: 200
  },
  
  // 错误状态 - 严格，因为是重要的用户反馈
  error: {
    ...THRESHOLD_PRESETS[ThresholdLevel.STRICT],
    maxDiffPixels: 150
  }
};

/**
 * 获取阈值配置
 * 
 * @param level - 阈值级别
 * @returns 阈值配置
 */
export function getThresholdConfig(level: ThresholdLevel): ImageCompareOptions {
  return { ...THRESHOLD_PRESETS[level] };
}

/**
 * 根据页面类型获取推荐的阈值配置
 * 
 * @param pageType - 页面类型
 * @returns 阈值配置
 */
export function getThresholdForPageType(pageType: PageType): ImageCompareOptions {
  const level = PAGE_TYPE_RECOMMENDATIONS[pageType];
  return getThresholdConfig(level);
}

/**
 * 根据组件类型获取阈值配置
 * 
 * @param componentType - 组件类型
 * @returns 阈值配置
 */
export function getThresholdForComponent(componentType: string): ImageCompareOptions {
  return { ...(COMPONENT_THRESHOLDS[componentType] || THRESHOLD_PRESETS[ThresholdLevel.STANDARD]) };
}

/**
 * 根据交互状态获取阈值配置
 * 
 * @param state - 交互状态
 * @returns 阈值配置
 */
export function getThresholdForInteractionState(state: string): ImageCompareOptions {
  return { ...(INTERACTION_STATE_THRESHOLDS[state] || THRESHOLD_PRESETS[ThresholdLevel.STANDARD]) };
}

/**
 * 根据视口调整阈值
 * 
 * @param baseConfig - 基础配置
 * @param viewport - 视口类型
 * @returns 调整后的配置
 */
export function adjustThresholdForViewport(
  baseConfig: ImageCompareOptions,
  viewport: 'desktop' | 'tablet' | 'mobile'
): ImageCompareOptions {
  const multiplier = VIEWPORT_THRESHOLD_MULTIPLIERS[viewport];
  
  return {
    ...baseConfig,
    threshold: (baseConfig.threshold || 0.05) * multiplier,
    maxDiffPixels: Math.floor((baseConfig.maxDiffPixels || 500) * multiplier)
  };
}

/**
 * 创建自定义阈值配置
 * 
 * @param options - 自定义选项
 * @returns 阈值配置
 */
export function createCustomThreshold(options: {
  baseLevel?: ThresholdLevel;
  thresholdMultiplier?: number;
  maxDiffPixelsMultiplier?: number;
  diffColor?: [number, number, number];
  generateDiffImage?: boolean;
}): ImageCompareOptions {
  const baseConfig = options.baseLevel 
    ? THRESHOLD_PRESETS[options.baseLevel]
    : THRESHOLD_PRESETS[ThresholdLevel.STANDARD];
  
  return {
    ...baseConfig,
    threshold: (baseConfig.threshold || 0.05) * (options.thresholdMultiplier || 1),
    maxDiffPixels: Math.floor((baseConfig.maxDiffPixels || 500) * (options.maxDiffPixelsMultiplier || 1)),
    diffColor: options.diffColor || baseConfig.diffColor,
    generateDiffImage: options.generateDiffImage ?? baseConfig.generateDiffImage
  };
}

/**
 * 阈值配置构建器
 */
export class ThresholdConfigBuilder {
  private config: ImageCompareOptions;
  
  constructor(baseLevel: ThresholdLevel = ThresholdLevel.STANDARD) {
    this.config = { ...THRESHOLD_PRESETS[baseLevel] };
  }
  
  /**
   * 设置差异阈值
   */
  withThreshold(threshold: number): this {
    this.config.threshold = threshold;
    return this;
  }
  
  /**
   * 设置最大差异像素数
   */
  withMaxDiffPixels(maxDiffPixels: number): this {
    this.config.maxDiffPixels = maxDiffPixels;
    return this;
  }
  
  /**
   * 设置差异颜色
   */
  withDiffColor(r: number, g: number, b: number): this {
    this.config.diffColor = [r, g, b];
    return this;
  }
  
  /**
   * 设置是否生成差异图
   */
  withDiffImageGeneration(generate: boolean): this {
    this.config.generateDiffImage = generate;
    return this;
  }
  
  /**
   * 设置差异图输出路径
   */
  withDiffOutputPath(path: string): this {
    this.config.diffOutputPath = path;
    return this;
  }
  
  /**
   * 设置抗锯齿检测
   */
  withAntiAliasing(includeAA: boolean, aaThreshold?: number): this {
    this.config.includeAA = includeAA;
    if (aaThreshold !== undefined) {
      this.config.aaThreshold = aaThreshold;
    }
    return this;
  }
  
  /**
   * 设置透明度阈值
   */
  withAlphaThreshold(alpha: number): this {
    this.config.alpha = alpha;
    return this;
  }
  
  /**
   * 根据视口调整
   */
  forViewport(viewport: 'desktop' | 'tablet' | 'mobile'): this {
    const multiplier = VIEWPORT_THRESHOLD_MULTIPLIERS[viewport];
    this.config.threshold = (this.config.threshold || 0.05) * multiplier;
    this.config.maxDiffPixels = Math.floor((this.config.maxDiffPixels || 500) * multiplier);
    return this;
  }
  
  /**
   * 构建配置
   */
  build(): ImageCompareOptions {
    return { ...this.config };
  }
}

/**
 * 阈值配置验证器
 */
export class ThresholdValidator {
  /**
   * 验证阈值配置是否合理
   * 
   * @param config - 阈值配置
   * @returns 验证结果
   */
  static validate(config: ImageCompareOptions): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    this.validateThreshold(config.threshold, warnings, errors);
    this.validateMaxDiffPixels(config.maxDiffPixels, warnings, errors);
    this.validateUnitRange('alpha', config.alpha, errors);
    this.validateUnitRange('aaThreshold', config.aaThreshold, errors);
    this.validateDiffColor(config.diffColor, errors);
    
    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  private static validateThreshold(
    threshold: number | undefined,
    warnings: string[],
    errors: string[]
  ): void {
    if (threshold === undefined) {
      return;
    }

    if (threshold < 0 || threshold > 1) {
      errors.push(`threshold 必须在 0-1 之间，当前值: ${threshold}`);
    } else if (threshold < 0.001) {
      warnings.push(`threshold 过于严格 (${threshold})，可能导致大量误报`);
    } else if (threshold > 0.3) {
      warnings.push(`threshold 过于宽松 (${threshold})，可能遗漏真实问题`);
    }
  }

  private static validateMaxDiffPixels(
    maxDiffPixels: number | undefined,
    warnings: string[],
    errors: string[]
  ): void {
    if (maxDiffPixels === undefined) {
      return;
    }

    if (maxDiffPixels < 0) {
      errors.push(`maxDiffPixels 不能为负数，当前值: ${maxDiffPixels}`);
    } else if (maxDiffPixels < 10) {
      warnings.push(`maxDiffPixels 过小 (${maxDiffPixels})，可能导致误报`);
    } else if (maxDiffPixels > 5000) {
      warnings.push(`maxDiffPixels 过大 (${maxDiffPixels})，可能遗漏问题`);
    }
  }

  private static validateUnitRange(
    field: 'alpha' | 'aaThreshold',
    value: number | undefined,
    errors: string[]
  ): void {
    if (value !== undefined && (value < 0 || value > 1)) {
      errors.push(`${field} 必须在 0-1 之间，当前值: ${value}`);
    }
  }

  private static validateDiffColor(
    diffColor: ImageCompareOptions['diffColor'],
    errors: string[]
  ): void {
    if (!diffColor) {
      return;
    }

    if (diffColor.length !== 3) {
      errors.push(`diffColor 必须是 [R, G, B] 格式`);
      return;
    }

    diffColor.forEach((value, index) => {
      if (value < 0 || value > 255) {
        errors.push(`diffColor[${index}] 必须在 0-255 之间，当前值: ${value}`);
      }
    });
  }
  
  /**
   * 验证并抛出错误
   * 
   * @param config - 阈值配置
   * @throws 如果配置无效
   */
  static validateOrThrow(config: ImageCompareOptions): void {
    const result = this.validate(config);
    
    if (!result.valid) {
      throw new Error(`阈值配置无效:\n${result.errors.join('\n')}`);
    }
    
    if (result.warnings.length > 0) {
      console.warn(`阈值配置警告:\n${result.warnings.join('\n')}`);
    }
  }
}

/**
 * 导出类型
 */
export type {
  ImageCompareOptions
} from './image-comparator';
