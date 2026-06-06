# XSS风险扫描报告

**扫描时间**: 2026/6/7 03:26:00  
**扫描目录**: `src/`  
**扫描文件数**: 313  
**命中文件数**: 52  
**发现风险点**: 110

---

## 📊 风险统计

| 风险等级 | 数量 | 占比 |
|---------|------|------|
| 🔴 严重 (CRITICAL) | 12 | 10.9% |
| 🟠 高危 (HIGH) | 14 | 12.7% |
| 🟡 中危 (MEDIUM) | 81 | 73.6% |
| 🟢 低危 (LOW) | 0 | 0.0% |
| ⚪ 信息 (INFO) | 3 | 2.7% |

---

## 🎯 修复优先级

### 立即修复 (P0)
需要在发布前修复的严重和高危风险: **26** 处

### 计划修复 (P1)
建议在下个版本修复的中危风险: **81** 处

### 可选修复 (P2)
低风险和信息级别: **3** 处

---

## 📋 详细风险列表

### 1. `..\src\common\devtools\PerformanceMonitor.ts`

**风险评分**: 55 | **风险数量**: 7 | 🔴 2 严重 | 🟠 5 高危

#### 🔴 风险 #1 - 第 79 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
this.container.innerHTML = `
<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #444;">
<strong style="font-size: 14px;">⚡ Performance Monitor</strong>
<button id="perf-close" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 0;">×</button>
</div>
<div id="perf-tabs" style="display: flex; border-bottom: 1px solid #444; background: rgba(255,255,255,0.05);"></div>
<div id="perf-content" style="padding: 12px; max-height: 500px; overflow-y: auto;"></div>
<div style="padding: 8px 12px; border-top: 1px solid #444; font-size: 10px; color: #888; text-align: center;">
Ctrl+Shift+P to toggle
</div>
`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
this.container.innerHTML = `
<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #444;">
<strong style="font-size: 14px;">⚡ Performance Monitor</strong>
<button id="perf-close" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 0;">×</button>
</div>
<div id="perf-tabs" style="display: flex; border-bottom: 1px solid #444; background: rgba(255,255,255,0.05);"></div>
<div id="perf-content" style="padding: 12px; max-height: 500px; overflow-y: auto;"></div>
<div style="padding: 8px 12px; border-top: 1px solid #444; font-size: 10px; color: #888; text-align: center;">
Ctrl+Shift+P to toggle
</div>
`;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
this.container.textContent = `
<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #444;">
<strong style="font-size: 14px;">⚡ Performance Monitor</strong>
<button id="perf-close" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 0;">×</button>
</div>
<div id="perf-tabs" style="display: flex; border-bottom: 1px solid #444; background: rgba(255,255,255,0.05);"></div>
<div id="perf-content" style="padding: 12px; max-height: 500px; overflow-y: auto;"></div>
<div style="padding: 8px 12px; border-top: 1px solid #444; font-size: 10px; color: #888; text-align: center;">
Ctrl+Shift+P to toggle
</div>
`;
```

---

#### 🔴 风险 #2 - 第 116 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
tabsDiv.innerHTML = tabs.map(tab => `
<button
data-tab="${tab.id}"
style="
flex: 1;
padding: 8px;
background: ${this.currentTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent'};
border: none;
color: ${this.currentTab === tab.id ? '#fff' : '#aaa'};
cursor: pointer;
font-size: 11px;
border-bottom: 2px solid ${this.currentTab === tab.id ? '#0f0' : 'transparent'};
"
>
${tab.icon} ${tab.label}
</button>
`).join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
tabsDiv.innerHTML = tabs.map(tab => `
<button
data-tab="${tab.id}"
style="
flex: 1;
padding: 8px;
background: ${this.currentTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent'};
border: none;
color: ${this.currentTab === tab.id ? '#fff' : '#aaa'};
cursor: pointer;
font-size: 11px;
border-bottom: 2px solid ${this.currentTab === tab.id ? '#0f0' : 'transparent'};
"
>
${tab.icon} ${tab.label}
</button>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
tabsDiv.textContent = tabs.map(tab => `
<button
data-tab="${tab.id}"
style="
flex: 1;
padding: 8px;
background: ${this.currentTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent'};
border: none;
color: ${this.currentTab === tab.id ? '#fff' : '#aaa'};
cursor: pointer;
font-size: 11px;
border-bottom: 2px solid ${this.currentTab === tab.id ? '#0f0' : 'transparent'};
"
>
${tab.icon} ${tab.label}
</button>
`).join('');
```

---

#### 🟠 风险 #3 - 第 153 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
contentDiv.innerHTML = this.renderOverview();
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
contentDiv.innerHTML = this.renderOverview();

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentDiv.textContent = this.renderOverview();
```

---

#### 🟠 风险 #4 - 第 156 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
contentDiv.innerHTML = this.renderPerformance();
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
contentDiv.innerHTML = this.renderPerformance();

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentDiv.textContent = this.renderPerformance();
```

---

#### 🟠 风险 #5 - 第 159 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
contentDiv.innerHTML = this.renderErrors();
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
contentDiv.innerHTML = this.renderErrors();

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentDiv.textContent = this.renderErrors();
```

---

#### 🟠 风险 #6 - 第 162 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
contentDiv.innerHTML = this.renderAnalytics();
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
contentDiv.innerHTML = this.renderAnalytics();

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentDiv.textContent = this.renderAnalytics();
```

---

#### 🟠 风险 #7 - 第 165 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
contentDiv.innerHTML = this.renderAlerts();
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
contentDiv.innerHTML = this.renderAlerts();

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentDiv.textContent = this.renderAlerts();
```

---

### 2. `..\src\common\devtools\MemoryDevTools.ts`

**风险评分**: 37 | **风险数量**: 4 | 🔴 3 严重 | 🟠 1 高危

#### 🔴 风险 #1 - 第 64 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
panel.innerHTML = `
<div style="display: flex; flex-direction: column; height: 100%;">
<!-- Header -->
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; display: flex; justify-content: space-between; align-items: center; border-radius: 6px 6px 0 0;">
<div style="display: flex; items-center: gap: 8px;">
<i class="fas fa-memory" style="font-size: 16px;"></i>
<span style="font-weight: bold; font-size: 14px;">内存监控</span>
</div>
<button id="memory-devtools-close" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 16px;">✕</button>
</div>

<!-- Current Memory -->
<div style="padding: 12px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
<div style="font-weight: bold; color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">当前内存使用</div>
<div id="memory-current" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
<div style="background: white; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
<div style="color: #6b7280; font-size: 10px;">已用堆内存</div>
<div id="heap-used" style="font-size: 18px; font-weight: bold; color: #667eea;">-</div>
</div>
<div style="background: white; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
panel.innerHTML = `
<div style="display: flex; flex-direction: column; height: 100%;">
<!-- Header -->
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; display: flex; justify-content: space-between; align-items: center; border-radius: 6px 6px 0 0;">
<div style="display: flex; items-center: gap: 8px;">
<i class="fas fa-memory" style="font-size: 16px;"></i>
<span style="font-weight: bold; font-size: 14px;">内存监控</span>
</div>
<button id="memory-devtools-close" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 16px;">✕</button>
</div>

<!-- Current Memory -->
<div style="padding: 12px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
<div style="font-weight: bold; color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">当前内存使用</div>
<div id="memory-current" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
<div style="background: white; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
<div style="color: #6b7280; font-size: 10px;">已用堆内存</div>
<div id="heap-used" style="font-size: 18px; font-weight: bold; color: #667eea;">-</div>
</div>
<div style="background: white; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
panel.textContent = `
<div style="display: flex; flex-direction: column; height: 100%;">
<!-- Header -->
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; display: flex; justify-content: space-between; align-items: center; border-radius: 6px 6px 0 0;">
<div style="display: flex; items-center: gap: 8px;">
<i class="fas fa-memory" style="font-size: 16px;"></i>
<span style="font-weight: bold; font-size: 14px;">内存监控</span>
</div>
<button id="memory-devtools-close" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 16px;">✕</button>
</div>

<!-- Current Memory -->
<div style="padding: 12px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
<div style="font-weight: bold; color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">当前内存使用</div>
<div id="memory-current" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
<div style="background: white; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
<div style="color: #6b7280; font-size: 10px;">已用堆内存</div>
<div id="heap-used" style="font-size: 18px; font-weight: bold; color: #667eea;">-</div>
</div>
<div style="background: white; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
```

---

#### 🔴 风险 #2 - 第 226 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
snapshotsEl.innerHTML = snapshots
.slice()
.reverse()
.map((snapshot, index) => {
const time = new Date(snapshot.timestamp).toLocaleTimeString('zh-CN');
return `
<div style="padding: 6px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; ${index === 0 ? 'background: #fef3c7;' : ''}">
<span style="color: #6b7280;">${time}</span>
<span style="color: #667eea; font-weight: 600;">${snapshot.heapUsed.toFixed(1)} MB</span>
</div>
`;
})
.join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
snapshotsEl.innerHTML = snapshots
.slice()
.reverse()
.map((snapshot, index) => {
const time = new Date(snapshot.timestamp).toLocaleTimeString('zh-CN');
return `
<div style="padding: 6px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; ${index === 0 ? 'background: #fef3c7;' : ''}">
<span style="color: #6b7280;">${time}</span>
<span style="color: #667eea; font-weight: 600;">${snapshot.heapUsed.toFixed(1)} MB</span>
</div>
`;
})
.join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
snapshotsEl.textContent = snapshots
.slice()
.reverse()
.map((snapshot, index) => {
const time = new Date(snapshot.timestamp).toLocaleTimeString('zh-CN');
return `
<div style="padding: 6px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; ${index === 0 ? 'background: #fef3c7;' : ''}">
<span style="color: #6b7280;">${time}</span>
<span style="color: #667eea; font-weight: 600;">${snapshot.heapUsed.toFixed(1)} MB</span>
</div>
`;
})
.join('');
```

---

#### 🔴 风险 #3 - 第 258 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
leakListEl.innerHTML = leaks
.map(leak => {
const color = leak.severity === 'critical' ? '#ef4444' : '#f59e0b';
return `
<div style="padding: 6px; border-left: 3px solid ${color}; background: #fef2f2; margin-bottom: 6px; border-radius: 4px;">
<div style="font-weight: 600; color: ${color};">${leak.event}</div>
<div style="color: #6b7280; font-size: 10px;">${leak.message}</div>
</div>
`;
})
.join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
leakListEl.innerHTML = leaks
.map(leak => {
const color = leak.severity === 'critical' ? '#ef4444' : '#f59e0b';
return `
<div style="padding: 6px; border-left: 3px solid ${color}; background: #fef2f2; margin-bottom: 6px; border-radius: 4px;">
<div style="font-weight: 600; color: ${color};">${leak.event}</div>
<div style="color: #6b7280; font-size: 10px;">${leak.message}</div>
</div>
`;
})
.join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
leakListEl.textContent = leaks
.map(leak => {
const color = leak.severity === 'critical' ? '#ef4444' : '#f59e0b';
return `
<div style="padding: 6px; border-left: 3px solid ${color}; background: #fef2f2; margin-bottom: 6px; border-radius: 4px;">
<div style="font-weight: 600; color: ${color};">${leak.event}</div>
<div style="color: #6b7280; font-size: 10px;">${leak.message}</div>
</div>
`;
})
.join('');
```

---

#### 🟠 风险 #4 - 第 221 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
snapshotsEl.innerHTML = '<div style="color: #9ca3af; text-align: center; padding: 20px;">暂无快照</div>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
snapshotsEl.innerHTML = '<div style="color: #9ca3af; text-align: center; padding: 20px;">暂无快照</div>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
snapshotsEl.textContent = '<div style="color: #9ca3af; text-align: center; padding: 20px;">暂无快照</div>';
```

---

### 3. `..\src\modules\app_center\views\keyword_hunter\analysis\index.ts`

**风险评分**: 36 | **风险数量**: 6 | 🟠 3 高危

#### 🟠 风险 #1 - 第 325 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
newContent.innerHTML = buildHtml(phases[phaseIndex]!);
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
newContent.innerHTML = buildHtml(phases[phaseIndex]!);

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
newContent.textContent = buildHtml(phases[phaseIndex]!);
```

---

#### 🟠 风险 #2 - 第 657 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
retryBtn.innerHTML = '<i class="fas fa-redo text-[10px]"></i> 重试';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
retryBtn.innerHTML = '<i class="fas fa-redo text-[10px]"></i> 重试';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
retryBtn.textContent = '<i class="fas fa-redo text-[10px]"></i> 重试';
```

---

#### 🟠 风险 #3 - 第 667 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
resultDiv.innerHTML = "";
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
resultDiv.innerHTML = "";

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultDiv.textContent = "";
```

---

#### 🟡 风险 #4 - 第 436 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
td2.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 452 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
td2.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 485 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
td2.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 4. `..\src\modules\amz_hub\views\practice\marketing_calendar\index.ts`

**风险评分**: 35 | **风险数量**: 6 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 589 行

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

#### 🟡 风险 #2 - 第 501 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 545 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 556 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="amzf_stat_item">
<div class="amzf_stat_icon amzf_blue"><i class="fa-solid fa-timeline text-purple-500"></i></div>
<div>
<div class="amzf_stat_value">${escapeHtml(filtered.length.toString())}</div>
<div class="amzf_stat_label">营销节点</div>
</div>
</div>
<div class="amzf_stat_item">
<div class="amzf_stat_icon amzf_green"><i class="fas fa-gifts text-purple-500"></i></div>
<div>
<div class="amzf_stat_value">${escapeHtml(holidays.toString())}</div>
<div class="amzf_stat_label">重要节日</div>
</div>
</div>
<div class="amzf_stat_item">
<div class="amzf_stat_icon amzf_orange"><i class="fas fa-shopping-cart text-purple-500"></i></div>
<div>
<div class="amzf_stat_value">${escapeHtml(shopping.toString())}</div>
<div class="amzf_stat_label">电商大促</div>
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 643 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 704 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 5. `..\src\components\ErrorBoundary.ts`

**风险评分**: 30 | **风险数量**: 5 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 160 行

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
<button data-action="reload-page-timeout"
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
<button data-action="reload-page-timeout"
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
<button data-action="reload-page-timeout"
class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
<i class="fas fa-redo mr-2"></i>刷新页面
</button>
</div>
`;
```

---

#### 🟡 风险 #2 - 第 60 行

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
${reloadButton}
${retryButton}
</div>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 108 行

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

#### 🟡 风险 #4 - 第 127 行

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

#### 🟡 风险 #5 - 第 143 行

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

### 6. `..\src\modules\app_center\views\keyword_hunter\process\index.ts`

**风险评分**: 30 | **风险数量**: 6 

#### 🟡 风险 #1 - 第 316 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
freqList.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 509 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
display.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 519 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
tempDiv.innerHTML = para.original;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 546 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
display.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 695 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
allContainer.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 754 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
allContainer.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 7. `..\src\common\infrastructure\SafeModuleLoader.ts`

**风险评分**: 27 | **风险数量**: 5 | 🟠 1 高危

#### 🟠 风险 #1 - 第 851 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
container.innerHTML = moduleData;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
container.innerHTML = moduleData;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = moduleData;
```

---

#### 🟡 风险 #2 - 第 873 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = `
<div class="flex items-center justify-center p-8">
<div class="text-center">
<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
<p class="text-gray-600">${this.escapeHtml(text)}</p>
</div>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 904 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 908 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = this.interpolateFallbackTemplate(customFallback, error, modulePath);
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 915 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = errorUI;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 8. `..\src\common\infrastructure\SafeRenderer.ts`

**风险评分**: 27 | **风险数量**: 7 

#### 🟡 风险 #1 - 第 120 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = template;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 179 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = interpolated;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 241 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 271 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 386 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
temp.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### ⚪ 风险 #6 - 第 175 行

**风险等级**: INFO (1分)  
**风险原因**: 已使用安全函数  
**代码片段**:
```javascript
container.innerHTML = this.sanitizeHtml(interpolated, options);
```

**修复建议**: ℹ️ 信息: 已使用安全函数,无需修改

---

#### ⚪ 风险 #7 - 第 268 行

**风险等级**: INFO (1分)  
**风险原因**: 已使用安全函数  
**代码片段**:
```javascript
element.innerHTML = this.sanitizeHtml(html, options);
```

**修复建议**: ℹ️ 信息: 已使用安全函数,无需修改

---

### 9. `..\src\common\utils\xssFixer.ts`

**风险评分**: 26 | **风险数量**: 6 

#### 🟡 风险 #1 - 第 33 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 64 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 80 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 87 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = items.map((item, index) => renderItem(item, index)).join('');
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 91 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### ⚪ 风险 #6 - 第 22 行

**风险等级**: INFO (1分)  
**风险原因**: 已使用安全函数  
**代码片段**:
```javascript
* 用于替换所有 element.innerHTML = xxx 的场景
*/
export function setInnerHTML(element: HTMLElement, html: string, trusted: boolean = false): void {
if (!element) {
console.warn('[XSSFixer] Element is null or undefined');
return;
}

if (trusted) {
// 信任的内容(如静态模板),直接设置
// ✅ 安全: 静态HTML模板，无用户输入
element.innerHTML = html;
} else {
// 不信任的内容,使用安全方法
setSafeHtml(element, html);
}
}

/**
* 安全的模板渲染 (自动转义变量)
```

**修复建议**: ℹ️ 信息: 已使用安全函数,无需修改

---

### 10. `..\src\common\ui\megaMenu.ts`

**风险评分**: 20 | **风险数量**: 4 

#### 🟡 风险 #1 - 第 483 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 486 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = renderErrorCard();
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 516 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 519 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = renderErrorCard();
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 11. `..\src\modules\amz_hub\views\practice\promo_tools\index.ts`

**风险评分**: 20 | **风险数量**: 2 | 🔴 2 严重 

#### 🔴 风险 #1 - 第 523 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
navContainer.innerHTML = `
<div class="amzpt_anchor_nav">
<div class="amzpt_anchor_header">
<div>
<span class="amzpt_anchor_eyebrow">PROMOTION TOOL MAP</span>
<h2 class="amzpt_anchor_title">欧洲站促销工具总览（运营工具版）</h2>
<p class="amzpt_anchor_desc">
本页专门解决“用什么工具、什么时候适合用、工具之间能否叠加、哪些场景不要误用”；如果你要看 Prime Day、BFCM 等节点的推进节奏与执行 SOP，请配合“促销活动”页一起使用。
</p>

</div>
<div class="amzpt_anchor_tip">
<i class="fas fa-hand-pointer"></i>
<span>点击卡片直达对应工具章节</span>
</div>
</div>
<div class="amzpt_process_nav">
${promoData
.map(
(section, index) => `
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
navContainer.innerHTML = `
<div class="amzpt_anchor_nav">
<div class="amzpt_anchor_header">
<div>
<span class="amzpt_anchor_eyebrow">PROMOTION TOOL MAP</span>
<h2 class="amzpt_anchor_title">欧洲站促销工具总览（运营工具版）</h2>
<p class="amzpt_anchor_desc">
本页专门解决“用什么工具、什么时候适合用、工具之间能否叠加、哪些场景不要误用”；如果你要看 Prime Day、BFCM 等节点的推进节奏与执行 SOP，请配合“促销活动”页一起使用。
</p>

</div>
<div class="amzpt_anchor_tip">
<i class="fas fa-hand-pointer"></i>
<span>点击卡片直达对应工具章节</span>
</div>
</div>
<div class="amzpt_process_nav">
${promoData
.map(
(section, index) => `

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
navContainer.textContent = `
<div class="amzpt_anchor_nav">
<div class="amzpt_anchor_header">
<div>
<span class="amzpt_anchor_eyebrow">PROMOTION TOOL MAP</span>
<h2 class="amzpt_anchor_title">欧洲站促销工具总览（运营工具版）</h2>
<p class="amzpt_anchor_desc">
本页专门解决“用什么工具、什么时候适合用、工具之间能否叠加、哪些场景不要误用”；如果你要看 Prime Day、BFCM 等节点的推进节奏与执行 SOP，请配合“促销活动”页一起使用。
</p>

</div>
<div class="amzpt_anchor_tip">
<i class="fas fa-hand-pointer"></i>
<span>点击卡片直达对应工具章节</span>
</div>
</div>
<div class="amzpt_process_nav">
${promoData
.map(
(section, index) => `
```

---

#### 🔴 风险 #2 - 第 561 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
contentContainer.innerHTML = promoData
.map(
(section) => `
<section id="${section.id}" class="amzpt_card">
<div class="amzpt_card_header">
<i class="fas ${section.icon} amzpt_card_icon"></i>
<h2 class="amzpt_card_title">${section.title}</h2>
</div>
${this.renderSectionBody(section.content)}
</section>
`,
)
.join("");
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
contentContainer.innerHTML = promoData
.map(
(section) => `
<section id="${section.id}" class="amzpt_card">
<div class="amzpt_card_header">
<i class="fas ${section.icon} amzpt_card_icon"></i>
<h2 class="amzpt_card_title">${section.title}</h2>
</div>
${this.renderSectionBody(section.content)}
</section>
`,
)
.join("");

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
contentContainer.textContent = promoData
.map(
(section) => `
<section id="${section.id}" class="amzpt_card">
<div class="amzpt_card_header">
<i class="fas ${section.icon} amzpt_card_icon"></i>
<h2 class="amzpt_card_title">${section.title}</h2>
</div>
${this.renderSectionBody(section.content)}
</section>
`,
)
.join("");
```

---

### 12. `..\src\common\utils\ModuleLoader.ts`

**风险评分**: 15 | **风险数量**: 2 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 311 行

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

#### 🟡 风险 #2 - 第 273 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 13. `..\src\components\settings\systemSettings.ts`

**风险评分**: 15 | **风险数量**: 2 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 807 行

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

#### 🟡 风险 #2 - 第 797 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
statusEl.innerHTML = `
<span class="status-dot status-success"></span>
<span class="text-slate-600 text-xs font-medium flex items-center gap-1">
${escapeHtml(providerInfo.name)}: <span class="font-mono text-blue-600">${escapeHtml(config.model)}</span>
</span>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 14. `..\src\modules\app_center\views\playground\deep-chat\index.ts`

**风险评分**: 15 | **风险数量**: 3 

#### 🟡 风险 #1 - 第 441 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
modelSelect.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 836 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
button.innerHTML = icon;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 1035 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
list.innerHTML = sortedThreads.map((thread) => {
const isActive = thread.id === threadStore.activeThreadId;
const messageCount = thread.messages.length;
const meta = messageCount > 0
? `${messageCount} messages · ${formatThreadTime(thread.updatedAt)}`
: `Empty · ${formatThreadTime(thread.updatedAt)}`;

return `
<div class="playground-thread-item${isActive ? ' is-active' : ''}">
<button class="playground-thread-select" type="button" data-thread-id="${thread.id}">
<span class="playground-thread-icon">
<i class="far fa-message"></i>
</span>
<span class="playground-thread-copy">
<span class="playground-thread-name">${escapeHTML(thread.title)}</span>
<span class="playground-thread-meta">${escapeHTML(meta)}</span>
</span>
</button>
<button class="playground-thread-delete" type="button" data-delete-thread-id="${thread.id}" aria-label="删除会话 ${escapeHTML(thread.title)}" title="删除会话">
<i class="fas fa-trash"></i>
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 15. `..\src\modules\more\views\overview\index.ts`

**风险评分**: 15 | **风险数量**: 2 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 108 行

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

#### 🟡 风险 #2 - 第 98 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 16. `..\src\modules\app_center\views\master_analysis\scraper\template.html`

**风险评分**: 14 | **风险数量**: 2 | 🟠 2 高危

#### 🟠 风险 #1 - 第 653 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0"
style="opacity: 0; transition: opacity 0.2s, transform 0.2s, color 0.2s, background 0.2s;"
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript

```

---

#### 🟠 风险 #2 - 第 653 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0"
style="opacity: 0; transition: opacity 0.2s, transform 0.2s, color 0.2s, background 0.2s;"
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript

```

---

### 17. `..\src\components\navigation-animation.ts`

**风险评分**: 12 | **风险数量**: 2 | 🟠 1 高危

#### 🟠 风险 #1 - 第 140 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
this.container.innerHTML = newContent;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
this.container.innerHTML = newContent;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
this.container.textContent = newContent;
```

---

#### 🟡 风险 #2 - 第 142 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
this.container.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 18. `..\src\common\ui\navigation.ts`

**风险评分**: 10 | **风险数量**: 2 

#### 🟡 风险 #1 - 第 82 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 164 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 19. `..\src\common\ui\notifications.ts`

**风险评分**: 10 | **风险数量**: 2 

#### 🟡 风险 #1 - 第 63 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
toast.innerHTML = `
<i class="fa-solid ${icon}"></i>
<div class="toast-content">
<strong>${escapedTitle}</strong>
<div class="toast-desc">${escapedDesc}</div>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 71 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
toast.innerHTML = `
<i class="fa-solid ${icon}"></i>
<div class="toast-content">
<strong>${escapedTitle}</strong>
</div>
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 20. `..\src\common\utils\safeMount.ts`

**风险评分**: 10 | **风险数量**: 2 

#### 🟡 风险 #1 - 第 44 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = errorHtml;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 62 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
*   container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 21. `..\src\common\utils\viewLoader.ts`

**风险评分**: 10 | **风险数量**: 2 

#### 🟡 风险 #1 - 第 234 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.insertAdjacentHTML('beforeend', errorHtml);
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 288 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.insertAdjacentHTML('beforeend', html);
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 22. `..\src\components\modal\AppModal.ts`

**风险评分**: 7 | **风险数量**: 1 | 🟠 1 高危

#### 🟠 风险 #1 - 第 161 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用模板字符串  
**代码片段**:
```javascript
this._shadowRoot.innerHTML = `
<style>
/* ===== HOST ===== */
:host {
display: block;
z-index: 1000;
position: relative;
}

.hidden {
display: none !important;
}

/* ===== CONTAINER ===== */
.modal-container {
position: fixed;
inset: 0;
z-index: 9999;
display: flex;
align-items: center;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
this._shadowRoot.innerHTML = `
<style>
/* ===== HOST ===== */
:host {
display: block;
z-index: 1000;
position: relative;
}

.hidden {
display: none !important;
}

/* ===== CONTAINER ===== */
.modal-container {
position: fixed;
inset: 0;
z-index: 9999;
display: flex;
align-items: center;

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
this._shadowRoot.textContent = `
<style>
/* ===== HOST ===== */
:host {
display: block;
z-index: 1000;
position: relative;
}

.hidden {
display: none !important;
}

/* ===== CONTAINER ===== */
.modal-container {
position: fixed;
inset: 0;
z-index: 9999;
display: flex;
align-items: center;
```

---

### 23. `..\src\common\BaseModule.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 358 行

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

### 24. `..\src\common\components\OverviewRenderer.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 113 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
this.container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 25. `..\src\common\components\SidebarRenderer.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 93 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 26. `..\src\common\utils\security.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 156 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 27. `..\src\components\form-animation.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 268 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
iconElement.innerHTML = createCheckmarkSVG();
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 28. `..\src\modules\amz_hub\views\knowledge\eu_insights\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 63 行

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

### 29. `..\src\modules\app_center\views\keyword_hunter\input\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 172 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
layer.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 30. `..\src\modules\app_center\views\overview\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 18 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 31. `..\src\modules\home\homeDisplay.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 152 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
this.container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 32. `..\src\modules\more\views\explore\agents\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 83 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 33. `..\src\modules\more\views\explore\prompts\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 496 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 34. `..\src\modules\more\views\explore\workflows\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 17 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 35. `..\src\modules\sops\views\backend\fba_shipping\index.ts`

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

### 36. `..\src\modules\sops\views\backend\inventory_replenishment\index.ts`

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

### 37. `..\src\modules\sops\views\backend\procurement_qc\index.ts`

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

### 38. `..\src\modules\sops\views\growth\competitor_monitoring\index.ts`

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

### 39. `..\src\modules\sops\views\growth\listing_seo\index.ts`

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

### 40. `..\src\modules\sops\views\growth\ppc_advertising\index.ts`

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

### 41. `..\src\modules\sops\views\growth\promotion_submission\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 218 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 42. `..\src\modules\sops\views\growth\restricted_words\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 17 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 43. `..\src\modules\sops\views\overview\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 8 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 44. `..\src\modules\sops\views\safety\account_security\index.ts`

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

### 45. `..\src\modules\sops\views\safety\brand_infringement\index.ts`

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

### 46. `..\src\modules\sops\views\safety\eu_gpsr_compliance\index.ts`

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

### 47. `..\src\modules\sops\views\safety\performance_notification\index.ts`

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

### 48. `..\src\modules\sops\views\safety\permission_management\index.ts`

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

### 49. `..\src\modules\sops\views\safety\product_compliance\index.ts`

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

### 50. `..\src\modules\sops\views\service\email_templates\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 35 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 51. `..\src\modules\sops\views\service\negative_review\index.ts`

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

### 52. `..\src\modules\sops\views\service\qa_maintenance\index.ts`

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
node tools/security/xss-fixer.js --auto-fix
```

---

**报告生成**: XSS Scanner v1.0  
**下次扫描**: 修复后重新运行 `node tools/security/xss-scanner.js`
