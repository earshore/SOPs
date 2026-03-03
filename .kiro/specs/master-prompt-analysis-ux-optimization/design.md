# Design Document

## Overview

本设计文档描述了 Master Prompt AI 分析页面报告展示区域的 UX 优化方案。当前实现使用 GridStack 库实现可拖拽、可调整大小的卡片布局,但存在以下核心问题:

1. **布局管理复杂**: GridStack 配置和状态管理较为复杂,增加了维护成本
2. **交互反馈不足**: 拖拽、调整大小等操作缺乏清晰的视觉反馈
3. **数据展示不统一**: 不同数据类型的展示方式缺乏一致性
4. **编辑体验欠佳**: 编辑模式的交互流程不够流畅
5. **响应式支持有限**: 在小屏幕设备上的体验不佳

本设计将保持现有的技术栈(TypeScript + GridStack + Tailwind CSS),通过优化组件结构、改进交互流程和增强视觉反馈来提升用户体验。

## Architecture

### 整体架构

```
AnalysisModule (BaseModule)
├── UI Layer
│   ├── ReportToolbar (工具栏组件)
│   ├── ReportGrid (网格容器)
│   └── WidgetCard (卡片组件)
├── Rendering Layer
│   ├── WidgetRenderer (卡片渲染器)
│   ├── ViewModeRenderer (查看模式渲染)
│   └── EditModeRenderer (编辑模式渲染)
├── State Management
│   ├── ReportState (报告状态)
│   ├── EditState (编辑状态)
│   └── TranslationState (翻译状态)
└── GridStack Integration
    ├── GridManager (网格管理器)
    └── LayoutPersistence (布局持久化)
```

### 关键设计决策

1. **保持 GridStack**: 继续使用 GridStack 库,但封装其复杂性到 GridManager 中
2. **组件化渲染**: 将渲染逻辑拆分为独立的渲染器,提高可维护性
3. **状态集中管理**: 使用现有的 state 对象,但增加更清晰的状态结构
4. **渐进式增强**: 优先优化核心交互,保持向后兼容

## Components and Interfaces

### 1. ReportToolbar 组件

**职责**: 管理报告的全局操作(翻译、导出、复制等)

**接口**:
```typescript
interface ReportToolbarProps {
  report: AnalysisReport;
  translatedReport: AnalysisReport | null;
  showTranslation: boolean;
  onTranslate: (model: string) => Promise<void>;
  onToggleTranslation: () => void;
  onExport: () => void;
  onCopyMarkdown: () => void;
}
```

**关键特性**:
- Sticky 定位,始终可见
- 翻译模式下禁用原文相关操作
- 显示报告元信息(时间、模型、市场)
- 响应式布局(移动端垂直堆叠)


### 2. WidgetCard 组件

**职责**: 展示单个分析维度的数据,支持查看和编辑模式

**接口**:
```typescript
interface WidgetCardProps {
  key: string;
  title: string;
  category: 'listing' | 'reviews' | 'cross';
  data: any;
  isTranslationMode: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (newData: any) => void;
  onUndo: () => void;
}
```

**状态机**:
```
[View Mode] --点击编辑--> [Edit Mode]
[Edit Mode] --点击完成--> [View Mode]
[Edit Mode] --点击撤销--> [Edit Mode (恢复快照)]
```

**视觉层次**:
- Header: 标题 + 图标 + 操作按钮
- Content: 数据展示区域(可滚动)
- Footer: 编辑模式下的操作按钮

### 3. GridManager 类

**职责**: 封装 GridStack 的初始化和管理逻辑

**接口**:
```typescript
class GridManager {
  private grid: GridStackInstance | null;
  
  init(container: HTMLElement, options: GridStackOptions): void;
  addWidget(element: HTMLElement, options: GridStackWidget): void;
  removeWidget(element: HTMLElement): void;
  enableResize(element: HTMLElement): void;
  disableResize(element: HTMLElement): void;
  enableDrag(enable: boolean): void;
  saveLayout(): GridStackNode[];
  loadLayout(layout: GridStackNode[]): void;
  destroy(): void;
}
```

**配置**:
```typescript
const defaultGridOptions = {
  column: 12,
  cellHeight: 80,
  margin: 16,
  animate: true,
  float: true,
  disableOneColumnMode: false,
  minRow: 1,
  acceptWidgets: false,
  removable: false,
  resizable: {
    handles: 'e, se, s, sw, w'
  }
};
```

### 4. ViewModeRenderer 类

**职责**: 根据数据类型渲染查看模式的 HTML

**接口**:
```typescript
class ViewModeRenderer {
  renderString(value: string): string;
  renderStringArray(values: string[]): string;
  renderObjectArray(objects: any[]): string;
  renderPathArray(paths: string[]): string;
  renderEmpty(): string;
}
```

**渲染规则**:
- 字符串: 使用 `<div>` 包裹,保留换行
- 字符串数组: 使用标签样式(pill badges)
- 路径数组: 使用面包屑导航样式
- 对象数组: 使用结构化卡片,字段名映射为中文
- 空值: 显示友好的空状态图标和文字

### 5. EditModeRenderer 类

**职责**: 根据数据类型渲染编辑模式的表单

**接口**:
```typescript
class EditModeRenderer {
  renderStringEditor(key: string, value: string): string;
  renderArrayEditor(key: string, values: string[]): string;
  renderObjectArrayEditor(key: string, objects: any[]): string;
}
```

**编辑器特性**:
- 自动调整高度的 textarea
- 数组编辑器支持添加/删除条目
- 对象数组编辑器提供结构化表单
- 实时保存编辑快照(用于撤销)


## Data Models

### ReportState

```typescript
interface ReportState {
  // 当前报告数据
  analysisReport: AnalysisReport | null;
  
  // 翻译相关
  translatedReport: AnalysisReport | null;
  showTranslation: boolean;
  translationProgress: {
    current: number;
    total: number;
    status: 'idle' | 'translating' | 'completed' | 'failed';
  };
  
  // 编辑相关
  isEditing: boolean;
  editingCardKey: string | null;
  editHistory: string[]; // JSON 字符串数组
  
  // 布局相关
  gridLayout: GridStackNode[];
  
  // 选择的 ASIN
  selectedAsins: string[];
}
```

### AnalysisReport

```typescript
interface AnalysisReport {
  // 动态分析字段
  [key: string]: any;
  
  // 元信息
  meta?: {
    targetMarket?: string;
    analyzedASINs?: string[];
    generatedByModel?: string;
    generatedAt?: string;
    templateUsed?: string;
    dataScope?: string[];
  };
  
  // 错误信息
  parse_error?: boolean;
  raw_response?: string;
}
```

### GridStackNode

```typescript
interface GridStackNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}
```

### WidgetCardData

```typescript
type WidgetCardData = 
  | string 
  | string[] 
  | Array<Record<string, any>>
  | null 
  | undefined;
```


## Correctness Properties

属性是一种特征或行为,应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。

### Property Reflection

在定义属性之前,我们需要识别并消除冗余:

**合并的属性**:
- 1.1, 1.3, 1.4 可以合并为一个关于响应式网格布局的综合属性
- 8.1, 8.2, 8.3 可以合并为一个关于响应式断点的属性
- 2.1, 2.2 可以合并为一个关于交互反馈的属性
- 3.1, 3.2, 3.3, 3.4 可以合并为一个关于数据类型渲染的属性
- 6.1, 6.2, 6.3, 6.4 可以合并为一个关于编辑器类型选择的属性

**冗余的属性**:
- 3.5 和 7.5 都是关于空状态的测试,保留 3.5
- 4.3 和 5.2 都涉及翻译进度,合并为一个属性

### 核心属性

**Property 1: 响应式网格布局一致性**

*对于任何* 报告数据和视口宽度,当渲染报告时,所有 Widget_Card 应该被正确排列在响应式网格中,卡片之间的间距应该保持一致,并且布局应该根据视口宽度自动调整列数。

**Validates: Requirements 1.1, 1.3, 1.4, 8.1, 8.2, 8.3**

---

**Property 2: 卡片高度自适应**

*对于任何* 数据类型和内容长度,当渲染 Widget_Card 时,卡片的初始高度应该根据内容自动计算,确保内容完整可见或提供滚动功能。

**Validates: Requirements 1.2, 3.6**

---

**Property 3: 类别样式区分**

*对于任何* 分析维度类别(listing、reviews、cross),当渲染 Widget_Card 时,卡片应该应用对应类别的视觉样式(颜色、图标),使不同类别在视觉上可区分。

**Validates: Requirements 1.5**

---

**Property 4: 交互状态视觉反馈**

*对于任何* Widget_Card,当用户执行交互操作(悬停、拖拽、调整大小)时,系统应该提供清晰的视觉反馈(显示操作按钮、改变光标、添加状态类)。

**Validates: Requirements 2.1, 2.2**

---

**Property 5: 模式切换正确性**

*对于任何* Widget_Card,当用户点击编辑按钮时,卡片应该从 View_Mode 切换到 Edit_Mode;当用户点击完成按钮时,卡片应该保存修改并切换回 View_Mode。

**Validates: Requirements 2.4, 2.6**

---

**Property 6: 翻译模式编辑禁用**

*对于任何* Widget_Card,当系统处于 Translation_Mode 时,编辑按钮应该被禁用,并显示禁用原因提示。

**Validates: Requirements 2.5, 4.4**

---

**Property 7: 数据类型渲染正确性**

*对于任何* 数据类型(字符串、字符串数组、对象数组、路径数组),当渲染 Widget_Card 内容时,系统应该选择对应的渲染器并生成正确的 HTML 结构。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

**Property 8: 工具栏固定定位**

*对于任何* 滚动位置,当用户滚动页面时,工具栏应该保持固定在视口顶部并始终可见。

**Validates: Requirements 4.1, 4.2**

---

**Property 9: 翻译流程完整性**

*对于任何* 报告,当用户选择翻译模型并点击翻译按钮时,系统应该显示翻译进度,逐个翻译所有 Widget_Card,完成后自动切换到 Translation_Mode。

**Validates: Requirements 4.3, 5.1, 5.2, 5.3**

---

**Property 10: 文件操作正确性**

*对于任何* 报告,当用户点击导出按钮时,系统应该生成 JSON 文件并触发下载;当用户点击复制 Markdown 按钮时,系统应该将报告内容转换为 Markdown 格式并复制到剪贴板。

**Validates: Requirements 4.5, 4.6**

---

**Property 11: 语言切换一致性**

*对于任何* 已翻译的报告,当用户切换语言开关时,所有 Widget_Card 的内容应该在原文和译文之间同步切换。

**Validates: Requirements 5.4**

---

**Property 12: 报告重新生成状态清理**

*对于任何* 报告,当用户重新生成报告时,系统应该清除之前的翻译结果、编辑历史和布局配置,恢复到初始状态。

**Validates: Requirements 5.6**

---

**Property 13: 编辑器类型匹配**

*对于任何* 数据类型,当用户进入 Edit_Mode 时,系统应该根据数据类型(字符串、数组、对象数组)显示对应的编辑器(文本框、列表编辑器、表单编辑器)。

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

---

**Property 14: 编辑撤销功能**

*对于任何* 编辑操作,当用户修改内容时,系统应该自动创建编辑快照;当用户点击撤销按钮时,系统应该恢复到上一个快照状态。

**Validates: Requirements 6.5, 6.7**

---

**Property 15: 编辑保存完整性**

*对于任何* 编辑内容,当用户点击完成按钮时,系统应该验证并保存修改,更新报告数据,并退出 Edit_Mode。

**Validates: Requirements 6.6**

---

**Property 16: 加载状态骨架屏**

*对于任何* 分析请求,当 AI 正在分析时,系统应该为每个选中的分析模块显示骨架屏加载状态,直到分析完成或失败。

**Validates: Requirements 7.3**

---

**Property 17: 响应式工具栏布局**

*对于任何* 视口宽度,当屏幕宽度小于 768px 时,工具栏应该调整为垂直堆叠布局;否则应该使用水平布局。

**Validates: Requirements 8.4**

---

**Property 18: 移动设备拖拽禁用**

*对于任何* 移动设备(触摸屏),当用户访问报告页面时,系统应该禁用 Widget_Card 的拖拽功能,但保留其他交互(编辑、调整大小)。

**Validates: Requirements 8.5**

---

**Property 19: ARIA 标签完整性**

*对于任何* Widget_Card 和工具栏按钮,渲染的 HTML 应该包含适当的 ARIA 标签(role、aria-label、aria-describedby)和描述性的 title 属性。

**Validates: Requirements 10.1, 10.3**

---

**Property 20: 键盘导航焦点指示**

*对于任何* 可交互元素,当用户使用 Tab 键导航时,当前焦点元素应该显示清晰的焦点样式(outline 或 ring)。

**Validates: Requirements 10.2**

---

**Property 21: 颜色对比度合规性**

*对于任何* 文本和背景颜色组合,颜色对比度应该至少达到 WCAG AA 标准(正常文本 4.5:1,大文本 3:1)。

**Validates: Requirements 10.5**


## Error Handling

### 1. 渲染错误处理

**场景**: Widget_Card 数据格式异常或渲染失败

**策略**:
```typescript
try {
  const html = renderViewModeHTML(data, style);
  return html;
} catch (error) {
  console.error(`[WidgetCard] 渲染失败: ${key}`, error);
  return `
    <div class="p-6 bg-red-50 border border-red-200 rounded-xl">
      <div class="flex items-center gap-2 text-red-700 mb-2">
        <i class="fas fa-exclamation-triangle"></i>
        <span class="font-semibold">渲染错误</span>
      </div>
      <p class="text-sm text-red-600">无法渲染此卡片的内容</p>
    </div>
  `;
}
```

### 2. GridStack 初始化失败

**场景**: GridStack 库加载失败或初始化异常

**策略**:
```typescript
try {
  await loadGridStack();
  this.grid = GridStack.init(options, container);
} catch (error) {
  console.error('[GridManager] 初始化失败', error);
  showToast('网格布局初始化失败,将使用简单布局', 'warning');
  // 降级到简单的 flex 布局
  container.classList.add('simple-grid-fallback');
}
```

### 3. 翻译失败处理

**场景**: 翻译 API 调用失败或超时

**策略**:
```typescript
try {
  const translated = await translateCard(cardKey, content);
  return translated;
} catch (error) {
  console.error(`[Translation] 翻译失败: ${cardKey}`, error);
  showToast(`翻译失败: ${error.message}`, 'error');
  // 保持原文,不切换到翻译模式
  state.analysis.showTranslation = false;
  throw error;
}
```

### 4. 编辑保存失败

**场景**: 编辑内容验证失败或保存异常

**策略**:
```typescript
try {
  const newData = collectEditedData(key);
  validateData(newData);
  saveToReport(key, newData);
  exitEditMode(key);
} catch (error) {
  console.error(`[Edit] 保存失败: ${key}`, error);
  showToast(`保存失败: ${error.message}`, 'error');
  // 保持编辑模式,允许用户修正
  return;
}
```

### 5. 布局持久化失败

**场景**: 保存或加载布局配置失败

**策略**:
```typescript
try {
  const layout = this.grid.save();
  StorageService.set(STORAGE_KEYS.GRID_LAYOUT, layout);
} catch (error) {
  console.error('[GridManager] 布局保存失败', error);
  // 静默失败,不影响用户操作
}
```

### 错误边界原则

1. **快速失败**: 在开发环境中立即暴露错误
2. **优雅降级**: 在生产环境中提供降级方案
3. **用户友好**: 显示清晰的错误提示,避免技术术语
4. **日志记录**: 记录所有错误到控制台,便于调试
5. **状态恢复**: 错误后尽可能恢复到稳定状态


## Testing Strategy

### 测试方法

本项目采用**双重测试方法**:

1. **单元测试**: 验证具体示例、边缘情况和错误条件
2. **属性测试**: 验证跨所有输入的通用属性

两者是互补的,都是全面覆盖所必需的:
- 单元测试捕获具体的 bug
- 属性测试验证一般正确性

### 属性测试配置

**测试库**: 使用 `fast-check` (TypeScript 的属性测试库)

**配置要求**:
- 每个属性测试最少运行 100 次迭代(由于随机化)
- 每个测试必须引用其设计文档属性
- 标签格式: `Feature: master-prompt-analysis-ux-optimization, Property {number}: {property_text}`

**示例**:
```typescript
import fc from 'fast-check';

// Feature: master-prompt-analysis-ux-optimization, Property 7: 数据类型渲染正确性
describe('Property 7: Data Type Rendering', () => {
  it('should render correct HTML structure for any data type', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.array(fc.string()),
          fc.array(fc.record({ key: fc.string() }))
        ),
        (data) => {
          const html = renderViewModeHTML(data);
          expect(html).toBeTruthy();
          expect(html).toContain('<div');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 单元测试重点

单元测试应该聚焦于:

1. **具体示例**: 演示正确行为的特定案例
2. **边缘情况**: 空数据、超长内容、特殊字符
3. **错误条件**: 无效输入、API 失败、网络错误
4. **集成点**: 组件之间的交互

**避免过多单元测试**: 属性测试已经覆盖了大量输入,单元测试应该补充而不是重复。

### 测试覆盖范围

#### 1. 渲染层测试

**属性测试**:
- Property 7: 数据类型渲染正确性
- Property 2: 卡片高度自适应
- Property 3: 类别样式区分

**单元测试**:
- 空状态渲染
- 超长文本处理
- 特殊字符转义

#### 2. 交互层测试

**属性测试**:
- Property 4: 交互状态视觉反馈
- Property 5: 模式切换正确性
- Property 6: 翻译模式编辑禁用

**单元测试**:
- 拖拽事件处理
- 编辑按钮点击
- 快捷键响应

#### 3. 状态管理测试

**属性测试**:
- Property 14: 编辑撤销功能
- Property 15: 编辑保存完整性
- Property 12: 报告重新生成状态清理

**单元测试**:
- 状态初始化
- 状态更新顺序
- 状态持久化

#### 4. 布局管理测试

**属性测试**:
- Property 1: 响应式网格布局一致性
- Property 17: 响应式工具栏布局
- Property 18: 移动设备拖拽禁用

**单元测试**:
- GridStack 初始化
- 布局保存/加载
- 断点切换

#### 5. 可访问性测试

**属性测试**:
- Property 19: ARIA 标签完整性
- Property 20: 键盘导航焦点指示
- Property 21: 颜色对比度合规性

**单元测试**:
- 屏幕阅读器兼容性
- 键盘导航流程
- 颜色对比度计算

### 测试工具

- **单元测试**: Jest + Testing Library
- **属性测试**: fast-check
- **E2E 测试**: Playwright (可选)
- **可访问性**: axe-core
- **视觉回归**: Percy (可选)

### 测试执行

```bash
# 运行所有测试
npm test

# 运行属性测试
npm test -- --testNamePattern="Property"

# 运行单元测试
npm test -- --testNamePattern="Unit"

# 生成覆盖率报告
npm test -- --coverage
```

### 持续集成

- 所有测试必须在 PR 合并前通过
- 属性测试失败时,记录失败的反例
- 代码覆盖率目标: 80% (核心逻辑)

