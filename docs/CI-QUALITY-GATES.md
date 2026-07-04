# CI质量门禁文档

**生成时间**: 2026-06-07  
**版本**: 1.0.0  
**维护团队**: DevOps & Security Team

---

## 📋 概述

本文档定义了SOPs项目的CI质量门禁标准，确保所有代码变更都通过自动化安全检查和质量验证，防止P0级技术债务回退。

---

## 🎯 质量门禁流程

### 构建前检查 (Pre-build)

所有构建操作（`npm run build`）会自动触发以下检查：

```bash
npm run prebuild
```

执行顺序：
1. **安全检查** (`npm run ci:security`)
   - XSS安全门
   - 循环依赖检查

2. **代码质量检查** (`npm run ci:quality`)
   - TypeScript类型检查
   - ESLint代码规范检查
   - ESLint warning baseline gate
   - 测试 TypeScript 类型检查
   - 测试 ESLint 检查
   - Prettier 格式检查

3. **构建验证** (`npm run build`)
   - Vite构建成功
   - 无构建错误；构建警告进入后续优化清单

---

## 🔐 安全检查 (CI Security)

### 1. 循环依赖检查

**命令**: `npm run circular:check`

**工具**: madge

**检查内容**:
- 扫描 `src/` 目录下所有 `.ts` 文件
- 检测模块间的循环依赖关系

**通过标准**:
```
✔ No circular dependency found!
```

**失败处理**:
- 构建中断
- 必须修复所有循环依赖后才能继续

**示例**:
```bash
$ npm run circular:check
✔ No circular dependency found!
```

### 2. XSS安全门

**命令**: `npm run xss:gate`

**工具**: 自定义XSS扫描器 (`tools/security/xss-scanner.js`)

**检查内容**:
- 扫描不安全的DOM操作 (innerHTML, outerHTML, insertAdjacentHTML)
- 检测eval/Function构造器
- 验证用户输入处理
- 检查动态脚本注入

**风险等级**:
- 🔴 严重 (Critical): 直接XSS漏洞
- 🟠 高危 (High): 未经清理的用户输入
- 🟡 中危 (Medium): 需要审查的模式
- 🟢 低危 (Low): 已清理但需要验证
- ⚪ 信息 (Info): 需要注意的模式

**通过标准**:
- 严重风险: 0个
- 高危风险: 0个

`npm run xss:scan` 用于生成完整报告；`npm run xss:gate` 才是 CI 阻断命令。

**报告位置**: `docs/XSS_SCAN_REPORT.md`

---

## ✅ 代码质量检查 (CI Quality)

### 1. TypeScript类型检查

**命令**: `npm run type-check`

**测试类型命令**: `npm run type-check:tests`

**工具**: TypeScript Compiler (tsc)

**检查内容**:
- 所有TypeScript类型错误
- 类型推断问题
- 接口一致性
- 泛型使用正确性

**通过标准**:
- 0个类型错误
- 0个编译错误

**配置文件**: `tsconfig.app.json`

**示例**:
```bash
$ npm run type-check
# 无输出表示通过
```

### 2. ESLint代码规范检查

**命令**: `npm run lint`

**测试 lint 命令**: `npm run lint:tests`

**工具**: ESLint 8.x

**检查内容**:
- 代码风格一致性
- 安全规则 (XSS防护)
- 循环依赖防护规则
- 复杂度控制
- 最佳实践

**关键规则**:

#### XSS防护规则
```javascript
"no-restricted-syntax": [
  "warn",
  {
    selector: "AssignmentExpression[left.property.name='innerHTML']",
    message: "避免直接使用innerHTML。请使用textContent或setSafeHtml()函数"
  }
]
```

#### 循环依赖防护
```javascript
"no-restricted-imports": [
  "error",
  {
    patterns: [{
      group: ["**/loggerService"],
      message: "基础设施服务不应依赖Logger以避免循环依赖"
    }]
  }
]
```

#### 复杂度控制
- `complexity`: 圈复杂度 ≤ 10
- `max-params`: 参数数量 ≤ 5
- `max-depth`: 嵌套深度 ≤ 4
- `max-lines-per-function`: 函数行数 ≤ 100

**通过标准**:
- 0个错误 (error)
- 已有警告允许保留在 `config/eslint-warning-baseline.json` 基线内
- 新增或超过基线的 warning 由 `npm run lint:warning-gate` 阻断
- 测试 lint 为 0 error、0 warning

**配置文件**: `config/eslint.config.js`

### 3. ESLint warning baseline gate

**命令**: `npm run lint:warning-gate`

**工具**: `scripts/quality/eslint-warning-gate.ts`

**检查内容**:
- 运行 ESLint JSON 输出
- 与 `config/eslint-warning-baseline.json` 对比 warning bucket
- 阻止新增 warning 或已有 bucket 数量回升

**通过标准**:
- 当前 warning 数量不超过基线
- 当前结果: `0/0 warning(s)`

### 4. Prettier 格式检查

**命令**: `npm run format:check`

**工具**: Prettier 3.x，显式使用 `config/.prettierrc.json` 和 `config/.prettierignore`

**检查内容**:
- `src/**/*.{js,ts,jsx,tsx,json,css,md}` 是否符合项目格式
- 防止格式漂移绕过代码评审和后续机械改动

**通过标准**:
- 所有匹配文件符合 Prettier 格式

---

## 🚀 构建验证

**命令**: `npm run build`

**工具**: Vite 5.x

**检查内容**:
- 所有模块成功打包
- 依赖关系正确解析
- 代码分割正确执行
- 资源优化完成

**输出目录**: `dist/`

**通过标准**:
- 构建成功完成
- 无构建错误
- 生成所有预期的chunk和asset文件

---

## 📊 完整检查流程

### 开发环境

```bash
# 手动运行完整检查
npm run ci:all

# 单独运行各项检查
npm run circular:check      # 循环依赖
npm run xss:gate           # XSS安全门
npm run xss:scan           # XSS完整报告
npm run type-check         # 类型检查
npm run type-check:tests   # 测试类型检查
npm run lint               # 代码规范
npm run lint:tests         # 测试代码规范
npm run format:check       # 格式检查
npm run build              # 构建验证
```

### CI/CD环境

**GitHub Actions / GitLab CI 推荐配置**:

```yaml
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Security Check
        run: npm run ci:security
        
      - name: Quality Check
        run: npm run ci:quality
        
      - name: Build
        run: npm run build
```

---

## 🛡️ 例外情况和豁免

### 1. 基础设施层文件

**文件列表**:
- `**/ConfigCenter.ts`
- `**/config/schemas/**/*.ts`
- `**/typeGuards.ts`
- `**/menuConfig.ts`
- `**/ColorContext.ts`

**豁免规则**:
- 允许使用 `console` (no-console: off)
- 禁止导入 Logger (避免循环依赖)

### 2. 存储服务

**文件列表**:
- `**/storageService.ts`
- `**/secureStorage.ts`
- `**/persist.ts`

**豁免规则**:
- 允许直接访问 localStorage/sessionStorage

### 3. 测试文件

**文件模式**:
- `**/*.test.ts`
- `**/*.spec.ts`
- `tests/**/*.ts`

**豁免规则**:
- no-console: off
- no-explicit-any: off
- no-restricted-globals: off

### 4. Logger和开发工具

**文件列表**:
- `**/loggerService.ts`
- `**/devtools/**/*.ts`
- `**/DebugInterface.ts`

**豁免规则**:
- no-console: off
- no-restricted-syntax: off

---

## 📈 质量指标和目标

### 当前基线 (2026-06-07)

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| 循环依赖 | 0个 | 0个 | ✅ 达标 |
| XSS严重风险 | 0个 | 0个 | ✅ 达标 |
| XSS高危风险 | 0个 | 0个 | ✅ 达标 |
| XSS中危风险 | 0个 | 0个 | ✅ 达标 |
| TypeScript错误 | 0个 | 0个 | ✅ 达标 |
| ESLint错误 | 0个 | 0个 | ✅ 达标 |
| ESLint警告 | 0/0基线内 | 0个 | ✅ 达标 |
| 技术债扫描 | 1185项，0 critical / 0 high，297 medium / 888 low | 0 high | 🟡 P1/P2待处理 |
| 测试类型检查 | 通过 | 通过 | ✅ 达标 |
| 全量 Vitest | 通过 | 通过 | ✅ 达标 |
| 构建状态 | 成功，仍有构建 warning | 成功 | ✅ 达标 |

### 改进计划

**阶段1 (已完成)**:
- ✅ 消除所有循环依赖
- ✅ 修复 CRITICAL/HIGH XSS 风险点
- ✅ 添加ESLint防护规则
- ✅ 建立 `xss:gate` 阻断门禁

**阶段2 (进行中)**:
- ✅ 清零所有中危XSS风险
- ✅ 复核测试基础设施：`type-check:tests` 和全量 Vitest 通过
- ✅ 将 `type-check:tests`、`lint:tests` 和 `format:check` 纳入 `ci:quality` 与 GitHub Actions
- 🔄 治理构建警告: Vite 动态/静态 import 混用、chunk 体积偏大

**阶段3 (计划中)**:
- ⏳ 持续保持 ESLint warning 基线为 0
- ⏳ 分批处理技术债扫描中的 medium 项：重复代码、长函数、深嵌套
- ⏳ 完善安全编码培训

---

## 🔧 故障排查

### 常见问题

#### 1. 循环依赖检查失败

**症状**:
```
Processed 316 files (3s) (47 warnings)
✖ Found 5 circular dependencies!
```

**解决方案**:
1. 查看详细报告确定循环依赖链
2. 采用以下策略之一：
   - 延迟初始化 (dynamic import/require)
   - 类型导入 (`import type`)
   - 依赖注入
   - 直接使用底层API (如localStorage代替StorageService)
3. 参考已完成的修复案例：
   - Logger ↔ ConfigCenter: 基础设施层改用console
   - SidebarRenderer ↔ ColorContext: 类型内联定义
   - storageService ↔ secureStorage: 直接使用localStorage

#### 2. XSS扫描报告过多误报

**症状**:
已经使用了安全函数，但仍然被标记为风险

**解决方案**:
添加安全注释说明：
```typescript
// SAFE: 使用sanitizeHtml清理后的内容
element.innerHTML = sanitizedContent;
```

#### 3. TypeScript类型检查失败

**症状**:
```
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
```

**解决方案**:
1. 修复类型错误，不要使用 `@ts-ignore`
2. 如果是第三方库问题，添加类型声明文件
3. 运行 `npm run type-check` 获取详细错误位置

#### 4. ESLint检查失败

**症状**:
```
error  Do not use 'innerHTML' directly  no-restricted-syntax
```

**解决方案**:
1. 使用推荐的安全替代方案
2. 如果必须使用，添加 `// eslint-disable-next-line` 并注释原因
3. 运行 `npm run lint:fix` 自动修复部分问题

---

## 📚 相关文档

- [XSS扫描报告](./XSS_SCAN_REPORT.md)
- [技术债务审计报告](./TECH_DEBT_AUDIT.md)
- [架构债务清单](../.kiro/arch-debt/debt-list.md)
- [循环依赖修复记录](../.kiro/arch-debt/progress.md)
- [ESLint配置](../config/eslint.config.js)
- [TypeScript配置](../tsconfig.app.json)

---

## 🤝 贡献指南

### 添加新的质量门禁

1. 在 `package.json` 的 `scripts` 中添加检查命令
2. 更新 `ci:security` 或 `ci:quality` 脚本
3. 更新本文档添加新的检查说明
4. 更新CI/CD配置文件

### 修改现有规则

1. 修改 `config/eslint.config.js` 中的规则
2. 运行 `npm run lint` 验证影响范围
3. 更新本文档的相关章节
4. 提交PR并附上影响分析

---

## 📞 联系方式

**问题反馈**: 项目Issues
**技术支持**: DevOps Team
**安全问题**: Security Team

---

*最后更新: 2026-06-07*
