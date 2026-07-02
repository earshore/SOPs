/**
 * utils.ts - UI 工具函数
 * 提供 DOM 操作、错误处理等基础工具
 */

import { ERROR_MESSAGES } from '../constants/constants';

/**
 * 健壮的 DOM 获取器
 */
export const getEl = (id: string): HTMLElement | null => document.getElementById(id);

/**
 * 获取错误摘要信息
 */
export function getErrorSummary(errorMsg: string): string {
  if (!errorMsg) return '未知错误';
  for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
    if (errorMsg.includes(key)) return msg;
  }
  return errorMsg.substring(0, 50);
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
