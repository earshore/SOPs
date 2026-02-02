# SOPs 流程中心侧边栏恢复说明

## 修改概述
恢复了 SOPs 流程中心 - SOP 总览页面的左侧边栏，显示四个一级菜单分类，并为每个分类添加了对应的配色方案。

## 修改文件
- `src/common/utils/ui.js`

## Bug 修复

### 问题描述
点击左侧边栏的一级菜单时，路由 ID 变成了 `undefined`，导致页面跳转到 Home 页面。

### 根本原因
在构建 `displayRoutes` 数组时，使用 `Object.values(MENU_CONFIG.routes)` 只能获取路由配置对象，但配置对象本身没有 `id` 字段。路由 ID 实际上是 `MENU_CONFIG.routes` 对象的 key。

### 修复方案
使用 `Object.entries(MENU_CONFIG.routes)` 同时获取路由 ID（key）和路由配置（value）：

```javascript
// 修复前（错误）
const firstRoute = Object.values(MENU_CONFIG.routes).find(r => r.category === cat.id);
if (firstRoute) {
    displayRoutes.push({
        id: firstRoute.id, // firstRoute.id 是 undefined
        label: cat.label,
        icon: cat.icon,
        color: cat.color,
        isCategoryLink: true
    });
}

// 修复后（正确）
const firstRouteEntry = Object.entries(MENU_CONFIG.routes).find(([_, r]) => r.category === cat.id);
if (firstRouteEntry) {
    const [routeId, routeConfig] = firstRouteEntry;
    displayRoutes.push({
        id: routeId, // 使用路由 ID 作为 key
        label: cat.label,
        icon: cat.icon,
        color: cat.color,
        isCategoryLink: true
    });
}
```

## 主要改动

### 1. 移除总览页面隐藏侧边栏的逻辑
**位置**: `renderSidebar` 函数中的 SOPs 模块处理部分

**修改前**:
```javascript
if (moduleId === 'sops') {
    const currentTab = state.currentTab;
    
    // Special Case: Hide sidebar on Overview page
    if (currentTab === 'sops_overview') {
        sidebar.classList.add("hidden", "-ml-64");
        sidebar.innerHTML = '';
        currentSidebarModuleId = null;
        return;
    }
    // ...
}
```

**修改后**:
```javascript
if (moduleId === 'sops') {
    const currentTab = state.currentTab;
    const routeConfig = MENU_CONFIG.routes[currentTab];
    const category = routeConfig?.category || 'overview';
    sidebarKey = `sops:${category}`;
}
```

### 2. 更新侧边栏渲染逻辑
**位置**: `renderSopsSidebar` 函数

#### 2.1 添加颜色信息到路由对象
```javascript
displayRoutes.push({
    id: firstRoute.id,
    label: cat.label,
    icon: cat.icon,
    color: cat.color, // 添加颜色信息
    isCategoryLink: true
});
```

#### 2.2 实现分类卡片式设计
为四个一级菜单分类添加了对应的配色方案：

- **运营与推广体系**: 翠绿色 (emerald)
- **供应链与物流体系**: 琥珀色 (amber)
- **账号安全与风控体系**: 红色 (red)
- **客服与客户体验体系**: 蓝色 (blue)

每个分类卡片包含：
- 背景色和边框色
- 悬停效果（背景加深、边框加深）
- 图标颜色
- 右侧箭头指示器
- 阴影效果

#### 2.3 添加返回按钮
当用户进入具体分类后，在侧边栏底部显示"返回 SOP 总览"按钮。

## 跳转逻辑优化

### 问题描述
之前点击侧边栏的一级菜单（如"运营与推广体系"）会直接跳转到该分类下的第一个 SOP 页面，用户无法看到该分类的整体概览。

### 优化方案
修改为页面内滚动定位：
1. 点击一级菜单时，页面平滑滚动到总览页面对应的模块区域
2. 用户可以看到该模块下的所有 SOP 卡片
3. 用户可以选择点击具体的 SOP 卡片进入详情页

### 实现细节

#### 1. 为总览页面的各个模块添加 ID
```html
<section id="sop-module-growth" class="mb-10">  <!-- 运营与推广体系 -->
<section id="sop-module-backend" class="mb-10"> <!-- 供应链与物流体系 -->
<section id="sop-module-safety" class="mb-10">  <!-- 账号安全与风控体系 -->
<section id="sop-module-service" class="mb-10"> <!-- 客服与客户体验体系 -->
```

#### 2. 修改侧边栏按钮的 data-action
```html
<!-- 从 -->
<button data-action="switch-tab" data-tab="sops_npi_tracker">

<!-- 改为 -->
<button data-action="scroll-to-sop-module" data-category="growth">
```

#### 3. 添加滚动函数
```javascript
function scrollToSOPModule(categoryId) {
    const moduleId = `sop-module-${categoryId}`;
    const moduleElement = document.getElementById(moduleId);
    
    if (moduleElement) {
        // 平滑滚动
        moduleElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
        });
        
        // 添加高亮效果
        moduleElement.classList.add('sop-module-highlight');
        setTimeout(() => {
            moduleElement.classList.remove('sop-module-highlight');
        }, 2000);
    }
}
```

#### 4. 添加高亮动画
```css
@keyframes sopModuleHighlight {
    0% { background-color: transparent; }
    10% { background-color: rgba(59, 130, 246, 0.1); }
    100% { background-color: transparent; }
}
```

### 用户体验改进
- 点击一级菜单后，页面平滑滚动到对应区域
- 目标区域会短暂高亮（2秒），帮助用户快速定位
- 用户可以浏览该分类下的所有 SOP，然后选择需要的进入
- 保持在总览页面，方便用户切换到其他分类

## 样式优化

### 默认状态
- 一级菜单：无背景色、无边框、灰色文字和图标
- 二级菜单：无背景色、灰色文字

### 悬停状态
- 一级菜单：显示对应分类的背景色和边框色
  - 运营与推广体系：翠绿色背景 + 翠绿色边框
  - 供应链与物流体系：琥珀色背景 + 琥珀色边框
  - 账号安全与风控体系：红色背景 + 红色边框
  - 客服与客户体验体系：蓝色背景 + 蓝色边框
- 图标颜色变为对应的主题色
- 右侧箭头从隐藏变为可见
- 添加阴影效果

### 设计理念
- 默认状态保持简洁，减少视觉干扰
- 悬停时突出显示，提供清晰的交互反馈
- 使用渐变过渡效果，提升用户体验

## 功能特性

### 总览页面侧边栏
- 显示四个一级菜单分类
- 每个分类使用卡片式设计，带有对应的配色
- 点击分类进入该分类下的 SOP 列表

### 分类页面侧边栏
- 显示当前分类下的所有 SOP 项目
- 侧边栏标题显示当前分类名称和图标
- 底部显示"返回 SOP 总览"按钮

### 搜索功能
- 保留全局 SOP 搜索功能
- 可在任何页面快速搜索 SOP

## 用户体验改进

1. **视觉层次清晰**: 一级菜单使用卡片式设计，二级菜单使用简洁样式
2. **配色一致**: 每个体系的配色与总览页面的卡片配色保持一致
3. **导航便捷**: 提供返回按钮，方便在不同层级间切换
4. **交互反馈**: 悬停效果明显，点击目标清晰

## 测试建议

1. 访问 SOPs 流程中心总览页面，确认左侧边栏显示四个分类
2. 点击任意分类，确认跳转到对应的 SOP 列表
3. 在 SOP 列表页面，确认侧边栏显示该分类下的所有项目
4. 点击"返回 SOP 总览"按钮，确认返回总览页面
5. 测试搜索功能是否正常工作
