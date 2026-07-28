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
 * 格式化日期为 MM/DD HH:mm（本地时区，补零）
 */
export function formatDate(ts: string): string {
  const date = new Date(ts);
  if (!Number.isFinite(date.getTime())) {
    return ts;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
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
