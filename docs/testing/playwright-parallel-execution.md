# Playwright 并行执行配置指南

## 概述

本文档说明如何配置和使用 Playwright 的并行执行功能，以提升 E2E 测试的执行效率。

## 配置说明

### 1. Worker 数量配置

Worker 数量决定了同时运行的测试进程数。配置位于 `playwright.config.ts`：

```typescript
workers: process.env.CI ? 1 : process.env.WORKERS ? parseInt(process.env.WORKERS) : '50%'
```

**配置策略：**
- **CI 环境**：使用 1 个 worker（串行执行），确保稳定性
- **本地环境**：默认使用 CPU 核心数的 50%，平衡性能和资源占用
- **自定义**：通过 `WORKERS` 环境变量指定具体数量

### 2. 完全并行模式

```typescript
fullyParallel: true
```

启用后，同一测试文件内的测试用例也会并行执行。

**注意事项：**
- 确保测试用例之间相互独立
- 避免共享状态或资源
- 使用 `test.describe.configure({ mode: 'serial' })` 强制某些测试串行执行

### 3. 浏览器项目控制

通过环境变量控制在哪些浏览器上运行测试：

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `BROWSER_ONLY` | 只运行指定浏览器 | `BROWSER_ONLY=chromium` |
| `SKIP_FIREFOX` | 跳过 Firefox 测试 | `SKIP_FIREFOX=1` |
| `SKIP_WEBKIT` | 跳过 WebKit 测试 | `SKIP_WEBKIT=1` |
| `ENABLE_MOBILE` | 启用移动端浏览器测试 | `ENABLE_MOBILE=1` |

## 使用方法

### 方法 1：使用 npm scripts

```bash
# 默认并行执行（CPU 核心数的 50%）
npm run test:e2e:parallel

# 快速模式（4 个 worker，只测试 Chromium）
npm run test:e2e:parallel:fast

# 完整模式（包含移动端浏览器）
npm run test:e2e:parallel:all
```

### 方法 2：使用辅助脚本

```bash
# 使用 4 个 worker
node tests/run-parallel.js --workers 4

# 只在 Chromium 上运行
node tests/run-parallel.js --browser chromium

# 跳过 Firefox 和 WebKit
node tests/run-parallel.js --skip-firefox --skip-webkit

# 运行特定测试文件
node tests/run-parallel.js tests/e2e/promptlab.spec.ts

# 使用 UI 模式
node tests/run-parallel.js --ui

# 组合使用
node tests/run-parallel.js --workers 2 --browser chromium --headed
```

### 方法 3：直接使用环境变量

```bash
# Windows CMD
set WORKERS=4 && npm run test:e2e

# Windows PowerShell
$env:WORKERS=4; npm run test:e2e

# 只在 Chromium 上运行
set BROWSER_ONLY=chromium && npm run test:e2e
```

## 性能优化建议

### 1. Worker 数量选择

| 场景 | 推荐 Worker 数量 | 说明 |
|------|-----------------|------|
| 本地开发 | 2-4 | 保留资源给 IDE 和浏览器 |
| CI/CD | 1 | 确保稳定性，避免资源竞争 |
| 性能测试 | CPU 核心数 | 最大化并行度 |
| 调试 | 1 | 便于追踪问题 |

### 2. 测试隔离性

确保测试之间相互独立：

```typescript
// ✅ 好的做法：每个测试独立设置
test('test 1', async ({ page }) => {
  await page.goto('/');
  // 测试逻辑
});

test('test 2', async ({ page }) => {
  await page.goto('/');
  // 测试逻辑
});

// ❌ 不好的做法：共享状态
let sharedData;

test('test 1', async ({ page }) => {
  sharedData = await page.evaluate(() => getData());
});

test('test 2', async ({ page }) => {
  // 依赖 test 1 的结果
  expect(sharedData).toBeDefined();
});
```

### 3. 资源管理

```typescript
// 使用 test.beforeEach 和 test.afterEach 管理资源
test.beforeEach(async ({ page }) => {
  // 设置测试环境
  await page.goto('/');
});

test.afterEach(async ({ page }) => {
  // 清理资源
  await page.close();
});
```

### 4. 串行执行特定测试

某些测试需要串行执行（如数据库操作）：

```typescript
test.describe.configure({ mode: 'serial' });

test.describe('Database tests', () => {
  test('create record', async ({ page }) => {
    // 创建记录
  });

  test('update record', async ({ page }) => {
    // 更新记录（依赖上一个测试）
  });
});
```

## 监控和调试

### 1. 查看并行执行状态

```bash
# 使用 UI 模式查看实时执行状态
npm run test:e2e:ui
```

### 2. 调试失败的测试

```bash
# 使用调试模式（自动串行执行）
npm run test:e2e:debug

# 或使用有头模式
npm run test:e2e:headed
```

### 3. 查看测试报告

测试完成后，查看 HTML 报告：

```bash
npx playwright show-report tests/playwright-report
```

## 常见问题

### Q1: 并行执行时测试不稳定怎么办？

**A:** 检查以下几点：
1. 测试是否相互独立
2. 是否有共享状态或资源竞争
3. 是否有时序依赖
4. 减少 worker 数量或使用串行模式

### Q2: 如何在 CI 环境中使用并行执行？

**A:** 在 CI 配置中设置环境变量：

```yaml
# GitHub Actions 示例
- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
    WORKERS: 1  # CI 环境建议使用 1 个 worker
```

### Q3: 并行执行会影响测试结果吗？

**A:** 如果测试设计得当（相互独立），不会影响结果。如果测试失败：
1. 先用串行模式验证（`WORKERS=1`）
2. 检查测试隔离性
3. 使用 `test.describe.configure({ mode: 'serial' })` 标记需要串行的测试

### Q4: 如何选择合适的 worker 数量？

**A:** 考虑以下因素：
- CPU 核心数
- 可用内存
- 测试复杂度
- 是否需要启动浏览器

**经验公式：**
```
worker 数量 = min(CPU 核心数 * 0.5, 可用内存(GB) / 2)
```

## 最佳实践总结

1. ✅ **本地开发**：使用默认配置（CPU 核心数的 50%）
2. ✅ **CI/CD**：使用 1 个 worker，确保稳定性
3. ✅ **快速反馈**：只在 Chromium 上运行，跳过其他浏览器
4. ✅ **完整测试**：在发布前运行所有浏览器的测试
5. ✅ **测试隔离**：确保每个测试独立，不依赖其他测试
6. ✅ **资源清理**：使用 `beforeEach` 和 `afterEach` 管理资源
7. ✅ **监控性能**：定期检查测试执行时间，优化慢测试

## 参考资料

- [Playwright 官方文档 - 并行执行](https://playwright.dev/docs/test-parallel)
- [Playwright 官方文档 - 测试配置](https://playwright.dev/docs/test-configuration)
- [Playwright 官方文档 - 最佳实践](https://playwright.dev/docs/best-practices)
