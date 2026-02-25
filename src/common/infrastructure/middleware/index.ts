// src/common/infrastructure/middleware/index.ts
// ================================================================
// ⚠️ DEPRECATED - StateManager 中间件系统已废弃
// 
// 请使用 Zustand 中间件:
// - 持久化: src/stores/middleware/persist.ts
// - DevTools: src/stores/middleware/devtools.ts
// 
// 此文件仅保留用于向后兼容
// ================================================================

// 日志中间件
export {
  createLoggerMiddleware,
  loggerMiddleware,
  debugLoggerMiddleware,
  productionLoggerMiddleware,
  getLogHistory,
  clearLogHistory,
  LogLevel
} from './loggerMiddleware';
export type { LoggerMiddlewareOptions, LogEntry } from './loggerMiddleware';

// 持久化中间件
export {
  createPersistMiddleware,
  persistMiddleware,
  restorePersistedState,
  clearPersistedState,
  createVersionedPersistMiddleware,
  restoreVersionedPersistedState,
  getPersistedStateMetadata,
  getStorageUsage,
  cleanupExpiredStates
} from './persistMiddleware';
export type {
  PersistMiddlewareOptions,
  PersistedStateMetadata,
  VersionedPersistedState,
  StateMigration
} from './persistMiddleware';

// 验证中间件
export {
  createValidationMiddleware,
  validationMiddleware,
  validators
} from './validationMiddleware';
export type {
  ValidationMiddlewareOptions,
  ValidationRule,
  ValidationRules
} from './validationMiddleware';

// 基础类型
export type { Middleware } from '../StateManager';
