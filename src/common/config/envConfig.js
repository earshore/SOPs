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
      // 如果用户配置的是完整 URL,在开发环境下统一使用代理路径
      if (EnvConfig.isDevelopment) {
        return this.llmBasePath;
      }
      
      // 生产环境: 如果是完整 URL,保持不变;如果是相对路径,使用默认路径
      if (endpoint && (endpoint.startsWith('http://') || endpoint.startsWith('https://'))) {
        // 生产环境下,如果用户配置了完整 URL,需要转换为使用 Functions 代理
        // 但为了兼容性,我们统一使用 /v1
        return this.llmBasePath;
      }
      
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
