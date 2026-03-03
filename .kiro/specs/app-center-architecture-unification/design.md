# 设计文档：应用中心模块架构统一化改造

## 概述

本设计文档描述了将 Master Prompt 和 Keyword Hunter 模块从当前的"多Panel独立架构"迁移到与 SOPs、Amazon 智库、更多模块一致的"统一核心模块架构"的技术方案。

### 设计目标

1. **架构统一**: 所有应用中心模块采用相同的架构模式
2. **数据流保持**: 确保模块间的业务数据流关系不被破坏
3. **零功能损失**: 所有现有功能保持完全一致
4. **可维护性提升**: 通过标准化降低维护成本
5. **可扩展性增强**: 为未来新模块提供清晰的开发模板

### 核心设计原则

- **最小侵入**: 尽可能复用现有代码,减少重写范围
- **渐进式迁移**: 支持新旧架构共存,分阶段完成迁移
- **状态优先**: 所有业务状态必须存储在 state 对象中
- **事件解耦**: 模块间通信完全通过 EventBus 实现

## 架构设计

### 当前架构分析

#### Master Prompt 当前架构

```
src/modules/app_center/master_prompt/
├── scraper/
│   ├── scraperPanel.html          # 独立Panel HTML
│   ├── scraperPanel.js            # BaseModule子类
│   └── scraperService.js
├── data_manage/
│   ├── dataDisplay.html           # 独立Panel HTML
│   └── dataDisplay.js             # BaseModule子类
├── analysis/
│   ├── analysisDisplay.html       # 独立Panel HTML
│   ├── analysisDisplay.js         # BaseModule子类
│   ├── analysisRenderer.js
│   └── analysisService.js
├── promptlab/
│   ├── promptlabDisplay.html      # 独立Panel HTML
│   ├── promptlabDisplay.js        # BaseModule子类
│   └── promptlabService.js
└── services/
    └── historyService.js
```

**特点**:
- 每个子功能有独立的 Panel HTML (panel-scraper, panel-data 等)
- Display 文件已经是 BaseModule 子类
- 使用 state 对象管理业务数据
- 使用 EventBus 进行模块间通信
- menuConfig.js 中每个路由指向不同的 panelId

#### Keyword Hunter 当前架构

```
src/modules/app_center/keyword_tracker/
├── trackerDisplay.html            # 单一HTML文件
├── trackerDisplay.js              # BaseModule子类,内部有ROUTE_MAP
└── trackerService.js
```

**特点**:
- 单一 Display 文件管理所有子功能
- 内部使用 ROUTE_MAP 管理子标签切换
- 已经是 BaseModule 子类
- 使用 state.keywordTracker 管理状态

### 目标架构设计

#### 统一架构模式

```
src/modules/app_center/{module}/
├── {module}.js                    # 核心模块文件 (NEW)
├── {module}.html                  # Shell HTML (NEW)
├── {module}_style.css             # 模块样式
├── views/                         # 子模块目录 (NEW)
│   ├── {category}/
│   │   └── {feature}/
│   │       ├── index.js           # 子模块入口
│   │       └── template.html      # 子模块模板
└── services/                      # 共享服务
    └── {service}.js
```

#### Master Prompt 目标架构

```
src/modules/app_center/master_prompt/
├── master_prompt.js               # 核心模块文件 (NEW)
├── master_prompt.html             # Shell HTML (NEW)
├── master_prompt_style.css        # 样式文件
├── views/                         # 子模块目录 (NEW)
│   ├── scraper/
│   │   ├── index.js               # 重构自 scraperPanel.js
│   │   └── template.html          # 重构自 scraperPanel.html
│   ├── data/
│   │   ├── index.js               # 重构自 dataDisplay.js
│   │   └── template.html          # 重构自 dataDisplay.html
│   ├── analysis/
│   │   ├── index.js               # 重构自 analysisDisplay.js
│   │   ├── template.html          # 重构自 analysisDisplay.html
│   │   └── renderer.js            # 保留 analysisRenderer.js
│   └── promptlab/
│       ├── index.js               # 重构自 promptlabDisplay.js
│       └── template.html          # 重构自 promptlabDisplay.html
└── services/                      # 保持不变
    ├── historyService.js
    ├── analysisService.js
    ├── promptlabService.js
    └── scraperService.js
```

#### Keyword Hunter 目标架构

```
src/modules/app_center/keyword_hunter/
├── keyword_hunter.js              # 核心模块文件 (NEW)
├── keyword_hunter.html            # Shell HTML (NEW)
├── keyword_hunter_style.css       # 样式文件
├── views/                         # 子模块目录 (NEW)
│   ├── input/
│   │   ├── index.js               # 拆分自 trackerDisplay.js
│   │   └── template.html
│   ├── process/
│   │   ├── index.js               # 拆分自 trackerDisplay.js
│   │   └── template.html
│   └── analysis/
│       ├── index.js               # 拆分自 trackerDisplay.js
│       └── template.html
└── services/
    └── trackerService.js
```

### 核心组件设计

#### 1. 核心模块文件 ({module}.js)

**职责**:
- 定义 MODULE_MAP 路由映射表
- 监听 APP_EVENTS.ROUTE_CHANGED 事件
- 实现 loadSubModule() 函数
- 管理子模块的加载和卸载
- 提供 registerSubModule() 扩展接口

**设计模式**: 参考 sops.js 的实现

```javascript
// master_prompt.js 伪代码
import './master_prompt_style.css';
import { APP_EVENTS } from '../../common/constants/eventConstants.js';

const MODULE_MAP = {
    'scraper': () => import('./views/scraper/index.js'),
    'data': () => import('./views/data/index.js'),
    'analysis': () => import('./views/analysis/index.js'),
    'promptlab': () => import('./views/promptlab/index.js'),
};

let currentModule = null;

async function loadSubModule(routeId, retryCount = 0) {
    const container = await waitForContainer('master_prompt_content_area');
    
    // 卸载旧模块
    if (currentModule && currentModule.unmount) {
        currentModule.unmount();
    }
    
    // 加载新模块
    const loader = MODULE_MAP[routeId];
    const module = await loader();
    await module.mount(container);
    currentModule = module;
}

window.addEventListener(APP_EVENTS.ROUTE_CHANGED, async (e) => {
    const { routeId } = e.detail;
    if (MODULE_MAP[routeId]) {
        await loadSubModule(routeId);
    }
});
```

#### 2. Shell HTML ({module}.html)

**职责**:
- 提供模块的外壳容器
- 包含动态内容区 ({module}_content_area)
- 可选包含侧边栏或固定UI元素

**设计模式**: 参考 sops.html 的实现

```html
<!-- master_prompt.html -->
<div id="panel-master_prompt" class="panel hidden w-full h-full absolute top-0 left-0 overflow-hidden bg-slate-50/50">
    <div id="master_prompt_content_area" class="w-full h-full fade-in overflow-y-auto scroll-smooth p-6">
        <!-- 子模块动态加载到这里 -->
    </div>
</div>
```

#### 3. 子模块 (views/{category}/{feature}/index.js)

**职责**:
- 导出 mount(container) 函数
- 导出 unmount() 函数
- 实现具体的业务逻辑
- 管理子模块内部状态
- 订阅和发布 EventBus 事件

**接口契约**:

```javascript
// views/scraper/index.js 伪代码
import { loadTemplate } from '../../../../common/utils/viewLoader.js';
import eventBus from '../../../../common/EventBus.js';
import { MODULE_EVENTS } from '../../../../common/constants/eventConstants.js';
import state from '../../../../common/state.js';

export async function mount(container) {
    // 1. 加载模板
    const html = await loadTemplate('src/modules/app_center/master_prompt/views/scraper/template.html');
    container.innerHTML = html;
    
    // 2. 初始化事件监听
    initEventListeners(container);
    
    // 3. 从state恢复状态
    if (state.masterPrompt.scraperConfig) {
        restoreState(state.masterPrompt.scraperConfig);
    }
    
    console.log("✅ Scraper 子模块已挂载");
}

export function unmount() {
    // 1. 保存状态到state
    state.masterPrompt.scraperConfig = getCurrentConfig();
    
    // 2. 清理事件监听器 (如果使用BaseModule则自动清理)
    
    console.log("❌ Scraper 子模块已卸载");
}
```

## 组件和接口

### 路由配置更新

#### menuConfig.js 修改

**当前配置**:
```javascript
scraper: {
    moduleId: 'master_prompt',
    label: '数据采集',
    icon: 'fas fa-spider',
    panelId: 'panel-scraper'  // 独立Panel
},
data: {
    moduleId: 'master_prompt',
    label: '数据管理',
    panelId: 'panel-data'  // 独立Panel
},
```

**目标配置**:
```javascript
scraper: {
    moduleId: 'master_prompt',
    label: '数据采集',
    icon: 'fas fa-spider',
    panelId: 'panel-master_prompt'  // 统一Panel
},
data: {
    moduleId: 'master_prompt',
    label: '数据管理',
    icon: 'fas fa-database',
    panelId: 'panel-master_prompt'  // 统一Panel
},
analysis: {
    moduleId: 'master_prompt',
    label: 'AI 分析',
    icon: 'fas fa-chart-pie',
    panelId: 'panel-master_prompt'  // 统一Panel
},
promptlab: {
    moduleId: 'master_prompt',
    label: 'Prompt 生成',
    icon: 'fas fa-wand-magic-sparkles',
    panelId: 'panel-master_prompt'  // 统一Panel
},
```

### ViewLoader 配置更新

#### viewLoader.js 修改

**当前配置**:
```javascript
const VIEW_REGISTRY = {
    'scraper': { path: '/src/modules/app_center/master_prompt/scraper/scraperPanel.html', target: 'main' },
    'data_manage': { path: '/src/modules/app_center/master_prompt/data_manage/dataDisplay.html', target: 'main' },
    'analysis': { path: '/src/modules/app_center/master_prompt/analysis/analysisDisplay.html', target: 'main' },
    'promptlab': { path: '/src/modules/app_center/master_prompt/promptlab/promptlabDisplay.html', target: 'main' },
};
```

**目标配置**:
```javascript
const VIEW_REGISTRY = {
    // 只需要注册Shell HTML
    'master_prompt': { path: '/src/modules/app_center/master_prompt/master_prompt.html', target: 'main' },
    'keyword_hunter': { path: '/src/modules/app_center/keyword_hunter/keyword_hunter.html', target: 'main' },
};

// ensureViewLoaded 函数修改
export async function ensureViewLoaded(routeId) {
    let moduleKey = null;
    
    // Master Prompt 路由映射
    if (['scraper', 'data', 'analysis', 'promptlab'].includes(routeId)) {
        moduleKey = 'master_prompt';
    }
    // Keyword Hunter 路由映射
    else if (routeId.startsWith('kw_')) {
        moduleKey = 'keyword_hunter';
    }
    
    if (moduleKey && VIEW_REGISTRY[moduleKey] && !VIEW_REGISTRY[moduleKey].isLoaded) {
        await loadHtml(moduleKey);
    }
}
```

## 数据模型

### 状态管理结构

```javascript
// state.js 中的数据结构
const state = {
    // Master Prompt 状态
    masterPrompt: {
        // Scraper 状态
        scrapedData: {
            metadata: {
                marketplace: 'US',
                scrape_timestamp: '2024-01-01T00:00:00Z',
                total_asins: 0
            },
            products: []
        },
        selectedAsins: [],
        
        // Analysis 状态
        analysisReport: null,
        translatedReport: null,
        showTranslation: false,
        
        // Promptlab 状态
        promptlab: {
            userProductProfile: {
                targetMarket: '',
                keywordsTier1: '',
                keywordsTier2: '',
                // ... 其他配置
            }
        },
        
        // UI 状态
        expandedAsin: null,
        currentDataTab: 'preview'
    },
    
    // Keyword Hunter 状态
    keywordTracker: {
        keywords: [],
        processedCopy: null,
        analysisResults: null,
        // ... 其他状态
    }
};
```

### EventBus 事件定义

```javascript
// eventConstants.js 中的事件定义
export const MODULE_EVENTS = {
    SCRAPER: {
        SCRAPE_SUCCESS: 'scraper:scrape_success',
        SCRAPE_ERROR: 'scraper:scrape_error'
    },
    DATA: {
        DATA_UPDATED: 'data:updated',
        ASIN_DELETED: 'data:asin_deleted'
    },
    ANALYSIS: {
        ANALYSIS_COMPLETE: 'analysis:complete',
        REPORT_UPDATED: 'analysis:report_updated'
    },
    PROMPTLAB: {
        PROMPT_GENERATED: 'promptlab:generated'
    }
};
```

## 错误处理

### 容器等待机制

```javascript
function waitForContainer(id, timeout = 3000) {
    return new Promise((resolve) => {
        const el = document.getElementById(id);
        if (el) return resolve(el);

        const startTime = Date.now();
        const timer = setInterval(() => {
            const el = document.getElementById(id);
            if (el) {
                clearInterval(timer);
                resolve(el);
            }
            if (Date.now() - startTime > timeout) {
                clearInterval(timer);
                resolve(null);
            }
        }, 50);
    });
}
```

### 错误边界 UI

```javascript
function renderErrorBoundary(container, routeId, error) {
    container.innerHTML = `
        <div class="error-boundary flex flex-col items-center justify-center p-12 text-center fade-in">
            <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">模块加载失败</h3>
            <p class="text-sm text-slate-500 mb-4 max-w-md">${error.message || '网络连接不稳定或文件缺失'}</p>
            <div class="flex gap-3">
                <button onclick="window.location.reload()" 
                    class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                    <i class="fas fa-redo mr-2"></i>刷新页面
                </button>
                <button id="btn-retry-${routeId}" 
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                    再试一次
                </button>
            </div>
        </div>
    `;
}
```

### 自动重试机制

```javascript
async function loadSubModule(routeId, retryCount = 0) {
    try {
        const module = await loader();
        await module.mount(container);
        currentModule = module;
    } catch (err) {
        console.error(`加载子模块失败 (重试 ${retryCount}):`, err);

        // 自动重试机制 (Max 1次)
        if (retryCount < 1) {
            container.innerHTML = '<div class="p-10 text-center"><i class="fas fa-circle-notch fa-spin text-orange-500"></i><span class="ml-2 text-slate-500">连接超时，正在重试...</span></div>';
            setTimeout(() => loadSubModule(routeId, retryCount + 1), 1000);
            return;
        }

        // 错误边界 UI
        renderErrorBoundary(container, routeId, err);
    }
}
```

## 测试策略

### 单元测试

**测试范围**:
- 核心模块文件的路由匹配逻辑
- waitForContainer 函数的超时处理
- 子模块的 mount/unmount 生命周期
- 状态恢复逻辑

**测试工具**: Jest + Testing Library

### 集成测试

**测试场景**:
1. **Master Prompt 数据流测试**:
   - 场景1: scraper 采集 -> data 显示 -> 数据正确
   - 场景2: data 删除ASIN -> analysis 选择列表更新
   - 场景3: analysis 生成报告 -> promptlab 使用报告
   - 场景4: 跨模块切换后状态保持

2. **Keyword Hunter 数据流测试**:
   - 场景1: input 输入 -> process 处理 -> 数据传递
   - 场景2: process 清理 -> analysis 统计更新

### 端到端测试

**测试工具**: Playwright

**测试用例**:
- 用户完整工作流: 从数据采集到Prompt生成
- 模块切换性能测试
- 错误恢复测试



## 正确性属性

*属性(Property)是系统在所有有效执行中都应该保持为真的特征或行为。属性是人类可读规范与机器可验证正确性保证之间的桥梁。*

### 属性 1: 路由到子模块的正确映射

*对于任意*在 MODULE_MAP 中定义的路由 ID,当该路由被激活时,系统应该加载对应的子模块,并且子模块的 mount() 函数应该被调用且传入正确的容器元素。

**验证**: 需求 1.5, 2.3, 17.3

### 属性 2: 子模块生命周期与状态管理的一致性

*对于任意*子模块,当它被卸载时,所有业务状态应该被保存到 state 对象中;当它被重新挂载时,应该能够从 state 对象完全恢复之前的状态,并且 UI 应该反映恢复后的状态。

**验证**: 需求 2.4, 8.9, 8.10, 16.2

### 属性 3: 容器等待机制的超时处理

*对于任意*容器 ID,如果容器在指定超时时间内未找到,waitForContainer() 函数应该返回 null;如果容器在超时前出现,应该立即返回该容器元素。

**验证**: 需求 6.1, 6.2

### 属性 4: 数据流完整性保持

*对于任意*有效的操作序列(如 scraper采集 -> data管理 -> analysis分析 -> promptlab生成),在改造前后,相同的输入应该产生相同的输出,并且中间状态应该正确传递。

**验证**: 需求 4.6, 8.7, 10.9

### 属性 5: 事件订阅的自动清理

*对于任意*使用 BaseModule.addEventListener() 或 BaseModule.addDisposable() 注册的事件监听器或清理函数,当模块的 unmount() 被调用时,所有注册的清理函数都应该被执行,避免内存泄漏。

**验证**: 需求 2.4, 2.6, 2.7

### 属性 6: 路由切换时的模块替换

*对于任意*两个不同的路由 ID (routeA 和 routeB),当从 routeA 切换到 routeB 时,routeA 对应的子模块应该被卸载(unmount被调用),routeB 对应的子模块应该被加载(mount被调用),并且内容区的 DOM 应该被完全替换。

**验证**: 需求 1.5, 2.3, 2.4, 17.3

### 属性 7: 错误恢复的幂等性

*对于任意*加载失败的子模块,当用户点击"再试一次"按钮时,系统应该重新尝试加载,并且如果加载成功,应该达到与首次加载成功相同的状态。

**验证**: 需求 7.4

### 属性 8: Panel 架构迁移的等价性

*对于任意*用户操作序列,在"多Panel模式"和"单Panel+动态内容区模式"下,相同的操作应该产生相同的业务结果(state 变化相同),尽管 DOM 结构不同。

**验证**: 需求 17.1, 17.2, 17.3

### 属性 9: EventBus 通信的持久性

*对于任意*模块间的 EventBus 事件订阅,当模块被卸载并重新挂载后,如果该模块在 mount() 中重新订阅了事件,那么事件通信应该继续正常工作。

**验证**: 需求 8.5, 10.10

### 属性 10: 懒加载的按需性

*对于任意*子模块,只有当其对应的路由被首次激活时,该子模块的代码才应该被加载(import() 被调用),并且后续激活相同路由时不应该重复加载代码。

**验证**: 需求 14.1, 14.2, 14.3

