// src/types/state.d.ts
// ================================================================
// 状态类型定义
// 为应用状态提供完整的类型约束
// ================================================================

// ==================== UI状态 ====================

/**
 * UI状态
 */
export interface UIState {
  currentTab: string;
  currentDataTab: string;
  currentReportTab: string;
  sidebarCollapsed?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  loading?: boolean;
}

// ==================== Scraper状态 ====================

/**
 * 采集站点类型
 */
export type ScraperSite = 'amazon' | 'ebay' | 'walmart' | 'custom';

/**
 * 采集状态
 */
export type ScraperStatus = 'idle' | 'scraping' | 'success' | 'error';

/**
 * 采集数据项
 */
export interface ScrapedDataItem {
  id: string;
  title: string;
  price?: number;
  rating?: number;
  reviews?: number;
  url?: string;
  image?: string;
  [key: string]: any;
}

/**
 * Scraper状态
 */
export interface ScraperState {
  isScraping: boolean;
  status?: ScraperStatus;
  selectedSite: ScraperSite | '';
  scrapedData: ScrapedDataItem[] | any | null;
  currentHistoryId: string | number | null;
  inputAsins?: string;
  progress?: number;
  error?: string;
}

// ==================== Analysis状态 ====================

/**
 * 分析报告类型
 */
export type ReportType = 'overview' | 'detailed' | 'comparison' | 'trend';

/**
 * 报告数据
 */
export interface ReportData {
  type: ReportType;
  generatedAt: number;
  data: any;
  charts?: any[];
  summary?: string;
}

/**
 * Analysis状态
 */
export interface AnalysisState {
  selectedAsins: string[];
  reportData?: ReportData | null;
  analysisReport?: any | null;
  translatedReport?: any | null;
  expandedAsin?: string | null;
  isEditing?: boolean;
  showTranslation?: boolean;
  editHistory?: any[];
  lastTranslationModel?: string | null;
  isAnalyzing?: boolean;
  filters?: {
    dateRange?: [number, number];
    categories?: string[];
    priceRange?: [number, number];
  };
}

// ==================== PromptLab状态 ====================

/**
 * Prompt历史记录
 */
export interface PromptHistoryItem {
  id: string;
  prompt: string;
  response: string;
  timestamp: number;
  model?: string;
  tokens?: number;
}

/**
 * 用户产品配置
 */
export interface UserProductProfile {
  targetMarket: string;
  keywordsTier1: string;
  keywordsTier2: string;
  audience: string;
  usps: string;
  specs: string;
  socialHook: string;
  negative: string;
  tone: string;
  customStrategy: string;
  useRufus: boolean;
  useEmoji: boolean;
  useCosmo: boolean;
  selectedReportSections: string[];
  charLimit: number;
}

/**
 * PromptLab状态
 */
export interface PromptLabState {
  currentPrompt?: string;
  history?: PromptHistoryItem[];
  userProductProfile?: UserProductProfile;
  selectedModel?: string;
  temperature?: number;
  maxTokens?: number;
}

// ==================== KeywordTracker状态 ====================

/**
 * 关键词数据
 */
export interface KeywordData {
  keyword: string;
  searchVolume?: number;
  competition?: 'low' | 'medium' | 'high';
  cpc?: number;
  trend?: number[];
}

/**
 * 追踪数据
 */
export interface TrackingData {
  asin: string;
  keywords: KeywordData[];
  lastUpdated: number;
  coverage?: number;
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
 * KeywordTracker状态
 */
export interface KeywordTrackerState {
  keywords: any[];
  processedCopy: string;
  formattedCopy: string;
  matchedKeywords: any[];
  unmatchedKeywords: any[];
  wordFrequency: any[];
  paragraphs: any[];
  translationMode: boolean;
  keywordLocationIndex: Record<string, any>;
  settings: KeywordTrackerSettings;
  isWindowMinimized: boolean;
  trackingData?: TrackingData | null;
  isTracking?: boolean;
  filters?: {
    minVolume?: number;
    maxCpc?: number;
    competition?: string[];
  };
  // Input 模块状态
  keywordsInputText?: string;
  copyInputText?: string;
  // Analysis 模块状态
  llmAnalysisResult?: string;
  // Process 模块状态
  showTranslation?: boolean;
}

// ==================== User状态 ====================

/**
 * 用户信息
 */
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  permissions?: string[];
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  language?: string;
  timezone?: string;
  notifications?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * User状态
 */
export interface UserState {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  preferences: UserPreferences;
  token?: string;
}

// ==================== Settings状态 ====================

/**
 * LLM Provider配置
 */
export interface LLMProviderConfig {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

/**
 * 代理配置
 */
export interface ProxyConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  auth?: {
    username: string;
    password: string;
  };
}

/**
 * Settings状态
 */
export interface SettingsState {
  llmProviders: Record<string, LLMProviderConfig>;
  proxy: ProxyConfig;
  autoSave?: boolean;
  debugMode?: boolean;
}

// ==================== 完整应用状态 ====================

/**
 * Master Prompt 模块状态
 */
export interface MasterPromptState {
  scraper: ScraperState;
  data: {
    currentTab: string;
  };
  analysis: AnalysisState;
  promptlab: PromptLabState;
}

/**
 * 应用状态树
 */
export interface AppState {
  ui: UIState;
  scraper: ScraperState;
  analysis: AnalysisState;
  promptlab: PromptLabState;
  keywordTracker: KeywordTrackerState;
  masterPrompt?: MasterPromptState;
  user?: UserState;
  settings?: SettingsState;
}

// ==================== 状态路径类型 ====================

/**
 * 状态路径（点分隔）
 */
export type StatePath = string;

/**
 * 嵌套键路径
 */
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

/**
 * 类型安全的状态路径
 */
export type TypedStatePath = NestedKeyOf<AppState>;

// ==================== 状态操作类型 ====================

/**
 * 状态操作类型
 */
export type StateActionType = 'SET' | 'BATCH_UPDATE' | 'RESET' | 'MERGE';

/**
 * 状态操作
 */
export interface StateAction<T = any> {
  type: StateActionType;
  path: StatePath;
  value: T;
  oldValue?: T;
  meta?: Record<string, any>;
}

/**
 * 批量更新操作
 */
export interface BatchUpdateAction {
  type: 'BATCH_UPDATE';
  changes: Array<{
    path: StatePath;
    value: any;
    oldValue?: any;
  }>;
  meta?: Record<string, any>;
}

/**
 * 批量更新选项
 */
export interface BatchUpdateOptions {
  immediate?: boolean;
  debounce?: number;
}

// ==================== 状态订阅类型 ====================

/**
 * 状态订阅回调
 */
export type StateSubscriber<T = any> = (newValue: T, oldValue: T) => void;

/**
 * 状态中间件
 */
export type StateMiddleware = (
  action: StateAction | BatchUpdateAction,
  next: () => StateAction | BatchUpdateAction | null
) => StateAction | BatchUpdateAction | null;

// ==================== 状态管理器接口 ====================

/**
 * 状态管理器接口
 */
export interface IStateManager {
  /**
   * 获取状态
   */
  get<T = any>(path?: StatePath): T;
  
  /**
   * 设置状态
   */
  set<T = any>(path: StatePath, value: T, meta?: Record<string, any>): void;
  
  /**
   * 批量更新
   */
  batchUpdate(updates: Record<StatePath, any>): void;
  
  /**
   * 订阅状态变化
   */
  subscribe<T = any>(path: StatePath, callback: StateSubscriber<T>): () => void;
  
  /**
   * 添加中间件
   */
  use(middleware: StateMiddleware): void;
  
  /**
   * 创建快照
   */
  snapshot(): AppState;
  
  /**
   * 恢复快照
   */
  restore(snapshot: AppState): void;
  
  /**
   * 撤销
   */
  undo(): boolean;
  
  /**
   * 获取历史记录
   */
  getHistory(): Array<StateAction | BatchUpdateAction>;
  
  /**
   * 清空历史记录
   */
  clearHistory(): void;
}

// ==================== 状态持久化 ====================

/**
 * 持久化策略
 */
export type PersistStrategy = 'all' | 'selective' | 'none';

/**
 * 持久化配置
 */
export interface PersistConfig {
  strategy: PersistStrategy;
  paths?: StatePath[];
  storage?: 'localStorage' | 'sessionStorage';
  key?: string;
  encrypt?: boolean;
  debounce?: number;
}

/**
 * 持久化中间件接口
 */
export interface IPersistMiddleware {
  /**
   * 加载持久化状态
   */
  load(): Partial<AppState> | null;
  
  /**
   * 保存状态
   */
  save(state: AppState): void;
  
  /**
   * 清除持久化数据
   */
  clear(): void;
  
  /**
   * 配置持久化
   */
  configure(config: Partial<PersistConfig>): void;
}

// ==================== 导出 ====================

export type {
  UIState,
  ScraperSite,
  ScraperStatus,
  ScrapedDataItem,
  ScraperState,
  ReportType,
  ReportData,
  AnalysisState,
  PromptHistoryItem,
  PromptLabState,
  KeywordData,
  TrackingData,
  KeywordTrackerState,
  UserInfo,
  UserPreferences,
  UserState,
  LLMProviderConfig,
  ProxyConfig,
  SettingsState,
  AppState,
  StatePath,
  NestedKeyOf,
  TypedStatePath,
  StateActionType,
  StateAction,
  BatchUpdateAction,
  StateSubscriber,
  StateMiddleware,
  IStateManager,
  PersistStrategy,
  PersistConfig,
  IPersistMiddleware
};

// ==================== 完整应用状态 ====================

/**
 * 应用状态Schema
 */
export interface StateSchema {
  ui: UIState;
  scraper: ScraperState;
  analysis: AnalysisState;
  promptlab: PromptLabState;
  keywordTracker: KeywordTrackerState;
  [key: string]: any;
}

/**
 * 状态历史记录
 */
export interface StateHistory extends StateAction {
  timestamp: number;
}
