# 使用指南

## 快速开始

### 1. 安装依赖

```bash
cd tools/naming-validator
npm install
```

### 2. 构建工具

```bash
npm run build
```

### 3. 验证项目

```bash
# 验证当前项目
node dist/cli.js validate ../../

# 或使用npm脚本
npm run validate
```

## 常见使用场景

### 场景1: 检查单个文件

```bash
node dist/cli.js validate src/index.html
```

### 场景2: 检查整个目录

```bash
node dist/cli.js validate src/
```

### 场景3: 生成报告

```bash
# Markdown格式
node dist/cli.js validate --format markdown --output report.md

# JSON格式
node dist/cli.js validate --format json --output report.json
```

### 场景4: 预览迁移

```bash
# 查看将要进行的所有变更
node dist/cli.js migrate --dry-run
```

### 场景5: 执行迁移

```bash
# 自动创建备份并执行迁移
node dist/cli.js migrate

# 不创建备份（不推荐）
node dist/cli.js migrate --no-backup
```

### 场景6: 回滚迁移

```bash
# 列出所有备份
node dist/cli.js list-backups

# 回滚到指定备份
node dist/cli.js rollback .naming-backup/2026-03-03T10-30-00-000Z
```

## 配置选项

### 命令行参数

#### validate命令

- `--config <path>` - 指定配置文件路径
- `--format <format>` - 报告格式 (json|markdown)
- `--output <path>` - 报告输出文件路径
- `--no-html-id` - 禁用HTML ID规则检查
- `--no-css-class` - 禁用CSS类规则检查
- `--no-data-attr` - 禁用data属性规则检查

#### migrate命令

- `--config <path>` - 指定配置文件路径
- `--dry-run` - 预览模式，不实际修改文件
- `--no-backup` - 不创建备份
- `--output <path>` - 迁移报告输出文件路径

### 配置文件

在项目根目录创建 `.naming-rules.json`:

```json
{
  "validator": {
    "include": ["**/*.html", "**/*.css"],
    "exclude": ["node_modules/**", "dist/**", "build/**"],
    "rules": {
      "html-id": true,
      "css-class": true,
      "data-attr": true
    },
    "severity": {
      "html-id": "error",
      "css-class": "error",
      "data-attr": "warning"
    },
    "ignorePatterns": ["^test-", "^tmp-"]
  },
  "migrator": {
    "backup": {
      "enabled": true,
      "directory": ".naming-backup"
    },
    "updateReferences": true,
    "modules": [
      {
        "name": "app",
        "prefix": "app",
        "paths": ["src/app/**"]
      }
    ]
  }
}
```

## 命名规范详解

### HTML ID

**模块级ID** (推荐用于模块内部元素):
```html
<div id="app-header-container">
<button id="sop-editor-toolbar">
```

**全局级ID** (推荐用于全局共享元素):
```html
<div id="modal-overlay">
<button id="sidebar-toggle">
```

### CSS类

**BEM命名**:
```css
.block { }                    /* Block */
.block__element { }           /* Element */
.block--modifier { }          /* Modifier */
.block__element--modifier { } /* Element + Modifier */
```

**状态类**:
```css
.is-active { }
.is-disabled { }
.has-error { }
.has-children { }
```

**模块类**:
```css
.app-container { }
.sop-editor { }
.hub-dashboard { }
```

### data属性

```html
<!-- 行为属性 -->
<button data-action-click="submit">
<div data-action-hover="highlight">

<!-- 状态属性 -->
<div data-state-loading="true">
<span data-state-active="false">

<!-- 配置属性 -->
<div data-config-theme="dark">
<input data-config-max-length="100">

<!-- 标识属性 -->
<div data-id="123">
<span data-user-id="456">
```

## 故障排除

### 问题1: npm install失败

**解决方案**:
```bash
# 清理缓存
npm cache clean --force

# 删除node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 问题2: 构建失败

**解决方案**:
```bash
# 使用TypeScript编译器
npm run build:tsc

# 或使用esbuild
npm run build
```

### 问题3: 工具检测到太多Tailwind类

这是正常的。工具会自动跳过Tailwind CSS工具类，但可能会在报告中显示。可以通过配置文件的 `ignorePatterns` 来进一步过滤。

### 问题4: 迁移后代码不工作

**解决方案**:
```bash
# 立即回滚
node dist/cli.js rollback .naming-backup/[最新备份目录]

# 检查备份列表
node dist/cli.js list-backups
```

## 最佳实践

1. **先验证，后迁移** - 始终先运行 `validate` 了解问题范围
2. **使用预览模式** - 使用 `--dry-run` 查看变更
3. **保留备份** - 不要使用 `--no-backup`，至少保留备份直到确认迁移成功
4. **分批迁移** - 对于大型项目，建议分目录逐步迁移
5. **版本控制** - 在迁移前提交代码到Git，便于回滚

## 集成到工作流

### Git Pre-commit Hook

创建 `.git/hooks/pre-commit`:

```bash
#!/bin/bash
node tools/naming-validator/dist/cli.js validate --format json > /dev/null
if [ $? -ne 0 ]; then
  echo "❌ 命名规范检查失败，请修复后再提交"
  exit 1
fi
```

### CI/CD集成

在CI配置中添加:

```yaml
- name: 验证命名规范
  run: |
    cd tools/naming-validator
    npm install
    npm run build
    node dist/cli.js validate ../../ --format json
```

## 支持

如有问题，请查看:
- README.md - 完整文档
- example/ - 示例文件
- test/ - 测试用例
