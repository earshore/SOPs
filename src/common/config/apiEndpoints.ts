// src/common/config/apiEndpoints.ts
// ================================================================
// 🎯 API端点配置中心
// 统一管理所有API端点，支持环境差异化配置
// ================================================================

/**
 * API端点配置
 */
export interface ApiEndpointConfig {
  /** 域名 */
  domain: string;
  /** 是否需要代理 */
  requiresProxy: boolean;
  /** 显示名称 */
  displayName: string;
  /** 是否为危险端点（生产环境禁止直连） */
  isDangerous?: boolean;
}

/**
 * API端点配置表
 */
export const API_ENDPOINTS: Record<string, ApiEndpointConfig> = {
  openai: {
    domain: 'api.openai.com',
    requiresProxy: true,
    displayName: 'OpenAI',
    isDangerous: true
  },
  anthropic: {
    domain: 'api.anthropic.com',
    requiresProxy: true,
    displayName: 'Anthropic',
    isDangerous: true
  },
  deepseek: {
    domain: 'api.deepseek.com',
    requiresProxy: true,
    displayName: 'DeepSeek',
    isDangerous: true
  },
  google: {
    domain: 'generativelanguage.googleapis.com',
    requiresProxy: true,
    displayName: 'Google AI',
    isDangerous: true
  },
  allorigins: {
    domain: 'api.allorigins.win',
    requiresProxy: false,
    displayName: 'AllOrigins Proxy'
  },
  corsproxy: {
    domain: 'corsproxy.io',
    requiresProxy: false,
    displayName: 'CORS Proxy'
  },
  corsanywhere: {
    domain: 'cors-anywhere.herokuapp.com',
    requiresProxy: false,
    displayName: 'CORS Anywhere'
  },
  scraperapi: {
    domain: 'api.scraperapi.com',
    requiresProxy: false,
    displayName: 'ScraperAPI'
  },
  zenrows: {
    domain: 'api.zenrows.com',
    requiresProxy: false,
    displayName: 'ZenRows'
  },
  brightdata: {
    domain: 'api.brightdata.com',
    requiresProxy: false,
    displayName: 'Bright Data'
  },
  // 自定义网关（通过 Cloudflare Functions 代理，不直连）
  llmgateway: {
    domain: 'ai-gateway.hongecb.store',
    requiresProxy: false,
    displayName: 'AI-Gateway',
    isDangerous: false
  },
  cb: {
    domain: 'cb.hongecb.store',
    requiresProxy: false,
    displayName: 'CB Gateway',
    isDangerous: false
  },
  cb_e: {
    domain: 'sds.dpdns.org',
    requiresProxy: false,
    displayName: 'CB-E Gateway',
    isDangerous: false
  },
  kr: {
    domain: 'kr.hongecb.store',
    requiresProxy: false,
    displayName: 'KR Gateway',
    isDangerous: false
  },
  gptgod: {
    domain: 'api.gptgod.online',
    requiresProxy: false,
    displayName: 'GPTGod',
    isDangerous: false
  },
  chatanywhere: {
    domain: 'api.chatanywhere.org',
    requiresProxy: false,
    displayName: 'ChatAnywhere',
    isDangerous: false
  }
};

/**
 * Amazon域名配置
 */
export const AMAZON_DOMAINS = [
  'amazon.com',
  'amazon.de',
  'amazon.co.uk',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.nl',
  'amazon.se',
  'amazon.pl',
  'amazon.be',
  'amazon.ie'
] as const;

/**
 * 检查端点是否为危险端点
 */
export function isDangerousEndpoint(endpoint: string): boolean {
  return Object.values(API_ENDPOINTS).some(
    config => config.isDangerous && endpoint.includes(config.domain)
  );
}

/**
 * 获取端点配置
 */
export function getEndpointConfig(endpoint: string): ApiEndpointConfig | null {
  for (const [_key, config] of Object.entries(API_ENDPOINTS)) {
    if (endpoint.includes(config.domain)) {
      return config;
    }
  }
  return null;
}

/**
 * 获取所有危险端点域名列表
 */
export function getDangerousEndpoints(): string[] {
  return Object.values(API_ENDPOINTS)
    .filter(config => config.isDangerous)
    .map(config => config.domain);
}

/**
 * 生成CSP connect-src指令
 */
export function generateCSPConnectSrc(): string {
  const domains = [
    "'self'",
    ...Object.values(API_ENDPOINTS).map(config => `https://${config.domain}`),
    ...AMAZON_DOMAINS.map(domain => `https://*.${domain}`)
  ];
  return domains.join(' ');
}

export default API_ENDPOINTS;
