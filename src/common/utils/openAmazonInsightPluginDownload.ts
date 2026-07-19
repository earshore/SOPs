import { showToast } from '@/common/ui';

/** Official Amazon Product Insight browser extension release page. */
export const AMAZON_INSIGHT_PLUGIN_RELEASES_URL =
  'https://github.com/earshore/Amazon-Scraper/releases';

export type WindowOpenFn = typeof window.open;

/**
 * Open the Chrome extension GitHub Releases page in a new tab.
 * Returns true when a window handle was obtained.
 */
export function openAmazonInsightPluginDownload(
  openWindow: WindowOpenFn = window.open.bind(window)
): boolean {
  try {
    const newWindow = openWindow(
      AMAZON_INSIGHT_PLUGIN_RELEASES_URL,
      '_blank',
      'noopener,noreferrer'
    );
    if (!newWindow) {
      showToast('请允许浏览器弹窗以打开下载页面', { type: 'warning' });
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Tools] 打开插件下载页面失败:', error);
    showToast('打开下载页面失败', { type: 'error' });
    return false;
  }
}
