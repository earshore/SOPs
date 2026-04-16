/**
 * gateway-resolver.js
 *
 * 网关自动发现和解析模块
 * 从环境变量中自动发现所有配置的网关，实现零代码配置
 *
 * 环境变量规范:
 * - GATEWAY_{ID}_BASE_URL: 网关基础 URL（必需）
 * - GATEWAY_{ID}_API_KEY: API 密钥（必需，支持逗号分隔多 key）
 * - GATEWAY_{ID}_DISPLAY_NAME: 显示名称（可选）
 * - GATEWAY_{ID}_PROTOCOL: 协议类型（可选，默认 openai）
 *
 * 使用示例:
 * ```javascript
 * import { resolveGateway, discoverGateways } from './gateway-resolver.js';
 *
 * const gateway = resolveGateway('new_api', env);
 * const allGateways = discoverGateways(env);
 * ```
 */

/**
 * 网关配置接口
 * @typedef {Object} GatewayConfig
 * @property {string} baseUrl - 网关基础 URL
 * @property {string} apiKey - API 密钥
 * @property {string} displayName - 显示名称
 * @property {string} protocol - 协议类型 (openai | anthropic)
 */

/**
 * 从逗号分隔的多个 API Key 中随机选取一个
 * 支持单 key 和多 key（如 "sk-aaa,sk-bbb,sk-ccc"）
 * @param {string} raw - 原始 key 字符串
 * @returns {string}
 */
function pickApiKey(raw) {
  if (!raw) return "";
  const keys = raw.split(",").map(k => k.trim()).filter(Boolean);
  if (keys.length <= 1) return keys[0] || "";
  return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * 从环境变量中自动发现所有网关
 *
 * 扫描所有 GATEWAY_*_BASE_URL 环境变量，自动提取网关配置
 *
 * @param {object} env - Cloudflare 环境变量对象
 * @returns {Map<string, GatewayConfig>} 网关配置映射表
 *
 * @example
 * // 环境变量:
 * // GATEWAY_NEW_API_BASE_URL=https://new.hongecb.store/v1
 * // GATEWAY_NEW_API_API_KEY=sk-xxx
 * // GATEWAY_NEW_API_DISPLAY_NAME=NEW API
 *
 * const gateways = discoverGateways(env);
 * // Map { 'new_api' => { baseUrl: '...', apiKey: '...', displayName: 'NEW API' } }
 */
export function discoverGateways(env) {
  const gateways = new Map();
  const prefix = 'GATEWAY_';
  const baseUrlSuffix = '_BASE_URL';

  // 扫描所有环境变量
  for (const key in env) {
    if (!key.startsWith(prefix) || !key.endsWith(baseUrlSuffix)) {
      continue;
    }

    // 提取 provider_id
    // GATEWAY_NEW_API_BASE_URL -> NEW_API -> new_api
    const providerIdUpper = key.slice(prefix.length, -baseUrlSuffix.length);
    const providerId = providerIdUpper.toLowerCase();

    // 获取相关配置
    const baseUrl = env[key];
    const apiKeyRaw = env[`${prefix}${providerIdUpper}_API_KEY`] || '';
    const displayName = env[`${prefix}${providerIdUpper}_DISPLAY_NAME`] || providerId.replace(/_/g, ' ').toUpperCase();
    const protocol = env[`${prefix}${providerIdUpper}_PROTOCOL`] || 'openai';

    // 验证必需字段
    if (!baseUrl || !apiKeyRaw) {
      console.warn(`⚠️ Gateway ${providerId} missing required config (baseUrl or apiKey)`);
      continue;
    }

    // 随机选择一个 API Key（支持多 key 负载均衡）
    const apiKey = pickApiKey(apiKeyRaw);

    gateways.set(providerId, {
      baseUrl,
      apiKey,
      displayName,
      protocol,
    });

    console.log(`✅ Discovered gateway: ${providerId} (${displayName})`);
  }

  return gateways;
}

/**
 * 解析指定网关的配置
 *
 * @param {string} provider - 网关标识符（如 'new_api', 'cpa'）
 * @param {object} env - Cloudflare 环境变量对象
 * @returns {GatewayConfig | null} 网关配置，不存在则返回 null
 *
 * @example
 * const gateway = resolveGateway('new_api', env);
 * if (gateway) {
 *   console.log(gateway.baseUrl); // https://new.hongecb.store/v1
 * }
 */
export function resolveGateway(provider, env) {
  const gateways = discoverGateways(env);
  return gateways.get(provider) || null;
}

/**
 * 获取所有可用网关的列表
 *
 * @param {object} env - Cloudflare 环境变量对象
 * @returns {Array<{id: string, name: string, endpoint: string, protocol: string}>}
 *
 * @example
 * const list = listGateways(env);
 * // [
 * //   { id: 'new_api', name: 'NEW API', endpoint: 'https://...', protocol: 'openai' },
 * //   { id: 'cpa', name: 'CPA Gateway', endpoint: 'https://...', protocol: 'openai' }
 * // ]
 */
export function listGateways(env) {
  const gateways = discoverGateways(env);
  return Array.from(gateways.entries()).map(([id, config]) => ({
    id,
    name: config.displayName,
    endpoint: config.baseUrl,
    protocol: config.protocol,
  }));
}

/**
 * 验证网关配置是否完整
 *
 * @param {string} provider - 网关标识符
 * @param {object} env - Cloudflare 环境变量对象
 * @returns {{valid: boolean, error?: string}}
 */
export function validateGateway(provider, env) {
  const gateway = resolveGateway(provider, env);

  if (!gateway) {
    const available = Array.from(discoverGateways(env).keys());
    return {
      valid: false,
      error: `未知网关: ${provider}，可用网关: ${available.join(', ')}`,
    };
  }

  if (!gateway.apiKey) {
    return {
      valid: false,
      error: `网关 ${provider} 未配置 API Key`,
    };
  }

  return { valid: true };
}
