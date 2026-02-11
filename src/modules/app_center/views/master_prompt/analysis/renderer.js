// src/modules/app_center/views/master_prompt/analysis/renderer.js
import { ANALYSIS_MODULES } from "../constants/prompts.ts";

// 辅助函数：获取字段标题
export function getFieldTitle(key) {
  const titleMap = {
    'target_market': '目标市场',
    'keywords_tier1': '一级关键词',
    'keywords_tier2': '二级关键词',
    'product_category': '产品类别',
    'product_features': '产品特点',
    'product_benefits': '产品优势',
    'target_audience': '目标受众',
    'pain_points': '痛点',
    'unique_selling_points': 'USP',
    'competitive_advantages': '竞争优势',
    'product_positioning': '产品定位',
    'brand_tone': '品牌调性',
    'emotional_triggers': '情感触发',
    'call_to_action': '行动号召',
    'seasonal_relevance': '季节相关性'
  };
  return titleMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// 辅助函数：获取模块图标
export function getModuleIcon(moduleId) {
  const iconMap = {
    'title-keywords': 'fa-font',
    'selling-points': 'fa-layer-group',
    'fatal-flaws': 'fa-triangle-exclamation',
    'wow-moments': 'fa-star',
    'hesitation-points': 'fa-circle-question',
    'buyer-profile': 'fa-user-group',
    'vocab-gap': 'fa-comments',
    'promise-reality': 'fa-scale-unbalanced'
  };
  return iconMap[moduleId] || 'fa-info-circle';
}

// 辅助函数：获取模块颜色方案
export function getModuleColorScheme(category) {
  const colorSchemes = {
    'listing': {
      color: 'blue',
      bg: 'bg-blue-600',
      lightBg: 'bg-blue-50',
      icon: 'fa-file-alt',
      iconColor: 'text-blue-600',
      selectedBg: 'bg-blue-50',
      border: 'border-blue-300'
    },
    'reviews': {
      color: 'orange',
      bg: 'bg-orange-500',
      lightBg: 'bg-orange-50',
      icon: 'fa-comments',
      iconColor: 'text-orange-600',
      selectedBg: 'bg-orange-50',
      border: 'border-orange-300'
    },
    'cross': {
      color: 'purple',
      bg: 'bg-purple-600',
      lightBg: 'bg-purple-50',
      icon: 'fa-random',
      iconColor: 'text-purple-600',
      selectedBg: 'bg-purple-50',
      border: 'border-purple-300'
    }
  };
  return colorSchemes[category] || colorSchemes.listing;
}

// 渲染模块选择卡片（新版视觉设计）
export function renderModuleCard(module, isSelected) {
  const colorMap = {
    'blue': { bg: 'bg-blue-50', icon: 'text-blue-600', selectedBg: 'bg-blue-50', border: 'border-blue-300' },
    'cyan': { bg: 'bg-cyan-50', icon: 'text-cyan-600', selectedBg: 'bg-cyan-50', border: 'border-cyan-300' },
    'red': { bg: 'bg-red-50', icon: 'text-red-600', selectedBg: 'bg-red-50', border: 'border-red-300' },
    'amber': { bg: 'bg-amber-50', icon: 'text-amber-600', selectedBg: 'bg-amber-50', border: 'border-amber-300' },
    'orange': { bg: 'bg-orange-50', icon: 'text-orange-600', selectedBg: 'bg-orange-50', border: 'border-orange-300' },
    'purple': { bg: 'bg-purple-50', icon: 'text-purple-600', selectedBg: 'bg-purple-50', border: 'border-purple-300' },
    'teal': { bg: 'bg-teal-50', icon: 'text-teal-600', selectedBg: 'bg-teal-50', border: 'border-teal-300' },
    'rose': { bg: 'bg-rose-50', icon: 'text-rose-600', selectedBg: 'bg-rose-50', border: 'border-rose-300' }
  };

  const colors = colorMap[module.color] || colorMap.blue;
  const icon = getModuleIcon(module.id);

  return `
    <button
      data-module-id="${module.id}"
      data-category="${module.category}"
      class="module-card relative p-4 rounded-xl border-2 text-left transition-all duration-200 group hover:shadow-md ${
        isSelected
          ? `${colors.border} ${colors.selectedBg} shadow-sm`
          : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
      }"
    >
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected ? colors.bg : 'bg-slate-100 group-hover:bg-slate-200'
        }">
          <i class="fas ${icon} w-4 h-4 transition-colors ${
            isSelected ? colors.icon : 'text-slate-500'
          }"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-sm ${
            isSelected ? 'text-slate-800' : 'text-slate-700'
          }">
            ${module.label_cn}
          </h3>
          <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            ${module.desc_cn}
          </p>
        </div>
        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${
          isSelected
            ? 'border-indigo-500 bg-indigo-500'
            : 'border-slate-300 group-hover:border-slate-400'
        }">
          ${isSelected ? '<i class="fas fa-check w-2.5 h-2.5 text-white text-[10px]"></i>' : ''}
        </div>
      </div>
    </button>
  `;
}

// ========================================== 
// 1. Widget 卡片外壳渲染
// ========================================== 

/**
 * 渲染 Widget 卡片的外层容器 (Header + Content Wrapper)
 * @param {string} key - 模块 Key
 * @param {string} title - 模块标题
 * @param {Object} style - 样式配置对象 {color, lightBg, icon, ...}
 * @param {boolean} isTranslationMode - 是否处于翻译模式
 * @param {string} contentHTML - 内部内容的 HTML 字符串
 */
export function renderWidgetCard(key, title, style, isTranslationMode, contentHTML) {
    const editBtnState = isTranslationMode ? "disabled" : "";
    const editBtnClass = isTranslationMode
        ? "text-slate-300 cursor-not-allowed opacity-50"
        : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer";

    // 视觉优化：卡片容器
    return `
        <div id="widget-card-${key}" class="analysis-widget-card widget-card-container group/card">
            
            <div class="flex-shrink-0 flex justify-between items-center px-5 pt-5 pb-3 bg-white select-none drag-handle cursor-move border-b border-slate-100">
                <h3 class="text-[15px] font-bold text-slate-800 flex items-center gap-2.5 pointer-events-none truncate mr-2">
                    <span class="w-8 h-8 rounded-xl ${style.lightBg} text-${style.color}-600 flex items-center justify-center text-xs flex-shrink-0 shadow-sm transition-transform group-hover/card:scale-105">
                        <i class="fas ${style.icon}"></i>
                    </span>
                    <span class="truncate tracking-tight" title="${title}">${title}</span>
                </h3>
                
                <div class="flex items-center gap-1 bg-white pl-2">
                    
                    <div class="view-controls flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-200 translate-x-2 group-hover/card:translate-x-0">
                        <button onclick="${isTranslationMode ? "" : `window.startLocalEdit('${key}')`}" 
                                ${editBtnState}
                                class="btn-edit w-8 h-8 flex items-center justify-center rounded-lg transition-all ${editBtnClass}" 
                                title="${isTranslationMode ? "翻译模式不可编辑" : "编辑内容"}">
                            <i class="fas fa-pen text-xs"></i>
                        </button>
                    </div>

                    <div class="edit-controls hidden flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <button onclick="window.undoLocalEdit('${key}')" class="btn-undo w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200" title="撤销">
                            <i class="fas fa-undo text-xs"></i>
                        </button>
                        <button onclick="window.saveLocalEdit('${key}')" class="btn-save px-3 h-8 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all text-xs font-medium" title="完成">
                            <i class="fas fa-check"></i> <span>完成</span>
                        </button>
                    </div>

                </div>
            </div>
            
            <div id="widget-content-${key}" class="flex-1 px-5 pb-5 pt-4 overflow-y-auto custom-scrollbar relative leading-relaxed widget-content-area">
                ${contentHTML}
            </div>
        </div>`;
}

// ========================================== 
// 2. 查看模式 (View Mode) HTML 生成
// ========================================== 

export function renderViewModeHTML(val, style = {}) {
    // 0. 空状态
    if (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) {
        return _renderEmptyState();
    }

    // 1. 纯文本
    if (typeof val === "string") {
        return `<div class="text-[13px] leading-relaxed text-slate-700 font-sans tracking-wide whitespace-pre-wrap selection:bg-blue-100/50 selection:text-blue-900">${val}</div>`;
    }

    // 2. 数组处理
    if (Array.isArray(val)) {
        if (typeof val[0] === "string") return _renderStringArray(val);
        if (typeof val[0] === "object") return _renderObjectArray(val);
    }

    // 3. 兜底
    return `<div class="text-xs text-slate-400 font-mono">${JSON.stringify(val)}</div>`;
}

// 🏠 私有辅助：空状态
function _renderEmptyState() {
    return `
      <div class="h-24 flex flex-col items-center justify-center text-slate-300/60 select-none">
        <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mb-2">
            <i class="fas fa-minus text-xs"></i>
        </div>
        <span class="text-[11px] font-medium tracking-wide">暂无数据</span>
      </div>`;
}

// 🏷️ 私有辅助：字符串数组
function _renderStringArray(val) {
    const isPath = val.some((s) => s.includes(" + "));

    if (isPath) {
        return `
      <div class="flex flex-col gap-2 mt-1">
        ${val.map((item) => `
          <div class="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-600 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-100 hover:border-blue-100 transition-colors">
             ${item.split(" + ").map((part, idx, arr) => `
                <span class="font-medium ${idx === arr.length - 1 ? "text-slate-800" : "text-slate-500"}">${part.trim()}</span>
                ${idx < arr.length - 1 ? `<i class="fas fa-chevron-right text-[9px] text-slate-300 mx-1"></i>` : ""}
             `).join("")}
          </div>
        `).join("")}
      </div>`;
    }

    return `
    <div class="flex flex-wrap gap-2 pt-1">
      ${val.map((item) => `
        <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium bg-slate-50 text-slate-700 border border-slate-200/60 hover:bg-white hover:shadow-sm hover:text-blue-600 hover:border-blue-200 transition-all cursor-default select-all">
           ${item}
        </span>
      `).join("")}
    </div>`;
}

// 📋 私有辅助：对象数组
function _renderObjectArray(val) {
    return `
    <div class="flex flex-col gap-3">
        ${val.map((obj) => `
            <div class="relative group/card bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all duration-300">
                <div class="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                <div class="grid gap-y-3 gap-x-4">
                ${Object.keys(obj).map((subKey) => `
                    <div class="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2 sm:gap-4 items-baseline">
                        <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sm:text-right select-none pt-0.5">
                            ${getFieldTitle(subKey)}
                        </div>
                        <div class="text-[13px] text-slate-700 leading-6 font-medium break-words">
                            ${typeof obj[subKey] === "object" ? JSON.stringify(obj[subKey]) : obj[subKey] || '<span class="text-slate-300">-</span>'}
                        </div>
                    </div>`).join("")}
                </div>
            </div>`).join("")}
    </div>`;
}

// ========================================== 
// 3. 编辑模式 (Editor Mode) HTML 生成
// ========================================== 

// ========================================== 
// 4. 加载状态 (Loading State) HTML 生成
// ========================================== 

/**
 * 渲染骨架屏 (Skeleton Screen)
 * @returns {string} 骨架屏 HTML
 */
export function renderSkeleton() {
    return `
        <div class="analysis-widget-card h-full p-5 bg-white">
            <!-- Header Skeleton -->
            <div class="flex items-center gap-3 mb-6">
                <div class="w-8 h-8 rounded-xl bg-slate-100 skeleton"></div>
                <div class="h-4 w-32 bg-slate-100 rounded skeleton"></div>
            </div>
            
            <!-- Content Skeleton -->
            <div class="space-y-4 animate-pulse">
                <div class="h-2.5 bg-slate-100 rounded w-3/4 skeleton"></div>
                <div class="h-2.5 bg-slate-100 rounded w-full skeleton"></div>
                <div class="h-2.5 bg-slate-100 rounded w-5/6 skeleton"></div>
                <div class="h-2.5 bg-slate-100 rounded w-2/3 skeleton"></div>
            </div>

            <!-- List Skeleton (simulating bullets) -->
            <div class="mt-6 space-y-3">
                <div class="flex gap-2">
                    <div class="w-1.5 h-1.5 mt-1.5 rounded-full bg-slate-200"></div>
                    <div class="h-2 bg-slate-100 rounded w-11/12 skeleton"></div>
                </div>
                <div class="flex gap-2">
                    <div class="w-1.5 h-1.5 mt-1.5 rounded-full bg-slate-200"></div>
                    <div class="h-2 bg-slate-100 rounded w-10/12 skeleton"></div>
                </div>
                <div class="flex gap-2">
                    <div class="w-1.5 h-1.5 mt-1.5 rounded-full bg-slate-200"></div>
                    <div class="h-2 bg-slate-100 rounded w-full skeleton"></div>
                </div>
            </div>
        </div>
    `;
}

export function renderEditorForm(key, data) {
    // 自动高度脚本
    const autoResizeJS = "this.style.height='auto';this.style.height=this.scrollHeight+'px'";
    
    // 初始高度计算
    const calcHeight = (val) => {
        if (!val) return "28px";
        const lines = val.toString().split("\n").length;
        return Math.max(lines, 1) * 24 + 4 + "px";
    };

    // 样式常量
    const inputStyle = "editor-input-modern";
    const deleteBtnStyle = "w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100";
    const addBtnStyle = "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all mt-2 cursor-pointer select-none";

    // 1. String -> 纯文本编辑器
    if (typeof data === "string") {
        return `<div class="py-1 group relative">
              <textarea id="input-${key}" 
                class="${inputStyle} min-h-[80px]"
                style="height: ${calcHeight(data)}"
                oninput="${autoResizeJS}"
                onfocus="pushEditSnapshot('${key}'); ${autoResizeJS}" 
                placeholder="在此输入内容..."
              >${data}</textarea>
              <div class="absolute right-0 top-0 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                Shift+Enter 换行
              </div>
            </div>`;
    }

    // 2. Array<String> -> 列表编辑器
    if (Array.isArray(data) && typeof data[0] === "string") {
        return `
            <div id="list-container-${key}" class="flex flex-col gap-2">
                ${data.map((item) => `
                    <div class="edit-row group flex items-start gap-2 relative">
                        <div class="pt-2.5 pl-1"> 
                            <div class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>
                        </div>
                        <div class="flex-1 relative">
                            <textarea class="${inputStyle}" 
                                      rows="1" 
                                      style="height: ${calcHeight(item)}"
                                      oninput="${autoResizeJS}"
                                      onfocus="pushEditSnapshot('${key}'); ${autoResizeJS}"
                            >${item}</textarea>
                        </div>
                        <div class="pt-1">
                            <button onclick="window.deleteRowItem(this, '${key}')" class="${deleteBtnStyle}" title="删除此项">
                                <i class="fas fa-times text-xs"></i>
                            </button>
                        </div>
                    </div>
                `).join("")}
            </div>
            <button onclick="window.addListItem('${key}')" class="${addBtnStyle}">
                <i class="fas fa-plus text-[10px]"></i> <span>添加条目</span>
            </button>
        `;
    }

    // 3. Array<Object> -> 结构化编辑器
    if (Array.isArray(data) && typeof data[0] === "object") {
        return `
            <div id="obj-list-container-${key}" class="flex flex-col gap-3">
                ${data.map((obj) => `
                    <div class="edit-row group relative bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                        
                        <button onclick="window.deleteRowItem(this, '${key}')" class="${deleteBtnStyle} absolute top-3 right-3 bg-white shadow-sm border border-slate-200 z-10 hover:border-red-200">
                            <i class="fas fa-trash-alt text-[10px]"></i>
                        </button>

                        <div class="grid gap-y-3 gap-x-4">
                            ${Object.keys(obj).map((subKey) => `
                                <div class="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2 sm:gap-4 items-start group/field">
                                    <label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sm:text-right select-none pt-2 cursor-default group-hover/field:text-blue-500 transition-colors">
                                      ${getFieldTitle(subKey)}
                                    </label>
                                    
                                    <div class="relative w-full">
                                        <textarea data-subkey="${subKey}" 
                                                  class="${inputStyle} obj-input"
                                                  rows="1" 
                                                  style="height: ${calcHeight(typeof obj[subKey] === "object" ? JSON.stringify(obj[subKey]) : obj[subKey])}"
                                                  oninput="${autoResizeJS}"
                                                  onfocus="pushEditSnapshot('${key}'); ${autoResizeJS}"
                                        >${typeof obj[subKey] === "object" ? JSON.stringify(obj[subKey]) : obj[subKey]}</textarea>
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `).join("")}
            </div>
            
            <button onclick="window.addObjItem('${key}')" class="${addBtnStyle}">
                <i class="fas fa-plus"></i> <span>添加数据</span>
            </button>
            <script id="tpl-${key}" type="application/json">${JSON.stringify(data[0] || {})}</script>
        `;
    }

    return `<div class="py-8 text-center text-slate-300 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">暂不支持编辑此类型数据</div>`;
}