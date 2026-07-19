import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/common/ui';
import {
  AMAZON_INSIGHT_PLUGIN_RELEASES_URL,
  openAmazonInsightPluginDownload,
} from '@/common/utils/openAmazonInsightPluginDownload';

vi.mock('@/common/ui', () => ({
  showToast: vi.fn(),
}));

describe('openAmazonInsightPluginDownload', () => {
  beforeEach(() => {
    vi.mocked(showToast).mockReset();
  });

  it('opens the GitHub releases page in a new tab', () => {
    const openWindow = vi.fn(() => ({ closed: false }) as Window);
    expect(openAmazonInsightPluginDownload(openWindow)).toBe(true);
    expect(openWindow).toHaveBeenCalledWith(
      AMAZON_INSIGHT_PLUGIN_RELEASES_URL,
      '_blank',
      'noopener,noreferrer'
    );
    expect(showToast).not.toHaveBeenCalled();
  });

  it('warns when the popup is blocked', () => {
    const openWindow = vi.fn(() => null);
    expect(openAmazonInsightPluginDownload(openWindow)).toBe(false);
    expect(showToast).toHaveBeenCalledWith('请允许浏览器弹窗以打开下载页面', { type: 'warning' });
  });

  it('reports an error when window.open throws', () => {
    const openWindow = vi.fn(() => {
      throw new Error('blocked');
    });
    expect(openAmazonInsightPluginDownload(openWindow)).toBe(false);
    expect(showToast).toHaveBeenCalledWith('打开下载页面失败', { type: 'error' });
  });
});
