/**
 * ServiceBootstrap.ts - 服务初始化管理器
 * 
 * 按依赖顺序初始化所有核心服务，确保启动流程可控
 * 🎯 重构: 使用DI容器作为底层依赖管理
 */

import type { DIContainer } from '../di/Container';
import type { ServiceRegistry, ServiceName } from '../di/ServiceRegistry';
import { errorTracker } from '@/services/errorTracker';
import { analyticsService } from '@/services/analyticsService';
import { performanceStorage } from '@/services/performanceStorage';
import { alertService, AlertType } from '@/services/alertService';
import { SystemError } from '@/common/errors/AppError';

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
  private failedServices: FailedService[] = [];
  private initializedServices: Set<string> = new Set();

  /**
   * 构造函数
   * @param container - DI容器实例
   * @param registry - 服务注册表实例
   */
  constructor(
    private container: DIContainer,
    private registry: ServiceRegistry
  ) {
    console.log('[Bootstrap] 服务初始化管理器已创建');
  }

  /**
   * 按依赖顺序初始化所有服务（支持并行初始化）
   * @returns 初始化结果
   */
  async initialize(): Promise<InitializeResult> {
    console.log('\n🚀 [Bootstrap] 开始初始化服务...\n');
    
    try {
      // 0. 初始化监控服务(优先,所有环境) - 异步不阻塞
      this._initMonitoringServices().catch(err => {
        console.warn('⚠️ [Bootstrap] 监控服务初始化失败:', err);
      });

      // 1. 验证依赖关系
      const validation = this.container.validateDependencies();
      if (!validation.valid) {
        console.error('❌ [Bootstrap] 依赖验证失败:');
        validation.errors.forEach(err => console.error(`  - ${err}`));
        throw new SystemError(
          `依赖验证失败:\n${validation.errors.join('\n')}`,
          'BOOTSTRAP_DEPENDENCY_VALIDATION_FAILED',
          { module: 'ServiceBootstrap', action: 'initialize', errors: validation.errors }
        );
      }
      console.log('✅ [Bootstrap] 依赖验证通过');

      // 2. 按依赖层级分组并初始化
      await this._initServicesInParallel();
      
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
   * 并行初始化服务（按依赖层级分组）
   * @private
   */
  private async _initServicesInParallel(): Promise<void> {
    // 按依赖层级分组
    const levels = this._groupByDependencyLevel();
    
    console.log(`📊 [Bootstrap] 共 ${levels.length} 个并行层级`);
    
    // 逐层初始化，同层服务并行
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      if (!level || level.length === 0) continue;
      
      console.log(`⚡ [Bootstrap] 并行初始化第 ${i + 1} 层 (${level.length} 个服务)`);
      
      // 同层服务并行初始化
      await Promise.all(
        level.map(serviceName => this._initService(serviceName))
      );
    }
  }

  /**
   * 按依赖层级分组服务
   * @returns 分层的服务名称数组
   * @private
   */
  private _groupByDependencyLevel(): string[][] {
    const levels: string[][] = [];
    const levelMap = new Map<string, number>();
    
    // 计算每个服务的依赖层级
    const calculateLevel = (name: string): number => {
      if (levelMap.has(name)) {
        return levelMap.get(name)!;
      }
      
      const config = this.registry.getConfig(name as ServiceName);
      if (!config || config.dependencies.length === 0) {
        levelMap.set(name, 0);
        return 0;
      }
      
      // 层级 = max(依赖层级) + 1
      const maxDepLevel = Math.max(
        ...config.dependencies.map(dep => calculateLevel(dep))
      );
      const level = maxDepLevel + 1;
      levelMap.set(name, level);
      return level;
    };
    
    // 计算所有服务的层级
    const allConfigs = this.registry.getAllConfigs();
    for (const config of allConfigs) {
      calculateLevel(config.name);
    }
    
    // 按层级分组
    for (const [name, level] of levelMap.entries()) {
      if (level !== undefined) {
        if (!levels[level]) {
          levels[level] = [];
        }
        levels[level].push(name);
      }
    }
    
    return levels;
  }


  /**
   * 初始化单个服务
   * @param name - 服务名称
   * @returns 服务实例
   * @private
   */
  private async _initService(name: string): Promise<unknown> {
    const config = this.registry.getConfig(name as ServiceName);
    if (!config) {
      throw new SystemError(
        `服务 "${name}" 未在注册表中找到`,
        'BOOTSTRAP_SERVICE_NOT_FOUND',
        { module: 'ServiceBootstrap', action: '_initService', serviceName: name }
      );
    }

    // 跳过已初始化的服务
    if (this.initializedServices.has(name)) {
      return;
    }

    console.log(`⏳ [Bootstrap] 初始化服务: ${name}`);
    const startTime = performance.now();

    try {
      // 设置超时
      const timeout = config.timeout || 5000;
      const result = await Promise.race([
        this.container.resolve(name),
        this._timeout(timeout, name)
      ]);

      const duration = Math.round(performance.now() - startTime);
      console.log(`✅ [Bootstrap] ${name} 初始化成功 (${duration}ms)`);
      
      this.initializedServices.add(name);
      return result;

    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [Bootstrap] ${name} 初始化失败 (${duration}ms):`, errorMessage);

      // 如果是可选服务，记录但不抛出错误
      if (config.optional) {
        console.warn(`[Bootstrap] ${name} 是可选服务，跳过`);
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
   * 超时处理
   * @param ms - 超时时间
   * @param serviceName - 服务名称
   * @returns Promise that rejects on timeout
   * @private
   */
  private _timeout(ms: number, serviceName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new SystemError(
          `服务 ${serviceName} 初始化超时 (${ms}ms)`,
          'BOOTSTRAP_SERVICE_TIMEOUT',
          { module: 'ServiceBootstrap', action: '_timeout', serviceName, timeout: ms }
        ));
      }, ms);
    });
  }

  /**
   * 报告初始化状态
   * @private
   */
  private _reportStatus(): void {
    const total = this.registry.size;
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

      // 5. 连接数据流: webVitals -> storage
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
    this.failedServices = [];
    this.initializedServices.clear();
    console.log('✅ [Bootstrap] 已重置');
  }
}

// 默认导出
export default ServiceBootstrap;
