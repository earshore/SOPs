# 产品DNA自动提取功能 - 实现计划

## 📌 需求概述

在 Prompt生成 页面加载 AI智能分析报告时，自动提取并填充产品DNA定义（目标受众、核心卖点、详细参数），用户可手动修改后生成 Master Prompt 或 Visual Prompt。

## 🏗️ 架构设计

### 数据流
```
AI分析报告 (FullAnalysisReport)
    ↓
DNA提取器 (dnaExtractor.ts)
    ↓
产品DNA (ProductDNA)
    ↓
表单自动填充 (PromptlabPanel)
    ↓
用户编辑
    ↓
Prompt生成 (promptlabService)
```

### 数据映射关系

| 分析报告字段 | 产品DNA字段 | 提取逻辑 |
|------------|-----------|---------|
| `buyer-profile.demographics` | `audience` | 年龄段 + 性别 + 生活方式特征 |
| `buyer-profile.buyer_types` | `audience` | 买家类型（前2个） |
| `selling-points.function_scene_matrix.functions` | `usps` | 功能卖点列表 |
| `selling-points.overall_strategy.primary_differentiation` | `usps` | 核心差异化 |
| `title-keywords.secondary_keywords` | `specs` | 功能词（type=feature） |
| `selling-points.bullet_analysis` | `specs` | 技术规格提取 |

## 📁 文件结构

```
src/modules/app_center/views/master_analysis/
├── services/
│   ├── promptlabService.ts (已存在)
│   └── dnaExtractor.ts (新建) ← DNA提取服务
├── promptlab/
│   ├── components/
│   │   └── PromptlabPanel.ts (修改) ← 添加自动填充逻辑
│   └── template.html (修改) ← 添加UI指示器
└── ai_analysis/
    └── config/
        └── analysisReportData.ts (已存在)
```

## 🔧 实现步骤

### Step 1: 创建 DNA 提取服务 (dnaExtractor.ts)

**功能：**
- `extractAudience()` - 从 buyer-profile 提取目标受众
- `extractUSPs()` - 从 selling-points 提取核心卖点
- `extractSpecs()` - 从 title-keywords 和 selling-points 提取技术参数
- `extractProductDNA()` - 主入口，返回完整 DNA 对象

**接口定义：**
```typescript
export interface ExtractedDNA {
  audience: string;      // 目标受众描述
  usps: string;          // 核心卖点（多行）
  specs: string;         // 技术参数（多行）
  confidence: {          // 提取置信度
    audience: number;
    usps: number;
    specs: number;
  };
}

export function extractProductDNA(
  report: FullAnalysisReport
): ExtractedDNA | null;
```

**提取策略：**

1. **Audience 提取：**
   ```
   格式: {年龄段} {性别}, {生活方式1}, {生活方式2}
   示例: "25-40岁男性, 社交活跃, 注重个人形象"

   数据源优先级:
   1. demographics (年龄、性别、生活方式)
   2. buyer_types (前2个类型)
   3. purchase_motivations (购买动机)
   ```

2. **USPs 提取：**
   ```
   格式:
   - {功能1}
   - {功能2}
   - {核心差异化}

   示例:
   - 50ml便携装，旅行友好
   - 6小时+持久留香
   - 夜店/Club场景定位

   数据源优先级:
   1. function_scene_matrix.functions (功能列表)
   2. overall_strategy.primary_differentiation (核心差异化)
   3. bullet_analysis (卖点分析)
   ```

3. **Specs 提取：**
   ```
   格式:
   容量: {size}
   香调: {scent_type}
   持久: {duration}

   示例:
   容量: 50ml/1.7oz
   香调: 木质芳香调 (Mint, Lemon)
   持久: 6小时+

   数据源优先级:
   1. secondary_keywords (type=feature, type=size)
   2. bullet_analysis.functions (技术功能)
   ```

### Step 2: 修改 PromptlabPanel.ts

**新增方法：**

```typescript
/**
 * 自动填充产品DNA
 */
autoPopulateDNA() {
  const report = appStore.getState().analysis.analysisReport;
  if (!report) return;

  // 提取DNA
  const dna = extractProductDNA(report);
  if (!dna) return;

  // 检查是否已有内容
  const hasExistingContent =
    this.profile.audience.trim() ||
    this.profile.usps.trim() ||
    this.profile.specs.trim();

  if (hasExistingContent) {
    // 显示确认对话框
    if (!confirm('检测到已有内容，是否覆盖？')) {
      return;
    }
  }

  // 填充字段
  this.profile.audience = dna.audience;
  this.profile.usps = dna.usps;
  this.profile.specs = dna.specs;

  // 保存状态
  this.saveState();

  // 显示提示
  showToast('已从分析报告自动提取产品DNA', { type: 'success' });

  // 添加视觉反馈
  this.highlightAutoFilledFields();
}

/**
 * 高亮自动填充的字段
 */
highlightAutoFilledFields() {
  const fields = ['lab-audience', 'lab-usps', 'lab-specs'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('bg-blue-50', 'border-blue-300');
      setTimeout(() => {
        el.classList.remove('bg-blue-50', 'border-blue-300');
      }, 2000);
    }
  });
}
```

**修改 renderReportAnalysis()：**
```typescript
renderReportAnalysis() {
  // ... 现有代码 ...

  // 渲染完成后，自动填充DNA
  if (this.hasReport) {
    // 延迟执行，确保DOM已渲染
    setTimeout(() => {
      this.autoPopulateDNA();
    }, 300);
  }
}
```

### Step 3: 修改 template.html

**在 Card 1 (Product DNA) 头部添加按钮：**

```html
<div class="flex items-center justify-between">
  <h3 class="text-base font-bold text-slate-800 flex items-center gap-2.5">
    <!-- 现有标题 -->
  </h3>
  <div class="flex items-center gap-2">
    <!-- 新增：从报告加载按钮 -->
    <button
      @click="autoPopulateDNA"
      :disabled="!hasReport"
      :class="hasReport ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'"
      class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
      title="从AI分析报告自动提取产品DNA">
      <i class="fas fa-magic text-[10px]"></i>
      <span>从报告加载</span>
    </button>

    <!-- 现有：目标语言选择 -->
    <label class="flex items-center text-xs font-bold text-slate-700 gap-1.5">
      <!-- ... -->
    </label>
  </div>
</div>
```

**为自动填充的字段添加视觉指示器：**

```html
<!-- Audience 字段 -->
<div class="group relative">
  <label class="flex items-center text-xs font-bold text-slate-600 mb-2 gap-1.5">
    <span class="w-1 h-3.5 bg-slate-300 rounded-full"></span>
    <i class="fa-solid fa-users text-slate-400 text-[10px]"></i>
    目标受众
    <span class="text-slate-400 font-normal">- 客户特征</span>
    <!-- 新增：自动填充指示器 -->
    <span
      x-show="profile.audience && profile.audience.length > 0"
      class="ml-auto text-[10px] text-blue-500 flex items-center gap-1">
      <i class="fas fa-robot"></i>
      AI提取
    </span>
  </label>
  <input
    @input="onInputChange"
    class="w-full text-sm border-2 border-slate-200 rounded-xl p-3 bg-slate-50/50 transition-all placeholder:text-slate-300"
    id="lab-audience"
    placeholder="e.g. Busy moms, Tech enthusiasts"
    type="text"
    x-model="profile.audience" />
</div>
```

### Step 4: 类型定义

**在 `src/types/state.ts` 中添加：**

```typescript
/**
 * 提取的产品DNA
 */
export interface ExtractedDNA {
  audience: string;
  usps: string;
  specs: string;
  confidence: {
    audience: number;
    usps: number;
    specs: number;
  };
  metadata?: {
    extractedAt: string;
    reportVersion: string;
  };
}
```

## 🎨 用户体验设计

### 自动填充时机

1. **首次加载报告时** - 自动提取并填充（如果字段为空）
2. **切换报告时** - 提示用户是否覆盖现有内容
3. **手动触发** - 点击"从报告加载"按钮

### 视觉反馈

1. **填充动画** - 字段背景闪烁蓝色 2 秒
2. **AI标识** - 显示"AI提取"小标签
3. **Toast提示** - "已从分析报告自动提取产品DNA"

### 用户控制

1. **确认对话框** - 覆盖现有内容前询问
2. **手动编辑** - 用户可随时修改自动填充的内容
3. **重新加载** - 点击按钮重新从报告提取

## ✅ 测试计划

### 单元测试

1. **DNA提取器测试**
   - 测试各字段提取逻辑
   - 测试空数据处理
   - 测试格式化输出

2. **自动填充测试**
   - 测试首次加载
   - 测试覆盖确认
   - 测试状态保存

### 集成测试

1. **端到端流程**
   - 生成AI分析报告
   - 切换到Prompt生成页面
   - 验证DNA自动填充
   - 编辑DNA字段
   - 生成Master Prompt
   - 验证DNA内容包含在Prompt中

### 边缘情况

1. 报告数据不完整
2. 报告格式不匹配
3. 用户快速切换报告
4. 网络延迟导致报告加载慢

## 📊 成功指标

1. **功能完整性** - 所有DNA字段都能正确提取
2. **准确性** - 提取的内容与报告数据一致
3. **用户体验** - 自动填充流畅，无卡顿
4. **可编辑性** - 用户可随时修改自动填充的内容
5. **Prompt质量** - 生成的Prompt包含完整的DNA信息

## 🚀 实施顺序

1. ✅ **阶段1** - 创建 dnaExtractor.ts（核心逻辑）
2. ✅ **阶段2** - 修改 PromptlabPanel.ts（集成提取器）
3. ✅ **阶段3** - 修改 template.html（UI增强）
4. ✅ **阶段4** - 测试和优化
5. ✅ **阶段5** - 文档和提交

## 📝 注意事项

1. **向后兼容** - 支持旧格式和新格式报告
2. **性能优化** - 提取过程应在 100ms 内完成
3. **错误处理** - 提取失败时优雅降级
4. **国际化** - 支持多语言报告提取
5. **数据验证** - 验证提取的数据格式正确

## 🔄 后续优化

1. **智能合并** - 合并现有内容和新提取的内容
2. **历史记录** - 保存DNA提取历史
3. **模板系统** - 支持自定义提取模板
4. **AI优化** - 使用AI进一步优化提取的文本
5. **批量操作** - 支持批量提取多个产品的DNA
