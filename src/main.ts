// src/main.ts
// ================================================================
// 🎯 P1 重构: 使用 ActionRegistry 替代散落的 window.xxx 赋值
// 🎯 Phase 4: 使用 StorageService 统一数据访问
// ================================================================

// ✅ Dependency Bundling (Optimization)
import { marked } from 'marked';
// Chart.js and GridStack are now lazy loaded via src/common/utils/lazyLibs.js

// 🎯 性能优化: 只加载首屏关键CSS，其他CSS延迟加载
import './css/critical.css';
// 🎯 阶段3优化: 导入主CSS文件(包含所有组件)
import './css/main.css';
// 非关键CSS将在DOMContentLoaded后异步加载
// 模块特定样式改为按需懒加载,不在启动时导入

// 🎯 CSS性能监控（仅开发环境）
if (import.meta.env.DEV) {
  import('./common/devtools/CSSPerformanceMonitor');
}

// Expose to window for legacy compatibility (仅开发环境)
if (import.meta.env.DEV) {
  window.marked = marked;
}

// ✅ 导入全局状态对象
import state from './common/state';

// 🎯 开发环境调试接口
import { debugInterface } from './common/devtools/DebugInterface';

// 🎯 阶段4: 导入主题管理器
import { ThemeManager } from './common/config/themeConfig';

import { Logger } from './services/loggerService';
import eventBus from './common/EventBus';
import { container } from './common/di/Container';
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
// 仅开发环境暴露到window
if (import.meta.env.DEV) {
  window.Alpine = Alpine;
}

// ========================
// APP STARTUP (程序启动)
// ========================

document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
  console.log("🚀 System: Application Booting...");

  // ================================================================
  // 🎯 P0优化: 使用服务初始化管理器（支持并行初始化）
  // ================================================================
  const bootstrap = new ServiceBootstrap();

  // 1. 基础服务（无依赖）- 并行初始化
  bootstrap.register('eventBus', async () => {
    container.register('eventBus', () => eventBus, { 
      dependencies: [],
      lifetime: 'singleton'
    });
    return eventBus;
  });

  bootstrap.register('workingStateManager', async () => {
    const { workingStateManager } = await import('./common/utils/WorkingStateManager');
    console.log('✅ [P0] 工作状态管理器已初始化');
    container.register('workingStateManager', () => workingStateManager, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return workingStateManager;
  });

  bootstrap.register('globalErrorHandler', async () => {
    const { globalErrorHandler } = await import('./common/errors/GlobalErrorHandler');
    console.log('✅ [P0] 全局错误处理器已初始化');
    container.register('globalErrorHandler', () => globalErrorHandler, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return globalErrorHandler;
  });

  // 2. 依赖基础服务的核心服务
  bootstrap.register('container', async () => {
    return container;
  }, { dependencies: ['eventBus'] });

  bootstrap.register('actionRegistry', async () => {
    const { default: actionRegistry } = await import('./common/utils/actionRegistry');
    container.register('actionRegistry', () => actionRegistry, {
      dependencies: ['eventBus'],
      lifetime: 'singleton'
    });
    return actionRegistry;
  }, { dependencies: ['eventBus'] });

  bootstrap.register('router', async () => {
    const { router } = await import('./common/router/Router');
    container.register('router', () => router, {
      dependencies: ['eventBus'],
      lifetime: 'singleton'
    });
    return router;
  }, { dependencies: ['eventBus'] });

  // 3. UI服务（并行初始化）
  bootstrap.register('loadingManager', async () => {
    const globalLoading = document.getElementById('global-loading');
    if (globalLoading) {
      loadingManager.setGlobalLoadingElement(globalLoading);
      console.log("✅ LoadingManager initialized");
    }
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

  // 4. 视图加载（依赖router和loadingManager）
  bootstrap.register('views', async () => {
    await initViews();
    return true;
  }, { dependencies: ['router', 'loadingManager'] });

  // 5. 事件系统（依赖actionRegistry）
  bootstrap.register('eventDelegation', async () => {
    const { initGlobalEventDelegation } = await import('./common/utils/actionRegistry');
    initGlobalEventDelegation();
    return true;
  }, { dependencies: ['actionRegistry'] });

  // 6. 可选服务（延迟初始化，不阻塞启动）
  bootstrap.register('logger', async () => {
    container.register('logger', () => Logger, {
      dependencies: [],
      lifetime: 'singleton'
    });
    return Logger;
  }, { optional: true });

  bootstrap.register('eventLogger', async () => {
    const { initEventLogger } = await import('./common/utils/eventLogger');
    initEventLogger();
    return true;
  }, { optional: true });

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

    // 🎯 阶段4: 恢复用户主题设置
    ThemeManager.restoreTheme();

    // 🎯 阶段5: 预加载高优先级模块CSS
    import('./common/utils/moduleCssLoader').then(({ moduleCssLoader }) => {
      moduleCssLoader.preloadHighPriorityModules();
    });

    // 🎯 性能优化: 初始化路由预加载器
    import('./common/router/RoutePreloader').then(({ routePreloader }) => {
      routePreloader.initialize({
        enableHoverPreload: true,
        enableIdlePreload: true,
        hoverDelay: 100,
        highFrequencyRoutes: ['home', 'app_center', 'sops']
      });
    });

    // 🎯 性能优化: 初始化图片懒加载
    import('./common/utils/ImageLazyLoader').then(({ imageLazyLoader }) => {
      imageLazyLoader.initialize({
        rootMargin: '50px',
        threshold: 0.01,
        fadeIn: true,
        fadeInDuration: 300
      });
    });

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

    // 🎯 开发环境：初始化调试接口
    if (import.meta.env.DEV) {
      debugInterface.initialize();
      debugInterface.registerContainer(container);
      debugInterface.registerState(state);
      debugInterface.registerRouter(await import('./common/router/Router').then(m => m.router));
    }

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

  // 🎯 阶段4: 主题切换
  switchTheme: async (params: { themeId?: string } = {}) => {
    const { themeId = 'default' } = params;
    ThemeManager.applyTheme(themeId);
    if (window.showToast) {
      const theme = ThemeManager.getTheme(themeId);
      window.showToast(`已切换到${theme?.name || themeId}`, 'success');
    }
  },

  getAllThemes: async () => {
    return ThemeManager.getAllThemes();
  },

  getCurrentTheme: async () => {
    return ThemeManager.getCurrentTheme();
  },

  // 🎯 阶段1: 日志管理
  showLogs: async () => {
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
    Logger.clear();
    if (window.showToast) {
      window.showToast('日志已清除', 'success');
    }
  },

  downloadLogs: async (params?: ActionParams) => {
    const format = (params?.format || 'json') as 'json' | 'csv';
    Logger.download(format);
    if (window.showToast) {
      window.showToast(`日志已导出为 ${format.toUpperCase()} 格式`, 'success');
    }
  },

  // Scraper, Data, Analysis actions are now self-registered by their respective modules
});

console.log("✅ [ActionRegistry] 全局动作已注册");
