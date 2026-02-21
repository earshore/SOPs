# CSS 架构说明

## 📁 目录结构

```
src/css/
├── foundation/          # 基础层 - CSS变量、设计令牌
│   └── variables.css    # 颜色、间距、动画等变量
│
├── components/          # 组件层 - 可复用UI组件
│   ├── cards.css        # 卡片组件
│   ├── buttons.css      # 按钮组件
│   ├── badges.css       # 徽章组件
│   ├── toast.css        # 通知提示
│   └── scrollbar.css    # 滚动条样式
│
├── layouts/             # 布局层 - 页面结构
│   └── container.css    # 容器限制
│
├── animations/          # 动画层 - 动画效果
│   └── keyframes.css    # 关键帧动画
│
├── utilities/           # 工具层 - 辅助类
│   └── legacy-compat.css # 向后兼容层
│
├── main.css             # 主入口文件
├── style.css            # 重定向文件(兼容旧导入)
└── style.legacy.css     # 原始文件备份
```

## 🎨 使用方式

### 1. CSS变量

所有设计令牌已提取为CSS变量，使用方式：

```css
.my-element {
  color: var(--color-blue-500);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  transition: all var(--duration-normal) var(--ease-smooth);
}
```

### 2. 通用组件类

使用预定义的组件类：

```html
<!-- 卡片 -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">标题</h3>
  </div>
  <div class="card-body">内容</div>
</div>

<!-- 按钮 -->
<button class="btn btn-primary">主要按钮</button>
<button class="btn btn-secondary">次要按钮</button>

<!-- 徽章 -->
<span class="badge badge-success">成功</span>
<span class="badge badge-warning">警告</span>
```

### 3. 模块特定样式

模块CSS文件仅包含该模块特有的样式：

```
src/modules/
├── app_center/
│   └── app_center_style.css  # 仅应用中心特有样式
├── sops/
│   └── sops_style.css         # 仅SOPs特有样式
└── more/
    └── more_style.css         # 仅More特有样式
```

## 🔄 迁移指南

### 旧类名映射

为保持向后兼容，以下旧类名会自动映射到新组件：

- `.app-center-card` → `.card`
- `.app-center-btn` → `.btn`
- `.app-center-badge` → `.badge`
- `.sop-card-grid` → `.card-grid`

### 推荐做法

新代码应直接使用新的组件类：

```html
<!-- ❌ 旧方式 -->
<div class="app-center-card">...</div>

<!-- ✅ 新方式 -->
<div class="card">...</div>
```

## 📝 开发规范

1. **通用样式** → 添加到 `src/css/components/`
2. **模块特有样式** → 添加到对应模块的CSS文件
3. **使用CSS变量** → 避免硬编码颜色和尺寸
4. **保持一致性** → 遵循现有命名规范

## 🎯 优势

- ✅ 消除重复代码
- ✅ 统一设计系统
- ✅ 易于维护和扩展
- ✅ 更好的代码组织
- ✅ 向后兼容
