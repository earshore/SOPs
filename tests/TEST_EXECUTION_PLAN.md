# 应用中心测试执行计划

## 测试目标

对应用中心的所有模块进行全面测试，模拟真实用户使用场景，确保：
- 所有功能正常工作
- 用户体验流畅
- 无控制台错误
- 性能达标

## 测试数据

- **API Key**: `AI2026`
- **示例产品**: `examples/Amz_B01KYRUBT8_2026-02-25T07-23-54.json`
- **测试ASIN**: `B01KYRUBT8` (瑞典站香水产品)
- **产品信息**: Al Rehab Dam Choco Musk Eau de Parfum, 50 ml
- **评论数量**: 10 条

## 测试模块清单

### Master Analysis 模块组
- [x] Scraper - 数据采集
- [x] AI Analysis - AI 智能分析
- [x] Promptlab - 提示词实验室
- [x] QALab - QA 实验室

### Keyword Hunter 模块组
- [x] Input - 关键词输入
- [x] Process - 关键词处理
- [x] Analysis - 关键词分析

### 集成测试
- [x] 跨模块数据流转
- [x] 完整用户流程
- [x] 导航和路由

### 性能测试
- [x] 页面加载性能
- [x] 数据处理性能
- [x] AI 分析性能

## 执行方式

### 方式一: 使用测试脚本（推荐）

```bash
# 执行完整测试套件
bash tests/scripts/run-app-center-tests.sh
```

### 方式二: 使用 npm 命令

```bash
# 快速测试（仅 Chromium）
npm run test:e2e tests/e2e/app-center-*.spec.ts

# 完整测试（所有浏览器）
SKIP_FIREFOX=0 SKIP_WEBKIT=0 npm run test:e2e tests/e2e/app-center-*.spec.ts

# 单个模块测试
npm run test:e2e tests/e2e/scraper.spec.ts
npm run test:e2e tests/e2e/ai-analysis.spec.ts
```

### 方式三: 分阶段执行

```bash
# 阶段 1: 基础功能
npm run test:e2e tests/e2e/app-center-overview.spec.ts
npm run test:e2e tests/e2e/scraper.spec.ts
npm run test:e2e tests/e2e/ai-analysis.spec.ts

# 阶段 2: 扩展功能
npm run test:e2e tests/e2e/promptlab.spec.ts
npm run test:e2e tests/e2e/qalab.spec.ts
npm run test:e2e tests/e2e/keyword-hunter-*.spec.ts

# 阶段 3: 集成测试
npm run test:e2e tests/e2e/app-center-integration.spec.ts
npm run test:e2e tests/e2e/app-center-full-suite.spec.ts

# 阶段 4: 性能测试
npm run test:e2e tests/e2e/*-performance.spec.ts
```

## 测试前准备

### 1. 安装依赖
```bash
npm install
npx playwright install chromium
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 验证环境
```bash
# 检查服务器是否运行
curl http://localhost:5173

# 检查 Playwright 环境
node tests/check-playwright-env.js
```

## 测试报告

### 查看报告
```bash
# 打开 HTML 报告
npx playwright show-report tests/playwright-report

# 查看 JSON 报告
cat tests/playwright-report/results.json | jq
```

### 报告内容
- 测试执行时间
- 通过/失败统计
- 失败截图和视频
- 控制台错误日志
- 性能指标

## 预期结果

### 成功标准
- ✅ 所有测试用例通过
- ✅ 无控制台错误
- ✅ 页面加载 < 3s
- ✅ 数据采集 < 30s
- ✅ AI 分析 < 60s

### 常见问题处理

**问题 1: 测试超时**
- 增加超时时间: `timeout: 60000`
- 检查网络连接
- 验证 API Key 是否正确

**问题 2: 元素未找到**
- 检查选择器是否正确
- 等待页面完全加载
- 验证路由是否正确

**问题 3: 数据未同步**
- 检查 localStorage 或状态管理
- 验证模块间通信
- 查看控制台错误

## 持续集成

### GitHub Actions 配置
```yaml
- name: Run App Center Tests
  run: bash tests/scripts/run-app-center-tests.sh
  
- name: Upload Test Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: tests/playwright-report/
```

## 测试维护

### 定期任务
- 每周审查失败测试
- 每月更新测试数据
- 每季度优化测试性能
- 持续改进测试覆盖率
