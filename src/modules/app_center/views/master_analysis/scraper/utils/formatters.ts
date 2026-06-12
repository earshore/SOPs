/**
 * 格式化工具函数
 */

/**
 * 获取国旗emoji
 */
export function getFlag(site: string): string {
    const map: Record<string, string> = {
        DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱',
        SE: '🇸🇪', PL: '🇵🇱', BE: '🇧🇪', IE: '🇮🇪', UK: '🇬🇧', GB: '🇬🇧'
    };
    return map[site] || '🏳️';
}

/**
 * 获取站点名称
 */
export function getSiteName(site: string): string {
    const map: Record<string, string> = {
        DE: '德国', FR: '法国', IT: '意大利', ES: '西班牙', NL: '荷兰',
        SE: '瑞典', PL: '波兰', BE: '比利时', IE: '爱尔兰', UK: '英国'
    };
    return map[site] || site;
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
    const SITE_DOMAIN_MAP: Record<string, string> = {
        DE: 'amazon.de', FR: 'amazon.fr', IT: 'amazon.it', ES: 'amazon.es',
        NL: 'amazon.nl', SE: 'amazon.se', PL: 'amazon.pl', BE: 'amazon.com.be',
        IE: 'amazon.ie', UK: 'amazon.co.uk', GB: 'amazon.co.uk'
    };
    return SITE_DOMAIN_MAP[site] || 'amazon.com';
}

/**
 * 获取站点网址
 */
export function getSiteUrl(site: string): string {
    return `www.${getSiteDomain(site)}`;
}
