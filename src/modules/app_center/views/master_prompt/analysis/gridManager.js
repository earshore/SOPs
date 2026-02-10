/**
 * GridManager - GridStack 布局管理器
 * 
 * 职责：
 * - 初始化和管理 GridStack 实例
 * - 处理卡片布局的保存和恢复
 * - 管理卡片的调整大小功能
 * - 计算卡片的自适应高度
 */

import { loadGridStack } from '../../../../../common/utils/lazyLibs';
import { StorageService } from '../../../../../services/storageService.ts';
import { ANALYSIS_MODULES } from '../constants/prompts.ts';
import state from '../../../../../common/state';
import { renderViewModeHTML } from './renderer.js';

export class GridManager {
  constructor(moduleInstance) {
    this.module = moduleInstance;
    this.grid = null;
  }

  /**
   * 初始化 GridStack 布局
   * @param {Object} report - 分析报告数据
   */
  async initGridStack(report) {
    const gridEl = document.querySelector(".grid-stack");
    if (!gridEl) return;

    await loadGridStack();

    if (this.grid) this.grid.destroy(false);

    this.grid = GridStack.init(
      {
        column: 12,
        cellHeight: 60,
        margin: 15,
        animate: true,
        float: false,
        disableOneColumnMode: false,
        staticGrid: false,
        handle: ".drag-handle",
        resizable: { 
          handles: "se",
          autoHide: false
        },
      },
      gridEl
    );

    const templateId = report.meta?.templateId || "default";
    const savedLayout = StorageService.getLayoutConfig(templateId);

    const widgets = [];
    const keys = Object.keys(report).filter((k) => k !== "meta");

    keys.forEach((key) => {
      let content = report[key];
      if (state.analysis.showTranslation && state.analysis.translatedReport && state.analysis.translatedReport[key]) {
        content = state.analysis.translatedReport[key];
      }
      const autoH = this.calculateWidgetHeight(content);

      let defaultW = 4;
      if (autoH > 6) defaultW = 6;
      if (autoH > 10) defaultW = 12;

      const savedNode = savedLayout.find((n) => n.id === key);

      widgets.push({
        id: key,
        x: savedNode ? savedNode.x : undefined,
        y: savedNode ? savedNode.y : undefined,
        w: savedNode ? savedNode.w : defaultW,
        h: savedNode ? savedNode.h : autoH,
        noMove: true,    // 默认不可移动
        noResize: true,  // 默认不可调整
        content: this.module.renderWidgetContent(key, report, state.analysis.translatedReport),
      });
    });

    this.grid.batchUpdate();
    this.grid.removeAll();
    widgets.forEach((w) => {
      const widgetConfig = {
        x: w.x, y: w.y, w: w.w, h: w.h, id: w.id, noMove: w.noMove, noResize: w.noResize
      };
      const el = this.grid.addWidget(widgetConfig);

      const contentEl = el.querySelector('.grid-stack-item-content');
      if (contentEl) {
        // ✅ 安全: 静态HTML模板，无用户输入
        contentEl.innerHTML = w.content;
      }
    });
    this.grid.batchUpdate(false);

    this.grid.on("change", () => this.saveGridLayout(templateId));
    
    // 注册全局点击事件处理
    this.module.addEventListener(document, "mousedown", (e) => this.module.handleGlobalClick(e));
  }

  /**
   * 保存 GridStack 布局配置
   * @param {string} templateId - 模板 ID
   */
  saveGridLayout(templateId) {
    if (!this.grid) return;
    const layout = this.grid.save(false);
    const cleanLayout = layout.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h,
    }));
    StorageService.setLayoutConfig(templateId, cleanLayout);
  }

  /**
   * 切换卡片的调整大小模式
   * @param {string} key - 卡片 Key
   * @param {boolean} forceState - 强制设置状态
   */
  toggleCardResize(key, forceState) {
    const el = document.querySelector(`.grid-stack-item[gs-id="${key}"]`);
    const card = document.getElementById(`widget-card-${key}`);
    if (!el || !card) return;

    const isResizing = forceState !== undefined ? forceState : !el.classList.contains("is-resizing");

    if (isResizing) {
      // 先退出其他正在调整的卡片
      const otherResizingCards = document.querySelectorAll('.grid-stack-item.is-resizing');
      otherResizingCards.forEach(otherEl => {
        const otherKey = otherEl.getAttribute('gs-id');
        if (otherKey && otherKey !== key) {
          this.toggleCardResize(otherKey, false);
        }
      });

      // 进入调整模式
      el.classList.add("is-resizing");
      el.classList.add('grid-stack-item-resizing');
      
      // 启用当前卡片的移动和调整
      if (this.grid) {
        this.grid.update(el, { noMove: false, noResize: false });
        
        // 确保其他卡片保持禁用
        this.grid.engine.nodes.forEach(node => {
          if (node.el !== el) {
            this.grid.update(node.el, { noMove: true, noResize: true });
          }
        });
      }
      
      // 视觉反馈
      card.style.boxShadow = '0 0 0 2px #3b82f6';
      
      // 更新按钮状态
      const resizeBtn = card.querySelector('.btn-resize');
      if (resizeBtn) {
        // ✅ 安全: 静态HTML模板，无用户输入
        resizeBtn.innerHTML = '<i class="fas fa-check text-xs"></i>';
        resizeBtn.classList.add('text-blue-600', 'bg-blue-50');
        resizeBtn.title = '完成调整';
      }
    } else {
      // 退出调整模式
      el.classList.remove("is-resizing");
      el.classList.remove('grid-stack-item-resizing');
      
      // 禁用当前卡片的移动和调整
      if (this.grid) {
        this.grid.update(el, { noMove: true, noResize: true });
      }
      
      // 移除视觉反馈
      card.style.boxShadow = '';
      
      // 恢复按钮状态
      const resizeBtn = card.querySelector('.btn-resize');
      if (resizeBtn) {
        // ✅ 安全: 静态HTML模板，无用户输入
        resizeBtn.innerHTML = '<i class="fas fa-expand-alt text-xs"></i>';
        resizeBtn.classList.remove('text-blue-600', 'bg-blue-50');
        resizeBtn.title = '调整';
      }
      
      // 保存布局
      const templateId = state.analysis.analysisReport?.meta?.templateId || "default";
      this.saveGridLayout(templateId);
    }
  }

  /**
   * 计算 Widget 的自适应高度
   * @param {*} content - Widget 内容
   * @returns {number} 计算出的高度（GridStack 单位）
   */
  calculateWidgetHeight(content) {
    if (!content) return 4;
    let textLength = 0;
    let lineCount = 0;

    if (typeof content === "string") {
      textLength = content.length;
      lineCount = content.split("\n").length;
    } else if (Array.isArray(content)) {
      const str = JSON.stringify(content);
      textLength = str.length;
      lineCount = Array.isArray(content) ? content.length * 1.5 : 5;
    } else if (typeof content === "object") {
      const str = JSON.stringify(content);
      textLength = str.length;
      lineCount = Object.keys(content).length * 2;
    }

    const heightByChar = Math.ceil(textLength / 150);
    const heightByLine = Math.ceil(lineCount / 3);
    let h = Math.max(3, heightByChar, heightByLine);
    return Math.min(h + 2, 24);
  }

  /**
   * 销毁 GridStack 实例
   */
  destroy() {
    if (this.grid) {
      this.grid.destroy(false);
      this.grid = null;
    }
  }
}