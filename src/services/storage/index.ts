// src/services/storage/index.ts
// ================================================================
// 🎯 统一数据持久化服务 · 聚合入口（Level 3 B'）
// 将拆分后的核心引擎、加密适配层与业务域模块聚合为统一 API，
// 与原 storageService.ts 的导出签名保持 1:1 兼容。
// ================================================================

// 核心读写引擎与常量（IStorageService 单例、STORAGE_KEYS、类型等）
export {
  StorageService,
  getStorageCore,
  getRuntimeStorageStrategyOptions,
  STORAGE_KEYS,
  CACHE_PREFIXES,
} from './core';

// 核心类型
export type {
  LRUConfig,
  StorageUsage,
  AccessTimeRecord,
  RuntimeStorageStrategyOptions,
} from './core';

// 加密存储适配层
export { setSecure, getSecure, removeSecure } from './secure';

// LLM 配置域
export {
  getLLMConfigWithKey,
  getLLMConfig,
  setLLMConfig,
  setLLMModelCatalog,
} from './business/llmConfig';

// 代理配置域
export {
  getProxyConfig,
  setProxyConfig,
  getProxyKeyMap,
  setProxyKeyMap,
  hasProxyCredential,
  getProxyConfigWithCredential,
  setProxyConfigWithCredential,
} from './business/proxyConfig';

// 采集历史域
export {
  getScrapeHistory,
  setScrapeHistory,
  getScrapeHistoryAsync,
  setScrapeHistoryAsync,
  removeScrapeHistoryAsync,
} from './business/scrapeHistory';

// 布局配置域
export { getLayoutConfig, setLayoutConfig } from './business/layoutConfig';

// 默认导出与原模块一致
export { StorageService as default } from './core';

// 内部工具（业务域迁移逻辑复用）
export {
  getLLMCredentialKey,
  getProxyCredentialKey,
  isRecord,
  isStringMap,
  parseLegacyPlainSecret,
  stripLLMSecret,
  stripProxySecret,
  hasSensitivePlainValue,
} from './core';
