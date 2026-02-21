// src/common/devtools/DebugInterface.ts
// ================================================================
// 🎯 开发环境调试接口
// 仅在开发环境暴露必要的调试接口到window
// ================================================================

/**
 * 调试接口类型
 */
export interface DebugInterface {
  // 容器相关
  container?: any;
  
  // 状态相关
  state?: any;
  stores?: any;
  
  // 路由相关
  router?: any;
  
  // 服务相关
  services?: {
    [key: string]: any;
    storage?: any;
    http?: any;
    logger?: any;
    performance?: any;
  };
  
  // 工具函数
  utils?: {
    showState?: () => void;
    showRoutes?: () => void;
    showServices?: () => void;
    clearStorage?: () => void;
    exportLogs?: () => void;
    showMigrationStats?: () => void;
    clearMigrationWarnings?: () => void;
  };
}

/**
 * 调试接口管理器
 */
class DebugInterfaceManager {
  private debugInterface: DebugInterface = {};
  private isInitialized = false;

  /**
   * 初始化调试接口（仅开发环境）
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn('[DebugInterface] 已初始化，跳过');
      return;
    }

    // 仅在开发环境启用
    if (import.meta.env.DEV) {
      this.setupDebugInterface();
      this.exposeToWindow();
      this.isInitialized = true;
      console.log('🔧 [DebugInterface] 调试接口已启用，使用 window.__DEBUG__ 访问');
    }
  }

  /**
   * 设置调试接口
   */
  private setupDebugInterface(): void {
    this.debugInterface = {
      // 工具函数
      utils: {
        showState: () => {
          import('../state').then(({ default: state }) => {
            console.group('📊 应用状态');
            console.log(state);
            console.groupEnd();
          });
        },
        
        showRoutes: () => {
          import('../config/menuConfig').then(({ MENU_CONFIG }) => {
            console.group('🗺️ 路由配置');
            console.table(Object.entries(MENU_CONFIG.routes).map(([id, config]) => ({
              id,
              label: config.label,
              moduleId: config.moduleId,
              panelId: config.panelId
            })));
            console.groupEnd();
          });
        },
        
        showServices: () => {
          import('../di/Container').then(({ container }) => {
            console.group('🔧 已注册服务');
            console.log(container.getRegisteredServices());
            console.groupEnd();
          });
        },
        
        clearStorage: () => {
          if (confirm('确定要清除所有本地存储吗？')) {
            localStorage.clear();
            sessionStorage.clear();
            console.log('✅ 本地存储已清除');
          }
        },
        
        exportLogs: () => {
          import('../../services/loggerService').then(({ Logger }) => {
            Logger.download('json');
          });
        }
      }
    };
  }

  /**
   * 暴露到window
   */
  private exposeToWindow(): void {
    (window as any).__DEBUG__ = this.debugInterface;
  }

  /**
   * 注册容器
   */
  registerContainer(container: any): void {
    if (import.meta.env.DEV) {
      this.debugInterface.container = container;
    }
  }

  /**
   * 注册状态
   */
  registerState(state: any): void {
    if (import.meta.env.DEV) {
      this.debugInterface.state = state;
      
      // 添加状态迁移统计工具
      if (!this.debugInterface.utils) {
        this.debugInterface.utils = {};
      }
      
      this.debugInterface.utils.showMigrationStats = () => {
        try {
          const { stateMigration } = require('../state/StateMigration');
          const stats = stateMigration.getDeprecationStats();
          console.group('📊 状态迁移统计');
          console.log(`总警告数: ${stats.total}`);
          if (stats.warnings.length > 0) {
            console.table(stats.warnings.map((w: string) => ({ 路径: w })));
          } else {
            console.log('✅ 无弃用警告');
          }
          console.groupEnd();
        } catch (e) {
          console.error('❌ 获取迁移统计失败:', e);
        }
      };
      
      this.debugInterface.utils.clearMigrationWarnings = () => {
        try {
          const { stateMigration } = require('../state/StateMigration');
          stateMigration.clearDeprecationWarnings();
          console.log('✅ 迁移警告已清除');
        } catch (e) {
          console.error('❌ 清除迁移警告失败:', e);
        }
      };
    }
  }

  /**
   * 注册路由
   */
  registerRouter(router: any): void {
    if (import.meta.env.DEV) {
      this.debugInterface.router = router;
    }
  }

  /**
   * 注册服务
   */
  registerService(name: string, service: any): void {
    if (import.meta.env.DEV) {
      if (!this.debugInterface.services) {
        this.debugInterface.services = {};
      }
      this.debugInterface.services[name] = service;
    }
  }

  /**
   * 清理调试接口
   */
  cleanup(): void {
    if (import.meta.env.DEV) {
      delete (window as any).__DEBUG__;
      this.debugInterface = {};
      this.isInitialized = false;
      console.log('🔧 [DebugInterface] 调试接口已清理');
    }
  }
}

// 创建单例
export const debugInterface = new DebugInterfaceManager();

export default debugInterface;
