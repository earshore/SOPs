/**
 * Promptlab 子模块共享类型定义
 * 供各拆分模块的函数签名使用，避免循环依赖和 any 断言
 */

import type { UserProductProfile } from '@/types/state';
import type { ListingPromptVersion } from '../../services/promptlabService';

// ==========================================
// 基础类型
// ==========================================

/** 控制台输出模式 */
export type ConsoleMode = 'listing' | 'visual';

/** DNA 置信度数据 */
export interface DnaConfidence {
  audience: number;
  usps: number;
  specs: number;
  keywords: number;
  keywordsTier1: number;
  keywordsTier2: number;
  negative: number;
  overall: number;
}

export type DnaExtractionStatus = 'high' | 'low' | 'empty';

export type DnaExtractionFieldName =
  'keywordsTier1' | 'keywordsTier2' | 'negative' | 'audience' | 'usps' | 'specs';

export interface DnaExtractionFieldSummary {
  field: DnaExtractionFieldName;
  label: string;
  confidence: number;
  status: DnaExtractionStatus;
  hasValue: boolean;
  source: string;
}

export interface DnaExtractionSummary {
  totalFields: number;
  extractableFields: number;
  highConfidenceFields: number;
  lowConfidenceFields: number;
  emptyFields: number;
  overallConfidence: number;
  reportType: string;
  fields: DnaExtractionFieldSummary[];
  updatedAt: string;
}

// ==========================================
// Alpine 组件上下文接口
// ==========================================

/**
 * Promptlab Alpine 组件上下文接口
 *
 * 各拆分模块的函数以此为参数类型，而非使用 any 断言。
 * 包含组件对外暴露的状态属性 + 需要跨模块调用的方法。
 */
export interface PromptlabAlpineContext {
  // ---- 状态属性 ----
  currentConsoleMode: ConsoleMode;
  listingPromptCache: string;
  visualPromptCache: string;
  lastMarketplace: string;
  originalHeights: Map<HTMLElement, number>;
  profile: UserProductProfile;
  dnaConfidence: DnaConfidence;
  dnaExtractionSummary: DnaExtractionSummary | null;
  hasRenderedReportOnce: boolean;
  expandedDimensions: Set<string>;
  expandedSubItems: Set<string>;
  _unsubscribers: Array<() => void>;
  _appStoreUnsubscribe: (() => void) | null;
  /** Listing Prompt 生成按钮的版本选择菜单是否展开。 */
  listingVersionMenuOpen: boolean;
  /** Listing Prompt 规则版本。 */
  listingVersion: ListingPromptVersion;

  // ---- 跨模块调用的方法 ----
  saveState(): void;
  renderReportAnalysis(): void;
  initializeGranularSelections(dimensionId: string): void;
  handoffListingPromptToDeepChat(): Promise<void>;
}
