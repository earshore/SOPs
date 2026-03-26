/**
 * constants.ts - 全局常量配置
 * 
 * 包含应用版本、LLM提供商、站点配置、选择器映射等
 */

import { SystemError } from '@/common/errors/AppError';

// ========================
// CONFIGURATION CONSTANTS
// ========================

/** 应用版本号（用于缓存失效） */
export const APP_VERSION = '1.0.1';

// ========================
// USER AGENT POOL
// ========================

/** User-Agent 池（反爬虫核心） */
export const USER_AGENTS: readonly string[] = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
] as const;

/** 随机获取 User-Agent */
export const getRandomUserAgent = (): string => {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  const agent = USER_AGENTS[index];
  if (!agent) {
    throw new SystemError(
      'USER_AGENTS array is empty',
      'USER_AGENTS_EMPTY',
      { module: 'constants', action: 'getRandomUserAgent', arrayLength: USER_AGENTS.length }
    );
  }
  return agent;
};

// ========================
// LLM PROVIDERS
// ========================

/** 模型特性 */
export type ModelFeature = 'vision' | 'function' | 'audio' | 'code';

/** 模型配置 */
export interface ModelConfig {
  id: string;
  context: number;
  features: ModelFeature[];
}

/** LLM提供商配置 */
export interface ProviderConfig {
  name: string;
  endpoint: string;
  models: ModelConfig[];
}

/** LLM提供商映射 */
export const PROVIDERS: Record<string, ProviderConfig> = {
    cb2api: {
    name: "CB",
    endpoint: "https://cb2api.hongecb.store/v1",

    models: [
      { id: "gpt-5.4", context: 400000, features: ["function"] },
      { id: "gemini-3.0-pro", context: 400000, features: ["function"] },
      { id: "gemini-3.0-flash", context: 128000, features: ["function"] }
    ],
  },
  llmgateway: {
    name: "AI-Gateway",
    endpoint: "https://ai-gateway.hongecb.store/v1",
    models: [
      { id: "gpt-5-mini", context: 16385, features: ["function"] },
      { id: "glm-4.5-air", context: 128000, features: ["function"] },
      { id: "z-ai/glm-4.5-air:free", context: 128000, features: ["function"] },
      { id: "hunyuan-lite", context: 32000, features: ["function"] },
      { id: "gemini-2.5-pro", context: 32000, features: ["function"] },
    ],
  },
  openai: {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1",
    models: [
      { id: "gpt-4o", context: 128000, features: ["vision", "function"] },
      { id: "gpt-4o-mini", context: 128000, features: ["vision", "function"] },
      { id: "gpt-4-turbo", context: 128000, features: ["vision", "function"] },
      { id: "gpt-3.5-turbo", context: 16385, features: ["function"] },
    ],
  },
  anthropic: {
    name: "Anthropic",
    endpoint: "https://api.anthropic.com/v1",
    models: [
      { id: "claude-3-5-sonnet-20241022", context: 200000, features: ["vision"] },
      { id: "claude-3-opus-20240229", context: 200000, features: ["vision"] },
      { id: "claude-3-haiku-20240307", context: 200000, features: ["vision"] },
    ],
  },
  google: {
    name: "Google Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    models: [
      { id: "gemini-3-pro", context: 2000000, features: ["vision", "audio"] },
      { id: "gemini-3-flash", context: 1000000, features: ["vision", "audio"] }
    ],
  },
  deepseek: {
    name: "DeepSeek",
    endpoint: "https://api.deepseek.com/v1",
    models: [
      { id: "deepseek-chat", context: 64000, features: ["function"] },
      { id: "deepseek-coder", context: 64000, features: ["code"] },
    ],
  },
  moonshot: {
    name: "Moonshot (Kimi)",
    endpoint: "https://api.moonshot.cn/v1",
    models: [
      { id: "moonshot-v1-128k", context: 128000, features: [] },
      { id: "moonshot-v1-32k", context: 32000, features: [] },
      { id: "moonshot-v1-8k", context: 8000, features: [] },
    ],
  },
  zhipu: {
    name: "智谱GLM",
    endpoint: "https://open.bigmodel.cn/api/paas/v4",
    models: [
      { id: "glm-4.7", context: 128000, features: ["function"] },
      { id: "glm-4.6", context: 128000, features: ["vision", "function"] },
      { id: "glm-4.5", context: 128000, features: ["function"] },
    ],
  },
  qwen: {
    name: "通义千问",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      { id: "qwen-max", context: 32000, features: ["function"] },
      { id: "qwen-plus", context: 131072, features: ["function"] },
      { id: "qwen-turbo", context: 131072, features: [] },
    ],
  },
  hunyuan: {
    name: "腾讯混元",
    endpoint: "https://api.hunyuan.cloud.tencent.com/v1",
    models: [
      { id: "hunyuan-lite", context: 32000, features: ["function"] },
      { id: "hunyuan-turbos-latest", context: 131072, features: ["function"] },
      { id: "hunyuan-vision", context: 131072, features: [] },
    ],
  },
  nim: {
    name: "英伟达Nvidia",
    endpoint: "https://integrate.api.nvidia.com/v1",
    models: [
      { id: "z-ai/glm4.7", context: 32000, features: ["function"] },
      { id: "minimaxai/minimax-m2.1", context: 131072, features: ["function"] }
    ],
  },
  siliconflow: {
    name: "硅基流动",
    endpoint: "https://api.siliconflow.cn/v1",
    models: [
      { id: "deepseek-ai/DeepSeek-V3", context: 32000, features: ["function"] },
    ],
  },
  custom: {
    name: "自定义",
    endpoint: "",
    models: [],
  },
};

// ========================
// SITE CONFIGURATIONS
// ========================

/** 站点配置 */
export interface SiteConfig {
  flag: string;
  name_cn: string;
  locale: string;
  name: string;
  domain: string;
  lang: string;
}

/** 站点配置映射 */
const SITE_CONFIGS: Record<string, SiteConfig> = {
  // 欧洲
  DE: { flag: "🇩🇪", name_cn: "德国", locale: "de_DE", name: "German", domain: "amazon.de", lang: "de-DE,de;q=0.9,en;q=0.1" },
  FR: { flag: "🇫🇷", name_cn: "法国", locale: "fr_FR", name: "French", domain: "amazon.fr", lang: "fr-FR,fr;q=0.9,en;q=0.1" },
  IT: { flag: "🇮🇹", name_cn: "意大利", locale: "it_IT", name: "Italian", domain: "amazon.it", lang: "it-IT,it;q=0.9,en;q=0.1" },
  ES: { flag: "🇪🇸", name_cn: "西班牙", locale: "es_ES", name: "Spanish", domain: "amazon.es", lang: "es-ES,es;q=0.9,en;q=0.1" },
  NL: { flag: "🇳🇱", name_cn: "荷兰", locale: "nl_NL", name: "Dutch", domain: "amazon.nl", lang: "nl-NL,nl;q=0.9,en;q=0.1" },
  SE: { flag: "🇸🇪", name_cn: "瑞典", locale: "sv_SE", name: "Swedish", domain: "amazon.se", lang: "sv-SE,sv;q=0.9,en;q=0.1" },
  PL: { flag: "🇵🇱", name_cn: "波兰", locale: "pl_PL", name: "Polish", domain: "amazon.pl", lang: "pl-PL,pl;q=0.9,en;q=0.1" },
  BE: { flag: "🇧🇪", name_cn: "比利时", locale: "fr_BE", name: "Belgian", domain: "amazon.com.be", lang: "fr-BE,fr;q=0.9,en;q=0.1" },
  IE: { flag: "🇮🇪", name_cn: "爱尔兰", locale: "en_IE", name: "English (IE)", domain: "amazon.ie", lang: "en-IE,en;q=0.9" },
  UK: { flag: "🇬🇧", name_cn: "英国", locale: "en_GB", name: "English (UK)", domain: "amazon.co.uk", lang: "en-GB,en;q=0.9" },

  // 北美
  US: { flag: "🇺🇸", name_cn: "美国", locale: "en_US", name: "English (US)", domain: "amazon.com", lang: "en-US,en;q=0.9" },
  CA: { flag: "🇨🇦", name_cn: "加拿大", locale: "en_CA", name: "English (CA)", domain: "amazon.ca", lang: "en-CA,en;q=0.9" },
  MX: { flag: "🇲🇽", name_cn: "墨西哥", locale: "es_MX", name: "Spanish (MX)", domain: "amazon.com.mx", lang: "es-MX,es;q=0.9" },

  // 亚太
  JP: { flag: "🇯🇵", name_cn: "日本", locale: "ja_JP", name: "Japanese", domain: "amazon.co.jp", lang: "ja-JP,ja;q=0.9,en;q=0.1" },
  AU: { flag: "🇦🇺", name_cn: "澳洲", locale: "en_AU", name: "English (AU)", domain: "amazon.com.au", lang: "en-AU,en;q=0.9" },
  IN: { flag: "🇮🇳", name_cn: "印度", locale: "en_IN", name: "English (IN)", domain: "amazon.in", lang: "en-IN,en;q=0.9" },
  SG: { flag: "🇸🇬", name_cn: "新加坡", locale: "en_SG", name: "English (SG)", domain: "amazon.sg", lang: "en-SG,en;q=0.9" },

  // 其他
  BR: { flag: "🇧🇷", name_cn: "巴西", locale: "pt_BR", name: "Portuguese (BR)", domain: "amazon.com.br", lang: "pt-BR,pt;q=0.9" },
  TR: { flag: "🇹🇷", name_cn: "土耳其", locale: "tr_TR", name: "Turkish", domain: "amazon.com.tr", lang: "tr-TR,tr;q=0.9" },
  AE: { flag: "🇦🇪", name_cn: "阿联酋", locale: "en_AE", name: "English (AE)", domain: "amazon.ae", lang: "en-AE,en;q=0.9" },
  SA: { flag: "🇸🇦", name_cn: "沙特", locale: "ar_SA", name: "Arabic (SA)", domain: "amazon.sa", lang: "ar-SA,ar;q=0.9" },
};

export default SITE_CONFIGS;

// ========================
// HTTP HEADERS
// ========================

/** 基础请求头 */
const BASE_HEADERS: Record<string, string> = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

/** 语言请求头配置 */
export interface LanguageHeader extends Record<string, string> {
  "Accept-Language": string;
  "Content-Language": string;
  locale: string;
  name: string;
  domain: string;
}

/** 自动生成语言请求头 */
export const LANGUAGE_HEADERS: Record<string, LanguageHeader> = Object.entries(SITE_CONFIGS).reduce((acc, [key, config]) => {
  const langParts = config.lang.split(',');
  const headerConfig: LanguageHeader = {
    ...BASE_HEADERS,
    "Accept-Language": config.lang,
    "Content-Language": langParts[0] || config.lang,
    locale: config.locale,
    name: config.name,
    domain: config.domain
  };

  acc[key] = headerConfig;

  // 兼容处理：UK 同时映射到 GB
  if (key === 'UK') {
    acc['GB'] = headerConfig;
  }
  return acc;
}, {} as Record<string, LanguageHeader>);

/** 语言国旗映射 */
export const languageFlagMap: Record<string, string> = Object.entries(SITE_CONFIGS).reduce((acc, [key, config]) => {
  acc[key] = config.flag;
  if (key === 'UK') acc['GB'] = config.flag;
  return acc;
}, {} as Record<string, string>);

/** 站点名称映射（中文） */
export const SITE_NAME_MAP: Record<string, string> = Object.entries(SITE_CONFIGS).reduce((acc, [key, config]) => {
  acc[key] = config.name_cn;
  if (key === 'UK') acc['GB'] = config.name_cn;
  return acc;
}, {} as Record<string, string>);

/** 站点域名映射 */
export const SITE_DOMAIN_MAP: Record<string, string> = Object.entries(SITE_CONFIGS).reduce((acc, [key, config]) => {
  acc[key] = config.domain;
  return acc;
}, {} as Record<string, string>);

// ========================
// PROXY URLS
// ========================

/** 代理服务URL */
export const PROXY_URLS: Record<string, string> = {
  allorigins: "https://api.allorigins.win/raw?url=",
  corsproxy: "https://corsproxy.io/?",
  corsanywhere: "https://cors-anywhere.herokuapp.com/",
  thingproxy: "https://thingproxy.freeboard.io/fetch/",
};

// ========================
// SELECTOR MAP
// ========================

/** CSS选择器映射 */
export const SELECTOR_MAP: Record<string, string[]> = {
  productTitle: [
    "#productTitle",
    "#title",
    'h1[data-automation-id="title"]',
    "span#productTitle",
    "#titleSection #title",
  ],
  price: [
    ".a-price .a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    "#corePrice_feature_div .a-offscreen",
    "span.a-price span.a-offscreen"
  ],
  bulletPoints: [
    "#feature-bullets ul li .a-list-item",
    "#productFactsDesktop_feature_div ul li",
    ".a-unordered-list.a-vertical li",
  ],
  reviewContainers: [
    '[data-hook="review"]',
    ".review",
    ".a-section.review",
    "#cm_cr-review_list .review",
    ".cr-widget-Reviews .review",
  ],
  reviewBody: [
    '[data-hook="review-body"] span:not(.cr-original-review-content)',
    '[data-hook="review-body"]',
    ".review-text-content span",
    ".review-text span",
    ".reviewText",
    'span[data-hook="review-body"]',
    ".a-size-base.review-text",
    ".cr-original-review-content",
  ],
  reviewTitle: [
    '[data-hook="review-title"] span:not(.a-letter-space)',
    '[data-hook="review-title"]',
    ".review-title span",
    ".a-size-base.a-link-normal.review-title",
    'a[data-hook="review-title"]',
    'a[data-hook="review-title"] span:not(.a-letter-space)',
    ".review-title-content span",
  ],
  reviewRating: [
    '[data-hook="review-star-rating"]',
    '[data-hook="cmps-review-star-rating"]',
    ".review-rating",
    "i.a-icon-star",
  ],
  reviewDate: [
    '[data-hook="review-date"]',
    ".review-date"
  ]
};

// ========================
// VERIFIED PURCHASE PATTERNS
// ========================

/** 已验证购买标识（多语言） */
export const VERIFIED_PURCHASE_PATTERNS: readonly string[] = [
  "Verifizierter Kauf",
  "Achat vérifié",
  "Acquisto verificato",
  "Compra verificada",
  "Geverifieerde aankoop",
  "Verifierat köp",
  "Zweryfikowany zakup",
  "Aankoop geverifieerd",
  "Verified Purchase"
] as const;

/** 已验证购买正则表达式 */
export const VERIFIED_PURCHASE_REGEX = new RegExp(VERIFIED_PURCHASE_PATTERNS.join("|"), "i");

// ========================
// ERROR MESSAGES
// ========================

/** 错误消息映射 */
export const ERROR_MESSAGES: Record<string, string> = {
  "403": "🚫 访问拒绝 (403) - 请切换代理节点或稍后重试",
  "404": "❌ 页面未找到 (404) - 请检查 ASIN 是否正确",
  "429": "⏳ 请求过快 (429) - 触发限流，请暂停 5 秒",
  "500": "🔥 服务器错误 (500) - Amazon 服务端异常",
  "503": "🚧 服务不可用 (503) - Amazon 繁忙",
  "network": "📡 网络连接失败 - 请检查网络或代理设置",
  "captcha": "🤖 触发验证码 - 当前代理已被识别",
  "empty": "⚠️ 页面内容为空 - 解析失败",
};
