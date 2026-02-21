/**
 * AlpineRegistry - Alpine.js 组件注册管理器
 * 
 * 职责：
 * - 统一管理 Alpine.js 组件注册
 * - 处理 Alpine 未就绪时的延迟注册
 * - 支持组件依赖声明和自动解析
 * - 提供热重载支持
 * 
 * @module AlpineRegistry
 */

/**
 * Alpine 组件定义
 */
export interface AlpineComponent {
  /** 组件名称 */
  name: string;
  /** 组件工厂函数 */
  factory: () => any;
  /** 依赖的其他组件名称列表 */
  dependencies?: string[];
}

/**
 * 注册器配置选项
 */
export interface RegistryOptions {
  /** 是否自动启动 Alpine（默认 false） */
  autoStart?: boolean;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Alpine.js 组件注册管理器
 * 
 * 使用单例模式，提供统一的组件注册接口
 * 
 * @example
 * ```typescript
 * const registry = AlpineRegistry.getInstance();
 * 
 * // 注册组件
 * registry.register('myComponent', () => ({
 *   data: 'value',
 *   method() { }
 * }));
 * 
 * // 初始化（批量注册所有组件）
 * registry.init();
 * ```
 */
export class AlpineRegistry {
  private static instance: AlpineRegistry;
  
  /** 已注册的组件映射 */
  private components: Map<string, AlpineComponent>;
  
  /** Alpine 是否已就绪 */
  private isReady: boolean;
  
  /** 待注册的组件队列 */
  private pendingComponents: AlpineComponent[];
  
  /** 配置选项 */
  private options: RegistryOptions;
  
  /**
   * 私有构造函数（单例模式）
   */
  private constructor(options: RegistryOptions = {}) {
    this.components = new Map();
    this.isReady = false;
    this.pendingComponents = [];
    
    // 开发环境默认使用 debug 级别，生产环境使用 warn 级别
    const defaultLogLevel = import.meta.env.DEV ? 'debug' : 'warn';
    
    this.options = {
      autoStart: false,
      logLevel: defaultLogLevel,
      ...options
    };
    
    this.log('debug', 'AlpineRegistry 实例已创建', {
      environment: import.meta.env.DEV ? 'development' : 'production',
      logLevel: this.options.logLevel
    });
  }
  
  /**
   * 获取单例实例
   * 
   * @param options - 配置选项（仅首次调用时生效）
   * @returns AlpineRegistry 实例
   */
  public static getInstance(options?: RegistryOptions): AlpineRegistry {
    if (!AlpineRegistry.instance) {
      AlpineRegistry.instance = new AlpineRegistry(options);
    }
    return AlpineRegistry.instance;
  }
  
  /**
   * 注册 Alpine 组件
   * 
   * 如果 Alpine 已就绪，立即注册；否则添加到待注册队列
   * 
   * @param name - 组件名称
   * @param factory - 组件工厂函数
   * @param dependencies - 依赖的其他组件名称列表
   * 
   * @example
   * ```typescript
   * registry.register('userPanel', () => ({
   *   username: '',
   *   login() { }
   * }), ['authService']);
   * ```
   */
  public register(
    name: string,
    factory: () => any,
    dependencies: string[] = []
  ): void {
    this.log('debug', `开始注册组件 "${name}"`, {
      hasDependencies: dependencies.length > 0,
      dependencies: dependencies
    });
    
    // 验证参数
    if (!name || typeof name !== 'string') {
      const error = '[AlpineRegistry] 组件名称必须是非空字符串';
      this.log('error', error);
      throw new Error(error);
    }
    
    if (typeof factory !== 'function') {
      const error = `[AlpineRegistry] 组件 "${name}" 的工厂函数必须是函数类型`;
      this.log('error', error);
      throw new Error(error);
    }
    
    const component: AlpineComponent = {
      name,
      factory,
      dependencies
    };
    
    // 验证依赖
    this.validateDependencies(component);
    
    // 检查是否已注册
    if (this.components.has(name)) {
      this.log('warn', `组件 "${name}" 已存在，将被覆盖`);
    }
    
    // 保存组件定义
    this.components.set(name, component);
    this.log('debug', `组件 "${name}" 已保存到注册表`, {
      totalComponents: this.components.size
    });
    
    // 如果 Alpine 已就绪，立即注册
    if (this.isReady && this.isAlpineAvailable()) {
      this.registerToAlpine(component);
      this.log('info', `✓ 组件 "${name}" 已立即注册到 Alpine`);
    } else {
      // 否则添加到待注册队列
      if (!this.pendingComponents.find(c => c.name === name)) {
        this.pendingComponents.push(component);
        this.log('debug', `组件 "${name}" 已添加到待注册队列`, {
          queueLength: this.pendingComponents.length,
          reason: !this.isReady ? 'Registry 未初始化' : 'Alpine 未就绪'
        });
      }
    }
  }
  
  /**
   * 注销组件
   * 
   * 用于热重载场景
   * 
   * @param name - 组件名称
   */
  public unregister(name: string): void {
    this.log('debug', `尝试注销组件 "${name}"`);
    
    if (!this.components.has(name)) {
      this.log('warn', `组件 "${name}" 不存在，无法注销`);
      return;
    }
    
    this.components.delete(name);
    this.pendingComponents = this.pendingComponents.filter(c => c.name !== name);
    
    this.log('info', `✓ 组件 "${name}" 已注销`, {
      remainingComponents: this.components.size,
      remainingPending: this.pendingComponents.length
    });
  }
  
  /**
   * 初始化注册器
   * 
   * 批量注册所有待注册的组件
   * 会自动解析依赖关系并按正确顺序注册
   */
  public init(): void {
    this.log('info', '========================================');
    this.log('info', '开始初始化 AlpineRegistry...');
    this.log('debug', '初始化状态', {
      totalComponents: this.components.size,
      pendingComponents: this.pendingComponents.length,
      isReady: this.isReady
    });
    
    // 检查 Alpine 是否可用
    if (!this.isAlpineAvailable()) {
      this.log('error', 'Alpine.js 未加载或 Alpine.data 方法不可用');
      throw new Error('[AlpineRegistry] Alpine.js 未就绪');
    }
    
    this.isReady = true;
    this.log('debug', 'Alpine.js 可用性检查通过');
    
    // 如果没有待注册的组件，直接返回
    if (this.pendingComponents.length === 0) {
      this.log('info', '没有待注册的组件');
      this.log('info', '========================================');
      return;
    }
    
    this.log('info', `待注册组件列表: [${this.pendingComponents.map(c => c.name).join(', ')}]`);
    
    // 解析依赖关系并排序
    this.log('debug', '开始解析组件依赖关系...');
    const sortedComponents = this.resolveDependencies();
    this.log('debug', `依赖解析完成，注册顺序: [${sortedComponents.map(c => c.name).join(' → ')}]`);
    
    // 按依赖顺序注册所有组件
    let successCount = 0;
    let failCount = 0;
    
    for (const component of sortedComponents) {
      try {
        this.registerToAlpine(component);
        successCount++;
        this.log('info', `  ✓ 组件 "${component.name}" 注册成功`);
      } catch (error) {
        failCount++;
        this.log('error', `  ✗ 组件 "${component.name}" 注册失败`, error);
      }
    }
    
    // 清空待注册队列
    this.pendingComponents = [];
    
    this.log('info', `AlpineRegistry 初始化完成: 成功 ${successCount} 个，失败 ${failCount} 个`);
    
    // 如果配置了自动启动，启动 Alpine
    if (this.options.autoStart && window.Alpine && typeof window.Alpine.start === 'function') {
      window.Alpine.start();
      this.log('info', '✓ Alpine.js 已自动启动');
    } else {
      this.log('debug', 'Alpine.js 未自动启动（autoStart = false）');
    }
    
    this.log('info', '========================================');
  }
  
  /**
   * 检查组件是否已注册
   * 
   * @param name - 组件名称
   * @returns 是否已注册
   */
  public isComponentRegistered(name: string): boolean {
    return this.components.has(name);
  }
  
  /**
   * 获取所有已注册的组件名称列表
   * 
   * @returns 组件名称数组
   */
  public getRegisteredComponents(): string[] {
    return Array.from(this.components.keys());
  }
  
  /**
   * 解析组件依赖关系并排序
   * 
   * 使用拓扑排序算法确保依赖的组件先注册
   * 
   * @returns 排序后的组件列表
   * @private
   */
  private resolveDependencies(): AlpineComponent[] {
    this.log('debug', '开始拓扑排序...');
    
    const sorted: AlpineComponent[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    // 深度优先搜索
    const visit = (component: AlpineComponent): void => {
      // 检测循环依赖
      if (visiting.has(component.name)) {
        const error = `检测到循环依赖: ${component.name}`;
        this.log('error', error);
        throw new Error(`[AlpineRegistry] ${error}`);
      }
      
      // 已访问过，跳过
      if (visited.has(component.name)) {
        return;
      }
      
      visiting.add(component.name);
      this.log('debug', `  访问组件 "${component.name}"`);
      
      // 先访问所有依赖
      if (component.dependencies && component.dependencies.length > 0) {
        this.log('debug', `    依赖: [${component.dependencies.join(', ')}]`);
        
        for (const depName of component.dependencies) {
          const depComponent = this.pendingComponents.find(c => c.name === depName);
          if (depComponent) {
            this.log('debug', `    → 解析依赖 "${depName}"`);
            visit(depComponent);
          } else if (!this.components.has(depName)) {
            this.log('warn', `组件 "${component.name}" 的依赖 "${depName}" 未找到`);
          } else {
            this.log('debug', `    → 依赖 "${depName}" 已注册，跳过`);
          }
        }
      }
      
      visiting.delete(component.name);
      visited.add(component.name);
      sorted.push(component);
      this.log('debug', `  ✓ 组件 "${component.name}" 已加入排序列表`);
    };
    
    // 访问所有待注册的组件
    for (const component of this.pendingComponents) {
      if (!visited.has(component.name)) {
        visit(component);
      }
    }
    
    this.log('debug', `拓扑排序完成，共 ${sorted.length} 个组件`);
    return sorted;
  }
  
  /**
   * 验证组件依赖
   * 
   * @param component - 组件定义
   * @private
   */
  private validateDependencies(component: AlpineComponent): void {
    if (!component.dependencies || component.dependencies.length === 0) {
      return;
    }
    
    this.log('debug', `验证组件 "${component.name}" 的依赖...`);
    
    // 检查依赖是否为数组
    if (!Array.isArray(component.dependencies)) {
      const error = `组件 "${component.name}" 的依赖必须是数组`;
      this.log('error', error);
      throw new Error(`[AlpineRegistry] ${error}`);
    }
    
    // 检查依赖项是否为字符串
    for (const dep of component.dependencies) {
      if (typeof dep !== 'string' || !dep) {
        const error = `组件 "${component.name}" 的依赖项必须是非空字符串`;
        this.log('error', error, { invalidDependency: dep });
        throw new Error(`[AlpineRegistry] ${error}`);
      }
    }
    
    // 检查是否依赖自己
    if (component.dependencies.includes(component.name)) {
      const error = `组件 "${component.name}" 不能依赖自己`;
      this.log('error', error);
      throw new Error(`[AlpineRegistry] ${error}`);
    }
    
    this.log('debug', `✓ 组件 "${component.name}" 的依赖验证通过`);
  }
  
  /**
   * 将组件注册到 Alpine.js
   * 
   * @param component - 组件定义
   * @private
   */
  private registerToAlpine(component: AlpineComponent): void {
    this.log('debug', `将组件 "${component.name}" 注册到 Alpine.data()`);
    
    if (!this.isAlpineAvailable()) {
      const error = 'Alpine.data 方法不可用';
      this.log('error', error);
      throw new Error(`[AlpineRegistry] ${error}`);
    }
    
    try {
      window.Alpine.data(component.name, component.factory);
      this.log('debug', `✓ Alpine.data("${component.name}") 调用成功`);
    } catch (error) {
      const errorMsg = `注册组件 "${component.name}" 到 Alpine 失败: ${error}`;
      this.log('error', errorMsg);
      throw new Error(`[AlpineRegistry] ${errorMsg}`);
    }
  }
  
  /**
   * 检查 Alpine.js 是否可用
   * 
   * @returns Alpine 是否可用
   * @private
   */
  private isAlpineAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.Alpine &&
      typeof window.Alpine.data === 'function'
    );
  }
  
  /**
   * 输出日志
   * 
   * @param level - 日志级别
   * @param message - 日志消息
   * @param data - 附加数据
   * @private
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.options.logLevel || 'info'];
    const currentLevel = levels[level];
    
    // 只输出大于等于配置级别的日志
    if (currentLevel < configLevel) {
      return;
    }
    
    const prefix = '[AlpineRegistry]';
    const timestamp = import.meta.env.DEV 
      ? new Date().toISOString().split('T')[1]?.split('.')[0] || '' 
      : '';
    const timePrefix = timestamp ? `[${timestamp}] ` : '';
    const fullMessage = `${timePrefix}${prefix} ${message}`;
    
    switch (level) {
      case 'debug':
        if (data !== undefined) {
          console.debug(fullMessage, data);
        } else {
          console.debug(fullMessage);
        }
        break;
      case 'info':
        if (data !== undefined) {
          console.info(fullMessage, data);
        } else {
          console.info(fullMessage);
        }
        break;
      case 'warn':
        if (data !== undefined) {
          console.warn(fullMessage, data);
        } else {
          console.warn(fullMessage);
        }
        break;
      case 'error':
        if (data !== undefined) {
          console.error(fullMessage, data);
        } else {
          console.error(fullMessage);
        }
        break;
    }
  }
}

/**
 * 导出单例实例获取函数（便捷方法）
 */
export const getAlpineRegistry = (options?: RegistryOptions): AlpineRegistry => {
  return AlpineRegistry.getInstance(options);
};
