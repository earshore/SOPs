# 技术债务消除计划

**创建日期**: 2026-06-07  
**状态**: 执行中  
**目标**: 系统性消除所有已识别的技术债务，提升代码质量和安全性

---

## 🎯 总体目标

1. **安全性优先**: 修复所有 XSS 安全风险
2. **架构优化**: 消除循环依赖，规范 Logger 使用
3. **代码质量**: 减少 ESLint 警告，提升代码可维护性

---

## 📊 当前债务统计

### 1. 安全债务 (最高优先级)
| 类型 | 数量 | 严重程度 | 状态 |
|------|------|---------|------|
| XSS - CRITICAL | 0 | 🔴 P0 | ✅ 已清零 |
| XSS - HIGH | 0 | 🟠 P0 | ✅ 已清零 |
| XSS - MEDIUM | 0 | 🟡 P1 | ✅ 已清零 |
| XSS - INFO | 0 | ⚪ P2 | ✅ 已清零 |
| 已审计安全跳过 | 81 | - | ✅ 已由扫描器识别 |
| 清空DOM跳过 | 19 | - | ✅ 已由扫描器识别 |
| **总计待处理** | **0** | - | **安全债务已清零** |

### 2. 架构债务
| 类型 | 数量 | 影响 | 状态 |
|------|------|------|------|
| Logger 循环依赖 | 139 | 架构耦合 | 待修复 |
| 代码复杂度过高 | ~50 | 可维护性 | 待优化 |
| 函数参数过多 | ~30 | 可读性 | 待重构 |

### 3. 代码质量债务
| 类型 | 数量 | 状态 |
|------|------|------|
| ESLint Warnings | 639 | 已追踪 |
| TypeScript `any` | ~200 | 待类型化 |
| Non-null Assertions | ~100 | 待优化 |

---

## 🗓️ 执行计划 (分阶段)

## Phase 1: 安全加固 (Week 1-2) 🔒

**目标**: 修复所有 P0 级别的 XSS 安全风险

### Batch 1.1: CRITICAL 级别 XSS (12 个) - Day 1-3
- [x] `PerformanceMonitor.ts` (7 个风险)
- [x] `MemoryDevTools.ts` (3 个风险)
- [x] 其他严重风险文件 (2 个风险)

### Batch 1.2: HIGH 级别 XSS (14 个) - Day 4-6
- [x] 审查和修复所有高危 innerHTML 使用
- [x] 实施 `setSafeHtml()` 工具函数
- [x] 添加输入验证和转义

### Batch 1.3: MEDIUM 级别 XSS (81 个) - Day 7-10
- [x] 按模块分组修复/复核
- [x] 优先处理用户输入相关的风险点
- [x] 更新模板渲染逻辑，`SafeRenderer` 默认使用 `setSafeHtml()`

**成功标准**:
- ✅ 所有 CRITICAL 和 HIGH 风险清零
- ✅ MEDIUM 风险清零
- ✅ `npm.cmd run xss:gate` 扫描风险点为 0

---

## Phase 2: 架构优化 (Week 3-4) 🏗️

**目标**: 消除 Logger 循环依赖，优化架构设计

### Batch 2.1: Logger 依赖解耦 - 基础设施层 (Week 3)

**策略**: 按模块分批重构，使用 `console` 替代 `Logger`

#### 2.1.1 Core Infrastructure (Day 1-2)
- [ ] `EventBus.ts` - 移除 Logger，使用 console
- [ ] `BaseModule.ts` / `StandardModule.ts`
- [ ] `ConfigCenter.ts` / `themeConfig.ts`
- [ ] `Container.ts` / `ServiceRegistry.ts`

#### 2.1.2 Router & Navigation (Day 3)
- [ ] `initRouter.ts`
- [ ] `NavigoAdapter.ts`
- [ ] `LegacyAdapter.ts`
- [ ] `builtinGuards.ts` / `builtinMiddlewares.ts`

#### 2.1.3 Common Utils (Day 4)
- [ ] `actionRegistry.ts`
- [ ] `cssLoader.ts` / `moduleCssLoader.ts`
- [ ] `viewLoader.ts`
- [ ] `LoadingManager.ts`
- [ ] `ImageLazyLoader.ts`

#### 2.1.4 Components & UI (Day 5)
- [ ] `button-ripple.ts`
- [ ] `form-animation.ts`
- [ ] `systemSettings.ts`
- [ ] UI utility files

**实施规范**:
```typescript
// ❌ 移除
import { Logger } from '@services/loggerService';
Logger.info('message', data);

// ✅ 替换为
console.log('[ModuleName]', 'message', data);
console.warn('[ModuleName]', 'warning', data);
console.error('[ModuleName]', 'error', data);
```

### Batch 2.2: Services Layer 重构 (Week 4)

**策略**: 允许 Services 使用 Logger，但优化导入方式

#### 2.2.1 审查真正需要 Logger 的服务 (Day 1)
- [ ] 识别必须使用 Logger 的场景
- [ ] 区分基础设施服务 vs 业务服务

#### 2.2.2 服务分层 (Day 2-3)
- [ ] Tier 1: 基础设施服务 (使用 console)
- [ ] Tier 2: 核心服务 (可使用 Logger)
- [ ] Tier 3: 业务服务 (可使用 Logger)

#### 2.2.3 更新 ESLint 规则 (Day 4)
- [ ] 重新定义 no-restricted-imports 规则
- [ ] 按文件夹分层配置
- [ ] 验证构建通过

**成功标准**:
- ✅ 0 个 Logger 循环依赖错误
- ✅ ESLint 规则从 warning 恢复为 error
- ✅ 架构清晰，分层明确

---

## Phase 3: 代码质量提升 (Week 5-6) ✨

**目标**: 降低代码复杂度，提升可维护性

### Batch 3.1: 降低代码复杂度 (Week 5)

#### 3.1.1 高复杂度函数重构 (Day 1-3)
优先处理复杂度 > 20 的函数:
- [ ] `SafeModuleLoader.classifyError` (复杂度 68)
- [ ] `llmService.callLLM` (复杂度 45)
- [ ] `NavigoAdapter.navigate` (复杂度 38)
- [ ] `ProductOverviewAdapter.normalizeReport` (复杂度 32)

**重构策略**:
- 提取子函数
- 使用策略模式
- 简化条件逻辑

#### 3.1.2 长函数拆分 (Day 4-5)
处理 > 100 行的函数:
- [ ] `createScraperPanel` (610 行)
- [ ] `createAiAnalysisPanel` (621 行)
- [ ] `SafeModuleLoader.classifyError` (221 行)
- [ ] `llmService.callLLM` (252 行)

### Batch 3.2: 参数优化 & 类型安全 (Week 6)

#### 3.2.1 减少函数参数 (Day 1-2)
- [ ] 识别参数 > 5 的函数 (~30 个)
- [ ] 使用参数对象重构
- [ ] 保持向后兼容

#### 3.2.2 消除 `any` 类型 (Day 3-4)
- [ ] 审查所有 `@typescript-eslint/no-explicit-any` 警告 (~200)
- [ ] 定义明确的类型接口
- [ ] 优先处理公共 API

#### 3.2.3 优化 Non-null Assertions (Day 5)
- [ ] 审查所有 `!` 使用 (~100 处)
- [ ] 添加类型守卫
- [ ] 使用可选链和空值合并

**成功标准**:
- ✅ 平均函数复杂度 < 8
- ✅ 平均函数长度 < 50 行
- ✅ `any` 类型使用 < 50 处
- ✅ ESLint 警告 < 300

---

## Phase 4: 持续改进 (Week 7+) 🚀

### Batch 4.1: 自动化质量保障
- [ ] 配置 pre-commit hooks
- [ ] 集成 SonarQube / CodeQL
- [ ] 自动化 XSS 扫描
- [ ] 性能回归测试

### Batch 4.2: 文档完善
- [ ] 更新架构文档
- [ ] 编写重构指南
- [ ] 创建最佳实践文档

### Batch 4.3: 团队培训
- [ ] 安全编码培训
- [ ] 架构设计分享
- [ ] Code Review 规范

---

## 📈 进度追踪

### 里程碑

| 里程碑 | 目标日期 | 完成标准 | 状态 |
|--------|---------|---------|------|
| M1: 安全加固完成 | Week 2 | XSS HIGH+ = 0，MEDIUM = 0 | ✅ 已完成 |
| M2: 架构优化完成 | Week 4 | Logger 依赖清零 | ⏳ 待开始 |
| M3: 代码质量达标 | Week 6 | ESLint 警告 < 300 | ⏳ 待开始 |
| M4: 持续改进落地 | Week 8 | 自动化流程就绪 | ⏳ 待开始 |

### 每周报告

**Week 1 (2026-06-07 ~ 2026-06-13)**
- ✅ 创建技术债务消除计划
- ✅ 修复构建阻塞问题 (Logger imports)
- ✅ 完成 Phase 1.1/1.2: CRITICAL/HIGH XSS 清零
- ✅ 建立可信 XSS gate: `npm run xss:gate`
- ✅ 完成 Phase 1.3: MEDIUM XSS 从 16 个降至 0 个
- ✅ 同步 P0/CI/XSS 报告最新统计
- 📊 进度: 25%

---

## 🛠️ 工具和资源

### 自动化工具
- XSS Scanner: `npm run xss:scan`
- Circular Dependency Check: `npm run circular:check`
- ESLint: `npm run lint`
- Type Check: `npm run type-check`

### 参考文档
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

## 📝 变更日志

### 2026-06-07
- 初始计划创建
- 完成债务盘点和分类
- 修复构建阻塞问题 (139 Logger imports -> warning)
- 优化 XSS 扫描器并接入 `ci:security`
- 清零 CRITICAL/HIGH/MEDIUM/INFO XSS
