/**
 * logger.ts - 日志中间件
 * 
 * 记录所有状态变化（仅开发环境）
 */

import type { StateAction, MiddlewareNext } from '../StateManager';

/**
 * 日志中间件 - 记录所有状态变化
 * @param action - 状态变化动作
 * @param next - 下一个中间件
 * @returns 处理后的动作
 */
export function loggerMiddleware(action: StateAction, next: MiddlewareNext): StateAction | null {
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
