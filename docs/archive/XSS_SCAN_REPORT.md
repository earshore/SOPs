# XSS风险扫描报告

**扫描时间**: 2026/2/7 12:26:40  
**扫描目录**: `src/`  
**扫描文件数**: 56  
**发现风险点**: 169

---

## 📊 风险统计

| 风险等级 | 数量 | 占比 |
|---------|------|------|
| 🔴 严重 (CRITICAL) | 35 | 20.7% |
| 🟠 高危 (HIGH) | 25 | 14.8% |
| 🟡 中危 (MEDIUM) | 104 | 61.5% |
| 🟢 低危 (LOW) | 5 | 3.0% |
| ⚪ 信息 (INFO) | 0 | 0.0% |

---

## 🎯 修复优先级

### 立即修复 (P0)
需要在发布前修复的严重和高危风险: **60** 处

### 计划修复 (P1)
建议在下个版本修复的中危风险: **104** 处

### 可选修复 (P2)
低风险和信息级别: **5** 处

---

## 📋 详细风险列表

### 1. `src\modules\app_center\views\master_prompt\analysis\index.js`

**风险评分**: 141 | **风险数量**: 21 | 🔴 4 严重 | 🟠 8 高危

#### 🔴 风险 #1 - 第 151 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<label id="lbl-opt-listing" class="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium text-slate-500 border-slate-200 bg-white hover:border-blue-300">
<input type="checkbox" id="opt-listing" checked class="hidden peer">
<i class="fas fa-file-alt text-xs opacity-70"></i>
<span>Listings</span>
</label>

<label id="lbl-opt-reviews" class="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium text-slate-500 border-slate-200 bg-white hover:border-blue-300">
<input type="checkbox" id="opt-reviews" checked class="hidden peer">
<i class="fas fa-comments text-xs opacity-70"></i>
<span>Reviews</span>
</label>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `
<label id="lbl-opt-listing" class="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium text-slate-500 border-slate-200 bg-white hover:border-blue-300">
<input type="checkbox" id="opt-listing" checked class="hidden peer">
<i class="fas fa-file-alt text-xs opacity-70"></i>
<span>Listings</span>
</label>

<label id="lbl-opt-reviews" class="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium text-slate-500 border-slate-200 bg-white hover:border-blue-300">
<input type="checkbox" id="opt-reviews" checked class="hidden peer">
<i class="fas fa-comments text-xs opacity-70"></i>
<span>Reviews</span>
</label>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `
<label id="lbl-opt-listing" class="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium text-slate-500 border-slate-200 bg-white hover:border-blue-300">
<input type="checkbox" id="opt-listing" checked class="hidden peer">
<i class="fas fa-file-alt text-xs opacity-70"></i>
<span>Listings</span>
</label>

<label id="lbl-opt-reviews" class="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium text-slate-500 border-slate-200 bg-white hover:border-blue-300">
<input type="checkbox" id="opt-reviews" checked class="hidden peer">
<i class="fas fa-comments text-xs opacity-70"></i>
<span>Reviews</span>
</label>
`;
```

---

#### 🔴 风险 #2 - 第 188 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = ANALYSIS_MODULES.map(
(mod) => `
<label class="module-item group relative flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all bg-white" data-category="${mod.category}">
<div class="flex items-center pt-0.5">
<input type="checkbox" name="analysis_module" value="${mod.id}" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked>
</div>
<div class="text-sm leading-tight flex-1 min-w-0">
<div class="font-medium text-slate-700 group-hover:text-blue-700 truncate">${mod.label_cn}</div>
<div class="text-slate-400 text-[11px] mt-0.5 group-hover:text-slate-500 line-clamp-2">${mod.desc_cn}</div>
</div>
</label>
`
).join("");
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = ANALYSIS_MODULES.map(
(mod) => `
<label class="module-item group relative flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all bg-white" data-category="${mod.category}">
<div class="flex items-center pt-0.5">
<input type="checkbox" name="analysis_module" value="${mod.id}" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked>
</div>
<div class="text-sm leading-tight flex-1 min-w-0">
<div class="font-medium text-slate-700 group-hover:text-blue-700 truncate">${mod.label_cn}</div>
<div class="text-slate-400 text-[11px] mt-0.5 group-hover:text-slate-500 line-clamp-2">${mod.desc_cn}</div>
</div>
</label>
`
).join("");

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = ANALYSIS_MODULES.map(
(mod) => `
<label class="module-item group relative flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all bg-white" data-category="${mod.category}">
<div class="flex items-center pt-0.5">
<input type="checkbox" name="analysis_module" value="${mod.id}" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked>
</div>
<div class="text-sm leading-tight flex-1 min-w-0">
<div class="font-medium text-slate-700 group-hover:text-blue-700 truncate">${mod.label_cn}</div>
<div class="text-slate-400 text-[11px] mt-0.5 group-hover:text-slate-500 line-clamp-2">${mod.desc_cn}</div>
</div>
</label>
`
).join("");
```

---

#### 🔴 风险 #3 - 第 259 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = state.scraper.scrapedData.products.map((p) => {
const isSelected = state.analysis.selectedAsins.includes(p.asin);
return `
<label class="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group">
<input type="checkbox" value="${p.asin}" ${isSelected ? 'checked' : ''}
class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 asin-checkbox">
<span class="text-sm font-mono font-medium text-slate-700 group-hover:text-blue-700">${p.asin}</span>
</label>
`;
}).join("");
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = state.scraper.scrapedData.products.map((p) => {
const isSelected = state.analysis.selectedAsins.includes(p.asin);
return `
<label class="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group">
<input type="checkbox" value="${p.asin}" ${isSelected ? 'checked' : ''}
class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 asin-checkbox">
<span class="text-sm font-mono font-medium text-slate-700 group-hover:text-blue-700">${p.asin}</span>
</label>
`;
}).join("");

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = state.scraper.scrapedData.products.map((p) => {
const isSelected = state.analysis.selectedAsins.includes(p.asin);
return `
<label class="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group">
<input type="checkbox" value="${p.asin}" ${isSelected ? 'checked' : ''}
class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 asin-checkbox">
<span class="text-sm font-mono font-medium text-slate-700 group-hover:text-blue-700">${p.asin}</span>
</label>
`;
}).join("");
```

---

#### 🔴 风险 #4 - 第 302 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
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
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
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

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
previewDiv.textContent = `
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
```

---

#### 🟠 风险 #5 - 第 250 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
container.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">暂无数据</p>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
container.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">暂无数据</p>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = '<p class="text-sm text-slate-400 text-center py-6">暂无数据</p>';
```

---

#### 🟠 风险 #6 - 第 504 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-brain mr-2"></i> 分析ASIN';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
btn.innerHTML = '<i class="fas fa-brain mr-2"></i> 分析ASIN';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
btn.textContent = '<i class="fas fa-brain mr-2"></i> 分析ASIN';
```

---

#### 🟠 风险 #7 - 第 721 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
contentEl.innerHTML = w.content;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
contentEl.innerHTML = w.content;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentEl.textContent = w.content;
```

---

#### 🟠 风险 #8 - 第 997 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
resizeBtn.innerHTML = '<i class="fas fa-check text-xs"></i>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
resizeBtn.innerHTML = '<i class="fas fa-check text-xs"></i>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resizeBtn.textContent = '<i class="fas fa-check text-xs"></i>';
```

---

#### 🟠 风险 #9 - 第 1018 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
resizeBtn.innerHTML = '<i class="fas fa-expand-alt text-xs"></i>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
resizeBtn.innerHTML = '<i class="fas fa-expand-alt text-xs"></i>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resizeBtn.textContent = '<i class="fas fa-expand-alt text-xs"></i>';
```

---

#### 🟠 风险 #10 - 第 1119 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
contentArea.innerHTML = renderEditorForm(key, report[key]);
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
contentArea.innerHTML = renderEditorForm(key, report[key]);

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentArea.textContent = renderEditorForm(key, report[key]);
```

---

#### 🟠 风险 #11 - 第 1161 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
contentArea.innerHTML = renderViewModeHTML(newData, style);
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
contentArea.innerHTML = renderViewModeHTML(newData, style);

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentArea.textContent = renderViewModeHTML(newData, style);
```

---

#### 🟠 风险 #12 - 第 1201 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
contentArea.innerHTML = renderViewModeHTML(originalData, style);
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
contentArea.innerHTML = renderViewModeHTML(originalData, style);

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentArea.textContent = renderViewModeHTML(originalData, style);
```

---

#### 🟡 风险 #13 - 第 410 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> 分析中..';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #14 - 第 526 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
display.innerHTML = `<div class="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 font-mono text-sm whitespace-pre-wrap"><i class="fas fa-bug mr-2"></i> ⚠️ 解析错误，原始数据：\n${escapeHtml(report.raw_response)}</div>`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #15 - 第 603 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
display.innerHTML = toolbarHtml;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #16 - 第 633 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
select.innerHTML = options;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #17 - 第 869 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> 翻译中...';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #18 - 第 899 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-language"></i> 翻译';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #19 - 第 1267 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
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
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #20 - 第 1303 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
newRow.innerHTML = `
<button onclick="window.deleteRowItem(this, '${escapeHtml(key)}')" class="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 absolute top-3 right-3 bg-white shadow-sm border border-slate-200 z-10 hover:border-red-200" title="删除此项">
<i class="fas fa-trash-alt text-[10px]"></i>
</button>
<div class="grid gap-y-3 gap-x-4">
${escapeHtml(fields)}
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #21 - 第 1333 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 2. `src\common\utils\ui.js`

**风险评分**: 124 | **风险数量**: 18 | 🔴 6 严重 | 🟠 2 高危

#### 🔴 风险 #1 - 第 140 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `<div class="p-4 text-red-500 text-xs">菜单加载失败</div>`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `<div class="p-4 text-red-500 text-xs">菜单加载失败</div>`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `<div class="p-4 text-red-500 text-xs">菜单加载失败</div>`;
```

---

#### 🔴 风险 #2 - 第 242 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `<div class="p-4 text-red-500 text-xs">菜单加载失败</div>`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `<div class="p-4 text-red-500 text-xs">菜单加载失败</div>`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `<div class="p-4 text-red-500 text-xs">菜单加载失败</div>`;
```

---

#### 🔴 风险 #3 - 第 1615 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
resultsContainer.innerHTML = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearSOPSearch()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="truncate">${route.label}</span>
</button>
`).join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
resultsContainer.innerHTML = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearSOPSearch()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="truncate">${route.label}</span>
</button>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultsContainer.textContent = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearSOPSearch()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="truncate">${route.label}</span>
</button>
`).join('');
```

---

#### 🔴 风险 #4 - 第 1685 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
resultsContainer.innerHTML = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearHubSearch()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="truncate">${route.label}</span>
</button>
`).join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
resultsContainer.innerHTML = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearHubSearch()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="truncate">${route.label}</span>
</button>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultsContainer.textContent = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearHubSearch()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="truncate">${route.label}</span>
</button>
`).join('');
```

---

#### 🔴 风险 #5 - 第 1768 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
resultsContainer.innerHTML = `
<div class="p-3 text-xs text-slate-400 text-center">
<i class="fas fa-search mb-2"></i>
<p>未找到匹配项</p>
</div>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
resultsContainer.innerHTML = `
<div class="p-3 text-xs text-slate-400 text-center">
<i class="fas fa-search mb-2"></i>
<p>未找到匹配项</p>
</div>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultsContainer.textContent = `
<div class="p-3 text-xs text-slate-400 text-center">
<i class="fas fa-search mb-2"></i>
<p>未找到匹配项</p>
</div>
`;
```

---

#### 🔴 风险 #6 - 第 1777 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
resultsContainer.innerHTML = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearSidebarSearch()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="flex-1 text-left">${route.label}</span>
</button>
`).join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
resultsContainer.innerHTML = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearSidebarSearch()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="flex-1 text-left">${route.label}</span>
</button>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultsContainer.textContent = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" onclick="window.clearSidebarSearch()"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="flex-1 text-left">${route.label}</span>
</button>
`).join('');
```

---

#### 🟠 风险 #7 - 第 1612 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
resultsContainer.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">未找到匹配的 SOP</div>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
resultsContainer.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">未找到匹配的 SOP</div>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultsContainer.textContent = '<div class="text-xs text-slate-400 text-center py-2">未找到匹配的 SOP</div>';
```

---

#### 🟠 风险 #8 - 第 1683 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
resultsContainer.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">未找到匹配的内容</div>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
resultsContainer.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">未找到匹配的内容</div>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultsContainer.textContent = '<div class="text-xs text-slate-400 text-center py-2">未找到匹配的内容</div>';
```

---

#### 🟡 风险 #9 - 第 136 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #10 - 第 238 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #11 - 第 370 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #12 - 第 508 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #13 - 第 549 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #14 - 第 768 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #15 - 第 920 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #16 - 第 962 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #17 - 第 1086 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #18 - 第 1298 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
toast.innerHTML = `<i class="fas ${escapeHtml(style.icon)} text-lg"></i><span class="text-sm font-medium tracking-wide">${escapeHtml(message)}</span>`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 3. `src\modules\app_center\views\master_prompt\promptlab\index.js`

**风险评分**: 79 | **风险数量**: 13 | 🔴 2 严重 | 🟠 2 高危

#### 🔴 风险 #1 - 第 289 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `<p class="text-xs text-slate-400 italic p-2">暂无可用数据...</p>`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `<p class="text-xs text-slate-400 italic p-2">暂无可用数据...</p>`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `<p class="text-xs text-slate-400 italic p-2">暂无可用数据...</p>`;
```

---

#### 🔴 风险 #2 - 第 309 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
actionSpan.innerHTML = `
<span id="btn-select-all" class="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline">全选</span>
<span class="text-slate-300">|</span>
<span id="btn-clear-all" class="text-slate-500 cursor-pointer hover:text-slate-700 hover:underline">清空</span>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
actionSpan.innerHTML = `
<span id="btn-select-all" class="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline">全选</span>
<span class="text-slate-300">|</span>
<span id="btn-clear-all" class="text-slate-500 cursor-pointer hover:text-slate-700 hover:underline">清空</span>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
actionSpan.textContent = `
<span id="btn-select-all" class="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline">全选</span>
<span class="text-slate-300">|</span>
<span id="btn-clear-all" class="text-slate-500 cursor-pointer hover:text-slate-700 hover:underline">清空</span>
`;
```

---

#### 🟠 风险 #3 - 第 169 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
select.innerHTML = '<option value="" disabled selected>选择目标站点/语言...</option>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
select.innerHTML = '<option value="" disabled selected>选择目标站点/语言...</option>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
select.textContent = '<option value="" disabled selected>选择目标站点/语言...</option>';
```

---

#### 🟠 风险 #4 - 第 207 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-microchip"></i> 生成 Master Prompt';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
btn.innerHTML = '<i class="fas fa-microchip"></i> 生成 Master Prompt';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
btn.textContent = '<i class="fas fa-microchip"></i> 生成 Master Prompt';
```

---

#### 🟡 风险 #5 - 第 219 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-lock"></i> 请先生成 Ai 分析报告';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 222 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-globe"></i> 请选择目标站点/语言';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #7 - 第 225 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-pen"></i> 请填写 Tier 1 核心词';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #8 - 第 228 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-pen"></i> 请填写 Tier 2 长尾词';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #9 - 第 285 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> 未检测到分析报告';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #10 - 第 297 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> 分析报告已就绪';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #11 - 第 355 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #12 - 第 378 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
div.innerHTML = `
<div class="flex h-5 items-center">
<input type="checkbox" name="report-section" value="${escapeHtml(key)}" id="sect-${escapeHtml(key)}"
class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" ${escapeHtml(isChecked ? "checked" : "")}>
</div>
<div class="ml-3 text-sm flex-1 min-w-0">
<label for="sect-${escapeHtml(key)}" class="cursor-pointer select-none w-full block">
<span class="font-medium text-slate-700 block mb-0.5 leading-snug">${escapeHtml(label)}</span>
<p class="text-xs text-slate-400 truncate font-normal" title="${escapeHtml(previewText)}">${escapeHtml(previewText)}</p>
</label>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #13 - 第 613 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 4. `src\modules\app_center\views\keyword_hunter\analysis\index.js`

**风险评分**: 59 | **风险数量**: 10 | 🔴 1 严重 | 🟠 2 高危

#### 🔴 风险 #1 - 第 206 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
resultDiv.innerHTML = `
<div class="text-center py-10">
<i class="fas fa-circle-notch fa-spin text-purple-500 text-2xl"></i>
<p class="mt-2 text-slate-500">AI 正在深度分析您的 Listing ...</p>
</div>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
resultDiv.innerHTML = `
<div class="text-center py-10">
<i class="fas fa-circle-notch fa-spin text-purple-500 text-2xl"></i>
<p class="mt-2 text-slate-500">AI 正在深度分析您的 Listing ...</p>
</div>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultDiv.textContent = `
<div class="text-center py-10">
<i class="fas fa-circle-notch fa-spin text-purple-500 text-2xl"></i>
<p class="mt-2 text-slate-500">AI 正在深度分析您的 Listing ...</p>
</div>
`;
```

---

#### 🟠 风险 #2 - 第 99 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
resultDiv.innerHTML = state.keywordTracker.llmAnalysisResult;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
resultDiv.innerHTML = state.keywordTracker.llmAnalysisResult;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultDiv.textContent = state.keywordTracker.llmAnalysisResult;
```

---

#### 🟠 风险 #3 - 第 226 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
resultDiv.innerHTML = window.marked.parse(response);
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
resultDiv.innerHTML = window.marked.parse(response);

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultDiv.textContent = window.marked.parse(response);
```

---

#### 🟡 风险 #4 - 第 145 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
freqList.innerHTML = state.keywordTracker.wordFrequency.map(([w, c]) => `
<span class="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
${escapeHtml(w)} <span class="text-slate-400">(${c})</span>
</span>
`).join('');
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 167 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-magic"></i> 生成报告';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 199 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 分析中...';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #7 - 第 236 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-check"></i> 报告已生成';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #8 - 第 264 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
resultDiv.innerHTML = `
<div class="p-4 bg-${colorClass}-50 border border-${colorClass}-200 rounded-lg">
<div class="flex items-center gap-2 text-${colorClass}-700 font-bold mb-2">
<i class="fas ${icon}"></i> ${title}
</div>
<p class="text-sm text-${colorClass}-800">${escapeHtml(errorMsg)}</p>
<button onclick="window.kt_runLLMAnalysis()" class="mt-3 px-3 py-1 bg-white border border-${colorClass}-200 text-${colorClass}-700 text-xs rounded hover:bg-${colorClass}-50">重试</button>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #9 - 第 279 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
btn.innerHTML = '<i class="fas fa-magic"></i> 重试生成';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #10 - 第 318 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 5. `src\modules\sops\views\growth\restricted_words\restrictedWordsHandler.js`

**风险评分**: 55 | **风险数量**: 6 | 🔴 5 严重 

#### 🔴 风险 #1 - 第 37 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
catSelect.innerHTML = `<option value="">全部分类</option>` + options;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
catSelect.innerHTML = `<option value="">全部分类</option>` + options;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
catSelect.textContent = `<option value="">全部分类</option>` + options;
```

---

#### 🔴 风险 #2 - 第 48 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
riskSelect.innerHTML = `<option value="">全部</option>` + options;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
riskSelect.innerHTML = `<option value="">全部</option>` + options;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
riskSelect.textContent = `<option value="">全部</option>` + options;
```

---

#### 🔴 风险 #3 - 第 222 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
tbody.innerHTML = `
<tr>
<td colspan="6" class="text-center py-12 text-slate-400">
<div class="flex flex-col items-center">
<i class="fas fa-search text-4xl mb-3 opacity-50"></i>
<p>没有找到相关高危词条</p>
<p class="text-xs mt-1">尝试切换搜索模式或清除筛选条件</p>
</div>
</td>
</tr>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
tbody.innerHTML = `
<tr>
<td colspan="6" class="text-center py-12 text-slate-400">
<div class="flex flex-col items-center">
<i class="fas fa-search text-4xl mb-3 opacity-50"></i>
<p>没有找到相关高危词条</p>
<p class="text-xs mt-1">尝试切换搜索模式或清除筛选条件</p>
</div>
</td>
</tr>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
tbody.textContent = `
<tr>
<td colspan="6" class="text-center py-12 text-slate-400">
<div class="flex flex-col items-center">
<i class="fas fa-search text-4xl mb-3 opacity-50"></i>
<p>没有找到相关高危词条</p>
<p class="text-xs mt-1">尝试切换搜索模式或清除筛选条件</p>
</div>
</td>
</tr>
`;
```

---

#### 🔴 风险 #4 - 第 237 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
tbody.innerHTML = currentResults.map(word => {
const risk = RISK_LEVELS[word.riskLevel];
const category = WORD_CATEGORIES[word.category];

// 智能显示关键词：如果有选中站点且有对应的本地化词，优先显示本地化词
let displayKeyword = word.keyword;
let subDisplay = word.variants.slice(0, 3).join(', ');

if (currentSiteContext !== 'ALL' && word.localizedKeywords && word.localizedKeywords[currentSiteContext]) {
const localWord = word.localizedKeywords[currentSiteContext];
displayKeyword = localWord;
// 在副标显示英文原词
if (localWord !== word.keyword) {
subDisplay = `${word.keyword}${subDisplay ? ', ' + subDisplay : ''}`;
}
}

return `
<tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
<td class="px-4 py-3 align-top">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
tbody.innerHTML = currentResults.map(word => {
const risk = RISK_LEVELS[word.riskLevel];
const category = WORD_CATEGORIES[word.category];

// 智能显示关键词：如果有选中站点且有对应的本地化词，优先显示本地化词
let displayKeyword = word.keyword;
let subDisplay = word.variants.slice(0, 3).join(', ');

if (currentSiteContext !== 'ALL' && word.localizedKeywords && word.localizedKeywords[currentSiteContext]) {
const localWord = word.localizedKeywords[currentSiteContext];
displayKeyword = localWord;
// 在副标显示英文原词
if (localWord !== word.keyword) {
subDisplay = `${word.keyword}${subDisplay ? ', ' + subDisplay : ''}`;
}
}

return `
<tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
<td class="px-4 py-3 align-top">

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
tbody.textContent = currentResults.map(word => {
const risk = RISK_LEVELS[word.riskLevel];
const category = WORD_CATEGORIES[word.category];

// 智能显示关键词：如果有选中站点且有对应的本地化词，优先显示本地化词
let displayKeyword = word.keyword;
let subDisplay = word.variants.slice(0, 3).join(', ');

if (currentSiteContext !== 'ALL' && word.localizedKeywords && word.localizedKeywords[currentSiteContext]) {
const localWord = word.localizedKeywords[currentSiteContext];
displayKeyword = localWord;
// 在副标显示英文原词
if (localWord !== word.keyword) {
subDisplay = `${word.keyword}${subDisplay ? ', ' + subDisplay : ''}`;
}
}

return `
<tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
<td class="px-4 py-3 align-top">
```

---

#### 🔴 风险 #5 - 第 355 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
content.innerHTML = `
<div class="space-y-6">

<!-- 变体与本地化 -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div class="bg-slate-50 p-4 rounded-lg border border-slate-100">
<h4 class="text-xs font-bold text-slate-500 uppercase mb-2">站点本地化写法</h4>
<div class="space-y-1">
${Object.entries(word.localizedKeywords || {}).map(([site, localKw]) => `
<div class="flex justify-between text-sm">
<span class="font-medium text-slate-600">${site}:</span>
<span class="text-slate-800 font-bold">${localKw}</span>
</div>
`).join('') || '<span class="text-slate-400 text-sm">无特定本地化差异</span>'}
</div>
</div>

<div class="bg-slate-50 p-4 rounded-lg border border-slate-100">
<h4 class="text-xs font-bold text-slate-500 uppercase mb-2">其他搜索变体</h4>
<p class="text-sm text-slate-800 font-mono leading-relaxed">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
content.innerHTML = `
<div class="space-y-6">

<!-- 变体与本地化 -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div class="bg-slate-50 p-4 rounded-lg border border-slate-100">
<h4 class="text-xs font-bold text-slate-500 uppercase mb-2">站点本地化写法</h4>
<div class="space-y-1">
${Object.entries(word.localizedKeywords || {}).map(([site, localKw]) => `
<div class="flex justify-between text-sm">
<span class="font-medium text-slate-600">${site}:</span>
<span class="text-slate-800 font-bold">${localKw}</span>
</div>
`).join('') || '<span class="text-slate-400 text-sm">无特定本地化差异</span>'}
</div>
</div>

<div class="bg-slate-50 p-4 rounded-lg border border-slate-100">
<h4 class="text-xs font-bold text-slate-500 uppercase mb-2">其他搜索变体</h4>
<p class="text-sm text-slate-800 font-mono leading-relaxed">

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
content.textContent = `
<div class="space-y-6">

<!-- 变体与本地化 -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div class="bg-slate-50 p-4 rounded-lg border border-slate-100">
<h4 class="text-xs font-bold text-slate-500 uppercase mb-2">站点本地化写法</h4>
<div class="space-y-1">
${Object.entries(word.localizedKeywords || {}).map(([site, localKw]) => `
<div class="flex justify-between text-sm">
<span class="font-medium text-slate-600">${site}:</span>
<span class="text-slate-800 font-bold">${localKw}</span>
</div>
`).join('') || '<span class="text-slate-400 text-sm">无特定本地化差异</span>'}
</div>
</div>

<div class="bg-slate-50 p-4 rounded-lg border border-slate-100">
<h4 class="text-xs font-bold text-slate-500 uppercase mb-2">其他搜索变体</h4>
<p class="text-sm text-slate-800 font-mono leading-relaxed">
```

---

#### 🟡 风险 #6 - 第 332 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
header.innerHTML = `
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-lg bg-${escapeHtml(risk.color)}-100 flex items-center justify-center text-2xl">
${escapeHtml(risk.icon)}
</div>
<div>
<h3 class="text-xl font-bold text-slate-800 flex items-center gap-3">
${escapeHtml(word.keyword)}
<span class="text-xs font-normal text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ID: ${escapeHtml(word.id)}</span>
</h3>
<div class="flex items-center gap-2 mt-1">
<span class="px-2 py-0.5 rounded text-xs font-medium bg-${escapeHtml(category.color)}-50 text-${escapeHtml(category.color)}-700 border border-${escapeHtml(category.color)}-100">
${escapeHtml(category.label)}
</span>
<span class="px-2 py-0.5 rounded text-xs font-medium bg-${escapeHtml(risk.color)}-50 text-${escapeHtml(risk.color)}-700 border border-${escapeHtml(risk.color)}-100">
风险等级 ${escapeHtml(word.riskLevel)}: ${escapeHtml(risk.label)}
</span>
</div>
</div>
</div>
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 6. `src\common\state\devtools\StateDevTools.js`

**风险评分**: 54 | **风险数量**: 6 | 🔴 4 严重 | 🟠 2 高危

#### 🔴 风险 #1 - 第 66 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
panel.innerHTML = `
<div style="display: flex; flex-direction: column; height: 100%;">
<!-- Header -->
<div style="background: #2563eb; color: white; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
<span style="font-weight: bold;">State DevTools</span>
<button id="devtools-close" style="background: transparent; border: none; color: white; cursor: pointer; padding: 4px 8px; border-radius: 4px;">✕</button>
</div>

<!-- Tabs -->
<div style="display: flex; border-bottom: 1px solid #e5e7eb;">
<button class="devtools-tab" data-tab="state" style="padding: 8px 16px; border: none; border-right: 1px solid #e5e7eb; background: #f3f4f6; cursor: pointer;">State</button>
<button class="devtools-tab" data-tab="history" style="padding: 8px 16px; border: none; border-right: 1px solid #e5e7eb; background: white; cursor: pointer;">History</button>
<button class="devtools-tab" data-tab="subscribers" style="padding: 8px 16px; border: none; background: white; cursor: pointer;">Subscribers</button>
</div>

<!-- Content -->
<div id="devtools-content" style="flex: 1; overflow: auto; padding: 12px; background: #f9fafb;"></div>

<!-- Actions -->
<div style="border-top: 1px solid #e5e7eb; padding: 8px; display: flex; gap: 8px;">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
panel.innerHTML = `
<div style="display: flex; flex-direction: column; height: 100%;">
<!-- Header -->
<div style="background: #2563eb; color: white; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
<span style="font-weight: bold;">State DevTools</span>
<button id="devtools-close" style="background: transparent; border: none; color: white; cursor: pointer; padding: 4px 8px; border-radius: 4px;">✕</button>
</div>

<!-- Tabs -->
<div style="display: flex; border-bottom: 1px solid #e5e7eb;">
<button class="devtools-tab" data-tab="state" style="padding: 8px 16px; border: none; border-right: 1px solid #e5e7eb; background: #f3f4f6; cursor: pointer;">State</button>
<button class="devtools-tab" data-tab="history" style="padding: 8px 16px; border: none; border-right: 1px solid #e5e7eb; background: white; cursor: pointer;">History</button>
<button class="devtools-tab" data-tab="subscribers" style="padding: 8px 16px; border: none; background: white; cursor: pointer;">Subscribers</button>
</div>

<!-- Content -->
<div id="devtools-content" style="flex: 1; overflow: auto; padding: 12px; background: #f9fafb;"></div>

<!-- Actions -->
<div style="border-top: 1px solid #e5e7eb; padding: 8px; display: flex; gap: 8px;">

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
panel.textContent = `
<div style="display: flex; flex-direction: column; height: 100%;">
<!-- Header -->
<div style="background: #2563eb; color: white; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
<span style="font-weight: bold;">State DevTools</span>
<button id="devtools-close" style="background: transparent; border: none; color: white; cursor: pointer; padding: 4px 8px; border-radius: 4px;">✕</button>
</div>

<!-- Tabs -->
<div style="display: flex; border-bottom: 1px solid #e5e7eb;">
<button class="devtools-tab" data-tab="state" style="padding: 8px 16px; border: none; border-right: 1px solid #e5e7eb; background: #f3f4f6; cursor: pointer;">State</button>
<button class="devtools-tab" data-tab="history" style="padding: 8px 16px; border: none; border-right: 1px solid #e5e7eb; background: white; cursor: pointer;">History</button>
<button class="devtools-tab" data-tab="subscribers" style="padding: 8px 16px; border: none; background: white; cursor: pointer;">Subscribers</button>
</div>

<!-- Content -->
<div id="devtools-content" style="flex: 1; overflow: auto; padding: 12px; background: #f9fafb;"></div>

<!-- Actions -->
<div style="border-top: 1px solid #e5e7eb; padding: 8px; display: flex; gap: 8px;">
```

---

#### 🔴 风险 #2 - 第 115 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
content.innerHTML = `<pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(this.stateManager._state, null, 2)}</pre>`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
content.innerHTML = `<pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(this.stateManager._state, null, 2)}</pre>`;

// 修复后
import { escapeHtml } from '@/common/utils/security.js';
content.innerHTML = `<pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(this.stateManager._state, null, 2)}</pre>`;
```

---

#### 🔴 风险 #3 - 第 124 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
content.innerHTML = history.map((action, i) => `
<div style="margin-bottom: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: white; ${i === history.length - 1 ? 'background: #fef3c7;' : ''}">
<div style="font-weight: bold; color: #1f2937;">${action.type} - ${new Date(action.timestamp).toLocaleTimeString()}</div>
<div style="color: #6b7280; margin-top: 4px;">Path: ${action.path || 'N/A'}</div>
<div style="color: #6b7280;">Value: ${JSON.stringify(action.value).substring(0, 50)}${JSON.stringify(action.value).length > 50 ? '...' : ''}</div>
</div>
`).join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
content.innerHTML = history.map((action, i) => `
<div style="margin-bottom: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: white; ${i === history.length - 1 ? 'background: #fef3c7;' : ''}">
<div style="font-weight: bold; color: #1f2937;">${action.type} - ${new Date(action.timestamp).toLocaleTimeString()}</div>
<div style="color: #6b7280; margin-top: 4px;">Path: ${action.path || 'N/A'}</div>
<div style="color: #6b7280;">Value: ${JSON.stringify(action.value).substring(0, 50)}${JSON.stringify(action.value).length > 50 ? '...' : ''}</div>
</div>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
content.textContent = history.map((action, i) => `
<div style="margin-bottom: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: white; ${i === history.length - 1 ? 'background: #fef3c7;' : ''}">
<div style="font-weight: bold; color: #1f2937;">${action.type} - ${new Date(action.timestamp).toLocaleTimeString()}</div>
<div style="color: #6b7280; margin-top: 4px;">Path: ${action.path || 'N/A'}</div>
<div style="color: #6b7280;">Value: ${JSON.stringify(action.value).substring(0, 50)}${JSON.stringify(action.value).length > 50 ? '...' : ''}</div>
</div>
`).join('');
```

---

#### 🔴 风险 #4 - 第 140 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
content.innerHTML = subs.map(([path, callbacks]) => `
<div style="margin-bottom: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: white;">
<div style="font-weight: bold; color: #1f2937;">${path}</div>
<div style="color: #6b7280; margin-top: 4px;">${callbacks.size} subscriber(s)</div>
</div>
`).join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
content.innerHTML = subs.map(([path, callbacks]) => `
<div style="margin-bottom: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: white;">
<div style="font-weight: bold; color: #1f2937;">${path}</div>
<div style="color: #6b7280; margin-top: 4px;">${callbacks.size} subscriber(s)</div>
</div>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
content.textContent = subs.map(([path, callbacks]) => `
<div style="margin-bottom: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: white;">
<div style="font-weight: bold; color: #1f2937;">${path}</div>
<div style="color: #6b7280; margin-top: 4px;">${callbacks.size} subscriber(s)</div>
</div>
`).join('');
```

---

#### 🟠 风险 #5 - 第 122 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
content.innerHTML = '<div style="color: #6b7280; text-align: center; padding: 20px;">No history yet</div>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
content.innerHTML = '<div style="color: #6b7280; text-align: center; padding: 20px;">No history yet</div>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
content.textContent = '<div style="color: #6b7280; text-align: center; padding: 20px;">No history yet</div>';
```

---

#### 🟠 风险 #6 - 第 138 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
content.innerHTML = '<div style="color: #6b7280; text-align: center; padding: 20px;">No subscribers</div>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
content.innerHTML = '<div style="color: #6b7280; text-align: center; padding: 20px;">No subscribers</div>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
content.textContent = '<div style="color: #6b7280; text-align: center; padding: 20px;">No subscribers</div>';
```

---

### 7. `src\modules\amz_hub\views\practice\marketing_calendar\index.js`

**风险评分**: 38 | **风险数量**: 7 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 433 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="amzf_empty amzf_animate">
<div class="amzf_empty_icon"><i class="fas fa-search"></i></div>
<div class="amzf_empty_text">未找到匹配的活动，请尝试关键词如 "圣诞"、"Prime" 或 "德国"</div>
</div>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `
<div class="amzf_empty amzf_animate">
<div class="amzf_empty_icon"><i class="fas fa-search"></i></div>
<div class="amzf_empty_text">未找到匹配的活动，请尝试关键词如 "圣诞"、"Prime" 或 "德国"</div>
</div>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `
<div class="amzf_empty amzf_animate">
<div class="amzf_empty_icon"><i class="fas fa-search"></i></div>
<div class="amzf_empty_text">未找到匹配的活动，请尝试关键词如 "圣诞"、"Prime" 或 "德国"</div>
</div>
`;
```

---

#### 🟡 风险 #2 - 第 346 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 389 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 400 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="amzf_stat_item">
<div class="amzf_stat_icon amzf_blue"><i class="fa-solid fa-timeline text-purple-500"></i></div>
<div>
<div class="amzf_stat_value">${escapeHtml(filtered.length)}</div>
<div class="amzf_stat_label">营销节点</div>
</div>
</div>
<div class="amzf_stat_item">
<div class="amzf_stat_icon amzf_green"><i class="fas fa-gifts text-purple-500"></i></div>
<div>
<div class="amzf_stat_value">${escapeHtml(holidays)}</div>
<div class="amzf_stat_label">重要节日</div>
</div>
</div>
<div class="amzf_stat_item">
<div class="amzf_stat_icon amzf_orange"><i class="fas fa-shopping-cart text-purple-500"></i></div>
<div>
<div class="amzf_stat_value">${escapeHtml(shopping)}</div>
<div class="amzf_stat_label">电商大促</div>
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 485 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 535 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟢 风险 #7 - 第 35 行

**风险等级**: LOW (3分)  
**风险原因**: 静态模板加载  
**代码片段**:
```javascript
this.container.innerHTML = await loadTemplate('src/modules/amz_hub/views/practice/marketing_calendar/template.html');
```

**修复建议**: ✅ 低风险: 确认为静态内容或已安全处理

---

### 8. `src\modules\app_center\views\master_prompt\data\index.js`

**风险评分**: 36 | **风险数量**: 5 | 🔴 1 严重 | 🟠 3 高危

#### 🔴 风险 #1 - 第 153 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
cardsEl.innerHTML = state.scraper.scrapedData.products.map((p) => {
const isExpanded = state.expandedAsin === p.asin;
let siteKey = globalSiteCode || p.language || "US";
if (siteKey === 'UK') siteKey = 'GB';
const flag = languageFlagMap[siteKey] || "🌐";

const statusConfig = {
success: { class: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "fa-check-circle", text: "成功" },
partial: { class: "bg-amber-100 text-amber-700 border-amber-200", icon: "fa-exclamation-circle", text: "部分" },
failed: { class: "bg-red-100 text-red-700 border-red-200", icon: "fa-times-circle", text: "失败" },
};
const status = statusConfig[p.scrape_status] || statusConfig.partial;

return `
<div id="card-${p.asin}"
class="asin-card group relative p-5 border rounded-2xl transition-all cursor-pointer hover:shadow-md
${isExpanded ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500" : "bg-white border-slate-200 hover:border-blue-300"}"
onclick="window.dataModule.toggleCardExpand('${p.asin}')">

<button onclick="event.stopPropagation(); window.dataModule.deleteProduct('${p.asin}')"
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
cardsEl.innerHTML = state.scraper.scrapedData.products.map((p) => {
const isExpanded = state.expandedAsin === p.asin;
let siteKey = globalSiteCode || p.language || "US";
if (siteKey === 'UK') siteKey = 'GB';
const flag = languageFlagMap[siteKey] || "🌐";

const statusConfig = {
success: { class: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "fa-check-circle", text: "成功" },
partial: { class: "bg-amber-100 text-amber-700 border-amber-200", icon: "fa-exclamation-circle", text: "部分" },
failed: { class: "bg-red-100 text-red-700 border-red-200", icon: "fa-times-circle", text: "失败" },
};
const status = statusConfig[p.scrape_status] || statusConfig.partial;

return `
<div id="card-${p.asin}"
class="asin-card group relative p-5 border rounded-2xl transition-all cursor-pointer hover:shadow-md
${isExpanded ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500" : "bg-white border-slate-200 hover:border-blue-300"}"
onclick="window.dataModule.toggleCardExpand('${p.asin}')">

<button onclick="event.stopPropagation(); window.dataModule.deleteProduct('${p.asin}')"

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
cardsEl.textContent = state.scraper.scrapedData.products.map((p) => {
const isExpanded = state.expandedAsin === p.asin;
let siteKey = globalSiteCode || p.language || "US";
if (siteKey === 'UK') siteKey = 'GB';
const flag = languageFlagMap[siteKey] || "🌐";

const statusConfig = {
success: { class: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "fa-check-circle", text: "成功" },
partial: { class: "bg-amber-100 text-amber-700 border-amber-200", icon: "fa-exclamation-circle", text: "部分" },
failed: { class: "bg-red-100 text-red-700 border-red-200", icon: "fa-times-circle", text: "失败" },
};
const status = statusConfig[p.scrape_status] || statusConfig.partial;

return `
<div id="card-${p.asin}"
class="asin-card group relative p-5 border rounded-2xl transition-all cursor-pointer hover:shadow-md
${isExpanded ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500" : "bg-white border-slate-200 hover:border-blue-300"}"
onclick="window.dataModule.toggleCardExpand('${p.asin}')">

<button onclick="event.stopPropagation(); window.dataModule.deleteProduct('${p.asin}')"
```

---

#### 🟠 风险 #2 - 第 266 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
jsonDisplay.innerHTML = this.syntaxHighlight(JSON.stringify(state.scraper.scrapedData, null, 2));
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
jsonDisplay.innerHTML = this.syntaxHighlight(JSON.stringify(state.scraper.scrapedData, null, 2));

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
jsonDisplay.textContent = this.syntaxHighlight(JSON.stringify(state.scraper.scrapedData, null, 2));
```

---

#### 🟠 风险 #3 - 第 358 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
if (descEl) descEl.innerHTML = content;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
if (descEl) descEl.innerHTML = content;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
if (descEl) descEl.textContent = content;
```

---

#### 🟠 风险 #4 - 第 591 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
backdrop.innerHTML = content;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
backdrop.innerHTML = content;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
backdrop.textContent = content;
```

---

#### 🟡 风险 #5 - 第 693 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 9. `src\common\utils\xssFixer.js`

**风险评分**: 35 | **风险数量**: 7 

#### 🟡 风险 #1 - 第 12 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
* 用于替换所有 element.innerHTML = xxx 的场景
*
* @param {HTMLElement} element - 目标元素
* @param {string} html - HTML字符串
* @param {boolean} [trusted=false] - 是否信任内容(静态模板可设为true)
*
* @example
* // ❌ 危险
* container.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 20 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
* container.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 34 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 68 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 92 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 99 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = items.map((item, index) => renderItem(item, index)).join('');
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #7 - 第 103 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 10. `src\modules\app_center\views\keyword_hunter\process\index.js`

**风险评分**: 32 | **风险数量**: 6 | 🟠 1 高危

#### 🟠 风险 #1 - 第 237 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
display.innerHTML = highlightText(state.keywordTracker.processedCopy);
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
display.innerHTML = highlightText(state.keywordTracker.processedCopy);

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
display.textContent = highlightText(state.keywordTracker.processedCopy);
```

---

#### 🟡 风险 #2 - 第 230 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
display.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 241 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
display.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 279 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
matchedContainer.innerHTML = state.keywordTracker.matchedKeywords.map(item => `
<div class="bg-green-50 border border-green-200 rounded p-2 flex justify-between items-center cursor-pointer hover:bg-green-100 transition-colors"
onclick="window.kt_locateKeyword('${escapeAttr(item.keyword)}')">
<span class="text-sm text-green-800 font-medium">${escapeHtml(item.keyword)}</span>
<span class="text-xs bg-green-200 text-green-800 px-1.5 rounded-full">${item.count}</span>
</div>
`).join('');
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 289 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
unmatchedContainer.innerHTML = state.keywordTracker.unmatchedKeywords.map(kw => `
<div class="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
${escapeHtml(kw)}
</div>
`).join('');
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 621 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 11. `src\components\ErrorBoundary.js`

**风险评分**: 30 | **风险数量**: 5 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 130 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="p-10 text-center">
<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
<i class="fas fa-clock text-2xl text-orange-500"></i>
</div>
<h3 class="text-lg font-bold text-slate-800 mb-2">加载超时</h3>
<p class="text-sm text-slate-500 mb-4">内容容器加载超时，请刷新重试</p>
<button onclick="window.location.reload()"
class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
<i class="fas fa-redo mr-2"></i>刷新页面
</button>
</div>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `
<div class="p-10 text-center">
<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
<i class="fas fa-clock text-2xl text-orange-500"></i>
</div>
<h3 class="text-lg font-bold text-slate-800 mb-2">加载超时</h3>
<p class="text-sm text-slate-500 mb-4">内容容器加载超时，请刷新重试</p>
<button onclick="window.location.reload()"
class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
<i class="fas fa-redo mr-2"></i>刷新页面
</button>
</div>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `
<div class="p-10 text-center">
<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
<i class="fas fa-clock text-2xl text-orange-500"></i>
</div>
<h3 class="text-lg font-bold text-slate-800 mb-2">加载超时</h3>
<p class="text-sm text-slate-500 mb-4">内容容器加载超时，请刷新重试</p>
<button onclick="window.location.reload()"
class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
<i class="fas fa-redo mr-2"></i>刷新页面
</button>
</div>
`;
```

---

#### 🟡 风险 #2 - 第 50 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="error-boundary flex flex-col items-center justify-center p-12 text-center fade-in">
<div class="w-16 h-16 rounded-full bg-${escapeHtml(color)}-50 flex items-center justify-center mb-4">
<i class="fas fa-exclamation-triangle text-2xl text-${escapeHtml(color)}-500"></i>
</div>
<h3 class="text-lg font-bold text-slate-800 mb-2">${escapeHtml(title)}</h3>
<p class="text-sm text-slate-500 mb-4 max-w-md">${escapeHtml(error.message || '网络连接不稳定或文件缺失')}</p>
<div class="flex gap-3">
${escapeHtml(reloadButton)}
${escapeHtml(retryButton)}
</div>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 82 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="p-10 text-center fade-in">
<i class="fas fa-spinner fa-spin text-2xl text-${escapeHtml(color)}-500"></i>
<p class="text-slate-400 text-xs mt-2">${escapeHtml(message)}</p>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 97 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="flex flex-col items-center justify-center p-12 text-center">
<div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
<i class="fas ${escapeHtml(icon)} text-2xl text-slate-400"></i>
</div>
<p class="text-sm text-slate-500">${escapeHtml(message)}</p>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 113 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="p-10 text-center">
<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-4">
<i class="fas fa-tools text-2xl text-amber-500"></i>
</div>
<h3 class="text-lg font-bold text-slate-800 mb-2">功能开发中</h3>
<p class="text-sm text-slate-500">模块 [${escapeHtml(routeId)}] 尚未开发或未注册</p>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 12. `src\modules\more\views\explore\prompts\index.js`

**风险评分**: 30 | **风险数量**: 4 | 🔴 2 严重 

#### 🔴 风险 #1 - 第 109 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="col-span-full text-center py-12">
<i class="fas fa-search text-4xl text-slate-300 mb-4"></i>
<p class="text-slate-500">未找到匹配的提示词</p>
</div>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `
<div class="col-span-full text-center py-12">
<i class="fas fa-search text-4xl text-slate-300 mb-4"></i>
<p class="text-slate-500">未找到匹配的提示词</p>
</div>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `
<div class="col-span-full text-center py-12">
<i class="fas fa-search text-4xl text-slate-300 mb-4"></i>
<p class="text-slate-500">未找到匹配的提示词</p>
</div>
`;
```

---

#### 🔴 风险 #2 - 第 119 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = promptsToRender.map(prompt => {
// 通过 id 查找分类
const category = Object.values(PROMPT_CATEGORIES).find(cat => cat.id === prompt.category);
const model = getModelInfo(prompt.recommendedModel);

return `
<div class="prompt-card group" data-prompt-id="${prompt.id}">
<div class="flex items-start justify-between mb-3">
<span class="category-badge ${category.color}">
<i class="fas ${category.icon}"></i>
${category.name}
</span>
<span class="model-badge">
${model.badge}
</span>
</div>

<h3 class="prompt-title">${prompt.title}</h3>
<p class="prompt-description">${prompt.description}</p>

```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = promptsToRender.map(prompt => {
// 通过 id 查找分类
const category = Object.values(PROMPT_CATEGORIES).find(cat => cat.id === prompt.category);
const model = getModelInfo(prompt.recommendedModel);

return `
<div class="prompt-card group" data-prompt-id="${prompt.id}">
<div class="flex items-start justify-between mb-3">
<span class="category-badge ${category.color}">
<i class="fas ${category.icon}"></i>
${category.name}
</span>
<span class="model-badge">
${model.badge}
</span>
</div>

<h3 class="prompt-title">${prompt.title}</h3>
<p class="prompt-description">${prompt.description}</p>


// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = promptsToRender.map(prompt => {
// 通过 id 查找分类
const category = Object.values(PROMPT_CATEGORIES).find(cat => cat.id === prompt.category);
const model = getModelInfo(prompt.recommendedModel);

return `
<div class="prompt-card group" data-prompt-id="${prompt.id}">
<div class="flex items-start justify-between mb-3">
<span class="category-badge ${category.color}">
<i class="fas ${category.icon}"></i>
${category.name}
</span>
<span class="model-badge">
${model.badge}
</span>
</div>

<h3 class="prompt-title">${prompt.title}</h3>
<p class="prompt-description">${prompt.description}</p>

```

---

#### 🟡 风险 #3 - 第 22 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 98 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = allBtn + categoryBtns;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 13. `src\modules\sops\views\service\email_templates\index.js`

**风险评分**: 30 | **风险数量**: 6 

#### 🟡 风险 #1 - 第 12 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 78 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
cardsContainer.innerHTML = cardsHtml;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 137 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
copyBtn.innerHTML = '<i class="fas fa-check"></i><span>已复制!</span>';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 144 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
copyBtn.innerHTML = originalHtml;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 155 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
copyBtn.innerHTML = '<i class="fas fa-times"></i><span>失败</span>';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 161 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
copyBtn.innerHTML = originalHtml;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 14. `src\modules\sops\views\growth\npi_tracker\index.js`

**风险评分**: 25 | **风险数量**: 3 | 🔴 2 严重 

#### 🔴 风险 #1 - 第 216 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
tbody.innerHTML = tableData.map((row, index) => {
const stageConfig = STAGE_CONFIG[row.stage] || STAGE_CONFIG['new-test'];
const clearancePrice = calcClearancePrice(row.delivery_fee);
const movingPrice = calcMovingPrice(row.delivery_fee);
const suggestedPrice = calcCurrentPrice(row.delivery_fee);
const deliveryPercent = calcDeliveryPercent(row.delivery_fee, parseFloat(suggestedPrice));
const compliance = getComplianceStatus(row);
const isOverstock = row.inventory_days > 60;
const isPriceBelowClearance = parseFloat(suggestedPrice) < parseFloat(clearancePrice);

const domain = SITE_DOMAINS[row.site] || 'amazon.de';
const flag = SITE_FLAGS[row.site] || row.site;

return `
<tr class="hover:bg-slate-50 border-b border-slate-100" data-index="${index}">
<!-- 基础档案 (8列) -->
<td class="px-3 py-3 sticky left-0 bg-white z-10 border-r">
<span class="px-2 py-1 rounded text-xs font-medium ${stageConfig.color}">${stageConfig.label}</span>
</td>
<td class="px-3 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onclick="window.open('https://www.${domain}/dp/${row.asin}', '_blank')">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
tbody.innerHTML = tableData.map((row, index) => {
const stageConfig = STAGE_CONFIG[row.stage] || STAGE_CONFIG['new-test'];
const clearancePrice = calcClearancePrice(row.delivery_fee);
const movingPrice = calcMovingPrice(row.delivery_fee);
const suggestedPrice = calcCurrentPrice(row.delivery_fee);
const deliveryPercent = calcDeliveryPercent(row.delivery_fee, parseFloat(suggestedPrice));
const compliance = getComplianceStatus(row);
const isOverstock = row.inventory_days > 60;
const isPriceBelowClearance = parseFloat(suggestedPrice) < parseFloat(clearancePrice);

const domain = SITE_DOMAINS[row.site] || 'amazon.de';
const flag = SITE_FLAGS[row.site] || row.site;

return `
<tr class="hover:bg-slate-50 border-b border-slate-100" data-index="${index}">
<!-- 基础档案 (8列) -->
<td class="px-3 py-3 sticky left-0 bg-white z-10 border-r">
<span class="px-2 py-1 rounded text-xs font-medium ${stageConfig.color}">${stageConfig.label}</span>
</td>
<td class="px-3 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onclick="window.open('https://www.${domain}/dp/${row.asin}', '_blank')">

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
tbody.textContent = tableData.map((row, index) => {
const stageConfig = STAGE_CONFIG[row.stage] || STAGE_CONFIG['new-test'];
const clearancePrice = calcClearancePrice(row.delivery_fee);
const movingPrice = calcMovingPrice(row.delivery_fee);
const suggestedPrice = calcCurrentPrice(row.delivery_fee);
const deliveryPercent = calcDeliveryPercent(row.delivery_fee, parseFloat(suggestedPrice));
const compliance = getComplianceStatus(row);
const isOverstock = row.inventory_days > 60;
const isPriceBelowClearance = parseFloat(suggestedPrice) < parseFloat(clearancePrice);

const domain = SITE_DOMAINS[row.site] || 'amazon.de';
const flag = SITE_FLAGS[row.site] || row.site;

return `
<tr class="hover:bg-slate-50 border-b border-slate-100" data-index="${index}">
<!-- 基础档案 (8列) -->
<td class="px-3 py-3 sticky left-0 bg-white z-10 border-r">
<span class="px-2 py-1 rounded text-xs font-medium ${stageConfig.color}">${stageConfig.label}</span>
</td>
<td class="px-3 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onclick="window.open('https://www.${domain}/dp/${row.asin}', '_blank')">
```

---

#### 🔴 风险 #2 - 第 343 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
checkboxes.innerHTML = NEXT_STEP_OPTIONS.map(option => `
<label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
<input type="checkbox" value="${option}" ${tableData[index].next_step.includes(option) ? 'checked' : ''} class="w-4 h-4 rounded">
<span class="text-sm">${option}</span>
</label>
`).join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
checkboxes.innerHTML = NEXT_STEP_OPTIONS.map(option => `
<label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
<input type="checkbox" value="${option}" ${tableData[index].next_step.includes(option) ? 'checked' : ''} class="w-4 h-4 rounded">
<span class="text-sm">${option}</span>
</label>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
checkboxes.textContent = NEXT_STEP_OPTIONS.map(option => `
<label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
<input type="checkbox" value="${option}" ${tableData[index].next_step.includes(option) ? 'checked' : ''} class="w-4 h-4 rounded">
<span class="text-sm">${option}</span>
</label>
`).join('');
```

---

#### 🟡 风险 #3 - 第 472 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 15. `src\common\router\NotFound.js`

**风险评分**: 20 | **风险数量**: 2 | 🔴 2 严重 

#### 🔴 风险 #1 - 第 16 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="flex flex-col items-center justify-center min-h-screen p-8 text-center fade-in">
<div class="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
<i class="fas fa-map-marked-alt text-4xl text-slate-400"></i>
</div>
<h1 class="text-6xl font-bold text-slate-800 mb-4">404</h1>
<h2 class="text-2xl font-semibold text-slate-600 mb-2">页面未找到</h2>
<p class="text-slate-500 mb-8 max-w-md">
${routeId ? `路由 "${routeId}" 不存在或尚未开发。` : '您访问的页面不存在。'}
</p>
<div class="flex gap-4">
<button
onclick="window.location.hash = ''; window.location.reload()"
class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
<i class="fas fa-home mr-2"></i>返回首页
</button>
<button
onclick="window.history.back()"
class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
<i class="fas fa-arrow-left mr-2"></i>返回上一页
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `
<div class="flex flex-col items-center justify-center min-h-screen p-8 text-center fade-in">
<div class="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
<i class="fas fa-map-marked-alt text-4xl text-slate-400"></i>
</div>
<h1 class="text-6xl font-bold text-slate-800 mb-4">404</h1>
<h2 class="text-2xl font-semibold text-slate-600 mb-2">页面未找到</h2>
<p class="text-slate-500 mb-8 max-w-md">
${routeId ? `路由 "${routeId}" 不存在或尚未开发。` : '您访问的页面不存在。'}
</p>
<div class="flex gap-4">
<button
onclick="window.location.hash = ''; window.location.reload()"
class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
<i class="fas fa-home mr-2"></i>返回首页
</button>
<button
onclick="window.history.back()"
class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
<i class="fas fa-arrow-left mr-2"></i>返回上一页

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `
<div class="flex flex-col items-center justify-center min-h-screen p-8 text-center fade-in">
<div class="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
<i class="fas fa-map-marked-alt text-4xl text-slate-400"></i>
</div>
<h1 class="text-6xl font-bold text-slate-800 mb-4">404</h1>
<h2 class="text-2xl font-semibold text-slate-600 mb-2">页面未找到</h2>
<p class="text-slate-500 mb-8 max-w-md">
${routeId ? `路由 "${routeId}" 不存在或尚未开发。` : '您访问的页面不存在。'}
</p>
<div class="flex gap-4">
<button
onclick="window.location.hash = ''; window.location.reload()"
class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
<i class="fas fa-home mr-2"></i>返回首页
</button>
<button
onclick="window.history.back()"
class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
<i class="fas fa-arrow-left mr-2"></i>返回上一页
```

---

#### 🔴 风险 #2 - 第 54 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="flex flex-col items-center justify-center min-h-screen p-8 text-center fade-in">
<div class="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
<i class="fas fa-exclamation-triangle text-4xl text-red-500"></i>
</div>
<h1 class="text-4xl font-bold text-slate-800 mb-4">页面加载失败</h1>
<p class="text-slate-600 mb-2">
${routeId ? `路由 "${routeId}" 加载时发生错误` : '页面加载时发生错误'}
</p>
<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-2xl">
<p class="text-sm text-red-700 font-mono text-left break-words">
${errorMessage}
</p>
${errorStack ? `
<details class="mt-2">
<summary class="text-xs text-red-600 cursor-pointer hover:text-red-700">
查看详细信息
</summary>
<pre class="text-xs text-red-600 mt-2 text-left overflow-auto max-h-40">${errorStack}</pre>
</details>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `
<div class="flex flex-col items-center justify-center min-h-screen p-8 text-center fade-in">
<div class="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
<i class="fas fa-exclamation-triangle text-4xl text-red-500"></i>
</div>
<h1 class="text-4xl font-bold text-slate-800 mb-4">页面加载失败</h1>
<p class="text-slate-600 mb-2">
${routeId ? `路由 "${routeId}" 加载时发生错误` : '页面加载时发生错误'}
</p>
<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-2xl">
<p class="text-sm text-red-700 font-mono text-left break-words">
${errorMessage}
</p>
${errorStack ? `
<details class="mt-2">
<summary class="text-xs text-red-600 cursor-pointer hover:text-red-700">
查看详细信息
</summary>
<pre class="text-xs text-red-600 mt-2 text-left overflow-auto max-h-40">${errorStack}</pre>
</details>

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `
<div class="flex flex-col items-center justify-center min-h-screen p-8 text-center fade-in">
<div class="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
<i class="fas fa-exclamation-triangle text-4xl text-red-500"></i>
</div>
<h1 class="text-4xl font-bold text-slate-800 mb-4">页面加载失败</h1>
<p class="text-slate-600 mb-2">
${routeId ? `路由 "${routeId}" 加载时发生错误` : '页面加载时发生错误'}
</p>
<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-2xl">
<p class="text-sm text-red-700 font-mono text-left break-words">
${errorMessage}
</p>
${errorStack ? `
<details class="mt-2">
<summary class="text-xs text-red-600 cursor-pointer hover:text-red-700">
查看详细信息
</summary>
<pre class="text-xs text-red-600 mt-2 text-left overflow-auto max-h-40">${errorStack}</pre>
</details>
```

---

### 16. `src\modules\amz_hub\views\practice\promotions\index.js`

**风险评分**: 20 | **风险数量**: 3 | 🔴 1 严重 | 🟠 1 高危

#### 🔴 风险 #1 - 第 516 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
contentContainer.innerHTML = promoData.map(section => `
<div id="${section.id}" class="amzp_card">
<div class="amzp_card_header">
<i class="fas ${section.icon} amzp_card_icon" style="font-size:1.5rem; color: #566ce8;"></i>
<h2 class="amzp_card_title">${section.title}</h2>
</div>
${this.renderSectionBody(section.content)}
</div>
`).join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
contentContainer.innerHTML = promoData.map(section => `
<div id="${section.id}" class="amzp_card">
<div class="amzp_card_header">
<i class="fas ${section.icon} amzp_card_icon" style="font-size:1.5rem; color: #566ce8;"></i>
<h2 class="amzp_card_title">${section.title}</h2>
</div>
${this.renderSectionBody(section.content)}
</div>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentContainer.textContent = promoData.map(section => `
<div id="${section.id}" class="amzp_card">
<div class="amzp_card_header">
<i class="fas ${section.icon} amzp_card_icon" style="font-size:1.5rem; color: #566ce8;"></i>
<h2 class="amzp_card_title">${section.title}</h2>
</div>
${this.renderSectionBody(section.content)}
</div>
`).join('');
```

---

#### 🟠 风险 #2 - 第 473 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用模板字符串  
**代码片段**:
```javascript
navContainer.innerHTML = navStructure.map(node => {
if (node.type === 'root') {
return `
<div class="amzp_nav_group" id="nav_group_${node.id}">
<a href="javascript:void(0)" class="amzp_nav_header"
id="nav_header_${node.id}"
onclick="window.amzp_scrollTo('${node.id}')">
${node.label}
</a>
</div>
`;
} else if (node.type === 'group') {
const childrenHtml = node.children.map(child => `
<a href="javascript:void(0)" class="amzp_sub_link"
id="nav_link_${child.id}"
onclick="window.amzp_scrollTo('${child.id}')">
${child.label}
</a>
`).join('');

```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
navContainer.innerHTML = navStructure.map(node => {
if (node.type === 'root') {
return `
<div class="amzp_nav_group" id="nav_group_${node.id}">
<a href="javascript:void(0)" class="amzp_nav_header"
id="nav_header_${node.id}"
onclick="window.amzp_scrollTo('${node.id}')">
${node.label}
</a>
</div>
`;
} else if (node.type === 'group') {
const childrenHtml = node.children.map(child => `
<a href="javascript:void(0)" class="amzp_sub_link"
id="nav_link_${child.id}"
onclick="window.amzp_scrollTo('${child.id}')">
${child.label}
</a>
`).join('');


// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
navContainer.textContent = navStructure.map(node => {
if (node.type === 'root') {
return `
<div class="amzp_nav_group" id="nav_group_${node.id}">
<a href="javascript:void(0)" class="amzp_nav_header"
id="nav_header_${node.id}"
onclick="window.amzp_scrollTo('${node.id}')">
${node.label}
</a>
</div>
`;
} else if (node.type === 'group') {
const childrenHtml = node.children.map(child => `
<a href="javascript:void(0)" class="amzp_sub_link"
id="nav_link_${child.id}"
onclick="window.amzp_scrollTo('${child.id}')">
${child.label}
</a>
`).join('');

```

---

#### 🟢 风险 #3 - 第 439 行

**风险等级**: LOW (3分)  
**风险原因**: 静态模板加载  
**代码片段**:
```javascript
this.container.innerHTML = await loadTemplate('src/modules/amz_hub/views/practice/promotions/template.html');
```

**修复建议**: ✅ 低风险: 确认为静态内容或已安全处理

---

### 17. `src\components\settings\systemSettings.js`

**风险评分**: 15 | **风险数量**: 2 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 412 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
statusEl.innerHTML = `
<span class="status-dot status-pending pulse-dot"></span>
<span class="text-slate-500 text-xs italic">等待API配置...</span>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
statusEl.innerHTML = `
<span class="status-dot status-pending pulse-dot"></span>
<span class="text-slate-500 text-xs italic">等待API配置...</span>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
statusEl.textContent = `
<span class="status-dot status-pending pulse-dot"></span>
<span class="text-slate-500 text-xs italic">等待API配置...</span>
`;
```

---

#### 🟡 风险 #2 - 第 402 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
statusEl.innerHTML = `
<span class="status-dot status-success"></span>
<span class="text-slate-600 text-xs font-medium flex items-center gap-1">
${escapeHtml(PROVIDERS[provider].name)}: <span class="font-mono text-blue-600">${escapeHtml(config.model)}</span>
</span>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 18. `src\modules\more\views\overview\index.js`

**风险评分**: 15 | **风险数量**: 2 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 23 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="p-10 text-center text-red-500">
<i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
<p>页面加载失败</p>
</div>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `
<div class="p-10 text-center text-red-500">
<i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
<p>页面加载失败</p>
</div>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `
<div class="p-10 text-center text-red-500">
<i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
<p>页面加载失败</p>
</div>
`;
```

---

#### 🟡 风险 #2 - 第 13 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 19. `src\main.js`

**风险评分**: 14 | **风险数量**: 2 | 🟠 2 高危

#### 🟠 风险 #1 - 第 53 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
guideContainer.innerHTML = userGuideModalHtml;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
guideContainer.innerHTML = userGuideModalHtml;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
guideContainer.textContent = userGuideModalHtml;
```

---

#### 🟠 风险 #2 - 第 68 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
temp.innerHTML = promptModalHtml;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
temp.innerHTML = promptModalHtml;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
temp.textContent = promptModalHtml;
```

---

### 20. `src\common\BaseModule.js`

**风险评分**: 12 | **风险数量**: 2 | 🟠 1 高危

#### 🟠 风险 #1 - 第 287 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
this.container.innerHTML = '<div class="p-10 text-center"><i class="fas fa-spinner fa-spin text-slate-400"></i></div>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
this.container.innerHTML = '<div class="p-10 text-center"><i class="fas fa-spinner fa-spin text-slate-400"></i></div>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
this.container.textContent = '<div class="p-10 text-center"><i class="fas fa-spinner fa-spin text-slate-400"></i></div>';
```

---

#### 🟡 风险 #2 - 第 269 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
this.container.innerHTML = `
<div class="flex flex-col items-center justify-center p-12 text-center h-full fade-in">
<div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
<i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
</div>
<h3 class="text-lg font-bold text-slate-800 mb-2">模块加载失败 (${escapeHtml(this.moduleId)})</h3>
<p class="text-sm text-slate-500 mb-6 max-w-md break-words">${escapeHtml(error.message)}</p>
<button id="retry-btn-${escapeHtml(this.moduleId)}" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
<i class="fas fa-redo mr-2"></i>重试
</button>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 21. `src\common\utils\ModuleLoader.js`

**风险评分**: 10 | **风险数量**: 1 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 222 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="p-10 text-center">
<i class="fas fa-circle-notch fa-spin text-orange-500"></i>
<span class="ml-2 text-slate-500">连接超时，正在重试...</span>
</div>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = `
<div class="p-10 text-center">
<i class="fas fa-circle-notch fa-spin text-orange-500"></i>
<span class="ml-2 text-slate-500">连接超时，正在重试...</span>
</div>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = `
<div class="p-10 text-center">
<i class="fas fa-circle-notch fa-spin text-orange-500"></i>
<span class="ml-2 text-slate-500">连接超时，正在重试...</span>
</div>
`;
```

---

### 22. `src\common\utils\viewLoader.js`

**风险评分**: 10 | **风险数量**: 2 

#### 🟡 风险 #1 - 第 140 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.insertAdjacentHTML('beforeend', errorHtml);
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 182 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.insertAdjacentHTML('beforeend', html);
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 23. `src\modules\app_center\views\keyword_hunter\input\index.js`

**风险评分**: 10 | **风险数量**: 2 

#### 🟡 风险 #1 - 第 194 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
layer.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 385 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 24. `src\modules\amz_hub\views\knowledge\eu_insights\index.js`

**风险评分**: 8 | **风险数量**: 2 

#### 🟡 风险 #1 - 第 42 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
details.innerHTML = `
<div class="flex items-center justify-between mb-4">
<h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
<span class="text-3xl">${this.getFlagEmoji(code)}</span> ${escapeHtml(data.name)}
</h2>
<span class="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase rounded-full">Mature Market</span>
</div>
<div class="space-y-4">
<div>
<h4 class="text-xs font-bold uppercase text-slate-400 mb-1">核心画像 (Persona)</h4>
<p class="text-sm text-slate-700 leading-relaxed">${escapeHtml(data.traits)}</p>
</div>
<div>
<h4 class="text-xs font-bold uppercase text-slate-400 mb-1">运营建议 (Strategy)</h4>
<div class="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
${escapeHtml(data.tips)}
</div>
</div>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟢 风险 #2 - 第 15 行

**风险等级**: LOW (3分)  
**风险原因**: 静态模板加载  
**代码片段**:
```javascript
this.container.innerHTML = await loadTemplate('src/modules/amz_hub/views/knowledge/eu_insights/template.html');
```

**修复建议**: ✅ 低风险: 确认为静态内容或已安全处理

---

### 25. `src\components\modal\AppModal.js`

**风险评分**: 7 | **风险数量**: 1 | 🟠 1 高危

#### 🟠 风险 #1 - 第 143 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用模板字符串  
**代码片段**:
```javascript
this.shadowRoot.innerHTML = `
<style>
:host { display: block; z-index: 1000; position: relative; }
.hidden { display: none !important; }

/* Transition Basics */
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 300ms; }
.opacity-0 { opacity: 0; }
.opacity-100 { opacity: 1; }
.scale-95 { transform: scale(0.95); }
.scale-100 { transform: scale(1); }
.translate-y-0 { transform: translateY(0); }
.translate-y-4 { transform: translateY(1rem); }

/* Re-implementing key Tailwind utilities needed for the shell */
.fixed { position: fixed; }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.z-50 { z-index: 50; }
.flex { display: flex; }
.items-center { align-items: center; }
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
this.shadowRoot.innerHTML = `
<style>
:host { display: block; z-index: 1000; position: relative; }
.hidden { display: none !important; }

/* Transition Basics */
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 300ms; }
.opacity-0 { opacity: 0; }
.opacity-100 { opacity: 1; }
.scale-95 { transform: scale(0.95); }
.scale-100 { transform: scale(1); }
.translate-y-0 { transform: translateY(0); }
.translate-y-4 { transform: translateY(1rem); }

/* Re-implementing key Tailwind utilities needed for the shell */
.fixed { position: fixed; }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.z-50 { z-index: 50; }
.flex { display: flex; }
.items-center { align-items: center; }

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
this.shadowRoot.textContent = `
<style>
:host { display: block; z-index: 1000; position: relative; }
.hidden { display: none !important; }

/* Transition Basics */
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 300ms; }
.opacity-0 { opacity: 0; }
.opacity-100 { opacity: 1; }
.scale-95 { transform: scale(0.95); }
.scale-100 { transform: scale(1); }
.translate-y-0 { transform: translateY(0); }
.translate-y-4 { transform: translateY(1rem); }

/* Re-implementing key Tailwind utilities needed for the shell */
.fixed { position: fixed; }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.z-50 { z-index: 50; }
.flex { display: flex; }
.items-center { align-items: center; }
```

---

### 26. `src\common\components\OverviewRenderer.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 69 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
this.container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 27. `src\common\components\SidebarRenderer.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 89 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 28. `src\common\utils\security.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 139 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 29. `src\modules\amz_hub\views\advanced\conversion_optimization\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 12 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = templateHTML;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 30. `src\modules\amz_hub\views\advanced\new_product_30days\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 12 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = templateHTML;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 31. `src\modules\amz_hub\views\overview\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 13 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 32. `src\modules\amz_hub\views\practice\quality_listing\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 12 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = templateHTML;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 33. `src\modules\app_center\views\master_prompt\scraper\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 312 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 34. `src\modules\app_center\views\overview\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 35. `src\modules\home\homeDisplay.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 47 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
this.container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 36. `src\modules\more\views\explore\agents\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 37. `src\modules\more\views\explore\workflows\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 38. `src\modules\sops\views\backend\fba_shipping\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 39. `src\modules\sops\views\backend\inventory_replenishment\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 40. `src\modules\sops\views\backend\procurement_qc\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 41. `src\modules\sops\views\growth\competitor_monitoring\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 42. `src\modules\sops\views\growth\listing_seo\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 43. `src\modules\sops\views\growth\ppc_advertising\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 44. `src\modules\sops\views\growth\promotion_submission\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 102 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 45. `src\modules\sops\views\growth\restricted_words\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 9 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 46. `src\modules\sops\views\overview\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 47. `src\modules\sops\views\safety\account_security\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 48. `src\modules\sops\views\safety\brand_infringement\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 49. `src\modules\sops\views\safety\eu_gpsr_compliance\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 50. `src\modules\sops\views\safety\performance_notification\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 51. `src\modules\sops\views\safety\permission_management\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 52. `src\modules\sops\views\safety\product_compliance\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 53. `src\modules\sops\views\service\negative_review\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 54. `src\modules\sops\views\service\qa_maintenance\index.js`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 7 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 55. `src\modules\amz_hub\views\knowledge\ecosystem\index.js`

**风险评分**: 3 | **风险数量**: 1 

#### 🟢 风险 #1 - 第 14 行

**风险等级**: LOW (3分)  
**风险原因**: 静态模板加载  
**代码片段**:
```javascript
this.container.innerHTML = await loadTemplate('src/modules/amz_hub/views/knowledge/ecosystem/template.html');
```

**修复建议**: ✅ 低风险: 确认为静态内容或已安全处理

---

### 56. `src\modules\amz_hub\views\knowledge\seo_strategy\index.js`

**风险评分**: 3 | **风险数量**: 1 

#### 🟢 风险 #1 - 第 14 行

**风险等级**: LOW (3分)  
**风险原因**: 静态模板加载  
**代码片段**:
```javascript
this.container.innerHTML = await loadTemplate('src/modules/amz_hub/views/knowledge/seo_strategy/template.html');
```

**修复建议**: ✅ 低风险: 确认为静态内容或已安全处理

---


## 🔧 修复指南

### 方法1: 使用 escapeHtml (推荐)

```javascript
import { escapeHtml } from '@/common/utils/security.js';

// ❌ 危险
element.innerHTML = `<div>${userInput}</div>`;

// ✅ 安全
element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
```

### 方法2: 使用 setTemplate

```javascript
import { setTemplate } from '@/common/utils/xssFixer.js';

// ❌ 危险
element.innerHTML = `<div class="title">${product.title}</div>`;

// ✅ 安全
setTemplate(element, '<div class="title">${title}</div>', { title: product.title });
```

### 方法3: 使用 renderList (列表渲染)

```javascript
import { renderList } from '@/common/utils/xssFixer.js';

// ❌ 危险
container.innerHTML = products.map(p => `<div>${p.title}</div>`).join('');

// ✅ 安全
renderList(container, products, (p) => `<div>${p.title}</div>`);
```

### 方法4: 纯文本使用 textContent

```javascript
// ❌ 危险
element.innerHTML = userInput;

// ✅ 安全
element.textContent = userInput;
```

---

## 📝 自动修复脚本

运行以下命令生成修复补丁:

```bash
node tools/xss-fixer.js --auto-fix
```

---

**报告生成**: XSS Scanner v1.0  
**下次扫描**: 修复后重新运行 `node tools/xss-scanner.js`
