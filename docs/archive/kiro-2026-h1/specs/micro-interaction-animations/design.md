# 设计文档：微交互动画增强系统

## 概述

本设计文档描述了一个纯视觉增强的微交互动画系统，旨在通过细腻的动画效果提升用户体验质量。该系统遵循渐进增强原则，完全向后兼容，不影响任何现有业务逻辑。

### 设计目标

1. **零业务逻辑修改**：只添加视觉效果，不改变任何功能
2. **零技术债务**：使用标准CSS动画，不引入新依赖
3. **零稳定性影响**：动画失败不影响功能使用
4. **性能优先**：所有动画使用GPU加速，保持60fps
5. **可访问性优先**：尊重用户的prefers-reduced-motion设置

### 核心原则

- **渐进增强**：基础功能不依赖动画
- **性能至上**：只使用transform和opacity属性
- **用户控制**：提供全局动画开关和速度调节
- **优雅降级**：不支持的浏览器显示静态效果

## 架构设计

### 系统架构

```
micro-interaction-animations/
├── CSS层
│   ├── animations/
│   │   ├── micro-interactions.css    # 新增：微交互动画定义
│   │   └── keyframes.css             # 现有：基础关键帧（扩展）
│   ├── utilities/
│   │   ├── transitions.css           # 现有：过渡工具类（扩展）
│   │   └── animation-controls.css    # 新增：动画控制工具类
│   └── components/
│       ├── buttons.css               # 现有：按钮样式（增强）
│       ├── cards.css                 # 现有：卡片样式（增强）
│       ├── forms.css                 # 现有：表单样式（增强）
│       ├── toast.css                 # 现有：Toast样式（增强）
│       └── modals.css                # 现有：模态框样式（增强）
│
├── JavaScript层
│   ├── services/
│   │   └── animation-manager.ts      # 新增：动画管理服务
│   ├── utils/
│   │   ├── animation-utils.ts        # 新增：动画工具函数
│   │   └── performance-monitor.ts    # 新增：性能监控
│   └── stores/
│       └── animation-settings.ts     # 新增：动画配置状态管理
│
└── 配置层
    └── animation-config.ts           # 新增：动画配置常量
```

### 分层职责

#### 1. CSS层（视觉表现）
- 定义所有动画关键帧
- 提供动画工具类
- 增强现有组件样式
- 管理CSS变量

#### 2. JavaScript层（逻辑控制）
- 动画配置管理
- 性能监控
- 用户偏好持久化
- 动态类名应用

#### 3. 配置层（参数定义）
- 动画时长常量
- 缓动函数定义
- 默认配置值

## 组件和接口

### 1. 动画管理服务 (AnimationManager)

```typescript
/**
 * 动画管理服务
 * 负责全局动画配置和控制
 */
class AnimationManager {
  private settings: AnimationSettings;
  private performanceMonitor: PerformanceMonitor;

  /**
   * 初始化动画管理器
   */
  constructor();

  /**
   * 启用所有动画
   */
  enableAnimations(): void;

  /**
   * 禁用所有动画
   */
  disableAnimations(): void;

  /**
   * 设置动画速度
   * @param speed - 'fast' | 'normal' | 'slow'
   */
  setAnimationSpeed(speed: AnimationSpeed): void;

  /**
   * 禁用特定类别的动画
   * @param category - 动画类别
   */
  disableCategory(category: AnimationCategory): void;

  /**
   * 启用特定类别的动画
   * @param category - 动画类别
   */
  enableCategory(category: AnimationCategory): void;

  /**
   * 获取当前配置
   */
  getSettings(): AnimationSettings;

  /**
   * 保存配置到localStorage
   */
  saveSettings(): void;

  /**
   * 从localStorage加载配置
   */
  loadSettings(): void;

  /**
   * 检查是否应该减少动画
   */
  shouldReduceMotion(): boolean;
}
```

### 2. 动画工具函数 (AnimationUtils)

```typescript
/**
 * 动画工具函数集合
 */
export const AnimationUtils = {
  /**
   * 为元素添加动画类
   * @param element - 目标元素
   * @param animationClass - 动画类名
   * @param duration - 动画时长（可选）
   */
  addAnimation(
    element: HTMLElement,
    animationClass: string,
    duration?: number
  ): Promise<void>;

  /**
   * 移除元素的动画类
   * @param element - 目标元素
   * @param animationClass - 动画类名
   */
  removeAnimation(element: HTMLElement, animationClass: string): void;

  /**
   * 交错动画应用
   * @param elements - 元素列表
   * @param animationClass - 动画类名
   * @param delay - 每个元素的延迟（ms）
   */
  staggerAnimation(
    elements: HTMLElement[],
    animationClass: string,
    delay: number
  ): void;

  /**
   * 创建涟漪效果
   * @param element - 目标元素
   * @param event - 点击事件
   */
  createRipple(element: HTMLElement, event: MouseEvent): void;

  /**
   * 检查元素是否在视口中
   * @param element - 目标元素
   */
  isInViewport(element: HTMLElement): boolean;

  /**
   * 等待动画结束
   * @param element - 目标元素
   */
  waitForAnimation(element: HTMLElement): Promise<void>;
};
```

### 3. 性能监控器 (PerformanceMonitor)

```typescript
/**
 * 性能监控器
 * 监控动画性能并在必要时降级
 */
class PerformanceMonitor {
  private frameCount: number;
  private lastTime: number;
  private fps: number;
  private threshold: number;

  /**
   * 初始化性能监控
   * @param threshold - FPS阈值（默认55）
   */
  constructor(threshold?: number);

  /**
   * 开始监控
   */
  start(): void;

  /**
   * 停止监控
   */
  stop(): void;

  /**
   * 获取当前FPS
   */
  getCurrentFPS(): number;

  /**
   * 检查性能是否低于阈值
   */
  isPerformanceLow(): boolean;

  /**
   * 注册性能降级回调
   * @param callback - 回调函数
   */
  onPerformanceDrop(callback: () => void): void;
}
```

### 4. 动画配置类型定义

```typescript
/**
 * 动画速度类型
 */
type AnimationSpeed = 'fast' | 'normal' | 'slow';

/**
 * 动画类别
 */
type AnimationCategory =
  | 'button'
  | 'card'
  | 'toast'
  | 'modal'
  | 'list'
  | 'form'
  | 'loading'
  | 'navigation';

/**
 * 动画配置接口
 */
interface AnimationSettings {
  /** 是否启用动画 */
  enabled: boolean;
  /** 动画速度 */
  speed: AnimationSpeed;
  /** 禁用的动画类别 */
  disabledCategories: Set<AnimationCategory>;
  /** 是否尊重系统减少动画偏好 */
  respectSystemPreference: boolean;
}

/**
 * 动画配置常量
 */
interface AnimationConfig {
  /** 速度倍数映射 */
  speedMultipliers: Record<AnimationSpeed, number>;
  /** 默认配置 */
  defaults: AnimationSettings;
  /** 性能阈值 */
  performance: {
    fpsThreshold: number;
    maxAnimationCount: number;
  };
}
```

## 数据模型

### CSS变量扩展

在现有的`variables.css`基础上，扩展以下CSS变量：

```css
:root {
  /* 微交互动画时长 */
  --micro-duration-instant: 100ms;
  --micro-duration-quick: 150ms;
  --micro-duration-smooth: 250ms;
  --micro-duration-gentle: 350ms;

  /* 微交互缓动函数 */
  --micro-ease-button: cubic-bezier(0.34, 1.56, 0.64, 1);
  --micro-ease-card: cubic-bezier(0.22, 1, 0.36, 1);
  --micro-ease-modal: cubic-bezier(0.16, 1, 0.3, 1);

  /* 微交互变换值 */
  --micro-scale-press: 0.98;
  --micro-scale-hover: 1.02;
  --micro-translate-hover: -4px;
  --micro-translate-press: 0px;

  /* 动画控制标志 */
  --animations-enabled: 1;
  --animation-speed-multiplier: 1;
}

/* 禁用动画时 */
[data-animations="disabled"] {
  --animations-enabled: 0;
}

/* 动画速度调节 */
[data-animation-speed="fast"] {
  --animation-speed-multiplier: 0.7;
}

[data-animation-speed="slow"] {
  --animation-speed-multiplier: 1.5;
}
```

### LocalStorage数据结构

```typescript
/**
 * localStorage中存储的动画配置
 */
interface StoredAnimationSettings {
  version: string;
  enabled: boolean;
  speed: AnimationSpeed;
  disabledCategories: string[];
  respectSystemPreference: boolean;
  lastUpdated: number;
}
```

存储键名：`app:animation-settings`

## 详细设计

### 1. 按钮交互动画

#### 设计方案

按钮动画包含三个状态：
1. **Hover状态**：轻微放大（scale 1.02）+ 上浮（translateY -1px）
2. **Active状态**：轻微缩小（scale 0.98）+ 下压（translateY 0）
3. **涟漪效果**：点击时从触点扩散的圆形波纹

#### CSS实现

```css
/* 增强现有按钮样式 */
.btn {
  /* 现有样式保持不变 */
  transition:
    transform var(--micro-duration-smooth) var(--micro-ease-button),
    box-shadow var(--micro-duration-smooth) var(--ease-smooth);
  will-change: transform;
}

.btn:hover {
  transform: translateY(-1px) scale(var(--micro-scale-hover));
}

.btn:active {
  transform: translateY(0) scale(var(--micro-scale-press));
  transition-duration: var(--micro-duration-instant);
}

/* 涟漪效果容器 */
.btn-ripple {
  position: relative;
  overflow: hidden;
}

/* 涟漪动画 */
@keyframes ripple-expand {
  from {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0.5;
  }
  to {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
  }
}

.btn-ripple-effect {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  pointer-events: none;
  animation: ripple-expand 600ms var(--ease-out);
}
```

#### JavaScript实现

```typescript
/**
 * 为按钮添加涟漪效果
 */
function addRippleEffect(button: HTMLElement): void {
  button.classList.add('btn-ripple');

  button.addEventListener('click', (e: MouseEvent) => {
    if (animationManager.shouldReduceMotion()) return;
    if (!animationManager.getSettings().enabled) return;

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple-effect';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);

    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });
  });
}
```

### 2. 卡片悬停效果

#### 设计方案

卡片悬停包含三个视觉变化：
1. **上浮效果**：translateY -4px
2. **阴影增强**：从subtle到prominent
3. **边框高亮**：边框颜色过渡到主色调

#### CSS实现

```css
/* 增强现有卡片样式 */
.card {
  /* 现有样式保持不变 */
  transition:
    transform var(--micro-duration-gentle) var(--micro-ease-card),
    box-shadow var(--micro-duration-gentle) var(--micro-ease-card),
    border-color var(--micro-duration-gentle) var(--micro-ease-card);
  will-change: transform, box-shadow;
}

.card:hover {
  transform: translateY(var(--micro-translate-hover));
  box-shadow: 
    0 10px 40px -10px rgba(59, 130, 246, 0.15),
    0 4px 12px -2px rgba(0, 0, 0, 0.08);
  border-color: var(--color-primary-light);
}

/* 卡片内图标的次级动画 */
.card:hover .card-icon {
  transform: scale(1.08);
  transition: transform var(--micro-duration-smooth) var(--micro-ease-button);
}

/* 卡片内图片的次级动画 */
.card:hover .card-media img {
  transform: scale(1.05);
  transition: transform var(--micro-duration-gentle) var(--micro-ease-card);
}
```

### 3. Toast通知动画

#### 设计方案

Toast动画分为三个阶段：
1. **进入动画**：从右侧滑入 + 弹性缓动
2. **停留状态**：轻微的呼吸效果（可选）
3. **退出动画**：淡出 + 向右滑出

#### CSS实现

```css
/* Toast进入动画 */
@keyframes toast-slide-in {
  from {
    opacity: 0;
    transform: translateX(100%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* Toast退出动画 */
@keyframes toast-slide-out {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(100%) scale(0.95);
  }
}

.toast-enter {
  animation: toast-slide-in 400ms var(--micro-ease-modal) forwards;
}

.toast-exit {
  animation: toast-slide-out 300ms var(--ease-in) forwards;
}

/* Toast堆叠 */
.toast-container {
  position: fixed;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  pointer-events: none;
}

.toast-container > * {
  pointer-events: auto;
}

/* Toast堆叠时的位移动画 */
.toast-stack-shift {
  transition: transform var(--micro-duration-smooth) var(--micro-ease-card);
}
```

#### JavaScript实现

```typescript
/**
 * Toast管理器
 */
class ToastManager {
  private container: HTMLElement;
  private toasts: Map<string, HTMLElement>;

  constructor() {
    this.container = this.createContainer();
    this.toasts = new Map();
  }

  /**
   * 显示Toast
   */
  show(message: string, type: 'success' | 'error' | 'warning' | 'info', duration = 3000): string {
    const id = `toast-${Date.now()}`;
    const toast = this.createToast(message, type);
    
    this.toasts.set(id, toast);
    this.container.appendChild(toast);

    // 应用进入动画
    requestAnimationFrame(() => {
      toast.classList.add('toast-enter');
    });

    // 自动关闭
    if (duration > 0) {
      setTimeout(() => this.hide(id), duration);
    }

    return id;
  }

  /**
   * 隐藏Toast
   */
  hide(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast) return;

    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');

    toast.addEventListener('animationend', () => {
      toast.remove();
      this.toasts.delete(id);
      this.updateStackPositions();
    }, { once: true });
  }

  /**
   * 更新堆叠位置
   */
  private updateStackPositions(): void {
    const toasts = Array.from(this.toasts.values());
    toasts.forEach((toast, index) => {
      toast.style.transform = `translateY(${index * 4}px)`;
    });
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  private createToast(message: string, type: string): HTMLElement {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    return toast;
  }
}
```

### 4. 模态框动画

#### 设计方案

模态框动画包含两层：
1. **背景遮罩**：淡入（opacity 0 → 1）
2. **内容区域**：缩放 + 淡入（scale 0.95 → 1, opacity 0 → 1）

#### CSS实现

```css
/* 遮罩动画 */
@keyframes modal-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modal-backdrop-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* 内容动画 */
@keyframes modal-content-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modal-content-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}

.modal-backdrop-enter {
  animation: modal-backdrop-in 250ms var(--ease-out) forwards;
}

.modal-backdrop-exit {
  animation: modal-backdrop-out 200ms var(--ease-in) forwards;
}

.modal-content-enter {
  animation: modal-content-in 300ms var(--micro-ease-modal) forwards;
}

.modal-content-exit {
  animation: modal-content-out 200ms var(--ease-in) forwards;
}
```

### 5. 列表项交错动画

#### 设计方案

列表项逐个出现，每项延迟50ms，从下方滑入并淡入。

#### CSS实现

```css
/* 列表项淡入动画 */
@keyframes list-item-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.list-stagger-item {
  opacity: 0;
  animation: list-item-fade-in var(--micro-duration-gentle) var(--micro-ease-card) forwards;
}

/* 使用CSS变量控制延迟 */
.list-stagger-item {
  animation-delay: calc(var(--stagger-index, 0) * 50ms);
}
```

#### JavaScript实现

```typescript
/**
 * 为列表项应用交错动画
 */
function applyStaggerAnimation(container: HTMLElement): void {
  if (animationManager.shouldReduceMotion()) return;

  const items = Array.from(container.children) as HTMLElement[];
  
  items.forEach((item, index) => {
    item.style.setProperty('--stagger-index', index.toString());
    item.classList.add('list-stagger-item');
  });
}

/**
 * 使用Intersection Observer优化性能
 */
function observeListAnimations(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          applyStaggerAnimation(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('[data-stagger-list]').forEach((list) => {
    observer.observe(list);
  });
}
```

### 6. 表单输入动画

#### 设计方案

表单输入包含多个动画：
1. **聚焦动画**：边框颜色过渡 + Label上浮
2. **错误动画**：抖动效果
3. **成功动画**：勾选图标淡入

#### CSS实现

```css
/* 输入框聚焦动画 */
.form-input {
  transition: border-color var(--micro-duration-smooth) var(--ease-smooth);
}

.form-input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

/* Label上浮动画 */
.form-label-float {
  transition: 
    transform var(--micro-duration-smooth) var(--micro-ease-button),
    font-size var(--micro-duration-smooth) var(--micro-ease-button),
    color var(--micro-duration-smooth) var(--ease-smooth);
}

.form-input:focus ~ .form-label-float,
.form-input:not(:placeholder-shown) ~ .form-label-float {
  transform: translateY(-24px);
  font-size: 0.75rem;
  color: var(--color-primary);
}

/* 错误抖动动画 */
@keyframes input-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.form-input-error {
  animation: input-shake 500ms var(--ease-smooth);
  border-color: var(--color-error);
}

/* 成功勾选动画 */
@keyframes checkmark-draw {
  0% {
    stroke-dashoffset: 20;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.form-input-success-icon {
  animation: 
    fadeInScale var(--micro-duration-smooth) var(--micro-ease-button) forwards,
    checkmark-draw 300ms var(--ease-smooth) 100ms forwards;
}
```

### 7. 加载状态动画

#### 设计方案

优化现有的加载动画：
1. **Spinner**：平滑旋转
2. **骨架屏**：优化脉冲效果
3. **进度条**：平滑填充
4. **加载点**：顺序跳动

#### CSS实现

```css
/* 优化Spinner旋转 */
@keyframes spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spinner-rotate 800ms linear infinite;
  will-change: transform;
}

/* 优化骨架屏脉冲 */
@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton {
  animation: skeleton-pulse 2s ease-in-out infinite;
}

/* 进度条填充动画 */
.progress-bar {
  transition: width var(--micro-duration-gentle) var(--micro-ease-card);
}

/* 加载点跳动 */
@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
}

.loading-dot {
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.loading-dot:nth-child(1) { animation-delay: 0ms; }
.loading-dot:nth-child(2) { animation-delay: 160ms; }
.loading-dot:nth-child(3) { animation-delay: 320ms; }
```

### 8. 导航动画

#### 设计方案

导航动画包含：
1. **页面切换**：淡入淡出
2. **侧边栏**：滑入滑出
3. **下拉菜单**：展开动画
4. **面包屑**：过渡效果

#### CSS实现

```css
/* 页面切换动画 */
@keyframes page-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes page-fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.page-enter {
  animation: page-fade-in 300ms var(--ease-out) forwards;
}

.page-exit {
  animation: page-fade-out 200ms var(--ease-in) forwards;
}

/* 侧边栏滑动 */
@keyframes sidebar-slide-in {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes sidebar-slide-out {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}

.sidebar-enter {
  animation: sidebar-slide-in 300ms var(--micro-ease-card) forwards;
}

.sidebar-exit {
  animation: sidebar-slide-out 250ms var(--ease-in) forwards;
}

/* 下拉菜单展开 */
@keyframes dropdown-expand {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dropdown-enter {
  animation: dropdown-expand var(--micro-duration-smooth) var(--micro-ease-button) forwards;
}

/* 面包屑过渡 */
.breadcrumb-item {
  transition: color var(--micro-duration-smooth) var(--ease-smooth);
}

.breadcrumb-item:hover {
  color: var(--color-primary);
}
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性充当人类可读规范和机器可验证正确性保证之间的桥梁。*

### 核心动画属性

Property 1: GPU加速一致性
*对于任何*动画效果，系统应只使用CSS transform和opacity属性来触发GPU加速
**Validates: Requirements 1.5, 2.5, 7.5, 9.1**

Property 2: 按钮悬停缩放
*对于任何*按钮元素，当用户悬停时，系统应在200ms内将scale变换应用为1.02
**Validates: Requirements 1.1**

Property 3: 按钮点击缩放
*对于任何*按钮元素，当用户点击时，系统应在150ms内将scale变换应用为0.98
**Validates: Requirements 1.2**

Property 4: 涟漪效果生成
*对于任何*按钮点击事件，系统应在点击位置创建涟漪效果元素
**Validates: Requirements 1.3**

Property 5: 动画状态恢复
*对于任何*交互动画，当触发器移除后，元素应恢复到其原始状态
**Validates: Requirements 1.4, 2.4**

Property 6: 卡片悬停上浮
*对于任何*卡片元素，当用户悬停时，系统应在300ms内将其向上平移4像素
**Validates: Requirements 2.1**

Property 7: 卡片阴影增强
*对于任何*卡片元素，当用户悬停时，box-shadow属性应平滑过渡到增强状态
**Validates: Requirements 2.2**

Property 8: 卡片边框高亮
*对于任何*卡片元素，当用户悬停时，border-color应过渡到主色调
**Validates: Requirements 2.3**

Property 9: Toast滑入动画
*对于任何*Toast通知，触发时应使用translateX从100%滑动到0
**Validates: Requirements 3.1**

Property 10: Toast弹性缓动
*对于任何*Toast进入动画，应应用spring缓动函数
**Validates: Requirements 3.2**

Property 11: Toast退出动画
*对于任何*Toast自动关闭，应同时执行淡出和滑出动画
**Validates: Requirements 3.3**

Property 12: Toast堆叠布局
*对于任何*多个Toast通知，应垂直堆叠并保持适当间距
**Validates: Requirements 3.4**

Property 13: 模态框遮罩淡入
*对于任何*模态框打开，背景遮罩应在250ms内从opacity 0淡入到1
**Validates: Requirements 4.1**

Property 14: 模态框内容缩放
*对于任何*模态框打开，内容区域应从scale 0.95缩放到1并同时淡入
**Validates: Requirements 4.2**

Property 15: 模态框动画往返
*对于任何*模态框，打开和关闭动画应互为反向
**Validates: Requirements 4.3**

Property 16: 列表交错动画
*对于任何*列表渲染，每个列表项应有递增50ms的animation-delay
**Validates: Requirements 5.1, 5.2**

Property 17: 列表项滑入距离
*对于任何*列表项出现，应从20像素下方滑入到最终位置
**Validates: Requirements 5.3**

Property 18: 列表项淡入
*对于任何*列表项出现，应从opacity 0淡入到1
**Validates: Requirements 5.4**

Property 19: 虚拟滚动动画优化
*对于任何*使用虚拟滚动的列表，只有新可见的项目应应用动画
**Validates: Requirements 5.5**

Property 20: 输入框聚焦边框
*对于任何*输入框聚焦，border-color应在200ms内过渡到主色调
**Validates: Requirements 6.1**

Property 21: Label上浮动画
*对于任何*输入框聚焦，关联的label应向上平移并缩小字号
**Validates: Requirements 6.2**

Property 22: 输入错误抖动
*对于任何*输入验证失败，输入框应应用抖动动画
**Validates: Requirements 6.3**

Property 23: 输入成功勾选
*对于任何*输入验证成功，应显示勾选图标并应用淡入动画
**Validates: Requirements 6.4**

Property 24: Spinner旋转速度
*对于任何*Spinner加载器，应以360度/秒的速度连续旋转
**Validates: Requirements 7.1**

Property 25: 骨架屏脉冲
*对于任何*骨架屏，应应用脉冲shimmer效果
**Validates: Requirements 7.2**

Property 26: 进度条平滑填充
*对于任何*进度条更新，width属性应有平滑的transition
**Validates: Requirements 7.3**

Property 27: 加载点顺序跳动
*对于任何*加载点组，每个点应有不同的animation-delay形成顺序效果
**Validates: Requirements 7.4**

Property 28: 页面切换淡入淡出
*对于任何*页面过渡，当前页应淡出，新页应淡入
**Validates: Requirements 8.1**

Property 29: 侧边栏滑动
*对于任何*侧边栏打开，应在300ms内从边缘滑入
**Validates: Requirements 8.2**

Property 30: 下拉菜单展开
*对于任何*下拉菜单展开，height和opacity应同时动画
**Validates: Requirements 8.3**

Property 31: 面包屑过渡
*对于任何*面包屑项变化，应应用淡入淡出过渡
**Validates: Requirements 8.4**

Property 32: Will-change提示应用
*对于任何*正在动画的元素，应应用will-change提示
**Validates: Requirements 9.2**

Property 33: Will-change清理
*对于任何*动画完成的元素，will-change提示应被移除
**Validates: Requirements 9.4**

Property 34: 帧率维持
*对于任何*动画执行期间，系统应维持60fps的帧率
**Validates: Requirements 9.3**

Property 35: 性能降级
*对于任何*性能下降超过5%的情况，系统应自动禁用非关键动画
**Validates: Requirements 9.5**

Property 36: Reduced Motion响应
*对于任何*启用prefers-reduced-motion的用户，系统应禁用所有非必要动画
**Validates: Requirements 10.1**

Property 37: Reduced Motion即时过渡
*对于任何*启用prefers-reduced-motion的用户，必要的状态变化应使用即时过渡
**Validates: Requirements 10.2**

Property 38: 屏幕阅读器兼容
*对于任何*动画元素，应不干扰屏幕阅读器的功能
**Validates: Requirements 10.3**

Property 39: 颜色对比度维持
*对于任何*动画过程中，颜色对比度应保持在可访问性标准之上
**Validates: Requirements 10.4**

Property 40: 信息传达独立性
*对于任何*关键信息，不应仅依赖动画传达
**Validates: Requirements 10.5**

Property 41: 全局动画开关
*对于任何*动画配置，全局开关应能启用或禁用所有动画
**Validates: Requirements 11.1**

Property 42: 速度预设调节
*对于任何*动画速度设置，应支持fast、normal、slow三个预设
**Validates: Requirements 11.2**

Property 43: 分类独立控制
*对于任何*动画类别，应能独立启用或禁用
**Validates: Requirements 11.3**

Property 44: 配置持久化往返
*对于任何*动画配置更改，保存到localStorage后再读取应得到相同的配置
**Validates: Requirements 11.4, 11.5**

Property 45: 动画失败容错
*对于任何*动画执行失败，底层功能应继续正常工作
**Validates: Requirements 13.2**

## 错误处理

### 错误处理策略

1. **动画失败不影响功能**
   - 所有动画使用try-catch包裹
   - 动画失败时静默降级到无动画状态
   - 记录错误但不中断用户操作

2. **性能降级**
   - 监控FPS，低于55fps时自动禁用非关键动画
   - 提供用户通知，说明性能优化已启用
   - 允许用户手动重新启用

3. **浏览器兼容性**
   - 使用CSS @supports检测功能支持
   - 不支持的浏览器自动降级到静态效果
   - 不显示错误提示，保持用户体验流畅

4. **配置加载失败**
   - localStorage读取失败时使用默认配置
   - 配置格式错误时重置为默认值
   - 记录错误用于调试

### 错误处理实现

```typescript
/**
 * 安全执行动画
 */
function safeAnimate(
  element: HTMLElement,
  animationClass: string,
  onError?: (error: Error) => void
): void {
  try {
    element.classList.add(animationClass);
  } catch (error) {
    console.warn('Animation failed:', error);
    if (onError) {
      onError(error as Error);
    }
    // 降级：移除动画类，元素保持静态
    element.classList.remove(animationClass);
  }
}

/**
 * 性能监控和降级
 */
class PerformanceGuard {
  private consecutiveLowFrames = 0;
  private readonly threshold = 3;

  checkPerformance(fps: number): void {
    if (fps < 55) {
      this.consecutiveLowFrames++;
      if (this.consecutiveLowFrames >= this.threshold) {
        this.degradePerformance();
      }
    } else {
      this.consecutiveLowFrames = 0;
    }
  }

  private degradePerformance(): void {
    animationManager.disableCategory('card');
    animationManager.disableCategory('list');
    console.info('Performance optimization enabled');
  }
}
```

## 测试策略

### 双重测试方法

本系统采用单元测试和属性测试相结合的方法：

#### 单元测试
- 测试特定的动画场景和边界条件
- 验证配置管理功能
- 测试错误处理逻辑
- 验证浏览器兼容性降级

#### 属性测试
- 验证所有45个正确性属性
- 使用fast-check库生成随机测试数据
- 每个属性测试运行最少100次迭代
- 标签格式：`Feature: micro-interaction-animations, Property N: [property text]`

### 测试工具和配置

**属性测试库**：fast-check (JavaScript/TypeScript)

**测试框架**：Vitest

**配置示例**：
```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Feature: micro-interaction-animations', () => {
  it('Property 1: GPU加速一致性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('button', 'card', 'toast', 'modal'),
        (elementType) => {
          const element = createTestElement(elementType);
          const animations = getAppliedAnimations(element);
          
          // 验证只使用transform和opacity
          return animations.every(anim => 
            anim.properties.every(prop => 
              prop === 'transform' || prop === 'opacity'
            )
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: 按钮悬停缩放', () => {
    fc.assert(
      fc.property(
        fc.record({
          buttonType: fc.constantFrom('primary', 'secondary', 'ghost'),
          size: fc.constantFrom('sm', 'md', 'lg')
        }),
        async ({ buttonType, size }) => {
          const button = createButton(buttonType, size);
          const initialTransform = getComputedTransform(button);
          
          // 触发hover
          button.dispatchEvent(new MouseEvent('mouseenter'));
          await wait(200);
          
          const hoverTransform = getComputedTransform(button);
          const scale = extractScale(hoverTransform);
          
          return Math.abs(scale - 1.02) < 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 视觉回归测试

使用Playwright进行视觉回归测试：

```typescript
import { test, expect } from '@playwright/test';

test('按钮悬停动画视觉回归', async ({ page }) => {
  await page.goto('/components/buttons');
  
  const button = page.locator('.btn-primary').first();
  
  // 初始状态截图
  await expect(button).toHaveScreenshot('button-initial.png');
  
  // 悬停状态截图
  await button.hover();
  await page.waitForTimeout(250); // 等待动画完成
  await expect(button).toHaveScreenshot('button-hover.png');
  
  // 点击状态截图
  await button.click();
  await page.waitForTimeout(150);
  await expect(button).toHaveScreenshot('button-active.png');
});
```

### 性能测试

```typescript
import { test, expect } from '@playwright/test';

test('动画性能测试', async ({ page }) => {
  await page.goto('/');
  
  // 开始性能监控
  await page.evaluate(() => {
    (window as any).performanceData = [];
    let lastTime = performance.now();
    
    function measureFrame() {
      const currentTime = performance.now();
      const fps = 1000 / (currentTime - lastTime);
      (window as any).performanceData.push(fps);
      lastTime = currentTime;
      requestAnimationFrame(measureFrame);
    }
    
    requestAnimationFrame(measureFrame);
  });
  
  // 触发大量动画
  await page.click('[data-trigger-animations]');
  await page.waitForTimeout(2000);
  
  // 获取性能数据
  const performanceData = await page.evaluate(() => 
    (window as any).performanceData
  );
  
  const avgFps = performanceData.reduce((a: number, b: number) => a + b) / performanceData.length;
  
  // 验证平均FPS >= 55
  expect(avgFps).toBeGreaterThanOrEqual(55);
});
```

### 可访问性测试

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('动画可访问性测试', async ({ page }) => {
  await page.goto('/');
  
  // 运行axe可访问性检查
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
  
  // 测试prefers-reduced-motion
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  
  // 验证动画被禁用
  const animationsEnabled = await page.evaluate(() => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--animations-enabled');
  });
  
  expect(animationsEnabled.trim()).toBe('0');
});
```

