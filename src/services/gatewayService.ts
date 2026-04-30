/**
 * gatewayService.ts
 *
 * 网关服务 - 动态加载和管理网关配置
 * 从后端 API 获取可用网关列表，替代硬编码配置
 */

import { Logger } from './loggerService';
import { ApiError, NetworkError } from '@/common/errors/AppError';

/**
 * 网关信息接口
 */
export interface GatewayInfo {
  id: string;
  name: string;
  endpoint: string;
  protocol: 'openai' | 'anthropic';
}

/**
 * 网关列表响应接口
 */
interface GatewayListResponse {
  gateways: GatewayInfo[];
  count: number;
  timestamp: number;
}

/**
 * 网关服务类
 */
class GatewayService {
  private gateways: GatewayInfo[] = [];
  private loading = false;
  private lastFetch = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

  /**
   * 获取可用网关列表
   * @param forceRefresh - 是否强制刷新
   */
  async fetchGateways(forceRefresh = false): Promise<GatewayInfo[]> {
    // 检查缓存
    const now = Date.now();
    if (!forceRefresh && this.gateways.length > 0 && now - this.lastFetch < this.CACHE_TTL) {
      Logger.debug('[GatewayService] Using cached gateways', { count: this.gateways.length });
      return this.gateways;
    }

    // 防止重复请求
    if (this.loading) {
      Logger.debug('[GatewayService] Already loading, waiting...');
      await this.waitForLoading();
      return this.gateways;
    }

    this.loading = true;

    try {
      Logger.info('[GatewayService] Fetching gateways from API');

      const authPassword = this.getAuthPassword();
      if (!authPassword) {
        throw new ApiError(
          'AUTH_PASSWORD not configured',
          'AUTH_PASSWORD_MISSING',
          401,
          { module: 'GatewayService', action: 'fetchGateways' }
        );
      }

      const response = await fetch('/v1/gateways', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authPassword}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new ApiError(
          `Failed to fetch gateways: ${response.statusText}`,
          'GATEWAY_FETCH_FAILED',
          response.status,
          { module: 'GatewayService', action: 'fetchGateways' }
        );
      }

      const data: GatewayListResponse = await response.json();

      if (!data.gateways || !Array.isArray(data.gateways)) {
        throw new ApiError(
          'Invalid gateway list response',
          'INVALID_RESPONSE',
          500,
          { module: 'GatewayService', action: 'fetchGateways', data }
        );
      }

      this.gateways = data.gateways;
      this.lastFetch = now;

      Logger.info('[GatewayService] Gateways loaded successfully', {
        count: this.gateways.length,
        gateways: this.gateways.map(g => g.id),
      });

      return this.gateways;

    } catch (error) {
      Logger.error('[GatewayService] Failed to fetch gateways', { error });

      // 如果有缓存，返回缓存数据
      if (this.gateways.length > 0) {
        Logger.warn('[GatewayService] Using stale cache due to fetch error');
        return this.gateways;
      }

      // 使用默认配置作为 fallback
      Logger.warn('[GatewayService] Using default gateway configuration');
      this.gateways = this.getDefaultGateways();
      return this.gateways;

    } finally {
      this.loading = false;
    }
  }

  /**
   * 获取指定网关信息
   */
  async getGateway(gatewayId: string): Promise<GatewayInfo | null> {
    const gateways = await this.fetchGateways();
    return gateways.find(g => g.id === gatewayId) || null;
  }

  /**
   * 获取所有网关 ID
   */
  async getGatewayIds(): Promise<string[]> {
    const gateways = await this.fetchGateways();
    return gateways.map(g => g.id);
  }

  /**
   * 检查网关是否存在
   */
  async hasGateway(gatewayId: string): Promise<boolean> {
    const gateways = await this.fetchGateways();
    return gateways.some(g => g.id === gatewayId);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.gateways = [];
    this.lastFetch = 0;
    Logger.debug('[GatewayService] Cache cleared');
  }

  /**
   * 等待加载完成
   */
  private async waitForLoading(): Promise<void> {
    const maxWait = 10000; // 最多等待 10 秒
    const startTime = Date.now();

    while (this.loading && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 获取认证密码
   */
  private getAuthPassword(): string {
    // 从 localStorage 获取
    try {
      const stored = localStorage.getItem('llm_api_key');
      if (stored) {
        return stored;
      }
    } catch (error) {
      Logger.warn('[GatewayService] Failed to read from localStorage', { error });
    }

    return '';
  }

  /**
   * 获取默认网关配置（fallback）
   */
  private getDefaultGateways(): GatewayInfo[] {
    return [
      {
        id: 'new_api',
        name: 'NEW API',
        endpoint: 'https://new.hongecb.store/v1',
        protocol: 'openai',
      },
    ];
  }
}

// 导出单例
export const gatewayService = new GatewayService();

/**
 * 初始化网关服务
 * 应在应用启动时调用
 */
export async function initGatewayService(): Promise<void> {
  try {
    Logger.info('[GatewayService] Initializing...');
    await gatewayService.fetchGateways();
    Logger.info('[GatewayService] Initialized successfully');
  } catch (error) {
    Logger.error('[GatewayService] Initialization failed', { error });
    // 不抛出错误，使用 fallback 配置
  }
}
