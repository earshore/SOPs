# 产品原则（Product Principles）

**Status:** active · SSOT  
**Updated:** 2026-07-26  
**Owner:** 产品规划 + 工程负责人  
**适用范围:** 全部功能、UI、文档与发版决策  

> 本文回答：**我们在做什么产品、不做什么、如何判断对错**。  
> 实现细则见 [INDEX 现行规范](./INDEX.md)；功能增量见 `docs/superpowers/`。

---

## 1. 产品定位

| 项 | 定义 |
| --- | --- |
| **是什么** | 内部亚马逊运营作业系统（工作台）：流程、工具、知识与本地 AI 辅助 |
| **不是什么** | 对外营销官网、多租户 SaaS、云端账号中心、密钥托管平台 |
| **交付形态** | 静态前端（Cloudflare Pages）+ 浏览器本地数据 + BYOK（用户自备 LLM/采集网关） |
| **成功标准** | 作业可完成、风险可感知、配置可恢复、发版可回滚、规范可执行 |

### 1.1 核心用户作业

1. 按模块完成运营/分析/文案/广告作业  
2. 配置本机连接（模型、代理、策略）并可信保存  
3. 在可预期的 UI 中扫描信息、确认危险操作、导出备份  

### 1.2 明确非目标（Out of scope）

除非产品路线图书面变更，否则**不做**：

- 云端多用户 / RBAC / 组织策略同步  
- 服务端代持生产 LLM API Key  
- 营销落地页式全站视觉换肤  
- 无障碍「形式合规」而无键盘关键路径  
- 为每个业务页新建一套弹窗 / 按钮 / 主题引擎  

---

## 2. 体验原则（Experience）

| # | 原则 | 可执行含义 |
| --- | --- | --- |
| P1 | **工具优先** | 清晰、可扫读、稳定；禁止页面级营销 hero / 粒子装饰 |
| P2 | **先归属再表达** | 主色先服从模块/目录归属，再谈业务强调 |
| P3 | **危险可感知** | 不可逆操作必须二次确认；文案说清后果 |
| P4 | **本机数据诚实** | 密钥/备份边界写进 UI；不假装「云端安全」 |
| P5 | **少打断** | 能页内完成的不用模态；设置用抽屉，确认用共享 confirm |
| P6 | **即时反馈** | 按钮型偏好可即时保存；表单型配置显式保存且**保存后不强制关面板** |
| P7 | **去 AI 味文案** | 不写正确的废话；错误/空状态可操作 |
| P8 | **可回滚** | 发版可回退 Pages；设置关键写盘可理解（导出/确认/脏检查） |

---

## 3. 架构边界（产品 ↔ 工程）

| 边界 | 决策 |
| --- | --- |
| 静态站 | 生产 = Cloudflare Pages，`dist/` |
| LLM | 浏览器 → 用户配置的 OpenAI 兼容网关；治理在网关后台 |
| 状态 | 默认本机；云同步不在当前合同内 |
| 主题 | Appearance 只改全局 primary/focus；**不**覆盖模块归属色 |
| 监控 | Sentry **默认关**；开启须改 CSP 并写进发版说明 |
| 规范 | 现行文档以 `docs/INDEX.md` 列表为准；archive / `.kiro` 只读 |

---

## 4. 功能交付 Definition of Done（强制）

任一用户可见功能合入 `main` 前，须同时满足：

| # | 要求 | 证据 |
| --- | --- | --- |
| 1 | 符合本原则与触及的领域规范 | PR 描述勾选（见 INDEX 决策树） |
| 2 | 类型 / lint / 相关单测通过 | `type-check`、相关 `vitest` |
| 3 | 安全：无密钥入库；用户 HTML 安全渲染 | 门禁 + 代码审查 |
| 4 | 危险路径有确认或等价保护 | 交互说明或测试 |
| 5 | 不引入第二套视觉/弹窗/存储语义 |  diff 审查 |
| 6 | 文档：规范变更改 SSOT；功能增量可写 Spec | `docs/` 或 `superpowers/` |

发版额外要求见 [RELEASE_POLICY.md](./RELEASE_POLICY.md) 与 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 5. 规范变更流程

1. **提案**：PR 或 Spec 说明「改哪本 SSOT、为什么、影响面」。  
2. **冲突裁决**：主题/颜色 → `THEME_SYSTEM_GUIDELINES`；页面视觉 → `VISUAL`；弹层 → `MODAL`；组件 → `COMPONENT_GUIDELINES`；产品定位 → **本文**。  
3. **落地**：改 SSOT + 必要时加/改门禁或测试。  
4. **降级**：过期文档标 `historical` 并移出 INDEX「现行规范」，或迁入 `docs/archive/`。

禁止：在业务 PR 里「顺便」改规范语义却不更新 SSOT。

---

## 6. 相关文档

| 文档 | 关系 |
| --- | --- |
| [INDEX.md](./INDEX.md) | 现行规范导航与 30 秒决策树 |
| [THEME_SYSTEM_GUIDELINES.md](./THEME_SYSTEM_GUIDELINES.md) | 主题宪法 |
| [VISUAL_DESIGN_GUIDELINES.md](./VISUAL_DESIGN_GUIDELINES.md) | 视觉细则 |
| [COMPONENT_GUIDELINES.md](./COMPONENT_GUIDELINES.md) | 组件契约 |
| [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) | 测试策略 SSOT |
| [TECH_DEBT_BOARD.md](./TECH_DEBT_BOARD.md) | 活债务看板 |
| [CONTENT_DESIGN.md](./CONTENT_DESIGN.md) | 文案与语气 |
| [ACCESSIBILITY.md](./ACCESSIBILITY.md) | 无障碍底线与抽检 |
| [OPS_RUNBOOK.md](./OPS_RUNBOOK.md) | 运维最低信号包与回滚 |
| [SECURITY.md](../SECURITY.md) | 安全策略（报告渠道） |
| [SECURITY_PLAYBOOK.md](./SECURITY_PLAYBOOK.md) | 威胁模型 + 安全验收清单 |
| [OPERATING_SYSTEM_ROADMAP.md](./OPERATING_SYSTEM_ROADMAP.md) | 产品作业系统路线（规划，非组件 SSOT） |
