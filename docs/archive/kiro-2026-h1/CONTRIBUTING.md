# 贡献指南

感谢你考虑为 SOPs 项目做出贡献！本文档提供了参与项目开发的指南。

---

## 📋 目录

1. [行为准则](#行为准则)
2. [如何贡献](#如何贡献)
3. [开发流程](#开发流程)
4. [代码规范](#代码规范)
5. [提交规范](#提交规范)
6. [Pull Request 流程](#pull-request-流程)
7. [问题报告](#问题报告)

---

## 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

---

## 如何贡献

### 贡献类型

你可以通过以下方式为项目做出贡献：

1. **报告 Bug** - 发现问题并提交 Issue
2. **建议功能** - 提出新功能或改进建议
3. **编写代码** - 修复 Bug 或实现新功能
4. **改进文档** - 完善项目文档
5. **代码审查** - 审查其他人的 Pull Request
6. **测试** - 编写或改进测试用例

---

## 开发流程

### 1. Fork 项目

点击项目页面右上角的 "Fork" 按钮，将项目 fork 到你的账户下。

### 2. 克隆仓库

```bash
git clone https://github.com/your-username/SOPs.git
cd SOPs
```

### 3. 安装依赖

```bash
npm install
```

### 4. 创建分支

```bash
# 功能分支
git checkout -b feature/your-feature-name

# Bug 修复分支
git checkout -b fix/bug-description

# 文档分支
git checkout -b docs/documentation-improvement
```

### 5. 开发

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### 6. 提交更改

```bash
git add .
git commit -m "feat: add new feature"
```

### 7. 推送到 GitHub

```bash
git push origin feature/your-feature-name
```

### 8. 创建 Pull Request

在 GitHub 上创建 Pull Request，描述你的更改。

---

## 代码规范

### TypeScript 规范

- 使用 TypeScript 严格模式
- 避免使用 `any` 类型
- 为所有函数提供类型注解
- 使用接口定义对象结构

```typescript
// ✅ 推荐
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): User {
  // ...
}

// ❌ 不推荐
function getUser(id: any): any {
  // ...
}
```

### 命名规范

- **文件名**: camelCase（如 `eventBus.ts`）
- **组件**: PascalCase（如 `AlpinePanel.ts`）
- **类名**: PascalCase（如 `UserManager`）
- **函数名**: camelCase（如 `getUserName`）
- **常量**: UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
- **私有属性**: 前缀 `_`（如 `_cache`）

### CSS 规范

- 使用设计令牌而非硬编码值
- 遵循 BEM 命名规范
- 使用 Tailwind CSS 工具类优先

```css
/* ✅ 推荐 */
.user-card {
  color: var(--color-blue-500);
  padding: var(--spacing-4);
}

/* ❌ 不推荐 */
.user-card {
  color: #3b82f6;
  padding: 16px;
}
```

### 代码组织

- 按功能组织文件，而非按类型
- 保持函数简短（< 50 行）
- 避免深层嵌套（< 3 层）
- 使用有意义的变量名

---

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构（既不是新增功能，也不是修复 Bug）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动
- `ci`: CI 配置文件和脚本的变动
- `revert`: 回滚之前的提交

### 示例

```bash
# 新功能
git commit -m "feat(auth): add user login functionality"

# Bug 修复
git commit -m "fix(router): fix navigation error on page reload"

# 文档更新
git commit -m "docs(readme): update installation instructions"

# 重构
git commit -m "refactor(storage): migrate to StorageService"

# 性能优化
git commit -m "perf(render): optimize list rendering performance"
```

### 提交消息规则

1. **subject** 不超过 50 个字符
2. 使用祈使句（如 "add" 而非 "added"）
3. 首字母小写
4. 结尾不加句号
5. **body** 详细描述改动原因和内容
6. **footer** 包含 Breaking Changes 或关闭的 Issue

---

## Pull Request 流程

### 1. PR 标题

使用与提交消息相同的格式：

```
feat(module): add new feature
fix(component): fix bug description
```

### 2. PR 描述

使用以下模板：

```markdown
## 描述
简要描述这个 PR 的目的和内容。

## 改动类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 性能优化
- [ ] 测试

## 测试
描述你如何测试这些改动。

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 已运行 `npm run lint` 并通过
- [ ] 已运行 `npm run type-check` 并通过
- [ ] 已运行 `npm run test` 并通过
- [ ] 已更新相关文档
- [ ] 已添加必要的测试

## 截图（如适用）
添加截图帮助解释你的改动。

## 相关 Issue
关闭 #issue_number
```

### 3. 代码审查

- 至少需要 1 个审查者批准
- 解决所有审查意见
- 确保 CI 检查通过

### 4. 合并

- 使用 "Squash and merge" 合并策略
- 确保提交消息清晰
- 删除已合并的分支

---

## 问题报告

### Bug 报告

使用以下模板报告 Bug：

```markdown
## Bug 描述
清晰简洁地描述 Bug。

## 复现步骤
1. 进入 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## 预期行为
描述你期望发生什么。

## 实际行为
描述实际发生了什么。

## 截图
如果适用，添加截图帮助解释问题。

## 环境
- OS: [如 Windows 11]
- Browser: [如 Chrome 120]
- Version: [如 1.0.0]

## 额外信息
添加任何其他关于问题的信息。
```

### 功能请求

使用以下模板请求新功能：

```markdown
## 功能描述
清晰简洁地描述你想要的功能。

## 问题
这个功能解决了什么问题？

## 建议的解决方案
描述你希望如何实现这个功能。

## 替代方案
描述你考虑过的其他替代方案。

## 额外信息
添加任何其他关于功能请求的信息。
```

---

## 开发环境设置

### 必需工具

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 推荐工具

- VS Code
- VS Code 扩展：
  - ESLint
  - Prettier
  - TypeScript Vue Plugin (Volar)
  - Tailwind CSS IntelliSense

### 环境配置

1. 复制 `.env.example` 到 `.env`
2. 配置必要的环境变量
3. 运行 `npm run dev` 启动开发服务器

---

## 测试指南

### 单元测试

```bash
# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试 UI
npm run test:ui
```

### E2E 测试

```bash
# 运行 E2E 测试
npm run test:e2e

# 运行 E2E 测试 UI
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug
```

### 编写测试

- 为所有新功能编写测试
- 为 Bug 修复编写回归测试
- 保持测试独立和可重复
- 使用描述性的测试名称

---

## 文档指南

### 文档类型

1. **代码注释** - 解释复杂逻辑
2. **API 文档** - 描述公共 API
3. **使用指南** - 如何使用功能
4. **架构文档** - 系统设计和架构

### 文档规范

- 使用 Markdown 格式
- 保持文档简洁清晰
- 提供代码示例
- 及时更新文档

---

## 发布流程

### 版本号规则

遵循 [Semantic Versioning](https://semver.org/)：

- **主版本号（Major）**: 不兼容的 API 修改
- **次版本号（Minor）**: 向下兼容的功能性新增
- **修订号（Patch）**: 向下兼容的问题修正

### 发布检查清单

- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] CHANGELOG.md 已更新
- [ ] 版本号已更新
- [ ] 创建 Git tag
- [ ] 推送到远程仓库

---

## 获取帮助

如果你有任何问题，可以通过以下方式获取帮助：

1. 查看项目文档
2. 搜索已有的 Issues
3. 创建新的 Issue
4. 联系维护者

---

## 许可证

通过贡献代码，你同意你的贡献将在 MIT 许可证下发布。

---

**感谢你的贡献！** 🎉

---

**最后更新**: 2026-04-17  
**维护者**: sops 开发团队
