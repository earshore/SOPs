# 测试策略（Testing Strategy）

**Status:** active · SSOT · v1.0  
**Updated:** 2026-07-26  
**Owner:** 工程负责人  
**适用范围:** 全部功能开发、重构、发版  

> **本文是测试策略唯一现行权威。**  
> `tests/TEST_GUIDE.md`、`tests/README.md` 作为**操作手册/命令索引**；若与本文冲突，**以本文为准**。  
> 旧指南中「2025-01-XX / 覆盖率口号」不得单独作为门禁依据。

---

## 1. 目标

1. **阻止回归**进入 `main` 与生产 Pages。  
2. **按风险分级**投入测试，而非平均覆盖率虚荣指标。  
3. **规范可执行**：每条要求对应命令或明确人工清单。  
4. **与产品原则一致**：危险路径、保存契约、安全渲染必须可测。

---

## 2. 测试分层

```
        E2E / 视觉（少而稳）
     ─────────────────────
      集成 / 契约 / 门禁脚本
     ─────────────────────
         单元测试（主体）
```

| 层 | 用途 | 典型工具 | 速度 |
| --- | --- | --- | --- |
| **Unit** | 纯逻辑、normalize、保存契约、解析器 | Vitest | 快 |
| **Contract / Template** | HTML 字符串契约、关键 class/testid 仍在 | Vitest | 快 |
| **Integration** | 模块协作、存储、EventBus | Vitest + mock | 中 |
| **E2E** | 真实浏览器关键用户路径 | Playwright | 慢 |
| **Visual** | 截图回归（主题/壳层） | Playwright / pixelmatch | 慢 |
| **Performance** | Lighthouse 预算 | 现有 lighthouse 脚本 | 慢 |
| **Static gates** | 类型、lint、安全、CSS/token 审计 | prebuild / CI | 中 |

---

## 3. 风险分级与强制要求

| 风险 | 示例 | 合入 `main` 最低要求 |
| --- | --- | --- |
| **R0 安全/数据破坏** | XSS 渲染、密钥存储、清空数据、导入 replace | 单测 + 相关门禁；危险路径 e2e 或强单测；禁止 skip |
| **R1 资金/采集/LLM 主路径** | 发送对话、分析运行、采集、PPC 主流程 | 单测核心逻辑 + 至少一条 e2e 或 release-smoke 覆盖点 |
| **R2 配置契约** | 系统设置保存、runtime/tool strategy、深链 | 单测契约 + settings e2e 子集（改设置时） |
| **R3 体验/布局** | 导航、折叠、文案、主题切换 | 单测或 e2e 烟雾；视觉可选 |
| **R4 纯文档/注释** | docs only | 无强制测试 |

**原则：** 风险越高，越不能只靠「我点过了」。

---

## 4. 命令地图（现行）

| 目的 | 命令 |
| --- | --- |
| 类型检查 | `npm run type-check` |
| 全量/相关单测 | `npm run test` / `npx vitest run <path>` |
| 设置域单测 | `npm run test:unit:settings` |
| 设置域 e2e | `npm run test:e2e:settings` |
| Release smoke | `npm run test:e2e:smoke` |
| 设置闭环（类型+单测+smoke+settings e2e） | `npm run test:settings` |
| 安全门 | `npm run ci:security` |
| 质量门 | `npm run ci:quality` |
| 完整构建（含 prebuild） | `npm run build` |
| 仅产物（宿主构建） | `npm run build:app` |

发版流水线：见 [CI-QUALITY-GATES](./CI-QUALITY-GATES.md)、[RELEASE_POLICY](./RELEASE_POLICY.md)。

---

## 5. 编写标准

### 5.1 单元测试

- **AAA**（Arrange-Act-Assert）或 Given-When-Then。  
- 测试行为与契约，不测实现细节八卦。  
- Mock 边界：网络、DOM 全局、安全存储。  
- 失败信息可读；禁止 `expect(true).toBe(true)` 占位。  
- 修复 bug：**先补失败用例（若可行）再改代码**。

### 5.2 模板/契约测试

适用于巨型 Alpine 模板（如系统设置）：

- 锁定关键 `data-testid`、保存按钮文案、导航结构。  
- 不替代逻辑单测。

### 5.3 E2E

- 稳定选择器：优先 `data-testid` / role + name。  
- **禁止**依赖公网 LLM/真实代理（用 mock 或只测 UI 可达）。  
- 一条用例一个主断言目标；控制时长。  
- `test.skip` 超过一个迭代必须有 ticket / 债务板条目。

### 5.4 视觉回归

- 指南：`docs/testing/visual-regression-testing.md`。  
- **现行要求：** 主题或壳层大改时，发版 checklist 应包含关键页人工或自动截图对比；全量视觉 CI 仍为增强项（见 TECH_DEBT_BOARD）。

---

## 6. 覆盖率政策（诚实版）

| 声明 | 政策 |
| --- | --- |
| 仓库不将「行覆盖率 ≥80%」作为唯一合并门槛 | 除非 CI 显式启用并写进本页 |
| 强制的是 **风险路径有测试** + **门禁绿** | 见 §3、§4 |
| 新模块核心逻辑 | 必须有单测入口；禁止「只有 UI 无测」的 R1 逻辑 |

---

## 7. PR 测试说明模板（建议粘贴）

```markdown
## Risk
- [ ] R0 / R1 / R2 / R3 / R4

## Tests
- Commands run:
  - [ ] npm run type-check
  - [ ] npx vitest run <paths>
  - [ ] npm run test:e2e:smoke  (if R0–R2 UI)
- New/updated tests: <list>
- Not covered (why): <list>
```

---

## 8. 与设置域示例

系统设置是「契约 + e2e」样板：

- 单测：`tests/unit/systemSettings*.test.ts`  
- E2E：`tests/e2e/system-settings.spec.ts`  
- 闭环：`npm run test:settings`  
- Spec 级矩阵：`docs/superpowers/specs/2026-07-25-system-settings-enterprise-hardening-design.md` §7  

新复杂配置面应复制该模式，而非只加手动清单。

---

## 9. 反模式

| 禁止 | 原因 |
| --- | --- |
| 只手点不写测 | 不可回归 |
| 长期 `it.skip` / flaky 不管 | 假绿 |
| E2E 打真 LLM | 不稳定、费密钥 |
| 用覆盖率数字替代风险测试 | 虚假安全感 |
| 删除 BASE 断言「为了变绿」 | 掩盖回归 |

---

## 10. 相关文档

| 文档 | 角色 |
| --- | --- |
| [tests/README.md](../tests/README.md) | 目录与命令 |
| [tests/TEST_GUIDE.md](../tests/TEST_GUIDE.md) | 历史编写手册（**非**策略 SSOT） |
| [CI-QUALITY-GATES.md](./CI-QUALITY-GATES.md) | 门禁清单 |
| [visual-regression-testing.md](./testing/visual-regression-testing.md) | 视觉工具 |
| [TECH_DEBT_BOARD.md](./TECH_DEBT_BOARD.md) | 测试债 open 项 |
