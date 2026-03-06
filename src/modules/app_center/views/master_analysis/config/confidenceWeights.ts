/**
 * DNA 提取置信度权重配置
 *
 * 定义各个数据源的置信度权重，用于计算提取数据的可靠性
 * 权重范围：0.0 - 1.0，数值越高表示数据源越可靠
 */

/**
 * 目标受众提取的置信度权重
 */
export const AUDIENCE_CONFIDENCE_WEIGHTS = {
  /** 人口统计信息（年龄、性别）- 较可靠的结构化数据 */
  DEMOGRAPHICS: 0.3,
  /** 生活方式指标 - 推断性数据，可靠性中等 */
  LIFESTYLE: 0.2,
  /** 买家类型 - 基于行为分析，较可靠 */
  BUYER_TYPES: 0.3,
  /** 购买动机 - 推断性数据，可靠性中等 */
  MOTIVATIONS: 0.2,
  /** 使用场景 - 基于评论分析，可靠性中等 */
  USE_CASES: 0.5
} as const;

/**
 * 核心卖点提取的置信度权重
 */
export const USPS_CONFIDENCE_WEIGHTS = {
  /** 功能卖点 - 来自产品描述，较可靠 */
  FUNCTIONS: 0.4,
  /** 核心差异化 - 战略性分析，较可靠 */
  PRIMARY_DIFFERENTIATION: 0.3,
  /** Bullet 分析 - 结构化数据，较可靠 */
  BULLET_ANALYSIS: 0.3,
  /** 差异化角度 - 战略性分析，高可靠性 */
  DIFFERENTIATION_ANGLES: 0.7,
  /** 情感钩子 - 推断性数据，可靠性中等 */
  EMOTIONAL_HOOKS: 0.3
} as const;

/**
 * 技术规格提取的置信度权重
 */
export const SPECS_CONFIDENCE_WEIGHTS = {
  /** 基础分：有数据就给分 */
  BASE: 0.3,
  /** 数量分：提取的规格数量 >= 3 */
  QUANTITY_THRESHOLD_3: 0.2,
  /** 数量分：提取的规格数量 >= 5 */
  QUANTITY_THRESHOLD_5: 0.2,
  /** 来源分：从关键词提取 */
  FROM_KEYWORDS: 0.15,
  /** 来源分：从技术规格提取 */
  FROM_TECH_SPECS: 0.15
} as const;

/**
 * 关键词提取的置信度权重
 */
export const KEYWORDS_CONFIDENCE_WEIGHTS = {
  /** 核心关键词 - 来自标题分析，高可靠性 */
  CORE: 0.5,
  /** 长尾关键词 - 来自次要关键词，可靠性中等 */
  LONG_TAIL: 0.3,
  /** 意图关键词 - 来自场景分析，可靠性较低 */
  INTENT: 0.2
} as const;

/**
 * 高频短语提取的置信度权重
 */
export const PHRASES_CONFIDENCE_WEIGHTS = {
  /** 属性短语 - 来自评论分析，可靠性中等 */
  ATTRIBUTE: 0.5,
  /** 使用场景短语 - 来自评论分析，可靠性中等 */
  USE_CASES: 0.5,
  /** 决策驱动因素 - 推断性数据，可靠性中等 */
  DECISION_DRIVERS: 0.6
} as const;

/**
 * 痛点提取的置信度权重
 */
export const PAIN_POINTS_CONFIDENCE_WEIGHTS = {
  /** 功能场景矩阵中的痛点 - 结构化数据，可靠性中等 */
  FROM_FUNCTION_SCENE: 0.5,
  /** 致命缺陷中的问题 - 来自负面评论，可靠性中等 */
  FROM_FATAL_FLAWS: 0.5,
  /** 质量问题 - 来自评论分析，可靠性中等 */
  QUALITY_ISSUES: 0.5,
  /** 未满足需求 - 推断性数据，可靠性中等 */
  UNMET_NEEDS: 0.5,
  /** 弱点 - 来自竞品分析，可靠性中等 */
  WEAKNESSES: 0.5,
  /** 负面驱动因素 - 来自评论分析，可靠性中等 */
  NEGATIVE_DRIVERS: 0.5
} as const;

/**
 * 差异化角度提取的置信度权重
 */
export const DIFFERENTIATION_CONFIDENCE_WEIGHTS = {
  /** 差异化角度 - 战略性分析，高可靠性 */
  ANGLES: 0.9,
  /** 主要差异化 - 战略性分析，较可靠 */
  PRIMARY: 0.4,
  /** 目标定位 - 战略性分析，可靠性中等 */
  POSITIONING: 0.3,
  /** 情感钩子 - 推断性数据，可靠性中等 */
  EMOTIONAL_HOOKS: 0.3
} as const;

/**
 * 置信度阈值配置
 */
export const CONFIDENCE_THRESHOLDS = {
  /** 最低可接受置信度 - 低于此值将放弃提取 */
  MINIMUM_ACCEPTABLE: 0.2,
  /** 高置信度阈值 - 用于 UI 显示 */
  HIGH: 0.7,
  /** 中等置信度阈值 - 用于 UI 显示 */
  MEDIUM: 0.5
} as const;
