// src/types/state.d.ts
// ================================================================
// 状态类型定义
// 为应用状态提供完整的类型约束
// ================================================================

import type {
  AnalysisReport,
  GeneratedPromptProfileSnapshot,
  GeneratedPromptType,
  KeywordHunterSnapshotSource,
  ScrapedData,
} from './modules-business';
import type { TargetMarket, ToneStyle, UserProductDnaField } from './prompt-profile';

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
 * 采集站点类型（简短代码）
 */
export type ScraperSite =
  'US' | 'DE' | 'FR' | 'IT' | 'ES' | 'NL' | 'SE' | 'PL' | 'BE' | 'IE' | 'UK' | 'CA' | 'JP';

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
  [key: string]: unknown;
}

/**
 * Scraper状态
 */
export interface ScraperState {
  isScraping: boolean;
  status?: ScraperStatus;
  selectedSite: ScraperSite | '';
  scrapedData: ScrapedData | null;
  currentHistoryId: string | number | null;
  inputAsins?: string;
  progress?: number;
  error?: string;
  expandedAsin?: string | null;
  currentDataTab?: 'preview' | 'json';
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
  data: Record<string, unknown>;
  charts?: Array<Record<string, unknown>>;
  summary?: string;
}

/**
 * Analysis状态
 */
export interface AnalysisState {
  selectedAsins: string[];
  reportData?: ReportData | null;
  analysisReport?: AnalysisReport | string | null;
  translatedReport?: AnalysisReport | null;
  expandedAsin?: string | null;
  isEditing?: boolean;
  showTranslation?: boolean;
  editHistory?: Array<AnalysisReport | string>;
  lastTranslationModel?: string | null;
  isAnalyzing?: boolean;
  progress?: number;
  currentStep?: string;
  filters?: {
    dateRange?: [number, number];
    categories?: string[];
    priceRange?: [number, number];
  };
  pendingReport?: {
    report: AnalysisReport | string;
    timestamp: string;
  };
}

// ==================== PromptLab状态 ====================

/**
 * Prompt 历史记录项
 * 记录每次 Prompt 生成的历史
 *
 * @remarks
 * 用于追踪和管理用户的 Prompt 生成历史
 */
export interface PromptHistoryItem {
  /**
   * 历史记录唯一标识
   */
  id: string;

  /**
   * 生成的 Prompt 内容
   */
  prompt: string;

  /**
   * AI 响应内容（如果有）
   */
  response: string;

  /**
   * 生成时间戳（毫秒）
   */
  timestamp: number;

  /**
   * 使用的 AI 模型
   *
   * @example 'gpt-4', 'claude-3'
   */
  model?: string;

  /**
   * 消耗的 Token 数量
   */
  tokens?: number;

  /**
   * Prompt 类型
   */
  promptType?: GeneratedPromptType;

  /**
   * 生成时间戳（ISO 8601 格式）
   */
  generatedAt?: string;

  /**
   * 关联的采集历史记录 ID
   */
  historyId?: string | number | null;

  /**
   * 生成时关联的源采集历史记录 ID
   */
  sourceHistoryId?: string | number | null;

  /**
   * 生成时关联的采集数据指纹
   */
  sourceDataFingerprint?: string;

  /**
   * 生成时关联的分析报告指纹
   */
  reportFingerprint?: string;

  /**
   * 关联的 ASIN 列表
   */
  asins?: string[];

  /**
   * 关联站点/市场
   */
  marketplace?: string;

  /**
   * 生成时的输入快照
   */
  profile?: GeneratedPromptProfileSnapshot;
}

/**
 * 用户产品配置
 * 用于 PromptLab 模块的产品 DNA 配置
 *
 * @remarks
 * 此接口定义了生成 Amazon Listing 和 Visual Prompt 所需的所有产品信息
 *
 * @example
 * ```typescript
 * const profile: UserProductProfile = {
 *   targetMarket: 'English',
 *   keywordsTier1: 'wireless earbuds, bluetooth headphones',
 *   keywordsTier2: 'noise cancelling, waterproof, long battery',
 *   audience: 'Young professionals and fitness enthusiasts',
 *   usps: 'Premium sound quality, 48-hour battery life',
 *   specs: 'Bluetooth 5.3, IPX7 waterproof, USB-C charging',
 *   socialHook: 'Experience studio-quality sound on the go',
 *   negative: 'cheap plastic, poor battery life',
 *   tone: 'professional',
 *   customStrategy: '',
 *   useRufus: true,
 *   useEmoji: true,
 *   useCosmo: true,
 *   selectedReportSections: ['features', 'benefits'],
 *   charLimit: 5000
 * };
 * ```
 */
export interface UserProductProfile {
  /**
   * 目标市场/语言
   * 决定生成内容的语言和市场定位
   */
  targetMarket: TargetMarket;

  /**
   * 一级关键词（核心关键词）
   * 产品的主要搜索词，用逗号分隔
   *
   * @example 'wireless earbuds, bluetooth headphones'
   */
  keywordsTier1: string;

  /**
   * 二级关键词（长尾关键词）
   * 产品的次要搜索词和特性描述，用逗号分隔
   *
   * @example 'noise cancelling, waterproof, long battery'
   */
  keywordsTier2: string;

  /**
   * 目标受众
   * 产品的目标用户群体描述
   *
   * @example 'Young professionals and fitness enthusiasts'
   */
  audience: string;

  /**
   * 独特卖点（USPs - Unique Selling Points）
   * 产品的核心竞争优势
   *
   * @example 'Premium sound quality, 48-hour battery life'
   */
  usps: string;

  /**
   * 产品规格
   * 技术参数和规格说明
   *
   * @example 'Bluetooth 5.3, IPX7 waterproof, USB-C charging'
   */
  specs: string;

  /**
   * 社交钩子
   * 吸引用户注意力的营销语句
   *
   * @example 'Experience studio-quality sound on the go'
   */
  socialHook: string;

  /**
   * 负面关键词
   * 需要避免的词汇或竞品缺点
   *
   * @example 'cheap plastic, poor battery life'
   */
  negative: string;

  /**
   * 语气风格
   * Prompt 生成时使用的语气
   *
   * @default 'professional'
   */
  tone: ToneStyle;

  /**
   * 自定义策略
   * 用户自定义的额外指令或策略
   */
  customStrategy: string;

  /**
   * 是否使用 Rufus 优化
   * 启用 Amazon Rufus AI 助手优化
   *
   * @default true
   */
  useRufus: boolean;

  /**
   * 是否使用 Emoji
   * 在生成的内容中包含 Emoji 表情
   *
   * @default true
   */
  useEmoji: boolean;

  /**
   * 是否使用 Cosmo 优化
   * 启用 Cosmo AI 优化功能
   *
   * @default true
   */
  useCosmo: boolean;

  /**
   * 选中的报告章节
   * 从分析报告中选择要包含的章节
   *
   * @deprecated 使用 selectedReportItems 获得更细粒度的控制
   * @example ['features', 'benefits', 'specifications']
   */
  selectedReportSections: string[];

  /**
   * 选中的报告项（细粒度选择）
   * 支持维度级别、子项级别和具体内容项级别的选择控制
   *
   * @example
   * ```typescript
   * {
   *   'title-keywords': {
   *     enabled: true,
   *     subItems: {
   *       'primary_keywords': {
   *         enabled: true,
   *         items: {
   *           '0': true,  // 第一个关键词选中
   *           '1': false  // 第二个关键词未选中
   *         }
   *       },
   *       'secondary_keywords': {
   *         enabled: true,
   *         items: {}  // 空对象表示全选
   *       }
   *     }
   *   }
   * }
   * ```
   */
  selectedReportItems?: {
    [dimensionId: string]: {
      enabled: boolean;
      subItems: {
        [subItemKey: string]:
          | boolean
          | {
              enabled: boolean;
              items?: {
                [itemIndex: string]: boolean;
              };
            };
      };
    };
  };

  /**
   * 当前产品 DNA / 报告选择绑定的分析报告指纹
   *
   * @remarks
   * PromptLab 中从报告派生或在报告上下文下编辑的产品 DNA 不应跨报告复用。
   * 当当前报告指纹与该值不一致时，报告派生字段会被清空并重新初始化。
   */
  reportFingerprint?: string;

  /**
   * 字符限制
   * 生成内容的最大字符数
   *
   * @default 5000
   * @minimum 100
   * @maximum 10000
   */
  charLimit: number;
}

/**
 * Prompt 输入接口
 * 扩展 UserProductProfile，添加分析数据使用标志
 *
 * @remarks
 * 此接口用于 Prompt 生成时的完整输入参数
 * 包含产品配置和是否使用分析数据的标志
 *
 * @example
 * ```typescript
 * const inputs: PromptInputs = {
 *   ...userProductProfile,
 *   useAnalysisData: true
 * };
 * ```
 */
export interface PromptInputs extends UserProductProfile {
  /**
   * 是否使用分析数据
   * 决定是否将 AI 分析报告的数据整合到 Prompt 中
   *
   * @default false
   */
  useAnalysisData: boolean;

  /**
   * 选中的报告项（细粒度选择）
   * 覆盖 UserProductProfile 中的可选字段，确保在 PromptInputs 中可用
   */
  selectedReportItems?: {
    [dimensionId: string]: {
      enabled: boolean;
      subItems: {
        [subItemKey: string]:
          | boolean
          | {
              enabled: boolean;
              items?: {
                [itemIndex: string]: boolean;
              };
            };
      };
    };
  };
}

/**
 * PromptLab 状态
 * 管理 PromptLab 模块的所有状态数据
 *
 * @remarks
 * 包含当前 Prompt、历史记录、用户配置等信息
 */
export interface PromptLabState {
  /**
   * 当前生成的 Prompt 内容
   */
  currentPrompt?: string;

  /**
   * Prompt 生成历史记录
   */
  history?: PromptHistoryItem[];

  /**
   * 用户产品配置
   * 存储用户填写的产品 DNA 信息
   */
  userProductProfile?: UserProductProfile;

  /**
   * 选中的 AI 模型
   *
   * @example 'gpt-4-turbo', 'claude-3-opus'
   */
  selectedModel?: string;

  /**
   * AI 生成温度参数
   * 控制生成内容的随机性
   *
   * @default 0.7
   * @minimum 0
   * @maximum 2
   */
  temperature?: number;

  /**
   * 最大 Token 数量
   * 限制 AI 生成内容的长度
   *
   * @default 4000
   */
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
 * 段落数据
 */
export interface ParagraphData {
  original: string;
  translation?: string;
}

/**
 * KeywordTracker状态
 */
export interface KeywordTrackerState {
  keywords: string[];
  processedCopy: string;
  formattedCopy: string;
  matchedKeywords: Array<{ keyword: string; count: number }>;
  unmatchedKeywords: string[];
  wordFrequency: Array<[string, number]>;
  paragraphs: Array<string | ParagraphData>;
  translationMode: boolean;
  keywordLocationIndex: Record<string, number | number[]>;
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
  currentSnapshotId?: string | null;
  snapshotSource?: KeywordHunterSnapshotSource;
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
  models?: Array<string | { id: string; name?: string; context?: number; features?: string[] }>;
  serviceTier?: 'auto' | 'default' | 'flex' | 'priority';
  /**
   * Global reasoning prefs for this provider config.
   * Applied only when model capability has mapRequest (see modelCapability).
   */
  reasoningPrefs?: {
    enabled: boolean;
    effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  };
  /**
   * User-selected default API path mode (appended to endpoint base).
   * chat_completions | responses | anthropic_messages | gemini_generate
   */
  apiPath?: 'chat_completions' | 'responses' | 'anthropic_messages' | 'gemini_generate';
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
 * Master Analysis 模块状态
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
 * @deprecated 使用 TypedStatePath 获得类型安全
 */
export type StatePath = string;

/**
 * 嵌套键路径工具类型
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
 * 支持点分隔的嵌套路径,如 'ui.currentTab' | 'scraper.selectedSite'
 */
export type TypedStatePath = NestedKeyOf<AppState>;

/**
 * 根据路径获取值类型
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

/**
 * UI模块路径
 */
export type UIPath =
  | 'ui'
  | 'ui.currentTab'
  | 'ui.currentDataTab'
  | 'ui.currentReportTab'
  | 'ui.sidebarCollapsed'
  | 'ui.theme'
  | 'ui.loading';

/**
 * Scraper模块路径
 */
export type ScraperPath =
  | 'scraper'
  | 'scraper.isScraping'
  | 'scraper.status'
  | 'scraper.selectedSite'
  | 'scraper.scrapedData'
  | 'scraper.currentHistoryId'
  | 'scraper.inputAsins'
  | 'scraper.progress'
  | 'scraper.error';

/**
 * Analysis模块路径
 */
export type AnalysisPath =
  | 'analysis'
  | 'analysis.selectedAsins'
  | 'analysis.reportData'
  | 'analysis.analysisReport'
  | 'analysis.translatedReport'
  | 'analysis.expandedAsin'
  | 'analysis.isEditing'
  | 'analysis.showTranslation'
  | 'analysis.editHistory'
  | 'analysis.lastTranslationModel'
  | 'analysis.isAnalyzing'
  | 'analysis.progress'
  | 'analysis.currentStep'
  | 'analysis.filters'
  | 'analysis.pendingReport';

/**
 * PromptLab模块路径
 */
export type PromptLabPath =
  | 'promptlab'
  | 'promptlab.currentPrompt'
  | 'promptlab.history'
  | 'promptlab.userProductProfile'
  | 'promptlab.selectedModel'
  | 'promptlab.temperature'
  | 'promptlab.maxTokens';

/**
 * KeywordTracker模块路径
 */
export type KeywordTrackerPath =
  | 'keywordTracker'
  | 'keywordTracker.keywords'
  | 'keywordTracker.processedCopy'
  | 'keywordTracker.formattedCopy'
  | 'keywordTracker.matchedKeywords'
  | 'keywordTracker.unmatchedKeywords'
  | 'keywordTracker.wordFrequency'
  | 'keywordTracker.paragraphs'
  | 'keywordTracker.translationMode'
  | 'keywordTracker.keywordLocationIndex'
  | 'keywordTracker.settings'
  | 'keywordTracker.isWindowMinimized'
  | 'keywordTracker.trackingData'
  | 'keywordTracker.isTracking'
  | 'keywordTracker.filters'
  | 'keywordTracker.keywordsInputText'
  | 'keywordTracker.copyInputText'
  | 'keywordTracker.llmAnalysisResult'
  | 'keywordTracker.showTranslation';

/**
 * 所有可用的状态路径(类型安全)
 */
export type ValidStatePath =
  UIPath | ScraperPath | AnalysisPath | PromptLabPath | KeywordTrackerPath;

// ==================== 状态操作类型 ====================

/**
 * 状态操作类型
 */
export type StateActionType = 'SET' | 'BATCH_UPDATE' | 'RESET' | 'MERGE';

/**
 * 状态操作
 */
export interface StateAction<T = unknown> {
  type: StateActionType;
  path: StatePath;
  value: T;
  oldValue?: T;
  meta?: Record<string, unknown>;
}

/**
 * 批量更新操作
 */
export interface BatchUpdateAction {
  type: 'BATCH_UPDATE';
  changes: Array<{
    path: StatePath;
    value: unknown;
    oldValue?: unknown;
  }>;
  meta?: Record<string, unknown>;
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
export type StateSubscriber<T = unknown> = (newValue: T, oldValue: T) => void;

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
  get<T = unknown>(path?: StatePath): T;

  /**
   * 设置状态
   */
  set<T = unknown>(path: StatePath, value: T, meta?: Record<string, unknown>): void;

  /**
   * 批量更新
   */
  batchUpdate(updates: Record<StatePath, unknown>): void;

  /**
   * 订阅状态变化
   */
  subscribe<T = unknown>(path: StatePath, callback: StateSubscriber<T>): () => void;

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
  TargetMarket,
  ToneStyle,
  UserProductProfile,
  UserProductDnaField,
  PromptInputs,
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
  IPersistMiddleware,
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
  [key: string]: unknown;
}

/**
 * 状态历史记录
 */
export interface StateHistory extends StateAction {
  timestamp: number;
}
