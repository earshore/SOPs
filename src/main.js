// src/main.js
// ================================================================
// 🎯 P1 重构: 使用 ActionRegistry 替代散落的 window.xxx 赋值
// 🎯 Phase 4: 使用 StorageService 统一数据访问
// ================================================================

// ✅ Dependency Bundling (Optimization)
import { marked } from 'marked';
// Chart.js and GridStack are now lazy loaded via src/common/utils/lazyLibs.js
import '../css/style.css';

// Expose to window for legacy compatibility
window.marked = marked;

// ✅ 导入视图加载器 (HTML 拆分重构的核心)
import { initViews } from './common/utils/viewLoader.js';

// ✅ 导入 Web Components
import './common/components/AppModal.js';

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

// ✅ P1: 导入事件调试工具
import { initEventLogger } from './common/utils/eventLogger.js';

// ✅ 全局错误兜底 (增强版)
window.addEventListener("error", (event) => {
  console.error("Global Error:", event.error);
  // 避免循环报错导致的 Toast 刷屏
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
  initSettingsListeners,
  updateModelStatus,
  loadProviderConfig,
  openSettings,
  closeSettings,
  toggleApiKeyVisibility,
  saveProviderConfig,
  renderProxyInputUI,
  fetchModels,
  testConnection,
  saveProxyConfig
} from "./components/settings/systemSettings.js";

import { switchTab, renderMegaMenu, showToast, initRouter } from "../src/common/utils/ui.js";
import { initHomeSplash } from "./modules/home/homeDisplay.js";
import {
  initScraperListeners,
  selectSite,
  renderHistory
} from "./modules/master_prompt/scraper/scraperPanel.js";
import {
  renderDataPanel,
  triggerImport,
  switchDataTab,
  handleImportFiles,
  toggleCardExpand,
  deleteProduct,
  deleteReview
} from "./modules/master_prompt/data_manage/dataDisplay.js";
import {
  initAnalysisPanel,
  updateAsinSelectList,
  analyzeSelectedAsins,
  renderReport
} from "./modules/master_prompt/analysis/analysisDisplay.js";
import { initPromptlabModule } from './modules/master_prompt/promptlab/promptlabDisplay.js';
import { initKeywordTracker } from './modules/keyword_tracker/trackerDisplay.js';

// ✅ 自动注册事件监听器的模块 (事件驱动模式)
import './modules/amz_hub/amz_hub.js';
import './modules/sops/sops.js';

// ========================
// APP STARTUP (程序启动)
// ========================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 System: Application Booting...");

  // ----------------------------------------------------
  // ✅ 核心改动点：必须等待 HTML 注入完成后，才能绑定事件
  // ----------------------------------------------------
  try {
    await initViews();

    // ✅ P1: 初始化事件调试器 (需在广播事件前启用)
    initEventLogger();

    // ✅ P1: 初始化全局事件委托 (支持 data-action 模式)
    initGlobalEventDelegation();

    initHomeSplash();

    // 1. 初始化各模块的事件监听器
    initSettingsListeners();
    initScraperListeners();
    initAnalysisPanel();
    initPromptlabModule();
    initKeywordTracker();

    // 2. 渲染顶部 Mega Menu
    renderMegaMenu();

    // ================================================================
    // 🎯 P3: 广播应用初始化完成事件
    // 所有模块可以监听此事件实现自注册初始化
    // ================================================================
    window.dispatchEvent(new CustomEvent('app:initialized', {
      detail: { timestamp: Date.now() }
    }));

    console.log("✅ Views loaded successfully");
  } catch (error) {
    console.error("❌ Failed to load views:", error);
    return;
  }

  // 2. 初始化默认状态
  updateModelStatus();
  renderHistory();

  // 3. 恢复用户设置 (代理等) - 使用 StorageService
  const savedProxy = StorageService.getProxyConfig();
  if (savedProxy.type) {
    const proxySelect = document.getElementById("proxy-select");
    if (proxySelect) {
      proxySelect.value = savedProxy.type;
      if (savedProxy.type === "custom") {
        document.getElementById("custom-proxy").classList.remove("hidden");
        document.getElementById("custom-proxy").value = savedProxy.customUrl || "";
      }
    }
  }

  // 4. 初始化路由 (替代手动 switchTab)
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
  switchTab,
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

