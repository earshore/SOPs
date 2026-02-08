// src/main.js
// ================================================================
// 🎯 P1 重构: 使用 ActionRegistry 替代散落的 window.xxx 赋值
// 🎯 Phase 4: 使用 StorageService 统一数据访问
// ================================================================

// ✅ Dependency Bundling (Optimization)
import { marked } from 'marked';
// Chart.js and GridStack are now lazy loaded via src/common/utils/lazyLibs.js
import './css/style.css';
import './modules/more/more_style.css';
import './modules/app_center/app_center_style.css';

// Expose to window for legacy compatibility
window.marked = marked;

// ✅ 导入全局状态对象
import state from './common/state.js';
window.state = state;

// ✅ 导入视图加载器 (HTML 拆分重构的核心)
import { initViews } from './common/utils/viewLoader';

// ✅ 导入 Web Components
import './components/modal/AppModal.js';

// 🎯 P0优化: 导入服务初始化管理器
import { ServiceBootstrap } from './common/bootstrap/ServiceBootstrap.js';

// 🎯 短期优化：导入 LoadingManager
import { loadingManager } from './common/utils/LoadingManager';

// ✅ Import User Guide Modal (Vite Raw Import)
import userGuideModalHtml from './components/modal/userGuideModal.html?raw';

// Inject Modals
document.addEventListener('DOMContentLoaded', () => {
  // User Guide Modal
  const guideContainer = document.getElementById('user-guide-container');
  if (guideContainer) {
    // ✅ 安全: 静态HTML模板，无用户输入
    guideContainer.innerHTML = userGuideModalHtml;
    Array.from(guideContainer.querySelectorAll('script')).forEach(script => {
      const newScript = document.createElement('script');
      Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = script.textContent;
      document.body.appendChild(newScript);
    });
  }
});


// ✅ P1: 导入动作注册中心
import {
  registerActionsWithLegacy,
  initGlobalEventDelegation
} from './common/utils/actionRegistry';

import { loadPlugins } from './common/utils/pluginLoader';

// ✅ P1: 导入事件调试工具
import { initEventLogger } from './common/utils/eventLogger';

// ✅ 全局错误兜底 (增强版 - 集成日志和监控)
window.addEventListener("error", (event) => {
  // 避免循环报错导致 Toast 刷屏
  if (window._errorThrottle && Date.now() - window._errorThrottle < 2000) return;
  window._errorThrottle = Date.now();

  const msg = `系统运行异常: ${event.message || "未知错误"}`;
  
  // 记录到日志服务
  Logger.fatal('全局错误捕获', event.error, 'System');
  
  // 用户通知
  if (window.showToast) window.showToast(msg, "error");

  // 记录到错误服务和监控服务
  import('./services/errorService').then(({ ErrorService }) => {
    ErrorService.handle(event.error, { 
      module: 'System',
      action: 'window.onerror', 
      notify: false // 已经显示过toast
    });
  }).catch(() => {});
});

// ✅ Promise 异常兜底 (增强版 - 集成日志和监控)
window.addEventListener("unhandledrejection", (event) => {
  if (window._errorThrottle && Date.now() - window._errorThrottle < 2000) return;
  window._errorThrottle = Date.now();

  const msg = `异步操作异常: ${event.reason?.message || "网络请求或数据处理失败"}`;
  
  // 记录到日志服务
  Logger.error('未处理的Promise拒绝', event.reason, 'System');
  
  // 用户通知
  if (window.showToast) window.showToast(msg, "error");
  
  // 记录到监控服务
  import('./services/monitoringService').then(({ monitoringService }) => {
    monitoringService.captureException(event.reason, {
      module: 'System',
      tags: { type: 'unhandledrejection' }
    });
  }).catch(() => {});
});

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
  saveProxyConfig
} from "./components/settings/systemSettings.js";

import { switchTab, renderMegaMenu, renderSopsMegaMenu, renderHubMegaMenu, renderMoreMenu, showToast, initRouter } from "../src/common/utils/ui.js";
import { APP_EVENTS } from './common/constants/eventConstants';
import { initHomeSplash } from "./modules/home/homeDisplay.js";

// ✅ 自动注册事件监听器的模块 (事件驱动模式)
import './modules/amz_hub/amz_hub.js';
import './modules/sops/sops.js';
import './modules/more/more.js';
import './modules/app_center/app_center.js';

// ✅ Alpine.js
import Alpine from 'alpinejs';
window.Alpine = Alpine;

// ========================
// APP STARTUP (程序启动)
// ========================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 System: Application Booting...");

  // ================================================================
  // 🎯 P0优化: 使用服务初始化管理器
  // ================================================================
  const bootstrap = new ServiceBootstrap();

  // 1. 基础服务（无依赖）
  bootstrap.register('eventBus', async () => {
    const { default: eventBus } = await import('./common/EventBus.ts');
    return eventBus;
  });

  bootstrap.register('container', async () => {
    const { container } = await import('./common/di/Container.ts');
    return container;
  }, { dependencies: ['eventBus'] });

  // 2. 工具服务
  bootstrap.register('actionRegistry', async () => {
    const { default: actionRegistry } = await import('./common/utils/actionRegistry');
    const { container } = await import('./common/di/Container.ts');
    container.register('actionRegistry', () => actionRegistry);
    return actionRegistry;
  }, { dependencies: ['container'] });

  bootstrap.register('stateManager', async () => {
    const { stateManager } = await import('./common/state/StateManager.ts');
    const { container } = await import('./common/di/Container.ts');
    container.register('stateManager', () => stateManager);
    return stateManager;
  }, { dependencies: ['container'] });

  // 3. 路由服务
  bootstrap.register('router', async () => {
    const { router } = await import('./common/router/Router.ts');
    const { container } = await import('./common/di/Container.ts');
    container.register('router', () => router);
    return router;
  }, { dependencies: ['container', 'stateManager'] });

  // 4. 监控服务（可选）
  bootstrap.register('performanceService', async () => {
    const { performanceService } = await import('./services/performanceService');
    performanceService.init();
    return performanceService;
  }, { 
    optional: true,
    fallback: () => {
      console.log('[Bootstrap] 性能监控服务未启用');
      return null;
    }
  });

  bootstrap.register('logger', async () => {
    const { Logger } = await import('./services/loggerService.ts');
    Logger.info('应用启动', { version: '1.0.0' }, 'System');
    return Logger;
  }, { optional: true });

  // 5. UI 服务
  bootstrap.register('loadingManager', async () => {
    const globalLoading = document.getElementById('global-loading');
    if (globalLoading) {
      loadingManager.setGlobalLoadingElement(globalLoading);
      console.log("✅ LoadingManager initialized");
    }
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
  }, { dependencies: ['router', 'stateManager', 'loadingManager'] });

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
      if (window.showToast) {
        showToast('应用初始化失败，请刷新页面重试', 'error');
      }
      return;
    }

    // ================================================================
    // 初始化成功，继续启动流程
    // ================================================================
    
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
    if (window.showToast) {
      showToast('应用启动失败，请刷新页面重试', 'error');
    }
  }
});

// ================================================================
// 🎯 P1: 集中注册全局动作 (替代散落的 window.xxx = xxx)
// ================================================================
// 使用 registerActionsWithLegacy 在注册到 ActionRegistry 的同时
// 也挂载到 window，保持向后兼容现有 onclick="xxx()" 调用

registerActionsWithLegacy({
  // === Navigation 导航 ===
  switchTab: (params) => {
    // Handle both direct calls (legacy) and data-action calls
    const tab = typeof params === 'string' ? params : params.param;
    const updateHistory = typeof params === 'object' && params.updateHistory !== undefined 
      ? params.updateHistory 
      : true;
    return switchTab(tab, updateHistory);
  },
  // switchDataTab, // Owned by DataModule
  renderMegaMenu,

  // === Utilities 工具函数 ===
  showToast,

  // === Modal 模态框 ===
  close: (params, event) => {
    // 通用的 close 动作：查找最近的 app-modal 并关闭
    const target = event?.target;
    if (!target) return;
    
    // 向上查找最近的 app-modal 元素
    const modal = target.closest('app-modal');
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
    }
  },

  // 🎯 阶段1: 日志管理
  showLogs: () => {
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

  showErrors: () => {
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

  clearLogs: () => {
    Logger.clear();
    if (window.showToast) {
      window.showToast('日志已清除', 'success');
    }
  },

  downloadLogs: (params) => {
    const format = params?.format || 'json';
    Logger.download(format);
    if (window.showToast) {
      window.showToast(`日志已导出为 ${format.toUpperCase()} 格式`, 'success');
    }
  },

  // Scraper, Data, Analysis actions are now self-registered by their respective modules
});

console.log("✅ [ActionRegistry] 全局动作已注册");