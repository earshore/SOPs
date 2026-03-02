# QA Lab Alpine.js 架构迁移

## 概述

将 QA Lab 模块从命令式 DOM 操作迁移到 Alpine.js 响应式架构，统一与其他模块（如 AI Analysis）的实现方式。

## 变更内容

### 1. 新增文件

- `src/modules/app_center/views/master_analysis/qalab/components/AlpinePanel.ts`
  - 定义 `qalabPanel` Alpine 组件
  - 实现状态同步（Zustand → Alpine）
  - 提供响应式数据绑定

### 2. 修改文件

#### `qalab/template.html`
```html
<!-- 之前 -->
<div class="app-container">

<!-- 之后 -->
<div class="app-container" x-data="qalabPanel">
```

#### `qalab/index.ts`
- 导入 `AlpineRegistry` 和 `createQalabPanel`
- 在 `mount()` 中注册 Alpine 组件
- 移除重复的初始化逻辑（由 Alpine 组件的 `init()` 处理）

## 架构优势

### 响应式状态管理
- 使用 `createMultipleStateSyncs` 自动同步 Zustand → Alpine
- 状态变化自动触发 UI 更新
- 无需手动 DOM 操作

### 统一架构
- 与 AI Analysis 模块保持一致
- 使用相同的 AlpineRegistry 注册机制
- 遵循项目架构规范

### 生命周期管理
- `init()`: 组件初始化，设置状态同步
- `destroy()`: 组件销毁，清理订阅

## 状态同步

```typescript
createMultipleStateSyncs([
    {
        selector: (state) => state.qalab.currentLang,
        onChange: (lang) => { this.currentLang = lang; },
        immediate: true
    },
    // ... 其他状态
]);
```

## 向后兼容

- 保留全局 action 注册（`registerActionsWithLegacy`）
- 保留事件委托机制
- 保留 `data-action` 属性支持

## 技术债务消除

✅ 解决了 `x-data="qalabPanel"` 未定义的问题
✅ 统一了模块架构
✅ 改善了状态管理
✅ 提升了代码可维护性

## 测试建议

1. 验证页面加载无 Alpine 错误
2. 测试状态同步是否正常
3. 验证所有交互功能
4. 检查数据预览和分析功能

## 迁移日期

2026-03-02
