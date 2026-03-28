# HTML/CSS 命名规范验证和迁移工具

自动验证和迁移HTML ID、CSS类名和data属性的命名规范工具。

## 功能特性

- ✅ **命名规则验证** - 检查HTML ID、CSS类和data属性是否符合规范
- ✅ **自动迁移** - 自动修复不符合规范的命名
- ✅ **引用追踪** - 自动更新所有引用位置
- ✅ **备份管理** - 自动创建备份，支持一键回滚
- ✅ **预览模式** - 在实际修改前预览所有变更
- ✅ **多格式报告** - 支持JSON和Markdown格式报告

## 命名规范

### HTML ID规范

1. **模块级ID**: `{module}-{component}-{element}`
   - 示例: `app-header-container`, `sop-editor-toolbar`

2. **全局级ID**: `{component}-{element}`
   - 示例: `modal-overlay`, `sidebar-toggle`

3. **统一使用kebab-case**
   - ✅ 正确: `user-profile`, `search-input`
   - ❌ 错误: `userProfile`, `search_input`

### CSS类规范

1. **BEM Block**: `block-name`
2. **BEM Element**: `block__element`
3. **BEM Modifier**: `block--modifier` 或 `block__element--modifier`
4. **状态类**: `is-active`, `has-error`
5. **模块类**: `app-*`, `sop-*`, `hub-*`

### data属性规范

1. **行为属性**: `data-action-{action}`
2. **状态属性**: `data-state-{state}`
3. **配置属性**: `data-config-{config}`
4. **标识属性**: `data-id` 或 `data-{entity}-id`

## 安装

```bash
cd tools/naming-validator
npm install
npm run build
```

## 使用方法

### 验证命名规范

```bash
# 验证当前目录
npm run validate

# 验证指定目录
node dist/cli.js validate src/

# 输出JSON格式报告
node dist/cli.js validate --format json --output report.json

# 禁用特定规则
node dist/cli.js validate --no-css-class
```

### 自动迁移

```bash
# 预览模式（不实际修改文件）
node dist/cli.js migrate --dry-run

# 执行迁移（自动创建备份）
node dist/cli.js migrate

# 迁移指定目录
node dist/cli.js migrate src/

# 不创建备份
node dist/cli.js migrate --no-backup
```

### 备份管理

```bash
# 列出所有备份
node dist/cli.js list-backups

# 回滚到指定备份
node dist/cli.js rollback .naming-backup/2026-03-03T10-30-00-000Z
```

## 配置文件

在项目根目录创建 `.naming-rules.json`:

```json
{
  "validator": {
    "include": ["**/*.html", "**/*.css"],
    "exclude": ["node_modules/**", "dist/**"],
    "rules": {
      "html-id": true,
      "css-class": true,
      "data-attr": true
    },
    "severity": {
      "html-id": "error",
      "css-class": "error",
      "data-attr": "warning"
    }
  },
  "migrator": {
    "backup": {
      "enabled": true,
      "directory": ".naming-backup"
    },
    "updateReferences": true
  }
}
```

## 快速测试

```bash
# 运行快速测试
node test/quick-test.js

# 使用简化测试脚本
node test-validator.js
```

## 架构

```
src/
├── types/              # TypeScript类型定义
├── naming-rules/       # 命名规则引擎
├── parsers/           # HTML和CSS解析器
├── validator/         # 验证工具
├── migrator/          # 迁移工具
├── reference-tracker/ # 引用追踪器
└── cli.ts            # CLI入口
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建
npm run build

# 运行测试
npm test
```

## 注意事项

1. 迁移前会自动创建备份，建议保留备份直到确认迁移成功
2. 使用 `--dry-run` 预览变更，确认无误后再执行实际迁移
3. 工具会自动跳过Tailwind CSS等工具类
4. Alpine.js的原生属性（如 `x-data`, `@click`）会被保留

## 许可证

MIT
