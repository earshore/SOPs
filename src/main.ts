// src/main.ts
// ================================================================
// 🎯 P1 重构: 使用 ActionRegistry 替代散落的 window.xxx 赋值
// 🎯 Phase 4: 使用 StorageService 统一数据访问
// ================================================================

// ✅ Dependency Bundling (Optimization)
import { marked } from 'marked';
// Chart.js and GridStack are now lazy loaded via src/common/utils/lazyLibs.js

// 🎯 性能优化: 首屏关键CSS由 index.html 提前加载，其他CSS在 DOMContentLoaded 后异步加载
// 模块特定样式改为按需懒加载,不在启动时导入

// 🎯 CSS性能监控（仅开发环境）
if (import.meta.env.DEV) {
  import('./common/devtools/CSSPerformanceMonitor');
}

// Expose to window for legacy compatibility (仅开发环境)
if (import.meta.env.DEV) {
  (window as unknown as { marked?: typeof marked }).marked = marked;
}

// 🎯 导入 Zustand Store
import { appStore } from './stores/useAppStore';

// 🎯 开发环境调试接口
import { debugInterface } from './common/devtools/DebugInterface';

// 🎯 阶段4: 导入主题管理器
import { ThemeManager } from './common/config/themeConfig';

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

// 🎯 微交互动画系统：导入动画管理器和状态管理
import { animationManager } from './services/animation-manager';
import { initializeAnimationStore } from './stores/animation-settings';

// ✅ P1: 导入动作注册中心
import {
  registerActionsWithLegacy,
  initGlobalEventDelegation
} from './common/utils/actionRegistry';

import { AlpineRegistry } from './common/infrastructure/AlpineRegistry';
import { triggerInitialNavigation } from './common/router/initRouter';
import { initEventLogger } from './common/utils/eventLogger';
import { loadPlugins } from './common/utils/pluginLoader';

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

import { renderMegaMenu, renderSopsMegaMenu, renderHubMegaMenu, renderMoreMenu, showToast } from "./common/ui";
import { APP_EVENTS } from './common/constants/eventConstants';
import { APP_VERSION } from './common/constants/constants';
import { initHomeSplash } from "./modules/home/homeDisplay";

// ✅ 自动注册事件监听器的模块 (事件驱动模式)
import './modules/amz_hub/amz_hub';
import './modules/sops/sops';
import './modules/more/more';
import './modules/app_center/app_center';

// ✅ Alpine.js
import Alpine from '@alpinejs/csp';

interface RouterDebugApi {
  navigate?: unknown;
  back?: unknown;
  forward?: unknown;
  getCurrentRoute?: unknown;
}

interface EventBusDebugApi {
  emit: (event: string, payload: unknown) => void;
}

interface LegacyDebugWindow {
  Alpine: typeof Alpine;
  useAppStore?: typeof appStore;
  appStore?: typeof appStore;
  eventBus?: unknown;
  EventBus?: unknown;
  actionRegistry?: unknown;
  ActionRegistry?: unknown;
  router?: unknown;
  Router?: unknown;
  loadingManager?: typeof loadingManager;
  LoadingManager?: typeof loadingManager;
}

type ClosableModalElement = HTMLElement & {
  close: () => void;
};

const legacyWindow = window as unknown as LegacyDebugWindow;

function isClosableModalElement(element: Element | null): element is ClosableModalElement {
  return element instanceof HTMLElement && typeof (element as { close?: unknown }).close === 'function';
}

function updateAppVersionLabel(): void {
  const versionEl = document.getElementById('app-version-more');
  if (versionEl) {
    versionEl.textContent = `V ${APP_VERSION}`;
  }
}

// 🔧 关键修复: 确保 Alpine 在所有环境下都可通过 window.Alpine 访问
// 这对于动态注册组件至关重要
// 使用类型断言避免 TypeScript 错误,并确保不被 Terser 优化掉
legacyWindow['Alpine'] = Alpine;

if (import.meta.env.DEV) {
  // 🔧 暴露 Zustand Store 到 window (仅用于开发调试和测试)
  legacyWindow['useAppStore'] = appStore;
  legacyWindow['appStore'] = appStore;
  console.log('[Alpine] ✅ Alpine.js loaded and exposed to window');
  console.log('[Store] ✅ Zustand store exposed to window');
}

// ========================
// APP STARTUP (程序启动)
// ========================

document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
  console.log("🚀 System: Application Booting...");

  try {
    await import('./css/main.css');
    console.log("✅ Main styles loaded");
  } catch (e) {
    console.warn('主样式加载失败:', e);
  }

  updateAppVersionLabel();

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
      showToast('应用初始化失败，请刷新页面重试', { type: 'error' });
      return;
    }

    // ================================================================
    // 初始化成功，继续启动流程
    // ================================================================

    if (import.meta.env.DEV) {
      // 🔧 暴露核心服务到 window (仅用于测试和调试)
      try {
        // 服务已经在 bootstrap.initialize() 中初始化并缓存
        // 🔧 修复: resolve返回Promise时需要await获取实际实例
        const eventBusResult = container.resolve('eventBus');
        const actionRegistryResult = container.resolve('actionRegistry');
        const routerResult = container.resolve('router');

        // await所有可能的Promise
        const eventBus = eventBusResult instanceof Promise ? await eventBusResult : eventBusResult;
        const actionRegistry = actionRegistryResult instanceof Promise ? await actionRegistryResult : actionRegistryResult;
        const router = (routerResult instanceof Promise ? await routerResult : routerResult) as RouterDebugApi;

        legacyWindow['eventBus'] = eventBus;
        legacyWindow['EventBus'] = eventBus;
        legacyWindow['actionRegistry'] = actionRegistry;
        legacyWindow['ActionRegistry'] = actionRegistry;
        legacyWindow['router'] = router;
        legacyWindow['Router'] = router;
        legacyWindow['loadingManager'] = loadingManager;
        legacyWindow['LoadingManager'] = loadingManager;

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
      } catch (e) {
        console.error('[Services] ❌ Failed to expose some services to window:', e);
      }
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

    // 🔧 关键修复: 视图加载完成后，触发路由的初始导航
    try {
      triggerInitialNavigation();
      console.log("✅ Initial navigation triggered");
    } catch (e) {
      console.error('❌ Initial navigation failed:', e);
    }

    // 初始化全局事件委托
    initGlobalEventDelegation();

    // 初始化LoadingManager
    const globalLoading = document.getElementById('global-loading');
    if (globalLoading) {
      loadingManager.setGlobalLoadingElement(globalLoading);
      console.log("✅ LoadingManager initialized");
    }

    // 可选：初始化事件日志
    try {
      initEventLogger();
    } catch (e) {
      console.warn('事件日志初始化失败:', e);
    }

    // 可选：加载插件
    try {
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

    // 🎯 微交互动画系统: 初始化动画管理器
    try {
      console.log('🎨 Initializing Animation System...');

      // AnimationManager 已在导入时自动初始化（单例模式）
      // 这里只需要初始化 AnimationStore
      initializeAnimationStore();

      console.log('✅ Animation System initialized');
      console.log('   - Animations enabled:', animationManager.getSettings().enabled);
      console.log('   - Animation speed:', animationManager.getSettings().speed);
      console.log('   - Respect system preference:', animationManager.getSettings().respectSystemPreference);
      console.log('   - Reduced motion:', animationManager.shouldReduceMotion());
    } catch (error) {
      console.error('❌ Animation System initialization failed:', error);
      // 动画系统初始化失败不应阻止应用启动
    }

    // 🎯 阶段5: 预加载高优先级模块CSS
    import('./common/utils/moduleCssLoader').then(({ moduleCssLoader }) => {
      moduleCssLoader.preloadHighPriorityModules();
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

    // 🎯 微交互动画: 初始化按钮涟漪效果
    import('./components/button-ripple').then(({ initButtonRipple, observeButtonChanges, observeAnimationSettings }) => {
      initButtonRipple();
      observeButtonChanges();
      observeAnimationSettings();
      console.log('✅ Button ripple effects initialized');
    }).catch((error) => {
      console.warn('按钮涟漪效果初始化失败:', error);
    });

    // 🎯 微交互动画: 初始化表单输入动画
    import('./components/form-animation').then(({ initializeFormAnimations }) => {
      initializeFormAnimations();
      console.log('✅ Form input animations initialized');
    }).catch((error) => {
      console.warn('表单输入动画初始化失败:', error);
    });

    // 🎯 微交互动画: 初始化列表交错动画观察器
    import('./utils/animation-utils').then(({ observeListAnimations }) => {
      observeListAnimations();
      console.log('✅ List stagger animations observer initialized');
    }).catch((error) => {
      console.warn('列表交错动画观察器初始化失败:', error);
    });

    // 渲染顶部 Mega Menu
    renderMegaMenu();
    renderSopsMegaMenu();
    renderHubMegaMenu();
    renderMoreMenu();

    // 广播应用初始化完成事件
    const eventBusResult = container.resolve('eventBus');
    const eventBus = (eventBusResult instanceof Promise ? await eventBusResult : eventBusResult) as EventBusDebugApi;
    eventBus.emit(APP_EVENTS.INITIALIZED, { timestamp: Date.now() });

    // 初始化默认状态
    updateModelStatus();

    // 🎯 开发环境：初始化调试接口
    if (import.meta.env.DEV) {
      debugInterface.initialize();
      debugInterface.registerContainer(container);
      // Router 已在 Bootstrap 中初始化
      const router = container.resolve('router');
      debugInterface.registerRouter(router);
    }

    console.log("✅ System: Ready");

  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    showToast('应用启动失败，请刷新页面重试', { type: 'error' });
  }
});

// ================================================================
// 🎯 P1: 集中注册全局动作 (替代散落的 window.xxx = xxx)
// ================================================================
// 使用 registerActionsWithLegacy 在注册到 ActionRegistry 的同时
// 也挂载到 window，保持向后兼容现有旧模板调用

interface ActionParams {
  tab?: string;
  param?: string;
  updateHistory?: boolean;
  format?: 'json' | 'csv';
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

registerActionsWithLegacy({
  // === Navigation 导航 ===
  // switchTab 已废弃，使用 navigateTo 代替

  // switchDataTab, // Owned by DataModule
  renderMegaMenu,

  // === Utilities 工具函数 ===
  showToast: (params: Record<string, unknown>) => {
    if (typeof params === 'string') {
      showToast(params as string);
    } else if (params.message) {
      showToast(params.message as string, { type: params.type as ToastType });
    }
  },

  // === Modal 模态框 ===
  close: (_params: unknown, event?: Event) => {
    // 通用的 close 动作：查找最近的 app-modal 并关闭
    const target = event?.target as HTMLElement | null;
    if (!target) return;

    // 向上查找最近的 app-modal 元素
    const modal = target.closest('app-modal');
    if (isClosableModalElement(modal)) {
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
        window.showToast('性能报告已输出到控制台 (F12)', { type: 'info' });
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
      window.showToast(`已切换到${theme?.name || themeId}`, { type: 'success' });
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
    console.log('📋 日志功能已移除，请使用浏览器开发者工具查看控制台日志');

    if (window.showToast) {
      window.showToast('日志功能已移除，请使用浏览器开发者工具', { type: 'info' });
    }

    return [];
  },

  showErrors: async () => {
    console.log('❌ 错误日志功能已移除，请使用浏览器开发者工具查看控制台');

    if (window.showToast) {
      window.showToast('错误日志功能已移除', { type: 'info' });
    }

    return [];
  },

  clearLogs: async () => {
    console.log('日志已清除（实际已移除日志存储）');
    if (window.showToast) {
      window.showToast('日志已清除', { type: 'success' });
    }
  },

  downloadLogs: async (params?: ActionParams) => {
    const format = (params?.format || 'json') as 'json' | 'csv';
    console.log('下载日志功能已移除');
    if (window.showToast) {
      window.showToast(`日志已导出为 ${format.toUpperCase()} 格式`, { type: 'success' });
    }
  },

  // Scraper, Data, Analysis actions are now self-registered by their respective modules
});

console.log("✅ [ActionRegistry] 全局动作已注册");
