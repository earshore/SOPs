// src/common/devtools/DebugInterface.ts
// ================================================================
// 🎯 开发环境调试接口
// 仅在开发环境暴露必要的调试接口到window
// ================================================================

import { StorageService } from '@/services/storageService';
import { appStore } from '@/stores/useAppStore';

import { MENU_CONFIG } from '../config/menuConfig';
import { container } from '../di/Container';

export interface DebugRouteInfo {
  id: string;
  label: string;
  moduleId: string;
  panelId: string;
}

export interface DebugServicesInfo {
  services: string[];
}

export interface DebugStorageClearResult {
  cleared: boolean;
  reason?: 'cancelled';
}

export interface DebugUnavailableResult {
  available: false;
  reason: string;
}

/**
 * 调试接口类型
 */
export interface DebugInterface {
  // 容器相关
  container?: unknown;

  // 状态相关
  state?: unknown;
  stores?: unknown;

  // 路由相关
  router?: unknown;

  // 服务相关
  services?: {
    [key: string]: unknown;
    storage?: unknown;
    http?: unknown;
    logger?: unknown;
    performance?: unknown;
  };

  // 工具函数
  utils?: {
    showState?: () => unknown;
    showRoutes?: () => DebugRouteInfo[];
    showServices?: () => DebugServicesInfo;
    clearStorage?: () => DebugStorageClearResult;
    exportLogs?: () => DebugUnavailableResult;
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
      return;
    }

    // 仅在开发环境启用
    if (import.meta.env.DEV) {
      this.setupDebugInterface();
      this.exposeToWindow();
      this.isInitialized = true;
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
          return appStore.getState();
        },

        showRoutes: () => {
          return Object.entries(MENU_CONFIG.routes).map(([id, config]) => ({
            id,
            label: config.label,
            moduleId: config.moduleId,
            panelId: config.panelId,
          }));
        },

        showServices: () => {
          return { services: container.getRegisteredServices() };
        },

        clearStorage: () => {
          if (confirm('确定要清除所有本地存储吗？')) {
            StorageService.clear();
            return { cleared: true };
          }
          return { cleared: false, reason: 'cancelled' };
        },

        exportLogs: () => {
          return {
            available: false,
            reason: 'Logger.download() is deprecated, logs export not available',
          };
        },
      },
    };
  }

  /**
   * 暴露到window
   */
  private exposeToWindow(): void {
    (window as unknown as Record<string, unknown>).__DEBUG__ = this.debugInterface;
  }

  /**
   * 注册容器
   */
  registerContainer(container: unknown): void {
    if (import.meta.env.DEV) {
      this.debugInterface.container = container;
    }
  }

  /**
   * 注册状态
   */
  registerState(state: unknown): void {
    if (import.meta.env.DEV) {
      this.debugInterface.state = state;
    }
  }

  /**
   * 注册路由
   */
  registerRouter(router: unknown): void {
    if (import.meta.env.DEV) {
      this.debugInterface.router = router;
    }
  }

  /**
   * 注册服务
   */
  registerService(name: string, service: unknown): void {
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
      delete (window as unknown as Record<string, unknown>).__DEBUG__;
      this.debugInterface = {};
      this.isInitialized = false;
    }
  }
}

// 创建单例
export const debugInterface = new DebugInterfaceManager();

export default debugInterface;
