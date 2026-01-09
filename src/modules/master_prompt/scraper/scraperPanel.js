// src/ui/scraperPanel.js
import state from "../../../common/state.js";
import { showToast, showProgress, getErrorSummary, sleep } from "../../../common/utils/ui.js";
import { scrapeAsin } from "./scraperService.js";
// 引入 languageFlagMap
import { LANGUAGE_HEADERS, languageFlagMap, SITE_NAME_MAP } from "../../../common/constants/constants.js";
import { renderDataPanel } from "../data_manage/dataDisplay.js";
import { updateAsinSelectList } from "../analysis/analysisDisplay.js";
import { HistoryService } from "../../../services/historyService.js";
import { saveProxyConfig, renderProxyInputUI } from "../../../components/settings/systemSettings.js"

// ==========================================
// 1. 配置管理 (隔离存储)
// ==========================================

const CONFIG_MAP_KEY = "proxy_key_map";
const HISTORY_STORAGE_KEY = "scrape_history"; // 与 historyService 保持一致，用于手动删除

function getSavedKey(type) {
  try {
    const map = JSON.parse(localStorage.getItem(CONFIG_MAP_KEY) || "{}");
    return map[type] || "";
  } catch {
    return "";
  }
}

function saveKeyToMap(type, key) {
  const map = JSON.parse(localStorage.getItem(CONFIG_MAP_KEY) || "{}");
  map[type] = key;
  localStorage.setItem(CONFIG_MAP_KEY, JSON.stringify(map));
}

function getProxyDisplayName(type) {
  const names = {
    scraperapi: "ScraperAPI (商业)",
    zenrows: "ZenRows (商业)",
    brightdata: "Bright Data",
    custom_api: "自定义 API",
    allorigins: "AllOrigins (免费)",
    custom_proxy: "HTTP 代理",
  };
  return names[type] || "默认直连";
}

// ==========================================
// 2. 初始化与 UI 深度重构
// ==========================================

// src/ui/scraperPanel.js

export function initScraperListeners() {
  window.saveProxyConfig = saveProxyConfig;
  window.closeSettings = closeSettings;
  window.loadHistory = loadHistory;
  window.deleteHistoryItem = deleteHistoryItem;

  // === 优化1: 默认设置 AllOrigins ===
  // 检查本地是否有配置，如果没有，则初始化为 allorigins
  if (!localStorage.getItem("proxy_config")) {
    localStorage.setItem(
      "proxy_config",
      JSON.stringify({ type: "allorigins", customUrl: "" })
    );
    // 同步更新 map，防止显示错乱
    const map = JSON.parse(localStorage.getItem("proxy_key_map") || "{}");
    if (!map.allorigins) {
      map.allorigins = "";
      localStorage.setItem("proxy_key_map", JSON.stringify(map));
    }
  }

  // 1. 强制重构设置模态框 UI
  const proxySelect = document.getElementById("proxy-select");
  if (proxySelect) {
    const newSelect = proxySelect.cloneNode(true);
    proxySelect.parentNode.replaceChild(newSelect, proxySelect);

    newSelect.addEventListener("change", () => {
      renderProxyInputUI(newSelect.value);
    });

    const currentConfig = JSON.parse(localStorage.getItem("proxy_config"));
    if (currentConfig && currentConfig.type) {
      newSelect.value = currentConfig.type;
    }
    renderProxyInputUI(newSelect.value);
  }

  // 2. 美化标题栏 (保持原有代码不变)
  const historyHeaders = document.querySelectorAll("h3");
  historyHeaders.forEach((h) => {
    if (h.innerText.includes("最近任务") || h.innerText.includes("历史快照")) {
      h.innerHTML = `
            <div class="flex items-center justify-between w-full border-b border-slate-100 pb-3 mb-2">
                <span class="flex items-center gap-2 text-slate-800 font-bold text-base">
                    <i class="fas fa-history text-indigo-500"></i>
                    历史快照
                </span>
                <button id="clear-history-btn" class="text-xs text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50">
                    <i class="fas fa-trash-alt"></i> 清空全部
                </button>
            </div>`;
      setTimeout(() => {
        const btn = document.getElementById("clear-history-btn");
        if (btn) btn.onclick = clearHistory;
      }, 0);
    }
  });

  // === 优化2: ASIN为空时冻结按钮 ===
  const inputEl = document.getElementById("asin-input");
  const startBtn = document.getElementById("start-scrape-btn");

  // 定义一个更新按钮状态的辅助函数
  const updateButtonState = (val) => {
    if (!startBtn) return;
    const { valid } = validateAsins(val || "");

    if (valid.length > 0) {
      startBtn.disabled = false;
      startBtn.classList.remove(
        "opacity-50",
        "cursor-not-allowed",
        "grayscale"
      );
      startBtn.classList.add("hover:shadow-xl");
      startBtn.title = "";
    } else {
      startBtn.disabled = true;
      startBtn.classList.add("opacity-50", "cursor-not-allowed", "grayscale");
      startBtn.classList.remove("hover:shadow-xl");
      startBtn.title = "请输入有效的 ASIN 以开始";
    }
  };

  if (inputEl) {
    // 初始化时立即检查一次（防止刷新页面后输入框有值但按钮被禁）
    updateButtonState(inputEl.value);

    inputEl.addEventListener("input", function () {
      const { valid, invalid } = validateAsins(this.value);
      const countEl = document.getElementById("asin-count");

      // 更新计数显示
      if (valid.length > 0) {
        countEl.innerHTML = `<span class="text-emerald-700 font-bold">已识别 ${valid.length} 个 ASIN</span>`;
      } else {
        countEl.textContent = "等待输入...";
      }

      // 更新错误显示
      const errEl = document.getElementById("asin-error");
      if (invalid.length > 0) {
        errEl.innerHTML = `<span class="text-rose-500 text-xs font-medium"><i class="fas fa-filter"></i> 自动过滤 ${invalid.length} 个无效项</span>`;
        errEl.classList.remove("hidden");
      } else {
        errEl.classList.add("hidden");
      }

      // 实时更新按钮状态
      updateButtonState(this.value);
    });
  }

  if (startBtn) startBtn.onclick = startScraping;

  // 5. 模态框监听 (保持不变)
  const settingsModal = document.getElementById("settings-modal");
  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        saveProxyConfig(true);
        closeSettings();
      }
    });
  }

  setTimeout(updateNetworkUI, 100);
}

// 选择站点 (样式切换)
function selectSite(site) {
  state.selectedSite = site;
  document.querySelectorAll(".site-btn").forEach((btn) => {
    const isSel = btn.dataset.site === site;

    // 使用 classList.toggle 进行批量状态切换
    btn.classList.toggle("selected", isSel);

    // 选中状态样式
    btn.classList.toggle("border-blue-500", isSel);
    btn.classList.toggle("bg-blue-50", isSel);
    btn.classList.toggle("ring-1", isSel); // 增加聚焦环
    btn.classList.toggle("ring-blue-500", isSel);

    // 未选中状态样式
    btn.classList.toggle("border-slate-200", !isSel);
    btn.classList.toggle("hover:border-blue-300", !isSel);
  });
}



function validateAsins(input) {
  const asins = input
    .split(/[,\n\s]+/)
    .map((a) => a.trim().toUpperCase())
    .filter((a) => a);
  const valid = asins.filter((a) => /^B0[A-Z0-9]{8}$/.test(a));
  return { valid, invalid: asins.filter((a) => !valid.includes(a)) };
}

function clearAsins() {
  document.getElementById("asin-input").value = "";
  document.getElementById("asin-count").textContent = "等待输入...";
  document.getElementById("asin-error").classList.add("hidden");
}

// ==========================================
// 3. 配置保存与网络 UI
// ==========================================

function closeSettings() {
  document.getElementById("settings-modal").classList.add("hidden");
}

// src/ui/scraperPanel.js

function updateNetworkUI() {
  // 1. 读取配置
  let config;
  try {
    config = JSON.parse(
      localStorage.getItem("proxy_config") || '{"type":"allorigins"}'
    );
  } catch (e) {
    config = { type: "allorigins" };
  }

  // 2. 状态判断
  const manualConfigTypes = [
    "scraperapi",
    "zenrows",
    "brightdata",
    "custom_api",
    "custom_proxy",
  ];
  const needsConfig = manualConfigTypes.includes(config.type);
  const hasValue = config.customUrl && config.customUrl.trim().length > 0;

  // 只要是“不需要配置” 或者 “需要配置且有值”，都算 Ready
  const isReady = !needsConfig || (needsConfig && hasValue);

  // 3. 准备文案
  const displayName = getProxyDisplayName(config.type);
  let statusText = "";

  if (!needsConfig) {
    statusText = "自动托管中";
  } else if (!hasValue) {
    statusText = "未配置 (点击设置)";
  } else {
    // 简单的脱敏
    const val = config.customUrl;
    const masked =
      val.length > 8
        ? `${val.substring(0, 3)}...${val.substring(val.length - 3)}`
        : "********";
    statusText = config.type === "custom_proxy" ? masked : `Key: ${masked}`;
  }

  // 4. 定义颜色样式
  // 准备好两种状态的颜色：绿色(Ready) vs 橙/红色(Warning)
  const colorState = isReady
    ? {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        textTitle: "text-slate-700",
        textSub: "text-emerald-600",
        dotPing: "bg-emerald-400",
        dotSolid: "bg-emerald-500",
      }
    : {
        bg: "bg-amber-50",
        border: "border-amber-200",
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        textTitle: "text-slate-800",
        textSub: "text-rose-500 font-bold", // 未配置时文字变红加粗
        dotPing: "bg-rose-500",
        dotSolid: "bg-rose-600",
      };

  // 5. 查找并更新 DOM
  // 使用 onclick 属性作为特征来定位那个 div
  const targetDiv = document.querySelector("div[onclick*='settings-modal']");

  if (targetDiv) {
    // 动态修改 class
    targetDiv.className = `flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border group shadow-sm ${colorState.bg} ${colorState.border}`;

    // 动态修改内容
    targetDiv.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${colorState.iconBg} ${colorState.iconColor}">
                    <i class="fas fa-network-wired text-sm"></i>
                </div>
                
                <div class="flex flex-col min-w-0 justify-center">
                    <span class="text-xs font-bold ${colorState.textTitle} truncate mb-0.5">
                        ${displayName}
                    </span>
                    <div class="flex items-center gap-1.5">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${colorState.dotPing} opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 ${colorState.dotSolid}"></span>
                        </span>
                        <span class="text-[10px] ${colorState.textSub} font-mono truncate">
                            ${statusText}
                        </span>
                    </div>
                </div>
            </div>
            
            <i class="fas fa-chevron-right text-xs text-slate-400 group-hover:text-slate-600 ml-2"></i>
        `;
  }
}

// src/ui/scraperPanel.js



// ==========================================
// 4. 采集状态 (字号放大 + 信息填满)
// ==========================================

function getStatusConfig(status) {
  const map = {
    pending: {
      bg: "bg-slate-100",
      text: "text-slate-500",
      border: "border-slate-200",
      icon: "fa-circle",
      shadow: "",
    },
    scraping: {
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      border: "border-indigo-200",
      icon: "fa-circle-notch fa-spin",
      shadow: "shadow-indigo-50",
    },
    success: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-200",
      icon: "fa-check-circle",
      shadow: "shadow-emerald-50",
    },
    failed: {
      bg: "bg-rose-50",
      text: "text-rose-600",
      border: "border-rose-200",
      icon: "fa-times-circle",
      shadow: "shadow-rose-50",
    },
  };
  return map[status] || map.pending;
}

function updateScrapeStatus(asin, status, message) {
  const list = document.getElementById("scrape-status-list");
  if (!list) return;

  if (!list.classList.contains("grid")) {
    list.className =
      "grid grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar";
  }

  let item = list.querySelector(`[data-asin="${asin}"]`);
  const cfg = getStatusConfig(status);
  const isRich = message.includes("<");

  // 增大字号，调整布局比例
  const htmlContent = `
    <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 border-dashed">
        <span class="font-mono font-bold text-base text-slate-800">${asin}</span>
        <div class="w-6 h-6 rounded-full ${
          cfg.bg
        } flex items-center justify-center">
            <i class="fas ${cfg.icon} ${cfg.text} text-sm"></i>
        </div>
    </div>
    <div class="text-xs text-slate-600 min-h-[2rem] flex items-center justify-center w-full">
        ${
          isRich
            ? message
            : `<div class="flex items-center gap-1.5 opacity-90 w-full">
                 <span class="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                 <span class="truncate font-medium w-full" title="${message}">${message}</span>
               </div>`
        }
    </div>
  `;

  const classes = `p-3.5 rounded-xl border transition-all duration-300 bg-white shadow-sm hover:shadow-md ${cfg.border} ${cfg.shadow}`;

  if (!item) {
    item = document.createElement("div");
    item.dataset.asin = asin;
    item.className = classes;
    item.innerHTML = htmlContent;
    list.appendChild(item);
  } else {
    item.className = classes;
    item.innerHTML = htmlContent;
  }
}

function renderScrapeSummary(products) {
  const summary = document.getElementById("scrape-summary");
  if (!summary) return;

  const failed = products.filter((p) => p.scrape_status === "failed");
  if (failed.length > 0) {
    summary.innerHTML = `
        <div class="p-4 bg-rose-50 border border-rose-100 rounded-xl mt-4">
            <div class="flex items-center gap-2 text-sm font-bold text-rose-700 mb-2">
                <i class="fas fa-exclamation-triangle"></i>
                <span>异常报告 (${failed.length})</span>
            </div>
            <div class="space-y-1.5">
                ${failed
                  .map(
                    (p) => `
                    <div class="flex justify-between items-center text-xs text-rose-600 bg-white/60 px-3 py-1.5 rounded border border-rose-100">
                        <span class="font-mono font-medium">${p.asin}</span>
                        <span class="truncate max-w-[200px] opacity-90">${getErrorSummary(
                          p.error
                        )}</span>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>`;
    summary.classList.remove("hidden");
  } else {
    summary.innerHTML = "";
    summary.classList.add("hidden");
  }
}

// ==========================================
// 5. 采集核心流程
// ==========================================

// src/ui/scraperPanel.js

async function startScraping() {
  // 标记开始
  state.isScraping = true;
  const input = document.getElementById("asin-input").value;
  const { valid: asins } = validateAsins(input);

  // === 修复 1: 确保 site 有默认值 ===
  // 如果 state.selectedSite 为空，默认使用 "DE" (因为 HTML 中默认高亮的是德国)
  if (!state.selectedSite) {
    state.selectedSite = "DE";
  }
  const site = state.selectedSite;

  // === 修复 2: 校验站点配置是否存在 ===
  if (!LANGUAGE_HEADERS[site]) {
    showToast(`无效的站点代码: ${site}，请重新选择`, "error");
    return;
  }

  state.scrapedData = null;
  state.analysisReport = null;
  state.translatedReport = null;
  state.currentHistoryId = Date.now();

  document.getElementById("no-data-msg").classList.remove("hidden");
  document.getElementById("data-cards").classList.add("hidden");
  document.getElementById("report-display").classList.add("hidden");
  document.getElementById("no-report-msg").classList.remove("hidden");

  const btn = document.getElementById("start-scrape-btn");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> <span>正在采集...</span>`;
  btn.classList.add("opacity-80");

  document.getElementById("scrape-status-panel").classList.remove("hidden");
  document.getElementById("scrape-status-list").innerHTML = "";
  document.getElementById("scrape-summary").classList.add("hidden");

  showProgress(true, 5);

  const scrapeReviews = document.getElementById("scrape-reviews").checked;
  let products = [];

  try {
    const scrapePromises = asins.map(async (asin, index) => {
      updateScrapeStatus(asin, "pending", "等待...");
      await sleep(index * 300);
      return scrapeAsin(asin, site, scrapeReviews, updateScrapeStatus);
    });

    products = await Promise.all(scrapePromises);

    products.forEach((p) => {
      if (p.scrape_status === "success") {
        const bullets = p.feature_bullets?.length || 0;
        const reviews = p.customer_reviews?.length || 0;
        const hasTitle = !!p.productTitle;

        const richMsg = `
                <div class="grid grid-cols-3 gap-1.5 w-full text-center">
                    <div class="bg-indigo-50 rounded px-1 py-1 border border-indigo-100 flex flex-col justify-center">
                        <div class="text-[10px] text-indigo-400 font-medium">标题</div>
                        <div class="text-xs font-bold ${
                          hasTitle ? "text-indigo-600" : "text-slate-300"
                        }">${hasTitle ? "OK" : "-"}</div>
                    </div>
                    <div class="bg-slate-50 rounded px-1 py-1 border border-slate-100 flex flex-col justify-center">
                        <div class="text-[10px] text-slate-400 font-medium">五点</div>
                        <div class="text-xs font-bold text-slate-700">${bullets}</div>
                    </div>
                    <div class="bg-slate-50 rounded px-1 py-1 border border-slate-100 flex flex-col justify-center">
                        <div class="text-[10px] text-slate-400 font-medium">评论</div>
                        <div class="text-xs font-bold text-slate-700">${reviews}</div>
                    </div>
                </div>
            `;
        updateScrapeStatus(p.asin, "success", richMsg);
      }
    });
  } catch (error) {
    console.error("Task Error:", error);
    showToast("任务异常中断", "error");
  } finally {
    if (!products || products.length === 0) {
      products = asins.map((asin) => ({
        asin,
        scrape_status: "failed",
        error: "System Error",
        feature_bullets: [],
        customer_reviews: [],
      }));
    }

    // === 修复 3: 使用可选链操作符 (?.) 防止读取 domain 报错 ===
    const siteConfig = LANGUAGE_HEADERS[site] || {};

    state.scrapedData = {
      metadata: {
        scrape_timestamp: new Date().toISOString(),
        marketplace: site,
        domain: siteConfig.domain || "unknown", // 安全访问
        language: siteConfig.name || "unknown", // 安全访问
        total_asins: asins.length,
      },
      products,
    };

    renderScrapeSummary(products);
    HistoryService.save(state.scrapedData, null);

    showProgress(false);
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-rocket"></i> <span>开始采集</span>`;
    btn.classList.remove("opacity-80");
    // 重新检查一下按钮状态，如果输入框被清空了可能需要禁用
    const inputNow = document.getElementById("asin-input").value;
    if (!inputNow) {
      btn.disabled = true;
      btn.classList.add("opacity-50", "cursor-not-allowed", "grayscale");
    }

    const successCount = products.filter(
      (p) => p.scrape_status === "success"
    ).length;
    if (successCount > 0) {
      renderDataPanel();
      updateAsinSelectList();
    }
    renderHistory();

    showToast(
      `完成: ${successCount} 成功`,
      successCount > 0 ? "success" : "warning"
    );
    // 标记结束（无论成功还是失败，都要重置状态）
    // 这一步至关重要！否则 loadHistory 会一直以为任务在运行
    state.isScraping = false;
  }
}

// ==========================================
// 6. 历史记录 (字号放大 + 单条删除)
// ==========================================

function saveToHistory(data, report) {
  HistoryService.save(data, report);
  renderHistory();
}

// 单条删除逻辑
function deleteHistoryItem(id) {
  // 阻止冒泡通常由HTML结构控制，这里通过UI交互确认
  if (!confirm("确定要删除这条历史记录吗？")) return;

  // 直接操作 localStorage，因为 HistoryService 没有提供 delete 方法
  try {
    const history = JSON.parse(
      localStorage.getItem(HISTORY_STORAGE_KEY) || "[]"
    );
    const newHistory = history.filter((h) => h.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));

    // 如果删除的是当前选中的，清空状态
    if (state.currentHistoryId === id) {
      state.scrapedData = null;
      state.analysisReport = null;
      document.getElementById("data-cards").classList.add("hidden");
      document.getElementById("no-data-msg").classList.remove("hidden");
    }

    renderHistory();
    showToast("记录已删除", "success");
  } catch (e) {
    console.error("Delete failed", e);
    showToast("删除失败", "error");
  }
}

export function renderHistory() {
  const history = HistoryService.getAll();
  const list = document.getElementById("history-list");
  if (!list) return;

  if (history.length === 0) {
    list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
            <i class="far fa-folder-open text-4xl mb-3 opacity-40"></i>
            <p class="text-sm font-medium">暂无历史数据</p>
        </div>`;
    return;
  }

  list.innerHTML = history
    .map((h) => {
      const isActive = state.currentHistoryId === h.id;
      const products = h.data?.products || [];

      const validProducts = products.filter(
        (p) => p.productTitle && p.productTitle.length > 5
      );
      const successCount = validProducts.length;
      const total = h.asins.length;
      const totalReviews = products.reduce(
        (acc, p) => acc + (p.customer_reviews?.length || 0),
        0
      );

      const date = new Date(h.timestamp);
      const isToday = new Date().toDateString() === date.toDateString();
      const dateStr = isToday
        ? `${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes()
          ).padStart(2, "0")}`
        : `${date.getMonth() + 1}/${date.getDate()}`;

      // 兼容国旗
      const flagKey = h.site === "UK" ? "GB" : h.site;
      const flag = languageFlagMap[flagKey] || "🏳️";

      // === 2. 新增：获取中文名和域名 ===
      // 获取中文名，如果没有定义则回退显示代码 (如 "DE")
      const cnName = SITE_NAME_MAP[h.site] || h.site;
      // 获取域名 (从已导入的 LANGUAGE_HEADERS 中获取)
      const domain = LANGUAGE_HEADERS[h.site]?.domain || "";

      const containerClass = isActive
        ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100"
        : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200";

      const successColor =
        successCount === total
          ? "text-emerald-600"
          : successCount > 0
          ? "text-amber-500"
          : "text-rose-500";

      return `<div class="relative p-3 rounded-xl border border-gray-200 bg-white mb-2 group transition-all hover:border-indigo-200 hover:shadow-sm ${containerClass}">
    
    <div class="flex items-start justify-between mb-2 relative z-10">
        <div class="flex items-center gap-2">
            <span class="text-lg flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 shrink-0">${flag}</span>
            
            <div class="flex flex-col">
                <div class="flex items-center gap-1.5">
                    <span class="text-sm font-bold text-gray-800 tracking-tight leading-none">
                        ${cnName}站
                    </span>
                    ${
                      h.report
                        ? '<span class="inline-flex items-center px-1.5 py-[1px] rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100"><i class="fas fa-magic mr-1"></i>已分析</span>'
                        : ""
                    }
                </div>
                ${
                  domain
                    ? `<span class="text-[10px] text-gray-400 font-medium leading-tight">${domain}</span>`
                    : ""
                }
            </div>
        </div>
        
        <div class="flex items-center gap-1">
            <span class="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                ${dateStr}
            </span>
            <button onclick="event.stopPropagation(); window.deleteHistoryItem(${
              h.id
            })" 
                class="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100" title="删除">
                <i class="fas fa-times text-[10px]"></i>
            </button>
        </div>
    </div>

    <div class="flex flex-wrap gap-1.5 mb-2 relative z-10 pl-0.5">
        ${h.asins
          .slice(0, 3)
          .map(
            (asin) =>
              `<span class="text-[10px] font-mono font-medium text-gray-600 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors cursor-default">${asin}</span>`
          )
          .join("")}
        ${
          h.asins.length > 3
            ? `<span class="text-[10px] text-gray-400 font-medium px-1">+${
                h.asins.length - 3
              }</span>`
            : ""
        }
    </div>

    <div class="flex items-center justify-between pt-2 border-t border-gray-50">
        <div class="flex gap-4">
            <div class="flex items-center gap-1.5">
                <span class="text-[9px] text-gray-400">成功</span>
                <span class="text-[11px] font-bold font-mono ${successColor}">${successCount}/${total}</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="text-[9px] text-gray-400">标题</span>
                <span class="text-[11px] font-bold text-gray-700 font-mono">${
                  validProducts.length
                }</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="text-[9px] text-gray-400">评论</span>
                <span class="text-[11px] font-bold text-gray-700 font-mono">${totalReviews}</span>
            </div>
        </div>
        
        <button onclick="loadHistory(${h.id})" title="加载数据"
            class="w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 text-white hover:bg-indigo-600 shadow-sm hover:shadow hover:scale-105 transition-all z-20">
            <i class="fas fa-arrow-right text-[9px]"></i>
        </button>
    </div>
    
    ${
      isActive
        ? '<div class="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500 rounded-r shadow-[0_0_8px_rgba(99,102,241,0.4)]"></div>'
        : ""
    }
</div>`;
    })
    .join("");
}

function loadHistory(id) {
  // --- 修正点：依赖业务状态而非 UI 状态 ---
  // 假设你在 state 对象中维护了一个 isScraping 标记
  // 只有当任务真正运行时，才拦截用户
  if (state.isScraping) {
    const confirmMsg = "任务正在进行中，加载快照将覆盖当前视图，确定继续？";
    // 如果用户点击取消，则直接返回，不打断当前任务
    if (!confirm(confirmMsg)) return;

    // 可选优化：如果用户强制加载，可能需要手动重置任务状态
    // state.isScraping = false;
  }

  const item = HistoryService.getById(id);

  if (!item) {
    showToast("未找到指定的历史记录", "error");
    return;
  }

  try {
    // --- 状态同步 ---
    state.currentHistoryId = id;
    state.scrapedData = item.data;
    state.analysisReport = item.report;
    state.translatedReport = null;
    state.selectedSite = item.site;

    // --- 表单还原 ---
    const asinInput = document.getElementById("asin-input");
    if (asinInput) {
      asinInput.value = Array.isArray(item.asins) ? item.asins.join("\n") : "";
      asinInput.dispatchEvent(new Event("input"));
    }

    if (typeof selectSite === "function") {
      selectSite(item.site);
    }

    // --- 视图渲染 ---
    const validCount =
      item.data?.products?.filter((p) => p.scrape_status === "success")
        .length || 0;
    const dataCards = document.getElementById("data-cards");
    const noDataMsg = document.getElementById("no-data-msg");

    if (validCount > 0) {
      if (typeof renderDataPanel === "function") renderDataPanel();
      if (typeof updateAsinSelectList === "function") updateAsinSelectList();

      dataCards?.classList.remove("hidden");
      noDataMsg?.classList.add("hidden");
    } else {
      dataCards?.classList.add("hidden");
      noDataMsg?.classList.remove("hidden");
    }

    if (typeof renderHistory === "function") {
      renderHistory();
    }

    // --- 报表渲染 ---
    const reportDisplay = document.getElementById("report-display");
    const noReportMsg = document.getElementById("no-report-msg");

    if (window.renderReport && item.report) {
      window.renderReport();
      reportDisplay?.classList.remove("hidden");
      noReportMsg?.classList.add("hidden");
    } else {
      noReportMsg?.classList.remove("hidden");
      reportDisplay?.classList.add("hidden");
    }

    showToast("历史快照已还原", "success");
  } catch (error) {
    console.error("Load history failed:", error);
    showToast("加载历史记录时发生错误", "error");
  }
}

function clearHistory() {
  if (!confirm("确定清空所有历史记录？")) return;
  HistoryService.clear();
  state.currentHistoryId = null;
  state.scrapedData = null;
  state.analysisReport = null;
  renderHistory();
}
