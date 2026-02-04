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
import { initViews } from './common/utils/viewLoader.js';

// ✅ 导入 Web Components
import './components/modal/AppModal.js';

// ✅ 导入 StorageService
import { StorageService, STORAGE_KEYS } from './services/storageService.js';

// ✅ Import User Guide Modal (Vite Raw Import)
import userGuideModalHtml from './components/modal/userGuideModal.html?raw';
import promptModalHtml from './components/modal/promptModal.html?raw';

// Inject Modals
document.addEventListener('DOMContentLoaded', () => {
  // User Guide Modal
  const guideContainer = document.getElementById('user-guide-container');
  if (guideContainer) {
    guideContainer.innerHTML = userGuideModalHtml;
    Array.from(guideContainer.querySelectorAll('script')).forEach(script => {
      const newScript = document.createElement('script');
      Array.from(script.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = script.textContent;
      document.body.appendChild(newScript);
    });
  }

  // Register Prompt Modal Global Helper
  window.renderPromptModal = () => {
    const modalId = 'prompt-modal';
    if (!document.getElementById(modalId)) {
      const temp = document.createElement('div');
      temp.innerHTML = promptModalHtml;
      document.getElementById('modal-container').appendChild(temp.firstElementChild);
    }
    // Use the component's open method
    const modal = document.getElementById(modalId);
    if (modal && modal.open) modal.open();
  };
});


// ✅ P1: 导入动作注册中心
import {
  registerActionsWithLegacy,
  initGlobalEventDelegation
} from './common/utils/actionRegistry.js';

import { loadPlugins } from './common/utils/pluginLoader.js';

// ✅ P1: 导入事件调试工具
import { initEventLogger } from './common/utils/eventLogger.js';

// ✅ 全局错误兜底 (增强版)
window.addEventListener("error", (event) => {
  console.error("Global Error:", event.error);
  // 避免循环报错导致 Toast 刷屏
  if (window._errorThrottle && Date.now() - window._errorThrottle < 2000) return;
  window._errorThrottle = Date.now();

  const msg = `系统运行异常: ${event.message || "未知错误"}`;
  if (window.showToast) window.showToast(msg, "error");

  // 记录到错误服务 (如果存在)
  try {
    import('./services/errorService.js').then(({ ErrorService }) => {
      ErrorService.handle(event.error, { action: 'window.onerror', fatal: false });
    });
  } catch (e) {
    // ignore dynamic import errors
  }
});

// ✅ Promise 异常兜底 (增强版)
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled Rejection:", event.reason);
  if (window._errorThrottle && Date.now() - window._errorThrottle < 2000) return;
  window._errorThrottle = Date.now();

  const msg = `异步操作异常: ${event.reason?.message || "网络请求或数据处理失败"}`;
  if (window.showToast) window.showToast(msg, "error");
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
import { initRouterSystem } from './common/router/index.js';
import { APP_EVENTS } from './common/constants/eventConstants.js';
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

  // 0. Initialize Router System (新路由系统)
  initRouterSystem({
    enableLogging: true,
    enableScrollRestoration: true,
    defaultTitle: 'Amazing Amazon Architect'
  });

  // 1. Initialize Alpine Components
  initAlpineSettings();
  Alpine.start();

  // ----------------------------------------------------
  // 🔥 核心改动点：必须等待 HTML 注入完成后，才能绑定事件
  // ----------------------------------------------------
  try {
    await initViews();

    // ✅ P1: 初始化事件调试器 (需在广播事件前启用)
    initEventLogger();

    // ✅ P1: 初始化全局事件委托 (支持 data-action 模式)
    initGlobalEventDelegation();

    // ⚡️ Load Plugins (Dynamic Registration)
    loadPlugins();

    initHomeSplash();

    // 1. 渲染顶部 Mega Menu
    renderMegaMenu();
    renderSopsMegaMenu();
    renderHubMegaMenu();
    renderMoreMenu();

    // ================================================================
    // 🎯 P3: 广播应用初始化完成事件
    // 所有模块可以监听此事件实现自注册初始化
    // ================================================================
    window.dispatchEvent(new CustomEvent(APP_EVENTS.INITIALIZED, {
      detail: { timestamp: Date.now() }
    }));

    console.log("✅ Views loaded successfully");
  } catch (error) {
    console.error("❌ Failed to load views:", error);
    return;
  }

  // 2. 初始化默认状态
  updateModelStatus();

  // 3. 初始化路由 (替代手动 switchTab)
  initRouter();

  console.log("✅ System: Ready");
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

  // === Settings 设置 ===
  openSettings,
  closeSettings,
  saveProviderConfig,
  loadProviderConfig,
  fetchModels,
  toggleApiKeyVisibility,
  testConnection,
  saveProxyConfig,

  // Scraper, Data, Analysis actions are now self-registered by their respective modules
});

console.log("✅ [ActionRegistry] 全局动作已注册");