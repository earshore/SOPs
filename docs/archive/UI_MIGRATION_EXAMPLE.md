# ui.js 迁移示例

本文档展示如何将 `ui.js` 中的重复代码迁移到新的统一工具。

## 迁移前后对比

### 1. 导入部分

**迁移前**：
```javascript
import state from "../state.js";
import { ERROR_MESSAGES } from "../constants/constants.js";
import { MENU_CONFIG, getRoutesByModule } from "../config/menuConfig.js";
```

**迁移后**：
```javascript
import state from "../state.js";
import { ERROR_MESSAGES } from "../constants/constants.js";
import { MENU_CONFIG, getRoutesByModule } from "../config/menuConfig.js";
// 🎯 新增导入
import { createSidebarRenderer } from '../components/SidebarRenderer.js';
import { COLOR_SCHEMES } from '../constants/colorSchemes.js';
import { loadingManager } from './LoadingManager.js';
```

---

### 2. 创建渲染器实例（文件顶部）

在 `getEl` 函数定义后添加：

```javascript
// ========================
// 🎯 侧边栏渲染器实例
// ========================
const sopsRenderer = createSidebarRenderer({
    moduleId: 'sops',
    categories: MENU_CONFIG.sopCategories,
    overviewRouteId: 'sops_overview',
    enableSearch: true,
    searchPlaceholder: '搜索全站 SOP...'
});

const hubRenderer = createSidebarRenderer({
    moduleId: 'amz_hub_core',
    categories: MENU_CONFIG.hubCategories,
    overviewRouteId: 'amz_hub_overview',
    enableSearch: true,
    searchPlaceholder: '搜索智库内容...'
});

const moreRenderer = createSidebarRenderer({
    moduleId: 'more_core',
    categories: MENU_CONFIG.moreCategories,
    overviewRouteId: 'more_overview',
    enableSearch: true,
    searchPlaceholder: '搜索功能...'
});
```

---

### 3. 简化 renderSidebar 函数

**迁移前**（约 400 行）：
```javascript
function renderSidebar(moduleId) {
    // ... 大量重复代码 ...
    
    if (moduleId === 'sops') {
        renderSopsSidebar(sidebar, moduleConfig, routes);
    } else if (moduleId === 'amz_hub_core') {
        renderHubSidebar(sidebar, moduleConfig, routes);
    } else if (moduleId === 'more_core') {
        renderMoreSidebar(sidebar, moduleConfig, routes);
    } else {
        renderDefaultSidebar(sidebar, moduleConfig, routes);
    }
}

// 然后是 300+ 行的 renderSopsSidebar 函数
// 然后是 300+ 行的 renderHubSidebar 函数
// 然后是 300+ 行的 renderMoreSidebar 函数
```

**迁移后**（约 50 行）：
```javascript
function renderSidebar(moduleId) {
    const sidebar = getEl("dynamic-sidebar");
    if (!sidebar) return;

    // 1. 隐藏逻辑
    if (!moduleId) {
        sidebar.classList.add("hidden", "-ml-64");
        sidebar.innerHTML = '';
        currentSidebarModuleId = null;
        return;
    }

    // 2. 生成缓存键
    let sidebarKey = moduleId;
    if (moduleId === 'sops' || moduleId === 'amz_hub_core' || moduleId === 'more_core') {
        const currentTab = state.currentTab;
        const routeConfig = MENU_CONFIG.routes[currentTab];
        const category = routeConfig?.category || 'overview';
        sidebarKey = `${moduleId}:${category}`;
    }

    // 3. 缓存检查
    if (currentSidebarModuleId === sidebarKey) {
        sidebar.classList.remove("hidden", "-ml-64");
        return;
    }

    // 4. 数据获取
    const moduleConfig = MENU_CONFIG.modules[moduleId];
    if (!moduleConfig) {
        console.warn(`⚠️ 未找到模块配置: ${moduleId}`);
        sidebar.classList.add("hidden", "-ml-64");
        return;
    }

    const routes = getRoutesByModule(moduleId);

    // 5. 🎯 使用统一渲染器
    if (moduleId === 'sops') {
        sopsRenderer.render(sidebar, moduleConfig, routes);
    } else if (moduleId === 'amz_hub_core') {
        hubRenderer.render(sidebar, moduleConfig, routes);
    } else if (moduleId === 'more_core') {
        moreRenderer.render(sidebar, moduleConfig, routes);
    } else {
        renderDefaultSidebar(sidebar, moduleConfig, routes);
    }

    sidebar.classList.remove("hidden", "-ml-64");
    currentSidebarModuleId = sidebarKey;
}

// 🎉 删除 renderSopsSidebar、renderHubSidebar、renderMoreSidebar 函数
```

---

### 4. 简化 Mega Menu 渲染

**迁移前**：
```javascript
const createRichCard = (id, label, icon, color, version, description, isOverview) => {
    // 每个函数都重复定义 colorSchemes
    const colorSchemes = {
        emerald: {
            border: 'border-emerald-100 hover:border-emerald-300',
            bg: 'hover:bg-emerald-50/80',
            // ... 20+ 行
        },
        amber: { /* ... */ },
        red: { /* ... */ },
        blue: { /* ... */ }
    };
    
    const scheme = colorSchemes[color] || colorSchemes.blue;
    // ...
};
```

**迁移后**：
```javascript
const createRichCard = (id, label, icon, color, version, description, isOverview) => {
    // 🎯 直接使用统一的颜色方案
    const scheme = COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;
    
    // ... 其余代码不变
};
```

---

### 5. 集成 LoadingManager

在需要显示加载状态的地方：

**示例 1: switchTab 函数**

```javascript
export async function switchTab(tab, updateHistory = true) {
    // 🎯 使用 LoadingManager
    await loadingManager.wrap('switch-tab', async () => {
        // 原有的 switchTab 逻辑
        await router.navigate(tab, { updateHistory });
    }, {
        message: '正在切换页面...',
        priority: 1
    });
}
```

**示例 2: 在模块中使用**

```javascript
// 在 scraper 模块
async function handleScrape() {
    const scraperLoading = loadingManager.createScope('scraper');
    
    await scraperLoading.wrap('scrape', async () => {
        const data = await scrapeData();
        return data;
    }, {
        message: '正在采集数据...',
        priority: 2
    });
}
```

---

## 完整迁移清单

### ✅ 必须完成的任务

1. **导入新工具**
   - [ ] 导入 SidebarRenderer
   - [ ] 导入 COLOR_SCHEMES
   - [ ] 导入 LoadingManager

2. **创建渲染器实例**
   - [ ] 创建 sopsRenderer
   - [ ] 创建 hubRenderer
   - [ ] 创建 moreRenderer

3. **简化 renderSidebar**
   - [ ] 替换 renderSopsSidebar 调用
   - [ ] 替换 renderHubSidebar 调用
   - [ ] 替换 renderMoreSidebar 调用
   - [ ] 删除旧的渲染函数

4. **更新颜色方案引用**
   - [ ] renderMegaMenu 中的 colorSchemes
   - [ ] renderSopsMegaMenu 中的 colorSchemes
   - [ ] renderHubMegaMenu 中的 colorSchemes
   - [ ] renderMoreMenu 中的 colorSchemes

5. **集成 LoadingManager**
   - [ ] 在 main.js 中初始化
   - [ ] 在 switchTab 中使用
   - [ ] 在各模块中替换 isScraping 等状态

### 🎯 预期结果

- **代码行数**: 从 1393 行减少到约 900 行（减少 35%）
- **重复代码**: 消除 500+ 行重复代码
- **维护性**: 修改样式只需改一处
- **性能**: StateManager 通知次数减少 30-50%

---

## 测试步骤

### 1. 功能测试

```bash
# 启动开发服务器
npm run dev
```

测试项目：
- [ ] 切换到 SOPs 模块，检查侧边栏
- [ ] 切换到 Amazon 智库，检查侧边栏
- [ ] 切换到更多模块，检查侧边栏
- [ ] 测试侧边栏搜索功能
- [ ] 测试分类切换
- [ ] 测试加载状态显示

### 2. 性能测试

使用 Chrome DevTools:
1. 打开 Performance 面板
2. 开始录制
3. 快速切换多个 Tab
4. 停止录制
5. 检查是否有不必要的重渲染

### 3. 回归测试

确保以下功能正常：
- [ ] 顶部导航菜单
- [ ] 侧边栏展开/收起
- [ ] 路由切换
- [ ] 浏览器前进/后退
- [ ] 页面刷新后状态恢复

---

## 回滚方案

如果迁移后出现问题，可以快速回滚：

1. 保留原 ui.js 的备份：
```bash
copy src\common\utils\ui.js src\common\utils\ui.js.backup
```

2. 如需回滚：
```bash
copy src\common\utils\ui.js.backup src\common\utils\ui.js
```

3. 删除新文件：
```bash
del src\common\components\SidebarRenderer.js
del src\common\constants\colorSchemes.js
del src\common\utils\LoadingManager.js
```
