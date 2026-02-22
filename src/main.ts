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
  (window as any).marked = marked;
}

// ✅ 导入全局状态对象
import state from './common/state';

// 🎯 导入 Zustand Store
import { appStore } from './stores/useAppStore';

// 🎯 开发环境调试接口
import { debugInterface } from './common/devtools/DebugInterface';

// 🎯 阶段4: 导入主题管理器
import { ThemeManager } from './common/config/themeConfig';

import { Logger } from './services/loggerService';
import { container } from './common/di/Container';
import { initViews } from './common/utils/viewLoader';

// ✅ 导入 Web Components
import './components/modal/AppModal';

// 🎯 P0优化: 导入服务初始化管理器和注册表
import { ServiceBootstrap } from './common/bootstrap/ServiceBootstrap';
import { serviceRegistry } from './common/di/ServiceRegistry';
import { registerAllServices } from './common/di/services';

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

// 🔧 关键修复: 确保 Alpine 在所有环境下都可通过 window.Alpine 访问
// 这对于动态注册组件至关重要
// 使用类型断言避免 TypeScript 错误,并确保不被 Terser 优化掉
(window as any)['Alpine'] = Alpine;
(window as any).Alpine = Alpine;

// 🔧 暴露 Zustand Store 到 window (用于调试和测试)
(window as any)['useAppStore'] = appStore;
(window as any)['appStore'] = appStore;

// 🔧 暴露 state 对象到 window (用于向后兼容和测试)
(window as any)['state'] = state;

// 开发环境额外日志
if (import.meta.env.DEV) {
  console.log('[Alpine] ✅ Alpine.js loaded and exposed to window');
  console.log('[Store] ✅ Zustand store exposed to window');
  console.log('[State] ✅ Compat state exposed to window');
}

// ========================
// APP STARTUP (程序启动)
// ========================

document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
  console.log("🚀 System: Application Booting...");

  // ================================================================
  // 🎯 DI容器整合: 使用ServiceRegistry统一管理服务
  // ================================================================
  
  // 1. 注册所有服务配置到注册表
  registerAllServices(serviceRegistry);
  
  // 2. 将所有服务注册到DI容器
  serviceRegistry.registerAll(container);
  
  // 3. 创建ServiceBootstrap实例（使用容器和注册表）
  const bootstrap = new ServiceBootstrap(container, serviceRegistry);

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
    
    // 🔧 暴露核心服务到 window (用于测试和调试)
    try {
      // 服务已经在 bootstrap.initialize() 中初始化并缓存
      // 🔧 修复: resolve返回Promise时需要await获取实际实例
      const eventBusResult = container.resolve('eventBus');
      const actionRegistryResult = container.resolve('actionRegistry');
      const routerResult = container.resolve('router');
      
      // await所有可能的Promise
      const eventBus = eventBusResult instanceof Promise ? await eventBusResult : eventBusResult;
      const actionRegistry = actionRegistryResult instanceof Promise ? await actionRegistryResult : actionRegistryResult;
      const router = routerResult instanceof Promise ? await routerResult : routerResult;
      
      (window as any)['eventBus'] = eventBus;
      (window as any)['EventBus'] = eventBus;
      (window as any)['actionRegistry'] = actionRegistry;
      (window as any)['ActionRegistry'] = actionRegistry;
      (window as any)['router'] = router;
      (window as any)['Router'] = router;
      (window as any)['loadingManager'] = loadingManager;
      (window as any)['LoadingManager'] = loadingManager;
      
      if (import.meta.env.DEV) {
        console.log('[Services] ✅ Core services exposed to window');
        console.log('[Services] EventBus:', typeof eventBus);
        console.log('[Services] ActionRegistry:', typeof actionRegistry);
        console.log('[Services] Router:', typeof router);
        console.log('[Services] Router methods:', {
          navigate: typeof router?.navigate,
          back: typeof router?.back,
          forward: typeof router?.forward,
          getCurrentRoute: typeof router?.getCurrentRoute
        });
      }
    } catch (e) {
      console.error('[Services] ❌ Failed to expose some services to window:', e);
      // 即使暴露失败,也继续启动流程
    }
    
    // ✅ 关键修复: 确保 Alpine 组件注册和启动的正确顺序
    console.log("🎨 Initializing Alpine.js...");
    
    // 1. 注册所有 Alpine 组件 (必须在 Alpine.start() 之前)
    initAlpineSettings();
    console.log("✅ Alpine components registered");
    
    // 2. 启动 Alpine.js (此时组件已注册,可以处理任何 HTML)
    Alpine.start();
    console.log("✅ Alpine.js started");
    
    // 🔧 修复: 初始化 AlpineRegistry (处理动态注册的组件)
    try {
      const { AlpineRegistry } = await import('./common/infrastructure/AlpineRegistry');
      const registry = AlpineRegistry.getInstance();
      registry.init();
      console.log("✅ AlpineRegistry initialized");
    } catch (e) {
      console.error('❌ AlpineRegistry initialization failed:', e);
    }
    
    // 3. 现在可以安全地加载包含 Alpine 组件的视图
    console.log("📦 Loading critical views...");
    await initViews();
    console.log("✅ Critical views loaded");
    
    // 初始化全局事件委托
    const { initGlobalEventDelegation } = await import('./common/utils/actionRegistry');
    initGlobalEventDelegation();
    
    // 初始化LoadingManager
    const globalLoading = document.getElementById('global-loading');
    if (globalLoading) {
      loadingManager.setGlobalLoadingElement(globalLoading);
      console.log("✅ LoadingManager initialized");
    }
    
    // 可选：初始化事件日志
    try {
      const { initEventLogger } = await import('./common/utils/eventLogger');
      initEventLogger();
    } catch (e) {
      console.warn('事件日志初始化失败:', e);
    }
    
    // 可选：加载插件
    try {
      const { loadPlugins } = await import('./common/utils/pluginLoader');
      loadPlugins();
    } catch (e) {
      console.warn('插件加载失败:', e);
    }
    
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
        highFrequencyRoutes: ['home', 'app_center_overview', 'sops_overview']
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
  tab?: string;
  param?: string;
  updateHistory?: boolean;
  format?: 'json' | 'csv';
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

registerActionsWithLegacy({
  // === Navigation 导航 ===
  switchTab: (params: string | ActionParams) => {
    // Handle both direct calls (legacy) and data-action calls
    const tab = typeof params === 'string' ? params : (params.tab || params.param || '');
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
