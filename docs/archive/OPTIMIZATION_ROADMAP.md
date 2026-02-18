# 项目优化实施路线图

**版本**: v1.0.1 → v2.0.0  
**时间跨度**: 3-6 个月  
**目标**: 打造高性能、高安全、高可维护的企业级应用

---

## 阶段 0: 紧急修复 (发布前)

**时间**: 3 天  
**优先级**: 🔴 P0 - 阻塞发布

### 任务清单
- [ ] 修复 XSS 注入漏洞
- [ ] 加固 API 密钥安全
- [ ] 解决循环依赖问题
- [ ] 完成安全测试

**详细方案**: 见 `P0_CRITICAL_FIXES.md`

---

## 阶段 1: 稳定性增强 (第 1-2 周)

**目标**: 确保生产环境稳定运行

### 1.1 错误监控与日志
**工作量**: 2 天

#### 集成 Sentry
```javascript
// src/services/monitoring.js
import * as Sentry from "@sentry/browser";

export function initMonitoring() {
  if (EnvConfig.isProduction) {
    Sentry.init({
      dsn: "YOUR_SENTRY_DSN",
      environment: EnvConfig.environment,
      release: APP_VERSION,
      tracesSampleRate: 0.1, // 10% 性能追踪
      beforeSend(event) {
        // 过滤敏感信息
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers['Authorization'];
        }
        return event;
      }
    });
  }
}

// main.js
import { initMonitoring } from './services/monitoring.js';
initMonitoring();
```

#### 统一日志服务
```javascript
// src/services/logger.js
export const Logger = {
  debug(message, data = {}) {
    if (EnvConfig.isDevelopment) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  
  info(message, data = {}) {
    console.info(`[INFO] ${message}`, data);
    // 生产环境发送到日志服务
    if (EnvConfig.isProduction) {
      this._sendToLogService('info', message, data);
    }
  },
  
  error(message, error, data = {}) {
    console.error(`[ERROR] ${message}`, error, data);
    // 发送到 Sentry
    Sentry.captureException(error, {
      tags: { module: data.module },
      extra: data
    });
  }
};
```

### 1.2 性能监控
**工作量**: 1 天

```javascript
// src/services/performance.js
export class PerformanceMonitor {
  static measurePageLoad() {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      const metrics = {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        ttfb: perfData.responseStart - perfData.requestStart,
        download: perfData.responseEnd - perfData.responseStart,
        domParse: perfData.domContentLoadedEventEnd - perfData.responseEnd,
        total: perfData.loadEventEnd - perfData.fetchStart
      };
      
      Logger.info('Page Load Metrics', metrics);
      
      // 发送到分析服务
      if (EnvConfig.isProduction) {
        this._sendMetrics(metrics);
      }
    });
  }
  
  static measureLCP() {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      Logger.info('LCP', { value: lastEntry.renderTime || lastEntry.loadTime });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }
}
```

### 1.3 自动化测试
**工作量**: 3 天

#### 单元测试覆盖
```javascript
// tests/unit/services/llmService.test.js
import { describe, test, expect, vi } from 'vitest';
import { callLLM } from '@/services/llmService.js';

describe('LLMService', () => {
  test('应该正确调用 API', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'test response' } }]
        })
      })
    );
    
    const response = await callLLM(
      [{ role: 'user', content: 'test' }],
      'openai',
      'https://api.openai.com/v1',
      'sk-test',
      'gpt-4'
    );
    
    expect(response).toBe('test response');
  });
  
  test('应该处理网络错误', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
    
    await expect(
      callLLM([], 'openai', 'https://api.openai.com/v1', 'sk-test', 'gpt-4')
    ).rejects.toThrow();
  });
});
```

#### E2E 测试
```javascript
// tests/e2e/scraper.spec.js
import { test, expect } from '@playwright/test';

test('应该能采集 Amazon 产品数据', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // 导航到 Scraper 页面
  await page.click('[data-action="switchTab"][data-param="scraper"]');
  
  // 输入 ASIN
  await page.fill('#asin-input', 'B08N5WRWNW');
  
  // 选择站点
  await page.selectOption('#site-select', 'US');
  
  // 开始采集
  await page.click('#start-scrape-btn');
  
  // 等待完成
  await page.waitForSelector('.scrape-success', { timeout: 30000 });
  
  // 验证结果
  const title = await page.textContent('.product-title');
  expect(title).toBeTruthy();
});
```

---

## 阶段 2: 性能优化 (第 3-4 周)

**目标**: 首屏加载时间 < 2s, LCP < 2.5s

### 2.1 代码分割优化
**工作量**: 2 天

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 第三方库单独打包
          'vendor-ui': ['alpinejs', 'marked'],
          'vendor-chart': ['chart.js'],
          'vendor-grid': ['gridstack'],
          
          // 按模块分割
          'module-sops': [
            '/src/modules/sops/sops.js',
            '/src/modules/sops/views/**'
          ],
          'module-app-center': [
            '/src/modules/app_center/app_center.js',
            '/src/modules/app_center/views/**'
          ]
        }
      }
    },
    
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug']
      }
    }
  }
});
```

### 2.2 资源预加载
**工作量**: 1 天

```javascript
// src/common/utils/preload.js
export class ResourcePreloader {
  static preloadRoute(routeId) {
    // 预加载视图
    const viewPath = getViewPathByRoute(routeId);
    if (viewPath) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = viewPath;
      document.head.appendChild(link);
    }
    
    // 预加载模块
    const moduleMap = getModuleMapByRoute(routeId);
    if (moduleMap) {
      Object.values(moduleMap).forEach(loader => {
        // 动态 import 会自动触发预加载
        loader();
      });
    }
  }
  
  static preloadOnHover() {
    // 鼠标悬停时预加载
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('[data-route]');
      if (link) {
        const routeId = link.dataset.route;
        this.preloadRoute(routeId);
      }
    }, { passive: true });
  }
}

// main.js
ResourcePreloader.preloadOnHover();
```

### 2.3 图片优化
**工作量**: 1 天

```javascript
// src/common/utils/imageOptimizer.js
export class ImageOptimizer {
  static lazyLoad() {
    const images = document.querySelectorAll('img[data-src]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px' // 提前 50px 加载
    });
    
    images.forEach(img => observer.observe(img));
  }
  
  static useWebP() {
    // 检测 WebP 支持
    const canvas = document.createElement('canvas');
    const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    if (supportsWebP) {
      document.documentElement.classList.add('webp');
    }
  }
}
```

### 2.4 Service Worker 缓存
**工作量**: 2 天

```javascript
// public/sw.js
const CACHE_NAME = 'aihang-sop-v1.0.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/css/style.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 缓存优先策略
      if (response) {
        return response;
      }
      
      // 网络请求
      return fetch(event.request).then((response) => {
        // 缓存新资源
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// main.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

## 阶段 3: 架构重构 (第 5-8 周)

**目标**: 解决技术债务,提升可维护性

### 3.1 依赖注入容器
**工作量**: 3 天

```javascript
// src/common/di/Container.js
export class Container {
  constructor() {
    this.bindings = new Map();
    this.instances = new Map();
  }
  
  // 注册单例
  singleton(name, factory) {
    this.bindings.set(name, { type: 'singleton', factory });
  }
  
  // 注册瞬态
  transient(name, factory) {
    this.bindings.set(name, { type: 'transient', factory });
  }
  
  // 解析依赖
  resolve(name) {
    const binding = this.bindings.get(name);
    if (!binding) {
      throw new Error(`Service not found: ${name}`);
    }
    
    if (binding.type === 'singleton') {
      if (!this.instances.has(name)) {
        this.instances.set(name, binding.factory(this));
      }
      return this.instances.get(name);
    }
    
    return binding.factory(this);
  }
}

// src/common/di/providers.js
export function registerProviders(container) {
  // 注册服务
  container.singleton('llmService', () => new LLMService());
  container.singleton('storageService', () => new StorageService());
  container.singleton('httpService', () => new HttpService());
  container.singleton('errorService', () => new ErrorService());
  
  // 注册工具
  container.transient('logger', (c) => new Logger(c.resolve('errorService')));
}

// main.js
import { Container } from './common/di/Container.js';
import { registerProviders } from './common/di/providers.js';

const container = new Container();
registerProviders(container);

// 全局访问
window.container = container;
```

### 3.2 统一错误处理
**工作量**: 2 天

```javascript
// src/common/errors/AppError.js
export class AppError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export class NetworkError extends AppError {
  constructor(message, context) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message, context) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

// 全局错误处理器
export class GlobalErrorHandler {
  static handle(error) {
    if (error instanceof AppError) {
      // 业务错误
      Logger.error(error.message, error, error.context);
      showToast(error.message, 'error');
    } else {
      // 未知错误
      Logger.error('Unexpected error', error);
      showToast('系统错误,请稍后重试', 'error');
    }
    
    // 发送到 Sentry
    Sentry.captureException(error);
  }
}

// main.js
window.addEventListener('error', (e) => {
  GlobalErrorHandler.handle(e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  GlobalErrorHandler.handle(e.reason);
});
```

### 3.3 请求去重与缓存
**工作量**: 2 天

```javascript
// src/services/requestCache.js
export class RequestCache {
  constructor() {
    this.cache = new Map();
    this.pending = new Map();
  }
  
  async fetch(key, fetcher, ttl = 60000) {
    // 1. 检查缓存
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    // 2. 检查是否有进行中的请求
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    
    // 3. 发起新请求
    const promise = fetcher().then(data => {
      this.cache.set(key, { data, timestamp: Date.now() });
      this.pending.delete(key);
      return data;
    }).catch(error => {
      this.pending.delete(key);
      throw error;
    });
    
    this.pending.set(key, promise);
    return promise;
  }
  
  clear(pattern) {
    if (pattern) {
      // 清除匹配的缓存
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }
}

// 使用示例
const requestCache = new RequestCache();

export async function fetchModels(provider, endpoint, apiKey) {
  const cacheKey = `models_${provider}_${endpoint}`;
  return requestCache.fetch(
    cacheKey,
    () => fetchModelsFromApi(provider, endpoint, apiKey),
    5 * 60 * 1000 // 5 分钟缓存
  );
}
```

---

## 阶段 4: 功能增强 (第 9-12 周)

**目标**: 提升用户体验

### 4.1 离线支持
**工作量**: 5 天

```javascript
// src/services/offlineStorage.js
export class OfflineStorage {
  constructor() {
    this.db = null;
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AihangSOP', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains('products')) {
          const store = db.createObjectStore('products', { keyPath: 'asin' });
          store.createIndex('site', 'site', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }
  
  async saveProduct(product) {
    const tx = this.db.transaction(['products'], 'readwrite');
    const store = tx.objectStore('products');
    await store.put({
      ...product,
      timestamp: Date.now()
    });
  }
  
  async getProduct(asin, site) {
    const tx = this.db.transaction(['products'], 'readonly');
    const store = tx.objectStore('products');
    return store.get(asin);
  }
}
```

### 4.2 数据导出/导入
**工作量**: 3 天

```javascript
// src/services/dataExport.js
export class DataExporter {
  static exportToJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this._download(blob, filename);
  }
  
  static exportToCSV(data, filename) {
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    this._download(blob, filename);
  }
  
  static exportToExcel(data, filename) {
    // 使用 xlsx 库
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, filename);
    });
  }
  
  static _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

### 4.3 用户偏好设置
**工作量**: 2 天

```javascript
// src/services/preferences.js
export class PreferencesService {
  static defaults = {
    theme: 'light',
    language: 'zh-CN',
    defaultSite: 'US',
    autoSave: true,
    notifications: true
  };
  
  static get(key) {
    const prefs = StorageService.get('user_preferences', this.defaults);
    return prefs[key];
  }
  
  static set(key, value) {
    const prefs = StorageService.get('user_preferences', this.defaults);
    prefs[key] = value;
    StorageService.set('user_preferences', prefs);
    
    // 触发变更事件
    eventBus.emit('preferences:changed', { key, value });
  }
  
  static reset() {
    StorageService.set('user_preferences', this.defaults);
  }
}

// 使用示例
PreferencesService.set('theme', 'dark');
const theme = PreferencesService.get('theme');
```

---

## 阶段 5: TypeScript 迁移 (第 13-24 周)

**目标**: 渐进式迁移到 TypeScript

### 5.1 配置 TypeScript
**工作量**: 1 天

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"],
      "@common/*": ["./src/common/*"],
      "@services/*": ["./src/services/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 5.2 迁移优先级
1. **第 1 批**: 类型定义和接口 (1 周)
   - `src/common/types/`
   - `src/common/interfaces/`

2. **第 2 批**: 服务层 (2 周)
   - `src/services/llmService.ts`
   - `src/services/httpService.ts`
   - `src/services/storageService.ts`

3. **第 3 批**: 工具函数 (2 周)
   - `src/common/utils/`

4. **第 4 批**: 核心模块 (4 周)
   - `src/common/BaseModule.ts`
   - `src/common/state/StateManager.ts`
   - `src/common/router/Router.ts`

5. **第 5 批**: 业务模块 (4 周)
   - `src/modules/app_center/`
   - `src/modules/sops/`

---

## 性能目标

### 当前性能 (预估)
- 首屏加载: ~3s
- LCP: ~3.5s
- FID: ~100ms
- CLS: ~0.1

### 目标性能
- 首屏加载: < 2s ✅
- LCP: < 2.5s ✅
- FID: < 100ms ✅
- CLS: < 0.1 ✅

### 优化收益预估
| 优化项 | 预计提升 |
|--------|---------|
| 代码分割 | -30% 加载时间 |
| 资源预加载 | -20% 首屏时间 |
| Service Worker | -50% 二次加载 |
| 图片优化 | -15% 总体积 |

---

## 资源投入

### 人力需求
- 前端开发: 2 人
- 测试工程师: 1 人
- DevOps: 0.5 人

### 时间分配
- 阶段 0: 3 天 (紧急)
- 阶段 1: 2 周
- 阶段 2: 2 周
- 阶段 3: 4 周
- 阶段 4: 4 周
- 阶段 5: 12 周

**总计**: 约 6 个月

---

## 风险管理

### 技术风险
1. **TypeScript 迁移复杂度**
   - 缓解: 渐进式迁移,保持 JS 兼容
   
2. **性能优化副作用**
   - 缓解: 每次优化后进行回归测试

3. **依赖注入重构影响**
   - 缓解: 保持向后兼容,逐步迁移

### 业务风险
1. **功能开发延期**
   - 缓解: 优化与新功能并行开发

2. **用户体验下降**
   - 缓解: 灰度发布,A/B 测试

---

## 成功指标

### 技术指标
- [ ] 测试覆盖率 > 80%
- [ ] 首屏加载 < 2s
- [ ] 错误率 < 0.1%
- [ ] TypeScript 覆盖率 > 60%

### 业务指标
- [ ] 用户留存率 +20%
- [ ] 页面跳出率 -30%
- [ ] 用户满意度 > 4.5/5

---

**路线图负责人**: 技术负责人  
**审查周期**: 每 2 周  
**调整机制**: 根据实际进度动态调整优先级
