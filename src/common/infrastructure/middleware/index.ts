// src/common/infrastructure/middleware/index.ts
// ================================================================
// StateManager 中间件系统
// 提供日志、持久化、验证等标准中间件
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
