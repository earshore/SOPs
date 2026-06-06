/**
 * Analysis 子模块
 * 负责关键词分析、统计和 AI 诊断报告功能
 *
 * 架构说明：
 * - 直接 import marked，不依赖 window.marked（生产环境安全）
 * - state 只持久化原始 Markdown 文本，恢复时重新渲染（避免二次 highlightScores）
 * - highlightScores 按内容语义分类行，不再依赖"最后一行=总分"的错误假设
 * - 三阶段加载动画提升体验感
 */

import { marked } from "marked";
import { SafeModuleLoader } from "../../../../../common/infrastructure/SafeModuleLoader";
import { SafeRenderer } from "../../../../../common/infrastructure/SafeRenderer";
import { showToast } from "../../../../../common/ui";
import * as KeywordService from "../services/trackerService";
import { appStore } from "@/stores/useAppStore";
import { ErrorService } from "../../../../../services/errorService";
import { Logger } from "../../../../../services/loggerService";
import "../keyword_hunter_style.css";

// ==========================================
// marked 配置
// ==========================================

marked.use({
  gfm: true, // GitHub Flavored Markdown：支持表格、删除线等
  breaks: false, // LLM 输出使用标准段落，不把单个换行转为 <br>
});

// ==========================================
// Module State
// ==========================================

interface EventListenerRecord {
  element: HTMLElement | Document;
  event: string;
  handler: EventListenerOrEventListenerObject;
}

/** 存放当次分析的原始 Markdown 文本（未渲染 HTML） */
let rawMarkdownCache = "";

let eventListeners: EventListenerRecord[] = [];
let timeouts: number[] = [];

// ==========================================
// Helper Functions
// ==========================================

function addEventListener(
  element: HTMLElement | Document,
  event: string,
  handler: EventListenerOrEventListenerObject,
): void {
  element.addEventListener(event, handler);
  eventListeners.push({ element, event, handler });
}

function addTimeout(callback: () => void, delay: number): number {
  const id = window.setTimeout(callback, delay);
  timeouts.push(id);
  return id;
}

function cleanup(): void {
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  eventListeners = [];

  timeouts.forEach((id) => clearTimeout(id));
  timeouts = [];

}

function escapeHtml(text: string): string {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// Markdown 渲染工具
// ==========================================

/**
 * 将 Markdown 文本解析为 HTML 字符串。
 * marked v5+ 在同步模式下（无 async 扩展）直接返回 string。
 * 若意外返回 Promise 或解析失败，降级为 <pre> 原文展示。
 */
function parseMarkdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return "";
  try {
    const result = marked.parse(markdown);
    if (typeof result === "string" && result.trim()) {
      return result;
    }
    // result 是 Promise（不应发生，但做保护）
    Logger.warn("[Analysis] marked.parse() 返回非字符串，降级展示");
    return `<pre class="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed">${escapeHtml(markdown)}</pre>`;
  } catch (err) {
    Logger.error("[Analysis] Markdown 解析失败:", err);
    return `<pre class="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed">${escapeHtml(markdown)}</pre>`;
  }
}

/**
 * 将原始 Markdown 渲染到指定容器，并运行 highlightScores 增强评分展示。
 * 这是唯一的"写入报告区域"入口，确保流程统一。
 */
function renderReport(container: HTMLElement, markdown: string): void {
  if (!container) return;

  const html = parseMarkdownToHtml(markdown);
  if (!html) {
    Logger.warn("[Analysis] renderReport: 解析结果为空");
    return;
  }

  const renderer = SafeRenderer.getInstance();
  renderer.renderTemplate(container, html);

  // DOM 写入后，下一帧再运行增强逻辑，确保布局已完成
  requestAnimationFrame(() => {
    highlightScores(container);
  });
}

// ==========================================
// State Management
// ==========================================

/**
 * 保存分析状态到 state。
 * ⚠️ 只保存原始 Markdown 文本，不保存渲染后的 HTML，
 * 以避免恢复时 highlightScores 二次处理产生重复徽章。
 */
function saveAnalysisStateToState(): void {
  const currentState = appStore.getState();
  if (!currentState.keywordTracker) {
    currentState.updateKeywordTracker({} as any);
  }

  if (rawMarkdownCache) {
    appStore.getState().updateKeywordTracker({
      llmAnalysisResult: rawMarkdownCache,
    });
    Logger.debug(
      "[Analysis] 已保存原始 Markdown 到 state，长度:",
      rawMarkdownCache.length,
    );
  }
}

/**
 * 从 state 恢复分析状态。
 * 读取原始 Markdown 文本重新渲染，而非直接注入保存的 HTML。
 */
function restoreAnalysisStateFromState(): void {
  const currentState = appStore.getState();
  const savedMarkdown = currentState.keywordTracker?.llmAnalysisResult;

  if (savedMarkdown && savedMarkdown.trim()) {
    // 判断保存的是原始 Markdown 还是旧版本保存的 HTML
    // 简单启发式：以 '<' 开头的大概率是 HTML（旧版本兼容）
    const isLikelyHtml = savedMarkdown.trimStart().startsWith("<");

    const resultDiv = document.getElementById("kt-llm-analysis-result");
    if (!resultDiv) {
      renderAnalysisModule();
      return;
    }

    if (isLikelyHtml) {
      // 旧版本兼容：直接注入 HTML，但不运行 highlightScores（已处理过）
      Logger.debug("[Analysis] 检测到旧版 HTML 格式，直接注入");
      const renderer = SafeRenderer.getInstance();
      renderer.renderTemplate(resultDiv, savedMarkdown);
    } else {
      // 新版本：原始 Markdown，重新完整渲染
      rawMarkdownCache = savedMarkdown;
      renderReport(resultDiv, savedMarkdown);
    }
  }

  renderAnalysisModule();
}

// ==========================================
// UI Rendering Functions
// ==========================================

function renderAnalysisModule(): void {
  updateAnalyzeButtonState();
}

/**
 * 更新"生成报告"按钮的激活/禁用状态
 */
function updateAnalyzeButtonState(): void {
  const btn = document.getElementById(
    "kt-analyze-btn",
  ) as HTMLButtonElement | null;
  const hasContent =
    appStore.getState().keywordTracker?.processedCopy?.trim().length > 0;

  if (!btn) return;

  if (hasContent) {
    btn.disabled = false;
    btn.classList.remove(
      "bg-slate-100",
      "text-slate-400",
      "border-slate-200",
      "cursor-not-allowed",
    );
    btn.classList.add(
      "bg-gradient-to-r",
      "from-purple-600",
      "via-purple-500",
      "to-pink-600",
      "hover:from-purple-500",
      "hover:via-purple-400",
      "hover:to-pink-500",
      "text-white",
      "border-purple-500",
      "shadow-md",
      "shadow-purple-500/20",
      "hover:shadow-lg",
      "hover:shadow-purple-500/30",
      "cursor-pointer",
      "hover:scale-[1.02]",
      "hover:-translate-y-0.5",
    );
  } else {
    btn.disabled = true;
    btn.classList.remove(
      "bg-gradient-to-r",
      "from-purple-600",
      "via-purple-500",
      "to-pink-600",
      "hover:from-purple-500",
      "hover:via-purple-400",
      "hover:to-pink-500",
      "text-white",
      "border-purple-500",
      "shadow-md",
      "shadow-purple-500/20",
      "hover:shadow-lg",
      "hover:shadow-purple-500/30",
      "cursor-pointer",
      "hover:scale-[1.02]",
      "hover:-translate-y-0.5",
    );
    btn.classList.add(
      "bg-slate-100",
      "text-slate-400",
      "border-slate-200",
      "cursor-not-allowed",
    );
  }
}

// ==========================================
// Loading State
// ==========================================

/**
 * 在结果区显示三阶段动态加载动画
 */
function showLoadingState(container: HTMLElement): () => void {
  const phases = [
    {
      icon: "fa-database",
      text: "正在读取文案与关键词数据…",
      color: "text-slate-500",
    },
    {
      icon: "fa-brain",
      text: "AI 正在深度分析 Listing…",
      color: "text-purple-600",
    },
    {
      icon: "fa-file-medical",
      text: "正在生成评审报告…",
      color: "text-pink-600",
    },
  ] as const;

  let phaseIndex = 0;

  const buildHtml = (phase: (typeof phases)[number]) => `
        <div class="flex flex-col items-center justify-center py-16 text-center" id="kt-loading-state">
            <div class="relative mb-6">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50
                            flex items-center justify-center border border-purple-100 shadow-inner">
                    <i class="fas ${phase.icon} text-2xl text-purple-300 animate-pulse"></i>
                </div>
                <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white border border-slate-100
                            flex items-center justify-center shadow-sm">
                    <i class="fas fa-spinner fa-spin text-purple-400 text-xs"></i>
                </div>
            </div>
            <p class="font-semibold ${phase.color} text-sm mb-1">${phase.text}</p>
            <p class="text-xs text-slate-400">这可能需要 10 ~ 30 秒，请耐心等待</p>
            <div class="mt-4 flex gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce" style="animation-delay: 0s"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce" style="animation-delay: 0.15s"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-purple-300 animate-bounce" style="animation-delay: 0.3s"></span>
            </div>
        </div>
    `;

  const renderer = SafeRenderer.getInstance();
  renderer.renderTemplate(container, buildHtml(phases[0]!));

  // 阶段切换计时器
  const advancePhase = () => {
    phaseIndex = Math.min(phaseIndex + 1, phases.length - 1);
    const loadingEl = document.getElementById("kt-loading-state");
    if (loadingEl) {
      const newContent = document.createElement("div");
      newContent.innerHTML = buildHtml(phases[phaseIndex]!);
      loadingEl.replaceWith(newContent.firstElementChild!);
    }
  };

  const t1 = addTimeout(advancePhase, 3500);
  const t2 = addTimeout(advancePhase, 10000);

  // 返回清理函数（调用方在完成/出错时调用）
  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
  };
}

// ==========================================
// Button State Helpers
// ==========================================

const BTN_CLASSES = {
  active: [
    "bg-gradient-to-r",
    "from-purple-600",
    "via-purple-500",
    "to-pink-600",
    "hover:from-purple-500",
    "hover:via-purple-400",
    "hover:to-pink-500",
    "text-white",
    "border-purple-500",
    "shadow-md",
    "shadow-purple-500/20",
    "hover:shadow-lg",
    "hover:shadow-purple-500/30",
    "cursor-pointer",
    "hover:scale-[1.02]",
    "hover:-translate-y-0.5",
  ],
  disabled: [
    "bg-slate-100",
    "text-slate-400",
    "border-slate-200",
    "cursor-not-allowed",
  ],
  loading: [
    "bg-slate-300",
    "text-slate-500",
    "border-slate-300",
    "cursor-wait",
  ],
  success: [
    "bg-emerald-500",
    "text-white",
    "border-emerald-500",
    "cursor-not-allowed",
  ],
} as const;

function setBtnState(
  btn: HTMLButtonElement,
  state: "active" | "disabled" | "loading" | "success",
  labelText?: string,
): void {
  // 先移除所有状态类
  const allClasses = [
    ...BTN_CLASSES.active,
    ...BTN_CLASSES.disabled,
    ...BTN_CLASSES.loading,
    ...BTN_CLASSES.success,
  ];
  btn.classList.remove(...allClasses);
  btn.disabled = state !== "active";
  btn.classList.add(...BTN_CLASSES[state]);

  const textEl = document.getElementById("kt-analyze-btn-text");
  if (textEl && labelText !== undefined) {
    textEl.textContent = labelText;
  }
}

// ==========================================
// Score Table Highlighting
// ==========================================

/**
 * 增强评分表格和总分标题的视觉呈现。
 *
 * 行分类规则（按内容语义，不依赖行位置）：
 *  1. 包含 -10 / 🚨 → 违规触发行（红色）
 *  2. 包含 +0 / ✅ / 通过，或以 "0" 结尾 → 违规通过行（绿色）
 *  3. 包含 N/M 数字比 → 按得分率显示彩色徽章
 */
function highlightScores(container: HTMLElement): void {
  if (!container) return;

  // ——— 1. 处理评分表格 ———
  const rows = container.querySelectorAll("tbody tr");
  rows.forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 2) return;

    const td2 = tds[1] as HTMLElement; // 分数列
    const rawText = td2.textContent?.trim() ?? "";

    // 清除旧状态类，防止重复调用时污染
    tr.classList.remove("row-total", "row-low", "row-risk");

    // —— 违规触发（-10 / 🚨） ——
    if (rawText.includes("-10") || rawText.includes("🚨")) {
      tr.classList.add("row-risk");
      td2.innerHTML = "";
      const span = document.createElement("span");
      span.className = "score-badge score-badge-low";
      span.textContent = "🚨 -10";
      td2.appendChild(span);
      return;
    }

    // —— 违规通过（+0 / ✅ / 通过 / 0） ——
    if (
      rawText.includes("+0") ||
      rawText.includes("✅") ||
      rawText.includes("通过") ||
      rawText === "0"
    ) {
      td2.innerHTML = "";
      const span = document.createElement("span");
      span.className = "score-badge score-badge-high";
      span.textContent = "✅ +0";
      td2.appendChild(span);
      return;
    }

    // —— 数字分数 N/M ——
    const match = rawText.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) return;

    const score = parseInt(match[1]!, 10);
    const max = parseInt(match[2]!, 10);
    if (max === 0) return;

    const ratio = score / max;
    let badgeClass: string;
    let icon: string;

    if (ratio >= 0.75) {
      badgeClass = "score-badge-high";
      icon = "🟢";
    } else if (ratio >= 0.5) {
      badgeClass = "score-badge-mid";
      icon = "🟡";
    } else {
      badgeClass = "score-badge-low";
      icon = "🔴";
      tr.classList.add("row-low");
    }

    td2.innerHTML = "";
    const span = document.createElement("span");
    span.className = `score-badge ${badgeClass}`;
    span.textContent = `${icon} ${score}/${max}`;
    td2.appendChild(span);
  });

  // ——— 2. 处理总分 H2 标题 ———
  const h2 = container.querySelector("h2");
  if (!h2) return;

  const h2Text = h2.textContent ?? "";
  const totalMatch = h2Text.match(/(\d+)\s*\/\s*100/);
  if (!totalMatch) return;

  const total = parseInt(totalMatch[1]!, 10);

  // 按分段选色
  let gradient: string;
  if (total >= 85) {
    gradient = "linear-gradient(135deg, #065f46, #059669, #34d399)";
  } else if (total >= 75) {
    gradient = "linear-gradient(135deg, #1e1b4b, #4c1d95, #7c3aed)";
  } else if (total >= 70) {
    gradient = "linear-gradient(135deg, #78350f, #d97706, #fbbf24)";
  } else {
    gradient = "linear-gradient(135deg, #7f1d1d, #dc2626, #f87171)";
  }

  h2.style.background = gradient;
  h2.style.color = "#ffffff";

  // 移除旧进度条（防止重复追加）
  h2.querySelector(".score-progress-bar")?.remove();

  const bar = document.createElement("div");
  bar.className = "score-progress-bar";
  bar.style.cssText =
    "margin-top:0.75rem;background:rgba(255,255,255,0.15);" +
    "border-radius:1rem;height:6px;overflow:hidden;width:100%;";

  const fill = document.createElement("div");
  fill.style.cssText =
    "width:0%;height:100%;background:rgba(255,255,255,0.7);" +
    "border-radius:1rem;transition:width 1s ease-out;";

  bar.appendChild(fill);
  h2.appendChild(bar);

  // 双帧延迟触发 CSS transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.width = `${total}%`;
    });
  });
}

// ==========================================
// Action Functions
// ==========================================

/**
 * 运行 LLM 分析
 */
async function runLLMAnalysis(): Promise<void> {
  const btn = document.getElementById(
    "kt-analyze-btn",
  ) as HTMLButtonElement | null;
  const resultDiv = document.getElementById("kt-llm-analysis-result");

  // 内容为空时快速失败
  const processedCopy = appStore.getState().keywordTracker?.processedCopy ?? "";
  if (!processedCopy.trim()) {
    showToast("文案内容为空，无法进行 AI 分析", { type: "warning" });
    return;
  }

  // ——— 进入加载状态 ———
  if (btn) setBtnState(btn, "loading", "分析中…");

  let cancelLoading: (() => void) | null = null;
  if (resultDiv) {
    cancelLoading = showLoadingState(resultDiv);
  }

  try {
    const response = await KeywordService.fetchListingAnalysis(
      processedCopy,
      appStore.getState().keywordTracker?.keywords ?? [],
      appStore.getState().keywordTracker?.matchedKeywords ?? [],
      appStore.getState().keywordTracker?.unmatchedKeywords ?? [],
    );

    // 停止加载动画
    cancelLoading?.();
    cancelLoading = null;

    if (!response || !response.trim()) {
      throw new Error("AI 返回内容为空，请重试");
    }

    // 缓存原始 Markdown
    rawMarkdownCache = response;

    // 渲染到报告区域
    if (resultDiv) {
      renderReport(resultDiv, response);
    }

    // 更新按钮为"已完成"
    if (btn) setBtnState(btn, "success", "报告已生成");

    // 保存原始 Markdown 到 state
    saveAnalysisStateToState();

    showToast("报告生成成功 ✨", { type: "success" });
  } catch (e) {
    // 停止加载动画（异常路径）
    cancelLoading?.();
    cancelLoading = null;

    const error = e as Error;
    const isValidation =
      error.message.includes("输入内容过短") ||
      error.message.includes("文案内容为空");

    if (!isValidation) {
      ErrorService.handle(error, {
        action: "runLLMAnalysis",
        module: "keywordTracker",
        notify: false,
      });
    }

    // 友好化错误信息
    let userMsg = error.message;
    if (userMsg.includes("503")) {
      userMsg = "服务暂时不可用 (503)，可能是模型过载，请稍后重试。";
    } else if (userMsg.includes("429")) {
      userMsg = "请求频率超限 (429)，请稍等片刻后重试。";
    } else if (userMsg.includes("timeout") || userMsg.includes("Timeout")) {
      userMsg = "请求超时，请检查网络后重试。";
    }

    // 渲染错误卡片
    if (resultDiv) {
      const colorScheme = isValidation ? "yellow" : "red";
      const icon = isValidation
        ? "fa-exclamation-circle"
        : "fa-exclamation-triangle";
      const title = isValidation ? "无法进行分析" : "分析失败";

      const errorDiv = document.createElement("div");
      errorDiv.className = `p-5 bg-${colorScheme}-50 border border-${colorScheme}-200 rounded-xl`;

      const headerDiv = document.createElement("div");
      headerDiv.className = `flex items-center gap-2 text-${colorScheme}-700 font-bold mb-2`;
      const iconEl = document.createElement("i");
      iconEl.className = `fas ${icon}`;
      headerDiv.appendChild(iconEl);
      headerDiv.appendChild(document.createTextNode(` ${title}`));

      const msgP = document.createElement("p");
      msgP.className = `text-sm text-${colorScheme}-800 mb-3 leading-relaxed`;
      msgP.textContent = userMsg;

      const retryBtn = document.createElement("button");
      retryBtn.className =
        `inline-flex items-center gap-1.5 px-3 py-1.5 ` +
        `bg-white border border-${colorScheme}-200 text-${colorScheme}-700 ` +
        `text-xs rounded-lg hover:bg-${colorScheme}-50 transition-colors font-medium`;
      retryBtn.innerHTML = '<i class="fas fa-redo text-[10px]"></i> 重试';
      addEventListener(retryBtn, "click", () => {
        void runLLMAnalysis();
      });

      errorDiv.appendChild(headerDiv);
      errorDiv.appendChild(msgP);
      errorDiv.appendChild(retryBtn);

      resultDiv.innerHTML = "";
      resultDiv.appendChild(errorDiv);
    }

    // 恢复按钮为可点击
    if (btn) setBtnState(btn, "active", "生成报告");
  }
}

// ==========================================
// Event Listeners Setup
// ==========================================

function setupEventListeners(container: HTMLElement): void {
  if (!container) return;

  const btnAnalyze = document.getElementById("kt-analyze-btn");
  if (btnAnalyze) {
    addEventListener(
      btnAnalyze as HTMLElement,
      "click",
      (async () =>
        await runLLMAnalysis()) as EventListenerOrEventListenerObject,
    );
  }
}

// ==========================================
// Module Exports (统一架构接口)
// ==========================================

/**
 * 挂载子模块
 */
export async function mount(container: HTMLElement): Promise<void> {
  Logger.debug("[Analysis] 🔧 开始挂载子模块");

  try {
    const loader = SafeModuleLoader.getInstance();
    const renderer = SafeRenderer.getInstance();

    const html = await loader.loadTemplate(
      "src/modules/app_center/views/keyword_hunter/analysis/template.html",
      {
        retryCount: 3,
        timeout: 5000,
        onError: (error) => {
          Logger.error("[Analysis] 模板加载失败:", error);
        },
      },
    );

    container.classList.add("fade-in");
    renderer.renderTemplate(container, html);

    setupEventListeners(container);
    restoreAnalysisStateFromState();

    Logger.debug("[Analysis] ✅ 子模块挂载成功");
  } catch (error) {
    Logger.error("[Analysis] ❌ 子模块挂载失败:", error);
    throw error;
  }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
  Logger.debug("[Analysis] 🔄 开始卸载子模块");

  try {
    saveAnalysisStateToState();
    cleanup();
    Logger.debug("[Analysis] ✅ 子模块卸载成功");
  } catch (error) {
    Logger.error("[Analysis] ❌ 子模块卸载失败:", error);
  }
}
