// src/common/config/envConfig.js
// ================================================================
// 🌐 环境配置管理
// 自动检测开发/生产环境并提供相应配置
// ================================================================

/**
 * 检测当前运行环境
 * @returns {'development' | 'production'}
 */
export function getEnvironment() {
  if (typeof window === 'undefined') {
    return 'production';
  }
  
  const hostname = window.location.hostname;
  
  // 开发环境特征
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  ) {
    return 'development';
  }
  
  return 'production';
}

/**
 * 环境配置
 */
export const EnvConfig = {
  /**
   * 当前环境
   */
  get environment() {
    return getEnvironment();
  },

  /**
   * 是否为开发环境
   */
  get isDevelopment() {
    return this.environment === 'development';
  },

  /**
   * 是否为生产环境
   */
  get isProduction() {
    return this.environment === 'production';
  },

  /**
   * API 配置
   */
  api: {
    /**
     * 获取 LLM API 的基础路径
     * 开发环境: /v1 (通过 Vite 代理)
     * 生产环境: /v1 (通过 Cloudflare Functions)
     */
    get llmBasePath() {
      return '/v1';
    },

    /**
     * 标准化 API Endpoint
     * @param {string} endpoint - 用户配置的 endpoint
     * @returns {string} 标准化后的 endpoint
     */
    normalizeEndpoint(endpoint) {
      // 开发环境: 统一使用代理路径
      if (EnvConfig.isDevelopment) {
        return this.llmBasePath;
      }
      
      // 生产环境: 
      // 1. 如果用户配置了完整的 URL (http/https 开头),直接使用
      // 2. 如果是相对路径或空,使用 Cloudflare Functions 代理
      if (endpoint && (endpoint.startsWith('http://') || endpoint.startsWith('https://'))) {
        // 移除末尾的 /v1 (如果存在),避免重复
        let normalizedUrl = endpoint.trim();
        if (normalizedUrl.endsWith('/v1')) {
          normalizedUrl = normalizedUrl.slice(0, -3);
        }
        // 保留用户配置的完整 URL,直接调用外部网关
        return normalizedUrl;
      }
      
      // 使用 Cloudflare Functions 代理
      return this.llmBasePath;
    }
  },

  /**
   * 日志配置
   */
  logging: {
    /**
     * 是否启用详细日志
     */
    get verbose() {
      return EnvConfig.isDevelopment;
    }
  }
};

export default EnvConfig;
