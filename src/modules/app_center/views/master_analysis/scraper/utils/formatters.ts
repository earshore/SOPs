/**
 * 格式化工具函数
 */

import { SITE_DOMAIN_MAP, SITE_NAME_MAP } from '@/common/constants/constants';

/**
 * 获取站点代码徽标文本
 */
export function getFlag(site: string): string {
  return /^[A-Z]{2}$/.test(site) ? site : '--';
}

/**
 * 获取站点名称
 */
export function getSiteName(site: string): string {
  return SITE_NAME_MAP[site] || site;
}

/**
 * 格式化日期
 */
export function formatDate(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 获取错误摘要
 */
export function getErrorSummary(error: string): string {
  const lowerError = error.toLowerCase();
  if (lowerError.includes('timeout')) return '请求超时';
  if (error.includes('404')) return '页面不存在';
  if (error.includes('403')) return '访问被拒绝';
  if (lowerError.includes('network')) return '网络错误';
  return error;
}

/**
 * 获取站点域名映射
 */
export function getSiteDomain(site: string): string {
  return SITE_DOMAIN_MAP[site] || 'amazon.com';
}

/**
 * 获取站点网址
 */
export function getSiteUrl(site: string): string {
  return `www.${getSiteDomain(site)}`;
}
