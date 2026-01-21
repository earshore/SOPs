// src/main.js

// ✅ 新增：导入视图加载器 (这是 HTML 拆分重构的核心)
import { initViews } from './common/utils/viewLoader.js';

// ✅ 新增：全局错误兜底 (放在最前面)
window.addEventListener("error", (event) => {
  console.error("Global Error:", event.error);
  const msg = `系统错误: ${event.message || "未知错误"}`;
  if (!window._lastError || Date.now() - window._lastError > 1000) {
    window._lastError = Date.now();
    if (window.showToast) window.showToast(msg, "error");
  }
});

// ✅ 新增：Promise 异常兜底
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled Rejection:", event.reason);
  const msg = `异步操作失败: ${event.reason?.message || "未知原因"}`;
  if (!window._lastError || Date.now() - window._lastError > 1000) {
    window._lastError = Date.now();
    if (window.showToast) window.showToast(msg, "error");
  }
});

// 1. 导入各模块的初始化函数和业务函数
import { initSettingsListeners, updateModelStatus, loadProviderConfig, openSettings, closeSettings, toggleApiKeyVisibility, saveProviderConfig, renderProxyInputUI, fetchModels, testConnection, saveProxyConfig, } from "./components/settings/systemSettings.js";
import { switchTab, renderMegaMenu } from "../src/common/utils/ui.js";
import { initHomeSplash } from "./modules/home/homeDisplay.js";
import { initScraperListeners, selectSite, renderHistory, } from "./modules/master_prompt/scraper/scraperPanel.js";
import { renderDataPanel, triggerImport, switchDataTab, handleImportFiles, toggleCardExpand, deleteProduct, deleteReview } from "./modules/master_prompt/data_manage/dataDisplay.js";
import { initAnalysisPanel, updateAsinSelectList, analyzeSelectedAsins, renderReport, } from "./modules/master_prompt/analysis/analysisDisplay.js";
import { initPromptlabModule } from './modules/master_prompt/promptlab/promptlabDisplay.js';
import { initKeywordTracker } from './modules/keyword_tracker/trackerDisplay.js';
// ✅ 核心修正：仅导入文件，让它自动注册事件监听器
// import './modules/amz_hub/amz_hubDisplay.js';
import './modules/amz_hub/amz_hub.js'; // 新的
import './modules/sops/sops.js'; // SOPs 流程中心模块

// ========================
// APP STARTUP (程序启动)
// ========================

// ⚠️ 注意：这里增加了 async 关键字
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 System: Application Booting...");

  // ----------------------------------------------------
  // ✅ 核心改动点：必须等待 HTML 注入完成后，才能绑定事件
  // ----------------------------------------------------
  try {
    await initViews();

    initHomeSplash();

    // 1. 初始化各模块的事件监听器 (现在可以安全运行了，因为 DOM 已经在页面上了)
    initSettingsListeners();

    initScraperListeners();
    initAnalysisPanel();
    initPromptlabModule();

    // ===============================================
    // ✅ 新增：在视图加载完成后，启动 Keyword Tracker 逻辑
    // ===============================================
    // 只有 HTML 存在于页面上时，init 才能找到元素并绑定事件
    initKeywordTracker();

    // 注意：不再需要显式调用 loadAmzHubView()，它会自动监听
    // loadAmzHubView();

    // 2. 渲染顶部 Mega Menu (新增)
    renderMegaMenu();

    console.log("✅ Views loaded successfully");
  } catch (error) {
    console.error("❌ Failed to load views:", error);
    // 这里可以加一个 toast 提示用户刷新
    return; // 如果视图加载失败，中止后续逻辑，防止报错
  }

  // 2. 初始化默认状态
  updateModelStatus();
  renderHistory();

  // 3. 恢复用户设置 (代理等)
  const savedProxy = JSON.parse(localStorage.getItem("proxy_config") || "{}");
  if (savedProxy.type) {
    const proxySelect = document.getElementById("proxy-select");
    if (proxySelect) {
      proxySelect.value = savedProxy.type;
      if (savedProxy.type === "custom") {
        document.getElementById("custom-proxy").classList.remove("hidden");
        document.getElementById("custom-proxy").value =
          savedProxy.customUrl || "";
      }
    }
  }

  switchTab('home');

  console.log("✅ System: Ready");
});

// ========================
// GLOBAL EXPORTS (全局暴露)
// ========================

// Navigation
window.switchTab = switchTab;
window.switchDataTab = switchDataTab;

// window.switchReportTab = switchReportTab;
window.renderMegaMenu = renderMegaMenu;

// Settings
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveProviderConfig = saveProviderConfig;
window.loadProviderConfig = loadProviderConfig;
window.fetchModels = fetchModels;
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.testConnection = testConnection;
window.saveProxyConfig = saveProxyConfig;

// Scraper
window.selectSite = selectSite;
// window.startScraping = startScraping;
// window.loadHistory = loadHistory;
// window.clearHistory = clearHistory;
// window.clearAsins = clearAsins;

// Data Display
window.toggleCardExpand = toggleCardExpand;
window.triggerImport = triggerImport;
window.handleImportFiles = handleImportFiles;
window.deleteReview = deleteReview;
window.renderDataPanel = renderDataPanel;
window.deleteProduct = deleteProduct;

// Analysis
window.updateAsinSelectList = updateAsinSelectList;
window.analyzeSelectedAsins = analyzeSelectedAsins;
window.renderReport = renderReport;


// 暴露全局函数供 HTML onclick 使用 (因为 module 作用域隔离)

//amz_hub

// window.loadAmzHubView = loadAmzHubView();
