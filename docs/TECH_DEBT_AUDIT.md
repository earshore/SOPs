# 技术债务审计报告

**审计日期**: 2026-06-07  
**审计范围**: `docs/` 下质量与技术债报告、当前 CI 门禁、`src/` 代码扫描和测试验证结果  
**结论**: 未发现仍阻塞发布的 P0 技术债；当前残留主要是 P1/P2 可维护性债务。

---

## 验证结果

| 验证项 | 命令 | 当前结果 |
|--------|------|----------|
| XSS 风险 | `npm run xss:scan` | 323 个源文件，0 个风险点 |
| 循环依赖 | `npm run circular:check` | 326 个文件，0 个循环依赖 |
| 应用类型检查 | `npm run type-check` | 通过 |
| 测试类型检查 | `npm run type-check:tests` | 通过 |
| ESLint warning gate | `npm run lint:warning-gate` | 342/342 warning，基线内通过 |
| 全量单元/集成测试 | `npm test -- --run` | 通过 |
| 构建 | `npm run build` | 通过，仍有构建 warning |
| 技术债扫描 | `npm run tech-debt:scan` | 1185 项：0 critical、0 high、297 medium、888 low |

## 当前残留技术债

| 类型 | 数量 | 等级 | 说明 |
|------|------|------|------|
| 重复代码块 | 234 | medium | 技术债扫描器按 10 行滑窗统计，可能包含重叠命中；处理前需要逐处确认真实重复。 |
| `any` 类型边界 | 0 | - | 扫描器命中的 `any-type` 已清零；剩余 `anywhere` 命中为 CSS 文本误报。 |
| 过长函数 | 44 | medium | 集中在大型组件、路由/模块加载、AI analysis、Keyword Hunter、服务层流程。 |
| 过深嵌套 | 19 | medium | 集中在路由导航、系统设置、Promptlab、`llmService` 和 PPC 搜索词模块。 |
| `console.log` / `console.info` | 648 | low | 多为调试或运行时诊断输出；需按模块判断是否应保留、降级或接入 Logger。 |
| `console.warn` | 238 | low | 多为运行时诊断输出；不等同于功能缺陷。 |
| TODO 注释 | 2 | low | `src/common/router/navigo/builtinGuards.ts` 中认证/权限逻辑仍是占位。 |

## 已纠正的过期结论

- 旧报告中的 `639` 个 ESLint warning 已过期；当前 warning gate 基线为 `342/342`。
- 旧扫描中的 `any-type` 已清零；不要再按旧的 54 项 `any` 类型边界制定清理计划。
- 旧报告中的“全量 Vitest OOM”和 `type-check:tests` 失败已过期；两项本次均通过。
- XSS 和循环依赖仍为 0，旧报告中的 P0 清零结论经本次复核仍成立。
- 构建仍通过，但构建 warning 仍存在：Vite 动态/静态 import 混用、chunk 体积超过 300 kB、Node `DEP0190`。
- `docs/archive/quality/` 下报告只保留历史阶段记录，不应再作为当前执行清单。
- `.kiro/arch-debt/` 中的架构债务资料是早期规划快照；当前剩余债务以本文和当前脚本结果为准。

## 建议处理顺序

1. 先处理会影响 CI 趋势的 ESLint warning：保持 `lint:warning-gate` 不回退，并逐步把 342 基线压低。
2. 再处理 medium 债务：优先拆分真实重复代码、超长函数和深嵌套热点。
3. 最后处理 low 债务：清理 console 噪音、补齐认证/权限 TODO。

---

**下次复核建议**: 修改质量门禁、测试基础设施、AI analysis 数据模型、PPC 搜索词模块或构建配置后重新运行本文中的验证命令。
