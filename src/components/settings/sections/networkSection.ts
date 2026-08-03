// TD-SET-01 Phase 1: network section fragment (verbatim).
import {
  DEFAULT_SCRAPER_PROXY_TYPE,
  SCRAPER_COMMERCIAL_PROXY_OPTIONS,
  SCRAPER_DIRECT_PROXY_OPTIONS,
  buildScraperProxyUrl,
  getScraperProxyDisplayName,
  getScraperProxyHintText,
  getScraperProxyInputLabel,
  getScraperProxyInputPlaceholder,
  scraperProxyNeedsInput,
  type ScraperProxyProviderConfig,
} from '@/common/config/scraperProxies';
import { ProxyConfig } from '@/types/modules-business';
import { ProxyState, SettingsPanelPart } from '../panelTypes';
import { StorageService } from '@/services/storageService';
import { confirmWithModal } from '@/components/modal/confirmModal';
import { showToast } from '@/common/ui';
import { saveSettingsDomainPartition } from '../domain/settingsDomain';

/** Lightweight public URL used only to exercise the configured proxy path. */
const PROXY_PROBE_TARGET_URL = 'https://www.example.com/';
function applyProxyProbeFailure(
  proxy: ProxyState,
  message: string,
  toastType: 'warning' | 'error' = 'error'
): void {
  proxy.testError = message;
  proxy.testMessage = message;
  proxy.status = 'error';
  showToast(message, { type: toastType });
}
function applyProxyProbeSuccess(proxy: ProxyState): void {
  proxy.status = 'ok';
  proxy.testError = '';
  proxy.testMessage = '代理连接成功';
  showToast('代理连接成功', { type: 'success' });
}

function formatProxyProbeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : '代理连接失败';
  if (error instanceof Error && (error.name === 'AbortError' || /timeout|aborted/i.test(raw))) {
    return '代理连接超时';
  }
  return raw || '代理连接失败';
}

export const networkSectionBehavior: SettingsPanelPart = {
  get commercialProxyOptions(): readonly ScraperProxyProviderConfig[] {
    return SCRAPER_COMMERCIAL_PROXY_OPTIONS;
  },

  get directProxyOptions(): readonly ScraperProxyProviderConfig[] {
    return SCRAPER_DIRECT_PROXY_OPTIONS;
  },

  get proxyNeedsInput(): boolean {
    return scraperProxyNeedsInput(this.proxy.type);
  },

  get proxyInputLabel(): string {
    return getScraperProxyInputLabel(this.proxy.type);
  },

  get proxyInputPlaceholder(): string {
    return getScraperProxyInputPlaceholder(this.proxy.type);
  },

  get proxyInputType(): string {
    return this.proxy.showKey ? 'text' : 'password';
  },

  get proxyKeyIconClass(): string {
    return this.proxy.showKey ? 'fa-eye-slash' : 'fa-eye';
  },

  get proxyKeyVisibilityLabel(): string {
    return this.proxy.showKey ? '隐藏采集网络 API Key' : '显示采集网络 API Key';
  },

  get proxyHintText(): string {
    return getScraperProxyHintText(this.proxy.type);
  },

  async loadProxyConfig(): Promise<void> {
    const savedConfig = StorageService.getProxyConfig() as {
      type?: string;
      customUrl?: string;
    } | null;
    this.proxy.savedKeyMap = await StorageService.getProxyKeyMap();

    this.proxy.type = savedConfig?.type || DEFAULT_SCRAPER_PROXY_TYPE;
    // If the saved active type matches current type, use its URL, otherwise fallback to cache
    if (savedConfig?.type === this.proxy.type) {
      this.proxy.customUrl = savedConfig?.customUrl || '';
    } else {
      this.proxy.customUrl = this.proxy.savedKeyMap[this.proxy.type] || '';
    }
  },

  async saveProxyConfig(): Promise<void> {
    // Update cache map
    this.proxy.savedKeyMap[this.proxy.type] = this.proxy.customUrl;

    // Save active config (SettingsDomain ??????)
    await saveSettingsDomainPartition('proxy', {
      type: this.proxy.type as ProxyConfig['type'],
      customUrl: this.proxy.customUrl,
      keyMap: this.proxy.savedKeyMap,
    });

    this.captureSettingsBaseline();
    showToast('网络配置已更新', { type: 'success' });
  },

  async testProxyConnection(): Promise<void> {
    // Clear previous probe result; never close the panel on failure (UT-P0-10).
    this.proxy.testError = '';
    this.proxy.testMessage = '';
    this.proxy.status = '';

    if (scraperProxyNeedsInput(this.proxy.type) && !this.proxy.customUrl.trim()) {
      applyProxyProbeFailure(this.proxy, '请先填写 API Key 或代理地址', 'warning');
      return;
    }

    const fetchUrl = buildScraperProxyUrl(
      this.proxy.type,
      PROXY_PROBE_TARGET_URL,
      this.proxy.customUrl
    );
    if (!fetchUrl) {
      applyProxyProbeFailure(this.proxy, '不支持的代理类型');
      return;
    }

    this.proxy.isTesting = true;
    this.proxy.status = 'testing';
    const timeoutMs = this.runtimeStrategy.settings.scraper.requestTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      showToast('正在测试代理连接...', { type: 'info' });
      const response = await fetch(fetchUrl, { method: 'GET', signal: controller.signal });
      if (!response.ok) {
        throw new Error(`代理响应异常 (HTTP ${response.status})`);
      }
      applyProxyProbeSuccess(this.proxy);
    } catch (error) {
      applyProxyProbeFailure(this.proxy, formatProxyProbeError(error));
    } finally {
      clearTimeout(timeoutId);
      this.proxy.isTesting = false;
    }
  },

  setProxyType(event: Event): void {
    this.proxy.type = (event.target as HTMLSelectElement).value;
  },

  setProxyCustomUrl(event: Event): void {
    this.proxy.customUrl = (event.target as HTMLInputElement).value;
  },

  async toggleProxyKeyVisibility(): Promise<void> {
    if (this.proxy.showKey) {
      this.proxy.showKey = false;
      return;
    }
    const confirmed = await confirmWithModal(
      '\u663e\u793a\u4ee3\u7406\u51ed\u636e',
      '\u4ee3\u7406\u51ed\u636e\u5c06\u4ee5\u660e\u6587\u5c55\u793a\uff1b\u540c\u6e90\u811a\u672c\u4e0e\u6d4f\u89c8\u5668\u6269\u5c55\u5747\u53ef\u8bfb\u53d6\u672c\u673a\u5b58\u50a8\uff0c\u5171\u4eab\u7535\u8111\u8bf7\u52ff\u5c55\u793a\u6216\u590d\u5236\u3002',
      '',
      '\u663e\u793a'
    );
    if (confirmed) {
      this.proxy.showKey = true;
    }
  },

  getProxyDisplayName(type: string): string {
    return getScraperProxyDisplayName(type);
  },
};
