# 系统稳定性优化 - 测试编写指南

## 文档信息

**版本：** 1.0  
**最后更新：** 2025-01（正文历史）；2026-07-26 增加 SSOT 指向  
**适用范围：** 测试写法参考  

> **⚠️ 策略权威已迁移：** 测什么、风险分级、门禁命令 → **[docs/TESTING_STRATEGY.md](../docs/TESTING_STRATEGY.md)**。  
> 本文仅作编写手册/示例；与 TESTING_STRATEGY 冲突时以 STRATEGY 为准。

---

## 概述

本指南提供了编写高质量测试的最佳实践和具体方法，涵盖单元测试、集成测试、E2E 测试、性能测试和视觉回归测试。

### 测试金字塔

```
       /\
      /E2E\      10% - 端到端测试（慢但全面）
     /------\
    /集成测试\    20% - 集成测试（中等速度）
   /----------\
  /  单元测试  \  70% - 单元测试（快速且隔离）
 /--------------\
```

### 测试原则

1. **快速反馈** - 测试应该快速运行，提供即时反馈
2. **可靠性** - 测试结果应该稳定，不应该随机失败
3. **可维护性** - 测试代码应该清晰易懂，易于维护
4. **独立性** - 测试之间不应该相互依赖
5. **完整性** - 测试应该覆盖所有关键功能和边界条件

### 测试覆盖率目标

| 测试类型 | 覆盖率目标 | 说明 |
|---------|-----------|------|
| 单元测试 | ≥ 80% | 覆盖所有核心逻辑 |
| 集成测试 | 100% 关键流程 | 覆盖所有模块间交互 |
| E2E 测试 | 100% 核心路径 | 覆盖所有用户关键操作 |
| 性能测试 | 所有关键页面 | 确保性能达标 |
| 视觉测试 | 所有关键页面 | 防止 UI 破坏 |

---

## 目录

1. [测试环境配置](#测试环境配置)
2. [单元测试](#单元测试)
3. [集成测试](#集成测试)
4. [E2E 测试](#e2e-测试)
5. [性能测试](#性能测试)
6. [视觉回归测试](#视觉回归测试)
7. [构建测试](#构建测试)
8. [启动测试](#启动测试)
9. [测试工具和辅助函数](#测试工具和辅助函数)
10. [测试最佳实践](#测试最佳实践)
11. [常见问题](#常见问题)

---

## 测试环境配置

### 1. 安装测试依赖

```bash
# 安装 Vitest（单元测试框架）
npm install --save-dev vitest

# 安装 Playwright（E2E 测试框架）
npm install --save-dev @playwright/test

# 安装测试工具库
npm install --save-dev @testing-library/dom
npm install --save-dev @testing-library/user-event

# 安装 Lighthouse（性能测试）
npm install --save-dev @lhci/cli

# 安装图像对比工具（视觉回归测试）
npm install --save-dev pixelmatch
npm install --save-dev pngjs
```

### 2. 配置 Vitest

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### 3. 配置 Playwright

创建 `playwright.config.ts`：

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
```

### 4. 配置测试脚本

在 `package.json` 中添加测试脚本：

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:visual": "vitest --run tests/visual",
    "test:build": "vitest --run tests/build",
    "test:startup": "vitest --run tests/startup",
    "lighthouse": "lhci autorun"
  }
}
```

---

## 单元测试

### 1. 单元测试基础

单元测试用于测试独立的函数、类或模块，确保它们按预期工作。

#### 测试文件命名

- 测试文件应与被测试文件同名，添加 `.test.ts` 后缀
- 测试文件应放在 `tests/unit/` 目录下

```
src/common/infrastructure/SafeModuleLoader.ts
tests/unit/SafeModuleLoader.test.ts
```

#### 基本测试结构

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';

describe('SafeModuleLoader', () => {
  let loader: SafeModuleLoader;
  let container: HTMLElement;
  
  beforeEach(() => {
    // 每个测试前执行
    loader = SafeModuleLoader.getInstance();
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    // 每个测试后执行
    document.body.removeChild(container);
    loader.clearCache();
  });
  
  it('should load module successfully', async () => {
    // 测试逻辑
    const result = await loader.loadModule(container, '/test-module.ts');
    
    // 断言
    expect(result.success).toBe(true);
    expect(result.loadTime).toBeGreaterThan(0);
  });
});
```

### 2. 测试 SafeModuleLoader

#### 测试模块加载成功

```typescript
describe('SafeModuleLoader - Module Loading', () => {
  it('should load module successfully', async () => {
    const result = await safeModuleLoader.loadModule(
      container,
      '/src/modules/test/index.ts'
    );
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.loadTime).toBeGreaterThan(0);
  });
  
  it('should cache loaded modules', async () => {
    // 第一次加载
    const result1 = await safeModuleLoader.loadModule(
      container,
      '/src/modules/test/index.ts'
    );
    
    // 第二次加载（应该使用缓存）
    const result2 = await safeModuleLoader.loadModule(
      container,
      '/src/modules/test/index.ts'
    );
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result2.loadTime).toBeLessThan(result1.loadTime);
  });
});
```

#### 测试错误处理

```typescript
describe('SafeModuleLoader - Error Handling', () => {
  it('should handle network errors', async () => {
    const result = await safeModuleLoader.loadModule(
      container,
      '/non-existent-module.ts',
      { retryCount: 1 }
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toBeInstanceOf(Error);
  });
  
  it('should retry on failure', async () => {
    let attempts = 0;
    
    // Mock fetch to fail first 2 times
    global.fetch = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve(new Response('module content'));
    });
    
    const result = await safeModuleLoader.loadModule(
      container,
      '/test-module.ts',
      { retryCount: 3 }
    );
    
    expect(result.success).toBe(true);
    expect(result.retryAttempts).toBe(2);
  });
  
  it('should timeout after specified duration', async () => {
    // Mock a slow loading module
    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve(new Response('content')), 10000);
      });
    });
    
    const result = await safeModuleLoader.loadModule(
      container,
      '/slow-module.ts',
      { timeout: 1000 }
    );
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('timeout');
  });
});
```

#### 测试降级 UI

```typescript
describe('SafeModuleLoader - Fallback UI', () => {
  it('should render default fallback UI on error', async () => {
    const result = await safeModuleLoader.loadModule(
      container,
      '/non-existent.ts'
    );
    
    expect(result.success).toBe(false);
    expect(container.innerHTML).toContain('加载失败');
    expect(container.querySelector('button')).toBeDefined();
  });
  
  it('should render custom fallback UI', async () => {
    const customUI = '<div class="custom-error">Custom Error</div>';
    
    const result = await safeModuleLoader.loadModule(
      container,
      '/non-existent.ts',
      { fallbackUI: customUI }
    );
    
    expect(result.success).toBe(false);
    expect(container.innerHTML).toContain('Custom Error');
    expect(container.querySelector('.custom-error')).toBeDefined();
  });
});
```

### 3. 测试 AlpineRegistry

#### 测试组件注册

```typescript
import { getAlpineRegistry } from '@/common/infrastructure/AlpineRegistry';

describe('AlpineRegistry - Component Registration', () => {
  let registry: AlpineRegistry;
  
  beforeEach(() => {
    registry = getAlpineRegistry();
    // Mock Alpine
    global.Alpine = {
      data: vi.fn(),
      start: vi.fn()
    };
  });
  
  it('should register component', () => {
    const factory = () => ({ name: 'test' });
    
    registry.register('testComponent', factory);
    
    expect(registry.isComponentRegistered('testComponent')).toBe(true);
  });
  
  it('should register multiple components', () => {
    registry.register('component1', () => ({}));
    registry.register('component2', () => ({}));
    registry.register('component3', () => ({}));
    
    const registered = registry.getRegisteredComponents();
    
    expect(registered).toContain('component1');
    expect(registered).toContain('component2');
    expect(registered).toContain('component3');
  });
});
```

#### 测试依赖解析

```typescript
describe('AlpineRegistry - Dependency Resolution', () => {
  it('should resolve dependencies in correct order', () => {
    registry.register('serviceA', () => ({}));
    registry.register('serviceB', () => ({}), ['serviceA']);
    registry.register('serviceC', () => ({}), ['serviceB']);
    
    registry.init();
    
    // 验证注册顺序：serviceA -> serviceB -> serviceC
    const calls = (global.Alpine.data as any).mock.calls;
    expect(calls[0][0]).toBe('serviceA');
    expect(calls[1][0]).toBe('serviceB');
    expect(calls[2][0]).toBe('serviceC');
  });
  
  it('should detect circular dependencies', () => {
    registry.register('componentA', () => ({}), ['componentB']);
    registry.register('componentB', () => ({}), ['componentA']);
    
    expect(() => registry.init()).toThrow('循环依赖');
  });
});
```

### 4. 测试 SafeRenderer

#### 测试 HTML 转义

```typescript
import { safeRenderer } from '@/common/infrastructure/SafeRenderer';

describe('SafeRenderer - HTML Escaping', () => {
  let container: HTMLElement;
  
  beforeEach(() => {
    container = document.createElement('div');
  });
  
  it('should escape HTML special characters', () => {
    const malicious = '<script>alert("XSS")</script>';
    
    safeRenderer.renderDynamic(
      container,
      '{{content}}',
      { content: malicious }
    );
    
    expect(container.innerHTML).not.toContain('<script>');
    expect(container.innerHTML).toContain('&lt;script&gt;');
  });
  
  it('should escape all dangerous characters', () => {
    const dangerous = '& < > " \' /';
    
    const escaped = safeRenderer.escapeHtml(dangerous);
    
    expect(escaped).toBe('&amp; &lt; &gt; &quot; &#x27; &#x2F;');
  });
});
```

#### 测试列表渲染

```typescript
describe('SafeRenderer - List Rendering', () => {
  it('should render list efficiently', () => {
    const items = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' }
    ];
    
    safeRenderer.renderList(
      container,
      items,
      (item) => `<div>${item.name}</div>`
    );
    
    expect(container.children.length).toBe(3);
    expect(container.children[0].textContent).toBe('Item 1');
  });
  
  it('should show empty message for empty list', () => {
    safeRenderer.renderList(
      container,
      [],
      (item) => `<div>${item.name}</div>`,
      { emptyMessage: '暂无数据' }
    );
    
    expect(container.textContent).toContain('暂无数据');
  });
});
```

### 5. 测试 StateManager

```typescript
import { stateManager } from '@/common/infrastructure/StateManager';

describe('StateManager', () => {
  beforeEach(() => {
    stateManager.clear();
  });
  
  it('should get and set analysis report', () => {
    const report = {
      marketplace: 'US',
      results: []
    };
    
    stateManager.setAnalysisReport(report);
    const retrieved = stateManager.getAnalysisReport();
    
    expect(retrieved).toEqual(report);
  });
});
```

  it('should subscribe to state changes', () => {
    const callback = vi.fn();
    
    const unsubscribe = stateManager.subscribe(
      (state) => state.analysisReport,
      callback
    );
    
    stateManager.setAnalysisReport({ marketplace: 'US', results: [] });
    
    expect(callback).toHaveBeenCalled();
    
    unsubscribe();
  });
});
```

---

## 集成测试

### 1. 集成测试基础

集成测试用于测试多个模块之间的交互，确保它们能够正确协同工作。

#### 测试模块加载和组件注册

```typescript
describe('Integration - Module Loading and Component Registration', () => {
  it('should load module and register Alpine component', async () => {
    // 1. 注册组件
    const registry = getAlpineRegistry();
    registry.register('testPanel', () => ({
      message: 'Hello'
    }));
    registry.init();
    
    // 2. 加载模块
    const container = document.createElement('div');
    const result = await safeModuleLoader.loadModule(
      container,
      '/test-module.ts'
    );
    
    // 3. 验证
    expect(result.success).toBe(true);
    expect(registry.isComponentRegistered('testPanel')).toBe(true);
  });
});
```

#### 测试状态管理和渲染

```typescript
describe('Integration - State Management and Rendering', () => {
  it('should update UI when state changes', () => {
    const container = document.createElement('div');
    
    // 订阅状态变化
    stateManager.subscribe(
      (state) => state.analysisReport,
      (report) => {
        safeRenderer.renderDynamic(
          container,
          '<div>{{marketplace}}</div>',
          { marketplace: report.marketplace }
        );
      }
    );
    
    // 更新状态
    stateManager.setAnalysisReport({
      marketplace: 'US',
      results: []
    });
    
    // 验证 UI 更新
    expect(container.textContent).toContain('US');
  });
});
```

---

## E2E 测试

### 1. E2E 测试基础

E2E 测试模拟真实用户操作，测试完整的用户流程。

#### Page Object 模式

创建 Page Object 类来封装页面交互：

```typescript
// tests/e2e/pages/BasePage.ts
import { Page } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}
  
  async navigate(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }
  
  async waitForElement(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout });
  }
  
  async clickButton(text: string) {
    await this.page.click(`button:has-text("${text}")`);
  }
}
```

#### 创建具体页面类

```typescript
// tests/e2e/pages/PromptlabPage.ts
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class PromptlabPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }
  
  async navigate() {
    await super.navigate('/app_center/promptlab');
  }
  
  async fillProductDNA(data: {
    targetMarket: string;
    tier1Keywords: string;
    tier2Keywords: string;
  }) {
    await this.page.selectOption('#lab-target-market', data.targetMarket);
    await this.page.fill('#lab-keywords-tier1', data.tier1Keywords);
    await this.page.fill('#lab-keywords-tier2', data.tier2Keywords);
  }
  
  async generateListingPrompt() {
    await this.page.click('#btn-generate-prompt');
    await this.page.waitForSelector('#final-prompt-output:not([value=""])');
  }
  
  async getGeneratedPrompt(): Promise<string> {
    return await this.page.inputValue('#final-prompt-output');
  }
  
  async copyPrompt() {
    await this.page.click('[data-action="amz_copyMasterPrompt"]');
  }
}
```

#### 编写 E2E 测试

```typescript
// tests/e2e/promptlab.spec.ts
import { test, expect } from '@playwright/test';
import { PromptlabPage } from './pages/PromptlabPage';

test.describe('Promptlab Module', () => {
  let promptlab: PromptlabPage;
  
  test.beforeEach(async ({ page }) => {
    promptlab = new PromptlabPage(page);
    await promptlab.navigate();
  });
  
  test('应该成功生成 Listing Prompt', async () => {
    await promptlab.fillProductDNA({
      targetMarket: 'English',
      tier1Keywords: 'wireless earbuds',
      tier2Keywords: 'bluetooth 5.0, noise cancelling'
    });
    
    await promptlab.generateListingPrompt();
    
    const prompt = await promptlab.getGeneratedPrompt();
    expect(prompt).toContain('wireless earbuds');
    expect(prompt.length).toBeGreaterThan(100);
  });
  
  test('应该能够复制 Prompt 到剪贴板', async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await promptlab.fillProductDNA({
      targetMarket: 'English',
      tier1Keywords: 'test product',
      tier2Keywords: 'test keywords'
    });
    
    await promptlab.generateListingPrompt();
    await promptlab.copyPrompt();
    
    // 验证复制成功提示
    await expect(promptlab.page.locator('.toast')).toContainText('已复制');
  });
});
```

### 2. E2E 测试最佳实践

#### 使用数据驱动测试

```typescript
const testCases = [
  { market: 'English', keywords: 'wireless earbuds', expected: 'wireless' },
  { market: 'Spanish', keywords: 'auriculares', expected: 'auriculares' },
  { market: 'German', keywords: 'kopfhörer', expected: 'kopfhörer' }
];

testCases.forEach(({ market, keywords, expected }) => {
  test(`应该支持 ${market} 市场`, async () => {
    await promptlab.fillProductDNA({
      targetMarket: market,
      tier1Keywords: keywords,
      tier2Keywords: ''
    });
    
    await promptlab.generateListingPrompt();
    const prompt = await promptlab.getGeneratedPrompt();
    
    expect(prompt).toContain(expected);
  });
});
```

#### 处理异步操作

```typescript
test('应该等待异步操作完成', async ({ page }) => {
  await page.click('#start-analysis');
  
  // 等待加载指示器出现
  await page.waitForSelector('.loading');
  
  // 等待加载指示器消失
  await page.waitForSelector('.loading', { state: 'hidden' });
  
  // 等待结果出现
  await page.waitForSelector('.analysis-result');
  
  const result = await page.textContent('.analysis-result');
  expect(result).toBeTruthy();
});
```

#### 处理网络请求

```typescript
test('应该正确处理 API 请求', async ({ page }) => {
  // 监听网络请求
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/analysis') && response.status() === 200
  );
  
  await page.click('#start-analysis');
  
  const response = await responsePromise;
  const data = await response.json();
  
  expect(data.success).toBe(true);
});
```

---

## 性能测试

### 1. Lighthouse 性能测试

#### 配置 Lighthouse

创建 `lighthouserc.js`：

```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:5173/',
        'http://localhost:5173/app_center/promptlab',
        'http://localhost:5173/app_center/ai_analysis',
        'http://localhost:5173/app_center/scraper'
      ],
      numberOfRuns: 3
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

#### 编写性能测试

```typescript
// tests/performance/lighthouse.test.ts
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Performance Tests', () => {
  test('应该满足性能指标', async () => {
    // 运行 Lighthouse
    const output = execSync('npx lhci autorun --config=lighthouserc.js', {
      encoding: 'utf-8'
    });
    
    // 验证输出
    expect(output).toContain('All assertions passed');
  });
});
```

### 2. 自定义性能测试

```typescript
// tests/performance/load-time.test.ts
import { test, expect } from '@playwright/test';

test.describe('Load Time Tests', () => {
  test('首页加载时间应小于 2 秒', async ({ page }) => {
    const start = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(2000);
  });
  
  test('模块加载时间应小于 1 秒', async ({ page }) => {
    await page.goto('/app_center/promptlab');
    
    const start = Date.now();
    await page.waitForSelector('#promptlab-panel');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
  });
});
```

---

## 视觉回归测试

### 1. 视觉测试基础

视觉回归测试用于检测 UI 的意外变化。

#### 创建基准截图

```typescript
// tests/visual/visual.test.ts
import { test, expect } from '@playwright/test';
import { compareImages } from './helpers/image-compare';

test.describe('Visual Regression Tests', () => {
  test('首页视觉无变化', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 截图
    const screenshot = await page.screenshot();
    
    // 与基准图对比
    const diff = await compareImages(
      screenshot,
      'tests/visual/snapshots/homepage.png'
    );
    
    expect(diff.percentage).toBeLessThan(0.1); // 差异小于 0.1%
  });
});
```

#### 图像对比工具

```typescript
// tests/visual/helpers/image-compare.ts
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';

export async function compareImages(
  actualBuffer: Buffer,
  baselinePath: string
): Promise<{ percentage: number; diffPath?: string }> {
  const actual = PNG.sync.read(actualBuffer);
  
  if (!fs.existsSync(baselinePath)) {
    // 基准图不存在，创建新的
    fs.writeFileSync(baselinePath, actualBuffer);
    return { percentage: 0 };
  }
  
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const { width, height } = actual;
  const diff = new PNG({ width, height });
  
  const numDiffPixels = pixelmatch(
    actual.data,
    baseline.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );
  
  const percentage = (numDiffPixels / (width * height)) * 100;
  
  if (percentage > 0.1) {
    // 保存差异图
    const diffPath = baselinePath.replace('.png', '-diff.png');
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    return { percentage, diffPath };
  }
  
  return { percentage };
}
```

### 2. 响应式测试

```typescript
test.describe('Responsive Visual Tests', () => {
  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 }
  ];
  
  viewports.forEach(({ name, width, height }) => {
    test(`${name} 视图应正确显示`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      
      const screenshot = await page.screenshot();
      const diff = await compareImages(
        screenshot,
        `tests/visual/snapshots/homepage-${name.toLowerCase()}.png`
      );
      
      expect(diff.percentage).toBeLessThan(0.1);
    });
  });
});
```

---

## 构建测试

### 1. 构建流程测试

```typescript
// tests/build/build.test.ts
import { test, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Build Tests', () => {
  test('TypeScript 编译应无错误', () => {
    expect(() => {
      execSync('npx tsc --noEmit', { encoding: 'utf-8' });
    }).not.toThrow();
  });
  
  test('Vite 构建应成功', () => {
    const output = execSync('npm run build', { encoding: 'utf-8' });
    
    expect(output).toContain('built in');
    expect(output).not.toContain('error');
  });
  
  test('构建产物应完整', () => {
    const distPath = path.resolve(__dirname, '../../dist');
    
    expect(fs.existsSync(distPath)).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'assets'))).toBe(true);
  });
});
```

  test('构建产物大小应在阈值内', () => {
    const distPath = path.resolve(__dirname, '../../dist');
    const stats = fs.statSync(distPath);
    const sizeInMB = getDirectorySize(distPath) / (1024 * 1024);
    
    expect(sizeInMB).toBeLessThan(10); // 小于 10MB
  });
});

function getDirectorySize(dirPath: string): number {
  let size = 0;
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  });
  
  return size;
}
```

---

## 启动测试

### 1. 应用启动测试

```typescript
// tests/startup/startup.test.ts
import { test, expect } from '@playwright/test';

test.describe('Startup Tests', () => {
  test('应用应成功启动', async ({ page }) => {
    const errors: string[] = [];
    
    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 验证无 JS 错误
    expect(errors).toHaveLength(0);
  });
  
  test('所有服务应正确初始化', async ({ page }) => {
    await page.goto('/');
    
    // 检查 Alpine.js
    const alpineLoaded = await page.evaluate(() => {
      return typeof window.Alpine !== 'undefined';
    });
    expect(alpineLoaded).toBe(true);
    
    // 检查 Zustand store
    const storeLoaded = await page.evaluate(() => {
      return typeof window.useAppStore !== 'undefined';
    });
    expect(storeLoaded).toBe(true);
  });
  
  test('首屏渲染时间应小于 2 秒', async ({ page }) => {
    const start = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('body');
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
```

---

## 测试工具和辅助函数

### 1. 测试数据工厂

```typescript
// tests/helpers/fixtures.ts
export const fixtures = {
  analysisReport: (overrides?: Partial<AnalysisReport>): AnalysisReport => ({
    marketplace: 'US',
    results: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0'
    },
    ...overrides
  }),
  
  scrapedData: (overrides?: Partial<ScrapedData>): ScrapedData => ({
    asin: 'B08N5WRWNW',
    title: 'Test Product',
    price: 29.99,
    rating: 4.5,
    reviewCount: 1000,
    ...overrides
  }),
  
  userProductProfile: (overrides?: Partial<UserProductProfile>): UserProductProfile => ({
    targetMarket: 'English',
    keywordsTier1: 'test keyword',
    keywordsTier2: 'test long tail',
    productType: 'Electronics',
    ...overrides
  })
};
```

### 2. Mock 服务

```typescript
// tests/helpers/mocks.ts
export const mocks = {
  localStorage: {
    store: new Map<string, string>(),
    
    getItem: (key: string) => mocks.localStorage.store.get(key) || null,
    
    setItem: (key: string, value: string) => {
      mocks.localStorage.store.set(key, value);
    },
    
    removeItem: (key: string) => {
      mocks.localStorage.store.delete(key);
    },
    
    clear: () => {
      mocks.localStorage.store.clear();
    }
  },
  
  fetch: (url: string, options?: RequestInit) => {
    return Promise.resolve(new Response(JSON.stringify({ success: true })));
  }
};
```

### 3. 测试辅助函数

```typescript
// tests/helpers/utils.ts
export const testUtils = {
  // 等待条件满足
  waitFor: async (
    condition: () => boolean,
    timeout = 5000
  ): Promise<void> => {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },
  
  // 等待元素出现
  waitForElement: async (
    selector: string,
    timeout = 5000
  ): Promise<HTMLElement> => {
    await testUtils.waitFor(
      () => document.querySelector(selector) !== null,
      timeout
    );
    return document.querySelector(selector) as HTMLElement;
  },
  
  // 清理 DOM
  cleanupDOM: () => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  },
  
  // 模拟用户输入
  simulateInput: (element: HTMLInputElement, value: string) => {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  },
  
  // 模拟点击
  simulateClick: (element: HTMLElement) => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
};
```

---

## 测试最佳实践

### 1. 测试命名规范

```typescript
// ✅ 推荐：描述性测试名称
test('应该在模块加载失败时显示降级 UI', async () => {
  // ...
});

test('应该在用户输入包含脚本标签时进行转义', () => {
  // ...
});

// ❌ 不推荐：无意义的测试名称
test('test1', () => {
  // ...
});

test('works', () => {
  // ...
});
```

### 2. 测试结构

使用 AAA 模式（Arrange-Act-Assert）：

```typescript
test('应该正确计算总价', () => {
  // Arrange - 准备测试数据
  const items = [
    { price: 10, quantity: 2 },
    { price: 20, quantity: 1 }
  ];
  
  // Act - 执行被测试的操作
  const total = calculateTotal(items);
  
  // Assert - 验证结果
  expect(total).toBe(40);
});
```

### 3. 测试独立性

```typescript
// ✅ 推荐：每个测试独立
describe('Calculator', () => {
  test('应该正确加法', () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });
  
  test('应该正确减法', () => {
    const result = subtract(5, 3);
    expect(result).toBe(2);
  });
});

// ❌ 不推荐：测试之间有依赖
describe('Calculator', () => {
  let result: number;
  
  test('应该正确加法', () => {
    result = add(2, 3);
    expect(result).toBe(5);
  });
  
  test('应该正确减法', () => {
    // 依赖上一个测试的结果
    result = subtract(result, 3);
    expect(result).toBe(2);
  });
});
```

### 4. 测试边界条件

```typescript
describe('processData', () => {
  test('应该处理空数组', () => {
    expect(processData([])).toEqual([]);
  });
  
  test('应该处理 null', () => {
    expect(processData(null)).toEqual([]);
  });
  
  test('应该处理 undefined', () => {
    expect(processData(undefined)).toEqual([]);
  });
  
  test('应该处理大数组', () => {
    const largeArray = Array(10000).fill({ id: 1 });
    expect(processData(largeArray)).toBeDefined();
  });
});
```

### 5. 避免测试实现细节

```typescript
// ✅ 推荐：测试行为
test('应该显示用户名称', () => {
  const container = document.createElement('div');
  renderUserCard(container, { name: 'John' });
  
  expect(container.textContent).toContain('John');
});

// ❌ 不推荐：测试实现细节
test('应该调用 getUserName 方法', () => {
  const spy = vi.spyOn(component, 'getUserName');
  component.render();
  
  expect(spy).toHaveBeenCalled();
});
```

### 6. 使用有意义的断言消息

```typescript
// ✅ 推荐：提供清晰的错误消息
expect(result.success, '模块加载应该成功').toBe(true);
expect(items.length, '应该返回 3 个项目').toBe(3);

// ❌ 不推荐：无错误消息
expect(result.success).toBe(true);
expect(items.length).toBe(3);
```

### 7. 清理测试资源

```typescript
describe('Component Tests', () => {
  let container: HTMLElement;
  let unsubscribe: () => void;
  
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    // 清理 DOM
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // 取消订阅
    if (unsubscribe) {
      unsubscribe();
    }
    
    // 清理状态
    stateManager.clear();
  });
});
```

### 8. 使用测试覆盖率

```bash
# 运行测试并生成覆盖率报告
npm run test:coverage

# 查看覆盖率报告
open coverage/index.html
```

确保关键代码的覆盖率达标：

- 核心业务逻辑：≥ 90%
- 工具函数：≥ 80%
- UI 组件：≥ 70%

---

## 常见问题

### Q1: 测试运行很慢怎么办？

**A:** 优化测试性能：

1. **并行运行测试**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    threads: true,
    maxThreads: 4
  }
});
```

2. **只运行相关测试**
```bash
# 只运行特定文件
npm run test SafeModuleLoader.test.ts

# 只运行匹配的测试
npm run test -- --grep "SafeModuleLoader"
```

3. **使用测试缓存**
```bash
# Vitest 自动缓存测试结果
npm run test
```

### Q2: 测试随机失败怎么办？

**A:** 排查不稳定测试：

1. **检查异步操作**
```typescript
// ❌ 错误：没有等待异步操作
test('test', () => {
  loadData();
  expect(data).toBeDefined(); // 可能失败
});

// ✅ 正确：等待异步操作
test('test', async () => {
  await loadData();
  expect(data).toBeDefined();
});
```

2. **检查测试独立性**
```typescript
// 确保每个测试都清理状态
afterEach(() => {
  stateManager.clear();
  safeModuleLoader.clearCache();
});
```

3. **增加超时时间**
```typescript
test('slow test', async () => {
  // ...
}, { timeout: 10000 }); // 10 秒超时
```

### Q3: 如何 Mock 外部依赖？

**A:** 使用 Vitest 的 Mock 功能：

```typescript
import { vi } from 'vitest';

// Mock 模块
vi.mock('@/services/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' })
}));

// Mock 全局对象
global.fetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ success: true }))
);

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: mocks.localStorage
});
```

### Q4: 如何测试错误场景？

**A:** 使用 `expect().toThrow()` 或 `try-catch`：

```typescript
test('应该抛出错误', () => {
  expect(() => {
    processInvalidData(null);
  }).toThrow('Invalid data');
});

test('应该处理异步错误', async () => {
  await expect(async () => {
    await loadInvalidModule();
  }).rejects.toThrow('Module not found');
});
```

### Q5: 如何调试测试？

**A:** 多种调试方法：

1. **使用 console.log**
```typescript
test('debug test', () => {
  console.log('Current state:', stateManager.getSnapshot());
  // ...
});
```

2. **使用 Vitest UI**
```bash
npm run test:ui
```

3. **使用 VS Code 调试器**
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

### Q6: 如何测试私有方法？

**A:** 不要直接测试私有方法，而是通过公共 API 测试：

```typescript
// ❌ 不推荐：测试私有方法
test('private method', () => {
  const result = (instance as any)._privateMethod();
  expect(result).toBe(true);
});

// ✅ 推荐：通过公共 API 测试
test('public method', () => {
  const result = instance.publicMethod();
  expect(result).toBe(true);
  // 私有方法的行为通过公共方法体现
});
```

### Q7: 如何处理测试数据？

**A:** 使用测试数据工厂：

```typescript
// tests/helpers/fixtures.ts
export const createTestUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});

// 使用
test('test', () => {
  const user = createTestUser({ name: 'John' });
  expect(user.name).toBe('John');
});
```

---

## 测试检查清单

### 单元测试检查清单

- [ ] 所有核心函数都有测试
- [ ] 测试覆盖率 ≥ 80%
- [ ] 测试了正常情况
- [ ] 测试了边界条件（空值、null、undefined）
- [ ] 测试了错误情况
- [ ] 测试独立，不依赖其他测试
- [ ] 测试名称清晰描述测试内容
- [ ] 使用了 AAA 模式（Arrange-Act-Assert）
- [ ] 清理了测试资源

### E2E 测试检查清单

- [ ] 使用了 Page Object 模式
- [ ] 测试了核心用户流程
- [ ] 等待了异步操作完成
- [ ] 处理了网络请求
- [ ] 测试了错误场景
- [ ] 截图保存在失败时
- [ ] 测试在 CI 环境可运行

### 性能测试检查清单

- [ ] 配置了 Lighthouse
- [ ] 测试了所有关键页面
- [ ] 验证了 Core Web Vitals
- [ ] 设置了性能阈值
- [ ] 生成了性能报告

### 视觉测试检查清单

- [ ] 创建了基准截图
- [ ] 测试了所有关键页面
- [ ] 测试了响应式布局
- [ ] 设置了差异阈值
- [ ] 保存了差异图

---

## 相关资源

### 文档

- [Vitest 官方文档](https://vitest.dev/)
- [Playwright 官方文档](https://playwright.dev/)
- [Testing Library 文档](https://testing-library.com/)
- [Lighthouse CI 文档](https://github.com/GoogleChrome/lighthouse-ci)

### 工具

- [Vitest UI](https://vitest.dev/guide/ui.html) - 可视化测试界面
- [Playwright Inspector](https://playwright.dev/docs/inspector) - E2E 测试调试工具
- [Coverage Report](https://vitest.dev/guide/coverage.html) - 测试覆盖率报告

### 示例

- [单元测试示例](./unit/)
- [E2E 测试示例](./e2e/)
- [性能测试示例](./performance/)
- [视觉测试示例](./visual/)

---

## 更新日志

### v1.0.0 (2025-01-XX)
- ✅ 初始版本
- ✅ 单元测试指南
- ✅ 集成测试指南
- ✅ E2E 测试指南
- ✅ 性能测试指南
- ✅ 视觉回归测试指南
- ✅ 测试最佳实践
- ✅ 常见问题解答

---

## 许可证

MIT License
