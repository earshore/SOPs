// src/common/config/apiEndpoints.ts
// ================================================================
// 🎯 API端点配置中心
// 统一管理所有API端点，支持环境差异化配置
// ================================================================

import { DEFAULT_NEW_API_DOMAIN } from './llmProviders';
import { getScraperProxyEndpointConfigs } from './scraperProxies';
import { SITE_DOMAIN_MAP } from '@/common/constants/constants';

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

function createScraperProxyEndpointMap(): Record<string, ApiEndpointConfig> {
  const endpoints: Record<string, ApiEndpointConfig> = {};

  for (const config of getScraperProxyEndpointConfigs()) {
    endpoints[config.type] = {
      domain: config.domain,
      requiresProxy: false,
      displayName: config.displayName,
    };
  }

  return endpoints;
}

const SCRAPER_PROXY_ENDPOINTS = createScraperProxyEndpointMap();

/**
 * API端点配置表
 */
export const API_ENDPOINTS: Record<string, ApiEndpointConfig> = {
  openai: {
    domain: 'api.openai.com',
    requiresProxy: true,
    displayName: 'OpenAI',
    isDangerous: true,
  },
  anthropic: {
    domain: 'api.anthropic.com',
    requiresProxy: true,
    displayName: 'Anthropic',
    isDangerous: true,
  },
  deepseek: {
    domain: 'api.deepseek.com',
    requiresProxy: true,
    displayName: 'DeepSeek',
    isDangerous: true,
  },
  google: {
    domain: 'generativelanguage.googleapis.com',
    requiresProxy: true,
    displayName: 'Google AI',
    isDangerous: true,
  },
  // 自部署 OpenAI 兼容中转站，允许浏览器直连。
  new_api: {
    domain: DEFAULT_NEW_API_DOMAIN,
    requiresProxy: false,
    displayName: 'NEW API',
    isDangerous: false,
  },
  ...SCRAPER_PROXY_ENDPOINTS,
};

/**
 * Amazon域名配置
 */
export const AMAZON_DOMAINS = Array.from(new Set(Object.values(SITE_DOMAIN_MAP))) as string[];

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
 * 获取允许浏览器在生产环境直连的端点域名列表
 */
export function getBrowserDirectEndpoints(): string[] {
  return Object.values(API_ENDPOINTS)
    .filter(config => !config.requiresProxy && !config.isDangerous)
    .map(config => config.domain);
}

/**
 * 生成CSP connect-src指令
 */
export function generateCSPConnectSrc(): string {
  const domains = [
    "'self'",
    ...getBrowserDirectEndpoints().map(domain => `https://${domain}`),
    ...AMAZON_DOMAINS.map(domain => `https://*.${domain}`),
  ];
  return domains.join(' ');
}

export default API_ENDPOINTS;
