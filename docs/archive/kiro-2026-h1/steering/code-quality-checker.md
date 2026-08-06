---
inclusion: manual
---

# Code Quality Checker Skill

这个 skill 帮助你使用项目中已有的代码质量工具进行全面的代码检查。

## 可用的质量检查命令

### 1. 代码规范检查
```bash
npm run lint              # ESLint 检查
npm run lint:fix          # 自动修复 ESLint 问题
npm run format:check      # Prettier 格式检查
npm run format            # 自动格式化代码
```

### 2. 类型检查
```bash
npm run type-check        # TypeScript 类型检查
```

### 3. 安全检查
```bash
npm run xss:scan          # XSS 漏洞扫描
npm run security:check    # 安全检查
npm run security:audit    # 安全审计
```

### 4. 代码质量分析
```bash
npm run quality:check     # 代码质量检查
npm run quality:baseline  # 运行所有质量检查
npm run tech-debt:scan    # 技术债务扫描
npm run code:analyze:complexity  # 复杂度分析
```

### 5. 代码清理
```bash
npm run code:clean:comments      # 清理注释代码
npm run code:clean:todos         # 清理 TODO 注释
npm run unused-imports:scan      # 扫描未使用的导入
```

### 6. CSS 质量检查
```bash
npm run css:audit         # CSS 变量审计
npm run css:analyze       # CSS 模块分析
npm run css:cleanup       # 清理未使用的 CSS
```

## 使用方式

当用户要求进行代码质量检查时：

1. **快速检查**: 运行 `npm run lint && npm run type-check`
2. **全面检查**: 运行 `npm run quality:baseline`
3. **安全检查**: 运行 `npm run security:audit`
4. **特定文件检查**: 使用 `npm run lint -- <file-path>`

## 检查流程

### 提交前检查
```bash
npm run lint:fix
npm run format
npm run type-check
npm run security:check
```

### 发布前检查
```bash
npm run quality:baseline
npm run test
npm run test:e2e
npm run release:check
```

## 注意事项

- 所有命令都应该在项目根目录运行
- 某些命令可能需要较长时间，请耐心等待
- 如果发现问题，优先使用自动修复命令（如 lint:fix）
- 对于无法自动修复的问题，需要手动修改代码
