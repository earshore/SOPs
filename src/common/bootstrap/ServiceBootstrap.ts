/**
 * ServiceBootstrap.ts - 服务初始化管理器
 * 
 * 按依赖顺序初始化所有核心服务，确保启动流程可控
 */

import { errorTracker } from '@/services/errorTracker';
import { analyticsService } from '@/services/analyticsService';
import { performanceStorage } from '@/services/performanceStorage';
import { alertService } from '@/services/alertService';
import { performanceMonitor } from '../devtools/PerformanceMonitor';

/**
 * 服务配置选项
 */
export interface ServiceOptions {
  /** 依赖的服务名称列表 */
  dependencies?: string[];
  /** 是否为可选服务 */
  optional?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 失败时的降级函数 */
  fallback?: () => Promise<any> | any;
}

/**
 * 服务定义
 */
interface ServiceDefinition {
  name: string;
  initializer: () => Promise<any>;
  dependencies: string[];
  optional: boolean;
  timeout: number;
  fallback: (() => Promise<any> | any) | null;
}

/**
 * 失败的服务信息
 */
interface FailedService {
  name: string;
  error: string;
  duration: number;
}

/**
 * 初始化结果
 */
export interface InitializeResult {
  success: boolean;
  failed: FailedService[];
  initialized: string[];
}

/**
 * 服务初始化管理器
 * 负责按依赖关系顺序初始化所有核心服务
 */
export class ServiceBootstrap {
  private services: Map<string, ServiceDefinition> = new Map();
  private initOrder: string[] = [];
  private failedServices: FailedService[] = [];
  private initializedServices: Set<string> = new Set();

  /**
   * 注册服务
   * @param name - 服务名称
   * @param initializer - 初始化函数
   * @param options - 配置选项
   */
  register(
    name: string,
    initializer: () => Promise<any>,
    options: ServiceOptions = {}
  ): void {
    if (this.services.has(name)) {
      console.warn(`[Bootstrap] 服务 "${name}" 已注册，将被覆盖`);
    }

    this.services.set(name, {
      name,
      initializer,
      dependencies: options.dependencies || [],
      optional: options.optional || false,
      timeout: options.timeout || 5000,
      fallback: options.fallback || null
    });

    console.log(`✅ [Bootstrap] 已注册服务: ${name}`);
  }

  /**
   * 按依赖顺序初始化所有服务
   * @returns 初始化结果
   */
  async initialize(): Promise<InitializeResult> {
    console.log('\n🚀 [Bootstrap] 开始初始化服务...\n');
    
    try {
      // 0. 初始化监控服务(优先,所有环境)
      await this._initMonitoringServices();

      // 1. 拓扑排序，确定初始化顺序
      this.initOrder = this._topologicalSort();
      console.log(`📋 [Bootstrap] 初始化顺序:`, this.initOrder.join(' → '));
      
      // 2. 按顺序初始化
      for (const serviceName of this.initOrder) {
        await this._initService(serviceName);
      }
      
      // 3. 报告初始化结果
      this._reportStatus();
      
      return {
        success: this.failedServices.length === 0,
        failed: this.failedServices,
        initialized: Array.from(this.initializedServices)
      };
    } catch (error) {
      console.error('❌ [Bootstrap] 初始化流程失败:', error);
      throw error;
    }
  }

  /**
   * 初始化监控服务
   * @private
   */
  private async _initMonitoringServices(): Promise<void> {
    console.log('📊 [Bootstrap] 初始化监控服务...');

    try {
      // 1. 错误追踪
      errorTracker.init({
        enabled: true,
        sampleRate: 1.0
      });

      // 2. 用户行为分析
      analyticsService.init({
        enabled: true,
        trackPageViews: true,
        trackUserActions: true
      });

      // 3. 性能数据存储
      await performanceStorage.init({
        retentionDays: 7,
        maxRecords: 10000
      });

      // 4. 告警服务
      alertService.init({
        enabled: true,
        showToast: true,
        showBrowserNotification: false
      });

      // 5. 性能监控面板
      performanceMonitor.initialize();

      // 6. 连接数据流: webVitals -> storage
      this._connectMonitoringDataFlow();

      console.log('✅ [Bootstrap] 监控服务初始化完成');
    } catch (error) {
      console.warn('⚠️ [Bootstrap] 监控服务初始化失败:', error);
      // 监控服务失败不影响主流程
    }
  }

  /**
   * 连接监控数据流
   * @private
   */
  private async _connectMonitoringDataFlow(): Promise<void> {
    // 动态导入webVitalsService
    const { webVitalsService } = await import('@/services/webVitalsService');
    const { AlertType } = await import('@/services/alertService');

    // Web Vitals指标自动保存到存储
    webVitalsService.onMetric(async (metric) => {
      try {
        await performanceStorage.save({
          timestamp: Date.now(),
          type: 'webvitals',
          data: {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id
          }
        });

        // 触发告警检查
        if (metric.name === 'LCP') {
          alertService.check(AlertType.PERFORMANCE, { lcp: metric.value });
        } else if (metric.name === 'FID') {
          alertService.check(AlertType.PERFORMANCE, { fid: metric.value });
        } else if (metric.name === 'CLS') {
          alertService.check(AlertType.PERFORMANCE, { cls: metric.value });
        }
      } catch (error) {
        console.warn('[Bootstrap] 保存性能指标失败:', error);
      }
    });

    // 定期检查错误率(每分钟)
    setInterval(() => {
      const stats = errorTracker.getStats();
      const total = stats.total;
      
      if (total > 0) {
        // 计算错误率(假设每分钟100次操作)
        const errorRate = total / 100;
        alertService.check(AlertType.ERROR_RATE, { errorRate });
      }
    }, 60000);

    // 定期检查内存泄漏(每5分钟) - 使用类型断言
    const perfWithMemory = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    if (perfWithMemory.memory) {
      let lastMemory = perfWithMemory.memory.usedJSHeapSize;
      
      setInterval(() => {
        if (perfWithMemory.memory) {
          const currentMemory = perfWithMemory.memory.usedJSHeapSize;
          const memoryGrowth = currentMemory - lastMemory;
          
          alertService.check(AlertType.MEMORY_LEAK, { memoryGrowth });
          lastMemory = currentMemory;
        }
      }, 300000);
    }

    console.log('✅ [Bootstrap] 监控数据流已连接');
  }

  /**
   * 初始化单个服务
   * @param name - 服务名称
   * @returns 服务实例
   * @private
   */
  private async _initService(name: string): Promise<any> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`服务 "${name}" 未注册`);
    }

    // 跳过已初始化的服务
    if (this.initializedServices.has(name)) {
      return;
    }

    console.log(`⏳ [Bootstrap] 初始化服务: ${name}`);
    const startTime = performance.now();

    try {
      // 设置超时
      const result = await Promise.race([
        service.initializer(),
        this._timeout(service.timeout, name)
      ]);

      const duration = Math.round(performance.now() - startTime);
      console.log(`✅ [Bootstrap] ${name} 初始化成功 (${duration}ms)`);
      
      this.initializedServices.add(name);
      return result;

    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [Bootstrap] ${name} 初始化失败 (${duration}ms):`, errorMessage);

      // 如果是可选服务，使用降级方案
      if (service.optional) {
        if (service.fallback) {
          console.warn(`[Bootstrap] 使用 ${name} 的降级方案`);
          try {
            const fallbackResult = await service.fallback();
            this.initializedServices.add(name);
            return fallbackResult;
          } catch (fallbackError) {
            console.error(`[Bootstrap] ${name} 降级方案也失败:`, fallbackError);
          }
        } else {
          console.warn(`[Bootstrap] ${name} 是可选服务，跳过`);
        }
        return null;
      }

      // 如果是必需服务，记录失败
      this.failedServices.push({ 
        name, 
        error: errorMessage,
        duration 
      });
      
      throw error;
    }
  }

  /**
   * 拓扑排序（确定初始化顺序）
   * @returns 排序后的服务名称列表
   * @private
   */
  private _topologicalSort(): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      
      if (visiting.has(name)) {
        throw new Error(`检测到循环依赖: ${name}`);
      }

      visiting.add(name);

      const service = this.services.get(name);
      if (service) {
        // 先访问依赖
        service.dependencies.forEach(dep => {
          if (!this.services.has(dep)) {
            throw new Error(`服务 "${name}" 依赖的 "${dep}" 未注册`);
          }
          visit(dep);
        });
      }

      visiting.delete(name);
      visited.add(name);
      sorted.push(name);
    };

    // 访问所有服务
    for (const name of this.services.keys()) {
      visit(name);
    }

    return sorted;
  }

  /**
   * 超时处理
   * @param ms - 超时时间
   * @param serviceName - 服务名称
   * @returns Promise that rejects on timeout
   * @private
   */
  private _timeout(ms: number, serviceName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`服务 ${serviceName} 初始化超时 (${ms}ms)`));
      }, ms);
    });
  }

  /**
   * 报告初始化状态
   * @private
   */
  private _reportStatus(): void {
    const total = this.services.size;
    const failed = this.failedServices.length;
    const success = total - failed;

    console.log(`\n📊 [Bootstrap] 初始化完成:`);
    console.log(`   ✅ 成功: ${success}/${total}`);
    
    if (failed > 0) {
      console.log(`   ❌ 失败: ${failed}/${total}`);
      this.failedServices.forEach(({ name, error, duration }) => {
        console.log(`      - ${name}: ${error} (${duration}ms)`);
      });
    }
    
    console.log('');
  }

  /**
   * 获取已初始化的服务列表
   * @returns 服务名称列表
   */
  getInitializedServices(): string[] {
    return Array.from(this.initializedServices);
  }

  /**
   * 检查服务是否已初始化
   * @param name - 服务名称
   * @returns 是否已初始化
   */
  isInitialized(name: string): boolean {
    return this.initializedServices.has(name);
  }

  /**
   * 重置初始化状态（用于测试）
   */
  reset(): void {
    this.services.clear();
    this.initOrder = [];
    this.failedServices = [];
    this.initializedServices.clear();
    console.log('✅ [Bootstrap] 已重置');
  }
}

// 创建全局实例
export const serviceBootstrap = new ServiceBootstrap();

// 默认导出
export default serviceBootstrap;
