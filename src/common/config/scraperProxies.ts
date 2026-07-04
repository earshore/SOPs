// Central scraper proxy provider configuration.

export const DEFAULT_SCRAPER_PROXY_TYPE = 'scraperapi';

export const SCRAPER_PROXY_TYPE_VALUES = [
  'scraperapi',
  'zenrows',
  'brightdata',
  'custom_api',
  'custom_proxy',
  'custom',
] as const;

export type ScraperProxyType = (typeof SCRAPER_PROXY_TYPE_VALUES)[number];
export type ScraperProxyGroup = 'commercial' | 'direct';
type ProxyUrlBuilder = (targetUrl: string, credential: string) => string;

export interface ScraperProxyProviderConfig {
  type: ScraperProxyType;
  displayName: string;
  group: ScraperProxyGroup;
  requiresInput: boolean;
  inputLabel: string;
  inputPlaceholder: string;
  hintText: string;
  isCommercial: boolean;
  domain?: string;
  buildUrl: ProxyUrlBuilder;
}

function buildCustomApiUrl(targetUrl: string, baseUrl: string): string {
  const separator = baseUrl.includes('?') ? (baseUrl.endsWith('=') ? '' : '&url=') : '?url=';
  const finalBase =
    baseUrl.endsWith('url=') || baseUrl.endsWith('url') ? baseUrl : `${baseUrl}${separator}`;
  return `${finalBase}${encodeURIComponent(targetUrl)}`;
}

function buildCustomProxyUrl(targetUrl: string, proxyUrl: string): string {
  return `${proxyUrl}${encodeURIComponent(targetUrl)}`;
}

export const SCRAPER_PROXY_PROVIDERS: Record<ScraperProxyType, ScraperProxyProviderConfig> = {
  scraperapi: {
    type: 'scraperapi',
    displayName: 'ScraperAPI',
    group: 'commercial',
    requiresInput: true,
    inputLabel: 'API Key (密钥)',
    inputPlaceholder: '粘贴 ScraperAPI Key',
    hintText: '请填写对应商业 API Key 或自定义代理地址',
    isCommercial: true,
    domain: 'api.scraperapi.com',
    buildUrl: (targetUrl, key) =>
      `https://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(targetUrl)}`,
  },
  zenrows: {
    type: 'zenrows',
    displayName: 'ZenRows',
    group: 'commercial',
    requiresInput: true,
    inputLabel: 'API Key (密钥)',
    inputPlaceholder: '粘贴 ZenRows Key',
    hintText: '请填写对应商业 API Key 或自定义代理地址',
    isCommercial: true,
    domain: 'api.zenrows.com',
    buildUrl: (targetUrl, key) =>
      `https://api.zenrows.com/v1/?apikey=${key}&url=${encodeURIComponent(targetUrl)}&js_render=true`,
  },
  brightdata: {
    type: 'brightdata',
    displayName: 'Bright Data',
    group: 'commercial',
    requiresInput: true,
    inputLabel: 'API Key (密钥)',
    inputPlaceholder: '粘贴 Bright Data Key',
    hintText: '请填写对应商业 API Key 或自定义代理地址',
    isCommercial: true,
    domain: 'api.brightdata.com',
    buildUrl: (targetUrl, key) =>
      `https://api.brightdata.com/request?customer=${key}&url=${encodeURIComponent(targetUrl)}`,
  },
  custom_api: {
    type: 'custom_api',
    displayName: '自定义 API',
    group: 'commercial',
    requiresInput: true,
    inputLabel: '完整端点 (URL)',
    inputPlaceholder: 'https://api.example.com/?url=',
    hintText: '请确保 URL 包含 url= 参数',
    isCommercial: true,
    buildUrl: buildCustomApiUrl,
  },
  custom_proxy: {
    type: 'custom_proxy',
    displayName: 'HTTP 代理',
    group: 'direct',
    requiresInput: true,
    inputLabel: 'HTTP 代理地址',
    inputPlaceholder: 'http://user:pass@ip:port',
    hintText: '请填写对应商业 API Key 或自定义代理地址',
    isCommercial: false,
    buildUrl: buildCustomProxyUrl,
  },
  custom: {
    type: 'custom',
    displayName: '自定义代理',
    group: 'direct',
    requiresInput: true,
    inputLabel: 'HTTP 代理地址',
    inputPlaceholder: 'http://user:pass@ip:port',
    hintText: '请填写对应商业 API Key 或自定义代理地址',
    isCommercial: false,
    buildUrl: buildCustomProxyUrl,
  },
};

export const SCRAPER_PROXY_CREDENTIAL_TYPES = SCRAPER_PROXY_TYPE_VALUES;

export const SCRAPER_COMMERCIAL_PROXY_OPTIONS = SCRAPER_PROXY_TYPE_VALUES.map(
  type => SCRAPER_PROXY_PROVIDERS[type]
).filter(provider => provider.group === 'commercial');

export const SCRAPER_DIRECT_PROXY_OPTIONS = SCRAPER_PROXY_TYPE_VALUES.map(
  type => SCRAPER_PROXY_PROVIDERS[type]
).filter(provider => provider.group === 'direct' && provider.type !== 'custom');

export function getScraperProxyProvider(
  type: string | undefined
): ScraperProxyProviderConfig | null {
  if (!type || !SCRAPER_PROXY_TYPE_VALUES.includes(type as ScraperProxyType)) {
    return null;
  }

  return SCRAPER_PROXY_PROVIDERS[type as ScraperProxyType];
}

export function getScraperProxyDisplayName(type: string): string {
  return getScraperProxyProvider(type)?.displayName || '默认';
}

export function scraperProxyNeedsInput(type: string): boolean {
  return getScraperProxyProvider(type)?.requiresInput ?? false;
}

export function getScraperProxyInputLabel(type: string): string {
  return getScraperProxyProvider(type)?.inputLabel || 'API Key (密钥)';
}

export function getScraperProxyInputPlaceholder(type: string): string {
  return getScraperProxyProvider(type)?.inputPlaceholder || '';
}

export function getScraperProxyHintText(type: string): string {
  return getScraperProxyProvider(type)?.hintText || '';
}

export function isCommercialScraperProxyType(type: string | undefined): boolean {
  return getScraperProxyProvider(type)?.isCommercial ?? false;
}

export function buildScraperProxyUrl(type: string, targetUrl: string, credential: string): string {
  const provider = getScraperProxyProvider(type);
  if (!provider) {
    return '';
  }

  return provider.buildUrl(targetUrl, credential);
}

export function getScraperProxyEndpointConfigs(): Array<{
  type: ScraperProxyType;
  domain: string;
  displayName: string;
}> {
  return SCRAPER_PROXY_TYPE_VALUES.flatMap(type => {
    const provider = SCRAPER_PROXY_PROVIDERS[type];
    return provider.domain
      ? [{ type, domain: provider.domain, displayName: provider.displayName }]
      : [];
  });
}
