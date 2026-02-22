# AlpineRegistry API 文档

## 概述

`AlpineRegistry` 是一个 Alpine.js 组件注册管理器，提供统一的组件注册接口和依赖管理机制。它解决了 Alpine.js 组件注册时序问题，支持组件依赖声明和自动解析，消除了重复的防御性代码。

## 特性

- ✅ **统一注册接口**：提供一致的组件注册 API
- ✅ **延迟注册机制**：自动处理 Alpine 未就绪的情况
- ✅ **依赖管理**：支持组件依赖声明和自动解析
- ✅ **拓扑排序**：确保依赖的组件先注册
- ✅ **循环依赖检测**：自动检测并报告循环依赖
- ✅ **热重载支持**：支持组件注销和重新注册
- ✅ **开发日志**：开发环境提供详细的注册日志
- ✅ **类型安全**：完整的 TypeScript 类型定义

## 安装与导入

```typescript
// 导入单例实例（推荐）
import { getAlpineRegistry } from '@/common/infrastructure/AlpineRegistry';
const registry = getAlpineRegistry();

// 或导入类
import { AlpineRegistry } from '@/common/infrastructure/AlpineRegistry';
const registry = AlpineRegistry.getInstance();
```

## 核心 API

### getInstance()

获取 `AlpineRegistry` 的单例实例。

**签名：**
```typescript
static getInstance(options?: RegistryOptions): AlpineRegistry
```

**参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `options` | `RegistryOptions` | ❌ | `{}` | 配置选项（仅首次调用时生效） |

**RegistryOptions 接口：**

```typescript
interface RegistryOptions {
  /** 是否自动启动 Alpine（默认 false） */
  autoStart?: boolean;
  
  /** 日志级别（开发环境默认 'debug'，生产环境默认 'warn'） */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
```

**返回值：**
- `AlpineRegistry` - 单例实例

**示例：**

```typescript
// 基础用法
const registry = AlpineRegistry.getInstance();

// 自定义配置
const registry = AlpineRegistry.getInstance({
  autoStart: true,      // 初始化后自动启动 Alpine
  logLevel: 'debug'     // 显示详细日志
});
```

---

### register()

注册 Alpine.js 组件。如果 Alpine 已就绪，立即注册；否则添加到待注册队列。

**签名：**
```typescript
register(
  name: string,
  factory: () => any,
  dependencies?: string[]
): void
```

**参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | `string` | ✅ | - | 组件名称（必须唯一） |
| `factory` | `() => any` | ✅ | - | 组件工厂函数 |
| `dependencies` | `string[]` | ❌ | `[]` | 依赖的其他组件名称列表 |

**抛出异常：**
- 组件名称为空或非字符串
- 工厂函数不是函数类型
- 依赖项不是字符串数组
- 组件依赖自己
- 检测到循环依赖

**示例：**

```typescript
// 基础用法 - 无依赖组件
registry.register('userPanel', () => ({
  username: '',
  email: '',
  
  init() {
    console.log('用户面板初始化');
  },
  
  login() {
    // 登录逻辑
  }
}));

// 带依赖的组件
registry.register('dashboardPanel', () => ({
  data: null,
  
  init() {
    // 可以安全使用 authService 和 dataService
    console.log('仪表板初始化');
  },
  
  loadData() {
    // 加载数据
  }
}), ['authService', 'dataService']);

// 复杂组件示例
registry.register('promptlabPanel', () => ({
  // 数据
  targetMarket: 'English',
  keywords: '',
  generatedPrompt: '',
  
  // 计算属性
  get isValid() {
    return this.keywords.length > 0;
  },
  
  // 方法
  init() {
    this.loadSettings();
  },
  
  generatePrompt() {
    // 生成 Prompt 逻辑
  },
  
  copyToClipboard() {
    // 复制逻辑
  },
  
  loadSettings() {
    // 加载设置
  }
}), ['stateManager']);
```

---

### unregister()

注销组件。用于热重载场景。

**签名：**
```typescript
unregister(name: string): void
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 要注销的组件名称 |

**示例：**

```typescript
// 注销组件
registry.unregister('userPanel');

// 热重载场景
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // 注销旧组件
    registry.unregister('userPanel');
    
    // 重新注册新组件
    registry.register('userPanel', () => ({
      // 新的组件定义
    }));
  });
}
```

---

### init()

初始化注册器，批量注册所有待注册的组件。会自动解析依赖关系并按正确顺序注册。

**签名：**
```typescript
init(): void
```

**抛出异常：**
- Alpine.js 未加载或不可用
- 检测到循环依赖

**示例：**

```typescript
// 注册所有组件
registry.register('authService', () => ({ /* ... */ }));
registry.register('dataService', () => ({ /* ... */ }), ['authService']);
registry.register('userPanel', () => ({ /* ... */ }), ['authService']);
registry.register('dashboardPanel', () => ({ /* ... */ }), ['dataService']);

// 初始化（批量注册）
registry.init();

// 如果配置了 autoStart: true，Alpine 会自动启动
// 否则需要手动启动
if (!registry.options.autoStart) {
  Alpine.start();
}
```

**初始化流程：**

1. 检查 Alpine.js 是否可用
2. 解析组件依赖关系（拓扑排序）
3. 按依赖顺序注册所有组件
4. 清空待注册队列
5. 如果配置了 `autoStart: true`，自动启动 Alpine

**日志输出示例：**

```
[AlpineRegistry] ========================================
[AlpineRegistry] 开始初始化 AlpineRegistry...
[AlpineRegistry] 待注册组件列表: [authService, dataService, userPanel, dashboardPanel]
[AlpineRegistry] 开始解析组件依赖关系...
[AlpineRegistry] 依赖解析完成，注册顺序: [authService → dataService → userPanel → dashboardPanel]
[AlpineRegistry]   ✓ 组件 "authService" 注册成功
[AlpineRegistry]   ✓ 组件 "dataService" 注册成功
[AlpineRegistry]   ✓ 组件 "userPanel" 注册成功
[AlpineRegistry]   ✓ 组件 "dashboardPanel" 注册成功
[AlpineRegistry] AlpineRegistry 初始化完成: 成功 4 个，失败 0 个
[AlpineRegistry] ========================================
```

---

### isComponentRegistered()

检查组件是否已注册。

**签名：**
```typescript
isComponentRegistered(name: string): boolean
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 组件名称 |

**返回值：**
- `boolean` - 是否已注册

**示例：**

```typescript
if (registry.isComponentRegistered('userPanel')) {
  console.log('用户面板已注册');
} else {
  console.log('用户面板未注册');
}

// 条件注册
if (!registry.isComponentRegistered('optionalFeature')) {
  registry.register('optionalFeature', () => ({
    // 可选功能
  }));
}
```

---

### getRegisteredComponents()

获取所有已注册的组件名称列表。

**签名：**
```typescript
getRegisteredComponents(): string[]
```

**返回值：**
- `string[]` - 组件名称数组

**示例：**

```typescript
const components = registry.getRegisteredComponents();
console.log('已注册的组件:', components);
// 输出: ['authService', 'dataService', 'userPanel', 'dashboardPanel']

// 调试信息
console.log(`共注册了 ${components.length} 个组件`);
components.forEach(name => {
  console.log(`- ${name}`);
});
```

---

## 类型定义

### AlpineComponent

组件定义接口。

```typescript
interface AlpineComponent {
  /** 组件名称 */
  name: string;
  
  /** 组件工厂函数 */
  factory: () => any;
  
  /** 依赖的其他组件名称列表 */
  dependencies?: string[];
}
```

### RegistryOptions

注册器配置选项。

```typescript
interface RegistryOptions {
  /** 是否自动启动 Alpine（默认 false） */
  autoStart?: boolean;
  
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
```

---

## 依赖管理

### 依赖声明

通过 `dependencies` 参数声明组件依赖：

```typescript
// authService 无依赖
registry.register('authService', () => ({
  isAuthenticated: false,
  login() { /* ... */ }
}));

// dataService 依赖 authService
registry.register('dataService', () => ({
  fetchData() {
    // 可以安全使用 authService
  }
}), ['authService']);

// userPanel 依赖 authService 和 dataService
registry.register('userPanel', () => ({
  init() {
    // 可以安全使用 authService 和 dataService
  }
}), ['authService', 'dataService']);
```

### 依赖解析

`AlpineRegistry` 使用拓扑排序算法自动解析依赖关系：

```typescript
// 注册顺序（随意）
registry.register('dashboardPanel', () => ({ /* ... */ }), ['dataService']);
registry.register('authService', () => ({ /* ... */ }));
registry.register('dataService', () => ({ /* ... */ }), ['authService']);

// 初始化时自动排序
registry.init();

// 实际注册顺序（按依赖）
// 1. authService（无依赖）
// 2. dataService（依赖 authService）
// 3. dashboardPanel（依赖 dataService）
```

### 循环依赖检测

`AlpineRegistry` 会自动检测循环依赖并抛出错误：

```typescript
// ❌ 错误：循环依赖
registry.register('componentA', () => ({ /* ... */ }), ['componentB']);
registry.register('componentB', () => ({ /* ... */ }), ['componentA']);

registry.init();
// 抛出错误: [AlpineRegistry] 检测到循环依赖: componentA
```

### 依赖验证

注册时会自动验证依赖：

```typescript
// ❌ 错误：依赖自己
registry.register('component', () => ({ /* ... */ }), ['component']);
// 抛出错误: [AlpineRegistry] 组件 "component" 不能依赖自己

// ❌ 错误：依赖不是字符串
registry.register('component', () => ({ /* ... */ }), [123, null]);
// 抛出错误: [AlpineRegistry] 组件 "component" 的依赖项必须是非空字符串

// ❌ 错误：依赖不是数组
registry.register('component', () => ({ /* ... */ }), 'authService');
// 抛出错误: [AlpineRegistry] 组件 "component" 的依赖必须是数组
```

---

## 日志系统

### 日志级别

`AlpineRegistry` 支持 4 个日志级别：

- `debug` - 详细的调试信息（开发环境默认）
- `info` - 一般信息
- `warn` - 警告信息
- `error` - 错误信息（生产环境默认）

### 配置日志级别

```typescript
// 开发环境 - 显示所有日志
const registry = AlpineRegistry.getInstance({
  logLevel: 'debug'
});

// 生产环境 - 只显示错误
const registry = AlpineRegistry.getInstance({
  logLevel: 'error'
});

// 完全静默
const registry = AlpineRegistry.getInstance({
  logLevel: 'error'  // 只在出错时输出
});
```

### 日志格式

```
[HH:MM:SS] [AlpineRegistry] 消息内容
```

**示例：**

```
[14:23:45] [AlpineRegistry] 开始注册组件 "userPanel"
[14:23:45] [AlpineRegistry] 组件 "userPanel" 已保存到注册表
[14:23:45] [AlpineRegistry] ✓ 组件 "userPanel" 已立即注册到 Alpine
```

---

## 最佳实践

### 1. 使用单例实例

始终使用单例实例，而不是尝试创建新实例：

```typescript
// ✅ 推荐
import { getAlpineRegistry } from '@/common/infrastructure/AlpineRegistry';
const registry = getAlpineRegistry();

// ✅ 也可以
import { AlpineRegistry } from '@/common/infrastructure/AlpineRegistry';
const registry = AlpineRegistry.getInstance();

// ❌ 不推荐（构造函数是私有的）
const registry = new AlpineRegistry(); // 编译错误
```

### 2. 集中注册组件

在应用启动时集中注册所有组件：

```typescript
// src/alpine-components.ts
import { getAlpineRegistry } from '@/common/infrastructure/AlpineRegistry';

const registry = getAlpineRegistry();

// 注册所有组件
export function registerAlpineComponents() {
  // 基础服务
  registry.register('authService', () => import('./services/auth'));
  registry.register('stateManager', () => import('./services/state'));
  
  // 业务组件
  registry.register('promptlabPanel', () => import('./modules/promptlab'), ['stateManager']);
  registry.register('aiAnalysisPanel', () => import('./modules/ai-analysis'), ['stateManager']);
  registry.register('scraperPanel', () => import('./modules/scraper'), ['stateManager']);
  
  // 初始化
  registry.init();
}

// src/main.ts
import { registerAlpineComponents } from './alpine-components';

// 启动应用
registerAlpineComponents();
Alpine.start();
```

### 3. 明确声明依赖

始终明确声明组件依赖，让依赖关系清晰可见：

```typescript
// ✅ 推荐：明确声明依赖
registry.register('userPanel', () => ({
  init() {
    // 使用 authService
  }
}), ['authService']);  // 明确声明依赖

// ❌ 不推荐：隐式依赖
registry.register('userPanel', () => ({
  init() {
    // 使用 authService，但没有声明依赖
    // 可能导致 authService 未注册时出错
  }
}));
```

### 4. 避免循环依赖

设计组件时避免循环依赖：

```typescript
// ❌ 不推荐：循环依赖
registry.register('componentA', () => ({ /* ... */ }), ['componentB']);
registry.register('componentB', () => ({ /* ... */ }), ['componentA']);

// ✅ 推荐：引入中间层
registry.register('sharedService', () => ({ /* 共享逻辑 */ }));
registry.register('componentA', () => ({ /* ... */ }), ['sharedService']);
registry.register('componentB', () => ({ /* ... */ }), ['sharedService']);
```

### 5. 使用工厂函数

组件工厂函数应该返回一个新对象，而不是共享对象：

```typescript
// ✅ 推荐：每次返回新对象
registry.register('userPanel', () => ({
  username: '',
  login() { /* ... */ }
}));

// ❌ 不推荐：共享对象
const sharedPanel = {
  username: '',
  login() { /* ... */ }
};
registry.register('userPanel', () => sharedPanel);
```

### 6. 开发环境启用详细日志

开发时启用 `debug` 日志，帮助排查问题：

```typescript
const registry = AlpineRegistry.getInstance({
  logLevel: import.meta.env.DEV ? 'debug' : 'warn'
});
```

### 7. 生产环境自动启动

生产环境配置自动启动，简化代码：

```typescript
const registry = AlpineRegistry.getInstance({
  autoStart: !import.meta.env.DEV  // 生产环境自动启动
});

registry.register(/* ... */);
registry.init();

// 开发环境需要手动启动（方便调试）
if (import.meta.env.DEV) {
  Alpine.start();
}
```

### 8. 模块化组件定义

将组件定义拆分到独立文件：

```typescript
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
```

---

## 迁移指南

### 从旧代码迁移

**旧代码（直接使用 Alpine.data）：**

```typescript
// 旧代码 - 存在时序问题
document.addEventListener('DOMContentLoaded', () => {
  if (window.Alpine) {
    Alpine.data('userPanel', () => ({
      username: '',
      login() { /* ... */ }
    }));
  } else {
    // 需要等待 Alpine 加载
    setTimeout(() => {
      Alpine.data('userPanel', () => ({
        username: '',
        login() { /* ... */ }
      }));
    }, 100);
  }
});
```

**新代码（使用 AlpineRegistry）：**

```typescript
// 新代码 - 自动处理时序
import { getAlpineRegistry } from '@/common/infrastructure/AlpineRegistry';

const registry = getAlpineRegistry();

registry.register('userPanel', () => ({
  username: '',
  login() { /* ... */ }
}));

// 在应用启动时统一初始化
registry.init();
```

### 迁移步骤

1. **安装依赖**（如果需要）
2. **创建注册文件** `src/alpine-components.ts`
3. **迁移组件注册**：将所有 `Alpine.data()` 调用替换为 `registry.register()`
4. **添加依赖声明**：为有依赖的组件添加 `dependencies` 参数
5. **初始化注册器**：在 `main.ts` 中调用 `registry.init()`
6. **测试**：确保所有组件正常工作
7. **删除旧代码**：删除所有 `setTimeout` 和重试逻辑

---

## 常见问题

### Q: 必须调用 init() 吗？

A: 是的。`init()` 负责批量注册所有组件并解析依赖关系。不调用 `init()` 的话，组件不会被注册到 Alpine。

```typescript
registry.register('component', () => ({ /* ... */ }));
// 此时组件还未注册到 Alpine

registry.init();
// 现在组件已注册到 Alpine
```

### Q: 可以在 init() 之后注册组件吗？

A: 可以。`init()` 之后注册的组件会立即注册到 Alpine（如果 Alpine 已就绪）：

```typescript
registry.init();

// 动态注册新组件
registry.register('newComponent', () => ({ /* ... */ }));
// 立即注册到 Alpine，无需再次调用 init()
```

### Q: 如何处理可选依赖？

A: 在组件内部检查依赖是否存在：

```typescript
registry.register('component', () => ({
  init() {
    // 检查可选依赖
    if (window.Alpine.store('optionalService')) {
      // 使用可选服务
    } else {
      // 降级逻辑
    }
  }
}));
```

### Q: 支持异步组件吗？

A: 工厂函数本身不支持异步，但可以在组件内部使用异步逻辑：

```typescript
registry.register('asyncComponent', () => ({
  data: null,
  
  async init() {
    // 异步初始化
    this.data = await fetchData();
  },
  
  async loadMore() {
    // 异步方法
  }
}));
```

### Q: 如何调试依赖问题？

A: 启用 `debug` 日志级别：

```typescript
const registry = AlpineRegistry.getInstance({
  logLevel: 'debug'
});

registry.register(/* ... */);
registry.init();

// 查看详细的依赖解析日志
```

### Q: 可以动态卸载组件吗？

A: 可以使用 `unregister()` 注销组件，但 Alpine.js 本身不支持卸载已注册的组件。`unregister()` 主要用于热重载场景。

### Q: 如何在多个模块中使用同一个注册器？

A: `AlpineRegistry` 是单例，所有模块共享同一个实例：

```typescript
// moduleA.ts
import { getAlpineRegistry } from '@/common/infrastructure/AlpineRegistry';
const registry = getAlpineRegistry();
registry.register('componentA', () => ({ /* ... */ }));

// moduleB.ts
import { getAlpineRegistry } from '@/common/infrastructure/AlpineRegistry';
const registry = getAlpineRegistry();  // 同一个实例
registry.register('componentB', () => ({ /* ... */ }));

// main.ts
import { getAlpineRegistry } from '@/common/infrastructure/AlpineRegistry';
const registry = getAlpineRegistry();  // 同一个实例
registry.init();  // 注册所有组件
```

### Q: 组件名称有命名规范吗？

A: 建议使用 camelCase 命名：

```typescript
// ✅ 推荐
registry.register('userPanel', () => ({ /* ... */ }));
registry.register('aiAnalysisPanel', () => ({ /* ... */ }));

// ❌ 不推荐
registry.register('user-panel', () => ({ /* ... */ }));
registry.register('AIAnalysisPanel', () => ({ /* ... */ }));
```

---

## 性能考虑

### 注册性能

- 组件注册是同步操作，性能开销极小
- 依赖解析使用拓扑排序，时间复杂度 O(V + E)
- 建议在应用启动时一次性注册所有组件

### 内存占用

- 每个组件定义占用少量内存（< 1KB）
- 工厂函数在调用前不会执行，不占用额外内存
- 单例模式确保只有一个注册器实例

### 日志性能

- 生产环境建议使用 `warn` 或 `error` 级别
- `debug` 级别会输出大量日志，影响性能
- 日志输出是同步的，但开销很小

---

## 相关文档

- [SafeModuleLoader API 文档](./SafeModuleLoader.md)
- [SafeRenderer API 文档](./SafeRenderer.md)
- [StateManager API 文档](./StateManager.md)
- [Alpine.js 官方文档](https://alpinejs.dev/)
- [迁移指南](../guides/migration-guide.md)
- [最佳实践](../guides/best-practices.md)

---

## 更新日志

### v1.0.0 (2025-01-XX)
- ✨ 初始版本
- ✅ 支持组件注册和注销
- ✅ 自动依赖解析（拓扑排序）
- ✅ 循环依赖检测
- ✅ 延迟注册机制
- ✅ 开发日志系统
- ✅ 热重载支持

---

## 许可证

MIT License
