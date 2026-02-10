/**
 * PromptBuilder - Prompt 构建与预览管理
 * 
 * 职责：
 * - 动态构建分析 Prompt
 * - 实时预览 Prompt 内容
 * - 复制 Prompt 到剪贴板
 */

import { ANALYSIS_MODULES, DYNAMIC_MASTER_TEMPLATE } from '../constants/prompts.ts';
import { showToast } from '../../../../../common/ui';
import state from '../../../../../common/state';

export class PromptBuilder {
  constructor(moduleInstance) {
    this.module = moduleInstance;
  }

  /**
   * 构建动态 Prompt
   * @returns {string|null} 生成的 Prompt 文本，如果没有选中模块则返回 null
   */
  buildDynamicPrompt() {
    if (!state.analysis.selectedModules || state.analysis.selectedModules.length === 0) {
      return null;
    }

    const selectedModules = state.analysis.selectedModules
      .map((id) => ANALYSIS_MODULES.find((m) => m.id === id))
      .filter(Boolean);

    const tasksStr = selectedModules
      .map((m, index) => `${index + 1}. ${m.label_en}: ${m.extraction_instruction}`)
      .join("\n");

    const schemaParts = selectedModules
      .map((m) => `  "${m.id}": ["..."]`)
      .join(",\n");

    return DYNAMIC_MASTER_TEMPLATE.replace("{{dynamic_tasks}}", tasksStr).replace("{{dynamic_schema}}", schemaParts);
  }

  /**
   * 更新 Prompt 预览区域
   */
  updatePromptPreview() {
    const prompt = this.buildDynamicPrompt();
    const container = document.getElementById("prompt-preview-container");
    const codeBlock = document.getElementById("live-prompt-code");
    const countLabel = document.getElementById("prompt-token-count");

    if (!container || !codeBlock) return;

    if (!prompt) {
      container.classList.add("hidden");
    } else {
      container.classList.remove("hidden");
      codeBlock.textContent = prompt;
      const estTokens = Math.ceil(prompt.length / 4);
      if (countLabel) countLabel.textContent = `~${estTokens} Tokens`;
    }
  }

  /**
   * 复制 Prompt 文本到剪贴板
   */
  copyPromptText() {
    const text = document.getElementById("live-prompt-code")?.textContent;
    if (text) {
      navigator.clipboard.writeText(text);
      showToast("Prompt 已复制", "success");
    }
  }

  /**
   * 渲染 Prompt 预览区域 HTML
   */
  renderPromptPreviewArea() {
    const reportContent = document.getElementById("report-content");
    if (!reportContent || document.getElementById("prompt-preview-container")) return;

    const previewDiv = document.createElement("div");
    previewDiv.id = "prompt-preview-container";
    previewDiv.className = "mb-6 hidden fade-in";

    // ✅ 安全: 静态HTML模板，无用户输入
    previewDiv.innerHTML = `
      <details class="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden open:ring-2 open:ring-blue-100 transition-all">
        <summary class="flex items-center justify-between p-4 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors list-none select-none">
          <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
              <i class="fas fa-terminal"></i>
            </span>
            <span>Prompt 实时预览</span>
            <span id="prompt-token-count" class="text-xs font-normal text-slate-400 font-mono ml-2"></span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-400 group-open:hidden">点击展开查看策略</span>
            <i class="fas fa-chevron-down text-slate-400 transition-transform group-open:rotate-180 text-xs"></i>
          </div>
        </summary>
        <div class="border-t border-slate-100 bg-slate-900">
          <div class="relative">
            <pre id="live-prompt-code" class="p-4 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap max-h-[300px] custom-scrollbar leading-relaxed"></pre>
            <button data-action="copyPromptText" class="absolute top-2 right-2 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-1.5 rounded transition-colors" title="复制 Prompt">
              <i class="fas fa-copy text-xs"></i>
            </button>
          </div>
        </div>
      </details>
    `;

    reportContent.insertBefore(previewDiv, reportContent.firstChild);
  }
}