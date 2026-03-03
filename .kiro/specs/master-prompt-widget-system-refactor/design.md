# Design Document

## Overview

本文档描述 Master Prompt 分析报告模块的 Widget 系统重构设计。当前系统使用 GridStack 实现可拖拽的卡片布局，但存在严重的稳定性和可维护性问题。本次重构将完全重写实现层，确保系统的稳定性、可维护性和可扩展性。

### 技术方案选择

经过技术调研和分析，有两个可行的技术方案：

#### 方案 1: 优化 GridStack 实现（推荐）

**核心思路：** 保留 GridStack 作为底层网格引擎，但完全重构实现层，遵循最佳实践。

**优势：**
- GridStack 已集成，功能完整（拖拽、调整大小、响应式、持久化）
- 12 列网格系统，完全符合需求
- TypeScript 支持完善，文档和社区成熟
- 开发风险低，不需要引入新依赖
- 当前问题主要是实现层面的，不是库本身的问题

**解决当前问题的策略：**
1. **GridManager 重构：** 完全重写，添加完善的错误处理、状态管理、生命周期管理
2. **布局持久化修复：** 使用防抖优化保存时机，改进加载逻辑，处理配置损坏
3. **响应式优化：** 正确配置断点，处理列数切换
4. **编辑模式修复：** 使用 `noMove` 和 `noResize` 正确禁用拖拽和调整大小

#### 方案 2: 替换为 Muuri + interact.js

**核心思路：** 使用 Muuri 作为布局引擎，集成 interact.js 实现调整大小功能。

**优势：**
- 更现代的布局引擎，性能优秀（Web Animations API）
- API 灵活，易于扩展
- 动画效果更流畅

**劣势：**
- 不内置调整大小功能，需要额外集成
- 需要自定义 12 列网格系统
- 学习曲线较高，开发成本和风险较高
- 引入新依赖，增加项目复杂度

**推荐方案：方案 1（优化 GridStack 实现）**

理由：GridStack 本身是成熟稳定的外部方案，当前问题主要是实现层面的。完全重构实现可以解决所有已知问题，且风险低、开发成本低。

---

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     AnalysisModule                          │
│  (主模块 - 继承 BaseModule)                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ 管理
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  WidgetSystemManager                        │
│  (Widget 系统管理器 - 新增)                                  │
│  - 初始化和销毁 GridManager                                  │
│  - 管理 Widget 生命周期                                      │
│  - 协调编辑模式和查看模式                                     │
│  - 处理布局持久化                                            │
└────────┬────────────────────────────────┬──────────────────┘
         │                                │
         │ 使用                           │ 使用
         ▼                                ▼
┌──────────────────────┐      ┌──────────────────────────┐
│   GridManager        │      │   WidgetRenderer         │
│  (网格管理器 - 重构)  │      │  (Widget 渲染器 - 重构)   │
│  - 封装 GridStack    │      │  - 渲染 Widget 卡片      │
│  - 管理拖拽和调整大小 │      │  - 管理查看/编辑模式     │
│  - 处理响应式布局     │      │  - 处理内容渲染          │
│  - 保存/加载布局      │      │  - 管理事件监听          │
└──────────────────────┘      └──────────────────────────┘
         │                                │
         │ 依赖                           │ 依赖
         ▼                                ▼
┌──────────────────────┐      ┌──────────────────────────┐
│   GridStack (外部库)  │      │  ViewModeRenderer        │
│  - 网格布局引擎       │      │  EditModeRenderer        │
│  - 拖拽和调整大小     │      │  (现有渲染器)            │
└──────────────────────┘      └──────────────────────────┘
```

### 架构设计原则

1. **单一职责原则 (SRP)**
   - `WidgetSystemManager`: 负责 Widget 系统的整体协调
   - `GridManager`: 负责网格布局管理
   - `WidgetRenderer`: 负责 Widget 渲染和事件处理

2. **依赖倒置原则 (DIP)**
   - 高层模块（AnalysisModule）不直接依赖 GridStack
   - 通过 WidgetSystemManager 和 GridManager 抽象层隔离

3. **开闭原则 (OCP)**
   - 易于扩展新的 Widget 类型
   - 易于替换底层网格引擎（如果未来需要）

4. **快速失败 (Fail-Fast)**
   - 所有错误立即抛出，不掩盖问题
   - 详细的错误日志用于调试

---

## Components and Interfaces

### 1. WidgetSystemManager

**职责：** Widget 系统的总协调者，管理整个 Widget 系统的生命周期。

**接口定义：**

```typescript
interface WidgetSystemConfig {
  container: HTMLElement;           // 网格容器
  storageKey: string;                // 布局持久化键名
  onLayoutChange?: () => void;       // 布局变化回调
  onEditModeChange?: (widgetId: string, isEditing: boolean) => void; // 编辑模式变化回调
}

interface WidgetData {
  id: string;                        // Widget 唯一标识
  title: string;                     // Widget 标题
  category: 'listing' | 'reviews' | 'cross'; // Widget 类别
  content: any;                      // Widget 内容数据
  gridOptions?: {                    // 网格选项
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  };
}

class WidgetSystemManager {
  private gridManager: GridManager;
  private widgetRenderer: WidgetRenderer;
  private widgets: Map<string, WidgetData>;
  private editingWidgetId: string | null;
  
  constructor(config: WidgetSystemConfig);
  
  // 生命周期管理
  init(): void;
  destroy(): void;
  
  // Widget 管理
  addWidget(data: WidgetData): void;
  removeWidget(widgetId: string): void;
  updateWidget(widgetId: string, content: any): void;
  clearAllWidgets(): void;
  
  // 编辑模式管理
  enterEditMode(widgetId: string): void;
  exitEditMode(widgetId: string, save: boolean): void;
  isEditing(widgetId: string): boolean;
  
  // 布局管理
  saveLayout(): void;
  loadLayout(): void;
  resetLayout(): void;
  
  // 响应式管理
  handleResize(): void;
}
```

**核心逻辑：**

1. **初始化流程：**
   ```typescript
   init() {
     // 1. 初始化 GridManager
     this.gridManager.init(this.container, gridOptions);
     
     // 2. 加载保存的布局配置
     this.loadLayout();
     
     // 3. 监听网格事件
     this.gridManager.on('change', () => this.handleLayoutChange());
     this.gridManager.on('resizestop', () => this.saveLayout());
     this.gridManager.on('dragstop', () => this.saveLayout());
     
     // 4. 监听窗口大小变化
     window.addEventListener('resize', debounce(() => this.handleResize(), 300));
   }
   ```

2. **添加 Widget 流程：**
   ```typescript
   addWidget(data: WidgetData) {
     // 1. 渲染 Widget HTML
     const widgetElement = this.widgetRenderer.render(data);
     
     // 2. 添加到网格
     const gridOptions = {
       x: data.gridOptions?.x,
       y: data.gridOptions?.y,
       w: data.gridOptions?.w || 4,
       h: data.gridOptions?.h || 3,
       id: data.id,
       noResize: false,
       noMove: false
     };
     
     this.gridManager.addWidget(widgetElement, gridOptions);
     
     // 3. 保存到内部映射
     this.widgets.set(data.id, data);
     
     // 4. 绑定事件监听器
     this.widgetRenderer.bindEvents(widgetElement, data.id);
   }
   ```

3. **编辑模式切换流程：**
   ```typescript
   enterEditMode(widgetId: string) {
     // 1. 检查是否已有其他 Widget 在编辑
     if (this.editingWidgetId && this.editingWidgetId !== widgetId) {
       throw new Error('另一个 Widget 正在编辑中');
     }
     
     // 2. 禁用该 Widget 的拖拽和调整大小
     const widgetElement = document.getElementById(`widget-${widgetId}`);
     this.gridManager.disableDrag(widgetElement);
     this.gridManager.disableResize(widgetElement);
     
     // 3. 切换到编辑模式渲染
     const widgetData = this.widgets.get(widgetId);
     this.widgetRenderer.renderEditMode(widgetElement, widgetData);
     
     // 4. 更新状态
     this.editingWidgetId = widgetId;
     
     // 5. 触发回调
     this.config.onEditModeChange?.(widgetId, true);
   }
   
   exitEditMode(widgetId: string, save: boolean) {
     // 1. 如果保存，更新数据
     if (save) {
       const newContent = this.widgetRenderer.getEditedContent(widgetId);
       this.updateWidget(widgetId, newContent);
     }
     
     // 2. 重新启用拖拽和调整大小
     const widgetElement = document.getElementById(`widget-${widgetId}`);
     this.gridManager.enableDrag(widgetElement);
     this.gridManager.enableResize(widgetElement);
     
     // 3. 切换回查看模式渲染
     const widgetData = this.widgets.get(widgetId);
     this.widgetRenderer.renderViewMode(widgetElement, widgetData);
     
     // 4. 更新状态
     this.editingWidgetId = null;
     
     // 5. 触发回调
     this.config.onEditModeChange?.(widgetId, false);
   }
   ```

### 2. GridManager (重构版)

**职责：** 封装 GridStack 的复杂性，提供简洁的网格管理接口。

**接口定义：**

```typescript
interface GridOptions {
  column: number;                    // 列数（默认 12）
  cellHeight: number;                // 单元格高度（像素）
  margin: number;                    // 卡片间距（像素）
  animate: boolean;                  // 是否启用动画
  float: boolean;                    // 是否允许浮动布局
  disableOneColumnMode: boolean;     // 是否禁用单列模式
  minRow: number;                    // 最小行数
  resizable: {
    handles: string;                 // 调整大小手柄位置
  };
}

interface GridWidget {
  x?: number;                        // X 坐标（网格单元）
  y?: number;                        // Y 坐标（网格单元）
  w: number;                         // 宽度（网格单元）
  h: number;                         // 高度（网格单元）
  id: string;                        // Widget ID
  noResize?: boolean;                // 是否禁用调整大小
  noMove?: boolean;                  // 是否禁用拖拽
  minW?: number;                     // 最小宽度
  minH?: number;                     // 最小高度
  maxW?: number;                     // 最大宽度
  maxH?: number;                     // 最大高度
}

interface LayoutNode {
  x: number;
  y: number;
  w: number;
  h: number;
  id: string;
}

class GridManager {
  private grid: GridStackInstance | null;
  private storageKey: string;
  private eventListeners: Map<string, Function[]>;
  
  constructor(storageKey: string);
  
  // 生命周期管理
  init(container: HTMLElement, options?: Partial<GridOptions>): void;
  destroy(): void;
  isInitialized(): boolean;
  
  // Widget 管理
  addWidget(element: HTMLElement, options: GridWidget): HTMLElement;
  removeWidget(element: HTMLElement): void;
  updateWidget(element: HTMLElement, options: Partial<GridWidget>): void;
  
  // 拖拽和调整大小控制
  enableDrag(element: HTMLElement): void;
  disableDrag(element: HTMLElement): void;
  enableResize(element: HTMLElement): void;
  disableResize(element: HTMLElement): void;
  enableAll(): void;
  disableAll(): void;
  
  // 布局管理
  saveLayout(): LayoutNode[];
  loadLayout(layout?: LayoutNode[]): void;
  getLayout(): LayoutNode[];
  
  // 响应式管理
  setColumn(column: number): void;
  compact(): void;
  
  // 事件管理
  on(event: string, callback: Function): void;
  off(event: string, callback?: Function): void;
  
  // 批量更新优化
  batchUpdate(callback: () => void): void;
}
```

**核心改进：**

1. **完善的错误处理：**
   ```typescript
   init(container: HTMLElement, options?: Partial<GridOptions>): void {
     // 快速失败：验证参数
     if (!container) {
       throw new Error('[GridManager] 容器元素无效');
     }
     
     if (typeof window.GridStack === 'undefined') {
       throw new Error('[GridManager] GridStack 库未加载');
     }
     
     // 如果已初始化，先销毁
     if (this.grid) {
       console.warn('[GridManager] 检测到已存在的实例，正在销毁...');
       this.destroy();
     }
     
     try {
       // 合并默认配置
       const finalOptions = {
         ...DEFAULT_GRID_OPTIONS,
         ...options
       };
       
       // 初始化 GridStack
       this.grid = GridStack.init(finalOptions, container);
       
       console.log('[GridManager] 初始化成功', finalOptions);
     } catch (error) {
       // 快速失败：抛出详细错误
       const message = error instanceof Error ? error.message : String(error);
       throw new Error(`[GridManager] 初始化失败: ${message}`);
     }
   }
   ```

2. **改进的布局持久化：**
   ```typescript
   saveLayout(): LayoutNode[] {
     this.ensureInitialized();
     
     try {
       // 获取当前布局
       const layout = this.grid!.save(false) as LayoutNode[];
       
       // 持久化到存储（使用 try-catch 避免存储失败阻塞）
       try {
         StorageService.set(this.storageKey, layout);
         console.log('[GridManager] 布局已保存', layout);
       } catch (storageError) {
         console.warn('[GridManager] 布局保存到存储失败', storageError);
         // 存储失败不应该阻塞，继续返回布局数据
       }
       
       return layout;
     } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       throw new Error(`[GridManager] 保存布局失败: ${message}`);
     }
   }
   
   loadLayout(layout?: LayoutNode[]): void {
     this.ensureInitialized();
     
     try {
       let layoutToLoad = layout;
       
       // 如果没有提供布局，从存储读取
       if (!layoutToLoad) {
         const storedLayout = StorageService.get(this.storageKey);
         if (storedLayout && Array.isArray(storedLayout)) {
           layoutToLoad = storedLayout as LayoutNode[];
         }
       }
       
       // 如果没有可用布局，使用默认布局
       if (!layoutToLoad || layoutToLoad.length === 0) {
         console.log('[GridManager] 没有可加载的布局，使用默认布局');
         return;
       }
       
       // 验证布局数据
       if (!this.validateLayout(layoutToLoad)) {
         console.warn('[GridManager] 布局数据无效，使用默认布局');
         return;
       }
       
       // 应用布局
       this.grid!.load(layoutToLoad);
       console.log('[GridManager] 布局已加载', layoutToLoad);
     } catch (error) {
       // 布局加载失败不应该阻塞应用
       console.error('[GridManager] 加载布局失败', error);
       console.warn('[GridManager] 将使用默认布局');
     }
   }
   
   private validateLayout(layout: LayoutNode[]): boolean {
     // 验证布局数据的完整性
     return layout.every(node => 
       typeof node.x === 'number' &&
       typeof node.y === 'number' &&
       typeof node.w === 'number' &&
       typeof node.h === 'number' &&
       typeof node.id === 'string'
     );
   }
   ```

3. **响应式支持：**
   ```typescript
   setColumn(column: number): void {
     this.ensureInitialized();
     
     try {
       // 保存当前布局
       const currentLayout = this.getLayout();
       
       // 切换列数
       this.grid!.column(column);
       
       // 重新应用布局（GridStack 会自动调整）
       this.grid!.load(currentLayout);
       
       console.log(`[GridManager] 列数已切换为 ${column}`);
     } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       throw new Error(`[GridManager] 切换列数失败: ${message}`);
     }
   }
   ```

4. **事件管理：**
   ```typescript
   on(event: string, callback: Function): void {
     this.ensureInitialized();
     
     try {
       // 注册到 GridStack
       this.grid!.on(event, callback as any);
       
       // 保存到内部映射（用于清理）
       if (!this.eventListeners.has(event)) {
         this.eventListeners.set(event, []);
       }
       this.eventListeners.get(event)!.push(callback);
       
       console.log(`[GridManager] 事件监听器已注册: ${event}`);
     } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       throw new Error(`[GridManager] 注册事件监听器失败: ${message}`);
     }
   }
   
   off(event: string, callback?: Function): void {
     this.ensureInitialized();
     
     try {
       if (callback) {
         // 移除特定回调
         this.grid!.off(event, callback as any);
         
         // 从内部映射移除
         const listeners = this.eventListeners.get(event);
         if (listeners) {
           const index = listeners.indexOf(callback);
           if (index > -1) {
             listeners.splice(index, 1);
           }
         }
       } else {
         // 移除所有回调
         this.grid!.off(event);
         this.eventListeners.delete(event);
       }
       
       console.log(`[GridManager] 事件监听器已移除: ${event}`);
     } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       console.error(`[GridManager] 移除事件监听器失败: ${message}`);
     }
   }
   
   destroy(): void {
     if (!this.grid) return;
     
     try {
       // 移除所有事件监听器
       this.eventListeners.forEach((callbacks, event) => {
         callbacks.forEach(callback => {
           this.grid!.off(event, callback as any);
         });
       });
       this.eventListeners.clear();
       
       // 销毁 GridStack 实例
       this.grid.destroy(false);
       this.grid = null;
       
       console.log('[GridManager] 已销毁');
     } catch (error) {
       console.error('[GridManager] 销毁失败', error);
       // 即使销毁失败，也要清理引用
       this.grid = null;
       this.eventListeners.clear();
     }
   }
   ```

### 3. WidgetRenderer

**职责：** 负责 Widget 的渲染和事件处理。

**接口定义：**

```typescript
interface RenderOptions {
  isTranslationMode: boolean;        // 是否处于翻译模式
  showSkeleton: boolean;             // 是否显示骨架屏
}

class WidgetRenderer {
  private viewModeRenderer: ViewModeRenderer;
  private editModeRenderer: EditModeRenderer;
  private eventListeners: Map<string, EventListener[]>;
  
  constructor();
  
  // 渲染方法
  render(data: WidgetData, options?: Partial<RenderOptions>): HTMLElement;
  renderViewMode(element: HTMLElement, data: WidgetData): void;
  renderEditMode(element: HTMLElement, data: WidgetData): void;
  renderSkeleton(element: HTMLElement): void;
  
  // 事件管理
  bindEvents(element: HTMLElement, widgetId: string): void;
  unbindEvents(element: HTMLElement): void;
  
  // 编辑模式数据获取
  getEditedContent(widgetId: string): any;
  
  // 清理
  destroy(): void;
}
```

**核心逻辑：**

```typescript
render(data: WidgetData, options?: Partial<RenderOptions>): HTMLElement {
  const { isTranslationMode = false, showSkeleton = false } = options || {};
  
  // 1. 创建 Widget 容器
  const container = document.createElement('div');
  container.id = `widget-${data.id}`;
  container.className = 'analysis-widget-card';
  container.dataset.widgetId = data.id;
  container.dataset.category = data.category;
  
  // 2. 获取样式配置
  const style = this.getStyleForCategory(data.category);
  
  // 3. 渲染内容
  if (showSkeleton || data.content === '__LOADING__') {
    // 显示骨架屏
    container.innerHTML = renderSkeleton();
  } else {
    // 渲染完整卡片
    const contentHTML = this.viewModeRenderer.render(data.content);
    container.innerHTML = renderWidgetCard(
      data.id,
      data.title,
      style,
      isTranslationMode,
      contentHTML
    );
  }
  
  return container;
}

bindEvents(element: HTMLElement, widgetId: string): void {
  // 1. 编辑按钮
  const editBtn = element.querySelector('.btn-edit');
  if (editBtn) {
    const handler = () => this.onEditClick(widgetId);
    editBtn.addEventListener('click', handler);
    this.saveEventListener(widgetId, editBtn, 'click', handler);
  }
  
  // 2. 调整大小按钮
  const resizeBtn = element.querySelector('.btn-resize');
  if (resizeBtn) {
    const handler = () => this.onResizeClick(widgetId);
    resizeBtn.addEventListener('click', handler);
    this.saveEventListener(widgetId, resizeBtn, 'click', handler);
  }
  
  // 3. 保存按钮（编辑模式）
  const saveBtn = element.querySelector('.btn-save');
  if (saveBtn) {
    const handler = () => this.onSaveClick(widgetId);
    saveBtn.addEventListener('click', handler);
    this.saveEventListener(widgetId, saveBtn, 'click', handler);
  }
  
  // 4. 撤销按钮（编辑模式）
  const undoBtn = element.querySelector('.btn-undo');
  if (undoBtn) {
    const handler = () => this.onUndoClick(widgetId);
    undoBtn.addEventListener('click', handler);
    this.saveEventListener(widgetId, undoBtn, 'click', handler);
  }
}

unbindEvents(element: HTMLElement): void {
  const widgetId = element.dataset.widgetId;
  if (!widgetId) return;
  
  // 移除所有保存的事件监听器
  const listeners = this.eventListeners.get(widgetId);
  if (listeners) {
    listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners.delete(widgetId);
  }
}
```

---

## Data Models

### WidgetData

```typescript
interface WidgetData {
  id: string;                        // Widget 唯一标识（对应 Analysis Module ID）
  title: string;                     // Widget 标题（中文）
  category: 'listing' | 'reviews' | 'cross'; // Widget 类别
  content: any;                      // Widget 内容数据（可以是字符串、数组、对象）
  gridOptions?: {                    // 网格选项（可选）
    x?: number;                      // X 坐标（网格单元）
    y?: number;                      // Y 坐标（网格单元）
    w?: number;                      // 宽度（网格单元，默认 4）
    h?: number;                      // 高度（网格单元，默认 3）
  };
}
```

### LayoutConfig

```typescript
interface LayoutConfig {
  version: string;                   // 配置版本（用于兼容性检查）
  timestamp: number;                 // 保存时间戳
  nodes: LayoutNode[];               // 布局节点数组
}

interface LayoutNode {
  id: string;                        // Widget ID
  x: number;                         // X 坐标（网格单元）
  y: number;                         // Y 坐标（网格单元）
  w: number;                         // 宽度（网格单元）
  h: number;                         // 高度（网格单元）
}
```

### StyleConfig

```typescript
interface StyleConfig {
  color: string;                     // 主题颜色名称（如 'blue', 'amber'）
  bg: string;                        // 背景色类名（如 'bg-blue-600'）
  lightBg: string;                   // 浅背景色类名（如 'bg-blue-50'）
  icon: string;                      // Font Awesome 图标类名（如 'fa-file-alt'）
}

// 预定义样式映射
const CATEGORY_STYLES: Record<string, StyleConfig> = {
  listing: { 
    color: "blue", 
    bg: "bg-blue-600", 
    lightBg: "bg-blue-50", 
    icon: "fa-file-alt" 
  },
  reviews: { 
    color: "amber", 
    bg: "bg-amber-500", 
    lightBg: "bg-amber-50", 
    icon: "fa-comments" 
  },
  cross: { 
    color: "violet", 
    bg: "bg-violet-600", 
    lightBg: "bg-violet-50", 
    icon: "fa-shuffle" 
  },
};
```

---

## Correctness Properties

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*


### Property Reflection

在生成属性之前，让我识别可以合并的冗余属性：

**可合并的属性：**
1. 属性 2.5、3.5、6.2 都测试编辑模式下禁用拖拽和调整大小 → 合并为一个综合属性
2. 属性 2.2 和 3.1 都测试 UI 反馈元素的显示 → 可以合并为一个属性
3. 属性 8.3 和 8.4 都测试性能优化（防抖/节流）→ 可以合并

**保留的独立属性：**
- 布局持久化的往返属性 (4.3) 是核心属性，必须保留
- Widget 创建和渲染属性 (1.1, 1.2, 1.4) 是基础功能，必须保留
- 拖拽和调整大小的核心功能 (2.1, 2.3, 3.2, 3.3) 必须保留
- 错误处理属性 (9.1-9.5) 是独立的错误场景，必须保留

### Correctness Properties

**Property 1: Widget 创建完整性**
*For any* 分析模块列表，当创建 Widget 系统时，创建的 Widget 数量应该等于模块数量，且每个 Widget 都应该有唯一的 ID
**Validates: Requirements 1.1**

**Property 2: Widget DOM 结构完整性**
*For any* Widget 数据，渲染后的 DOM 应该包含标题元素、图标元素、内容区域和操作按钮（编辑、调整大小）
**Validates: Requirements 1.2**

**Property 3: 数据类型渲染一致性**
*For any* 数据类型（字符串、数组、对象），渲染后的 HTML 应该包含该数据类型特定的视觉标记（如数组应该有列表标记，对象应该有键值对结构）
**Validates: Requirements 1.4**

**Property 4: 类别样式映射正确性**
*For any* Widget 类别（listing、reviews、cross），应用的主题颜色应该与预定义的样式映射表匹配
**Validates: Requirements 1.5, 7.2**

**Property 5: 拖拽位置更新**
*For any* Widget 和任意有效的拖拽目标位置，拖拽操作完成后，Widget 的位置应该更新为目标位置（对齐到网格）
**Validates: Requirements 2.1, 2.3**

**Property 6: 拖拽冲突解决**
*For any* 两个 Widget，当拖拽一个 Widget 到另一个 Widget 的位置时，系统应该自动调整位置以避免重叠
**Validates: Requirements 2.4**

**Property 7: 编辑模式禁用交互**
*For any* Widget，当进入编辑模式时，该 Widget 的拖拽和调整大小功能应该被禁用（noMove 和 noResize 属性为 true）
**Validates: Requirements 2.5, 3.5, 6.2**

**Property 8: 调整大小尺寸更新**
*For any* Widget 和任意有效的目标尺寸，调整大小操作完成后，Widget 的尺寸应该更新为目标尺寸
**Validates: Requirements 3.2**

**Property 9: 最小尺寸限制**
*For any* Widget，尝试调整到小于 2x2 网格单元时，最终尺寸应该不小于 2x2
**Validates: Requirements 3.3**

**Property 10: 调整大小冲突解决**
*For any* 两个 Widget，当调整一个 Widget 的尺寸导致与另一个 Widget 重叠时，系统应该自动调整位置以避免重叠
**Validates: Requirements 3.4**

**Property 11: 布局持久化往返一致性**
*For any* 布局配置，保存然后加载应该得到等价的布局（每个 Widget 的 x、y、w、h 属性相同）
**Validates: Requirements 4.2, 4.3**

**Property 12: 布局保存防抖**
*For any* 拖拽或调整大小操作，布局保存应该在操作完成后至少 500ms 才触发，且连续操作应该只触发一次保存
**Validates: Requirements 4.1**

**Property 13: 布局合并正确性**
*For any* 旧布局配置和新的模块列表，合并后的布局应该保留旧布局中仍存在的 Widget 的位置，并为新 Widget 分配默认位置
**Validates: Requirements 4.5**

**Property 14: 编辑模式 UI 切换**
*For any* Widget，进入编辑模式时应该显示编辑表单和保存/撤销按钮，退出编辑模式时应该显示查看模式内容和编辑按钮
**Validates: Requirements 6.1, 6.3**

**Property 15: 编辑保存内容更新**
*For any* Widget 和任意编辑内容，保存编辑后，Widget 的内容应该更新为编辑后的内容
**Validates: Requirements 6.4**

**Property 16: 编辑撤销内容恢复**
*For any* Widget，撤销编辑后，Widget 的内容应该恢复为编辑前的原始内容
**Validates: Requirements 6.5**

**Property 17: 过渡动画应用**
*For any* 交互操作（拖拽、调整大小、模式切换），相关元素应该应用 CSS 过渡样式（transition 属性）
**Validates: Requirements 7.4**

**Property 18: 渲染性能**
*For any* 10 个或更多 Widget 的列表，初始渲染时间应该不超过 1000ms
**Validates: Requirements 8.1**

**Property 19: 拖拽性能**
*For any* Widget，拖拽操作期间的平均帧率应该不低于 55fps（允许 5fps 的误差）
**Validates: Requirements 8.2**

**Property 20: 性能优化应用**
*For any* 高频操作（调整大小、布局保存），应该应用防抖或节流优化，连续触发应该被合并
**Validates: Requirements 8.3, 8.4**

**Property 21: 清理完整性**
*For any* Widget 系统实例，销毁后应该没有残留的事件监听器和 DOM 引用（通过内存分析验证）
**Validates: Requirements 8.5**

**Property 22: 初始化错误处理**
*For any* 无效的初始化参数（如 null 容器），初始化应该抛出包含明确错误信息的 Error 对象
**Validates: Requirements 9.1**

**Property 23: 布局加载错误恢复**
*For any* 损坏的布局配置数据，加载时应该使用默认布局并在控制台记录警告
**Validates: Requirements 9.2**

**Property 24: Widget 渲染错误隔离**
*For any* Widget 列表，即使其中一个 Widget 渲染失败，其他 Widget 应该正常渲染
**Validates: Requirements 9.3**

**Property 25: 操作失败状态恢复**
*For any* 拖拽或调整大小操作，如果操作失败，Widget 的位置和尺寸应该恢复到操作前的状态
**Validates: Requirements 9.4**

**Property 26: 保存失败非阻塞**
*For any* 布局保存操作，即使保存失败，用户应该仍然可以继续操作（不抛出错误，只记录警告）
**Validates: Requirements 9.5**

---

## Error Handling

### 错误处理策略

本系统采用**快速失败 (Fail-Fast)** 策略，确保问题在第一时间被发现和暴露。

### 错误分类和处理

#### 1. 致命错误（Critical Errors）

这些错误会导致系统无法正常工作，必须立即抛出并阻止继续执行。

**示例：**
- GridStack 库未加载
- 容器元素无效
- 必需参数缺失

**处理方式：**
```typescript
if (!container) {
  throw new Error('[WidgetSystemManager] 容器元素无效');
}

if (typeof window.GridStack === 'undefined') {
  throw new Error('[WidgetSystemManager] GridStack 库未加载');
}
```

#### 2. 可恢复错误（Recoverable Errors）

这些错误不会导致系统崩溃，可以通过降级或使用默认值来恢复。

**示例：**
- 布局配置加载失败
- 单个 Widget 渲染失败
- 布局保存失败

**处理方式：**
```typescript
try {
  const layout = StorageService.get(this.storageKey);
  this.gridManager.loadLayout(layout);
} catch (error) {
  console.warn('[WidgetSystemManager] 加载布局失败，使用默认布局', error);
  // 继续使用默认布局，不阻塞应用
}
```

#### 3. 用户操作错误（User Errors）

这些错误由用户的不当操作引起，应该给予友好的提示。

**示例：**
- 尝试在编辑模式下拖拽
- 尝试同时编辑多个 Widget

**处理方式：**
```typescript
if (this.editingWidgetId && this.editingWidgetId !== widgetId) {
  showToast('请先完成当前 Widget 的编辑', 'warning');
  return;
}
```

### 错误日志

所有错误都应该记录详细的日志信息，包括：
- 错误类型和消息
- 错误发生的上下文（模块、方法、参数）
- 错误堆栈（如果可用）

**示例：**
```typescript
try {
  this.gridManager.init(container, options);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[WidgetSystemManager] 初始化失败', {
    container,
    options,
    error: message,
    stack: error instanceof Error ? error.stack : undefined
  });
  throw new Error(`Widget 系统初始化失败: ${message}`);
}
```

---

## Testing Strategy

### 测试方法

本系统采用**双重测试策略**，结合单元测试和属性测试，确保全面的测试覆盖。

#### 1. 单元测试 (Unit Tests)

**用途：**
- 测试具体的示例和边缘情况
- 测试特定的错误条件
- 测试集成点

**示例：**
```typescript
describe('WidgetSystemManager', () => {
  describe('初始化', () => {
    it('应该在容器无效时抛出错误', () => {
      expect(() => {
        new WidgetSystemManager({ container: null });
      }).toThrow('[WidgetSystemManager] 容器元素无效');
    });
    
    it('应该在 GridStack 未加载时抛出错误', () => {
      delete window.GridStack;
      expect(() => {
        new WidgetSystemManager({ container: document.createElement('div') });
      }).toThrow('[WidgetSystemManager] GridStack 库未加载');
    });
  });
  
  describe('响应式布局', () => {
    it('应该在屏幕宽度 >= 1280px 时使用 12 列', () => {
      // 模拟屏幕宽度
      Object.defineProperty(window, 'innerWidth', { value: 1280 });
      manager.handleResize();
      expect(manager.getColumnCount()).toBe(12);
    });
    
    it('应该在屏幕宽度 768-1279px 时使用 6 列', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      manager.handleResize();
      expect(manager.getColumnCount()).toBe(6);
    });
    
    it('应该在屏幕宽度 < 768px 时使用 1 列', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      manager.handleResize();
      expect(manager.getColumnCount()).toBe(1);
    });
  });
});
```

#### 2. 属性测试 (Property-Based Tests)

**用途：**
- 验证通用属性在所有输入下都成立
- 通过随机生成大量测试用例发现边缘情况
- 确保系统的整体正确性

**配置：**
- 使用 `fast-check` 库（TypeScript/JavaScript 的属性测试库）
- 每个属性测试至少运行 100 次迭代
- 每个测试必须引用设计文档中的属性编号

**示例：**
```typescript
import * as fc from 'fast-check';

describe('Widget System Properties', () => {
  /**
   * Feature: master-prompt-widget-system-refactor
   * Property 1: Widget 创建完整性
   * For any 分析模块列表，创建的 Widget 数量应该等于模块数量
   */
  it('Property 1: Widget 创建完整性', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.string(),
          title: fc.string(),
          category: fc.constantFrom('listing', 'reviews', 'cross'),
          content: fc.anything()
        }), { minLength: 1, maxLength: 20 }),
        (modules) => {
          const manager = new WidgetSystemManager({ container: createTestContainer() });
          manager.init();
          
          modules.forEach(module => manager.addWidget(module));
          
          const widgetCount = manager.getWidgetCount();
          expect(widgetCount).toBe(modules.length);
          
          manager.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: master-prompt-widget-system-refactor
   * Property 11: 布局持久化往返一致性
   * For any 布局配置，保存然后加载应该得到等价的布局
   */
  it('Property 11: 布局持久化往返一致性', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.string(),
          x: fc.integer({ min: 0, max: 10 }),
          y: fc.integer({ min: 0, max: 10 }),
          w: fc.integer({ min: 2, max: 6 }),
          h: fc.integer({ min: 2, max: 6 })
        }), { minLength: 1, maxLength: 15 }),
        (layout) => {
          const manager = new WidgetSystemManager({ container: createTestContainer() });
          manager.init();
          
          // 创建 Widget
          layout.forEach(node => {
            manager.addWidget({
              id: node.id,
              title: 'Test',
              category: 'listing',
              content: 'test',
              gridOptions: { x: node.x, y: node.y, w: node.w, h: node.h }
            });
          });
          
          // 保存布局
          const savedLayout = manager.saveLayout();
          
          // 清空并重新加载
          manager.clearAllWidgets();
          manager.loadLayout(savedLayout);
          
          // 验证布局一致性
          const loadedLayout = manager.getLayout();
          expect(loadedLayout).toEqual(savedLayout);
          
          manager.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: master-prompt-widget-system-refactor
   * Property 9: 最小尺寸限制
   * For any Widget，尝试调整到小于 2x2 时，最终尺寸应该不小于 2x2
   */
  it('Property 9: 最小尺寸限制', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }), // 尝试的宽度（小于最小值）
        fc.integer({ min: 0, max: 3 }), // 尝试的高度（小于最小值）
        (targetW, targetH) => {
          const manager = new WidgetSystemManager({ container: createTestContainer() });
          manager.init();
          
          const widgetId = 'test-widget';
          manager.addWidget({
            id: widgetId,
            title: 'Test',
            category: 'listing',
            content: 'test',
            gridOptions: { w: 4, h: 4 }
          });
          
          // 尝试调整到小于最小尺寸
          const element = document.getElementById(`widget-${widgetId}`);
          manager.gridManager.updateWidget(element, { w: targetW, h: targetH });
          
          // 验证最终尺寸不小于 2x2
          const finalLayout = manager.getLayout().find(n => n.id === widgetId);
          expect(finalLayout.w).toBeGreaterThanOrEqual(2);
          expect(finalLayout.h).toBeGreaterThanOrEqual(2);
          
          manager.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 测试覆盖目标

- **单元测试覆盖率：** >= 80%
- **属性测试数量：** 至少 15 个核心属性
- **每个属性测试迭代次数：** >= 100 次

### 测试工具

- **测试框架：** Jest
- **属性测试库：** fast-check
- **DOM 测试：** @testing-library/dom
- **覆盖率工具：** Jest 内置覆盖率报告

---

## Implementation Notes

### 文件结构

```
src/modules/app_center/views/master_prompt/analysis/
├── index.ts                      # AnalysisModule 主模块（保留，集成新系统）
├── WidgetSystemManager.ts        # Widget 系统管理器（新增）
├── GridManager.ts                # 网格管理器（重构）
├── WidgetRenderer.ts             # Widget 渲染器（新增）
├── ViewModeRenderer.ts           # 查看模式渲染器（保留）
├── EditModeRenderer.ts           # 编辑模式渲染器（保留）
├── renderer.ts                   # 渲染器统一接口（保留，更新）
├── performanceUtils.ts           # 性能工具（保留）
└── types.ts                      # 类型定义（新增）
```

### 迁移策略

为了确保平滑过渡，采用以下迁移策略：

1. **阶段 1：创建新组件**
   - 创建 `WidgetSystemManager.ts`
   - 重构 `GridManager.ts`
   - 创建 `WidgetRenderer.ts`
   - 创建 `types.ts`

2. **阶段 2：集成到 AnalysisModule**
   - 在 `index.ts` 中引入 `WidgetSystemManager`
   - 替换现有的 GridStack 初始化逻辑
   - 保留现有的 API 接口（向后兼容）

3. **阶段 3：测试和验证**
   - 编写单元测试
   - 编写属性测试
   - 手动测试所有功能

4. **阶段 4：清理旧代码**
   - 移除不再使用的代码
   - 更新文档和注释

### 性能优化

1. **防抖和节流**
   - 布局保存：500ms 防抖
   - 窗口大小变化：300ms 防抖
   - 拖拽和调整大小：使用 GridStack 内置优化

2. **批量 DOM 更新**
   - 使用 `GridManager.batchUpdate()` 批量添加 Widget
   - 使用 `DocumentFragment` 减少重排

3. **事件委托**
   - 使用事件委托减少事件监听器数量
   - 统一管理事件监听器，防止内存泄漏

4. **懒加载**
   - GridStack 库已通过 `lazyLibs.ts` 实现懒加载
   - Widget 内容按需渲染

### 兼容性

- **浏览器支持：** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **TypeScript 版本：** >= 4.5
- **GridStack 版本：** >= 5.0

### 依赖

- **GridStack：** 网格布局引擎（已集成）
- **Tailwind CSS：** 样式框架（已集成）
- **Font Awesome：** 图标库（已集成）
- **fast-check：** 属性测试库（需要安装）

---

## Future Enhancements

以下是未来可能的增强功能，不在本次重构范围内：

1. **Widget 模板系统**
   - 允许用户保存和加载预定义的布局模板
   - 提供多种预设布局（紧凑、宽松、专注等）

2. **Widget 分组**
   - 允许用户将相关 Widget 分组
   - 支持折叠/展开分组

3. **Widget 过滤和搜索**
   - 根据类别或关键词过滤 Widget
   - 高亮显示匹配的 Widget

4. **Widget 导出**
   - 支持导出单个 Widget 为图片或 PDF
   - 支持导出整个报告为 PDF

5. **协作功能**
   - 支持多用户共享布局配置
   - 支持布局配置的版本控制

6. **高级动画**
   - 更丰富的过渡动画效果
   - Widget 进入/退出动画

7. **无障碍增强**
   - 完整的键盘导航支持
   - 屏幕阅读器优化
   - 高对比度模式

---

## Appendix

### GridStack 配置参考

```typescript
const DEFAULT_GRID_OPTIONS: GridOptions = {
  column: 12,                        // 12 列网格
  cellHeight: 80,                    // 单元格高度 80px
  margin: 16,                        // 卡片间距 16px
  animate: true,                     // 启用动画
  float: false,                      // 禁用浮动（防止自动重排）
  disableOneColumnMode: false,       // 允许单列模式（移动端）
  minRow: 1,                         // 最小行数
  resizable: {
    handles: 'e, se, s, sw, w'       // 调整大小手柄位置
  }
};
```

### 响应式断点

```typescript
const BREAKPOINTS = {
  DESKTOP: 1280,                     // 桌面端：12 列
  TABLET: 768,                       // 平板端：6 列
  MOBILE: 0                          // 移动端：1 列
};

function getColumnCount(width: number): number {
  if (width >= BREAKPOINTS.DESKTOP) return 12;
  if (width >= BREAKPOINTS.TABLET) return 6;
  return 1;
}
```

### 样式类名约定

```typescript
// Widget 容器
.analysis-widget-card                // 基础容器类
.widget-card-container               // 网格项容器类

// Widget 内部结构
.card-header                         // 标题栏
.card-content                        // 内容区域
.card-footer                         // 底部区域（预留）

// 交互状态
.drag-handle                         // 拖拽手柄
.resizable-enabled                   // 可调整大小状态
.editing                             // 编辑模式状态

// 视觉反馈
.group/card                          // Tailwind 分组
.group-hover/card:*                  // 悬停效果
```
