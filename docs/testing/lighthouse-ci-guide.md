# Lighthouse CI 使用指南

## 概述

Lighthouse CI 是一个自动化性能测试工具，用于在 CI/CD 流程中运行 Lighthouse 性能审计，确保应用的性能、可访问性、最佳实践和 SEO 符合预设标准。

## 配置文件

配置文件位于项目根目录：`lighthouserc.js`

### 主要配置项

#### 1. Collect（收集）
- 自动启动本地服务器（`npm run preview`）
- 测试 4 个关键页面：首页、Promptlab、AI 分析、Scraper
- 每个 URL 运行 3 次以获取稳定的平均值
- 桌面环境配置（1920x1080）

#### 2. Upload（上传）
- 默认使用临时公共存储
- 可配置为文件系统存储或 Lighthouse CI Server

#### 3. Assert（断言）
定义了严格的性能预算：

**分类评分：**
- 性能 (Performance): ≥ 90 (error)
- 可访问性 (Accessibility): ≥ 90 (warn)
- 最佳实践 (Best Practices): ≥ 90 (warn)
- SEO: ≥ 90 (warn)

**Core Web Vitals：**
- FCP (First Contentful Paint): < 1.5s (error)
- LCP (Largest Contentful Paint): < 2.5s (error)
- CLS (Cumulative Layout Shift): < 0.1 (error)
- TBT (Total Blocking Time): < 300ms (error)
- Speed Index: < 3.5s (warn)
- TTI (Time to Interactive): < 3.5s (warn)

**特定页面规则：**
- Promptlab 页面：TBT 放宽至 500ms
- AI 分析页面：性能评分放宽至 85，启动时间放宽至 4s

## 使用方法

### 1. 构建项目

```bash
npm run build
```

### 2. 运行 Lighthouse CI

```bash
# 使用默认配置
npm run lighthouse

# 使用本地配置文件
npm run lighthouse:local
```

### 3. 查看报告

运行完成后，报告会保存在 `.lighthouseci/` 目录中：
- HTML 报告：可在浏览器中打开查看
- JSON 报告：包含详细的性能数据
- 断言结果：`assertion-results.json`

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Lighthouse CI

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 构建项目
        run: npm run build
      
      - name: 运行 Lighthouse CI
        run: npm run lighthouse
      
      - name: 上传报告
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: lighthouse-reports
          path: .lighthouseci
```

## 验证配置

运行验证脚本确保配置正确：

```bash
node tests/performance/lighthouse-ci-test.js
```

或使用 Lighthouse CI 内置的健康检查：

```bash
npx lhci healthcheck --config=lighthouserc.js
```

## 常见问题

### 1. 服务器启动超时

如果遇到服务器启动超时，可以调整 `startServerReadyTimeout`：

```javascript
collect: {
  startServerReadyTimeout: 60000, // 增加到 60 秒
}
```

### 2. 性能评分不达标

- 检查是否在生产构建上运行（`npm run build`）
- 确保没有其他程序占用系统资源
- 考虑放宽特定页面的阈值

### 3. 断言失败

查看 `.lighthouseci/assertion-results.json` 了解具体失败的断言：

```bash
type .lighthouseci\assertion-results.json
```

## 自定义配置

### 修改测试 URL

编辑 `lighthouserc.js` 中的 `collect.url` 数组：

```javascript
url: [
  'http://localhost:4173/',
  'http://localhost:4173/#/your-custom-page',
]
```

### 调整性能阈值

修改 `assert.assertMatrix` 中的断言规则：

```javascript
assertions: {
  'categories:performance': ['error', { minScore: 0.85 }], // 降低到 85
  'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }], // 放宽到 3s
}
```

### 添加页面特定规则

在 `assertMatrix` 中添加新的匹配规则：

```javascript
{
  matchingUrlPattern: '.*your-page.*',
  assertions: {
    'total-blocking-time': ['warn', { maxNumericValue: 500 }],
  },
}
```

## 最佳实践

1. **定期运行**：在每次 PR 和主分支合并时运行
2. **监控趋势**：保存历史报告，追踪性能变化
3. **渐进式改进**：先设置宽松的阈值，逐步提高标准
4. **关注 Core Web Vitals**：优先优化 LCP、FID、CLS
5. **分页面优化**：为不同页面设置合理的性能预算

## 相关资源

- [Lighthouse CI 官方文档](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals 指南](https://web.dev/vitals/)
- [Lighthouse 评分指南](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
