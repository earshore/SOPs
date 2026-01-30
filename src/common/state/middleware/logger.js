// src/common/state/middleware/logger.js
// ================================================================
// 🎯 日志中间件
// 记录所有状态变化（仅开发环境）
// ================================================================

/**
 * 日志中间件 - 记录所有状态变化
 * @param {Object} action - 状态变化动作
 * @param {Function} next - 下一个中间件
 * @returns {Object} 处理后的动作
 */
export function loggerMiddleware(action, next) {
  // 仅在开发环境启用
  const isDev = !import.meta.env || import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  if (isDev) {
    console.group(`[State] ${action.type} @ ${new Date().toLocaleTimeString()}`);
    console.log('Path:', action.path);
    console.log('Old Value:', action.oldValue);
    console.log('New Value:', action.value);
    if (action.meta && Object.keys(action.meta).length > 0) {
      console.log('Meta:', action.meta);
    }
    console.groupEnd();
  }
  
  return next();
}

export default loggerMiddleware;
