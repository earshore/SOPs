# TypeScript 迁移指南

> 渐进式TypeScript迁移策略  
> 创建时间：2026-02-08

---

## 📋 迁移策略

### 核心原则
1. **渐进式迁移**：不要一次性重写所有代码
2. **向后兼容**：保持JS和TS代码可以共存
3. **类型优先**：先定义类型，再迁移实现
4. **测试保障**：每次迁移后运行测试确保无回归

---

## 🎯 迁移优先级

### P0 - 核心基础设施（第1-2周）
1. `src/common/di/Container.js` → `Container.ts`
2. `src/common/EventBus.js` → `EventBus.ts`
3. `src/common/state/StateManager.js` → `StateManager.ts`
4. `src/common/router/Router.js` → `Router.ts`

### P1 - 配置和常量（第2-3周）
1. `src/common/config/menuConfig.js` → `menuConfig.ts`
2. `src/common/config/envConfig.js` → `envConfig.ts`
3. `src/common/constants/` 下所有文件

### P2 - 服务层（第3-4周）
1. `src/services/httpService.js` → `httpService.ts`
2. `src/services/llmService.js` → `llmService.ts`
3. `src/services/storageService.js` → `storageService.ts`
4. `src/services/loggerService.js` → `loggerService.ts`
5. `src/services/performanceService.js` → `performanceService.ts`

### P3 - 工具函数（第4-5周）
1. `src/common/utils/` 下的核心工具
2. `src/common/BaseModule.js` → `BaseModule.ts`

---

## 📝 迁移步骤

### 步骤1：创建类型定义文件

在迁移JS文件之前，先创建对应的类型定义：

```typescript
// src/types/container.d.ts
export interface DIContainer {
  register(name: string, factory: Function, options?: any): void;
  resolve<T>(name: string): T;
  has(name: string): boolean;
}
```

### 步骤2：重命名文件

```bash
# 将 .js 文件重命名为 .ts
mv src/common/di/Container.js src/common/di/Container.ts
```

### 步骤3：添加类型注解

```typescript
// 之前 (JS)
class DIContainer {
  constructor() {
    this.factories = new Map();
  }
  
  register(name, factory, options = {}) {
    this.factories.set(name, factory);
  }
}

// 之后 (TS)
class DIContainer {
  private factories: Map<string, Function>;
  private singletons: Map<string, any>;
  
  constructor() {
    this.factories = new Map();
    this.singletons = new Map();
  }
  
  register(
    name: string, 
    factory: (container: DIContainer) => any, 
    options: { lifetime?: 'singleton' | 'transient' } = {}
  ): void {
    this.factories.set(name, factory);
  }
  
  resolve<T = any>(name: string): T {
    // ...
  }
}
```

### 步骤4：修复类型错误

运行TypeScript编译器，修复所有类型错误：

```bash
npx tsc --noEmit
```

### 步骤5：更新导入语句

```typescript
// 之前
import { container } from './di/Container.js';

// 之后
import { container } from './di/Container';
// 或
import type { DIContainer } from './di/Container';
```

### 步骤6：运行测试

```bash
npm test
```

---

## 🔧 常见迁移模式

### 模式1：函数参数类型化

```typescript
// 之前
function createUser(name, age, email) {
  return { name, age, email };
}

// 之后
interface User {
  name: string;
  age: number;
  email: string;
}

function createUser(name: string, age: number, email: string): User {
  return { name, age, email };
}
```

### 模式2：类属性类型化

```typescript
// 之前
class StateManager {
  constructor(initialState) {
    this._state = initialState;
    this._subscribers = new Map();
  }
}

// 之后
class StateManager<T = any> {
  private _state: T;
  private _subscribers: Map<string, Set<Function>>;
  
  constructor(initialState: T) {
    this._state = initialState;
    this._subscribers = new Map();
  }
}
```

### 模式3：事件类型化

```typescript
// 之前
eventBus.on('ROUTE_CHANGED', (data) => {
  console.log(data.routeId);
});

// 之后
import type { RouteChangedEventPayload } from '@types/events';

eventBus.on<'ROUTE_CHANGED'>('ROUTE_CHANGED', (data: RouteChangedEventPayload) => {
  console.log(data.routeId);
});
```

### 模式4：Promise类型化

```typescript
// 之前
async function loadModule(routeId) {
  const module = await import(`./modules/${routeId}`);
  return module;
}

// 之后
interface Module {
  mount(container: HTMLElement): Promise<void>;
  unmount(): void;
}

async function loadModule(routeId: string): Promise<Module> {
  const module = await import(`./modules/${routeId}`);
  return module.default;
}
```

### 模式5：泛型使用

```typescript
// 之前
function get(path) {
  return path.split('.').reduce((obj, key) => obj?.[key], this._state);
}

// 之后
function get<T = any>(path: string): T | undefined {
  return path.split('.').reduce((obj, key) => obj?.[key], this._state) as T;
}
```

---

## ⚠️ 常见问题

### 问题1：`any` 类型滥用

❌ **错误做法**：
```typescript
function process(data: any): any {
  return data.map((item: any) => item.value);
}
```

✅ **正确做法**：
```typescript
interface DataItem {
  value: string;
}

function process(data: DataItem[]): string[] {
  return data.map(item => item.value);
}
```

### 问题2：类型断言过度使用

❌ **错误做法**：
```typescript
const user = data as User;
const name = (user.profile as Profile).name as string;
```

✅ **正确做法**：
```typescript
interface User {
  profile: Profile;
}

interface Profile {
  name: string;
}

const user: User = data;
const name: string = user.profile.name;
```

### 问题3：忽略null/undefined检查

❌ **错误做法**：
```typescript
function getName(user: User): string {
  return user.name; // user可能为null
}
```

✅ **正确做法**：
```typescript
function getName(user: User | null): string {
  return user?.name ?? 'Unknown';
}
```

---

## 🛠️ 工具和配置

### VSCode配置

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

### ESLint配置

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_' 
    }]
  }
};
```

---

## 📊 迁移进度跟踪

### 核心模块

- [ ] Container.ts
- [ ] EventBus.ts
- [ ] StateManager.ts
- [ ] Router.ts
- [ ] menuConfig.ts

### 服务层

- [ ] httpService.ts
- [ ] llmService.ts
- [ ] storageService.ts
- [ ] loggerService.ts
- [ ] performanceService.ts

### 工具函数

- [ ] ModuleLoader.ts
- [ ] viewLoader.ts
- [ ] actionRegistry.ts
- [ ] BaseModule.ts

---

## ✅ 验收标准

每个迁移的文件必须满足：

1. ✅ TypeScript编译无错误
2. ✅ 所有公共API有类型定义
3. ✅ 没有使用`any`类型（除非必要）
4. ✅ 所有测试通过
5. ✅ ESLint检查通过
6. ✅ 代码审查通过

---

## 📚 参考资源

- [TypeScript官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [TypeScript迁移指南](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html)

---

**最后更新**：2026-02-08  
**维护者**：开发团队
