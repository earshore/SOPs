// src/common/errors/errorCodes.ts
// ================================================================
// 🎯 P0-4: 统一错误处理 - 错误码常量
// 定义所有错误码和对应的用户友好消息
// ================================================================

/**
 * 错误码定义
 */
export const ERROR_CODES = {
  // ==================== 网络错误 (NET_xxx) ====================
  NET_TIMEOUT: {
    code: 'NET_TIMEOUT',
    message: '网络请求超时,请检查网络连接后重试',
    userMessage: '网络超时,请重试',
  },
  NET_OFFLINE: {
    code: 'NET_OFFLINE',
    message: '网络连接已断开',
    userMessage: '网络已断开,请检查网络连接',
  },
  NET_REQUEST_FAILED: {
    code: 'NET_REQUEST_FAILED',
    message: '网络请求失败',
    userMessage: '网络请求失败,请稍后重试',
  },

  // ==================== API错误 (API_xxx) ====================
  API_INVALID_KEY: {
    code: 'API_INVALID_KEY',
    message: 'API密钥无效或已过期',
    userMessage: 'API密钥无效,请检查配置',
  },
  API_RATE_LIMIT: {
    code: 'API_RATE_LIMIT',
    message: 'API调用频率超限',
    userMessage: '请求过于频繁,请稍后再试',
  },
  API_QUOTA_EXCEEDED: {
    code: 'API_QUOTA_EXCEEDED',
    message: 'API配额已用尽',
    userMessage: 'API配额已用尽,请升级套餐或等待配额重置',
  },
  API_INVALID_REQUEST: {
    code: 'API_INVALID_REQUEST',
    message: 'API请求参数无效',
    userMessage: '请求参数错误,请检查输入',
  },
  API_SERVER_ERROR: {
    code: 'API_SERVER_ERROR',
    message: 'API服务器错误',
    userMessage: 'API服务暂时不可用,请稍后重试',
  },
  API_NOT_FOUND: {
    code: 'API_NOT_FOUND',
    message: 'API端点不存在',
    userMessage: '请求的资源不存在',
  },

  // ==================== 验证错误 (VAL_xxx) ====================
  VAL_REQUIRED_FIELD: {
    code: 'VAL_REQUIRED_FIELD',
    message: '必填字段缺失',
    userMessage: '请填写所有必填字段',
  },
  VAL_INVALID_FORMAT: {
    code: 'VAL_INVALID_FORMAT',
    message: '字段格式不正确',
    userMessage: '输入格式不正确,请检查',
  },
  VAL_OUT_OF_RANGE: {
    code: 'VAL_OUT_OF_RANGE',
    message: '字段值超出允许范围',
    userMessage: '输入值超出允许范围',
  },
  VAL_INVALID_EMAIL: {
    code: 'VAL_INVALID_EMAIL',
    message: '邮箱格式不正确',
    userMessage: '请输入有效的邮箱地址',
  },
  VAL_INVALID_URL: {
    code: 'VAL_INVALID_URL',
    message: 'URL格式不正确',
    userMessage: '请输入有效的URL地址',
  },

  // ==================== 业务逻辑错误 (BIZ_xxx) ====================
  BIZ_NO_MODEL_CONFIGURED: {
    code: 'BIZ_NO_MODEL_CONFIGURED',
    message: '未配置AI模型',
    userMessage: '请先在设置中配置AI模型',
  },
  BIZ_NO_DATA: {
    code: 'BIZ_NO_DATA',
    message: '没有可用数据',
    userMessage: '暂无数据,请先添加数据',
  },
  BIZ_OPERATION_FAILED: {
    code: 'BIZ_OPERATION_FAILED',
    message: '操作失败',
    userMessage: '操作失败,请重试',
  },
  BIZ_INVALID_STATE: {
    code: 'BIZ_INVALID_STATE',
    message: '当前状态不允许此操作',
    userMessage: '当前状态不允许此操作',
  },
  BIZ_DUPLICATE_ENTRY: {
    code: 'BIZ_DUPLICATE_ENTRY',
    message: '数据已存在',
    userMessage: '该数据已存在,请勿重复添加',
  },

  // ==================== 系统错误 (SYS_xxx) ====================
  SYS_STORAGE_FULL: {
    code: 'SYS_STORAGE_FULL',
    message: '存储空间已满',
    userMessage: '存储空间不足,请清理数据',
  },
  SYS_STORAGE_ERROR: {
    code: 'SYS_STORAGE_ERROR',
    message: '存储操作失败',
    userMessage: '数据保存失败,请重试',
  },
  SYS_PARSE_ERROR: {
    code: 'SYS_PARSE_ERROR',
    message: '数据解析失败',
    userMessage: '数据格式错误,无法解析',
  },
  SYS_MODULE_LOAD_FAILED: {
    code: 'SYS_MODULE_LOAD_FAILED',
    message: '模块加载失败',
    userMessage: '模块加载失败,请刷新页面',
  },
  SYS_INIT_FAILED: {
    code: 'SYS_INIT_FAILED',
    message: '系统初始化失败',
    userMessage: '系统初始化失败,请刷新页面',
  },

  // ==================== LLM相关错误 (LLM_xxx) ====================
  LLM_TIMEOUT: {
    code: 'LLM_TIMEOUT',
    message: 'LLM请求超时',
    userMessage: 'AI响应超时,请重试',
  },
  LLM_CONTEXT_TOO_LONG: {
    code: 'LLM_CONTEXT_TOO_LONG',
    message: '输入内容过长',
    userMessage: '输入内容过长,请减少输入',
  },
  LLM_CONTENT_FILTERED: {
    code: 'LLM_CONTENT_FILTERED',
    message: '内容被过滤',
    userMessage: '内容包含敏感信息,请修改后重试',
  },
  LLM_INVALID_RESPONSE: {
    code: 'LLM_INVALID_RESPONSE',
    message: 'LLM响应格式无效',
    userMessage: 'AI响应异常,请重试',
  },

  // ==================== 未知错误 ====================
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    message: '未知错误',
    userMessage: '发生未知错误,请重试',
  },
} as const;

/**
 * 错误码类型
 */
export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * 根据错误码获取错误信息
 */
export function getErrorInfo(code: ErrorCode) {
  return ERROR_CODES[code] || ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * 根据错误码获取用户友好消息
 */
export function getUserMessage(code: ErrorCode): string {
  return getErrorInfo(code).userMessage;
}

/**
 * 根据错误码获取技术消息
 */
export function getTechnicalMessage(code: ErrorCode): string {
  return getErrorInfo(code).message;
}
