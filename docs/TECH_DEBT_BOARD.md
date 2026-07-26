# 技术债务看板（Living Tech Debt Board）

**Status:** active · **活** SSOT（open 项）  
**Updated:** 2026-07-26  
**Owner:** 工程负责人  

> **用法：** 只维护 **Open** 债务。已关闭项写 CHANGELOG 或移入历史段落，**禁止**用长篇「已完成荣誉榜」冒充当前债。  
> 历史快照：`docs/TECH_DEBT_AUDIT.md`（2026-07-15 及更早叙事）、`.kiro/arch-debt/*`（historical）。  
> 主题专项债：以 [THEME 路线图 D1–D12](./superpowers/specs/2026-07-26-theme-system-enterprise-audit-and-roadmap.md) 为准，并在本板汇总 ID。

---

## 如何更新

1. 发现债 → 新增一行 Open（含 ID、领域、影响、建议、证据）。  
2. 修复 → 移到 Closed（日期 + PR/commit）。  
3. 发版前扫一眼 P0/P1。  
4. 与规范冲突时：**先改规范或先改板，禁止双真相。**

---

## Open

| ID | 领域 | 描述 | 影响 | 建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| **TD-SET-01** | 架构 | `systemSettings.ts/html/css` 巨型单体（~2.5k+ 行级） | 评审难、冲突多、回归面大 | 按 section 拆分 + Domain 门面（Spec P3） | P1 |
| **TD-SET-02** | 配置 | 多保存入口（provider/tool/proxy/runtime/autoSave）文档化不足 | 开发者误用 | 在 COMPONENT/设置 Spec 维护「即时 vs 显式」矩阵；考虑 API 收敛 | P1 |
| **TD-SET-03** | 配置 | 数据区仍有独立「保存数据策略」 | 与归一化保存叙事不完全一致 | 评估并入策略保存或即时保存 storage 子集 | P2 |
| **TD-SET-04** | UX | 侧栏二级无滚动联动高亮 | 长页迷失 | IntersectionObserver 可选 | P2 |
| **TD-SET-05** | UX | 侧栏缺 Keyword Hunter 二级入口 | 发现性 | 补 nav children | P2 |
| **TD-THM-01** | 主题 | generated token 被手写 variables 覆盖（D1） | Appearance 漂移 | 见主题路线图 Phase token 收口 | P1 |
| **TD-THM-02** | 主题 | 大量 Tailwind `blue-*` 硬编码（D6） | 换肤面窄 | 分期迁语义 token + 门禁 | P1 |
| **TD-CMP-01** | 组件 | 业务页仍可自由拼按钮/表单 | 视觉孤岛 | 执行 COMPONENT_GUIDELINES；后续加 lint/示例 | P1 |
| **TD-TEST-01** | 测试 | 视觉回归未进默认 CI | 主题/壳层回归靠人 | 发版 checklist 强制关键截图或 CI 抽样 | P2 |
| **TD-TEST-02** | 测试 | 设置即时保存/二级 nav 跳转 e2e 覆盖不全 | 回归漏洞 | 扩展 `system-settings.spec.ts` | P2 |
| **TD-OPS-01** | 运维 | 缺一页事故 Runbook（白屏/LLM 全挂/Pages 回滚） | 值班靠人 | 写 `docs/OPS_RUNBOOK.md` | P1 |
| **TD-OPS-02** | 可观测 | Sentry 默认关 | 线上无聚合错误 | 保持产品决策；补「最低信号包」到 Runbook | P2 |
| **TD-DOC-01** | 文档 | `CI-QUALITY-GATES` / 部分 best-practices 日期旧 | 误导 | 刷新与 scripts 对齐 | P2 |
| **TD-REL-01** | 发布 | main 提交粒过度碎时 review 成本高 | 审计成本 | RC 前按主题整理 notes（已有 CHANGELOG） | P3 |

---

## Closed（近期，摘要）

| ID | 关闭日期 | 说明 |
| --- | --- | --- |
| TD-DOC-02 | 2026-07-26 | 落地 CONTENT_DESIGN / ACCESSIBILITY / OPS_RUNBOOK |
| TD-OPS-01 | 2026-07-26 | 初版 OPS_RUNBOOK（白屏/LLM/设置/回滚）；后续可增厚 |
| TD-SET-DENSITY | 2026-07-26 | 移除 density 模式死代码（`settingsUiPreferences`、deepLink.density） |
| TD-SET-LINT-AUTO | 2026-07-26 | `autoSaveProviderConfig` complexity 降到 warning-gate 内 |
| TD-SET-REASONING-ZOD | 2026-07-25 | Zod 支持 xhigh/max，修复推理无法持久化 |
| TD-SET-SEARCH-PAD | 2026-07-25 | 搜索框 icon/placeholder 重叠 |

更早大批量清理见 `TECH_DEBT_AUDIT.md`（**勿**把其「0 issue」当作 2026-07-26 现状）。

---

## 主题债交叉索引（D1–D12）

详见主题企业审计 Spec。本板只跟踪「仍 open 的工程影响」：

- D1 token 覆盖 → **TD-THM-01**  
- D6 blue 硬编码 → **TD-THM-02**  
- 其余 D* 以主题 playbook / landing-status 为准  

---

## 相关

- [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md)  
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)  
- [CI-QUALITY-GATES.md](./CI-QUALITY-GATES.md)  
- [THEME 审计路线图](./superpowers/specs/2026-07-26-theme-system-enterprise-audit-and-roadmap.md)  
