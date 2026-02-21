# 📊 Playwright 测试报告指南

## 概述

本指南介绍如何生成、查看和管理 Playwright E2E 测试报告。

---

## 报告格式

测试运行后会自动生成以下格式的报告：

### 1. HTML 报告（主要格式）
- **位置**: `tests/playwright-report/index.html`
- **特点**: 交互式、可视化、包含截图和视频
- **用途**: 本地开发和调试

### 2. JSON 报告
- **位置**: `tests/playwright-report/results.json`
- **特点**: 结构化数据、易于解析
- **用途**: 自定义报告处理、数据分析

### 3. JUnit XML 报告
- **位置**: `tests/playwright-report/junit.xml`
- **特点**: 标准格式、CI/CD 兼容
- **用途**: Jenkins、GitLab CI、GitHub Actions 集成

### 4. 文本摘要
- **位置**: `tests/playwright-report/summary.txt`
- **特点**: 简洁、易读
- **用途**: 快速查看测试结果

---

## 常用命令

### 运行测试并生成报告
```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行测试后自动生成摘要
npm run test:e2e && npm run test:e2e:report:generate
```

### 查看报告
```bash
# 在浏览器中打开 HTML 报告
npm run test:e2e:report

# 显示文本摘要
npm run test:e2e:report:summary

# 启动报告服务器（推荐）
npm run test:e2e:report:serve
```

### 管理报告
```bash
# 生成报告摘要
npm run test:e2e:report:generate

# 清理报告
npm run test:e2e:report:clean

# 归档当前报告
npm run test:e2e:report:archive
```

---

## 报告内容

### HTML 报告包含
- ✅ 测试执行统计（通过/失败/跳过）
- ⏱️ 执行时间和性能指标
- 🌐 多浏览器测试结果
- 📸 失败时的截图
- 🎥 失败时的视频录制
- 📊 测试执行时间线
- 🔍 详细的错误堆栈信息
- 📝 测试步骤日志

### 文本摘要包含
- 测试统计（总数、通过率、失败率）
- 执行时间
- 浏览器覆盖
- 失败测试详情
- 报告文件位置

---

## CI/CD 集成

### GitHub Actions

在 `.github/workflows/test.yml` 中配置：

```yaml
- name: 运行 E2E 测试
  run: npm run test:e2e

- name: 生成测试报告
  if: always()
  run: |
    npm run test:e2e:report:generate
    node tests/ci-report-config.js metadata
    node tests/ci-report-config.js summary

- name: 上传测试报告
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: tests/playwright-report/
    retention-days: 30

- name: 上传 JUnit 报告
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: junit-report
    path: tests/playwright-report/junit.xml
```

### GitLab CI

在 `.gitlab-ci.yml` 中配置：

```yaml
test:e2e:
  script:
    - npm run test:e2e
    - npm run test:e2e:report:generate
    - node tests/ci-report-config.js metadata
  artifacts:
    when: always
    paths:
      - tests/playwright-report/
    reports:
      junit: tests/playwright-report/junit.xml
    expire_in: 30 days
```

### Jenkins

在 Jenkinsfile 中配置：

```groovy
stage('E2E Tests') {
  steps {
    bat 'npm run test:e2e'
    bat 'npm run test:e2e:report:generate'
    bat 'node tests/ci-report-config.js metadata'
  }
  post {
    always {
      junit 'tests/playwright-report/junit.xml'
      publishHTML([
        reportDir: 'tests/playwright-report',
        reportFiles: 'index.html',
        reportName: 'Playwright Report'
      ])
    }
  }
}
```

---

## 报告服务器

启动本地报告服务器：

```bash
npm run test:e2e:report:serve
```

服务器特性：
- 📍 默认地址: `http://localhost:9323`
- 🔄 自动打开浏览器
- 📁 提供完整的报告目录访问
- 🛑 按 Ctrl+C 停止

自定义端口：
```bash
REPORT_PORT=8080 npm run test:e2e:report:serve
```

---

## 报告归档

### 归档当前报告
```bash
npm run test:e2e:report:archive
```

归档位置：`tests/playwright-report-archive/report-<timestamp>/`

### 查看归档列表
归档命令会自动显示最近 5 个归档。

### 清理旧归档
手动删除 `tests/playwright-report-archive/` 中的旧目录。

---

## 故障排查

### 问题：报告未生成

**原因**: 测试未运行或运行失败

**解决方案**:
```bash
# 检查测试是否正常运行
npm run test:e2e

# 查看 Playwright 配置
cat playwright.config.ts
```

### 问题：无法打开 HTML 报告

**原因**: 报告文件不存在或路径错误

**解决方案**:
```bash
# 检查报告文件是否存在
dir tests\playwright-report\index.html

# 使用报告服务器
npm run test:e2e:report:serve
```

### 问题：JUnit XML 格式错误

**原因**: Playwright 版本过低或配置错误

**解决方案**:
```bash
# 更新 Playwright
npm install @playwright/test@latest

# 检查配置
cat playwright.config.ts
```

---

## 最佳实践

### 1. 定期清理报告
```bash
# 每周清理一次
npm run test:e2e:report:clean
```

### 2. 重要测试归档
```bash
# 发布前归档测试报告
npm run test:e2e:report:archive
```

### 3. CI 环境配置
- 始终上传测试报告作为构建产物
- 使用 JUnit XML 集成测试结果
- 保留失败时的截图和视频

### 4. 本地开发
- 使用 `--headed` 模式调试失败的测试
- 使用 `--ui` 模式交互式调试
- 使用报告服务器查看详细结果

---

## 环境变量

### 报告相关
- `REPORT_PORT`: 报告服务器端口（默认：9323）

### CI 相关
- `CI`: 标识 CI 环境
- `GITHUB_ACTIONS`: GitHub Actions 环境
- `GITLAB_CI`: GitLab CI 环境
- `JENKINS_HOME`: Jenkins 环境

---

## 相关文档

- [Playwright 官方文档](https://playwright.dev/)
- [Playwright 报告配置](https://playwright.dev/docs/test-reporters)
- [测试指南](./TEST_GUIDE.md)
- [P0 测试指南](./P0_TEST_GUIDE.md)

---

## 支持

如有问题，请查看：
1. 本文档的故障排查部分
2. Playwright 官方文档
3. 项目 Issues
