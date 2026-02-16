# P0 测试体系改进计划

> 创建时间: 2026-02-14  
> 优先级: 🔴 P0 (立即执行)  
> 目标: 将测试覆盖率从 <30% 提升到 60%+

---

## 📊 当前状态

### 已有测试文件 (18个)
- ✅ actionRegistry.test.js
- ✅ AppModal.test.js
- ✅ BaseModule.test.js
- ✅ eventLogger.test.js
- ✅ httpService.test.js
- ✅ lazyLibs.test.js
- ✅ loggerService.test.js
- ✅ performanceService.test.js
- ✅ pluginLoader.test.js
- ✅ RouteGuard.test.js
- ✅ router.test.js
- ✅ security.test.js
- ✅ StateManager.test.js
- ✅ systemSettings.test.js
- ✅ typeGuards.test.js
- ✅ ui.test.js
- ✅ viewLoader.test.js
- ✅ app_center_overview.properties.test.js

### 测试覆盖率目标
| 时间 | 单元测试 | 集成测试 | E2E测试 |
|------|----------|----------|---------|
| 当前 | ~30% | 0% | 0% |
| 1周后 | 50% | 10% | 5% |
| 2周后 | 60% | 20% | 10% |

---

## 🎯 执行计划

### Phase 1: 补充核心模块单元测试 (1-2天)

#### 1.1 基础设施层测试 (目标90%)

**需要补充的测试**:
- ❌ Container.test.ts - DI容器测试
- ❌ EventBus.test.ts - 事件总线测试
- ❌ ConfigCenter.test.ts - 配置中心测试
- ❌ ServiceBootstrap.test.ts - 服务启动测试
- ❌ ModuleLoader.test.ts - 模块加载器测试
- ❌ RouteMiddleware.test.ts - 路由中间件测试
- ❌ ErrorHandler.test.ts - 错误处理器测试

**测试重点**:
- 依赖注入和解析
- 循环依赖检测
- 事件发布订阅
- 内存泄漏检测
- 配置加载和验证
- 服务初始化顺序
- 模块生命周期

#### 1.2 服务层测试 (目标80%)

**需要补充的测试**:
- ❌ llmService.test.ts - LLM服务测试
- ❌ storageService.test.ts - 存储服务测试
- ❌ errorService.test.ts - 错误服务测试
- ❌ monitoringService.test.ts - 监控服务测试
- ❌ PriorityRequestPool.test.ts - 优先级请求池测试

**测试重点**:
- HTTP请求重试机制
- LLM调用指数退避
- 存储加密和序列化
- 错误捕获和上报
- 性能指标收集

#### 1.3 工具函数测试 (目标90%)

**需要补充的测试**:
- ❌ xssFixer.test.ts - XSS修复工具测试
- ❌ secureStorage.test.ts - 安全存储测试
- ❌ LoadingManager.test.ts - 加载管理器测试

**测试重点**:
- XSS防护有效性
- 加密解密正确性
- 加载状态管理

---

### Phase 2: 集成测试建设 (2-3天)

#### 2.1 路由导航集成测试

**测试场景**:
```typescript
// tests/integration/routing.test.ts
describe('路由导航集成测试', () => {
  it('应该正确导航并更新状态', async () => {
    await router.navigate('sops_overview');
    expect(stateManager.get('ui.currentTab')).toBe('sops_overview');
  });
  
  it('应该触发路由守卫', async () => {
    const guard = vi.fn(() => true);
    routeGuard.register('test', guard);
    await router.navigate('sops_overview');
    expect(guard).toHaveBeenCalled();
  });
  
  it('应该加载对应模块', async () => {
    await router.navigate('sops_overview');
    // 验证模块已加载
  });
});
```

#### 2.2 模块加载集成测试

**测试场景**:
```typescript
// tests/integration/module-loading.test.ts
describe('模块加载集成测试', () => {
  it('应该按依赖顺序初始化服务', async () => {
    const bootstrap = new ServiceBootstrap();
    // 注册服务
    // 验证初始化顺序
  });
  
  it('应该正确加载和卸载模块', async () => {
    const loader = createModuleLoader({ ... });
    await loader.loadModule('test_module');
    // 验证模块已挂载
    loader.destroy();
    // 验证资源已清理
  });
});
```

#### 2.3 状态管理集成测试

**测试场景**:
```typescript
// tests/integration/state-management.test.ts
describe('状态管理集成测试', () => {
  it('应该正确订阅和通知', () => {
    const callback = vi.fn();
    stateManager.subscribe('ui.currentTab', callback);
    stateManager.set('ui.currentTab', 'new_tab');
    expect(callback).toHaveBeenCalledWith('new_tab', expect.any(String));
  });
  
  it('应该支持批量更新', () => {
    const callback = vi.fn();
    stateManager.subscribe('ui', callback);
    stateManager.batchUpdate({
      'ui.currentTab': 'tab1',
      'ui.currentDataTab': 'tab2'
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

---

### Phase 3: E2E测试框架搭建 (2-3天)

#### 3.1 安装Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

#### 3.2 配置Playwright

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true
  }
});
```

#### 3.3 编写E2E测试

**测试场景1: 用户导航流程**
```typescript
// tests/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';

test('用户可以导航到SOPs模块', async ({ page }) => {
  await page.goto('/');
  
  // 点击SOPs按钮
  await page.click('[data-context="sops"]');
  
  // 验证侧边栏显示
  await expect(page.locator('#sidebar-sops')).toBeVisible();
  
  // 点击子模块
  await page.click('[data-tab="sops_npi_tracker"]');
  
  // 验证内容加载
  await expect(page.locator('#sops_content_area')).toContainText('新品生命周期');
});
```

**测试场景2: 数据采集流程**
```typescript
// tests/e2e/scraper.spec.ts
test('用户可以采集Amazon数据', async ({ page }) => {
  await page.goto('/#app_center_scraper');
  
  // 输入ASIN
  await page.fill('#asin-input', 'B001TEST');
  
  // 点击采集按钮
  await page.click('#scrape-button');
  
  // 等待采集完成
  await expect(page.locator('.scrape-result')).toBeVisible({ timeout: 30000 });
  
  // 验证数据显示
  await expect(page.locator('.product-title')).not.toBeEmpty();
});
```

**测试场景3: 设置保存流程**
```typescript
// tests/e2e/settings.spec.ts
test('用户可以保存LLM配置', async ({ page }) => {
  await page.goto('/');
  
  // 打开设置
  await page.click('#settings-button');
  
  // 填写配置
  await page.fill('#api-key-input', 'sk-test123');
  await page.selectOption('#provider-select', 'openai');
  
  // 保存
  await page.click('#save-settings-button');
  
  // 验证成功提示
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

---

## 📋 测试编写规范

### 单元测试模板

```typescript
// tests/unit/example.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MyService } from '@/services/MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  afterEach(() => {
    service.destroy();
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该正确初始化', () => {
      expect(service).toBeDefined();
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('核心功能', () => {
    it('应该正确处理正常情况', async () => {
      const result = await service.doSomething('test');
      expect(result).toBe('expected');
    });

    it('应该正确处理错误情况', async () => {
      await expect(service.doSomething(null)).rejects.toThrow();
    });
  });

  describe('边界条件', () => {
    it('应该处理空输入', () => {
      expect(() => service.doSomething('')).toThrow();
    });

    it('应该处理超大输入', () => {
      const largeInput = 'x'.repeat(10000);
      expect(() => service.doSomething(largeInput)).not.toThrow();
    });
  });
});
```

### 集成测试模板

```typescript
// tests/integration/example.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('功能集成测试', () => {
  beforeAll(async () => {
    // 初始化测试环境
  });

  afterAll(async () => {
    // 清理测试环境
  });

  it('应该完成完整流程', async () => {
    // 1. 准备数据
    // 2. 执行操作
    // 3. 验证结果
    // 4. 清理数据
  });
});
```

---

## 🚀 执行步骤

### 第1天: 基础设施层测试

```bash
# 1. 创建测试文件
mkdir -p tests/unit/common

# 2. 编写测试
# - Container.test.ts
# - EventBus.test.ts
# - ConfigCenter.test.ts

# 3. 运行测试
npm run test tests/unit/common

# 4. 检查覆盖率
npm run test:coverage
```

### 第2天: 服务层测试

```bash
# 1. 创建测试文件
mkdir -p tests/unit/services

# 2. 编写测试
# - llmService.test.ts
# - storageService.test.ts
# - errorService.test.ts

# 3. 运行测试
npm run test tests/unit/services

# 4. 检查覆盖率
npm run test:coverage
```

### 第3-4天: 集成测试

```bash
# 1. 创建测试目录
mkdir -p tests/integration

# 2. 编写集成测试
# - routing.test.ts
# - module-loading.test.ts
# - state-management.test.ts

# 3. 运行测试
npm run test tests/integration

# 4. 检查覆盖率
npm run test:coverage
```

### 第5-7天: E2E测试

```bash
# 1. 安装Playwright
npm install -D @playwright/test
npx playwright install

# 2. 创建配置文件
# playwright.config.ts

# 3. 编写E2E测试
mkdir -p tests/e2e
# - navigation.spec.ts
# - scraper.spec.ts
# - settings.spec.ts

# 4. 运行E2E测试
npx playwright test

# 5. 查看报告
npx playwright show-report
```

---

## 📊 进度跟踪

### 第1周目标
- [ ] 基础设施层测试覆盖率 > 80%
- [ ] 服务层测试覆盖率 > 70%
- [ ] 工具函数测试覆盖率 > 85%
- [ ] 总体单元测试覆盖率 > 50%

### 第2周目标
- [ ] 集成测试覆盖核心流程
- [ ] E2E测试覆盖关键用户路径
- [ ] 总体测试覆盖率 > 60%
- [ ] CI/CD集成完成

---

## 🎯 成功指标

### 量化指标
- ✅ 单元测试覆盖率 ≥ 60%
- ✅ 集成测试 ≥ 10个场景
- ✅ E2E测试 ≥ 5个关键流程
- ✅ 测试执行时间 < 5分钟
- ✅ 所有测试通过率 100%

### 质量指标
- ✅ 核心功能有完整测试
- ✅ 边界条件有覆盖
- ✅ 错误处理有验证
- ✅ 测试代码可维护

---

## 📚 参考资源

- [Vitest文档](https://vitest.dev/)
- [Playwright文档](https://playwright.dev/)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**创建时间**: 2026-02-14  
**负责人**: 开发团队  
**预计完成**: 2周内  
**文档版本**: v1.0
