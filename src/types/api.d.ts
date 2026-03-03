// src/types/api.d.ts
// ================================================================
// API 响应类型定义
// 为所有 API 响应提供完整的类型约束
// ================================================================

// ==================== 通用响应类型 ====================

/**
 * 标准 API 响应包装器
 * @template T - 响应数据类型
 */
export interface ApiResponse<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: ApiError;
  /** 响应消息 */
  message?: string;
  /** 响应时间戳 */
  timestamp?: number;
  /** 请求ID（用于追踪） */
  requestId?: string;
}

/**
 * API 错误响应
 */
export interface ApiError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 详细错误信息 */
  details?: string;
  /** 错误堆栈（仅开发环境） */
  stack?: string;
  /** HTTP 状态码 */
  statusCode?: number;
  /** 错误上下文 */
  context?: Record<string, any>;
}

/**
 * 分页响应
 * @template T - 列表项类型
 */
export interface PaginatedResponse<T = any> {
  /** 数据列表 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

// ==================== LLM API 响应类型 ====================

/**
 * LLM 聊天消息
 */
export interface LLMMessage {
  /** 角色 */
  role: 'system' | 'user' | 'assistant';
  /** 内容 */
  content: string;
  /** 消息名称（可选） */
  name?: string;
  /** 函数调用（可选） */
  function_call?: {
    name: string;
    arguments: string;
  };
}

/**
 * LLM 聊天完成响应
 */
export interface LLMChatCompletionResponse {
  /** 响应ID */
  id: string;
  /** 对象类型 */
  object: 'chat.completion';
  /** 创建时间戳 */
  created: number;
  /** 模型名称 */
  model: string;
  /** 选择列表 */
  choices: Array<{
    /** 索引 */
    index: number;
    /** 消息 */
    message: LLMMessage;
    /** 结束原因 */
    finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
  }>;
  /** 使用情况 */
  usage?: {
    /** 提示词 token 数 */
    prompt_tokens: number;
    /** 完成 token 数 */
    completion_tokens: number;
    /** 总 token 数 */
    total_tokens: number;
  };
  /** 系统指纹 */
  system_fingerprint?: string;
}

/**
 * LLM 流式响应块
 */
export interface LLMStreamChunk {
  /** 响应ID */
  id: string;
  /** 对象类型 */
  object: 'chat.completion.chunk';
  /** 创建时间戳 */
  created: number;
  /** 模型名称 */
  model: string;
  /** 选择列表 */
  choices: Array<{
    /** 索引 */
    index: number;
    /** 增量消息 */
    delta: {
      role?: 'assistant';
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
    /** 结束原因 */
    finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
  }>;
}

/**
 * LLM 模型信息
 */
export interface LLMModel {
  /** 模型ID */
  id: string;
  /** 对象类型 */
  object: 'model';
  /** 创建时间戳 */
  created?: number;
  /** 所属组织 */
  owned_by?: string;
  /** 模型名称（显示用） */
  name?: string;
  /** 上下文窗口大小 */
  context?: number;
  /** 支持的特性 */
  features?: string[];
}

/**
 * LLM 模型列表响应
 */
export interface LLMModelsResponse {
  /** 对象类型 */
  object: 'list';
  /** 模型列表 */
  data: LLMModel[];
}

/**
 * LLM 错误响应
 */
export interface LLMErrorResponse {
  /** 错误对象 */
  error: {
    /** 错误消息 */
    message: string;
    /** 错误类型 */
    type?: string;
    /** 错误参数 */
    param?: string | null;
    /** 错误代码 */
    code?: string | null;
  };
}

// ==================== Scraper API 响应类型 ====================

/**
 * Amazon 产品数据
 */
export interface AmazonProductData {
  /** ASIN */
  asin: string;
  /** 产品标题 */
  title: string;
  /** 价格 */
  price?: number;
  /** 货币单位 */
  currency?: string;
  /** 评分 */
  rating?: number;
  /** 评论数 */
  reviewCount?: number;
  /** 产品图片URL */
  imageUrl?: string;
  /** 产品URL */
  productUrl?: string;
  /** 品牌 */
  brand?: string;
  /** 类别 */
  category?: string;
  /** 产品描述 */
  description?: string;
  /** 产品特性列表 */
  features?: string[];
  /** 产品规格 */
  specifications?: Record<string, string>;
  /** 库存状态 */
  availability?: string;
  /** 卖家信息 */
  seller?: {
    name: string;
    rating?: number;
    feedbackCount?: number;
  };
  /** 抓取时间戳 */
  scrapedAt: number;
}

/**
 * Scraper 响应
 */
export interface ScraperResponse {
  /** 是否成功 */
  success: boolean;
  /** 产品数据列表 */
  products: AmazonProductData[];
  /** 失败的 ASIN 列表 */
  failed?: Array<{
    asin: string;
    reason: string;
  }>;
  /** 抓取统计 */
  stats?: {
    total: number;
    success: number;
    failed: number;
    duration: number;
  };
}

// ==================== Analysis API 响应类型 ====================

/**
 * 分析报告章节
 */
export interface AnalysisSection {
  /** 章节ID */
  id: string;
  /** 章节标题 */
  title: string;
  /** 章节内容 */
  content: string;
  /** 子章节 */
  subsections?: AnalysisSection[];
  /** 数据 */
  data?: Record<string, any>;
}

/**
 * 分析报告响应
 */
export interface AnalysisReportResponse {
  /** 报告ID */
  id: string;
  /** 报告类型 */
  type: 'overview' | 'detailed' | 'comparison' | 'trend';
  /** 报告标题 */
  title: string;
  /** 生成时间戳 */
  generatedAt: number;
  /** 市场 */
  marketplace?: string;
  /** ASIN 列表 */
  asins?: string[];
  /** 报告章节 */
  sections: AnalysisSection[];
  /** 摘要 */
  summary?: string;
  /** 图表数据 */
  charts?: Array<{
    id: string;
    type: 'line' | 'bar' | 'pie' | 'scatter';
    title: string;
    data: any;
  }>;
  /** 元数据 */
  metadata?: {
    version: string;
    model?: string;
    tokens?: number;
    duration?: number;
  };
}

// ==================== 性能监控 API 响应类型 ====================

/**
 * 性能指标数据
 */
export interface PerformanceMetric {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 单位 */
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  /** 时间戳 */
  timestamp: number;
  /** 标签 */
  tags?: Record<string, string>;
}

/**
 * 性能报告响应
 */
export interface PerformanceReportResponse {
  /** 报告ID */
  id: string;
  /** 时间范围 */
  timeRange: {
    start: number;
    end: number;
  };
  /** 指标列表 */
  metrics: PerformanceMetric[];
  /** 统计信息 */
  stats: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

/**
 * Web Vitals 响应
 */
export interface WebVitalsResponse {
  /** CLS (Cumulative Layout Shift) */
  cls?: number;
  /** FID (First Input Delay) */
  fid?: number;
  /** LCP (Largest Contentful Paint) */
  lcp?: number;
  /** FCP (First Contentful Paint) */
  fcp?: number;
  /** TTFB (Time to First Byte) */
  ttfb?: number;
  /** INP (Interaction to Next Paint) */
  inp?: number;
  /** 评分 */
  score?: number;
  /** 时间戳 */
  timestamp: number;
}

// ==================== 错误追踪 API 响应类型 ====================

/**
 * 错误记录响应
 */
export interface ErrorRecordResponse {
  /** 错误ID */
  id: string;
  /** 错误类型 */
  type: 'javascript' | 'promise' | 'resource' | 'network' | 'custom';
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 发生次数 */
  count: number;
  /** 首次发生时间 */
  firstOccurrence: number;
  /** 最后发生时间 */
  lastOccurrence: number;
  /** 上下文信息 */
  context: Record<string, any>;
  /** 用户代理 */
  userAgent?: string;
  /** URL */
  url?: string;
}

/**
 * 错误统计响应
 */
export interface ErrorStatsResponse {
  /** 总错误数 */
  total: number;
  /** 按类型统计 */
  byType: Record<string, number>;
  /** 按严重程度统计 */
  bySeverity: Record<string, number>;
  /** 最近错误 */
  recentErrors: ErrorRecordResponse[];
  /** 高频错误 */
  topErrors: ErrorRecordResponse[];
  /** 时间范围 */
  timeRange?: {
    start: number;
    end: number;
  };
}

// ==================== 用户行为分析 API 响应类型 ====================

/**
 * 分析事件响应
 */
export interface AnalyticsEventResponse {
  /** 事件ID */
  id: string;
  /** 事件类型 */
  type: 'page_view' | 'user_action' | 'route_change' | 'custom';
  /** 事件名称 */
  name: string;
  /** 时间戳 */
  timestamp: number;
  /** 会话ID */
  sessionId: string;
  /** 用户ID */
  userId?: string;
  /** 事件属性 */
  properties: Record<string, any>;
  /** 上下文信息 */
  context: {
    url: string;
    referrer: string;
    userAgent: string;
    screenResolution: string;
    viewport: string;
  };
}

/**
 * 分析统计响应
 */
export interface AnalyticsStatsResponse {
  /** 总事件数 */
  totalEvents: number;
  /** 总页面浏览数 */
  totalPageViews: number;
  /** 总会话数 */
  totalSessions: number;
  /** 平均会话时长 */
  averageSessionDuration: number;
  /** 热门页面 */
  topPages: Array<{
    path: string;
    views: number;
  }>;
  /** 热门操作 */
  topActions: Array<{
    action: string;
    count: number;
  }>;
  /** 时间范围 */
  timeRange?: {
    start: number;
    end: number;
  };
}

// ==================== 存储 API 响应类型 ====================

/**
 * 存储操作响应
 */
export interface StorageResponse<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 存储键 */
  key?: string;
}

// ==================== 配置 API 响应类型 ====================

/**
 * 配置响应
 */
export interface ConfigResponse {
  /** 配置数据 */
  config: Record<string, any>;
  /** 版本 */
  version?: string;
  /** 最后更新时间 */
  lastUpdated?: number;
}

/**
 * LLM 提供商配置响应
 */
export interface LLMProviderConfigResponse {
  /** 提供商ID */
  provider: string;
  /** API 端点 */
  endpoint: string;
  /** 模型列表 */
  models: LLMModel[];
  /** 是否启用 */
  enabled: boolean;
  /** 配置元数据 */
  metadata?: {
    name: string;
    description?: string;
    icon?: string;
  };
}

// ==================== 健康检查 API 响应类型 ====================

/**
 * 健康检查响应
 */
export interface HealthCheckResponse {
  /** 状态 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 时间戳 */
  timestamp: number;
  /** 版本 */
  version?: string;
  /** 服务列表 */
  services?: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    latency?: number;
    message?: string;
  }>;
  /** 系统信息 */
  system?: {
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
    cpu?: number;
  };
}

// ==================== 批量操作响应类型 ====================

/**
 * 批量操作结果
 */
export interface BatchOperationResult<T = unknown> {
  /** 成功的项 */
  succeeded: T[];
  /** 失败的项 */
  failed: Array<{
    item: T;
    error: string;
  }>;
  /** 统计信息 */
  stats: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// ==================== 导出所有类型 ====================

export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  LLMMessage,
  LLMChatCompletionResponse,
  LLMStreamChunk,
  LLMModel,
  LLMModelsResponse,
  LLMErrorResponse,
  AmazonProductData,
  ScraperResponse,
  AnalysisSection,
  AnalysisReportResponse,
  PerformanceMetric,
  PerformanceReportResponse,
  WebVitalsResponse,
  ErrorRecordResponse,
  ErrorStatsResponse,
  AnalyticsEventResponse,
  AnalyticsStatsResponse,
  StorageResponse,
  ConfigResponse,
  LLMProviderConfigResponse,
  HealthCheckResponse,
  BatchOperationResult
};
