// src/types/modules.d.ts
// ================================================================
// 业务模块类型定义
// ================================================================

/**
 * 模块生命周期钩子
 */
export interface ModuleLifecycle {
  /** 模块初始化(在mount之前调用) */
  onInit?(): Promise<void> | void;
  /** 模块挂载完成 */
  onMounted?(): Promise<void> | void;
  /** 模块激活(从其他模块切换回来) */
  onActivated?(): Promise<void> | void;
  /** 模块失活(切换到其他模块) */
  onDeactivated?(): Promise<void> | void;
  /** 模块卸载前 */
  onBeforeUnmount?(): Promise<void> | void;
  /** 模块卸载完成 */
  onUnmounted?(): Promise<void> | void;
  /** 模块错误处理 */
  onError?(error: Error): void;
}

/**
 * 模块接口(增强版)
 */
export interface IModule extends ModuleLifecycle {
  /** 模块唯一标识 */
  readonly id: string;
  /** 模块名称 */
  readonly name: string;
  /** 模块版本 */
  readonly version: string;
  /** 模块元信息 */
  readonly metadata?: ModuleMetadata;

  /** 挂载模块到容器 */
  mount(container: HTMLElement): Promise<void> | void;
  /** 卸载模块 */
  unmount(): Promise<void> | void;
  /** 获取模块状态 */
  getState(): ModuleState;
  /** 模块是否已挂载 */
  isMounted(): boolean;

  /** 向后兼容 */
  onUnmount?(): void;
}

/**
 * 模块元信息
 */
export interface ModuleMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  permissions?: string[];
}

/**
 * 模块加载器配置
 */
export interface ModuleLoaderConfig {
  containerId: string;
  shellId: string;
  moduleMap: Record<string, () => Promise<IModule>>;
  loaderColor?: string;
  moduleName?: string;
}

/**
 * 视图配置
 */
export interface ViewConfig {
  id: string;
  path: string;
  template?: string;
  cached?: boolean;
}

/**
 * 侧边栏配置
 */
export interface SidebarConfig {
  moduleId: string;
  categories: Record<string, CategoryConfig>;
  overviewRouteId: string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
}

/**
 * 总览页配置
 */
export interface OverviewConfig {
  layout?: 'grid' | 'list' | 'card-grid' | 'timeline';
  showSearch?: boolean;
  showFilter?: boolean;
  showStats?: boolean;
  showGuide?: boolean;
  customGuide?: string | null;
  categoryKey?: string | null;
}

/**
 * 分类配置
 */
export interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  order: number;
  version: string;
  description: string;
}

/**
 * 动作处理器
 */
export type ActionHandler = (...args: unknown[]) => void | Promise<void>;

/**
 * 动作映射
 */
export type ActionMap = Record<string, ActionHandler>;

/**
 * 清理函数
 */
export type DisposeFn = () => void;

/**
 * 模块状态
 */
export interface ModuleState {
  mounted: boolean;
  loading: boolean;
  error: Error | null;
  data: unknown;
}

/**
 * Scraper数据
 */
export interface ScraperData {
  url: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

/**
 * 历史记录项
 */
export interface HistoryItem {
  id: string;
  timestamp: number;
  data: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * 分析结果
 */
export interface AnalysisResult {
  id: string;
  type: string;
  data: unknown;
  insights?: string[];
  recommendations?: string[];
  timestamp: number;
}

/**
 * 关键词数据
 */
export interface KeywordData {
  keyword: string;
  frequency: number;
  locations: number[];
  matched: boolean;
}

/**
 * 关键词追踪设置
 */
export interface KeywordTrackerSettings {
  matchPlural: boolean;
  matchStem: boolean;
  matchCase: boolean;
  matchPartial: boolean;
}

/**
 * 关键词追踪数据
 */
export interface KeywordTrackerData {
  keywords: string[];
  processedCopy: string;
  formattedCopy: string;
  matchedKeywords: KeywordData[];
  unmatchedKeywords: string[];
  wordFrequency: Array<{ word: string; count: number }>;
  paragraphs: string[];
  keywordLocationIndex: Record<string, number[]>;
}

/**
 * Prompt模板
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  template: string;
  variables?: string[];
  category?: string;
}

/**
 * 邮件模板
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  tags?: string[];
}

/**
 * SOP项
 */
export interface SOPItem {
  id: string;
  title: string;
  description: string;
  category: string;
  steps?: string[];
  resources?: Array<{ name: string; url: string }>;
}

/**
 * 智库文章
 */
export interface HubArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  author?: string;
  publishDate?: string;
}
