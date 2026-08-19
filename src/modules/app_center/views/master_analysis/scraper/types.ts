/**
 * Scraper 模块类型定义
 *
 * 注意：ProductData、ScrapedData等核心类型使用全局类型定义
 * 参见：src/types/modules-business.d.ts
 */

import type { ScraperProxyType } from '@/common/config/scraperProxies';
import type {
  ScrapedData,
  ScrapedDataMetadata,
  ScrapedProduct,
  CustomerReview,
  ScraperSite,
} from '@/types/modules-business';

// ==================== 重新导出全局类型 ====================

/**
 * 重新导出全局类型，方便本地使用
 */
export type {
  ScrapedData,
  ScrapedDataMetadata,
  ScrapedProduct as ProductData,
  CustomerReview as ReviewData,
  ScraperSite,
};

// ==================== 采集任务相关类型 ====================

/**
 * 采集任务状态
 */
export type TaskStatus = 'pending' | 'scraping' | 'success' | 'failed';

/**
 * 采集任务
 * 用于跟踪单个ASIN的采集进度
 */
export interface Task {
  /** ASIN标识符 */
  asin: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 状态消息（纯文本） */
  message: string;
  /** 富文本消息（HTML格式，用于成功状态） */
  richMsg?: string;
}

/**
 * 任务状态更新回调函数
 */
export type TaskStatusCallback = (asin: string, status: TaskStatus, message: string) => void;

// ==================== 代理配置相关类型 ====================

/**
 * 代理类型
 */
export type ProxyType = ScraperProxyType;

/**
 * 代理配置
 */
export interface ProxyConfig {
  /** 代理类型 */
  type: ProxyType;
  /** 自定义代理URL（当type为custom_api或custom_proxy时必填） */
  customUrl?: string;
  /** 是否启用代理 */
  enabled?: boolean;
}

/**
 * 代理配置状态
 * 用于UI显示
 */
export interface ProxyConfigStatus {
  /** 代理名称（用于显示） */
  name: string;
  /** 代理是否就绪 */
  ready: boolean;
  /** 代理类型 */
  type: ProxyType;
}

// ==================== 数据验证相关类型 ====================

/**
 * 数据验证结果
 */
export interface ValidationResult {
  /** 验证是否通过 */
  valid: boolean;
  /** 错误信息（验证失败时） */
  error?: string;
  /** 验证通过的产品列表 */
  products?: ScrapedProduct[];
}

// ==================== UI相关类型 ====================

/**
 * 数据标签页类型
 */
export type DataTab = 'preview' | 'json';

// ==================== 数据操作相关类型 ====================

/**
 * 操作结果（通用）
 */
export interface OperationResult<T = ScrapedData> {
  /** 操作是否成功 */
  success: boolean;
  /** 操作后的数据（成功时或回滚时） */
  data?: T;
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 导入结果
 */
export type ImportResult = OperationResult<ScrapedData>;

/**
 * 删除操作结果
 */
export type DeleteResult = OperationResult<ScrapedData>;

/**
 * 文件读取结果
 */
export interface FileReadResult {
  /** 解析后的JSON数据 */
  data: unknown;
  /** 文件名 */
  filename: string;
}

/**
 * 确认对话框回调函数
 */
export type ConfirmModalCallback = (
  title: string,
  content: string,
  storageKey: string,
  confirmLabel?: string
) => Promise<boolean>;

// ==================== 数据预览相关类型 ====================

/**
 * 数据预览状态
 */
export interface DataPreviewState {
  /** 当前展开的ASIN（null表示全部收起） */
  expandedAsin: string | null;
  /** 当前数据标签页 */
  currentDataTab: DataTab;
  /** 当前页码（分页） */
  currentPage: number;
  /** 每页显示数量 */
  itemsPerPage: number;
}

/**
 * 卡片操作回调函数
 */
export type CardToggleCallback = (asin: string) => void;
export type CardDeleteCallback = (asin: string) => void;
export type ReviewDeleteCallback = (asin: string, index: number) => void;
