# XSS风险扫描报告

**扫描时间**: 2026/6/6 00:42:12  
**扫描目录**: `src/`  
**扫描文件数**: 313  
**命中文件数**: 62  
**发现风险点**: 181

---

## 📊 风险统计

| 风险等级 | 数量 | 占比 |
|---------|------|------|
| 🔴 严重 (CRITICAL) | 61 | 33.7% |
| 🟠 高危 (HIGH) | 31 | 17.1% |
| 🟡 中危 (MEDIUM) | 86 | 47.5% |
| 🟢 低危 (LOW) | 0 | 0.0% |
| ⚪ 信息 (INFO) | 3 | 1.7% |

---

## 🎯 修复优先级

### 立即修复 (P0)
需要在发布前修复的严重和高危风险: **92** 处

### 计划修复 (P1)
建议在下个版本修复的中危风险: **86** 处

### 可选修复 (P2)
低风险和信息级别: **3** 处

---

## 📋 详细风险列表

### 1. `..\src\modules\sops\views\growth\promotion_submission\template.html`

**风险评分**: 120 | **风险数量**: 12 | 🔴 12 严重 

#### 🔴 风险 #1 - 第 296 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
id="calc-original-price" onchange="calculateProfit()"
step="0.01" type="number" value="9.99" />
</div>
<div>
<label class="block text-xs text-slate-600 mb-1">产品成本 (含头程) €</label>
<input class="w-full px-3 py-2 border rounded-lg text-sm" id="calc-cost"
onchange="calculateProfit()" step="0.01" type="number"
value="2.50" />
</div>
<div>
<label class="block text-xs text-slate-600 mb-1">FBA配送费 €</label>
<input class="w-full px-3 py-2 border rounded-lg text-sm"
id="calc-fba-fee" onchange="calculateProfit()" step="0.01"
type="number" value="3.50" />
</div>
<div>
<label class="block text-xs text-slate-600 mb-1">VAT税率 (按站点选择)</label>
<select class="w-full px-3 py-2 border rounded-lg text-sm"
id="calc-vat-rate" onchange="calculateProfit()">
<optgroup label="核心五国">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #2 - 第 302 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="calculateProfit()" step="0.01" type="number"
value="2.50" />
</div>
<div>
<label class="block text-xs text-slate-600 mb-1">FBA配送费 €</label>
<input class="w-full px-3 py-2 border rounded-lg text-sm"
id="calc-fba-fee" onchange="calculateProfit()" step="0.01"
type="number" value="3.50" />
</div>
<div>
<label class="block text-xs text-slate-600 mb-1">VAT税率 (按站点选择)</label>
<select class="w-full px-3 py-2 border rounded-lg text-sm"
id="calc-vat-rate" onchange="calculateProfit()">
<optgroup label="核心五国">
<option value="19">🇩🇪 德国 (DE) 19%</option>
<option value="20">🇫🇷 法国 (FR) 20%</option>
<option value="22">🇮🇹 意大利 (IT) 22%</option>
<option value="21">🇪🇸 西班牙 (ES) 21%</option>
<option value="20">🇬🇧 英国 (UK) 20%</option>
</optgroup>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #3 - 第 308 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
id="calc-fba-fee" onchange="calculateProfit()" step="0.01"
type="number" value="3.50" />
</div>
<div>
<label class="block text-xs text-slate-600 mb-1">VAT税率 (按站点选择)</label>
<select class="w-full px-3 py-2 border rounded-lg text-sm"
id="calc-vat-rate" onchange="calculateProfit()">
<optgroup label="核心五国">
<option value="19">🇩🇪 德国 (DE) 19%</option>
<option value="20">🇫🇷 法国 (FR) 20%</option>
<option value="22">🇮🇹 意大利 (IT) 22%</option>
<option value="21">🇪🇸 西班牙 (ES) 21%</option>
<option value="20">🇬🇧 英国 (UK) 20%</option>
</optgroup>
<optgroup label="新兴站点">
<option value="21">🇳🇱 荷兰 (NL) 21%</option>
<option value="25">🇸🇪 瑞典 (SE) 25%</option>
<option value="23">🇵🇱 波兰 (PL) 23%</option>
<option value="21">🇧🇪 比利时 (BE) 21%</option>
</optgroup>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #4 - 第 314 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
id="calc-vat-rate" onchange="calculateProfit()">
<optgroup label="核心五国">
<option value="19">🇩🇪 德国 (DE) 19%</option>
<option value="20">🇫🇷 法国 (FR) 20%</option>
<option value="22">🇮🇹 意大利 (IT) 22%</option>
<option value="21">🇪🇸 西班牙 (ES) 21%</option>
<option value="20">🇬🇧 英国 (UK) 20%</option>
</optgroup>
<optgroup label="新兴站点">
<option value="21">🇳🇱 荷兰 (NL) 21%</option>
<option value="25">🇸🇪 瑞典 (SE) 25%</option>
<option value="23">🇵🇱 波兰 (PL) 23%</option>
<option value="21">🇧🇪 比利时 (BE) 21%</option>
</optgroup>
</select>
</div>
</div>
</div>
<!-- Promotion Selection -->
<div class="space-y-4">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #5 - 第 339 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="calculateProfit()" type="checkbox" />
<div class="flex-1">
<span class="font-medium text-sm text-amber-800">Coupon
优惠券</span>
<div class="flex items-center gap-2 mt-1">
<input class="w-16 px-2 py-1 border rounded text-xs"
id="coupon-percent" max="50" min="5"
onchange="calculateProfit()" type="number"
value="10" />
<span class="text-xs text-slate-500">% OFF</span>
<span class="text-xs text-red-600 ml-auto">费用:
€0.50/兑换</span>
</div>
</div>
</label>
<label
class="flex items-center gap-2 p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 border border-blue-200">
<input class="w-4 h-4 rounded" id="promo-prime"
onchange="calculateProfit()" type="checkbox" />
<div class="flex-1">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #6 - 第 346 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="calculateProfit()" type="number"
value="10" />
<span class="text-xs text-slate-500">% OFF</span>
<span class="text-xs text-red-600 ml-auto">费用:
€0.50/兑换</span>
</div>
</div>
</label>
<label
class="flex items-center gap-2 p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 border border-blue-200">
<input class="w-4 h-4 rounded" id="promo-prime"
onchange="calculateProfit()" type="checkbox" />
<div class="flex-1">
<span class="font-medium text-sm text-blue-800">Prime Exclusive
Discount</span>
<div class="flex items-center gap-2 mt-1">
<input class="w-16 px-2 py-1 border rounded text-xs"
id="prime-percent" max="30" min="10"
onchange="calculateProfit()" type="number"
value="15" />
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #7 - 第 357 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="calculateProfit()" type="checkbox" />
<div class="flex-1">
<span class="font-medium text-sm text-blue-800">Prime Exclusive
Discount</span>
<div class="flex items-center gap-2 mt-1">
<input class="w-16 px-2 py-1 border rounded text-xs"
id="prime-percent" max="30" min="10"
onchange="calculateProfit()" type="number"
value="15" />
<span class="text-xs text-slate-500">% OFF</span>
<span class="text-xs text-emerald-600 ml-auto">费用:
免费</span>
</div>
</div>
</label>
<label
class="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 border border-yellow-200">
<input class="w-4 h-4 rounded" id="promo-ld"
onchange="calculateProfit()" type="checkbox" />
<div class="flex-1">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #8 - 第 364 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="calculateProfit()" type="number"
value="15" />
<span class="text-xs text-slate-500">% OFF</span>
<span class="text-xs text-emerald-600 ml-auto">费用:
免费</span>
</div>
</div>
</label>
<label
class="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 border border-yellow-200">
<input class="w-4 h-4 rounded" id="promo-ld"
onchange="calculateProfit()" type="checkbox" />
<div class="flex-1">
<span class="font-medium text-sm text-yellow-800">Lightning Deal
(LD)</span>
<div class="flex items-center gap-2 mt-1">
<input class="w-16 px-2 py-1 border rounded text-xs"
id="ld-percent" max="40" min="15"
onchange="calculateProfit()" type="number"
value="20" />
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #9 - 第 375 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="calculateProfit()" type="checkbox" />
<div class="flex-1">
<span class="font-medium text-sm text-yellow-800">Lightning Deal
(LD)</span>
<div class="flex items-center gap-2 mt-1">
<input class="w-16 px-2 py-1 border rounded text-xs"
id="ld-percent" max="40" min="15"
onchange="calculateProfit()" type="number"
value="20" />
<span class="text-xs text-slate-500">% OFF</span>
<span class="text-xs text-red-600 ml-auto">费用:
€70-150</span>
</div>
</div>
</label>
<label
class="flex items-center gap-2 p-2 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 border border-purple-200">
<input class="w-4 h-4 rounded" id="promo-bd"
onchange="calculateProfit()" type="checkbox" />
<div class="flex-1">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #10 - 第 382 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="calculateProfit()" type="number"
value="20" />
<span class="text-xs text-slate-500">% OFF</span>
<span class="text-xs text-red-600 ml-auto">费用:
€70-150</span>
</div>
</div>
</label>
<label
class="flex items-center gap-2 p-2 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 border border-purple-200">
<input class="w-4 h-4 rounded" id="promo-bd"
onchange="calculateProfit()" type="checkbox" />
<div class="flex-1">
<span class="font-medium text-sm text-purple-800">Best Deal
(7DD)</span>
<div class="flex items-center gap-2 mt-1">
<input class="w-16 px-2 py-1 border rounded text-xs"
id="bd-percent" max="50" min="15"
onchange="calculateProfit()" type="number"
value="25" />
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #11 - 第 393 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="calculateProfit()" type="checkbox" />
<div class="flex-1">
<span class="font-medium text-sm text-purple-800">Best Deal
(7DD)</span>
<div class="flex items-center gap-2 mt-1">
<input class="w-16 px-2 py-1 border rounded text-xs"
id="bd-percent" max="50" min="15"
onchange="calculateProfit()" type="number"
value="25" />
<span class="text-xs text-slate-500">% OFF</span>
<span class="text-xs text-red-600 ml-auto">费用:
€150-300</span>
</div>
</div>
</label>
</div>
<div class="bg-slate-100 rounded-lg p-3 mt-2">
<p class="text-xs text-slate-600"><i
class="fas fa-info-circle text-blue-500 mr-1"></i>
<strong>叠加规则：</strong>Coupon可与Prime
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #12 - 第 400 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="calculateProfit()" type="number"
value="25" />
<span class="text-xs text-slate-500">% OFF</span>
<span class="text-xs text-red-600 ml-auto">费用:
€150-300</span>
</div>
</div>
</label>
</div>
<div class="bg-slate-100 rounded-lg p-3 mt-2">
<p class="text-xs text-slate-600"><i
class="fas fa-info-circle text-blue-500 mr-1"></i>
<strong>叠加规则：</strong>Coupon可与Prime
Exclusive叠加；LD/BD不可与其他Deal叠加，但可与Coupon叠加（先Deal后Coupon）
</p>
</div>
</div>
<!-- Result Section -->
<div class="space-y-4">
<h3 class="font-bold text-slate-700 text-sm border-b pb-2">📊 核算结果</h3>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

### 2. `..\src\modules\sops\views\service\email_templates\template.html`

**风险评分**: 120 | **风险数量**: 12 | 🔴 12 严重 

#### 🔴 风险 #1 - 第 309 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-bold">P2</span>
<span class="font-bold text-slate-800 text-sm">#1 物流查询 —
"我的包裹在哪？"</span>
<span
class="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">出现频率：★★★★★</span>
</div>
<i class="fas fa-chevron-down text-slate-400 text-sm"></i>
</div>
<div class="p-4 border-t border-slate-100">
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
<!-- FBA版本 -->
<div>
<h4
class="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1">
<i class="fas fa-warehouse"></i>FBA 订单版 — 引导找亚马逊
</h4>
<div
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #2 - 第 401 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-amber-500 text-white rounded text-xs font-bold">P1</span>
<span class="font-bold text-slate-800 text-sm">#2 产品损坏/缺陷 —
"收到就是坏的"</span>
<span
class="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">出现频率：★★★★☆</span>
</div>
<i class="fas fa-chevron-down text-slate-400 text-sm"></i>
</div>
<div class="p-4 border-t border-slate-100">
<div
class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 leading-relaxed border mb-3">
<p>Subject: Re: Issue with your [Product Name]</p><br />
<p>Dear Customer,</p><br />
<p>Thank you for letting us know, and we sincerely apologize that your
[Product Name] arrived damaged/defective. This is certainly not
the quality we stand behind.</p><br />
<p>To make this right, we would like to offer you the following options:
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #3 - 第 464 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-amber-500 text-white rounded text-xs font-bold">P1</span>
<span class="font-bold text-slate-800 text-sm">#3 收到错误产品 — "发错货了"</span>
<span
class="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">出现频率：★★★☆☆</span>
</div>
<i class="fas fa-chevron-down text-slate-400 text-sm"></i>
</div>
<div class="p-4 border-t border-slate-100">
<div
class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 leading-relaxed border mb-3">
<p>Subject: Re: Wrong item received — Order [Order ID]</p><br />
<p>Dear Customer,</p><br />
<p>We are terribly sorry that you received the wrong item. We completely
understand how frustrating this must be.</p><br />
<p>We would like to resolve this for you right away. Here are your
options:</p><br />
<p><strong>Option A:</strong> We ship the correct item to you
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #4 - 第 507 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-bold">P2</span>
<span class="font-bold text-slate-800 text-sm">#4 退货退款请求 — "我想退货"</span>
<span
class="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">出现频率：★★★★☆</span>
</div>
<i class="fas fa-chevron-down text-slate-400 text-sm"></i>
</div>
<div class="p-4 border-t border-slate-100">
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
<!-- 标准退货 -->
<div>
<h4 class="text-xs font-bold text-blue-700 mb-2">
方案A：引导走亚马逊标准退货流程</h4>
<div
class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 leading-relaxed border">
<p>Dear Customer,</p><br />
<p>Thank you for reaching out. We're sorry the product
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #5 - 第 582 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-amber-500 text-white rounded text-xs font-bold">P1</span>
<span class="font-bold text-slate-800 text-sm">#5 配件缺失 —
"少了零件/说明书"</span>
<span
class="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">出现频率：★★★☆☆</span>
</div>
<i class="fas fa-chevron-down text-slate-400 text-sm"></i>
</div>
<div class="p-4 border-t border-slate-100">
<div
class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 leading-relaxed border mb-3">
<p>Subject: Re: Missing parts — [Product Name]</p><br />
<p>Dear Customer,</p><br />
<p>We are very sorry to hear that [part/accessory name] was missing from
your package. We take quality control seriously and apologize
for this oversight.</p><br />
<p>We would like to resolve this right away:</p><br />
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #6 - 第 625 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-bold">P2</span>
<span class="font-bold text-slate-800 text-sm">#6 使用问题 — "这个怎么用？/
不会操作"</span>
<span
class="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">出现频率：★★★★☆</span>
</div>
<i class="fas fa-chevron-down text-slate-400 text-sm"></i>
</div>
<div class="p-4 border-t border-slate-100">
<div
class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 leading-relaxed border mb-3">
<p>Subject: Re: How to use [Product Name]</p><br />
<p>Dear Customer,</p><br />
<p>Thank you for your message! We're happy to help you get the most out
of your [Product Name].</p><br />
<p>Here's a step-by-step guide for [specific question]:</p><br />
<p>Step 1: [Clear instruction]</p>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #7 - 第 666 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-bold">P2</span>
<span class="font-bold text-slate-800 text-sm">#7 期望不符 —
"跟我想的不一样"</span>
<span
class="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">出现频率：★★★☆☆</span>
</div>
<i class="fas fa-chevron-down text-slate-400 text-sm"></i>
</div>
<div class="p-4 border-t border-slate-100">
<div
class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 leading-relaxed border mb-3">
<p>Subject: Re: Your [Product Name] order</p><br />
<p>Dear Customer,</p><br />
<p>Thank you for your feedback. We're sorry to hear that the product
didn't quite match your expectations.</p><br />
<p>We understand this can be disappointing. We'd like to offer you the
following options:</p><br />
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #8 - 第 708 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-amber-500 text-white rounded text-xs font-bold">P1</span>
<span class="font-bold text-slate-800 text-sm">#8 质量投诉 —
"用了X天就坏了"</span>
<span
class="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">出现频率：★★★☆☆</span>
</div>
<i class="fas fa-chevron-down text-slate-400 text-sm"></i>
</div>
<div class="p-4 border-t border-slate-100">
<div
class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 leading-relaxed border mb-3">
<p>Subject: Re: Quality issue with [Product Name]</p><br />
<p>Dear Customer,</p><br />
<p>We are truly sorry to hear about this issue with your [Product Name].
Quality and durability are very important to us, and we want to
make sure you're completely satisfied.</p><br />
<p>Could you kindly share a photo or brief description of the issue?
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #9 - 第 751 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-slate-400 text-white rounded text-xs font-bold">P3</span>
<span class="font-bold text-slate-800 text-sm">#9 发票请求 — "请提供VAT
Invoice"</span>
<span class="text-xs text-slate-600 bg-slate-200 px-2 py-0.5 rounded">🇩🇪高频
★★★★☆</span>
</div>
<i class="fas fa-chevron-down text-slate-400 text-sm"></i>
</div>
<div class="p-4 border-t border-slate-100">
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
<div>
<h4 class="text-xs font-bold text-blue-700 mb-2">已开通亚马逊VAT自动开票
</h4>
<div
class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 leading-relaxed border">
<p>Dear Customer,</p><br />
<p>Thank you for your request. Your VAT invoice is
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #10 - 第 820 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-red-600 text-white rounded text-xs font-bold">P0</span>
<span class="font-bold text-red-800 text-sm">⚠️ #10 A-to-Z Guarantee
Claim — "买家开仲裁了"</span>
<span class="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">影响 ODR
★★★★★</span>
</div>
<i class="fas fa-chevron-down text-red-400 text-sm"></i>
</div>
<div class="p-4 border-t border-red-200">
<div
class="bg-red-50 rounded-lg p-3 mb-4 text-sm text-red-800 border border-red-200">
<i class="fas fa-exclamation-triangle mr-1"></i>
<strong>A-to-Z 是账号健康度的头号杀手。</strong>ODR（Order Defect Rate）需保持＜1%，每个AZ
claim都直接计入。
<strong>72小时内必须回复亚马逊，否则自动判你输。</strong>
</div>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #11 - 第 931 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-red-600 text-white rounded text-xs font-bold">P0</span>
<span class="font-bold text-red-800 text-sm">🚨 #11 安全投诉 —
"产品造成伤害/危险"</span>
<span class="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">最高风险
★★★★★</span>
</div>
<i class="fas fa-chevron-down text-red-400 text-sm"></i>
</div>
<div class="p-4 border-t border-red-200">
<div
class="bg-red-100 rounded-lg p-3 mb-3 text-sm text-red-900 border border-red-300">
<i class="fas fa-exclamation-circle mr-1"></i>
<strong>安全投诉可能导致：产品被亚马逊主动下架 → 品牌标记 → 整个账号被审查。</strong>
必须在最短时间内处理。
</div>
<div
class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 leading-relaxed border mb-3">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #12 - 第 988 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="this.nextElementSibling.classList.toggle('hidden')">
<div class="flex items-center gap-3">
<span
class="px-2 py-0.5 bg-purple-500 text-white rounded text-xs font-bold">EU</span>
<span class="font-bold text-slate-800 text-sm">#12 GDPR请求 —
"删除我的数据"</span>
<span class="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">欧洲特有
★★☆☆☆</span>
</div>
<i class="fas fa-chevron-down text-slate-400 text-sm"></i>
</div>
<div class="p-4 border-t border-slate-100">
<div
class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 leading-relaxed border mb-3">
<p>Subject: Re: Your data request</p><br />
<p>Dear Customer,</p><br />
<p>Thank you for contacting us regarding your personal data. We take
your privacy rights under GDPR very seriously.</p><br />
<p>Please note that as an Amazon Marketplace seller, we only have access
to limited order-related information provided by Amazon to
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

### 3. `..\src\modules\amz_hub\views\practice\marketing_calendar\index.ts`

**风险评分**: 110 | **风险数量**: 15 | 🔴 5 严重 | 🟠 5 高危

#### 🔴 风险 #1 - 第 581 行

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

#### 🔴 风险 #2 - 第 486 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
html += `<button class="amzf_country_tab" onclick="amzf_selectCountry('${c.code}')">
<span class="amzf_country_flag">${c.flag}</span> ${c.name}
</button>`;
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #3 - 第 511 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<div class="amzf_history_item" onclick="amzf_selectHistoryItem('${safeItem}')">
<span class="amzf_history_item_icon"><i class="fas fa-search"></i></span>
<span class="amzf_history_item_text">${item}</span>
<span class="amzf_history_item_delete" onclick="amzf_deleteHistoryItem(${index}); event.stopPropagation();"><i class="fas fa-times"></i></span>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #4 - 第 618 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<div class="amzf_month_header" onclick="amzf_toggleSection('${sectionId}')">
<div class="amzf_month_info">
<span class="amzf_month_name">${(amzf_months as string[])[m - 1]}</span>
<span class="amzf_month_badge">${monthEvents.length} 个活动</span>
</div>
<div class="amzf_month_toggle"><i class="fas fa-chevron-down"></i></div>
</div>
<div class="amzf_month_content">
<div class="amzf_events_grid">
${monthEvents.map((e) => this.renderEventCard(e)).join("")}
</div>
</div>
</div>
`;
}
html += "</div>";
// ✅ 安全: 静态HTML模板，无用户输入
container.innerHTML = html;
this.setTimeout(
() => container.classList.remove("amzf_list_entering"),
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #5 - 第 678 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<div class="amzf_comparison_header" onclick="amzf_toggleSection('${sectionId}')">
<div class="amzf_comparison_title">
<span>${group.emoji}</span>
<span>${displayName}</span>
<span class="amzf_month_badge">${new Set(group.events.flatMap((e) => e.countries)).size} 个站点</span>
</div>
<div class="amzf_month_toggle"><i class="fas fa-chevron-down"></i></div>
</div>
<div class="amzf_comparison_content">
<div class="amzf_country_list">
${group.events.map((e) => this.renderCountryEvent(e)).join("")}
</div>
</div>
</div>
`;
});
html += "</div>";
// ✅ 安全: 静态HTML模板，无用户输入
container.innerHTML = html;
this.setTimeout(
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🟠 风险 #6 - 第 67 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
// 1. 挂载全局代理函数 (因为 HTML 模板里用了 onclick="amzf_xxx")
this.bindGlobalProxies();
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript

```

---

#### 🟠 风险 #7 - 第 481 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用模板字符串, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
let html = `<button class="amzf_country_tab amzf_active" onclick="amzf_selectCountry('ALL')">
<span class="amzf_country_flag"><i class="fas fa-globe"></i></span> 全部
</button>`;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript

```

---

#### 🟠 风险 #8 - 第 504 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<button class="amzf_history_clear_all" onclick="amzf_clearAllHistory(); event.stopPropagation();">清空</button>
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript

```

---

#### 🟠 风险 #9 - 第 514 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用模板字符串, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<span class="amzf_history_item_delete" onclick="amzf_deleteHistoryItem(${index}); event.stopPropagation();"><i class="fas fa-times"></i></span>
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript

```

---

#### 🟠 风险 #10 - 第 531 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用模板字符串, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<span class="amzf_quick_tag" onclick="amzf_selectHistoryItem('${tag}')">${tag}</span>
`,
).join("")}
</div>
`;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript

```

---

#### 🟡 风险 #11 - 第 492 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #12 - 第 537 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #13 - 第 548 行

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

#### 🟡 风险 #14 - 第 635 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #15 - 第 696 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 4. `..\src\modules\sops\views\growth\restricted_words\restrictedWordsHandler.ts`

**风险评分**: 71 | **风险数量**: 11 | 🟠 8 高危

#### 🟠 风险 #1 - 第 339 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用模板字符串  
**代码片段**:
```javascript
categorySpan.innerHTML = `<i class="fas ${category.icon}"></i>`;
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
categorySpan.innerHTML = `<i class="fas ${category.icon}"></i>`;

// 修复后
import { escapeHtml } from '@/common/utils/security.js';
categorySpan.innerHTML = `<i class="fas ${category.icon}"></i>`;
```

---

#### 🟠 风险 #2 - 第 488 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
content.innerHTML = '';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
content.innerHTML = '';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
content.textContent = '';
```

---

#### 🟠 风险 #3 - 第 550 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
riskTitle.innerHTML = '<i class="fas fa-triangle-exclamation"></i> 风险解读';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
riskTitle.innerHTML = '<i class="fas fa-triangle-exclamation"></i> 风险解读';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
riskTitle.textContent = '<i class="fas fa-triangle-exclamation"></i> 风险解读';
```

---

#### 🟠 风险 #4 - 第 559 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
legalDiv.innerHTML = '<i class="fas fa-gavel text-red-400 mt-0.5 text-xs"></i>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
legalDiv.innerHTML = '<i class="fas fa-gavel text-red-400 mt-0.5 text-xs"></i>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
legalDiv.textContent = '<i class="fas fa-gavel text-red-400 mt-0.5 text-xs"></i>';
```

---

#### 🟠 风险 #5 - 第 582 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
altTitle.innerHTML = '<i class="fas fa-check-circle text-green-500"></i> 安全替代方案';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
altTitle.innerHTML = '<i class="fas fa-check-circle text-green-500"></i> 安全替代方案';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
altTitle.textContent = '<i class="fas fa-check-circle text-green-500"></i> 安全替代方案';
```

---

#### 🟠 风险 #6 - 第 589 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
li.innerHTML = '<i class="fas fa-check mt-0.5 text-xs"></i>';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
li.innerHTML = '<i class="fas fa-check mt-0.5 text-xs"></i>';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
li.textContent = '<i class="fas fa-check mt-0.5 text-xs"></i>';
```

---

#### 🟠 风险 #7 - 第 601 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
prodTitle.innerHTML = '<i class="fas fa-bullseye text-blue-500"></i> 常见触雷场景';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
prodTitle.innerHTML = '<i class="fas fa-bullseye text-blue-500"></i> 常见触雷场景';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
prodTitle.textContent = '<i class="fas fa-bullseye text-blue-500"></i> 常见触雷场景';
```

---

#### 🟠 风险 #8 - 第 622 行

**风险等级**: HIGH (7分)  
**风险原因**: 包含用户输入相关变量  
**代码片段**:
```javascript
tipsTitle.innerHTML = '<i class="fas fa-lightbulb text-amber-500"></i> 资深运营小贴士';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript
// 原代码
tipsTitle.innerHTML = '<i class="fas fa-lightbulb text-amber-500"></i> 资深运营小贴士';

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
tipsTitle.textContent = '<i class="fas fa-lightbulb text-amber-500"></i> 资深运营小贴士';
```

---

#### 🟡 风险 #9 - 第 371 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sitesDiv.innerHTML = renderAffectedSites(word.affectedSites);
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #10 - 第 403 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
tbody.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #11 - 第 449 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
header.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 5. `..\src\common\devtools\PerformanceMonitor.ts`

**风险评分**: 55 | **风险数量**: 7 | 🔴 2 严重 | 🟠 5 高危

#### 🔴 风险 #1 - 第 78 行

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

#### 🔴 风险 #2 - 第 114 行

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

#### 🟠 风险 #3 - 第 150 行

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

#### 🟠 风险 #4 - 第 153 行

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

#### 🟠 风险 #5 - 第 156 行

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

#### 🟠 风险 #6 - 第 159 行

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

#### 🟠 风险 #7 - 第 162 行

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

### 6. `..\src\common\ui\search.ts`

**风险评分**: 54 | **风险数量**: 6 | 🔴 4 严重 | 🟠 2 高危

#### 🔴 风险 #1 - 第 56 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
resultsContainer.innerHTML = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" data-clear-search="sop"
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
<button data-action="switch-tab" data-tab="${route.id}" data-clear-search="sop"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="truncate">${route.label}</span>
</button>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultsContainer.textContent = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" data-clear-search="sop"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="truncate">${route.label}</span>
</button>
`).join('');
```

---

#### 🔴 风险 #2 - 第 132 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
resultsContainer.innerHTML = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" data-clear-search="hub"
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
<button data-action="switch-tab" data-tab="${route.id}" data-clear-search="hub"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="truncate">${route.label}</span>
</button>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultsContainer.textContent = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" data-clear-search="hub"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="truncate">${route.label}</span>
</button>
`).join('');
```

---

#### 🔴 风险 #3 - 第 218 行

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

#### 🔴 风险 #4 - 第 227 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
resultsContainer.innerHTML = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" data-clear-search="sidebar"
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
<button data-action="switch-tab" data-tab="${route.id}" data-clear-search="sidebar"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="flex-1 text-left">${route.label}</span>
</button>
`).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
resultsContainer.textContent = matches.map(route => `
<button data-action="switch-tab" data-tab="${route.id}" data-clear-search="sidebar"
class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
<i class="${route.icon} w-4 text-center"></i>
<span class="flex-1 text-left">${route.label}</span>
</button>
`).join('');
```

---

#### 🟠 风险 #5 - 第 54 行

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

#### 🟠 风险 #6 - 第 130 行

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

### 7. `..\src\modules\more\views\explore\prompts\template.html`

**风险评分**: 50 | **风险数量**: 5 | 🔴 5 严重 

#### 🔴 风险 #1 - 第 81 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<button onclick="window.closePromptModal()"
class="text-white/80 hover:text-white transition-colors">
<i class="fas fa-times text-2xl"></i>
</button>
</div>
<p id="modal-prompt-description" class="text-green-50 text-sm"></p>
</div>

<!-- Modal Body -->
<div class="flex-1 overflow-y-auto p-6">
<div class="bg-slate-50 rounded-xl p-6 border border-slate-200">
<div class="flex items-center justify-between mb-4">
<h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
<i class="fas fa-code"></i>
提示词内容
</h3>
<!-- 语言切换按钮 -->
<div class="flex bg-slate-200 rounded-lg p-0.5">
<button onclick="window.switchPromptLang('zh')" data-lang="zh"
class="lang-btn active px-3 py-1 text-xs font-medium rounded-md transition-all">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #2 - 第 99 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<button onclick="window.switchPromptLang('zh')" data-lang="zh"
class="lang-btn active px-3 py-1 text-xs font-medium rounded-md transition-all">
中文
</button>
<button onclick="window.switchPromptLang('en')" data-lang="en"
class="lang-btn px-3 py-1 text-xs font-medium rounded-md transition-all">
English
</button>
</div>
</div>
<pre id="modal-prompt-content"
class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono"></pre>
</div>

<!-- Usage Tips -->
<div class="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
<h4 class="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
<i class="fas fa-lightbulb"></i>
使用建议
</h4>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #3 - 第 103 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<button onclick="window.switchPromptLang('en')" data-lang="en"
class="lang-btn px-3 py-1 text-xs font-medium rounded-md transition-all">
English
</button>
</div>
</div>
<pre id="modal-prompt-content"
class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono"></pre>
</div>

<!-- Usage Tips -->
<div class="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
<h4 class="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
<i class="fas fa-lightbulb"></i>
使用建议
</h4>
<ul class="text-sm text-blue-800 space-y-1.5">
<li class="flex items-start gap-2">
<i class="fas fa-check-circle mt-0.5"></i>
<span>复制提示词后,根据实际情况填写方括号[]中的内容</span>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #4 - 第 142 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<button onclick="window.closePromptModal()"
class="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
关闭
</button>
<button onclick="window.copyModalPrompt()"
class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2">
<i class="fas fa-copy"></i>
复制提示词
</button>
</div>
</div>
</div>
</div>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #5 - 第 146 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
<button onclick="window.copyModalPrompt()"
class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2">
<i class="fas fa-copy"></i>
复制提示词
</button>
</div>
</div>
</div>
</div>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

### 8. `..\src\modules\app_center\views\keyword_hunter\process\template.html`

**风险评分**: 40 | **风险数量**: 4 | 🔴 4 严重 

#### 🔴 风险 #1 - 第 92 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="window.kt_syncToInput()">
<i class="fas fa-reply text-[10px]"></i> 同步回输入
</button>
<!-- AI Translate -->
<button
class="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 cursor-not-allowed bg-slate-100 text-slate-400 border-2 border-slate-200 disabled:opacity-50"
id="kt-translate-btn" onclick="window.kt_translateCopyImmersive()">
<!-- Progress Bar -->
<div class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-violet-500 to-pink-500 opacity-20 hidden transition-all duration-300"
id="kt-translate-progress" style="width:0%"></div>
<i class="fas fa-language relative z-10 text-sm"></i>
<span class="relative z-10 text-xs" id="kt-translate-btn-text">AI 沉浸式翻译</span>
<span
class="hidden relative z-10 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full"
id="translate-btn-percent">0%</span>
</button>
</div>
</div>
</div>
<!-- Editor Body -->
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #2 - 第 98 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
id="kt-translate-btn" onclick="window.kt_translateCopyImmersive()">
<!-- Progress Bar -->
<div class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-violet-500 to-pink-500 opacity-20 hidden transition-all duration-300"
id="kt-translate-progress" style="width:0%"></div>
<i class="fas fa-language relative z-10 text-sm"></i>
<span class="relative z-10 text-xs" id="kt-translate-btn-text">AI 沉浸式翻译</span>
<span
class="hidden relative z-10 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full"
id="translate-btn-percent">0%</span>
</button>
</div>
</div>
</div>
<!-- Editor Body -->
<div class="p-6">
<div
class="relative rounded-xl border-2 border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-200 overflow-hidden bg-slate-50/30">
<div class="copy-content p-5 min-h-[420px] text-slate-800 text-sm leading-relaxed focus:outline-none focus:bg-white transition-colors"
contenteditable="true" data-placeholder="请先在 输入模块 点击 开始分析!" id="kt-copy-display">
</div>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #3 - 第 288 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onclick="window.kt_minimizeKeywordsWindow()" title="最小化">
<i class="fas fa-minus text-xs"></i>
</button>
</div>
</div>
<div class="kt-floating-content p-4">
<!-- Legend -->
<div class="flex items-center justify-start gap-5 mb-3.5 pb-3.5 border-b border-slate-100">
<div class="flex items-center gap-2 text-xs">
<span
class="w-3 h-3 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-200"></span>
<span class="text-slate-600 font-semibold">已匹配 <span class="text-emerald-600 font-bold">(<span
id="kt-tab-matched-count">0</span>)</span></span>
</div>
<div class="flex items-center gap-2 text-xs">
<span
class="w-3 h-3 rounded-md bg-gradient-to-br from-rose-400 to-rose-500 shadow-sm shadow-rose-200"></span>
<span class="text-slate-600 font-semibold">未匹配 <span class="text-rose-600 font-bold">(<span
id="kt-tab-unmatched-count">0</span>)</span></span>
</div>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #4 - 第 317 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
id="kt-keywords-minimized" onclick="window.kt_restoreKeywordsWindow()">
<div class="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
<i class="fas fa-list text-xs"></i>
</div>
<span class="text-sm font-bold">关键词</span>
<span
class="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm min-w-[20px] text-center"
id="kt-minimized-badge">0</span>
</button>
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

### 9. `..\src\common\devtools\MemoryDevTools.ts`

**风险评分**: 37 | **风险数量**: 4 | 🔴 3 严重 | 🟠 1 高危

#### 🔴 风险 #1 - 第 63 行

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

#### 🔴 风险 #2 - 第 223 行

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

#### 🔴 风险 #3 - 第 254 行

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

#### 🟠 风险 #4 - 第 219 行

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

### 10. `..\src\modules\app_center\views\keyword_hunter\analysis\index.ts`

**风险评分**: 36 | **风险数量**: 6 | 🟠 3 高危

#### 🟠 风险 #1 - 第 335 行

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

#### 🟠 风险 #2 - 第 663 行

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

#### 🟠 风险 #3 - 第 670 行

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

#### 🟡 风险 #4 - 第 445 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
td2.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 460 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
td2.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 492 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
td2.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 11. `..\src\modules\more\views\explore\prompts\index.ts`

**风险评分**: 35 | **风险数量**: 5 | 🔴 2 严重 

#### 🔴 风险 #1 - 第 217 行

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

#### 🔴 风险 #2 - 第 226 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
container.innerHTML = promptsToRender
.map((prompt) => {
const category = getCategoryById(prompt.category);
const model = getModelInfo(prompt.recommendedModel);

if (!category) return '';

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
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
container.innerHTML = promptsToRender
.map((prompt) => {
const category = getCategoryById(prompt.category);
const model = getModelInfo(prompt.recommendedModel);

if (!category) return '';

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

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
container.textContent = promptsToRender
.map((prompt) => {
const category = getCategoryById(prompt.category);
const model = getModelInfo(prompt.recommendedModel);

if (!category) return '';

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
```

---

#### 🟡 风险 #3 - 第 204 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = allBtn + categoryBtns;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 346 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 包含用户输入相关变量, 已使用安全函数, 使用模板字符串  
**代码片段**:
```javascript
categoryEl.innerHTML = `
<i class="fas ${escapeHtml(category.icon)}"></i> ${escapeHtml(category.name)}
`;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 430 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 12. `..\src\common\infrastructure\SafeRenderer.ts`

**风险评分**: 34 | **风险数量**: 8 | 🟠 1 高危

#### 🟠 风险 #1 - 第 371 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
*   '<div onclick="alert()">Hello</div>',
*   { allowedTags: ['div'], allowedAttrs: ['class'] }
* );
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript

```

---

#### 🟡 风险 #2 - 第 120 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = template;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 179 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = interpolated;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 241 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 271 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 386 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
temp.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### ⚪ 风险 #7 - 第 175 行

**风险等级**: INFO (1分)  
**风险原因**: 已使用安全函数  
**代码片段**:
```javascript
container.innerHTML = this.sanitizeHtml(interpolated, options);
```

**修复建议**: ℹ️ 信息: 已使用安全函数,无需修改

---

#### ⚪ 风险 #8 - 第 268 行

**风险等级**: INFO (1分)  
**风险原因**: 已使用安全函数  
**代码片段**:
```javascript
element.innerHTML = this.sanitizeHtml(html, options);
```

**修复建议**: ℹ️ 信息: 已使用安全函数,无需修改

---

### 13. `..\src\components\ErrorBoundary.ts`

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

### 14. `..\src\modules\app_center\views\keyword_hunter\process\index.ts`

**风险评分**: 30 | **风险数量**: 6 

#### 🟡 风险 #1 - 第 330 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
freqList.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 523 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
display.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 533 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
tempDiv.innerHTML = para.original;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 560 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
display.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 709 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
allContainer.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #6 - 第 768 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
allContainer.innerHTML = "";
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 15. `..\src\common\infrastructure\SafeModuleLoader.ts`

**风险评分**: 27 | **风险数量**: 5 | 🟠 1 高危

#### 🟠 风险 #1 - 第 856 行

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

#### 🟡 风险 #2 - 第 878 行

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

#### 🟡 风险 #3 - 第 909 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 913 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = this.interpolateFallbackTemplate(customFallback, error, modulePath);
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #5 - 第 920 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = errorUI;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 16. `..\src\common\utils\xssFixer.ts`

**风险评分**: 26 | **风险数量**: 6 

#### 🟡 风险 #1 - 第 34 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 65 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 81 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 88 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = items.map((item, index) => renderItem(item, index)).join('');
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

#### ⚪ 风险 #6 - 第 23 行

**风险等级**: INFO (1分)  
**风险原因**: 已使用安全函数  
**代码片段**:
```javascript
* 用于替换所有 element.innerHTML = xxx 的场景
*/
export function setInnerHTML(element: HTMLElement, html: string, trusted: boolean = false): void {
if (!element) {
Logger.warn('[XSSFixer] Element is null or undefined');
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

### 17. `..\src\common\ui\megaMenu.ts`

**风险评分**: 20 | **风险数量**: 4 

#### 🟡 风险 #1 - 第 484 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 487 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = renderErrorCard();
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 517 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #4 - 第 520 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = renderErrorCard();
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 18. `..\src\modules\amz_hub\views\practice\promo_tools\index.ts`

**风险评分**: 20 | **风险数量**: 2 | 🔴 2 严重 

#### 🔴 风险 #1 - 第 525 行

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

#### 🔴 风险 #2 - 第 563 行

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

### 19. `..\src\modules\sops\views\growth\npi_tracker\template.html`

**风险评分**: 20 | **风险数量**: 2 | 🔴 2 严重 

#### 🔴 风险 #1 - 第 754 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="filterByStore(this.value)">
<option value="all">全部</option>
<option value="1组-Altear">1组-Altear</option>
<option value="10组-Aiacbof Sarl">10组-Aiacbof Sarl</option>
</select>
</div>
<div class="flex items-center gap-2">
<label class="text-sm text-slate-600">阶段：</label>
<select class="px-3 py-1.5 border rounded-lg text-sm"
onchange="filterByStage(this.value)">
<option value="all">全部</option>
<option value="new-test">新品-测款</option>
<option value="growth">成长期</option>
<option value="stable">稳定期</option>
<option value="clearance">清仓期</option>
</select>
</div>
</div>
<div class="flex items-center gap-2">
<button class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🔴 风险 #2 - 第 763 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
onchange="filterByStage(this.value)">
<option value="all">全部</option>
<option value="new-test">新品-测款</option>
<option value="growth">成长期</option>
<option value="stable">稳定期</option>
<option value="clearance">清仓期</option>
</select>
</div>
</div>
<div class="flex items-center gap-2">
<button class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
data-action="exportToExcel">
<i class="fas fa-file-excel"></i>
导出 Excel (带公式)
</button>
</div>
</div>
</div>
<!-- Data Table -->
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6 shadow-sm">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

### 20. `..\src\components\modal\AppModal.ts`

**风险评分**: 17 | **风险数量**: 2 | 🔴 1 严重 | 🟠 1 高危

#### 🔴 风险 #1 - 第 18 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
*     <button onclick="...">Confirm</button>
*   </div>
* </app-modal>
*
* API:
* modal.open()
* modal.close()
* modal.setTitle('New Title')
*/
export class AppModal extends HTMLElement {
private _isOpen: boolean = false;
private _shadowRoot: ShadowRoot;

constructor() {
super();
this._shadowRoot = this.attachShadow({ mode: 'open' });
}

static get observedAttributes(): string[] {
return ['title', 'size', 'closable'];
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🟠 风险 #2 - 第 161 行

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

### 21. `..\src\common\components\SidebarRenderer.ts`

**风险评分**: 15 | **风险数量**: 2 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 532 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
oninput="window.searchSidebar(this.value)">

<!-- Clear Button -->
<button id="sidebar-search-clear" data-action="clear-sidebar-search"
class="hidden absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md
bg-slate-100 hover:bg-slate-200
flex items-center justify-center
text-slate-400 hover:text-slate-600 transition-all duration-200">
<i class="fas fa-times text-[8px]"></i>
</button>

<!-- Search Results Dropdown -->
<div id="sidebar-search-results"
class="hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-sm
border border-slate-200 shadow-xl shadow-slate-200/50
rounded-xl mt-1.5 max-h-60 overflow-y-auto z-50 p-1"
style="scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;">
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

#### 🟡 风险 #2 - 第 93 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 22. `..\src\common\utils\ModuleLoader.ts`

**风险评分**: 15 | **风险数量**: 2 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 312 行

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

#### 🟡 风险 #2 - 第 274 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 23. `..\src\components\settings\systemSettings.ts`

**风险评分**: 15 | **风险数量**: 2 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 802 行

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

#### 🟡 风险 #2 - 第 792 行

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

### 24. `..\src\modules\app_center\views\playground\deep-chat\index.ts`

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

#### 🟡 风险 #2 - 第 835 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
button.innerHTML = icon;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #3 - 第 1033 行

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

### 25. `..\src\modules\more\views\overview\index.ts`

**风险评分**: 15 | **风险数量**: 2 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 109 行

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

#### 🟡 风险 #2 - 第 99 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 26. `..\src\modules\app_center\views\master_analysis\scraper\template.html`

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

### 27. `..\src\components\navigation-animation.ts`

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

### 28. `..\src\common\ui\navigation.ts`

**风险评分**: 10 | **风险数量**: 2 

#### 🟡 风险 #1 - 第 83 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 165 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
sidebar.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 29. `..\src\common\ui\notifications.ts`

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

### 30. `..\src\common\utils\safeMount.ts`

**风险评分**: 10 | **风险数量**: 2 

#### 🟡 风险 #1 - 第 46 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = errorHtml;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 64 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
*   container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 31. `..\src\common\utils\viewLoader.ts`

**风险评分**: 10 | **风险数量**: 2 

#### 🟡 风险 #1 - 第 235 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.insertAdjacentHTML('beforeend', errorHtml);
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

#### 🟡 风险 #2 - 第 289 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.insertAdjacentHTML('beforeend', html);
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 32. `..\src\modules\app_center\views\keyword_hunter\analysis\template.html`

**风险评分**: 10 | **风险数量**: 1 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 105 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
disabled id="kt-analyze-btn" onclick="window.kt_runLLMAnalysis()">
<i class="fas fa-magic relative z-10"></i>
<span class="relative z-10" id="kt-analyze-btn-text">生成报告</span>
</button>
</div>
</div>

<!-- Report Body -->
<div class="p-6 md:p-8">
<div class="markdown-content relative min-h-[300px]" id="kt-llm-analysis-result">
<!-- ===== Empty State ===== -->
<div class="flex flex-col items-center justify-center py-20 text-center"
id="kt-analysis-empty-state">
<!-- Animated Icon -->
<div class="relative mb-7">
<div
class="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center border-2 border-dashed border-purple-200/60 shadow-inner">
<i class="fas fa-file-medical-alt text-4xl text-purple-200"></i>
</div>
<div class="absolute -top-2 -right-3 w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shadow-sm animate-bounce"
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript

```

---

### 33. `..\src\modules\sops\views\growth\npi_tracker\index.ts`

**风险评分**: 10 | **风险数量**: 1 | 🔴 1 严重 

#### 🔴 风险 #1 - 第 283 行

**风险等级**: CRITICAL (10分)  
**风险原因**: 包含用户输入相关变量, 使用模板字符串  
**代码片段**:
```javascript
checkboxes.innerHTML = NEXT_STEP_OPTIONS.map(
(option) => `
<label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
<input type="checkbox" value="${option}" ${currentSteps.includes(option) ? 'checked' : ''} class="w-4 h-4 rounded">
<span class="text-sm">${option}</span>
</label>
`
).join('');
```

**修复建议**: 🚨 立即修复: 使用 escapeHtml() 转义所有变量

**修复示例**:
```javascript
// 原代码
checkboxes.innerHTML = NEXT_STEP_OPTIONS.map(
(option) => `
<label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
<input type="checkbox" value="${option}" ${currentSteps.includes(option) ? 'checked' : ''} class="w-4 h-4 rounded">
<span class="text-sm">${option}</span>
</label>
`
).join('');

// 修复后
import { setSafeHtml } from '@/common/utils/security.js';
checkboxes.textContent = NEXT_STEP_OPTIONS.map(
(option) => `
<label class="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
<input type="checkbox" value="${option}" ${currentSteps.includes(option) ? 'checked' : ''} class="w-4 h-4 rounded">
<span class="text-sm">${option}</span>
</label>
`
).join('');
```

---

### 34. `..\src\main.ts`

**风险评分**: 7 | **风险数量**: 1 | 🟠 1 高危

#### 🟠 风险 #1 - 第 351 行

**风险等级**: HIGH (7分)  
**风险原因**: 使用内联事件处理器，阻碍 CSP 收紧  
**代码片段**:
```javascript
// 也挂载到 window，保持向后兼容现有 onclick="xxx()" 调用

interface ActionParams {
tab?: string;
param?: string;
updateHistory?: boolean;
format?: 'json' | 'csv';
}

type ToastType = 'success' | 'error' | 'warning' | 'info';
```

**修复建议**: ⚠️ 优先修复: 使用 setTemplate() 或 escapeHtml()

**修复示例**:
```javascript

```

---

### 35. `..\src\common\BaseModule.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 359 行

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

### 36. `..\src\common\components\OverviewRenderer.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 114 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
this.container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 37. `..\src\common\utils\security.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 158 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
element.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 38. `..\src\components\form-animation.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 269 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
iconElement.innerHTML = createCheckmarkSVG();
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 39. `..\src\modules\amz_hub\views\knowledge\eu_insights\index.ts`

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

### 40. `..\src\modules\app_center\views\keyword_hunter\input\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 173 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
layer.innerHTML = '';
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 41. `..\src\modules\app_center\views\overview\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 19 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 42. `..\src\modules\home\homeDisplay.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 153 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
this.container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 43. `..\src\modules\more\views\explore\agents\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 84 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 44. `..\src\modules\more\views\explore\workflows\index.ts`

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

### 45. `..\src\modules\sops\views\backend\fba_shipping\index.ts`

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

### 46. `..\src\modules\sops\views\backend\inventory_replenishment\index.ts`

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

### 47. `..\src\modules\sops\views\backend\procurement_qc\index.ts`

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

### 48. `..\src\modules\sops\views\growth\competitor_monitoring\index.ts`

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

### 49. `..\src\modules\sops\views\growth\listing_seo\index.ts`

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

### 50. `..\src\modules\sops\views\growth\ppc_advertising\index.ts`

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

### 51. `..\src\modules\sops\views\growth\promotion_submission\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 183 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 52. `..\src\modules\sops\views\growth\restricted_words\index.ts`

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

### 53. `..\src\modules\sops\views\overview\index.ts`

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

### 54. `..\src\modules\sops\views\safety\account_security\index.ts`

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

### 55. `..\src\modules\sops\views\safety\brand_infringement\index.ts`

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

### 56. `..\src\modules\sops\views\safety\eu_gpsr_compliance\index.ts`

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

### 57. `..\src\modules\sops\views\safety\performance_notification\index.ts`

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

### 58. `..\src\modules\sops\views\safety\permission_management\index.ts`

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

### 59. `..\src\modules\sops\views\safety\product_compliance\index.ts`

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

### 60. `..\src\modules\sops\views\service\email_templates\index.ts`

**风险评分**: 5 | **风险数量**: 1 

#### 🟡 风险 #1 - 第 16 行

**风险等级**: MEDIUM (5分)  
**风险原因**: 使用innerHTML  
**代码片段**:
```javascript
container.innerHTML = html;
```

**修复建议**: 📋 建议修复: 审查变量来源,必要时转义

---

### 61. `..\src\modules\sops\views\service\negative_review\index.ts`

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

### 62. `..\src\modules\sops\views\service\qa_maintenance\index.ts`

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
