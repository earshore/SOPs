# SafeModuleLoader API 文档

## 概述

`SafeModuleLoader` 是历史名称。当前生产职责已收窄为安全模板加载，推荐新代码使用 `SafeTemplateLoader` / `safeTemplateLoader`。主路由模块加载链由 `ModuleLoader` 执行，`SafeModuleLoader.loadModule()` 不在主路由模块加载链上，仅作为兼容 API 保留。

本页保留历史 API 说明，阅读时请优先遵守上述职责边界。

## 特性

- ✅ **模板加载接口**：提供安全模板加载 API，模块加载 API 仅兼容旧调用
- ✅ **自动重试机制**：支持指数退避的智能重试策略
- ✅ **超时控制**：防止加载操作无限等待
- ✅ **错误分类**：自动识别网络、解析、渲染等不同类型的错误
- ✅ **降级 UI**：根据错误类型显示合适的降级界面
- ✅ **缓存管理**：自动缓存已加载的模块，提升性能
- ✅ **错误追踪**：自动上报错误到监控系统
- ✅ **预加载支持**：支持批量预加载模块

## 安装与导入

```typescript
// 导入单例实例（推荐）
import { safeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';

// 或导入类
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
const loader = SafeTemplateLoader.getInstance();
```

## 核心 API

### getInstance()

获取 `SafeModuleLoader` 的单例实例。

**签名：**
```typescript
static getInstance(): SafeModuleLoader
```

**返回值：**
- `SafeModuleLoader` - 单例实例

**示例：**
```typescript
const loader = SafeModuleLoader.getInstance();
```

---

### loadModule()

加载模块到指定容器。这是最常用的方法，用于动态加载和渲染模块。

**签名：**
```typescript
async loadModule(
  container: HTMLElement,
  modulePath: string,
  options?: ModuleLoadOptions
): Promise<ModuleLoadResult>
```

**参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `container` | `HTMLElement` | ✅ | - | 目标容器元素 |
| `modulePath` | `string` | ✅ | - | 模块路径（相对或绝对） |
| `options` | `ModuleLoadOptions` | ❌ | `{}` | 加载选项 |

**ModuleLoadOptions 接口：**

```typescript
interface ModuleLoadOptions {
  /** 重试次数，默认 3 */
  retryCount?: number;
  
  /** 超时时间（毫秒），默认 5000 */
  timeout?: number;
  
  /** 自定义降级 UI 模板 */
  fallbackUI?: string;
  
  /** 错误回调函数 */
  onError?: (error: Error) => void;
  
  /** 是否显示加载指示器，默认 true */
  showLoading?: boolean;
  
  /** 加载指示器文本，默认 "加载中..." */
  loadingText?: string;
}
```

**返回值：**

```typescript
interface ModuleLoadResult {
  /** 是否成功 */
  success: boolean;
  
  /** 错误信息（失败时） */
  error?: Error;
  
  /** 加载时间（毫秒） */
  loadTime?: number;
  
  /** 实际重试次数 */
  retryAttempts?: number;
  
  /** 模块数据（成功时） */
  data?: any;
}
```

**示例：**

```typescript
// 基础用法
const container = document.getElementById('app-container');
const result = await safeModuleLoader.loadModule(
  container,
  '/src/modules/promptlab/index.ts'
);

if (result.success) {
  console.log('模块加载成功', result.loadTime);
} else {
  console.error('模块加载失败', result.error);
}

// 自定义选项
const result = await safeModuleLoader.loadModule(
  container,
  '/src/modules/promptlab/index.ts',
  {
    retryCount: 5,
    timeout: 10000,
    showLoading: true,
    loadingText: '正在加载 Promptlab...',
    onError: (error) => {
      console.error('加载失败:', error);
      // 自定义错误处理
    }
  }
);

// 使用自定义降级 UI
const result = await safeModuleLoader.loadModule(
  container,
  '/src/modules/promptlab/index.ts',
  {
    fallbackUI: `
      <div class="error-container">
        <h3>{{errorMessage}}</h3>
        <p>错误码: {{errorCode}}</p>
        <button onclick="location.reload()">刷新页面</button>
      </div>
    `
  }
);
```

**错误处理：**

`loadModule` 不会抛出异常，而是返回包含错误信息的结果对象。所有错误都会被捕获并分类，然后显示相应的降级 UI。

---

### loadTemplate()

加载 HTML 模板文件。

**签名：**
```typescript
async loadTemplate(
  templatePath: string,
  options?: ModuleLoadOptions
): Promise<string>
```

**参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `templatePath` | `string` | ✅ | - | 模板路径 |
| `options` | `ModuleLoadOptions` | ❌ | `{}` | 加载选项 |

**返回值：**
- `Promise<string>` - 模板 HTML 内容

**抛出异常：**
- 加载失败时会抛出 `AppError`

**示例：**

```typescript
try {
  const template = await safeModuleLoader.loadTemplate(
    '/src/modules/promptlab/template.html'
  );
  
  // 使用模板
  container.innerHTML = template;
} catch (error) {
  console.error('模板加载失败:', error);
}

// 带选项
const template = await safeModuleLoader.loadTemplate(
  '/src/modules/promptlab/template.html',
  {
    retryCount: 3,
    timeout: 5000
  }
);
```

---

### clearCache()

清除模块缓存。

**签名：**
```typescript
clearCache(modulePath?: string): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `modulePath` | `string` | ❌ | 要清除的模块路径。不传则清除所有缓存 |

**示例：**

```typescript
// 清除特定模块缓存
safeModuleLoader.clearCache('/src/modules/promptlab/index.ts');

// 清除所有缓存
safeModuleLoader.clearCache();
```

---

### getCacheStats()

获取缓存统计信息。

**签名：**
```typescript
getCacheStats(): {
  cachedModules: number;
  loadingModules: number;
  moduleList: string[];
}
```

**返回值：**

```typescript
{
  /** 已缓存的模块数量 */
  cachedModules: number;
  
  /** 正在加载的模块数量 */
  loadingModules: number;
  
  /** 已缓存的模块路径列表 */
  moduleList: string[];
}
```

**示例：**

```typescript
const stats = safeModuleLoader.getCacheStats();
console.log(`已缓存 ${stats.cachedModules} 个模块`);
console.log('模块列表:', stats.moduleList);
```

---

### preloadModules()

预加载多个模块。

**签名：**
```typescript
async preloadModules(modulePaths: string[]): Promise<void>
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `modulePaths` | `string[]` | ✅ | 要预加载的模块路径数组 |

**示例：**

```typescript
// 应用启动时预加载常用模块
await safeModuleLoader.preloadModules([
  '/src/modules/promptlab/index.ts',
  '/src/modules/ai-analysis/index.ts',
  '/src/modules/scraper/index.ts'
]);

console.log('预加载完成');
```

---

## 类型定义

### ModuleErrorType

错误类型枚举。

```typescript
enum ModuleErrorType {
  /** 网络错误 */
  NETWORK = 'network',
  
  /** 解析错误 */
  PARSE = 'parse',
  
  /** 渲染错误 */
  RENDER = 'render',
  
  /** 超时错误 */
  TIMEOUT = 'timeout',
  
  /** 未知错误 */
  UNKNOWN = 'unknown'
}
```

---

## 错误处理机制

### 错误分类

`SafeModuleLoader` 会自动将错误分类为以下类型：

1. **网络错误 (NETWORK)**
   - 连接失败
   - DNS 解析失败
   - HTTP 错误（4xx、5xx）
   - CORS 错误
   - 离线状态

2. **解析错误 (PARSE)**
   - JavaScript 语法错误
   - JSON 解析错误
   - 模块解析失败
   - 导入错误

3. **渲染错误 (RENDER)**
   - DOM 操作失败
   - 元素不存在
   - 样式错误
   - 组件渲染失败

4. **超时错误 (TIMEOUT)**
   - 加载超时
   - 请求超时

5. **未知错误 (UNKNOWN)**
   - 无法分类的其他错误

### 重试策略

`SafeModuleLoader` 使用指数退避策略进行重试：

- **第 1 次重试**：等待 100ms（±20% 抖动）
- **第 2 次重试**：等待 200ms（±20% 抖动）
- **第 3 次重试**：等待 400ms（±20% 抖动）

**重试条件：**
- ✅ 网络错误 - 重试
- ✅ 超时错误 - 重试
- ✅ 系统错误 - 重试
- ❌ 解析错误 - 不重试（代码问题）

**示例：**

```typescript
// 自定义重试次数
const result = await safeModuleLoader.loadModule(
  container,
  modulePath,
  {
    retryCount: 5  // 最多重试 5 次
  }
);
```

### 降级 UI

加载失败时，`SafeModuleLoader` 会根据错误类型显示相应的降级 UI：

#### 网络错误 UI
- 图标：WiFi 信号图标（橙色）
- 标题：网络连接问题
- 操作：重试、返回首页

#### 解析错误 UI
- 图标：错误图标（红色）
- 标题：模块解析失败
- 操作：刷新页面、返回首页

#### 渲染错误 UI
- 图标：显示器图标（紫色）
- 标题：模块渲染失败
- 操作：刷新页面、返回首页

#### 超时错误 UI
- 图标：时钟图标（黄色）
- 标题：加载超时
- 操作：重试、返回首页

#### 自定义降级 UI

可以通过 `fallbackUI` 选项提供自定义降级模板：

```typescript
const result = await safeModuleLoader.loadModule(
  container,
  modulePath,
  {
    fallbackUI: `
      <div class="custom-error">
        <h2>{{errorMessage}}</h2>
        <p>错误码: {{errorCode}}</p>
        <p>模块: {{modulePath}}</p>
        <p>类别: {{errorCategory}}</p>
        <button onclick="location.reload()">刷新</button>
      </div>
    `
  }
);
```

**可用的模板变量：**
- `{{errorMessage}}` - 错误消息
- `{{errorCode}}` - 错误码
- `{{modulePath}}` - 模块路径
- `{{errorCategory}}` - 错误类别

---

## 缓存机制

### 自动缓存

`SafeModuleLoader` 会自动缓存已成功加载的模块：

```typescript
// 第一次加载 - 从网络加载
await safeModuleLoader.loadModule(container, modulePath);

// 第二次加载 - 从缓存加载（瞬间完成）
await safeModuleLoader.loadModule(container, modulePath);
```

### 缓存管理

```typescript
// 查看缓存统计
const stats = safeModuleLoader.getCacheStats();
console.log(`缓存了 ${stats.cachedModules} 个模块`);

// 清除特定模块缓存
safeModuleLoader.clearCache('/src/modules/promptlab/index.ts');

// 清除所有缓存
safeModuleLoader.clearCache();
```

### 预加载

在应用启动时预加载常用模块，提升用户体验：

```typescript
// 在 main.ts 中
await safeModuleLoader.preloadModules([
  '/src/modules/promptlab/index.ts',
  '/src/modules/ai-analysis/index.ts',
  '/src/modules/scraper/index.ts'
]);
```

---

## 最佳实践

### 1. 使用单例实例

始终使用导出的单例实例，而不是创建新实例：

```typescript
// ✅ 推荐
import { safeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';

// ❌ 不推荐
const loader = new SafeModuleLoader(); // 构造函数是私有的，无法这样做
```

### 2. 合理设置超时时间

根据模块大小和网络状况设置合适的超时时间：

```typescript
// 小模块 - 短超时
await safeModuleLoader.loadModule(container, smallModulePath, {
  timeout: 3000  // 3 秒
});

// 大模块 - 长超时
await safeModuleLoader.loadModule(container, largeModulePath, {
  timeout: 10000  // 10 秒
});
```

### 3. 提供错误回调

使用 `onError` 回调进行自定义错误处理：

```typescript
await safeModuleLoader.loadModule(container, modulePath, {
  onError: (error) => {
    // 记录到分析系统
    analytics.track('module_load_error', {
      module: modulePath,
      error: error.message
    });
    
    // 显示通知
    showNotification('模块加载失败，请稍后重试');
  }
});
```

### 4. 预加载关键模块

在应用启动时预加载用户可能访问的模块：

```typescript
// 在路由切换前预加载
router.beforeEach(async (to, from, next) => {
  if (to.name === 'promptlab') {
    await safeModuleLoader.preloadModules([
      '/src/modules/promptlab/index.ts'
    ]);
  }
  next();
});
```

### 5. 定期清理缓存

在适当的时机清理缓存，避免内存占用过高：

```typescript
// 用户登出时清理缓存
function logout() {
  safeModuleLoader.clearCache();
  // ... 其他登出逻辑
}

// 或定期清理
setInterval(() => {
  const stats = safeModuleLoader.getCacheStats();
  if (stats.cachedModules > 50) {
    safeModuleLoader.clearCache();
  }
}, 5 * 60 * 1000); // 每 5 分钟检查一次
```

### 6. 使用加载指示器

为长时间加载提供视觉反馈：

```typescript
await safeModuleLoader.loadModule(container, modulePath, {
  showLoading: true,
  loadingText: '正在加载 Promptlab 模块...'
});
```

### 7. 处理加载结果

始终检查加载结果：

```typescript
const result = await safeModuleLoader.loadModule(container, modulePath);

if (result.success) {
  console.log(`模块加载成功，耗时 ${result.loadTime}ms`);
  
  if (result.retryAttempts && result.retryAttempts > 0) {
    console.warn(`经过 ${result.retryAttempts} 次重试后成功`);
  }
} else {
  console.error('模块加载失败:', result.error);
  
  // 根据错误类型采取不同措施
  if (result.error instanceof NetworkError) {
    // 网络问题 - 提示用户检查网络
  } else {
    // 其他问题 - 上报错误
  }
}
```

---

## 常见问题

### Q: 如何禁用重试？

A: 将 `retryCount` 设置为 0：

```typescript
await safeModuleLoader.loadModule(container, modulePath, {
  retryCount: 0
});
```

### Q: 如何禁用加载指示器？

A: 将 `showLoading` 设置为 false：

```typescript
await safeModuleLoader.loadModule(container, modulePath, {
  showLoading: false
});
```

### Q: 如何在开发环境显示详细错误信息？

A: 降级 UI 会自动在开发环境（`import.meta.env.DEV`）显示详细的技术信息，包括错误堆栈。

### Q: 缓存会自动失效吗？

A: 不会。缓存会一直保留，直到：
- 调用 `clearCache()` 手动清除
- 页面刷新
- 应用重启

### Q: 如何强制重新加载模块？

A: 先清除缓存，再加载：

```typescript
safeModuleLoader.clearCache(modulePath);
await safeModuleLoader.loadModule(container, modulePath);
```

### Q: 支持并发加载吗？

A: 支持。`SafeModuleLoader` 会自动处理并发加载请求，避免重复加载同一模块：

```typescript
// 同时发起多个加载请求
const [result1, result2, result3] = await Promise.all([
  safeModuleLoader.loadModule(container1, modulePath1),
  safeModuleLoader.loadModule(container2, modulePath2),
  safeModuleLoader.loadModule(container3, modulePath3)
]);
```

### Q: 如何集成到现有代码？

A: 逐步替换现有的模块加载逻辑：

```typescript
// 旧代码
try {
  const module = await import(modulePath);
  container.innerHTML = module.template;
} catch (error) {
  console.error('加载失败', error);
}

// 新代码
await safeModuleLoader.loadModule(container, modulePath);
```

---

## 性能考虑

### 内存占用

- 每个缓存的模块会占用内存
- 建议定期清理不常用的模块缓存
- 使用 `getCacheStats()` 监控缓存大小

### 加载时间

- 首次加载：网络请求 + 解析 + 渲染
- 缓存加载：几乎瞬间完成（< 1ms）
- 预加载可以显著提升用户体验

### 网络优化

- 使用 CDN 加速模块加载
- 启用 HTTP/2 多路复用
- 压缩模块文件

---

## 相关文档

- [AlpineRegistry API 文档](./AlpineRegistry.md)
- [SafeRenderer API 文档](./SafeRenderer.md)
- [StateManager API 文档](./StateManager.md)
- [错误处理指南](../guides/error-handling.md)
- [迁移指南](../guides/migration-guide.md)

---

## 更新日志

### v1.0.0 (2025-01-XX)
- ✨ 初始版本
- ✅ 支持模块和模板加载
- ✅ 自动重试和超时控制
- ✅ 错误分类和降级 UI
- ✅ 缓存管理
- ✅ 预加载支持

---

## 许可证

MIT License
