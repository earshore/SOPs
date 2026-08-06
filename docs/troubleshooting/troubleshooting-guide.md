# 系统稳定性优化 - 故障排查指南

## 文档信息

**版本：** 1.0  
**最后更新：** 2025-01-XX  
**适用范围：** 所有使用新基础设施架构的开发者和运维人员

> 维护说明（2026-07-09）：本文中的 StateManager 排查内容保留为迁移上下文；当前状态管理问题优先参考 Zustand 迁移和状态同步文档。

---

## 概述

本指南帮助开发者快速诊断和解决使用新基础设施架构（SafeModuleLoader、AlpineRegistry、SafeRenderer、StateManager）时遇到的常见问题。

### 使用方法

1. **识别问题类型** - 根据错误现象找到对应章节
2. **查看症状描述** - 确认是否匹配你遇到的问题
3. **按步骤排查** - 按照诊断步骤逐一检查
4. **应用解决方案** - 根据诊断结果应用相应的解决方案
5. **验证修复** - 确认问题已解决

### 快速导航

- [SafeModuleLoader 问题](#safemoduleloader-问题)
- [AlpineRegistry 问题](#alpineregistry-问题)
- [SafeRenderer 问题](#saferenderer-问题)
- [StateManager 问题](#statemanager-问题)
- [性能问题](#性能问题)
- [构建和部署问题](#构建和部署问题)
- [浏览器兼容性问题](#浏览器兼容性问题)

---

## 目录

1. [SafeModuleLoader 问题](#safemoduleloader-问题)
2. [AlpineRegistry 问题](#alpineregistry-问题)
3. [SafeRenderer 问题](#saferenderer-问题)
4. [StateManager 问题](#statemanager-问题)
5. [性能问题](#性能问题)
6. [构建和部署问题](#构建和部署问题)
7. [浏览器兼容性问题](#浏览器兼容性问题)
8. [调试技巧](#调试技巧)
9. [常用工具](#常用工具)
10. [获取帮助](#获取帮助)

---

## SafeModuleLoader 问题

### 问题 1.1：模块加载失败，显示降级 UI

**症状：**
- 页面显示"模块加载失败"错误提示
- 控制台显示模块加载错误
- 用户无法使用该模块功能

**可能原因：**
1. 模块路径错误
2. 网络连接问题
3. 模块文件不存在
4. 模块代码有语法错误
5. 超时时间设置过短

**诊断步骤：**

```typescript
// 1. 检查模块路径
console.log('模块路径:', modulePath);
// 确认路径是否正确，是否包含正确的文件扩展名

// 2. 检查网络请求
// 打开浏览器开发者工具 -> Network 标签
// 查看模块请求的状态码和响应

// 3. 检查加载结果
const result = await safeModuleLoader.loadModule(container, modulePath);
console.log('加载结果:', result);
console.log('错误信息:', result.error);
console.log('重试次数:', result.retryAttempts);

// 4. 检查缓存状态
const stats = safeModuleLoader.getCacheStats();
console.log('缓存统计:', stats);
```

**解决方案：**

**方案 A：修正模块路径**
```typescript
// ❌ 错误的路径
await safeModuleLoader.loadModule(container, 'modules/promptlab');

// ✅ 正确的路径
await safeModuleLoader.loadModule(container, '/src/modules/promptlab/index.ts');
```

**方案 B：增加超时时间**
```typescript
// 对于大模块或慢网络，增加超时时间
await safeModuleLoader.loadModule(container, modulePath, {
  timeout: 10000,  // 10 秒
  retryCount: 5    // 增加重试次数
});
```

**方案 C：清除缓存后重试**
```typescript
// 清除特定模块缓存
safeModuleLoader.clearCache(modulePath);

// 重新加载
await safeModuleLoader.loadModule(container, modulePath);
```

**方案 D：检查模块代码**
```bash
# 检查模块文件是否存在
ls -la src/modules/promptlab/index.ts

# 检查 TypeScript 编译错误
npm run type-check

# 检查语法错误
npm run lint
```


---

### 问题 1.2：模块加载缓慢

**症状：**
- 模块加载时间超过 5 秒
- 用户体验差，等待时间长
- 加载指示器显示时间过长

**可能原因：**
1. 模块文件过大
2. 网络速度慢
3. 服务器响应慢
4. 未启用缓存
5. 未使用预加载

**诊断步骤：**

```typescript
// 1. 测量加载时间
const start = performance.now();
const result = await safeModuleLoader.loadModule(container, modulePath);
const duration = performance.now() - start;
console.log(`加载耗时: ${duration}ms`);

// 2. 检查模块大小
// 打开浏览器开发者工具 -> Network 标签
// 查看模块文件的大小

// 3. 检查是否使用缓存
const stats = safeModuleLoader.getCacheStats();
console.log('缓存的模块:', stats.moduleList);

// 4. 检查网络速度
// 使用浏览器开发者工具 -> Network 标签
// 查看 DOMContentLoaded 和 Load 时间
```

**解决方案：**

**方案 A：启用预加载**
```typescript
// 在应用启动时预加载常用模块
await safeModuleLoader.preloadModules([
  '/src/modules/promptlab/index.ts',
  '/src/modules/ai-analysis/index.ts',
  '/src/modules/scraper/index.ts'
]);

console.log('预加载完成');
```

**方案 B：代码分割**
```typescript
// 将大模块拆分为多个小模块
// 按需加载

// 主模块
await safeModuleLoader.loadModule(container, '/src/modules/promptlab/index.ts');

// 延迟加载辅助功能
setTimeout(async () => {
  await safeModuleLoader.loadModule(
    helperContainer,
    '/src/modules/promptlab/helpers.ts'
  );
}, 1000);
```

**方案 C：优化模块大小**
```bash
# 1. 移除未使用的依赖
npm prune

# 2. 使用 Tree Shaking
# 确保 vite.config.ts 中启用了 Tree Shaking

# 3. 压缩代码
npm run build

# 4. 分析打包大小
npm run build -- --analyze
```

**方案 D：使用 CDN**
```typescript
// 将静态资源托管到 CDN
// 修改 vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['alpinejs', 'zustand']
        }
      }
    }
  }
});
```

---

### 问题 1.3：模块重复加载

**症状：**
- 同一模块被加载多次
- 控制台显示重复的加载日志
- 性能下降，内存占用增加

**可能原因：**
1. 未使用缓存
2. 模块路径不一致（相对路径 vs 绝对路径）
3. 并发加载请求
4. 缓存被意外清除

**诊断步骤：**

```typescript
// 1. 检查缓存状态
const stats = safeModuleLoader.getCacheStats();
console.log('缓存统计:', stats);
console.log('已缓存的模块:', stats.moduleList);

// 2. 监控加载请求
const originalLoad = safeModuleLoader.loadModule;
safeModuleLoader.loadModule = async function(...args) {
  console.log('加载模块:', args[1]);
  return originalLoad.apply(this, args);
};

// 3. 检查模块路径一致性
console.log('路径 1:', '/src/modules/promptlab/index.ts');
console.log('路径 2:', './src/modules/promptlab/index.ts');
// 这两个路径会被视为不同的模块
```

**解决方案：**

**方案 A：统一模块路径**
```typescript
// ✅ 推荐：使用绝对路径
const MODULE_PATHS = {
  promptlab: '/src/modules/promptlab/index.ts',
  aiAnalysis: '/src/modules/ai-analysis/index.ts',
  scraper: '/src/modules/scraper/index.ts'
};

// 使用统一的路径
await safeModuleLoader.loadModule(container, MODULE_PATHS.promptlab);

// ❌ 不推荐：混用相对路径和绝对路径
await safeModuleLoader.loadModule(container, '/src/modules/promptlab/index.ts');
await safeModuleLoader.loadModule(container, './src/modules/promptlab/index.ts');
```

**方案 B：避免并发加载**
```typescript
// ❌ 不推荐：并发加载同一模块
Promise.all([
  safeModuleLoader.loadModule(container1, modulePath),
  safeModuleLoader.loadModule(container2, modulePath)
]);

// ✅ 推荐：先加载，再使用
await safeModuleLoader.loadModule(container1, modulePath);
// 第二次加载会使用缓存，瞬间完成
await safeModuleLoader.loadModule(container2, modulePath);
```

**方案 C：检查缓存清除逻辑**
```typescript
// 避免不必要的缓存清除
// ❌ 不推荐：频繁清除缓存
setInterval(() => {
  safeModuleLoader.clearCache();
}, 1000);

// ✅ 推荐：只在必要时清除
function logout() {
  safeModuleLoader.clearCache();
  // ... 其他登出逻辑
}
```

---

### 问题 1.4：降级 UI 显示不正确

**症状：**
- 降级 UI 样式错乱
- 降级 UI 缺少必要信息
- 降级 UI 按钮无法点击

**可能原因：**
1. CSS 样式未加载
2. 自定义降级模板有错误
3. 模板变量未正确替换
4. 容器元素被其他代码修改

**诊断步骤：**

```typescript
// 1. 检查降级 UI HTML
const result = await safeModuleLoader.loadModule(container, modulePath);
if (!result.success) {
  console.log('容器内容:', container.innerHTML);
}

// 2. 检查 CSS 加载
const styles = document.querySelectorAll('link[rel="stylesheet"]');
console.log('已加载的样式表:', styles);

// 3. 检查自定义模板
const result = await safeModuleLoader.loadModule(container, modulePath, {
  fallbackUI: `
    <div class="error">
      <p>错误: {{errorMessage}}</p>
      <p>模块: {{modulePath}}</p>
    </div>
  `
});
```

**解决方案：**

**方案 A：确保 CSS 已加载**
```html
<!-- 在 index.html 中确保样式表已加载 -->
<link rel="stylesheet" href="/src/styles/main.css">
<link rel="stylesheet" href="/src/styles/error.css">
```

**方案 B：使用正确的模板变量**
```typescript
// 可用的模板变量
const availableVariables = {
  errorMessage: '错误消息',
  errorCode: '错误码',
  modulePath: '模块路径',
  errorCategory: '错误类别'
};

// 自定义降级 UI
await safeModuleLoader.loadModule(container, modulePath, {
  fallbackUI: `
    <div class="custom-error">
      <h3>{{errorMessage}}</h3>
      <p>模块: {{modulePath}}</p>
      <p>类别: {{errorCategory}}</p>
      <button onclick="location.reload()">刷新页面</button>
    </div>
  `
});
```

**方案 C：添加内联样式**
```typescript
await safeModuleLoader.loadModule(container, modulePath, {
  fallbackUI: `
    <div style="padding: 20px; border: 1px solid #f00; background: #fee;">
      <h3 style="color: #c00;">{{errorMessage}}</h3>
      <button style="padding: 10px 20px; cursor: pointer;" 
              onclick="location.reload()">
        刷新页面
      </button>
    </div>
  `
});
```

---

## AlpineRegistry 问题

### 问题 2.1：组件未注册到 Alpine

**症状：**
- Alpine 组件不工作
- 控制台显示 "Alpine.data is not a function"
- x-data 属性无效

**可能原因：**
1. 忘记调用 `init()` 方法
2. Alpine.js 未加载
3. 组件名称拼写错误
4. 注册时机不对

**诊断步骤：**

```typescript
// 1. 检查 Alpine 是否已加载
console.log('Alpine:', window.Alpine);
console.log('Alpine.data:', typeof Alpine?.data);

// 2. 检查组件是否已注册
const registry = getAlpineRegistry();
console.log('已注册的组件:', registry.getRegisteredComponents());

// 3. 检查是否调用了 init()
// 查看控制台日志，应该有类似以下的输出：
// [AlpineRegistry] 开始初始化 AlpineRegistry...
// [AlpineRegistry] AlpineRegistry 初始化完成

// 4. 检查组件名称
console.log('HTML 中使用的名称:', document.querySelector('[x-data]')?.getAttribute('x-data'));
console.log('注册的名称:', registry.getRegisteredComponents());
```

**解决方案：**

**方案 A：确保调用 init()**
```typescript
// src/alpine-components.ts
import { getAlpineRegistry } from '@/common/infrastructure/AlpineRegistry';

const registry = getAlpineRegistry();

export function registerAlpineComponents() {
  // 注册组件
  registry.register('userPanel', () => ({ /* ... */ }));
  registry.register('dashboardPanel', () => ({ /* ... */ }));
  
  // ✅ 必须调用 init()
  registry.init();
}

// src/main.ts
import { registerAlpineComponents } from './alpine-components';

registerAlpineComponents();  // ✅ 必须调用
Alpine.start();
```

**方案 B：确保 Alpine 已加载**
```typescript
// 检查 Alpine 是否已加载
if (!window.Alpine) {
  console.error('Alpine.js 未加载');
  // 动态加载 Alpine
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js';
  script.defer = true;
  document.head.appendChild(script);
}
```

**方案 C：检查组件名称一致性**
```typescript
// ✅ 推荐：使用常量
const COMPONENT_NAMES = {
  USER_PANEL: 'userPanel',
  DASHBOARD: 'dashboardPanel'
};

// 注册时使用常量
registry.register(COMPONENT_NAMES.USER_PANEL, () => ({ /* ... */ }));

// HTML 中使用常量
<div x-data="userPanel()"></div>
```


---

### 问题 2.2：检测到循环依赖

**症状：**
- 控制台显示 "检测到循环依赖" 错误
- `init()` 方法抛出异常
- 组件无法注册

**可能原因：**
1. 组件 A 依赖组件 B，组件 B 又依赖组件 A
2. 依赖链形成闭环（A → B → C → A）
3. 组件依赖自己

**诊断步骤：**

```typescript
// 1. 查看错误消息
try {
  registry.init();
} catch (error) {
  console.error('初始化失败:', error.message);
  // 输出: [AlpineRegistry] 检测到循环依赖: componentA
}

// 2. 绘制依赖图
const components = registry.getRegisteredComponents();
components.forEach(name => {
  // 手动记录每个组件的依赖
  console.log(`${name} 依赖:`, /* 依赖列表 */);
});

// 3. 使用调试日志
const registry = getAlpineRegistry({
  logLevel: 'debug'
});
```

**解决方案：**

**方案 A：引入中间层**
```typescript
// ❌ 错误：循环依赖
registry.register('componentA', () => ({ /* ... */ }), ['componentB']);
registry.register('componentB', () => ({ /* ... */ }), ['componentA']);

// ✅ 正确：引入共享服务
registry.register('sharedService', () => ({
  // 共享逻辑
}));

registry.register('componentA', () => ({ /* ... */ }), ['sharedService']);
registry.register('componentB', () => ({ /* ... */ }), ['sharedService']);
```

**方案 B：重新设计依赖关系**
```typescript
// ❌ 错误：A → B → C → A
registry.register('componentA', () => ({ /* ... */ }), ['componentC']);
registry.register('componentB', () => ({ /* ... */ }), ['componentA']);
registry.register('componentC', () => ({ /* ... */ }), ['componentB']);

// ✅ 正确：单向依赖
registry.register('baseComponent', () => ({ /* 基础功能 */ }));
registry.register('componentA', () => ({ /* ... */ }), ['baseComponent']);
registry.register('componentB', () => ({ /* ... */ }), ['baseComponent']);
registry.register('componentC', () => ({ /* ... */ }), ['baseComponent']);
```

**方案 C：使用事件总线**
```typescript
// 使用事件总线解耦组件
registry.register('eventBus', () => ({
  listeners: {},
  
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },
  
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}));

// 组件 A 发送事件
registry.register('componentA', () => ({
  init() {
    Alpine.store('eventBus').emit('dataChanged', { /* ... */ });
  }
}), ['eventBus']);

// 组件 B 监听事件
registry.register('componentB', () => ({
  init() {
    Alpine.store('eventBus').on('dataChanged', (data) => {
      // 处理数据
    });
  }
}), ['eventBus']);
```

---

### 问题 2.3：组件依赖未满足

**症状：**
- 组件初始化时报错
- 控制台显示 "Cannot read property of undefined"
- 依赖的服务或组件不可用

**可能原因：**
1. 依赖的组件未注册
2. 依赖声明不完整
3. 组件注册顺序错误
4. 依赖的组件名称拼写错误

**诊断步骤：**

```typescript
// 1. 检查所有已注册的组件
const registry = getAlpineRegistry();
const registered = registry.getRegisteredComponents();
console.log('已注册的组件:', registered);

// 2. 检查组件是否已注册
if (!registry.isComponentRegistered('authService')) {
  console.error('authService 未注册');
}

// 3. 启用详细日志
const registry = getAlpineRegistry({
  logLevel: 'debug'
});

// 查看依赖解析日志
registry.init();
```

**解决方案：**

**方案 A：补充缺失的依赖声明**
```typescript
// ❌ 错误：未声明依赖
registry.register('userPanel', () => ({
  init() {
    // 使用 authService，但未声明依赖
    const auth = Alpine.store('authService');
  }
}));

// ✅ 正确：声明依赖
registry.register('userPanel', () => ({
  init() {
    const auth = Alpine.store('authService');
  }
}), ['authService']);  // 声明依赖
```

**方案 B：确保依赖的组件已注册**
```typescript
// 确保依赖的组件先注册
registry.register('authService', () => ({
  isAuthenticated: false,
  login() { /* ... */ }
}));

// 然后注册依赖它的组件
registry.register('userPanel', () => ({
  init() {
    const auth = Alpine.store('authService');
  }
}), ['authService']);

// 初始化（自动按依赖顺序注册）
registry.init();
```

**方案 C：使用可选依赖**
```typescript
// 检查依赖是否存在
registry.register('component', () => ({
  init() {
    const optionalService = Alpine.store('optionalService');
    
    if (optionalService) {
      // 使用可选服务
      optionalService.doSomething();
    } else {
      // 降级逻辑
      console.warn('optionalService 不可用，使用降级方案');
    }
  }
}));
```

---

## SafeRenderer 问题

### 问题 3.1：内容未正确转义，存在 XSS 风险

**症状：**
- 用户输入的 `<script>` 标签被执行
- 恶意代码被注入到页面
- 安全扫描工具报告 XSS 漏洞

**可能原因：**
1. 使用了 `renderTemplate()` 渲染用户输入
2. 设置了 `sanitize: false`
3. 白名单配置过于宽松
4. 直接使用 `innerHTML` 而不是 SafeRenderer

**诊断步骤：**

```typescript
// 1. 测试 XSS 注入
const maliciousInput = '<script>alert("XSS")</script>';

// 使用 SafeRenderer 渲染
safeRenderer.renderDynamic(
  container,
  '<div>{{input}}</div>',
  { input: maliciousInput }
);

// 检查输出
console.log('容器内容:', container.innerHTML);
// 应该输出: <div>&lt;script&gt;alert("XSS")&lt;/script&gt;</div>

// 2. 扫描代码中的不安全用法
// 搜索 innerHTML 的使用
grep -r "innerHTML" src/

// 搜索 sanitize: false 的使用
grep -r "sanitize: false" src/

// 3. 运行安全审计
npm run security:audit
```

**解决方案：**

**方案 A：使用正确的渲染方法**
```typescript
// ❌ 错误：使用 renderTemplate 渲染用户输入
safeRenderer.renderTemplate(container, userInput);  // XSS 风险

// ✅ 正确：使用 renderDynamic
safeRenderer.renderDynamic(
  container,
  '<div>{{input}}</div>',
  { input: userInput }
);
```

**方案 B：移除 sanitize: false**
```typescript
// ❌ 错误：禁用转义
safeRenderer.renderDynamic(
  container,
  template,
  data,
  { sanitize: false }  // 危险
);

// ✅ 正确：使用默认转义
safeRenderer.renderDynamic(container, template, data);

// 或使用白名单
safeRenderer.renderDynamic(
  container,
  template,
  data,
  {
    allowedTags: ['p', 'strong', 'em'],
    allowedAttrs: ['class']
  }
);
```

**方案 C：配置严格的白名单**
```typescript
// ✅ 推荐：严格的白名单
const SAFE_TAGS = ['p', 'br', 'strong', 'em', 'u'];
const SAFE_ATTRS = ['class'];

safeRenderer.renderDynamic(
  container,
  template,
  data,
  {
    allowedTags: SAFE_TAGS,
    allowedAttrs: SAFE_ATTRS
  }
);
```

**方案 D：替换所有 innerHTML**
```typescript
// ❌ 错误：直接使用 innerHTML
container.innerHTML = userInput;

// ✅ 正确：使用 SafeRenderer
safeRenderer.renderDynamic(
  container,
  '{{content}}',
  { content: userInput }
);
```

---

### 问题 3.2：列表渲染性能差

**症状：**
- 渲染大列表时页面卡顿
- 浏览器无响应
- 渲染时间超过 1 秒

**可能原因：**
1. 未使用 `renderList()` 方法
2. 列表项过多（> 1000 项）
3. 渲染函数过于复杂
4. 频繁重新渲染整个列表

**诊断步骤：**

```typescript
// 1. 测量渲染时间
const start = performance.now();

safeRenderer.renderList(
  container,
  items,
  (item) => `<div>${item.name}</div>`
);

const duration = performance.now() - start;
console.log(`渲染耗时: ${duration}ms`);

// 2. 检查列表大小
console.log('列表项数量:', items.length);

// 3. 分析渲染函数复杂度
const renderItem = (item) => {
  // 复杂的渲染逻辑
  return `<div>...</div>`;
};

// 4. 使用 Performance API
performance.mark('render-start');
safeRenderer.renderList(container, items, renderItem);
performance.mark('render-end');
performance.measure('render', 'render-start', 'render-end');
console.log(performance.getEntriesByName('render'));
```

**解决方案：**

**方案 A：使用 renderList()**
```typescript
// ❌ 错误：循环使用 innerHTML
items.forEach(item => {
  container.innerHTML += `<div>${item.name}</div>`;  // 多次重排
});

// ✅ 正确：使用 renderList
safeRenderer.renderList(
  container,
  items,
  (item) => `<div>${item.name}</div>`
);
```

**方案 B：实现虚拟滚动**
```typescript
// 只渲染可见的项
const ITEM_HEIGHT = 50;
const VISIBLE_COUNT = 20;

function renderVisibleItems(scrollTop) {
  const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  const endIndex = startIndex + VISIBLE_COUNT;
  const visibleItems = items.slice(startIndex, endIndex);
  
  safeRenderer.renderList(
    container,
    visibleItems,
    (item) => `<div style="height: ${ITEM_HEIGHT}px">${item.name}</div>`
  );
}

// 监听滚动事件
container.addEventListener('scroll', (e) => {
  renderVisibleItems(e.target.scrollTop);
});
```

**方案 C：简化渲染函数**
```typescript
// ❌ 错误：复杂的渲染函数
const renderItem = (item) => {
  // 大量计算
  const computed = expensiveCalculation(item);
  
  return `
    <div class="item">
      <h3>${item.title}</h3>
      <p>${computed.description}</p>
      <span>${computed.date}</span>
      <!-- 更多内容 -->
    </div>
  `;
};

// ✅ 正确：预计算数据
const processedItems = items.map(item => ({
  ...item,
  computed: expensiveCalculation(item)
}));

const renderItem = (item) => `
  <div class="item">
    <h3>${item.title}</h3>
    <p>${item.computed.description}</p>
  </div>
`;

safeRenderer.renderList(container, processedItems, renderItem);
```

**方案 D：分批渲染**
```typescript
// 分批渲染大列表
async function renderLargeList(items) {
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    safeRenderer.renderList(
      container,
      batch,
      (item) => `<div>${item.name}</div>`,
      { containerTag: 'div' }
    );
    
    // 让浏览器有时间响应
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```


---

### 问题 3.3：模板插值不工作

**症状：**
- `{{key}}` 没有被替换
- 页面显示原始的 `{{key}}` 文本
- 数据未正确渲染

**可能原因：**
1. 数据对象中缺少对应的键
2. 键名拼写错误
3. 使用了 `renderTemplate()` 而不是 `renderDynamic()`
4. 数据值为 `undefined` 或 `null`

**诊断步骤：**

```typescript
// 1. 检查数据对象
const data = { name: 'John', age: 30 };
console.log('数据对象:', data);
console.log('name 值:', data.name);
console.log('email 值:', data.email);  // undefined

// 2. 检查模板
const template = '<div>{{name}} - {{email}}</div>';
console.log('模板:', template);

// 3. 检查渲染结果
safeRenderer.renderDynamic(container, template, data);
console.log('渲染结果:', container.innerHTML);

// 4. 测试简单示例
safeRenderer.renderDynamic(
  container,
  '<div>{{test}}</div>',
  { test: 'Hello' }
);
```

**解决方案：**

**方案 A：确保数据完整**
```typescript
// ❌ 错误：数据不完整
const data = { name: 'John' };
safeRenderer.renderDynamic(
  container,
  '<div>{{name}} - {{email}}</div>',
  data
);
// 输出: <div>John - </div>

// ✅ 正确：提供所有需要的数据
const data = {
  name: 'John',
  email: 'john@example.com'
};
safeRenderer.renderDynamic(
  container,
  '<div>{{name}} - {{email}}</div>',
  data
);
```

**方案 B：使用正确的渲染方法**
```typescript
// ❌ 错误：使用 renderTemplate
safeRenderer.renderTemplate(
  container,
  '<div>{{name}}</div>'  // 不会被替换
);

// ✅ 正确：使用 renderDynamic
safeRenderer.renderDynamic(
  container,
  '<div>{{name}}</div>',
  { name: 'John' }
);
```

**方案 C：处理 undefined 值**
```typescript
// 提供默认值
const data = {
  name: user.name || 'Unknown',
  email: user.email || 'No email',
  age: user.age ?? 0
};

safeRenderer.renderDynamic(container, template, data);
```

---

## StateManager 问题

### 问题 4.1：状态更新不生效

**症状：**
- 调用 `setState()` 后状态未更新
- UI 未响应状态变化
- 订阅回调未触发

**可能原因：**
1. 使用了错误的 setter 方法
2. 状态对象被直接修改
3. 订阅的 selector 不正确
4. StateManager 未正确初始化

**诊断步骤：**

```typescript
// 1. 检查状态值
console.log('当前状态:', stateManager.getAnalysisReport());

// 2. 尝试更新状态
stateManager.setAnalysisReport(newReport);

// 3. 再次检查状态
console.log('更新后状态:', stateManager.getAnalysisReport());

// 4. 检查 Zustand store
const store = useAppStore.getState();
console.log('Store 状态:', store.analysisReport);

// 5. 测试订阅
const unsubscribe = stateManager.subscribe(
  (state) => state.analysisReport,
  (report) => {
    console.log('状态变化:', report);
  }
);

// 更新状态
stateManager.setAnalysisReport(newReport);
```

**解决方案：**

**方案 A：使用正确的方法**
```typescript
// ❌ 错误：直接修改 state 对象
state.analysis.analysisReport = newReport;  // 不推荐

// ✅ 正确：使用 StateManager
stateManager.setAnalysisReport(newReport);
```

**方案 B：避免直接修改对象**
```typescript
// ❌ 错误：直接修改对象
const report = stateManager.getAnalysisReport();
report.status = 'completed';  // 不会触发更新

// ✅ 正确：创建新对象
const report = stateManager.getAnalysisReport();
const updatedReport = {
  ...report,
  status: 'completed'
};
stateManager.setAnalysisReport(updatedReport);
```

**方案 C：使用正确的 selector**
```typescript
// ❌ 错误：selector 返回整个 state
stateManager.subscribe(
  (state) => state,  // 任何变化都会触发
  (state) => {
    console.log('状态变化');
  }
);

// ✅ 正确：精确的 selector
stateManager.subscribe(
  (state) => state.analysisReport,  // 只在 analysisReport 变化时触发
  (report) => {
    console.log('报告变化:', report);
  }
);
```

---

### 问题 4.2：状态持久化失败

**症状：**
- 刷新页面后状态丢失
- localStorage 中没有保存状态
- 状态恢复失败

**可能原因：**
1. 未启用持久化中间件
2. localStorage 配额已满
3. 浏览器隐私模式
4. 状态对象无法序列化

**诊断步骤：**

```typescript
// 1. 检查 localStorage
console.log('localStorage 内容:', localStorage.getItem('app-state'));

// 2. 检查配额
try {
  const test = 'x'.repeat(10 * 1024 * 1024);  // 10MB
  localStorage.setItem('test', test);
  localStorage.removeItem('test');
  console.log('localStorage 可用');
} catch (error) {
  console.error('localStorage 配额已满:', error);
}

// 3. 检查状态是否可序列化
const state = stateManager.getSnapshot();
try {
  const serialized = JSON.stringify(state);
  console.log('状态可序列化');
} catch (error) {
  console.error('状态无法序列化:', error);
}

// 4. 检查浏览器设置
console.log('是否支持 localStorage:', typeof Storage !== 'undefined');
```

**解决方案：**

**方案 A：启用持久化中间件**
```typescript
// 确保启用了持久化中间件
const manager = StateManager.getInstance({
  persist: true,
  persistKey: 'app-state'
});
```

**方案 B：清理 localStorage**
```typescript
// 清理旧数据
function cleanupLocalStorage() {
  const keys = Object.keys(localStorage);
  
  keys.forEach(key => {
    if (key.startsWith('old-') || key.includes('temp-')) {
      localStorage.removeItem(key);
    }
  });
}

cleanupLocalStorage();
```

**方案 C：处理序列化错误**
```typescript
// 移除不可序列化的属性
const state = stateManager.getSnapshot();

// 移除函数、Symbol 等
const serializable = JSON.parse(JSON.stringify(state));

// 保存
localStorage.setItem('app-state', JSON.stringify(serializable));
```

**方案 D：使用压缩**
```typescript
// 压缩状态数据
import pako from 'pako';

function saveState(state) {
  const json = JSON.stringify(state);
  const compressed = pako.deflate(json, { to: 'string' });
  localStorage.setItem('app-state', compressed);
}

function loadState() {
  const compressed = localStorage.getItem('app-state');
  if (!compressed) return null;
  
  const json = pako.inflate(compressed, { to: 'string' });
  return JSON.parse(json);
}
```

---

### 问题 4.3：状态订阅内存泄漏

**症状：**
- 内存占用持续增长
- 页面变慢
- 浏览器崩溃

**可能原因：**
1. 忘记取消订阅
2. 组件卸载时未清理
3. 订阅回调中创建了新的订阅
4. 循环引用

**诊断步骤：**

```typescript
// 1. 检查内存占用
// 打开浏览器开发者工具 -> Memory 标签
// 拍摄堆快照，查看内存占用

// 2. 检查订阅数量
// 在 StateManager 中添加调试代码
console.log('当前订阅数量:', /* 订阅数量 */);

// 3. 模拟组件挂载/卸载
for (let i = 0; i < 100; i++) {
  // 挂载组件
  const unsubscribe = stateManager.subscribe(selector, callback);
  
  // 卸载组件（应该取消订阅）
  // unsubscribe();  // 如果忘记调用，会导致内存泄漏
}

// 4. 使用 Performance Monitor
// Chrome DevTools -> More tools -> Performance monitor
// 观察 JS heap size
```

**解决方案：**

**方案 A：及时取消订阅**
```typescript
// ✅ 推荐：保存 unsubscribe 函数
const unsubscribe = stateManager.subscribe(selector, callback);

// 组件卸载时取消订阅
onUnmounted(() => {
  unsubscribe();
});

// 或在 Alpine 组件中
Alpine.data('component', () => ({
  unsubscribe: null,
  
  init() {
    this.unsubscribe = stateManager.subscribe(selector, callback);
  },
  
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}));
```

**方案 B：使用 WeakMap**
```typescript
// 使用 WeakMap 避免循环引用
const subscriptions = new WeakMap();

function subscribe(component, selector, callback) {
  const unsubscribe = stateManager.subscribe(selector, callback);
  subscriptions.set(component, unsubscribe);
  return unsubscribe;
}

function unsubscribe(component) {
  const unsub = subscriptions.get(component);
  if (unsub) {
    unsub();
    subscriptions.delete(component);
  }
}
```

**方案 C：自动清理**
```typescript
// 创建自动清理的订阅管理器
class SubscriptionManager {
  private subscriptions: (() => void)[] = [];
  
  subscribe(selector, callback) {
    const unsubscribe = stateManager.subscribe(selector, callback);
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }
  
  unsubscribeAll() {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
  }
}

// 使用
const manager = new SubscriptionManager();

// 订阅
manager.subscribe(selector1, callback1);
manager.subscribe(selector2, callback2);

// 组件卸载时一次性清理
onUnmounted(() => {
  manager.unsubscribeAll();
});
```

---

## 性能问题

### 问题 5.1：首屏加载时间过长

**症状：**
- 首屏加载时间 > 3 秒
- Lighthouse 性能评分 < 90
- LCP (Largest Contentful Paint) > 2.5s

**可能原因：**
1. 未使用代码分割
2. 未启用缓存
3. 未压缩资源
4. 同步加载大量模块
5. 未使用 CDN

**诊断步骤：**

```bash
# 1. 运行 Lighthouse 测试
npm run lighthouse

# 2. 分析打包大小
npm run build -- --analyze

# 3. 检查网络请求
# 打开浏览器开发者工具 -> Network 标签
# 查看资源加载时间和大小

# 4. 使用 Performance API
performance.mark('app-start');
// 应用启动代码
performance.mark('app-ready');
performance.measure('startup', 'app-start', 'app-ready');
console.log(performance.getEntriesByName('startup'));
```

**解决方案：**

**方案 A：启用代码分割**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['alpinejs', 'zustand'],
          utils: ['./src/utils/index.ts']
        }
      }
    }
  }
});
```

**方案 B：预加载关键资源**
```html
<!-- index.html -->
<link rel="preload" href="/src/main.ts" as="script">
<link rel="preload" href="/src/styles/main.css" as="style">
```

**方案 C：延迟加载非关键模块**
```typescript
// 立即加载关键模块
await safeModuleLoader.loadModule(container, '/src/modules/core/index.ts');

// 延迟加载非关键模块
setTimeout(async () => {
  await safeModuleLoader.loadModule(
    helperContainer,
    '/src/modules/helpers/index.ts'
  );
}, 2000);
```

**方案 D：启用压缩**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 移除 console
        drop_debugger: true  // 移除 debugger
      }
    }
  }
});
```

---

### 问题 5.2：内存占用过高

**症状：**
- 内存占用 > 200MB
- 页面变慢
- 浏览器提示内存不足

**可能原因：**
1. 缓存过多模块
2. 状态快照过多
3. 订阅未取消
4. 大量 DOM 元素
5. 内存泄漏

**诊断步骤：**

```typescript
// 1. 检查缓存大小
const stats = safeModuleLoader.getCacheStats();
console.log('缓存的模块数量:', stats.cachedModules);

// 2. 检查状态快照
const snapshots = stateManager.getSnapshotList();
console.log('快照数量:', snapshots.length);

// 3. 检查 DOM 元素数量
console.log('DOM 元素数量:', document.querySelectorAll('*').length);

// 4. 使用 Performance Monitor
// Chrome DevTools -> More tools -> Performance monitor
// 观察 JS heap size 和 DOM Nodes

// 5. 拍摄堆快照
// Chrome DevTools -> Memory -> Take heap snapshot
// 分析内存占用
```

**解决方案：**

**方案 A：定期清理缓存**
```typescript
// 定期清理模块缓存
setInterval(() => {
  const stats = safeModuleLoader.getCacheStats();
  
  if (stats.cachedModules > 50) {
    console.log('清理模块缓存');
    safeModuleLoader.clearCache();
  }
}, 5 * 60 * 1000);  // 每 5 分钟检查一次
```

**方案 B：限制快照数量**
```typescript
// 限制状态快照数量
const MAX_SNAPSHOTS = 50;

setInterval(() => {
  const snapshots = stateManager.getSnapshotList();
  
  if (snapshots.length > MAX_SNAPSHOTS) {
    console.log('清理旧快照');
    stateManager.clearSnapshotHistory();
  }
}, 10 * 60 * 1000);  // 每 10 分钟检查一次
```

**方案 C：使用虚拟滚动**
```typescript
// 减少 DOM 元素数量
// 使用虚拟滚动只渲染可见元素
```

**方案 D：及时清理资源**
```typescript
// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  safeModuleLoader.clearCache();
  stateManager.clear();
});
```


---

## 构建和部署问题

### 问题 6.1：TypeScript 编译错误

**症状：**
- `npm run build` 失败
- 控制台显示类型错误
- 无法生成构建产物

**可能原因：**
1. 类型定义缺失
2. 类型不匹配
3. 使用了 `any` 类型
4. 导入路径错误

**诊断步骤：**

```bash
# 1. 运行类型检查
npm run type-check

# 2. 查看详细错误信息
npx tsc --noEmit --pretty

# 3. 检查 tsconfig.json 配置
cat tsconfig.json

# 4. 检查依赖的类型定义
npm list @types
```

**解决方案：**

**方案 A：安装缺失的类型定义**
```bash
# 安装 Alpine.js 类型定义
npm install --save-dev @types/alpinejs

# 安装其他类型定义
npm install --save-dev @types/node
```

**方案 B：修复类型错误**
```typescript
// ❌ 错误：类型不匹配
const result: string = 123;  // Type 'number' is not assignable to type 'string'

// ✅ 正确：类型匹配
const result: string = '123';

// 或使用类型转换
const result: string = String(123);
```

**方案 C：添加类型声明**
```typescript
// src/types/global.d.ts
declare global {
  interface Window {
    Alpine: any;
  }
}

export {};
```

---

### 问题 6.2：生产环境构建失败

**症状：**
- `npm run build` 在生产环境失败
- 开发环境正常，生产环境报错
- 构建产物不完整

**可能原因：**
1. 环境变量未设置
2. 生产环境配置错误
3. 依赖缺失
4. 内存不足

**诊断步骤：**

```bash
# 1. 检查环境变量
echo $NODE_ENV
echo $VITE_API_URL

# 2. 检查构建配置
cat vite.config.ts

# 3. 检查依赖
npm list --depth=0

# 4. 增加内存限制
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# 5. 查看详细错误
npm run build -- --debug
```

**解决方案：**

**方案 A：设置环境变量**
```bash
# .env.production
NODE_ENV=production
VITE_API_URL=https://api.example.com
```

**方案 B：修复构建配置**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,  // 生产环境禁用 sourcemap
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['alpinejs', 'zustand']
        }
      }
    }
  }
});
```

**方案 C：安装缺失的依赖**
```bash
# 安装所有依赖
npm install

# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

---

## 浏览器兼容性问题

### 问题 7.1：在旧版浏览器中不工作

**症状：**
- 在 Chrome/Edge 最新版正常
- 在旧版浏览器中报错
- 某些功能不可用

**可能原因：**
1. 使用了新的 JavaScript 特性
2. 未配置 polyfill
3. CSS 特性不支持
4. API 不兼容

**诊断步骤：**

```bash
# 1. 检查浏览器版本
# 在浏览器控制台运行
console.log(navigator.userAgent);

# 2. 检查 browserslist 配置
cat .browserslistrc

# 3. 检查 Babel 配置
cat babel.config.js

# 4. 使用 Can I Use 检查特性支持
# https://caniuse.com/
```

**解决方案：**

**方案 A：配置 browserslist**
```
# .browserslistrc
> 0.5%
last 2 versions
not dead
```

**方案 B：添加 polyfill**
```typescript
// main.ts
import 'core-js/stable';
import 'regenerator-runtime/runtime';
```

**方案 C：使用 PostCSS Autoprefixer**
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    autoprefixer: {}
  }
};
```

---

## 调试技巧

### 技巧 1：启用详细日志

```typescript
// 启用 SafeModuleLoader 详细日志
// 在加载选项中添加 onError 回调
await safeModuleLoader.loadModule(container, modulePath, {
  onError: (error) => {
    console.error('模块加载失败:', {
      path: modulePath,
      error: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
  }
});

// 启用 AlpineRegistry 详细日志
const registry = getAlpineRegistry({
  logLevel: 'debug'
});

// 启用 StateManager 日志中间件
const loggerMiddleware = (state, action, payload) => {
  console.log(`[StateManager] ${action}`, {
    payload,
    timestamp: Date.now()
  });
};

stateManager.use(loggerMiddleware);
```

### 技巧 2：使用断点调试

```typescript
// 在关键位置添加 debugger
async function loadModule() {
  debugger;  // 浏览器会在此处暂停
  
  const result = await safeModuleLoader.loadModule(container, modulePath);
  
  debugger;  // 检查加载结果
  
  return result;
}
```

### 技巧 3：使用 Performance API

```typescript
// 测量性能
performance.mark('operation-start');

// 执行操作
await performOperation();

performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');

// 查看结果
const measures = performance.getEntriesByName('operation');
console.log('操作耗时:', measures[0].duration, 'ms');
```

### 技巧 4：使用 Chrome DevTools

```
1. Elements 标签
   - 检查 DOM 结构
   - 查看元素样式
   - 编辑 HTML/CSS

2. Console 标签
   - 查看日志输出
   - 执行 JavaScript 代码
   - 查看错误堆栈

3. Sources 标签
   - 设置断点
   - 单步调试
   - 查看变量值

4. Network 标签
   - 查看网络请求
   - 检查响应内容
   - 分析加载时间

5. Performance 标签
   - 录制性能分析
   - 查看火焰图
   - 识别性能瓶颈

6. Memory 标签
   - 拍摄堆快照
   - 分析内存占用
   - 检测内存泄漏

7. Application 标签
   - 查看 localStorage
   - 查看 sessionStorage
   - 清除缓存
```

### 技巧 5：使用 Vue DevTools（如果使用 Vue）

```
1. 安装 Vue DevTools 浏览器扩展
2. 打开 DevTools -> Vue 标签
3. 查看组件树
4. 检查组件状态
5. 追踪事件
```

---

## 常用工具

### 工具 1：技术债务扫描

```bash
# 运行技术债务扫描
npm run tech-debt:scan

# 查看报告
open tech-debt-report.html
```

### 工具 2：代码质量检查

```bash
# 运行 ESLint
npm run lint

# 自动修复
npm run lint:fix

# 运行类型检查
npm run type-check
```

### 工具 3：性能测试

```bash
# 运行 Lighthouse
npm run lighthouse

# 查看报告
open .lighthouseci/lhr-*.html
```

### 工具 4：安全审计

```bash
# 运行安全审计
npm run security:audit

# 查看报告
open security-audit-report.html
```

### 工具 5：测试

```bash
# 运行所有测试
npm run test

# 运行单元测试
npm run test:unit

# 运行 E2E 测试
npm run test:e2e

# 运行覆盖率测试
npm run test:coverage
```

---

## 获取帮助

### 方式 1：查看文档

- [SafeModuleLoader API 文档](../api/SafeModuleLoader.md)
- [AlpineRegistry API 文档](../api/AlpineRegistry.md)
- [SafeRenderer API 文档](../api/SafeRenderer.md)
- [Zustand 迁移指南](../development/zustand-migration-guide.md)
- [状态同步最佳实践](../development/state-sync-best-practices.md)
- [系统稳定性最佳实践](../development/best-practices.md)

### 方式 2：查看示例代码

- 参考已迁移的模块（如 Promptlab）
- 查看测试代码（`tests/` 目录）
- 查看示例文件（`examples/` 目录）

### 方式 3：搜索已知问题

```bash
# 搜索相关问题
grep -r "error message" docs/
grep -r "error message" tests/
```

### 方式 4：提交 Issue

如果以上方法都无法解决问题，请提交 Issue：

1. 访问项目仓库
2. 点击 "Issues" 标签
3. 点击 "New Issue"
4. 填写问题描述：
   - 问题现象
   - 重现步骤
   - 期望行为
   - 实际行为
   - 环境信息（浏览器、操作系统、Node.js 版本）
   - 相关代码片段
   - 错误日志

### 方式 5：联系团队

- 在团队频道提问
- 发送邮件给技术支持
- 参加技术分享会

---

## 常见错误代码

### ERR_MODULE_LOAD_FAILED

**含义：** 模块加载失败

**可能原因：**
- 模块路径错误
- 模块文件不存在
- 网络连接问题

**解决方案：**
- 检查模块路径
- 确认文件存在
- 检查网络连接

---

### ERR_CIRCULAR_DEPENDENCY

**含义：** 检测到循环依赖

**可能原因：**
- 组件 A 依赖组件 B，组件 B 又依赖组件 A

**解决方案：**
- 引入中间层
- 重新设计依赖关系
- 使用事件总线

---

### ERR_XSS_DETECTED

**含义：** 检测到 XSS 攻击

**可能原因：**
- 用户输入包含恶意脚本
- 未正确转义 HTML

**解决方案：**
- 使用 `renderDynamic()` 渲染用户输入
- 配置严格的白名单
- 使用 `escapeHtml()` 手动转义

---

### ERR_STATE_UPDATE_FAILED

**含义：** 状态更新失败

**可能原因：**
- 使用了错误的 setter 方法
- 状态对象被直接修改

**解决方案：**
- 使用 StateManager 的方法
- 避免直接修改对象

---

## 预防措施

### 1. 代码审查

- 所有代码必须经过审查
- 检查是否遵循最佳实践
- 检查是否有安全隐患

### 2. 自动化测试

- 编写充分的单元测试
- 编写 E2E 测试覆盖核心流程
- 运行性能测试

### 3. 持续集成

- 配置 CI/CD 流程
- 自动运行测试
- 自动部署到测试环境

### 4. 监控告警

- 配置错误监控
- 配置性能监控
- 设置告警阈值

### 5. 定期维护

- 每周运行技术债务扫描
- 每月运行安全审计
- 每季度性能优化

---

## 总结

本故障排查指南涵盖了使用新基础设施架构时可能遇到的常见问题和解决方案。遵循以下原则可以减少问题发生：

1. **遵循最佳实践** - 参考最佳实践文档
2. **充分测试** - 编写和运行测试
3. **及时更新** - 保持依赖和文档更新
4. **主动监控** - 配置监控和告警
5. **持续学习** - 学习新的技术和方法

如果遇到本指南未涵盖的问题，请参考其他文档或联系团队获取帮助。

---

## 相关文档

- [SafeModuleLoader API 文档](../api/SafeModuleLoader.md)
- [AlpineRegistry API 文档](../api/AlpineRegistry.md)
- [SafeRenderer API 文档](../api/SafeRenderer.md)
- [Zustand 迁移指南](../development/zustand-migration-guide.md)
- [状态同步最佳实践](../development/state-sync-best-practices.md)
- [系统稳定性最佳实践](../development/best-practices.md)
- [系统稳定性优化 - 设计文档](../archive/kiro-2026-h1/specs/system-stability-optimization/design.md)
- [系统稳定性优化 - 需求文档](../archive/kiro-2026-h1/specs/system-stability-optimization/requirements.md)

---

## 更新日志

### v1.0.0 (2025-01-XX)
- ✅ 初始版本
- ✅ SafeModuleLoader 问题排查
- ✅ AlpineRegistry 问题排查
- ✅ SafeRenderer 问题排查
- ✅ StateManager 问题排查
- ✅ 性能问题排查
- ✅ 构建和部署问题排查
- ✅ 浏览器兼容性问题排查
- ✅ 调试技巧和常用工具
- ✅ 常见错误代码和预防措施

---

## 许可证

MIT License
