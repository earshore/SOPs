# 📸 失败截图管理系统

此目录用于存储 E2E 测试失败时的自动截图。

## 目录结构

```
tests/screenshots/
├── failures/          # 失败截图存储目录
│   └── *.png         # 截图文件（按命名规范）
├── temp/             # 临时截图目录
├── index.json        # 截图索引文件
├── index.html        # 可视化浏览页面
└── README.md         # 本文件
```

## 截图命名规范

截图文件名格式：`{测试名称}_{浏览器}_{时间戳}.png`

示例：
- `promptlab-loading_chromium_20250122-143025.png`
- `ai-analysis-generate_firefox_20250122-150130.png`

## 使用方法

### 查看截图统计

```bash
npm run screenshots:stats
```

显示：
- 总截图数和大小
- 按浏览器分布
- 按测试文件分布
- 磁盘使用情况

### 浏览截图

```bash
npm run screenshots:view
```

在浏览器中打开可视化索引页面，可以：
- 查看所有失败截图
- 按测试名称搜索
- 按浏览器筛选
- 按时间排序
- 点击查看大图
- 查看错误信息

### 清理截图

```bash
# 清理 7 天前的截图（默认）
npm run screenshots:cleanup

# 清理 3 天前的截图
npm run screenshots:cleanup -- --max-age 3

# 只保留最近 50 个截图
npm run screenshots:cleanup -- --max-count 50

# 删除所有截图
npm run screenshots:cleanup:all
```

## 自动化流程

### 测试失败时

1. Playwright 自动捕获失败截图
2. ScreenshotManager 处理截图：
   - 生成规范化文件名
   - 保存到 failures/ 目录
   - 更新索引文件
   - 记录元数据（测试名、浏览器、错误信息等）

### 测试完成后

1. 自动生成 HTML 索引页面
2. 打印统计信息
3. 清理临时文件

### 定期维护

建议定期运行清理命令，避免截图累积过多：

```bash
# 每周清理一次
npm run screenshots:cleanup
```

## 配置选项

在 `tests/helpers/screenshot-manager.ts` 中可以配置：

```typescript
{
  baseDir: 'tests/screenshots',    // 基础目录
  failureDir: 'failures',          // 失败截图子目录
  maxAge: 7,                       // 最大保留天数
  maxCount: 100,                   // 最大保留数量
  includeTimestamp: true,          // 文件名包含时间戳
  includeBrowser: true,            // 文件名包含浏览器类型
  fullPage: false                  // 是否全页截图
}
```

## 截图元数据

每个截图都包含以下元数据：

- `testName`: 测试名称
- `testFile`: 测试文件路径
- `browser`: 浏览器类型（chromium/firefox/webkit）
- `timestamp`: 时间戳
- `error`: 错误信息
- `url`: 页面 URL
- `viewport`: 视口大小

## 最佳实践

1. **定期清理**：避免截图累积过多占用磁盘空间
2. **及时查看**：测试失败后及时查看截图，快速定位问题
3. **保留关键截图**：对于重要的 bug，可以手动备份截图
4. **配置合理**：根据团队需求调整保留策略

## 故障排查

### 截图未生成

检查：
1. Playwright 配置中 `screenshot: 'only-on-failure'` 是否启用
2. 测试是否真的失败了
3. 截图目录权限是否正确

### 索引页面无法打开

检查：
1. 是否运行了测试（索引在测试后生成）
2. `tests/screenshots/index.html` 文件是否存在
3. 浏览器是否允许访问本地文件

### 清理命令无效

检查：
1. 是否有足够的文件系统权限
2. 截图文件是否被其他程序占用
3. 命令参数是否正确

## 技术实现

- **ScreenshotManager**: 核心管理类，负责截图的捕获、命名、索引和清理
- **screenshot-fixture.ts**: Playwright fixture，自动在测试失败时触发截图
- **playwright-setup.ts**: 初始化截图管理器，清理过期截图
- **playwright-teardown.ts**: 生成 HTML 索引，打印统计信息

## 相关命令

```bash
# 运行 E2E 测试
npm run test:e2e

# 查看测试报告
npm run test:e2e:report

# 查看截图统计
npm run screenshots:stats

# 浏览截图
npm run screenshots:view

# 清理截图
npm run screenshots:cleanup
```
