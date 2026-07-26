# 视觉回归测试

## 概述

视觉回归测试用于检测 UI 的意外变化，确保代码修改不会破坏页面的视觉呈现。

## 工作原理

1. **基准截图**：首次运行时创建页面的基准截图
2. **对比测试**：后续运行时将当前截图与基准图对比
3. **差异检测**：如果差异超过阈值，测试失败并生成差异图

### 图像对比实现

本项目使用两种图像对比方式：

1. **Playwright 内置对比**：用于 E2E 测试中的快速截图对比
2. **Pixelmatch 对比**：用于更精确的像素级对比和自定义差异检测

#### Pixelmatch 特性

- **像素级精确对比**：逐像素比较图像差异
- **抗锯齿检测**：智能识别抗锯齿像素，减少误报
- **自定义阈值**：灵活配置差异容忍度
- **差异可视化**：生成高亮差异区域的对比图
- **批量处理**：支持批量对比多张图像

## 使用方法

### 使用 Pixelmatch 进行图像对比

```typescript
import { createImageComparator, compareImages } from '../tests/visual/image-comparator';

// 方式 1: 快速对比（使用默认选项）
const result = await compareImages('baseline.png', 'current.png');
console.log(`匹配: ${result.match}`);
console.log(`差异像素: ${result.diffPixels}`);
console.log(`差异百分比: ${result.diffPercentage}%`);

// 方式 2: 自定义选项
const comparator = createImageComparator();
const customResult = await comparator.compare(
  'baseline.png',
  'current.png',
  {
    threshold: 0.05,           // 5% 差异容忍度
    generateDiffImage: true,   // 生成差异图
    diffOutputPath: 'diff.png',
    diffColor: [255, 0, 0]     // 红色高亮差异
  }
);

// 方式 3: 批量对比
const results = await comparator.compareMultiple([
  { baseline: 'page1-baseline.png', current: 'page1-current.png' },
  { baseline: 'page2-baseline.png', current: 'page2-current.png' },
  { baseline: 'page3-baseline.png', current: 'page3-current.png' }
]);
```

### 运行视觉测试

```bash
# 运行所有视觉测试
npm run test:e2e tests/visual

# 只在 Chromium 上运行
BROWSER_ONLY=chromium npm run test:e2e tests/visual

# 运行特定测试
npm run test:e2e tests/visual -- --grep "Desktop Views"
```

### 更新基准截图

当 UI 有意修改时，需要更新基准截图：

```bash
# 更新所有基准截图
npm run test:e2e tests/visual -- --update-snapshots

# 更新特定页面的基准截图
npm run test:e2e tests/visual -- --update-snapshots --grep "promptlab"
```

### 查看测试结果

测试失败时会生成以下文件：

- `test-results/` - 包含失败的截图和差异图
- `tests/playwright-report/` - HTML 测试报告

```bash
# 打开测试报告
npm run test:e2e:report
```

## 测试覆盖范围

### 页面级测试

- 首页
- Promptlab 页面
- AI 分析页面
- Scraper 页面
- Keyword Hunter 页面
- NPI Tracker 页面
- Restricted Words 页面

### 响应式测试

每个页面在以下视口尺寸下测试：

- **桌面端**: 1280x720
- **平板端**: 768x1024
- **移动端**: 375x667

### 组件级测试

- 导航栏
- 侧边栏
- 页脚

### 交互状态测试

- 按钮悬停状态
- 输入框聚焦状态
- 下拉菜单展开状态

### 错误状态测试

- 表单验证错误

### 主题测试

- 深色模式（如果支持）
- **D12 Appearance 轴 scaffold（默认跳过）**: `tests/visual/theme-appearance-scaffold.test.ts`
  - 覆盖 9 屏：Settings Appearance、Keyword Hunter、Home、**App Center**、**Scraper**、**PPC Search Terms**、**SOPs overview**、**Amazon Hub overview**、**Deep Chat** × `default`/`minimal` × light = **18** 快照（9×2）
  - 命名: `theme-default-light-*` / `theme-minimal-light-*`（slugs: `settings-appearance` · `keyword-hunter` · `home` · `app-center` · `scraper` · `ppc-search-terms` · `sops-overview` · `amz-hub-overview` · `deep-chat`）
  - Ownership 多色页（App Center / Scraper / PPC / SOPs / Amazon Hub / Deep Chat terracotta send）**不得**被 Appearance primary 吞掉；**不得**将 terracotta send 断言为 primary
  - **不进 blocking CI**；未设 `THEME_VISUAL=1` 时整套 skip
  - 手动跑：
    ```bash
    # Cross-platform (scripts/test/run-theme-visual.mjs sets THEME_VISUAL=1)
    npm run test:visual:theme
    npm run test:visual:theme:update   # 本地生成基线（gitignore，不提交）

    # Equivalent direct env (PowerShell)
    $env:THEME_VISUAL=1; npx playwright test tests/visual/theme-appearance-scaffold.test.ts
    ```
  - 计划与人工 XO: `docs/superpowers/plans/2026-07-26-theme-visual-baseline-d12.md`
  - **不**等于视觉签收 Pass

## 配置

### 差异阈值配置系统

项目使用了灵活的阈值配置系统，根据不同场景自动选择合适的阈值。

#### 阈值级别

系统提供 5 个预定义的阈值级别：

1. **VERY_STRICT（极严格）**
   - 差异容忍度：0.1%
   - 最大差异像素：10
   - 适用场景：关键 UI 组件（按钮、图标等）

2. **STRICT（严格）**
   - 差异容忍度：1%
   - 最大差异像素：100
   - 适用场景：重要页面、导航栏

3. **STANDARD（标准）**
   - 差异容忍度：5%
   - 最大差异像素：500
   - 适用场景：一般页面、数据展示

4. **LENIENT（宽松）**
   - 差异容忍度：10%
   - 最大差异像素：1000
   - 适用场景：动态内容较多的页面

5. **VERY_LENIENT（极宽松）**
   - 差异容忍度：20%
   - 最大差异像素：2000
   - 适用场景：高度动态的页面、仪表板

#### 页面类型推荐

系统根据页面类型自动选择合适的阈值：

```typescript
// 静态页面 → 极严格
PageType.STATIC → ThresholdLevel.VERY_STRICT

// 表单页面 → 严格
PageType.FORM → ThresholdLevel.STRICT

// 数据展示页面 → 标准
PageType.DATA_DISPLAY → ThresholdLevel.STANDARD

// 仪表板 → 宽松
PageType.DASHBOARD → ThresholdLevel.LENIENT

// 列表页面 → 标准
PageType.LIST → ThresholdLevel.STANDARD

// 详情页面 → 严格
PageType.DETAIL → ThresholdLevel.STRICT
```

#### 视口调整

不同视口尺寸使用不同的阈值倍数：

- **桌面端**：1.0x（基准）
- **平板端**：1.2x（增加 20%）
- **移动端**：1.5x（增加 50%）

移动端由于屏幕小、像素密度高，需要更宽松的阈值。

#### 使用阈值配置

```typescript
import {
  ThresholdLevel,
  PageType,
  getThresholdConfig,
  getThresholdForPageType,
  getThresholdForComponent,
  adjustThresholdForViewport,
  ThresholdConfigBuilder
} from './threshold-config';

// 方式 1: 使用预定义级别
const config = getThresholdConfig(ThresholdLevel.STRICT);

// 方式 2: 根据页面类型
const config = getThresholdForPageType(PageType.FORM);

// 方式 3: 根据组件类型
const config = getThresholdForComponent('button');

// 方式 4: 根据交互状态
const config = getThresholdForInteractionState('hover');

// 方式 5: 视口调整
const config = adjustThresholdForViewport(baseConfig, 'mobile');

// 方式 6: 使用构建器
const config = new ThresholdConfigBuilder(ThresholdLevel.STANDARD)
  .withThreshold(0.03)
  .withMaxDiffPixels(300)
  .withDiffColor(255, 0, 0)
  .forViewport('tablet')
  .build();
```

### 自定义阈值

如果需要自定义阈值，可以在 `threshold-config.ts` 中修改：

```typescript
// 修改预定义级别
export const THRESHOLD_PRESETS: Record<ThresholdLevel, ImageCompareOptions> = {
  [ThresholdLevel.STANDARD]: {
    threshold: 0.05,     // 修改为 5%
    maxDiffPixels: 500,  // 修改为 500 像素
    // ...
  }
};

// 添加新的组件阈值
export const COMPONENT_THRESHOLDS: Record<string, ImageCompareOptions> = {
  'my-component': {
    threshold: 0.02,
    maxDiffPixels: 100,
    // ...
  }
};
```

### 隐藏动态元素

某些元素（如时间戳）会导致误报，可以通过 `maskSelectors` 隐藏：

```typescript
{
  name: 'promptlab',
  path: '/app_center/promptlab',
  maskSelectors: [
    '.timestamp',
    '#final-prompt-output'
  ]
}
```

## 最佳实践

### 1. 稳定的测试环境

- 使用固定的视口尺寸
- 禁用动画
- 隐藏动态内容（时间戳、随机数据）

### 2. 合理的差异阈值

系统已经根据页面类型和视口自动配置了合理的阈值：

- **静态页面**：使用极严格阈值（0.1%）
- **表单页面**：使用严格阈值（1%）
- **数据展示页面**：使用标准阈值（5%）
- **列表页面**：使用标准阈值（5%）
- **仪表板**：使用宽松阈值（10%）

视口调整：
- 桌面端：基准阈值
- 平板端：阈值 × 1.2
- 移动端：阈值 × 1.5

如果测试频繁失败或误报，可以调整 `threshold-config.ts` 中的配置。

### 3. 定期更新基准图

- 有意的 UI 修改后立即更新
- 定期审查基准图是否仍然有效

### 4. 快速失败

- 在 CI/CD 中尽早运行视觉测试
- 失败时立即通知开发者

## 故障排查

### 测试总是失败

**原因**：动态内容导致每次截图都不同

**解决**：
1. 使用 `maskSelectors` 隐藏动态元素
2. 在 `beforeScreenshot` 中设置固定数据
3. 增加 `threshold` 值

### 截图不完整

**原因**：页面加载未完成

**解决**：
1. 增加 `waitForSelector` 等待关键元素
2. 使用 `beforeScreenshot` 等待加载完成
3. 增加 `networkidle` 超时时间

### 不同环境下截图不一致

**原因**：字体渲染、浏览器版本差异

**解决**：
1. 使用 Docker 统一测试环境
2. 固定浏览器版本
3. 使用 Web 字体而非系统字体

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Visual Regression Tests

on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e tests/visual
      
      # 上传失败的截图
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: visual-test-results
          path: test-results/
```

## 维护指南

### 添加新页面测试

在 `PAGES` 数组中添加配置：

```typescript
{
  name: 'new-page',
  path: '/app_center/new_page',
  waitForSelector: '#new-page-panel',
  maskSelectors: ['.timestamp'],
  beforeScreenshot: async (page: BasePage) => {
    await page.waitForElement('#new-page-panel');
    await page.waitForLoadingToFinish();
  }
}
```

### 添加新的交互状态测试

```typescript
test('should match new interaction state', async ({ page }) => {
  const basePage = new BasePage(page);
  await basePage.navigate('/');
  
  // 触发交互
  await page.click('.trigger-element');
  await page.waitForTimeout(300);
  
  await expect(page).toHaveScreenshot('new-state.png', {
    threshold: VISUAL_CONFIG.threshold,
    maxDiffPixels: VISUAL_CONFIG.maxDiffPixels
  });
});
```

## 参考资料

### Pixelmatch API 参考

#### ImageComparator 类

**方法：**

- `compare(baselinePath, currentPath, options?)` - 对比两张图像
  - 返回: `Promise<ImageCompareResult>`
  
- `compareMultiple(comparisons)` - 批量对比图像
  - 返回: `Promise<ImageCompareResult[]>`
  
- `imageExists(imagePath)` - 检查图像是否存在
  - 返回: `boolean`
  
- `getImageInfo(imagePath)` - 获取图像信息
  - 返回: `Promise<{ width, height, size }>`
  
- `deleteDiffImage(diffPath)` - 删除差异图
  
- `cleanupDiffImages(diffDir)` - 清理所有差异图

**选项 (ImageCompareOptions)：**

```typescript
{
  threshold?: number;          // 差异阈值 (0-1)，默认 0.1
  includeAA?: boolean;         // 包含抗锯齿像素，默认 true
  alpha?: number;              // 透明度阈值，默认 0.1
  aaThreshold?: number;        // 抗锯齿检测阈值，默认 0.1
  diffColor?: [number, number, number];  // 差异颜色 RGB
  generateDiffImage?: boolean; // 生成差异图，默认 true
  diffOutputPath?: string;     // 差异图输出路径
}
```

**结果 (ImageCompareResult)：**

```typescript
{
  match: boolean;              // 是否匹配
  diffPixels: number;          // 差异像素数
  diffPercentage: number;      // 差异百分比 (0-100)
  totalPixels: number;         // 总像素数
  dimensions: { width, height }; // 图像尺寸
  diffImagePath?: string;      // 差异图路径
  error?: string;              // 错误信息
}
```

### 外部资源

- [Pixelmatch GitHub](https://github.com/mapbox/pixelmatch)
- [Playwright 截图文档](https://playwright.dev/docs/screenshots)
- [视觉回归测试最佳实践](https://playwright.dev/docs/test-snapshots)
- [Playwright 配置](https://playwright.dev/docs/test-configuration)
