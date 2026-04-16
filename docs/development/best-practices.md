# 系统稳定性优化 - 最佳实践文档

## 文档信息

**版本：** 1.0  
**最后更新：** 2026-04-17  
**适用范围：** 所有使用新基础设施架构的开发者

---

## 概述

本文档汇总了使用新基础设施架构（SafeModuleLoader、AlpineRegistry、SafeRenderer、StateManager）的最佳实践和常见模式。遵循这些实践可以帮助你编写更安全、更高效、更易维护的代码。

### 核心原则

1. **安全第一** - 所有用户输入必须经过转义或验证
2. **类型安全** - 充分利用 TypeScript 的类型系统
3. **性能优先** - 避免不必要的 DOM 操作和状态更新
4. **可维护性** - 代码清晰、模块化、易于理解
5. **一致性** - 遵循统一的编码规范和模式

---

## 目录

1. [SafeModuleLoader 最佳实践](#safemoduleloader-最佳实践)
2. [AlpineRegistry 最佳实践](#alpineregistry-最佳实践)
3. [SafeRenderer 最佳实践](#saferenderer-最佳实践)
4. [StateManager 最佳实践](#statemanager-最佳实践)
5. [错误处理最佳实践](#错误处理最佳实践)
6. [性能优化最佳实践](#性能优化最佳实践)
7. [安全最佳实践](#安全最佳实践)
8. [测试最佳实践](#测试最佳实践)
9. [代码组织最佳实践](#代码组织最佳实践)
10. [常见反模式](#常见反模式)

---

## SafeModuleLoader 最佳实践

### 1. 使用单例实例

始终使用导出的单例实例，而不是尝试创建新实例。

```typescript
// ✅ 推荐
import { safeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';

// ❌ 不推荐
const loader = SafeModuleLoader.getInstance();
```

**原因：** 单例模式确保全局只有一个加载器实例，避免重复加载和缓存不一致。

---

### 2. 合理设置超时时间

根据模块大小和网络状况设置合适的超时时间。

```typescript
// ✅ 推荐：小模块使用短超时
await safeModuleLoader.loadModule(container, './modules/settings', {
  timeout: 3000  // 3 秒
});

// ✅ 推荐：大模块使用长超时
await safeModuleLoader.loadModule(container, './modules/ai-analysis', {
  timeout: 10000  // 10 秒
});

// ❌ 不推荐：所有模块使用相同超时
await safeModuleLoader.loadModule(container, modulePath, {
  timeout: 5000  // 不够灵活
});
```

**原因：** 不同模块的加载时间差异很大，合理的超时设置可以提升用户体验。

---

### 3. 提供错误回调

使用 `onError` 回调进行自定义错误处理。

```typescript
// ✅ 推荐
await safeModuleLoader.loadModule(container, modulePath, {
  onError: (error) => {
    // 记录到分析系统
    analytics.track('module_load_error', {
      module: modulePath,
      error: error.message,
      timestamp: Date.now()
    });
    
    // 显示用户友好的通知
    showNotification('模块加载失败，请稍后重试', 'error');
  }
});

// ❌ 不推荐：忽略错误
await safeModuleLoader.loadModule(container, modulePath);
```

**原因：** 错误回调让你能够自定义错误处理逻辑，提供更好的用户体验。

---

### 4. 预加载关键模块

在应用启动时预加载用户可能访问的模块。

```typescript
// ✅ 推荐：应用启动时预加载
async function initApp() {
  // 预加载常用模块
  await safeModuleLoader.preloadModules([
    './modules/promptlab',
    './modules/ai-analysis',
    './modules/scraper'
  ]);
  
  // 启动应用
  Alpine.start();
}

// ✅ 推荐：路由切换前预加载
router.beforeEach(async (to, from, next) => {
  if (to.name === 'promptlab') {
    await safeModuleLoader.preloadModules(['./modules/promptlab']);
  }
  next();
});

// ❌ 不推荐：不预加载，用户等待时间长
```

**原因：** 预加载可以显著提升用户体验，减少等待时间。

---
### 5. 定期清理缓存

避免内存占用过高。

```typescript
// ✅ 推荐：用户登出时清理缓存
function logout() {
  safeModuleLoader.clearCache();
  stateManager.clear();
  // ... 其他登出逻辑
}

// ✅ 推荐：定期检查并清理
setInterval(() => {
  const stats = safeModuleLoader.getCacheStats();
  if (stats.cachedModules > 50) {
    safeModuleLoader.clearCache();
  }
}, 5 * 60 * 1000); // 每 5 分钟检查一次

// ❌ 不推荐：从不清理缓存
```

**原因：** 长时间运行的应用可能缓存大量模块，定期清理可以释放内存。

---

### 6. 使用加载指示器

为长时间加载提供视觉反馈。

```typescript
// ✅ 推荐：显示加载指示器
await safeModuleLoader.loadModule(container, modulePath, {
  showLoading: true,
  loadingText: '正在加载 Promptlab 模块...'
});

// ❌ 不推荐：无加载提示，用户不知道发生了什么
await safeModuleLoader.loadModule(container, modulePath);
```

**原因：** 加载指示器让用户知道系统正在工作，提升用户体验。

---

### 7. 处理加载结果

始终检查加载结果并采取相应措施。

```typescript
// ✅ 推荐：检查加载结果
const result = await safeModuleLoader.loadModule(container, modulePath);

if (result.success) {
  console.log(`模块加载成功，耗时 ${result.loadTime}ms`);
  
  if (result.retryAttempts && result.retryAttempts > 0) {
    console.warn(`经过 ${result.retryAttempts} 次重试后成功`);
    // 可能需要上报网络问题
  }
} else {
  console.error('模块加载失败:', result.error);
  
  // 根据错误类型采取不同措施
  if (result.error instanceof NetworkError) {
    showNotification('网络连接问题，请检查网络设置');
  } else {
    showNotification('模块加载失败，请刷新页面');
  }
}

// ❌ 不推荐：忽略加载结果
await safeModuleLoader.loadModule(container, modulePath);
```

**原因：** 检查加载结果可以帮助你发现问题并提供更好的用户体验。

---

### 8. 避免重复加载

利用缓存机制避免重复加载同一模块。

```typescript
// ✅ 推荐：利用缓存
// 第一次加载 - 从网络加载
await safeModuleLoader.loadModule(container, modulePath);

// 第二次加载 - 从缓存加载（瞬间完成）
await safeModuleLoader.loadModule(container, modulePath);

// ❌ 不推荐：每次都清除缓存
safeModuleLoader.clearCache(modulePath);
await safeModuleLoader.loadModule(container, modulePath);
```

**原因：** 缓存可以显著提升性能，减少网络请求。

---

## AlpineRegistry 最佳实践

### 1. 集中注册组件

在应用启动时集中注册所有组件。

```typescript
// ✅ 推荐：创建统一的注册文件
// src/alpine-components.ts
import { getAlpineRegistry } from '@/common/infrastructure/AlpineRegistry';

const registry = getAlpineRegistry();

export function registerAlpineComponents() {
  // 基础服务
  registry.register('authService', createAuthService);
  registry.register('stateManager', createStateManager);
  
  // 业务组件
  registry.register('promptlabPanel', createPromptlabPanel, ['stateManager']);
  registry.register('aiAnalysisPanel', createAIAnalysisPanel, ['stateManager']);
  registry.register('scraperPanel', createScraperPanel, ['stateManager']);
  
  // 初始化
  registry.init();
}

// src/main.ts
import { registerAlpineComponents } from './alpine-components';

registerAlpineComponents();
Alpine.start();

// ❌ 不推荐：分散在各个模块中注册
// src/modules/promptlab/index.ts
Alpine.data('promptlabPanel', () => ({ /* ... */ }));

// src/modules/ai-analysis/index.ts
Alpine.data('aiAnalysisPanel', () => ({ /* ... */ }));
```

**原因：** 集中注册让依赖关系清晰可见，易于管理和维护。

---
### 2. 明确声明依赖

始终明确声明组件依赖，让依赖关系清晰可见。

```typescript
// ✅ 推荐：明确声明依赖
registry.register('userPanel', createUserPanel, ['authService', 'stateManager']);

// ❌ 不推荐：隐式依赖
registry.register('userPanel', () => ({
  init() {
    // 使用 authService，但没有声明依赖
    // 可能导致 authService 未注册时出错
    const auth = Alpine.store('authService');
  }
}));
```

**原因：** 明确的依赖声明让 AlpineRegistry 能够自动解析依赖顺序，避免初始化错误。

---

### 3. 避免循环依赖

设计组件时避免循环依赖。

```typescript
// ❌ 不推荐：循环依赖
registry.register('componentA', createComponentA, ['componentB']);
registry.register('componentB', createComponentB, ['componentA']);

// ✅ 推荐：引入中间层
registry.register('sharedService', createSharedService);
registry.register('componentA', createComponentA, ['sharedService']);
registry.register('componentB', createComponentB, ['sharedService']);

// ✅ 推荐：重新设计依赖关系
registry.register('baseComponent', createBaseComponent);
registry.register('componentA', createComponentA, ['baseComponent']);
registry.register('componentB', createComponentB, ['baseComponent']);
```

**原因：** 循环依赖会导致初始化失败，且难以调试。

---

### 4. 使用工厂函数

组件工厂函数应该返回一个新对象，而不是共享对象。

```typescript
// ✅ 推荐：每次返回新对象
registry.register('userPanel', () => ({
  username: '',
  email: '',
  
  init() {
    this.loadUser();
  },
  
  login() {
    // 登录逻辑
  }
}));

// ❌ 不推荐：共享对象
const sharedPanel = {
  username: '',
  login() { /* ... */ }
};
registry.register('userPanel', () => sharedPanel);
```

**原因：** 共享对象会导致多个组件实例共享状态，产生难以调试的 bug。

---

### 5. 模块化组件定义

将组件定义拆分到独立文件。

```typescript
// ✅ 推荐：独立文件
// src/components/user-panel.ts
export function createUserPanel() {
  return {
    username: '',
    email: '',
    
    init() {
      this.loadUser();
    },
    
    loadUser() {
      // 加载用户信息
    },
    
    login() {
      // 登录逻辑
    }
  };
}

// src/alpine-components.ts
import { createUserPanel } from './components/user-panel';

registry.register('userPanel', createUserPanel, ['authService']);

// ❌ 不推荐：所有组件定义在一个文件中
// src/alpine-components.ts
registry.register('userPanel', () => ({
  // 100+ 行代码
}));
registry.register('dashboardPanel', () => ({
  // 100+ 行代码
}));
// ... 更多组件
```

**原因：** 模块化让代码更易维护，便于测试和重用。

---

### 6. 开发环境启用详细日志

开发时启用 `debug` 日志，帮助排查问题。

```typescript
// ✅ 推荐：根据环境配置日志级别
const registry = getAlpineRegistry({
  logLevel: import.meta.env.DEV ? 'debug' : 'warn'
});

// ❌ 不推荐：生产环境也使用 debug 日志
const registry = getAlpineRegistry({
  logLevel: 'debug'
});
```

**原因：** 详细日志有助于开发调试，但会影响生产环境性能。

---

### 7. 生产环境自动启动

生产环境配置自动启动，简化代码。

```typescript
// ✅ 推荐：生产环境自动启动
const registry = getAlpineRegistry({
  autoStart: !import.meta.env.DEV
});

registry.register(/* ... */);
registry.init();

// 开发环境手动启动（方便调试）
if (import.meta.env.DEV) {
  Alpine.start();
}

// ❌ 不推荐：所有环境都手动启动
registry.init();
Alpine.start();
```

**原因：** 自动启动减少样板代码，降低出错概率。

---

## SafeRenderer 最佳实践

### 1. 选择合适的渲染方法

根据内容类型选择合适的渲染方法。

```typescript
// ✅ 推荐：静态模板使用 renderTemplate
safeRenderer.renderTemplate(container, `
  <div class="panel">
    <h2>Settings</h2>
    <form>...</form>
  </div>
`);

// ✅ 推荐：动态内容使用 renderDynamic
safeRenderer.renderDynamic(
  container,
  '<div>Hello {{name}}</div>',
  { name: userInput }  // 自动转义
);

// ✅ 推荐：列表使用 renderList
safeRenderer.renderList(
  container,
  items,
  (item) => `<div>${item.name}</div>`
);

// ❌ 不推荐：所有场景都使用 innerHTML
container.innerHTML = template;  // XSS 风险
```

**原因：** 不同的渲染方法针对不同场景优化，选择合适的方法可以提升安全性和性能。

---
### 2. 始终转义用户输入

所有用户输入必须经过转义或验证。

```typescript
// ✅ 推荐：使用 renderDynamic 自动转义
safeRenderer.renderDynamic(
  container,
  '<div>{{userInput}}</div>',
  { userInput: getUserInput() }
);

// ✅ 推荐：手动转义
const safe = safeRenderer.escapeHtml(getUserInput());
container.innerHTML = `<div>${safe}</div>`;

// ❌ 不推荐：直接使用用户输入
container.innerHTML = `<div>${getUserInput()}</div>`;  // XSS 风险
```

**原因：** 用户输入可能包含恶意脚本，必须转义以防止 XSS 攻击。

---

### 3. 使用白名单清理富文本

富文本内容需要配置白名单。

```typescript
// ✅ 推荐：使用白名单
safeRenderer.renderDynamic(
  container,
  '<div>{{content}}</div>',
  { content: richText },
  {
    allowedTags: ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
    allowedAttrs: ['href', 'class']
  }
);

// ❌ 不推荐：禁用转义
safeRenderer.renderDynamic(
  container,
  '<div>{{content}}</div>',
  { content: richText },
  { sanitize: false }  // 危险
);
```

**原因：** 白名单机制允许安全的 HTML 标签，同时阻止危险内容。

---

### 4. 优化列表渲染

大列表使用 `renderList` 提升性能。

```typescript
// ✅ 推荐：使用 renderList
safeRenderer.renderList(
  container,
  items,
  (item) => `<div>${item.name}</div>`
);

// ❌ 不推荐：循环使用 innerHTML
items.forEach(item => {
  container.innerHTML += `<div>${item.name}</div>`;  // 多次重排
});
```

**原因：** `renderList` 使用 DocumentFragment 一次性插入所有元素，避免多次 DOM 操作。

---

### 5. 缓存常用模板

重复使用的模板应该缓存。

```typescript
// ✅ 推荐：缓存模板
const templates = {
  userCard: '<div class="card">{{name}} - {{email}}</div>',
  productCard: '<div class="product">{{title}} - ${{price}}</div>'
};

// 重复使用
safeRenderer.renderDynamic(container, templates.userCard, userData);

// ❌ 不推荐：每次都定义模板
safeRenderer.renderDynamic(
  container,
  '<div class="card">{{name}} - {{email}}</div>',
  userData
);
```

**原因：** 缓存模板可以减少字符串创建开销，提升性能。

---

### 6. 提供空列表提示

列表为空时提供友好提示。

```typescript
// ✅ 推荐：提供空列表提示
safeRenderer.renderList(
  container,
  items,
  (item) => `<div>${item.name}</div>`,
  { emptyMessage: '暂无数据' }
);

// ❌ 不推荐：空列表时显示空白
safeRenderer.renderList(
  container,
  items,
  (item) => `<div>${item.name}</div>`
);
```

**原因：** 空列表提示让用户知道没有数据，而不是加载失败。

---

## StateManager 最佳实践

### 1. 使用类型安全的方法

使用专用的 getter/setter 而不是直接访问 store。

```typescript
// ✅ 推荐：使用 StateManager 方法
const report = stateManager.getAnalysisReport();
stateManager.setAnalysisReport(newReport);

// ❌ 不推荐：直接访问 store
const report = appStore.getState().analysis.analysisReport;
appStore.getState().setAnalysisReport(newReport);

// ❌ 不推荐：直接访问 state 对象
const report = state.analysis.analysisReport;
state.analysis.analysisReport = newReport;
```

**原因：** StateManager 提供类型安全的接口，编译时可以发现错误。

---

### 2. 批量更新状态

使用批量更新方法提升性能。

```typescript
// ✅ 推荐：批量更新
stateManager.updateScraper({
  isScraping: true,
  progress: 50,
  status: 'scraping'
});

// ❌ 不推荐：多次单独更新
stateManager.setIsScraping(true);
stateManager.setScraperProgress(50);
stateManager.setScraperStatus('scraping');
```

**原因：** 批量更新减少状态变化通知次数，提升性能。

---

### 3. 及时取消订阅

避免内存泄漏。

```typescript
// ✅ 推荐：及时取消订阅
const unsubscribe = stateManager.subscribe(selector, callback);

// 组件卸载时取消订阅
onUnmounted(() => {
  unsubscribe();
});

// ❌ 不推荐：忘记取消订阅
stateManager.subscribe(selector, callback);
```

**原因：** 未取消的订阅会导致内存泄漏和意外的回调执行。

---

### 4. 使用精确的 selector

避免不必要的更新。

```typescript
// ✅ 推荐：精确的 selector
stateManager.subscribe(
  (state) => state.analysis.analysisReport,
  (report) => {
    // 只在 analysisReport 变化时执行
  }
);

// ❌ 不推荐：过于宽泛的 selector
stateManager.subscribe(
  (state) => state.analysis,
  (analysis) => {
    // analysis 的任何字段变化都会执行
  }
);
```

**原因：** 精确的 selector 减少不必要的回调执行，提升性能。

---

### 5. 使用中间件处理横切关注点

将日志、验证等逻辑放在中间件中。

```typescript
// ✅ 推荐：使用中间件
const validationMiddleware = (state, action, payload) => {
  if (action === 'setAnalysisReport' && !payload) {
    throw new Error('分析报告不能为空');
  }
};

stateManager.use(validationMiddleware);

// ❌ 不推荐：在每个 setter 中重复验证
function setAnalysisReport(report) {
  if (!report) {
    throw new Error('分析报告不能为空');
  }
  stateManager.setAnalysisReport(report);
}
```

**原因：** 中间件让横切关注点集中管理，避免代码重复。

---
### 6. 合理使用时间旅行

仅在需要时启用时间旅行。

```typescript
// ✅ 推荐：开发环境启用
const manager = StateManager.getInstance({
  enableTimeTravel: import.meta.env.DEV,
  maxSnapshots: 50
});

// ❌ 不推荐：生产环境也启用
const manager = StateManager.getInstance({
  enableTimeTravel: true,
  maxSnapshots: 1000  // 占用大量内存
});
```

**原因：** 时间旅行需要深度克隆状态，会影响性能和内存占用。

---

### 7. 定期清理快照

避免内存占用过高。

```typescript
// ✅ 推荐：定期清理旧快照
setInterval(() => {
  const snapshots = stateManager.getSnapshotList();
  if (snapshots.length > 100) {
    stateManager.clearSnapshotHistory();
  }
}, 10 * 60 * 1000); // 每 10 分钟检查一次

// ❌ 不推荐：从不清理快照
```

**原因：** 快照会占用内存，定期清理可以避免内存泄漏。

---

### 8. 使用描述性的快照名称

便于调试和追踪。

```typescript
// ✅ 推荐：描述性名称
stateManager.createSnapshot('分析开始前的状态');
stateManager.createSnapshot('用户选择了 3 个 ASINs');

// ❌ 不推荐：无意义的名称
stateManager.createSnapshot();
stateManager.createSnapshot('snapshot');
```

**原因：** 描述性名称让你能够快速找到需要的快照。

---

## 错误处理最佳实践

### 1. 使用错误边界

捕获并处理所有错误。

```typescript
// ✅ 推荐：使用错误边界
try {
  await performOperation();
} catch (error) {
  console.error('操作失败:', error);
  
  // 显示用户友好的错误消息
  showNotification('操作失败，请稍后重试', 'error');
  
  // 上报错误
  errorTracker.track(error);
}

// ❌ 不推荐：忽略错误
await performOperation();
```

**原因：** 错误边界防止错误导致应用崩溃，提供更好的用户体验。

---

### 2. 提供降级方案

关键功能失败时提供降级方案。

```typescript
// ✅ 推荐：提供降级方案
async function loadData() {
  try {
    return await fetchFromAPI();
  } catch (error) {
    console.warn('API 请求失败，使用缓存数据', error);
    return loadFromCache();
  }
}

// ❌ 不推荐：失败后无降级
async function loadData() {
  return await fetchFromAPI();  // 失败后无法恢复
}
```

**原因：** 降级方案让应用在部分功能失败时仍能继续运行。

---

### 3. 记录详细的错误信息

便于调试和问题追踪。

```typescript
// ✅ 推荐：记录详细信息
try {
  await processData(data);
} catch (error) {
  console.error('数据处理失败', {
    error: error.message,
    stack: error.stack,
    data: data,
    timestamp: Date.now(),
    userAgent: navigator.userAgent
  });
}

// ❌ 不推荐：只记录错误消息
try {
  await processData(data);
} catch (error) {
  console.error('失败');
}
```

**原因：** 详细的错误信息帮助快速定位和解决问题。

---

### 4. 区分错误类型

根据错误类型采取不同措施。

```typescript
// ✅ 推荐：区分错误类型
try {
  await loadModule();
} catch (error) {
  if (error instanceof NetworkError) {
    showNotification('网络连接问题，请检查网络设置');
  } else if (error instanceof ParseError) {
    showNotification('数据格式错误，请联系技术支持');
  } else {
    showNotification('未知错误，请刷新页面');
  }
}

// ❌ 不推荐：所有错误统一处理
try {
  await loadModule();
} catch (error) {
  showNotification('操作失败');
}
```

**原因：** 不同类型的错误需要不同的处理方式和用户提示。

---

### 5. 避免吞没错误

不要捕获错误后什么都不做。

```typescript
// ✅ 推荐：记录或处理错误
try {
  await riskyOperation();
} catch (error) {
  console.error('操作失败:', error);
  // 或者重新抛出
  throw error;
}

// ❌ 不推荐：吞没错误
try {
  await riskyOperation();
} catch (error) {
  // 什么都不做
}
```

**原因：** 吞没错误会隐藏问题，导致难以调试。

---

## 性能优化最佳实践

### 1. 避免不必要的 DOM 操作

减少 DOM 操作次数。

```typescript
// ✅ 推荐：使用 DocumentFragment
const fragment = document.createDocumentFragment();
items.forEach(item => {
  const div = document.createElement('div');
  div.textContent = item.name;
  fragment.appendChild(div);
});
container.appendChild(fragment);

// ✅ 推荐：使用 renderList
safeRenderer.renderList(container, items, (item) => `<div>${item.name}</div>`);

// ❌ 不推荐：多次操作 DOM
items.forEach(item => {
  const div = document.createElement('div');
  div.textContent = item.name;
  container.appendChild(div);  // 每次都触发重排
});
```

**原因：** DOM 操作是昂贵的，减少操作次数可以显著提升性能。

---

### 2. 使用防抖和节流

限制高频事件的处理频率。

```typescript
// ✅ 推荐：使用防抖
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);

input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});

// ✅ 推荐：使用节流
const throttledScroll = throttle(() => {
  updateScrollPosition();
}, 100);

window.addEventListener('scroll', throttledScroll);

// ❌ 不推荐：直接处理高频事件
input.addEventListener('input', (e) => {
  performSearch(e.target.value);  // 每次输入都搜索
});
```

**原因：** 防抖和节流可以减少不必要的计算和网络请求。

---

### 3. 懒加载非关键资源

延迟加载非关键资源。

```typescript
// ✅ 推荐：懒加载图片
<img data-src="image.jpg" class="lazy" />

// ✅ 推荐：懒加载模块
router.on('/promptlab', async () => {
  const module = await import('./modules/promptlab');
  module.mount(container);
});

// ❌ 不推荐：一次性加载所有资源
import './modules/promptlab';
import './modules/ai-analysis';
import './modules/scraper';
// ... 所有模块
```

**原因：** 懒加载可以减少初始加载时间，提升首屏性能。

---

### 4. 缓存计算结果

避免重复计算。

```typescript
// ✅ 推荐：缓存计算结果
const cache = new Map();

function expensiveCalculation(input) {
  if (cache.has(input)) {
    return cache.get(input);
  }
  
  const result = performCalculation(input);
  cache.set(input, result);
  return result;
}

// ❌ 不推荐：每次都重新计算
function expensiveCalculation(input) {
  return performCalculation(input);
}
```

**原因：** 缓存可以避免重复计算，提升性能。

---

### 5. 使用虚拟滚动

处理大量数据时使用虚拟滚动。

```typescript
// ✅ 推荐：虚拟滚动（只渲染可见项）
function renderVisibleItems() {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = startIndex + visibleCount;
  const visibleItems = items.slice(startIndex, endIndex);
  
  safeRenderer.renderList(container, visibleItems, renderItem);
}

// ❌ 不推荐：渲染所有项
safeRenderer.renderList(container, allItems, renderItem);
```

**原因：** 虚拟滚动只渲染可见项，可以处理数万条数据而不影响性能。

---
## 安全最佳实践

### 1. 永远不要信任用户输入

所有用户输入都必须验证和转义。

```typescript
// ✅ 推荐：验证和转义
function processUserInput(input) {
  // 验证
  if (!isValidInput(input)) {
    throw new Error('无效的输入');
  }
  
  // 转义
  const safe = safeRenderer.escapeHtml(input);
  
  // 使用
  return safe;
}

// ❌ 不推荐：直接使用
function processUserInput(input) {
  return input;  // 危险
}
```

**原因：** 用户输入可能包含恶意内容，必须验证和转义。

---

### 2. 使用内容安全策略 (CSP)

配置 CSP 防止 XSS 攻击。

```html
<!-- ✅ 推荐：配置 CSP -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';">

<!-- ❌ 不推荐：不配置 CSP -->
```

**原因：** CSP 可以阻止未授权的脚本执行，提供额外的安全层。

---

### 3. 避免使用 eval 和 Function 构造器

不要动态执行代码。

```typescript
// ✅ 推荐：使用安全的替代方案
const result = JSON.parse(jsonString);

// ❌ 不推荐：使用 eval
const result = eval(`(${jsonString})`);  // 危险

// ❌ 不推荐：使用 Function 构造器
const fn = new Function('return ' + userInput);  // 危险
```

**原因：** `eval` 和 `Function` 构造器可以执行任意代码，存在严重安全风险。

---

### 4. 验证 URL 和链接

防止开放重定向攻击。

```typescript
// ✅ 推荐：验证 URL
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function navigateTo(url) {
  if (!isValidUrl(url)) {
    throw new Error('无效的 URL');
  }
  window.location.href = url;
}

// ❌ 不推荐：不验证 URL
function navigateTo(url) {
  window.location.href = url;  // 可能跳转到恶意网站
}
```

**原因：** 未验证的 URL 可能导致开放重定向攻击。

---

### 5. 使用 HTTPS

所有敏感数据传输必须使用 HTTPS。

```typescript
// ✅ 推荐：使用 HTTPS
const API_BASE = 'https://api.example.com';

// ❌ 不推荐：使用 HTTP
const API_BASE = 'http://api.example.com';  // 不安全
```

**原因：** HTTPS 加密传输数据，防止中间人攻击。

---

### 6. 定期更新依赖

及时修复已知的安全漏洞。

```bash
# ✅ 推荐：定期更新依赖
npm audit
npm audit fix

# ✅ 推荐：检查过时的依赖
npm outdated

# ❌ 不推荐：从不更新依赖
```

**原因：** 旧版本的依赖可能包含已知的安全漏洞。

---

## 测试最佳实践

### 1. 编写可测试的代码

保持函数纯净和独立。

```typescript
// ✅ 推荐：纯函数，易于测试
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ 不推荐：依赖外部状态
function calculateTotal() {
  return globalItems.reduce((sum, item) => sum + item.price, 0);
}
```

**原因：** 纯函数易于测试，不需要复杂的 mock。

---

### 2. 使用有意义的测试名称

测试名称应该描述测试内容。

```typescript
// ✅ 推荐：描述性名称
test('should return empty array when input is empty', () => {
  expect(filterItems([])).toEqual([]);
});

// ❌ 不推荐：无意义的名称
test('test1', () => {
  expect(filterItems([])).toEqual([]);
});
```

**原因：** 描述性名称让测试失败时能快速定位问题。

---

### 3. 测试边界条件

不要只测试正常情况。

```typescript
// ✅ 推荐：测试边界条件
test('should handle empty input', () => {
  expect(processData([])).toEqual([]);
});

test('should handle null input', () => {
  expect(processData(null)).toEqual([]);
});

test('should handle large input', () => {
  const largeData = Array(10000).fill({ id: 1 });
  expect(processData(largeData)).toBeDefined();
});

// ❌ 不推荐：只测试正常情况
test('should process data', () => {
  expect(processData([{ id: 1 }])).toBeDefined();
});
```

**原因：** 边界条件是 bug 的常见来源。

---

### 4. 避免测试实现细节

测试行为而不是实现。

```typescript
// ✅ 推荐：测试行为
test('should display user name', () => {
  render(<UserCard user={user} />);
  expect(screen.getByText(user.name)).toBeInTheDocument();
});

// ❌ 不推荐：测试实现细节
test('should call getUserName method', () => {
  const spy = jest.spyOn(component, 'getUserName');
  component.render();
  expect(spy).toHaveBeenCalled();
});
```

**原因：** 测试实现细节会导致重构时测试失败，即使行为没有改变。

---

### 5. 保持测试独立

每个测试应该独立运行。

```typescript
// ✅ 推荐：独立的测试
test('should add item', () => {
  const list = [];
  addItem(list, 'item1');
  expect(list).toEqual(['item1']);
});

test('should remove item', () => {
  const list = ['item1'];
  removeItem(list, 'item1');
  expect(list).toEqual([]);
});

// ❌ 不推荐：依赖其他测试
let sharedList = [];

test('should add item', () => {
  addItem(sharedList, 'item1');
  expect(sharedList).toEqual(['item1']);
});

test('should remove item', () => {
  // 依赖上一个测试
  removeItem(sharedList, 'item1');
  expect(sharedList).toEqual([]);
});
```

**原因：** 独立的测试可以并行运行，且不会相互影响。

---

## 代码组织最佳实践

### 1. 按功能组织文件

而不是按类型。

```
// ✅ 推荐：按功能组织
src/
├── modules/
│   ├── promptlab/
│   │   ├── index.ts
│   │   ├── panel.ts
│   │   ├── service.ts
│   │   └── types.ts
│   ├── ai-analysis/
│   │   ├── index.ts
│   │   ├── panel.ts
│   │   └── service.ts
│   └── scraper/
│       ├── index.ts
│       ├── panel.ts
│       └── service.ts

// ❌ 不推荐：按类型组织
src/
├── components/
│   ├── PromptlabPanel.ts
│   ├── AIAnalysisPanel.ts
│   └── ScraperPanel.ts
├── services/
│   ├── PromptlabService.ts
│   ├── AIAnalysisService.ts
│   └── ScraperService.ts
└── types/
    ├── promptlab.ts
    ├── ai-analysis.ts
    └── scraper.ts
```

**原因：** 按功能组织让相关代码聚集在一起，易于维护。

---
### 2. 使用一致的命名规范

遵循统一的命名约定。

```typescript
// ✅ 推荐：一致的命名
// 类名：PascalCase
class UserManager {}

// 函数名：camelCase
function getUserName() {}

// 常量：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// 私有属性：前缀 _
class Service {
  private _cache = new Map();
}

// ❌ 不推荐：不一致的命名
class user_manager {}  // 应该用 PascalCase
function GetUserName() {}  // 应该用 camelCase
const maxRetryCount = 3;  // 常量应该用 UPPER_SNAKE_CASE
```

**原因：** 一致的命名让代码更易读，降低理解成本。

---

### 3. 保持函数简短

每个函数只做一件事。

```typescript
// ✅ 推荐：简短的函数
function validateUser(user) {
  if (!user.name) {
    throw new Error('用户名不能为空');
  }
  if (!user.email) {
    throw new Error('邮箱不能为空');
  }
}

function saveUser(user) {
  validateUser(user);
  return database.save(user);
}

// ❌ 不推荐：过长的函数
function saveUser(user) {
  // 验证
  if (!user.name) {
    throw new Error('用户名不能为空');
  }
  if (!user.email) {
    throw new Error('邮箱不能为空');
  }
  
  // 保存
  const result = database.save(user);
  
  // 发送邮件
  sendEmail(user.email, 'Welcome');
  
  // 记录日志
  logger.log('User saved', user.id);
  
  // 更新缓存
  cache.set(user.id, user);
  
  return result;
}
```

**原因：** 简短的函数易于理解、测试和维护。

---

### 4. 避免深层嵌套

使用早返回减少嵌套。

```typescript
// ✅ 推荐：早返回
function processData(data) {
  if (!data) {
    return null;
  }
  
  if (!data.isValid) {
    return null;
  }
  
  if (!data.hasPermission) {
    return null;
  }
  
  return transform(data);
}

// ❌ 不推荐：深层嵌套
function processData(data) {
  if (data) {
    if (data.isValid) {
      if (data.hasPermission) {
        return transform(data);
      }
    }
  }
  return null;
}
```

**原因：** 早返回让代码更易读，减少认知负担。

---

### 5. 使用有意义的变量名

变量名应该描述其用途。

```typescript
// ✅ 推荐：有意义的变量名
const maxRetryCount = 3;
const userEmail = 'user@example.com';
const isAuthenticated = true;

// ❌ 不推荐：无意义的变量名
const x = 3;
const temp = 'user@example.com';
const flag = true;
```

**原因：** 有意义的变量名让代码自解释，减少注释需求。

---

### 6. 添加必要的注释

解释为什么而不是做什么。

```typescript
// ✅ 推荐：解释为什么
// 使用指数退避避免服务器过载
const delay = Math.pow(2, retryCount) * 100;

// ❌ 不推荐：解释做什么
// 计算延迟
const delay = Math.pow(2, retryCount) * 100;

// ❌ 不推荐：过度注释
// 创建一个变量 x 并赋值为 10
const x = 10;
```

**原因：** 好的代码应该自解释，注释应该解释不明显的决策。

---

## 常见反模式

### 1. 过度使用 any 类型

```typescript
// ❌ 反模式：过度使用 any
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

// ✅ 正确做法：使用具体类型
interface DataItem {
  value: string;
}

function processData(data: DataItem[]): string[] {
  return data.map(item => item.value);
}
```

**问题：** `any` 类型绕过了 TypeScript 的类型检查，失去了类型安全的优势。

---

### 2. 直接修改参数

```typescript
// ❌ 反模式：直接修改参数
function addItem(list, item) {
  list.push(item);
  return list;
}

// ✅ 正确做法：返回新数组
function addItem(list, item) {
  return [...list, item];
}
```

**问题：** 直接修改参数会导致副作用，难以追踪和调试。

---

### 3. 过度嵌套的回调

```typescript
// ❌ 反模式：回调地狱
fetchUser(userId, (user) => {
  fetchPosts(user.id, (posts) => {
    fetchComments(posts[0].id, (comments) => {
      render(comments);
    });
  });
});

// ✅ 正确做法：使用 async/await
async function loadData(userId) {
  const user = await fetchUser(userId);
  const posts = await fetchPosts(user.id);
  const comments = await fetchComments(posts[0].id);
  render(comments);
}
```

**问题：** 回调地狱难以阅读和维护。

---

### 4. 全局状态污染

```typescript
// ❌ 反模式：全局状态
window.userData = { name: 'John' };
window.appConfig = { theme: 'dark' };

// ✅ 正确做法：使用 StateManager
stateManager.setUserData({ name: 'John' });
stateManager.setAppConfig({ theme: 'dark' });
```

**问题：** 全局状态难以追踪和管理，容易产生冲突。

---

### 5. 忽略错误

```typescript
// ❌ 反模式：忽略错误
try {
  await riskyOperation();
} catch (error) {
  // 什么都不做
}

// ✅ 正确做法：处理错误
try {
  await riskyOperation();
} catch (error) {
  console.error('操作失败:', error);
  showNotification('操作失败，请稍后重试');
}
```

**问题：** 忽略错误会隐藏问题，导致难以调试。

---

### 6. 过早优化

```typescript
// ❌ 反模式：过早优化
function processItems(items) {
  // 复杂的优化逻辑
  const cache = new WeakMap();
  const pool = new ObjectPool();
  // ... 100 行优化代码
  
  return items.map(item => transform(item));
}

// ✅ 正确做法：先保证正确性
function processItems(items) {
  return items.map(item => transform(item));
}

// 如果性能测试发现瓶颈，再优化
```

**问题：** 过早优化增加复杂度，且可能优化了不是瓶颈的地方。

---

### 7. 魔法数字

```typescript
// ❌ 反模式：魔法数字
if (user.age > 18) {
  // ...
}

setTimeout(callback, 5000);

// ✅ 正确做法：使用常量
const ADULT_AGE = 18;
const RETRY_DELAY = 5000;

if (user.age > ADULT_AGE) {
  // ...
}

setTimeout(callback, RETRY_DELAY);
```

**问题：** 魔法数字的含义不明确，难以维护。

---

### 8. 过度抽象

```typescript
// ❌ 反模式：过度抽象
class AbstractFactoryProviderManager {
  createAbstractFactory() {
    return new ConcreteFactoryImplementation();
  }
}

// ✅ 正确做法：简单直接
class UserFactory {
  createUser(data) {
    return new User(data);
  }
}
```

**问题：** 过度抽象增加复杂度，降低可读性。

---

## 总结

遵循这些最佳实践可以帮助你：

1. **提升代码质量** - 更安全、更可靠、更易维护
2. **提高开发效率** - 减少 bug，加快开发速度
3. **改善用户体验** - 更快的加载速度，更好的错误处理
4. **降低维护成本** - 清晰的代码结构，易于理解和修改

### 核心要点

- **安全第一** - 永远不要信任用户输入
- **类型安全** - 充分利用 TypeScript
- **性能优先** - 避免不必要的操作
- **可维护性** - 代码清晰、模块化
- **一致性** - 遵循统一的规范

### 持续改进

- 定期代码审查
- 运行自动化测试
- 监控性能指标
- 收集用户反馈
- 学习新的最佳实践

---

## 相关文档

- [SafeModuleLoader API 文档](./api/SafeModuleLoader.md)
- [AlpineRegistry API 文档](./api/AlpineRegistry.md)
- [SafeRenderer API 文档](./api/SafeRenderer.md)
- [StateManager API 文档](./api/StateManager.md)
- [迁移指南](./migration-guide.md)
- [系统稳定性优化 - 设计文档](../.kiro/specs/system-stability-optimization/design.md)
- [系统稳定性优化 - 需求文档](../.kiro/specs/system-stability-optimization/requirements.md)

---

## 更新日志

### v1.0.0 (2026-04-17)
- ✅ 初始版本
- ✅ SafeModuleLoader 最佳实践
- ✅ AlpineRegistry 最佳实践
- ✅ SafeRenderer 最佳实践
- ✅ StateManager 最佳实践
- ✅ 错误处理最佳实践
- ✅ 性能优化最佳实践
- ✅ 安全最佳实践
- ✅ 测试最佳实践
- ✅ 代码组织最佳实践
- ✅ 常见反模式

---

## 许可证

MIT License
