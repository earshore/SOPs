/**
 * EditManager - 编辑功能管理器
 * 
 * 职责：
 * - 管理卡片内容的编辑状态
 * - 处理编辑数据的收集和保存
 * - 管理编辑历史和撤销功能
 * - 处理列表和对象的增删操作
 */

import { escapeHtml } from '@/common/utils/security';
import { ANALYSIS_MODULES } from '../constants/prompts.ts';
import { renderViewModeHTML, renderEditorForm, getFieldTitle } from './renderer.js';
import { showToast } from '../../../../../common/ui';
import state from '../../../../../common/state';

export class EditManager {
  constructor(moduleInstance) {
    this.module = moduleInstance;
    this.originalDataMap = new Map();
    this.editHistoryMap = new Map();
  }

  /**
   * 开始编辑指定卡片
   * @param {string} key - 卡片 Key
   */
  startLocalEdit(key) {
    // 先保存其他正在编辑的卡片
    const editingCards = document.querySelectorAll('.widget-card-container .edit-controls:not(.hidden)');
    editingCards.forEach(editControls => {
      const card = editControls.closest('.widget-card-container');
      if (card) {
        const cardId = card.id.replace('widget-card-', '');
        if (cardId && cardId !== key) {
          this.saveLocalEdit(cardId);
        }
      }
    });

    const card = document.getElementById(`widget-card-${key}`);
    if (!card) return;

    const contentArea = document.getElementById(`widget-content-${key}`);
    const viewControls = card.querySelector('.view-controls');
    const editControls = card.querySelector('.edit-controls');

    if (!contentArea || !viewControls || !editControls) return;

    // 保存原始数据
    const report = state.analysis.showTranslation && state.analysis.translatedReport 
      ? state.analysis.translatedReport 
      : state.analysis.analysisReport;
    
    if (!this.originalDataMap.has(key)) {
      this.originalDataMap.set(key, JSON.parse(JSON.stringify(report[key])));
    }

    // 初始化编辑历史
    if (!this.editHistoryMap.has(key)) {
      this.editHistoryMap.set(key, []);
    }

    // 切换到编辑模式
    viewControls.classList.add('hidden');
    editControls.classList.remove('hidden');

    // 渲染编辑表单
    // ✅ 安全: 静态HTML模板，无用户输入
    contentArea.innerHTML = renderEditorForm(key, report[key]);
  }

  /**
   * 保存编辑内容
   * @param {string} key - 卡片 Key
   */
  saveLocalEdit(key) {
    const card = document.getElementById(`widget-card-${key}`);
    if (!card) return;

    const contentArea = document.getElementById(`widget-content-${key}`);
    const viewControls = card.querySelector('.view-controls');
    const editControls = card.querySelector('.edit-controls');

    // 收集编辑后的数据
    const newData = this.collectEditedData(key);
    
    // 更新状态
    const report = state.analysis.showTranslation && state.analysis.translatedReport 
      ? state.analysis.translatedReport 
      : state.analysis.analysisReport;
    
    report[key] = newData;

    // 清除原始数据缓存
    this.originalDataMap.delete(key);
    this.editHistoryMap.delete(key);

    // 切换回查看模式
    editControls.classList.add('hidden');
    viewControls.classList.remove('hidden');

    // 重新渲染
    const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
    let style = { color: "slate", bg: "bg-slate-500", lightBg: "bg-slate-100", icon: "fa-info-circle" };
    if (moduleConfig) {
      if (moduleConfig.category === "listing")
        style = { color: "blue", bg: "bg-blue-600", lightBg: "bg-blue-50", icon: "fa-file-alt" };
      else if (moduleConfig.category === "reviews")
        style = { color: "orange", bg: "bg-orange-500", lightBg: "bg-orange-50", icon: "fa-comments" };
      else if (moduleConfig.category === "cross")
        style = { color: "purple", bg: "bg-purple-600", lightBg: "bg-purple-50", icon: "fa-random" };
    }

    // ✅ 安全: 静态HTML模板，无用户输入
    contentArea.innerHTML = renderViewModeHTML(newData, style);
    showToast("保存成功", "success");
  }

  /**
   * 撤销编辑
   * @param {string} key - 卡片 Key
   */
  undoLocalEdit(key) {
    const originalData = this.originalDataMap.get(key);
    if (!originalData) return;

    const report = state.analysis.showTranslation && state.analysis.translatedReport 
      ? state.analysis.translatedReport 
      : state.analysis.analysisReport;
    
    report[key] = JSON.parse(JSON.stringify(originalData));

    // 清除缓存
    this.originalDataMap.delete(key);
    this.editHistoryMap.delete(key);

    // 退出编辑模式
    const card = document.getElementById(`widget-card-${key}`);
    if (card) {
      const viewControls = card.querySelector('.view-controls');
      const editControls = card.querySelector('.edit-controls');
      const contentArea = document.getElementById(`widget-content-${key}`);

      editControls.classList.add('hidden');
      viewControls.classList.remove('hidden');

      const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
      let style = { color: "slate", bg: "bg-slate-500", lightBg: "bg-slate-100", icon: "fa-info-circle" };
      if (moduleConfig) {
        if (moduleConfig.category === "listing")
          style = { color: "blue", bg: "bg-blue-600", lightBg: "bg-blue-50", icon: "fa-file-alt" };
        else if (moduleConfig.category === "reviews")
          style = { color: "orange", bg: "bg-orange-500", lightBg: "bg-orange-50", icon: "fa-comments" };
        else if (moduleConfig.category === "cross")
          style = { color: "purple", bg: "bg-purple-600", lightBg: "bg-purple-50", icon: "fa-random" };
      }

      // ✅ 安全: 静态HTML模板，无用户输入
      contentArea.innerHTML = renderViewModeHTML(originalData, style);
    }

    showToast("已撤销", "info");
  }

  /**
   * 保存编辑快照（用于撤销功能）
   * @param {string} key - 卡片 Key
   */
  pushEditSnapshot(key) {
    const history = this.editHistoryMap.get(key) || [];
    const currentData = this.collectEditedData(key);
    history.push(JSON.parse(JSON.stringify(currentData)));
    this.editHistoryMap.set(key, history);
  }

  /**
   * 收集编辑后的数据
   * @param {string} key - 卡片 Key
   * @returns {*} 收集到的数据
   */
  collectEditedData(key) {
    const contentArea = document.getElementById(`widget-content-${key}`);
    if (!contentArea) return null;

    // 检查是否是简单文本编辑
    const simpleInput = contentArea.querySelector(`#input-${key}`);
    if (simpleInput) {
      return simpleInput.value;
    }

    // 检查是否是列表编辑
    const listContainer = contentArea.querySelector(`#list-container-${key}`);
    if (listContainer) {
      const items = [];
      listContainer.querySelectorAll('.edit-row textarea').forEach(textarea => {
        const val = textarea.value.trim();
        if (val) items.push(val);
      });
      return items;
    }

    // 检查是否是 category-items 结构编辑
    const categoryContainer = contentArea.querySelector(`#category-items-container-${key}`);
    if (categoryContainer) {
      const categories = [];
      categoryContainer.querySelectorAll('.edit-section').forEach(section => {
        const categoryInput = section.querySelector('textarea[data-field="category"]');
        const category = categoryInput ? categoryInput.value.trim() : '';
        
        const items = [];
        section.querySelectorAll('.item-input').forEach(input => {
          const val = input.value.trim();
          if (val) items.push(val);
        });
        
        if (category || items.length > 0) {
          categories.push({ category, items });
        }
      });
      return categories;
    }

    // 检查是否是对象数组编辑
    const objContainer = contentArea.querySelector(`#obj-list-container-${key}`);
    if (objContainer) {
      const objects = [];
      objContainer.querySelectorAll('.edit-row').forEach(row => {
        const obj = {};
        row.querySelectorAll('.obj-input').forEach(input => {
          const subKey = input.dataset.subkey;
          obj[subKey] = input.value;
        });
        objects.push(obj);
      });
      return objects;
    }

    return null;
  }

  /**
   * 删除行项目
   * @param {HTMLElement} btn - 删除按钮元素
   * @param {string} key - 卡片 Key
   */
  deleteRowItem(btn, key) {
    const row = btn.closest('.edit-row');
    if (row) {
      row.remove();
    }
  }

  /**
   * 添加列表项
   * @param {string} key - 卡片 Key
   */
  addListItem(key) {
    const container = document.getElementById(`list-container-${key}`);
    if (!container) return;

    const newRow = document.createElement('div');
    newRow.className = 'edit-row group flex items-start gap-2 relative';
    newRow.innerHTML = `
      <div class="pt-2.5 pl-1"> 
        <div class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>
      </div>
      <div class="flex-1 relative">
        <textarea class="editor-input-modern" rows="1" style="height: 28px" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="window.pushEditSnapshot('${escapeHtml(key)}'); this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
      </div>
      <div class="pt-1">
        <button onclick="window.deleteRowItem(this, '${escapeHtml(key)}')" class="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100" title="删除此项">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
    `;
    container.appendChild(newRow);
  }

  /**
   * 添加对象项
   * @param {string} key - 卡片 Key
   */
  addObjItem(key) {
    const container = document.getElementById(`obj-list-container-${key}`);
    const template = document.getElementById(`tpl-${key}`);
    if (!container || !template) return;

    const templateObj = JSON.parse(template.textContent);
    const newRow = document.createElement('div');
    newRow.className = 'edit-row group relative bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all';
    
    const fields = Object.keys(templateObj).map(subKey => `
      <div class="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2 sm:gap-4 items-start group/field">
        <label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sm:text-right select-none pt-2 cursor-default group-hover/field:text-blue-500 transition-colors">
          ${getFieldTitle(subKey)}
        </label>
        <div class="relative w-full">
          <textarea data-subkey="${subKey}" class="editor-input-modern obj-input" rows="1" style="height: 28px" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="window.pushEditSnapshot('${key}'); this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
        </div>
      </div>
    `).join('');

    newRow.innerHTML = `
      <button onclick="window.deleteRowItem(this, '${escapeHtml(key)}')" class="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 absolute top-3 right-3 bg-white shadow-sm border border-slate-200 z-10 hover:border-red-200" title="删除此项">
        <i class="fas fa-trash-alt text-[10px]"></i>
      </button>
      <div class="grid gap-y-3 gap-x-4">
        ${fields}
      </div>
    `;
    
    container.appendChild(newRow);
  }

  /**
   * 添加分类区块 (category-items 结构)
   * @param {string} key - 卡片 Key
   */
  addCategorySection(key) {
    const container = document.getElementById(`category-items-container-${key}`);
    const template = document.getElementById(`tpl-${key}`);
    if (!container || !template) return;

    const newSection = document.createElement('div');
    newSection.className = 'edit-section group/section relative bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all';
    
    newSection.innerHTML = `
      <button onclick="window.deleteCategorySection(this, '${escapeHtml(key)}')" 
              class="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 absolute top-3 right-3 bg-white shadow-sm border border-slate-200 z-10 hover:border-red-200" 
              title="删除此分类">
        <i class="fas fa-trash-alt text-[10px]"></i>
      </button>

      <div class="mb-3">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-1 h-4 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
          <label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">分类名称</label>
        </div>
        <textarea data-field="category" 
                  class="editor-input-modern font-semibold"
                  rows="1" 
                  style="height: 28px"
                  oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
                  onfocus="window.pushEditSnapshot('${escapeHtml(key)}'); this.style.height='auto';this.style.height=this.scrollHeight+'px'"
                  placeholder="输入分类名称..."></textarea>
      </div>

      <div class="pl-4">
        <div class="flex items-center gap-2 mb-2">
          <label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">条目列表</label>
        </div>
        <div class="items-list flex flex-col gap-2">
          <div class="item-row group/item flex items-start gap-2">
            <div class="pt-2.5 pl-1">
              <div class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/item:bg-blue-400 transition-colors"></div>
            </div>
            <div class="flex-1">
              <textarea class="editor-input-modern item-input"
                        rows="1" 
                        style="height: 28px"
                        oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
                        onfocus="window.pushEditSnapshot('${escapeHtml(key)}'); this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
            </div>
            <div class="pt-1">
              <button onclick="window.deleteCategoryItem(this, '${escapeHtml(key)}')" 
                      class="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer" 
                      title="删除此条目">
                <i class="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>
        </div>
        
        <button onclick="window.addCategoryItem(this, '${escapeHtml(key)}')" 
                class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all mt-2 cursor-pointer">
          <i class="fas fa-plus text-[9px]"></i> <span>添加条目</span>
        </button>
      </div>
    `;
    
    container.appendChild(newSection);
  }

  /**
   * 删除分类区块
   * @param {HTMLElement} btn - 删除按钮元素
   * @param {string} key - 卡片 Key
   */
  deleteCategorySection(btn, key) {
    const section = btn.closest('.edit-section');
    if (section) {
      section.remove();
    }
  }

  /**
   * 添加分类条目
   * @param {HTMLElement} btn - 添加按钮元素
   * @param {string} key - 卡片 Key
   */
  addCategoryItem(btn, key) {
    const section = btn.closest('.edit-section');
    if (!section) return;

    const itemsList = section.querySelector('.items-list');
    if (!itemsList) return;

    const newItem = document.createElement('div');
    newItem.className = 'item-row group/item flex items-start gap-2';
    newItem.innerHTML = `
      <div class="pt-2.5 pl-1">
        <div class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/item:bg-blue-400 transition-colors"></div>
      </div>
      <div class="flex-1">
        <textarea class="editor-input-modern item-input"
                  rows="1" 
                  style="height: 28px"
                  oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
                  onfocus="window.pushEditSnapshot('${escapeHtml(key)}'); this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
      </div>
      <div class="pt-1">
        <button onclick="window.deleteCategoryItem(this, '${escapeHtml(key)}')" 
                class="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer" 
                title="删除此条目">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
    `;
    
    itemsList.appendChild(newItem);
  }

  /**
   * 删除分类条目
   * @param {HTMLElement} btn - 删除按钮元素
   * @param {string} key - 卡片 Key
   */
  deleteCategoryItem(btn, key) {
    const item = btn.closest('.item-row');
    if (item) {
      item.remove();
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.originalDataMap.clear();
    this.editHistoryMap.clear();
  }
}