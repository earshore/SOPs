// src/main.ts
// ================================================================
// 🎯 P1 重构: 使用 ActionRegistry 替代散落的 window.xxx 赋值
// 🎯 Phase 4: 使用 StorageService 统一数据访问
// ================================================================

// ✅ Dependency Bundling (Optimization)
import { marked } from 'marked';
// Chart.js and GridStack are now lazy loaded via src/common/utils/lazyLibs.js

// 🎯 CSS架构重构: 使用新的分层CSS系统
import './css/main.css';
// 模块特定样式保持按需加载
import './modules/more/more_style.css';
import './modules/app_center/app_center_style.css';

// Expose to window for legacy compatibility
window.marked = marked;

// ✅ 导入全局状态对象
import state from './common/state';
window.state = state;

// ✅ 导入视图加载器 (HTML 拆分重构的核心)
import { initViews } from './common/utils/viewLoader';

// ✅ 导入 Web Components
import './components/modal/AppModal';

// 🎯 P0优化: 导入服务初始化管理器
import { ServiceBootstrap } from './common/bootstrap/ServiceBootstrap';

// 🎯 短期优化：导入 LoadingManager
import { loadingManager } from './common/utils/LoadingManager';

// ✅ Import User Guide Modal (Vite Raw Import)
import userGuideModalHtml from './components/modal/userGuideModal.html?raw';

// Inject Modals
document.addEventListener('DOMContentLoaded', (): void => {
  // User Guide Modal
  const guideContainer = document.getElementById('user-guide-container');
  if (guideContainer) {
    // ✅ 安全: 静态HTML模板，无用户输入
    guideContainer.innerHTML = userGuideModalHtml;
    Array.from(guideContainer.querySelectorAll('script')).forEach((script: HTMLScriptElement) => {
      const newScript = document.createElement('script');
      Array.from(script.attributes).forEach((attr: Attr) => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = script.textContent;
      document.body.appendChild(newScript);
    });
  }
});


// ✅ P1: 导入动作注册中心
import {
  registerActionsWithLegacy
} from './common/utils/actionRegistry';

// ✅ 全局错误兜底已由GlobalErrorHandler统一处理
// 见 src/common/errors/GlobalErrorHandler.ts

// 1. 导入各模块的初始化函数和业务函数
import {
  initAlpineSettings, // [NEW] Alpine Init
  updateModelStatus,
  openSettings,
  closeSettings,
  saveProviderConfig,
  loadProviderConfig, // [RESTORED]
  fetchModels,
  toggleApiKeyVisibility, // [RESTORED]
  testConnection,
  saveProxyConfig,
  openPerformanceMonitor // [NEW] 性能监控面板
} from "./components/settings/systemSettings";

import { switchTab, renderMegaMenu, renderSopsMegaMenu, renderHubMegaMenu, renderMoreMenu, showToast, initRouter } from "./common/ui";
import { APP_EVENTS } from './common/constants/eventConstants';
import { initHomeSplash } from "./modules/home/homeDisplay";

// ✅ 自动注册事件监听器的模块 (事件驱动模式)
import './modules/amz_hub/amz_hub';
import './modules/sops/sops';
import './modules/more/more';
import './modules/app_center/app_center';

// ✅ Alpine.js
import Alpine from 'alpinejs';
window.Alpine = Alpine;

// ========================
// APP STARTUP (程序启动)
// ========================

document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
  console.log("🚀 System: Application Booting...");

  // ================================================================
  // 🎯 P0优化: 使用服务初始化管理器
  // ================================================================
  const bootstrap = new ServiceBootstrap();

  // 1. 基础服务（无依赖）
  bootstrap.register('eventBus', async () => {
    const { default: eventBus } = await import('./common/EventBus');
    const { container } = await import('./common/di/Container');
    // 注册到DI容器，声明无依赖
    container.register('eventBus', () => eventBus, { 
      dependencies: [],
      lifetime: 'singleton'
    });
    return eventBus;
  });

  bootstrap.register('container', async () => {
    const { container } = await import('./common/di/Container');
    // Container自身不需要注册到自己
    return container;
  }, { dependencies: ['eventBus'] });

  // 2. 工具服务
  bootstrap.register('actionRegistry', async () => {
    const { default: actionRegistry } = await import('./common/utils/actionRegistry');
    const { container } = await import('./common/di/Container');
    // 注册到DI容器，声明依赖EventBus
    container.register('actionRegistry', () => actionRegistry, {
      dependencies: ['eventBus'],
      lifetime: 'singleton'
    });
    return actionRegistry;
  }, { dependencies: ['container'] });

  // 3. 路由服务
  bootstrap.register('router', async () => {
    const { router } = await import('./common/router/Router');
    const { container } = await import('./common/di/Container');
    // 注册到DI容器
    container.register('router', () => router, {
      dependencies: ['eventBus'],
      lifetime: 'singleton'
    });
    return router;
  }, { dependencies: ['container'] });

  // 4. 监控服务（可选）
  bootstrap.register('performanceService', async () => {
    const { performanceService } = await import('./services/performanceService');
    const { container } = await import('./common/di/Container');
    performanceService.init();
    // 注册到DI容器
    container.register('performanceService', () => performanceService, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return performanceService;
  }, { 
    optional: true,
    fallback: () => {
      console.log('[Bootstrap] 性能监控服务未启用');
      return null;
    }
  });

  // 🎯 P2-11: Web Vitals性能监控
  bootstrap.register('webVitalsService', async () => {
    const { webVitalsService } = await import('./services/webVitalsService');
    const { container } = await import('./common/di/Container');
    
    await webVitalsService.initialize();
    console.log('✅ [P2-11] Web Vitals监控已启动');
    
    // 注册到DI容器
    container.register('webVitalsService', () => webVitalsService, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return webVitalsService;
  }, { optional: true });

  // 🎯 P2-11: 性能监控面板
  bootstrap.register('performanceMonitor', async () => {
    const { performanceMonitor } = await import('./common/devtools/PerformanceMonitor');
    const { container } = await import('./common/di/Container');
    
    performanceMonitor.initialize();
    console.log('✅ [P2-11] 性能监控面板已初始化');
    
    // 注册到DI容器
    container.register('performanceMonitor', () => performanceMonitor, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return performanceMonitor;
  }, { 
    optional: true,
    dependencies: ['webVitalsService']
  });

  bootstrap.register('logger', async () => {
    const { Logger } = await import('./services/loggerService');
    const { container } = await import('./common/di/Container');
    Logger.info('应用启动', { version: '1.0.0' }, 'System');
    // 注册到DI容器
    container.register('logger', () => Logger, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return Logger;
  }, { optional: true });

  // 🎯 P0优化: 内存泄漏检测器
  bootstrap.register('memoryLeakDetector', async () => {
    const { memoryLeakDetector } = await import('./common/utils/MemoryLeakDetector');
    const { container } = await import('./common/di/Container');
    
    // 只在开发环境启用
    if ((import.meta as any).env?.DEV) {
      memoryLeakDetector.start();
      console.log('✅ [P0] 内存泄漏检测器已启动');
    }
    
    // 注册到DI容器
    container.register('memoryLeakDetector', () => memoryLeakDetector, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return memoryLeakDetector;
  }, { optional: true });

  // 🎯 P0优化: 工作状态管理器
  bootstrap.register('workingStateManager', async () => {
    const { workingStateManager } = await import('./common/utils/WorkingStateManager');
    const { container } = await import('./common/di/Container');
    
    console.log('✅ [P0] 工作状态管理器已初始化');
    
    // 注册到DI容器
    container.register('workingStateManager', () => workingStateManager, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return workingStateManager;
  });

  // 🎯 P0优化: 全局错误处理器
  bootstrap.register('globalErrorHandler', async () => {
    const { globalErrorHandler } = await import('./common/errors/GlobalErrorHandler');
    const { container } = await import('./common/di/Container');
    
    console.log('✅ [P0] 全局错误处理器已初始化');
    
    // 注册到DI容器
    container.register('globalErrorHandler', () => globalErrorHandler, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return globalErrorHandler;
  });

  // 5. UI 服务
  bootstrap.register('loadingManager', async () => {
    const { container } = await import('./common/di/Container');
    const globalLoading = document.getElementById('global-loading');
    if (globalLoading) {
      loadingManager.setGlobalLoadingElement(globalLoading);
      console.log("✅ LoadingManager initialized");
    }
    // 注册到DI容器
    container.register('loadingManager', () => loadingManager, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return loadingManager;
  });

  bootstrap.register('alpine', async () => {
    initAlpineSettings();
    Alpine.start();
    return Alpine;
  });

  bootstrap.register('views', async () => {
    await initViews();
    return true;
  }, { dependencies: ['router', 'loadingManager'] });

  // 6. 事件系统
  bootstrap.register('eventLogger', async () => {
    const { initEventLogger } = await import('./common/utils/eventLogger');
    initEventLogger();
    return true;
  }, { optional: true });

  bootstrap.register('eventDelegation', async () => {
    const { initGlobalEventDelegation } = await import('./common/utils/actionRegistry');
    initGlobalEventDelegation();
    return true;
  }, { dependencies: ['actionRegistry'] });

  // 7. 插件系统
  bootstrap.register('plugins', async () => {
    const { loadPlugins } = await import('./common/utils/pluginLoader');
    loadPlugins();
    return true;
  }, { optional: true });

  // ================================================================
  // 执行初始化
  // ================================================================
  try {
    const result = await bootstrap.initialize();
    
    if (!result.success) {
      console.error('❌ 部分服务初始化失败，应用可能无法正常工作');
      showToast('应用初始化失败，请刷新页面重试', 'error');
      return;
    }

    // ================================================================
    // 初始化成功，继续启动流程
    // ================================================================
    
    // 🎯 P1-8: 状态管理已完全切换到Zustand
    // StateManager和stateAdapter已移除
    
    // 初始化首页
    initHomeSplash();

    // 渲染顶部 Mega Menu
    renderMegaMenu();
    renderSopsMegaMenu();
    renderHubMegaMenu();
    renderMoreMenu();

    // 广播应用初始化完成事件
    window.dispatchEvent(new CustomEvent(APP_EVENTS.INITIALIZED, {
      detail: { timestamp: Date.now() }
    }));

    // 初始化默认状态
    updateModelStatus();

    // 初始化路由
    initRouter();

    console.log("✅ System: Ready");

  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    showToast('应用启动失败，请刷新页面重试', 'error');
  }
});

// ================================================================
// 🎯 P1: 集中注册全局动作 (替代散落的 window.xxx = xxx)
// ================================================================
// 使用 registerActionsWithLegacy 在注册到 ActionRegistry 的同时
// 也挂载到 window，保持向后兼容现有 onclick="xxx()" 调用

interface ActionParams {
  param?: string;
  updateHistory?: boolean;
  format?: 'json' | 'csv';
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

registerActionsWithLegacy({
  // === Navigation 导航 ===
  switchTab: (params: string | ActionParams) => {
    // Handle both direct calls (legacy) and data-action calls
    const tab = typeof params === 'string' ? params : params.param || '';
    const updateHistory = typeof params === 'object' && params.updateHistory !== undefined 
      ? params.updateHistory 
      : true;
    return switchTab(tab, updateHistory);
  },
  // switchDataTab, // Owned by DataModule
  renderMegaMenu,

  // === Utilities 工具函数 ===
  showToast: (params: Record<string, any>) => {
    if (typeof params === 'string') {
      showToast(params as string);
    } else if (params.message) {
      showToast(params.message as string, params.type as ToastType | undefined);
    }
  },

  // === Modal 模态框 ===
  close: (_params: unknown, event?: Event) => {
    // 通用的 close 动作：查找最近的 app-modal 并关闭
    const target = event?.target as HTMLElement | null;
    if (!target) return;
    
    // 向上查找最近的 app-modal 元素
    const modal = target.closest('app-modal') as any;
    if (modal && typeof modal.close === 'function') {
      modal.close();
    }
  },

  // === Settings 设置 ===
  openSettings,
  closeSettings,
  saveProviderConfig,
  loadProviderConfig,
  fetchModels,
  toggleApiKeyVisibility,
  testConnection,
  saveProxyConfig,
  openPerformanceMonitor,

  // 🎯 阶段1: 性能监控
  showPerformanceReport: async () => {
    try {
      const { performanceService } = await import('./services/performanceService');
      const report = performanceService.getReport();
      
      console.log('📊 性能报告:', report);
      console.table(report.summary);
      
      if (window.showToast) {
        window.showToast('性能报告已输出到控制台 (F12)', 'info');
      }
      
      return report;
    } catch (e) {
      console.error('获取性能报告失败:', e);
      return undefined;
    }
  },

  // 🎯 阶段1: 日志管理
  showLogs: async () => {
    const { Logger } = await import('./services/loggerService');
    const logs = Logger.getLogs();
    console.log('📋 所有日志:', logs);
    console.table(logs.map(log => ({
      时间: new Date(log.timestamp).toLocaleTimeString('zh-CN'),
      级别: log.levelName,
      模块: log.module,
      消息: log.message,
    })));
    
    if (window.showToast) {
      window.showToast(`共 ${logs.length} 条日志，已输出到控制台`, 'info');
    }
    
    return logs;
  },

  showErrors: async () => {
    const { Logger } = await import('./services/loggerService');
    const errors = Logger.getErrors();
    console.log('❌ 错误日志:', errors);
    console.table(errors.map(log => ({
      时间: new Date(log.timestamp).toLocaleTimeString('zh-CN'),
      级别: log.levelName,
      模块: log.module,
      消息: log.message,
    })));
    
    if (window.showToast) {
      window.showToast(`共 ${errors.length} 条错误，已输出到控制台`, errors.length > 0 ? 'warning' : 'info');
    }
    
    return errors;
  },

  clearLogs: async () => {
    const { Logger } = await import('./services/loggerService');
    Logger.clear();
    if (window.showToast) {
      window.showToast('日志已清除', 'success');
    }
  },

  downloadLogs: async (params?: ActionParams) => {
    const { Logger } = await import('./services/loggerService');
    const format = (params?.format || 'json') as 'json' | 'csv';
    Logger.download(format);
    if (window.showToast) {
      window.showToast(`日志已导出为 ${format.toUpperCase()} 格式`, 'success');
    }
  },

  // Scraper, Data, Analysis actions are now self-registered by their respective modules
});

console.log("✅ [ActionRegistry] 全局动作已注册");
