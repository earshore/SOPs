# API参考文档

> 核心服务、工具和组件的API说明

---

## 📦 核心服务

### EventBus - 事件总线

全局事件通信中心,支持发布-订阅模式。

```typescript
import eventBus from '@/common/EventBus';

// 订阅事件
const unsubscribe = eventBus.on('event-name', (data) => {
  console.log('收到事件:', data);
});

// 发布事件
eventBus.emit('event-name', { key: 'value' });

// 取消订阅
unsubscribe();
```

**方法:**
- `on(event: string, handler: Function): () => void` - 订阅事件,返回取消订阅函数
- `emit(event: string, data?: any): void` - 发布事件
- `off(event: string, handler: Function): void` - 取消订阅

---

### Container - 依赖注入容器

管理服务依赖和生命周期。

```typescript
import { container } from '@/common/di/Container';

// 注册服务
container.register('serviceName', () => new MyService(), {
  dependencies: ['otherService'],
  lifetime: 'singleton'
});

// 获取服务
const service = container.resolve<MyService>('serviceName');
```

**方法:**
- `register(name, factory, options?)` - 注册服务
- `resolve<T>(name): T` - 解析服务实例
- `has(name): boolean` - 检查服务是否已注册

---

### Router - 路由管理器

管理应用路由和导航。

```typescript
import { router } from '@/common/router/Router';

// 导航到路由
router.navigate('/path');

// 获取当前路由
const current = router.getCurrentRoute();

// 注册路由守卫
router.beforeEach(async (to, from) => {
  // 返回false阻止导航
  return true;
});
```

**方法:**
- `navigate(path: string): void` - 导航到指定路径
- `getCurrentRoute(): Route` - 获取当前路由
- `beforeEach(guard: RouteGuard): void` - 注册全局前置守卫

---

### StateManager (Zustand)

全局状态管理,基于Zustand实现。

```typescript
import { useAppStore } from '@/stores/useAppStore';

// 在组件中使用
const loading = useAppStore(state => state.ui.loading);
const setLoading = useAppStore(state => state.setLoading);

// 在非组件中使用
useAppStore.getState().setLoading(true);
```

**Store结构:**
```typescript
{
  ui: {
    loading: boolean;
    currentTab: string;
    sidebarCollapsed: boolean;
  },
  scraper: { /* ... */ },
  analysis: { /* ... */ },
  promptLab: { /* ... */ },
  keywordTracker: { /* ... */ }
}
```

---

## 🛠️ 工具函数

### MemoryLeakDetector - 内存泄漏检测

自动检测和报告内存泄漏。

```typescript
import { memoryLeakDetector } from '@/common/utils/MemoryLeakDetector';

// 启动检测(开发环境自动启动)
memoryLeakDetector.start();

// 停止检测
memoryLeakDetector.stop();

// 获取报告
const report = memoryLeakDetector.getReport();
```

---

### WorkingStateManager - 工作状态管理

管理长时间操作的超时和重试。

```typescript
import { workingStateManager } from '@/common/utils/WorkingStateManager';

// 执行带超时重试的操作
const result = await workingStateManager.execute(
  'operation-key',
  async () => {
    // 你的异步操作
    return await fetchData();
  },
  {
    timeout: 30000,      // 30秒超时
    maxRetries: 3,       // 最多重试3次
    retryDelay: 1000     // 重试延迟1秒
  }
);
```

---

### validation - 输入验证

XSS防护和输入验证工具。

```typescript
import { escapeHtml, sanitizeInput, validateEmail } from '@/common/utils/validation';

// HTML转义
const safe = escapeHtml(userInput);

// 输入清理
const cleaned = sanitizeInput(userInput, {
  maxLength: 1000,
  allowedTags: ['b', 'i']
});

// 邮箱验证
if (validateEmail(email)) {
  // 有效邮箱
}
```

---

### RequestManager - HTTP请求管理

请求去重和取消管理。

```typescript
import { requestManager } from '@/services/RequestManager';

// 执行请求(自动去重)
const data = await requestManager.request(
  'unique-key',
  () => fetch('/api/data')
);

// 取消请求
requestManager.cancel('unique-key');

// 取消所有请求
requestManager.cancelAll();
```

---

## 🎨 组件

### AppModal - 模态框组件

Web Component实现的模态框。

```html
<app-modal id="myModal" title="标题">
  <div slot="body">
    模态框内容
  </div>
  <div slot="footer">
    <button onclick="document.getElementById('myModal').close()">关闭</button>
  </div>
</app-modal>
```

**属性:**
- `title: string` - 模态框标题
- `size: 'sm' | 'md' | 'lg' | 'xl'` - 尺寸

**方法:**
- `open(): void` - 打开模态框
- `close(): void` - 关闭模态框

---

### ErrorBoundary - 错误边界

捕获和处理组件错误。

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

const boundary = new ErrorBoundary(containerElement);
boundary.wrap(() => {
  // 可能抛出错误的代码
});
```

---

## 🔧 错误处理

### AppError - 应用错误类

统一的错误类型。

```typescript
import { AppError, ERROR_CODES } from '@/common/errors';

// 抛出错误
throw new AppError(
  ERROR_CODES.NETWORK_ERROR,
  '网络请求失败',
  { url: '/api/data', status: 500 }
);

// 捕获错误
try {
  // ...
} catch (error) {
  if (error instanceof AppError) {
    console.log('错误码:', error.code);
    console.log('上下文:', error.context);
  }
}
```

---

### GlobalErrorHandler - 全局错误处理器

自动捕获和处理未捕获的错误。

```typescript
import { globalErrorHandler } from '@/common/errors/GlobalErrorHandler';

// 已自动初始化,无需手动调用
// 所有未捕获的错误会自动上报和记录
```

---

## 📊 性能监控

### webVitalsService - Web Vitals监控

监控核心性能指标。

```typescript
import { webVitalsService } from '@/services/webVitalsService';

// 订阅指标更新
const unsubscribe = webVitalsService.onMetric((metric) => {
  console.log(`${metric.name}: ${metric.value}ms (${metric.rating})`);
});

// 获取性能摘要
const summary = webVitalsService.getSummary();
console.log('性能得分:', summary.score);

// 上报到服务器
await webVitalsService.reportMetrics('/api/metrics');
```

---

### PerformanceMonitor - 性能监控面板

开发环境实时性能面板。

```typescript
// 自动初始化,按 Ctrl+Shift+P 切换显示
// 显示Web Vitals指标和内存使用情况
```

---

## 🔐 安全

### secureStorage - 安全存储

加密的本地存储。

```typescript
import { secureStorage } from '@/common/utils/secureStorage';

// 存储敏感数据
await secureStorage.setItem('api-key', 'secret-value');

// 读取数据
const value = await secureStorage.getItem('api-key');

// 删除数据
await secureStorage.removeItem('api-key');
```

---

## 📝 日志

### Logger - 日志服务

统一的日志记录。

```typescript
import { Logger } from '@/services/loggerService';

// 记录日志
Logger.info('操作成功', { userId: 123 }, 'ModuleName');
Logger.error('操作失败', { error: err }, 'ModuleName');
Logger.warn('警告信息', {}, 'ModuleName');

// 获取日志
const logs = Logger.getLogs();
const errors = Logger.getErrors();

// 导出日志
Logger.download('json'); // 或 'csv'
```

---

## 🎯 最佳实践

### 1. 模块开发

继承BaseModule实现自动清理:

```typescript
import { BaseModule } from '@/common/BaseModule';

export class MyModule extends BaseModule {
  constructor() {
    super('MyModule');
  }

  async init(): Promise<void> {
    // 使用addSubscription自动管理订阅
    this.addSubscription(
      eventBus.on('event', this.handleEvent.bind(this))
    );

    // 使用addTimer自动管理定时器
    this.addTimer(
      setInterval(() => this.update(), 1000)
    );
  }

  private handleEvent(data: any): void {
    // 处理事件
  }

  private update(): void {
    // 定时更新
  }

  // destroy()会自动清理所有订阅和定时器
}
```

### 2. 错误处理

使用统一的错误处理:

```typescript
import { AppError, ERROR_CODES } from '@/common/errors';

async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new AppError(
        ERROR_CODES.NETWORK_ERROR,
        `HTTP ${response.status}: ${response.statusText}`,
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

### 3. 状态管理

使用Zustand管理状态:

```typescript
// 定义store
import create from 'zustand';

interface MyState {
  count: number;
  increment: () => void;
}

export const useMyStore = create<MyState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}));

// 在组件中使用
const count = useMyStore(state => state.count);
const increment = useMyStore(state => state.increment);

// 在非组件中使用
useMyStore.getState().increment();
```

---

**文档版本:** 1.0.0  
**最后更新:** 2024年
