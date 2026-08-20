// src/services/storageService.ts
// ================================================================
// 🎯 统一数据持久化服务 · 聚合入口（Level 3 B' 拆分后的兼容层）
// 实现已拆分到 src/services/storage/ 子包：
//   core.ts        —— 核心读写引擎 + LRU/Quota 治理
//   secure.ts      —— 加密存储适配层（委托 @/common/utils/secureStorage）
//   business/      —— LLM / 代理 / 采集历史 / 布局配置四个业务域模块
// 本文件保持与原实现 1:1 的导出签名，所有外部引用（import 路径）无需改动。
// ================================================================

export {
  StorageService,
  getStorageCore,
  getRuntimeStorageStrategyOptions,
  STORAGE_KEYS,
  CACHE_PREFIXES,
  setSecure,
  getSecure,
  removeSecure,
  getLLMConfigWithKey,
  getLLMConfig,
  setLLMConfig,
  setLLMModelCatalog,
  getProxyConfig,
  setProxyConfig,
  getProxyKeyMap,
  setProxyKeyMap,
  hasProxyCredential,
  getProxyConfigWithCredential,
  setProxyConfigWithCredential,
  getScrapeHistory,
  setScrapeHistory,
  getScrapeHistoryAsync,
  setScrapeHistoryAsync,
  removeScrapeHistoryAsync,
  getLayoutConfig,
  setLayoutConfig,
  getLLMCredentialKey,
  getProxyCredentialKey,
  isRecord,
  isStringMap,
  parseLegacyPlainSecret,
  stripLLMSecret,
  stripProxySecret,
  hasSensitivePlainValue,
} from './storage';

export type {
  LRUConfig,
  StorageUsage,
  AccessTimeRecord,
  RuntimeStorageStrategyOptions,
} from './storage';

// 默认导出与原模块一致
export { default } from './storage';
