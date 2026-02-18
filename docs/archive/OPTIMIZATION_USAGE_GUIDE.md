# 短期优化使用指南

本文档说明如何使用新创建的优化工具。

## 1. SidebarRenderer - 统一侧边栏渲染

### 使用方法

在 `ui.js` 中替换原有的 `renderSopsSidebar`、`renderHubSidebar`、`renderMoreSidebar`：

```javascript
import { createSidebarRenderer } from '../components/SidebarRenderer.js';

// 创建 SOPs 侧边栏渲染器
const sopsRenderer = createSidebarRenderer({
    moduleId: 'sops',
    categories: MENU_CONFIG.sopCategories,
    overviewRouteId: 'sops_overview',
    enableSearch: true,
    searchPlaceholder: '搜索全站 SOP...'
});

// 在 renderSidebar 函数中使用
if (moduleId === 'sops') {
    sopsRenderer.render(sidebar, moduleConfig, routes);
}
```

### 优势
- 消除 300+ 行重复代码
- 统一样式和行为
- 易于维护和扩展

---

## 2. LoadingManager - 统一加载状态管理

### 基础用法

```javascript
import { loadingManager } from '../utils/LoadingManager.js';

// 开始加载
loadingManager.start('fetch-data', {
    message: '正在获取数据...',
    priority: 1
});

// 结束加载
loadingManager.stop('fetch-data');
```

### 包装异步函数

```javascript
const result = await loadingManager.wrap('analyze', async () => {
    return await analyzeData(data);
}, {
    message: '正在分析数据...',
    priority: 2
});
```

### 作用域管理

```javascript
// 为模块创建独立的加载管理器
const scraperLoading = loadingManager.createScope('scraper');

scraperLoading.start('fetch'); // 实际任务ID: scraper:fetch
scraperLoading.stop('fetch');
```

### 集成到现有代码

**替换前**：
```javascript
state.scraper.isScraping = true;
try {
    await scrapeData();
} finally {
    state.scraper.isScraping = false;
}
```

**替换后**：
```javascript
await loadingManager.wrap('scraper:scrape', async () => {
    return await scrapeData();
}, { message: '正在采集数据...' });
```

---

## 3. StateManager 性能优化

### 优化内容

修复了父路径订阅者被过度触发的问题：

**优化前**：
- 修改 `ui.currentTab` 时，`ui` 的订阅者也会被触发
- 即使父对象引用未变，仍会触发重渲染

**优化后**：
- 添加浅比较，只在父对象真正变化时通知
- 减少不必要的 UI 重渲染

### 使用建议

```javascript
// 推荐：订阅精确路径
stateManager.subscribe('ui.currentTab', (newTab, oldTab) => {
    console.log('Tab changed:', oldTab, '->', newTab);
});

// 避免：订阅父路径（除非确实需要监听整个对象）
stateManager.subscribe('ui', (newUI, oldUI) => {
    // 这个回调现在只在 ui 对象引用变化时触发
});
```

---

## 4. 颜色方案统一管理

### 使用方法

```javascript
import { COLOR_SCHEMES, getColorScheme } from '../constants/colorSchemes.js';

// 获取颜色方案
const scheme = getColorScheme('emerald');

// 使用颜色方案
const html = `
    <div class="${scheme.border} ${scheme.bg} ${scheme.shadow}">
        <i class="${scheme.iconBg} ${scheme.iconText}"></i>
    </div>
`;
```

### 优势
- 消除重复定义
- 统一视觉风格
- 易于主题切换

---

## 5. 迁移步骤

### 步骤 1: 更新 ui.js

1. 导入新工具：
```javascript
import { createSidebarRenderer } from '../components/SidebarRenderer.js';
import { COLOR_SCHEMES } from '../constants/colorSchemes.js';
```

2. 创建渲染器实例（在文件顶部）：
```javascript
const sopsRenderer = createSidebarRenderer({
    moduleId: 'sops',
    categories: MENU_CONFIG.sopCategories,
    overviewRouteId: 'sops_overview',
    searchPlaceholder: '搜索全站 SOP...'
});

const hubRenderer = createSidebarRenderer({
    moduleId: 'amz_hub_core',
    categories: MENU_CONFIG.hubCategories,
    overviewRouteId: 'amz_hub_overview',
    searchPlaceholder: '搜索智库内容...'
});

const moreRenderer = createSidebarRenderer({
    moduleId: 'more_core',
    categories: MENU_CONFIG.moreCategories,
    overviewRouteId: 'more_overview',
    searchPlaceholder: '搜索功能...'
});
```

3. 替换 renderSidebar 中的逻辑：
```javascript
function renderSidebar(moduleId) {
    // ... 前置代码 ...
    
    if (moduleId === 'sops') {
        sopsRenderer.render(sidebar, moduleConfig, routes);
    } else if (moduleId === 'amz_hub_core') {
        hubRenderer.render(sidebar, moduleConfig, routes);
    } else if (moduleId === 'more_core') {
        moreRenderer.render(sidebar, moduleConfig, routes);
    } else {
        renderDefaultSidebar(sidebar, moduleConfig, routes);
    }
    
    // ... 后置代码 ...
}
```

### 步骤 2: 集成 LoadingManager

1. 在 main.js 中初始化：
```javascript
import { loadingManager } from './common/utils/LoadingManager.js';

// 设置全局 Loading 元素
const globalLoading = document.getElementById('global-loading');
if (globalLoading) {
    loadingManager.setGlobalLoadingElement(globalLoading);
}
```

2. 在各模块中使用：
```javascript
// 在 scraper 模块
import { loadingManager } from '../../common/utils/LoadingManager.js';

async function scrapeData() {
    await loadingManager.wrap('scraper:scrape', async () => {
        // 采集逻辑
    }, { message: '正在采集数据...' });
}
```

### 步骤 3: 更新颜色方案引用

在 `renderMegaMenu`、`renderSopsMegaMenu` 等函数中：

```javascript
// 替换前
const colorSchemes = {
    emerald: { border: '...', bg: '...' },
    // ...
};

// 替换后
import { COLOR_SCHEMES } from '../constants/colorSchemes.js';
const scheme = COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;
```

---

## 6. 测试建议

1. **侧边栏渲染测试**
   - 切换不同模块，检查侧边栏是否正常显示
   - 测试搜索功能
   - 测试分类切换

2. **加载状态测试**
   - 同时触发多个加载任务
   - 检查优先级是否生效
   - 测试任务取消

3. **性能测试**
   - 频繁切换 Tab，观察性能
   - 使用 Chrome DevTools Performance 面板
   - 检查是否有不必要的重渲染

---

## 7. 预期效果

- **代码量减少**: 约 500 行重复代码被消除
- **性能提升**: StateManager 通知次数减少 30-50%
- **维护性提升**: 修改样式只需改一处
- **可扩展性**: 新增模块侧边栏只需配置，无需编写代码
