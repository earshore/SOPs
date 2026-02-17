# 开发指南

> AihangSOP项目开发规范和最佳实践

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

### 运行测试

```bash
npm test
```

---

## 📁 项目结构

```
AihangSOP/
├── src/
│   ├── common/              # 核心基础设施
│   │   ├── bootstrap/       # 服务启动管理
│   │   ├── config/          # 配置管理
│   │   ├── di/              # 依赖注入
│   │   ├── errors/          # 错误处理
│   │   ├── router/          # 路由系统
│   │   ├── state/           # 状态管理(已废弃)
│   │   ├── ui/              # UI工具
│   │   └── utils/           # 工具函数
│   ├── components/          # 全局组件
│   ├── modules/             # 业务模块
│   │   ├── home/            # 首页
│   │   ├── amz_hub/         # Amazon Hub
│   │   ├── sops/            # SOPs
│   │   ├── more/            # More
│   │   └── app_center/      # App Center
│   ├── services/            # 服务层
│   ├── stores/              # Zustand状态管理
│   ├── types/               # TypeScript类型定义
│   └── main.ts              # 应用入口
├── tests/                   # 测试文件
├── docs/                    # 文档
└── dist/                    # 构建输出
```

---

## 🎯 开发规范

### 1. 代码风格

**TypeScript优先**
- 所有新代码必须使用TypeScript
- 避免使用`any`类型
- 为公共API提供完整类型定义

**命名规范**
- 文件名: `camelCase.ts` 或 `PascalCase.ts`
- 类名: `PascalCase`
- 函数/变量: `camelCase`
- 常量: `UPPER_SNAKE_CASE`
- 接口: `IPascalCase` 或 `PascalCase`

**示例:**
```typescript
// ✅ 好的命名
export class UserService {
  private readonly API_ENDPOINT = '/api/users';
  
  async fetchUserData(userId: string): Promise<User> {
    // ...
  }
}

// ❌ 避免
export class user_service {
  private api_endpoint = '/api/users';
  
  async FetchUserData(user_id: any) {
    // ...
  }
}
```

### 2. 模块开发

**继承BaseModule**

所有业务模块必须继承`BaseModule`以确保资源自动清理:

```typescript
import { BaseModule } from '@/common/BaseModule';

export class MyModule extends BaseModule {
  constructor() {
    super('MyModule');
  }

  async init(): Promise<void> {
    // 使用addSubscription管理事件订阅
    this.addSubscription(
      eventBus.on('event', this.handleEvent.bind(this))
    );

    // 使用addTimer管理定时器
    this.addTimer(
      setInterval(() => this.update(), 1000)
    );
  }

  private handleEvent(data: any): void {
    // 处理逻辑
  }

  // destroy()会自动清理所有资源
}
```

### 3. 状态管理

**使用Zustand**

```typescript
// 定义store
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface MyState {
  data: any[];
  loading: boolean;
  setData: (data: any[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useMyStore = create<MyState>()(
  devtools(
    persist(
      (set) => ({
        data: [],
        loading: false,
        setData: (data) => set({ data }),
        setLoading: (loading) => set({ loading })
      }),
      { name: 'my-store' }
    )
  )
);
```

**在组件中使用:**
```typescript
const data = useMyStore(state => state.data);
const setData = useMyStore(state => state.setData);
```

**在非组件中使用:**
```typescript
useMyStore.getState().setData(newData);
```

### 4. 错误处理

**使用AppError**

```typescript
import { AppError, ERROR_CODES } from '@/common/errors';

async function fetchData() {
  try {
    const response = await fetch('/api/data');
    
    if (!response.ok) {
      throw new AppError(
        ERROR_CODES.NETWORK_ERROR,
        `HTTP ${response.status}`,
        { url: '/api/data', status: response.status }
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      ERROR_CODES.UNKNOWN_ERROR,
      '未知错误',
      { originalError: error }
    );
  }
}
```

### 5. 路由开发

**注册路由**

在`src/common/config/defaults/routes.config.ts`中配置:

```typescript
export const routes: RouteConfig[] = [
  {
    path: '/my-page',
    name: 'MyPage',
    component: () => import('@/modules/my-page/index'),
    meta: {
      title: '我的页面',
      requiresAuth: false
    }
  }
];
```

**路由守卫**

```typescript
import { router } from '@/common/router/Router';

router.beforeEach(async (to, from) => {
  // 检查权限
  if (to.meta?.requiresAuth && !isAuthenticated()) {
    return false; // 阻止导航
  }
  return true;
});
```

### 6. 事件通信

**使用EventBus**

```typescript
import eventBus from '@/common/EventBus';

// 发布事件
eventBus.emit('data-updated', { id: 123 });

// 订阅事件
const unsubscribe = eventBus.on('data-updated', (data) => {
  console.log('数据更新:', data);
});

// 取消订阅
unsubscribe();
```

### 7. HTTP请求

**使用HttpService**

```typescript
import { httpService } from '@/services/httpService';

// GET请求
const data = await httpService.get('/api/users');

// POST请求
const result = await httpService.post('/api/users', {
  name: 'John',
  email: 'john@example.com'
});

// 带优先级的请求
const urgentData = await httpService.get('/api/urgent', {
  priority: 'high'
});
```

### 8. 输入验证

**XSS防护**

```typescript
import { escapeHtml, sanitizeInput } from '@/common/utils/validation';

// HTML转义
const safe = escapeHtml(userInput);
container.innerHTML = safe;

// 输入清理
const cleaned = sanitizeInput(userInput, {
  maxLength: 1000,
  allowedTags: ['b', 'i', 'u']
});
```

---

## 🧪 测试规范

### 单元测试

使用Vitest编写测试:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyService } from './MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('should process data correctly', () => {
    const result = service.processData({ value: 10 });
    expect(result).toBe(20);
  });

  it('should throw error for invalid input', () => {
    expect(() => service.processData(null)).toThrow();
  });
});
```

### 集成测试

```typescript
import { describe, it, expect } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';

describe('Store Integration', () => {
  it('should update state correctly', () => {
    const store = useAppStore.getState();
    
    store.setLoading(true);
    expect(useAppStore.getState().ui.loading).toBe(true);
    
    store.setLoading(false);
    expect(useAppStore.getState().ui.loading).toBe(false);
  });
});
```

---

## 🔧 调试技巧

### 1. 性能监控

开发环境按`Ctrl+Shift+P`打开性能监控面板,查看:
- Web Vitals指标(CLS/FID/LCP/FCP/TTFB/INP)
- 内存使用情况
- 性能得分

### 2. 状态调试

使用Zustand DevTools:
```typescript
// 已自动启用,在Redux DevTools中查看状态变化
```

### 3. 日志查看

```typescript
import { Logger } from '@/services/loggerService';

// 查看所有日志
Logger.getLogs();

// 查看错误日志
Logger.getErrors();

// 导出日志
Logger.download('json');
```

### 4. 内存泄漏检测

```typescript
import { memoryLeakDetector } from '@/common/utils/MemoryLeakDetector';

// 获取内存泄漏报告
const report = memoryLeakDetector.getReport();
console.table(report.leaks);
```

---

## 📦 依赖管理

### 添加依赖

```bash
# 生产依赖
npm install package-name

# 开发依赖
npm install -D package-name
```

### 更新依赖

```bash
# 检查过期依赖
npm outdated

# 更新所有依赖
npm update

# 更新特定依赖
npm update package-name
```

---

## 🚨 常见问题

### Q: 如何添加新的业务模块?

1. 在`src/modules/`创建模块文件夹
2. 创建`index.ts`作为入口
3. 在路由配置中注册路由
4. 在菜单配置中添加菜单项

### Q: 如何处理跨模块通信?

使用EventBus进行松耦合通信:
```typescript
// 模块A发布事件
eventBus.emit('module-a:data-ready', data);

// 模块B订阅事件
eventBus.on('module-a:data-ready', handleData);
```

### Q: 如何优化首屏加载?

1. 使用动态导入拆分代码
2. 懒加载非关键资源
3. 使用Vite的代码分割配置
4. 压缩图片和静态资源

### Q: 如何处理长时间操作?

使用WorkingStateManager:
```typescript
import { workingStateManager } from '@/common/utils/WorkingStateManager';

const result = await workingStateManager.execute(
  'operation-key',
  async () => await longRunningTask(),
  { timeout: 30000, maxRetries: 3 }
);
```

---

## 📚 参考资源

- [TypeScript官方文档](https://www.typescriptlang.org/docs/)
- [Vite文档](https://vitejs.dev/)
- [Zustand文档](https://github.com/pmndrs/zustand)
- [Vitest文档](https://vitest.dev/)
- [Alpine.js文档](https://alpinejs.dev/)

---

**文档版本:** 1.0.0  
**最后更新:** 2024年
