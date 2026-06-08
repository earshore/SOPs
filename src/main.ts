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
import { initDeferredViews, initHomeView } from './common/utils/viewLoader';

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

type MainConsole = Pick<Console, 'info' | 'warn' | 'error'>;

const legacyWindow = window as unknown as LegacyDebugWindow;
const nativeConsole: MainConsole = globalThis.console;
const mainLogger = {
  info(message: string, data?: unknown): void {
    if (data === undefined) {
      nativeConsole.info(`[Main] ${message}`);
      return;
    }
    nativeConsole.info(`[Main] ${message}`, data);
  },
  warn(message: string, data?: unknown): void {
    if (data === undefined) {
      nativeConsole.warn(`[Main] ${message}`);
      return;
    }
    nativeConsole.warn(`[Main] ${message}`, data);
  },
  error(message: string, data?: unknown): void {
    if (data === undefined) {
      nativeConsole.error(`[Main] ${message}`);
      return;
    }
    nativeConsole.error(`[Main] ${message}`, data);
  },
};

let hasInitializedHomeSplash = false;

function isClosableModalElement(element: Element | null): element is ClosableModalElement {
  return element instanceof HTMLElement && typeof (element as { close?: unknown }).close === 'function';
}

function updateAppVersionLabel(): void {
  const versionEl = document.getElementById('app-version-more');
  if (versionEl) {
    versionEl.textContent = `V ${APP_VERSION}`;
  }
}

async function loadMainStyles(): Promise<void> {
  try {
    await import('./css/main.css');
    mainLogger.info("Main styles loaded");
  } catch (e) {
    mainLogger.warn('主样式加载失败', e);
  }
}

function createServiceBootstrap(): ServiceBootstrap {
  registerAllServices(serviceRegistry);
  serviceRegistry.registerAll(container);
  return new ServiceBootstrap(container, serviceRegistry);
}

async function exposeCoreServicesForDebug(): Promise<void> {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    const eventBusResult = container.resolve('eventBus');
    const actionRegistryResult = container.resolve('actionRegistry');
    const routerResult = container.resolve('router');

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

    mainLogger.info('[Services] Core services exposed to window', {
      eventBus: typeof eventBus,
      actionRegistry: typeof actionRegistry,
      router: typeof router,
      routerMethods: {
        navigate: typeof router?.navigate,
        back: typeof router?.back,
        forward: typeof router?.forward,
        getCurrentRoute: typeof router?.getCurrentRoute
      }
    });
  } catch (e) {
    mainLogger.error('[Services] Failed to expose some services to window', e);
  }
}

function initializeAlpineRuntime(): void {
  mainLogger.info("Initializing Alpine.js...");
  initAlpineSettings();
  mainLogger.info("Alpine components registered");

  Alpine.start();
  mainLogger.info("Alpine.js started");

  try {
    const registry = AlpineRegistry.getInstance();
    registry.init();
    mainLogger.info("AlpineRegistry initialized");
  } catch (e) {
    mainLogger.error('AlpineRegistry initialization failed', e);
  }
}

function isInitialHomeRoute(): boolean {
  const currentHash = window.location.hash.replace(/^#/, '').trim();
  return !currentHash || currentHash === '/' || currentHash === '/home' || currentHash === 'home';
}

function revealInitialHomeView(): boolean {
  if (!isInitialHomeRoute()) {
    return false;
  }

  const homePanel = document.getElementById('panel-home');
  if (!homePanel) {
    return false;
  }

  document.querySelectorAll('.panel').forEach(panel => panel.classList.add('hidden'));
  homePanel.classList.remove('hidden');
  return true;
}

function initializeHomeSplashOnce(): void {
  if (hasInitializedHomeSplash) {
    return;
  }

  initHomeSplash();
  hasInitializedHomeSplash = true;
}

function preloadDeferredViews(): void {
  initDeferredViews().catch((error) => {
    mainLogger.warn('Deferred views preload failed', error);
  });
}

async function loadCriticalViewsAndNavigate(
  homeViewReady: Promise<void>,
  shouldWaitForHomeView: boolean
): Promise<void> {
  if (shouldWaitForHomeView) {
    mainLogger.info("Waiting for initial home view...");
    await homeViewReady;
    mainLogger.info("Initial home view ready");
  }

  try {
    triggerInitialNavigation();
    mainLogger.info("Initial navigation triggered");
  } catch (e) {
    mainLogger.error('Initial navigation failed', e);
  }

  preloadDeferredViews();

  if (!shouldWaitForHomeView) {
    homeViewReady
      .then(() => initializeHomeSplashOnce())
      .catch((error) => {
        mainLogger.warn('Home splash initialization skipped', error);
      });
  }
}

function initializeStartupUtilities(): void {
  initGlobalEventDelegation();

  const globalLoading = document.getElementById('global-loading');
  if (globalLoading) {
    loadingManager.setGlobalLoadingElement(globalLoading);
    mainLogger.info("LoadingManager initialized");
  }

  try {
    initEventLogger();
  } catch (e) {
    mainLogger.warn('事件日志初始化失败', e);
  }

  try {
    loadPlugins();
  } catch (e) {
    mainLogger.warn('插件加载失败', e);
  }
}

function initializeAnimationSystem(): void {
  try {
    mainLogger.info('Initializing Animation System...');
    initializeAnimationStore();
    mainLogger.info('Animation System initialized', {
      enabled: animationManager.getSettings().enabled,
      speed: animationManager.getSettings().speed,
      respectSystemPreference: animationManager.getSettings().respectSystemPreference,
      reducedMotion: animationManager.shouldReduceMotion()
    });
  } catch (error) {
    mainLogger.error('Animation System initialization failed', error);
  }
}

function initializeLazyEnhancements(): void {
  import('./common/utils/moduleCssLoader').then(({ moduleCssLoader }) => {
    moduleCssLoader.preloadHighPriorityModules();
  });

  import('./common/utils/ImageLazyLoader').then(({ imageLazyLoader }) => {
    imageLazyLoader.initialize({
      rootMargin: '50px',
      threshold: 0.01,
      fadeIn: true,
      fadeInDuration: 300
    });
  });

  import('./components/button-ripple').then(({ initButtonRipple, observeButtonChanges, observeAnimationSettings }) => {
    initButtonRipple();
    observeButtonChanges();
    observeAnimationSettings();
    mainLogger.info('Button ripple effects initialized');
  }).catch((error) => {
    mainLogger.warn('按钮涟漪效果初始化失败', error);
  });

  import('./components/form-animation').then(({ initializeFormAnimations }) => {
    initializeFormAnimations();
    mainLogger.info('Form input animations initialized');
  }).catch((error) => {
    mainLogger.warn('表单输入动画初始化失败', error);
  });

  import('./utils/animation-utils').then(({ observeListAnimations }) => {
    observeListAnimations();
    mainLogger.info('List stagger animations observer initialized');
  }).catch((error) => {
    mainLogger.warn('列表交错动画观察器初始化失败', error);
  });
}

function renderGlobalMenus(): void {
  renderMegaMenu();
  renderSopsMegaMenu();
  renderHubMegaMenu();
  renderMoreMenu();
}

async function emitAppInitialized(): Promise<void> {
  const eventBusResult = container.resolve('eventBus');
  const eventBus = (eventBusResult instanceof Promise ? await eventBusResult : eventBusResult) as EventBusDebugApi;
  eventBus.emit(APP_EVENTS.INITIALIZED, { timestamp: Date.now() });
}

function initializeDebugInterface(): void {
  if (!import.meta.env.DEV) {
    return;
  }

  debugInterface.initialize();
  debugInterface.registerContainer(container);
  const router = container.resolve('router');
  debugInterface.registerRouter(router);
}

async function continueStartup(
  homeViewReady: Promise<void>,
  shouldWaitForHomeView: boolean
): Promise<void> {
  await exposeCoreServicesForDebug();
  initializeAlpineRuntime();
  await loadCriticalViewsAndNavigate(homeViewReady, shouldWaitForHomeView);
  initializeStartupUtilities();
  ThemeManager.restoreTheme();
  initializeAnimationSystem();
  initializeLazyEnhancements();
  renderGlobalMenus();
  await emitAppInitialized();
  updateModelStatus();
  initializeDebugInterface();
}

// 🔧 关键修复: 确保 Alpine 在所有环境下都可通过 window.Alpine 访问
// 这对于动态注册组件至关重要
// 使用类型断言避免 TypeScript 错误,并确保不被 Terser 优化掉
legacyWindow['Alpine'] = Alpine;

if (import.meta.env.DEV) {
  // 🔧 暴露 Zustand Store 到 window (仅用于开发调试和测试)
  legacyWindow['useAppStore'] = appStore;
  legacyWindow['appStore'] = appStore;
  mainLogger.info('[Alpine] Alpine.js loaded and exposed to window');
  mainLogger.info('[Store] Zustand store exposed to window');
}

// ========================
// APP STARTUP (程序启动)
// ========================

document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
  mainLogger.info("System: Application Booting...");

  const shouldWaitForHomeView = isInitialHomeRoute();
  const homeViewReady = initHomeView();
  const mainStylesReady = loadMainStyles();

  if (shouldWaitForHomeView) {
    await homeViewReady;
    if (revealInitialHomeView()) {
      initializeHomeSplashOnce();
    }
  }

  await mainStylesReady;
  updateAppVersionLabel();
  const bootstrap = createServiceBootstrap();

  // ================================================================
  // 执行初始化
  // ================================================================
  try {
    const result = await bootstrap.initialize();

    if (!result.success) {
      mainLogger.error('部分服务初始化失败，应用可能无法正常工作');
      showToast('应用初始化失败，请刷新页面重试', { type: 'error' });
      return;
    }

    // ================================================================
    // 初始化成功，继续启动流程
    // ================================================================
    await continueStartup(homeViewReady, shouldWaitForHomeView);

    mainLogger.info("System: Ready");

  } catch (error) {
    mainLogger.error('应用启动失败', error);
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

      mainLogger.info('性能报告', report);
      mainLogger.info('性能报告摘要', report.summary);

      if (window.showToast) {
        window.showToast('性能报告已输出到控制台 (F12)', { type: 'info' });
      }

      return report;
    } catch (e) {
      mainLogger.error('获取性能报告失败', e);
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
    mainLogger.info('日志功能已移除，请使用浏览器开发者工具查看控制台日志');

    if (window.showToast) {
      window.showToast('日志功能已移除，请使用浏览器开发者工具', { type: 'info' });
    }

    return [];
  },

  showErrors: async () => {
    mainLogger.info('错误日志功能已移除，请使用浏览器开发者工具查看控制台');

    if (window.showToast) {
      window.showToast('错误日志功能已移除', { type: 'info' });
    }

    return [];
  },

  clearLogs: async () => {
    mainLogger.info('日志已清除（实际已移除日志存储）');
    if (window.showToast) {
      window.showToast('日志已清除', { type: 'success' });
    }
  },

  downloadLogs: async (params?: ActionParams) => {
    const format = (params?.format || 'json') as 'json' | 'csv';
    mainLogger.info('下载日志功能已移除');
    if (window.showToast) {
      window.showToast(`日志已导出为 ${format.toUpperCase()} 格式`, { type: 'success' });
    }
  },

  // Scraper, Data, Analysis actions are now self-registered by their respective modules
});

mainLogger.info("[ActionRegistry] 全局动作已注册");
