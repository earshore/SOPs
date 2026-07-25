# 系统设置企业级硬化设计 Spec

**Date:** 2026-07-25  
**Status:** draft-for-review  
**Route:** A — 分阶段硬化（Reliability-first phased hardening）  
**Related:**

- 归档审查：`docs/archive/ui-audit/SYSTEM_SETTINGS_STRUCTURE_REVIEW_2026-07-06.md`
- Runtime UI：`docs/superpowers/specs/2026-07-25-runtime-strategy-settings-ui-completeness-design.md`
- 全站视觉：`docs/VISUAL_DESIGN_GUIDELINES.md`
- 主题分层：`docs/THEME_SYSTEM_GUIDELINES.md`
- 弹窗/抽屉：`docs/MODAL_DEVELOPMENT_GUIDELINES.md`
- 实现入口：`src/components/settings/systemSettings.{ts,html,css}`
- SSOT：`src/services/runtimeStrategyService.ts`、`src/services/toolStrategyService.ts`
- Token 源：`src/common/config/design-tokens.ts` → `src/css/foundation/variables.generated.css`

---

## 0. 决策记录（已确认）

| 决策点 | 结论 |
| --- | --- |
| 优化范围 | **C 全量企业级治理**：可靠性（HA）+ 用户友好，分阶段路线图一次成 Spec |
| 数据边界 | **仅本浏览器本地**（localStorage / IndexedDB）；不做云同步 / 多账号 |
| 模块关系 | **系统设置为唯一写入口**；模块内改为只读摘要 + 深链 |
| 技术路线 | **A 分阶段硬化**：P0 可靠性 → P1 体验与唯一入口 → P2 备份 HA → P3 拆分可维护性 |
| 外观偏好 | 新增一级目录 **「外观与体验」**（主题 / 动画 / 减少动效） |
| 视觉策略 | **反孤岛**：系统设置必须挂靠全站主题/token/弹窗规范；禁止另起一套颜色、字号、圆角、按钮语言（详见 §14） |

---

## 1. Problem Statement

### 1.1 产品形态

「系统设置」不是独立路由页，而是右侧抽屉全局面板：

- 入口：全局「设置」→ `openSettings()` / `@open-settings.window`
- 主体：`src/components/settings/systemSettings.*`（约 1.9k TS + 2.2k HTML + 0.8k CSS）
- 导航：侧栏锚点滚动（非多路由 settings 站）

### 1.2 已具备能力（基线）

| 一级区 | 现状 |
| --- | --- |
| AI 模型与连接 | 厂商 / Endpoint / Key / 模型 / Reasoning / 连接测试 / 危险端点提示 |
| 工具策略 | 5 工具默认模型 + Runtime（LLM 超时重试、Master Analysis、Deep Chat、PPC、KH…） |
| 采集代理与网络 | 代理类型与凭据 + 采集运行策略 |
| 数据与备份 | 用量、导出/导入（完整/合并）、保留策略、分桶清理、危险操作二次确认 |
| 开发者诊断 | 仅开发者模式；监控面板 + 调试开关 + 端点安全只读 |

2026-07-06 结构审查中的重命名、工具策略入口、危险区分层、数据分桶文案等 **主体已落地**。  
2026-07-25 Runtime 字段与「保存工具与运行策略」契约 **主体已落地**。

### 1.3 仍存在的企业级缺口

| 维度 | 缺口 |
| --- | --- |
| **可靠性** | 多保存按钮语义需持续锁死；**无 dirty / 未保存关闭拦截**；`ConfigCenter` 与 Runtime 数字默认双源；打开时缺配置健康检查；代理无连通测试 |
| **唯一入口** | `PerformanceSettings` 已读写 Runtime，但 **模块内仍可写**；PPC `thresholdSettings` **仍双写** `ppc_search_terms_thresholds_v1` + Runtime |
| **用户友好** | 无精简/高级；无设置内搜索；专家参数与基础项混排；主题/动画偏好未进入系统设置；影响范围标签不完整 |
| **本机 HA** | 无分桶导出；导入预检可加强；无「上次保存」回滚点；无多标签页冲突提示；配额告警偏被动 |
| **可维护性** | 单体文件过大，演进与评审成本高，回归面集中 |
| **视觉一致性** | 抽屉内大量 Tailwind 裸色值 + `systemSettings.css` 硬编码 hex；分区各用一套 tint；与模块页 card/button/badge 语言不完全同源；新增「外观/搜索/预设」时易再造局部样式 |

### 1.4 非问题（本 Spec 不解决）

- 云端配置同步、组织策略、RBAC、计费
- 推倒重做整体视觉体系
- 将系统设置改为多路由独立站点（除非 P3 证明抽屉不可扩展）
- 用户可写全局 HTTP `api.baseUrl`（部署环境项；诊断区可只读展示）

---

## 2. Goals & Non-goals

### 2.1 Goals

| ID | Outcome |
| --- | --- |
| **SS-O1** | 任意「影响运行结果」的策略参数，**只在系统设置有写路径**；模块仅深链或只读 |
| **SS-O2** | 未保存变更不可静默丢失（dirty + 关闭确认） |
| **SS-O3** | 每个保存按钮的写入集合可测试、可文档化、与文案一致 |
| **SS-O4** | Runtime / ToolStrategy 为运行参数 SSOT；ConfigCenter 重叠项仅 fallback |
| **SS-O5** | 默认精简模式可完成 80% 配置；高级参数可搜可找 |
| **SS-O6** | 本机备份：可预检、可分桶、关键保存可回滚；多标签冲突可感知 |
| **SS-O7** | 主题/动画等外观偏好纳入系统设置，与现有 store 同源 |
| **SS-O8** | P3 后设置代码可按 section 演进，CI 有契约与 e2e 回归锁 |
| **SS-O9** | 系统设置视觉与全站工作台 **同源**：token、层级、控件、确认弹窗、焦点环一致；新增 UI 不引入第二套设计语言（§14） |
| **SS-O10** | **测试闭环**：§5 每个需求 ID 在 §7.3 有对应用例且阶段出口全 `passing`；设置相关 PR 跑通 §7.5 / §7.6 门禁 |

### 2.2 Non-goals

- 账号体系、云同步、远程 feature flag 管理台
- 新建「安全与凭据」「危险区」等空一级目录（危险操作保留在数据与备份内）
- 本阶段实现完整 Settings Profile 平台（可作为未来演进，不阻塞 A 路线）
- 把设置抽屉改造成营销 hero / 全屏 settings 站点视觉
- 为设置单独引入新的图标库、字体栈或第三方 UI 套件

### 2.3 成功标准（可验证）

1. 改工具策略未保存 → 关闭面板出现确认；保存后关闭无确认  
2. 模块内无法再独立持久化 PPC 阈值 / AI 调度到旁路 key（或旁路 key 只读迁移后删除写路径）  
3. 刷新后 Runtime / 外观 / 连接配置与保存时一致  
4. 导入坏文件不破坏现有数据；replace 前完成校验  
5. `tests/unit/systemSettings*.test.ts` + release-smoke + `system-settings` E2E 持续绿（§7）  
6. 设置面板主色/表面/边框/控件/危险区符合 §14；新增区块无「另一套 UI」感；模块深链摘要卡与设置内 card 同族  
7. 任一阶段完成时 §7.7 出口条件满足；无「已实现未测」项  

---

## 3. Target Information Architecture

### 3.1 一级导航（6 区 + 条件诊断）

```text
系统设置
├── AI 模型与连接           # settings-section-llm
├── 工具策略               # settings-section-tool-strategy
├── 采集代理与网络          # settings-section-network
├── 数据与备份             # settings-section-data
├── 外观与体验（新增）      # settings-section-appearance
└── 开发者诊断（条件）      # settings-section-performance
```

副标题建议：`配置 AI 连接、工具策略、本地数据与外观`。

### 3.2 分区职责

| Section ID | 写入口 | 读/影响 |
| --- | --- | --- |
| `settings-section-llm` | `saveProviderConfig()` | 全局 LLM 连接；工具未覆盖模型时的 fallback |
| `settings-section-tool-strategy` | `saveToolStrategy()` | tool 默认模型 + 除 scraper/storage 外的 runtime（见 §4） |
| `settings-section-network` | `saveProxyConfig()` / `saveRuntimeStrategy()`（采集子集） | 采集代理 + scraper runtime |
| `settings-section-data` | 导出/导入/清理 + `saveRuntimeStrategy()`（storage 子集） | 本地数据生命周期 |
| `settings-section-appearance` | theme + animation APIs（即时或显式，见 §5.5） | 全站外观与动效 |
| `settings-section-performance` | 诊断开关即时生效 | 仅开发者模式 |

### 3.3 精简 / 高级（P1）

| 模式 | 可见 |
| --- | --- |
| **精简（默认）** | 连接四件套（厂商/端点/Key/模型）、连接测试；各工具默认模型 + Deep Chat 业务工具；代理连接方式；导出/导入/清理入口；主题与「减少动效」 |
| **高级** | 全部 Token/并发/重试/阈值/缓存 TTL/预算矩阵/采集批次/LRU 比例等 |

持久化键建议：`settings_ui_preferences_v1 = { density: 'simple' \| 'advanced' }`（StorageService）。

### 3.4 设置内搜索（P1）

- 索引字段：section 标题、卡片标题、label、`runtime path`、工具 target id  
- 行为：过滤导航高亮 + `scrollToSection` + 临时高亮命中卡片  
- 无结果：空状态文案，不隐藏关闭/保存主框架  

### 3.5 影响范围标签（P1）

统一徽章：

| Badge | 含义 |
| --- | --- |
| `仅本浏览器` | 数据不离开本机（默认底色） |
| `影响 AI 成本` | Token/模型/重试相关 |
| `影响采集` | 代理/并发/采集超时 |
| `破坏性` | 清理/清空/replace 导入 |
| `开发者模式` | 诊断区 |
| `即时生效` | 无需点保存的开关（诊断） |

### 3.6 深链契约（P1 唯一入口）

扩展 `openSettings(options?: SettingsOpenOptions)`。现状：`openSettings()` 仅 `eventBus.emit(APP_EVENTS.SETTINGS_OPEN)`，**无 payload**，面板 `open()` 无定位参数。

```ts
interface SettingsOpenOptions {
  sectionId?:
    | 'settings-section-llm'
    | 'settings-section-tool-strategy'
    | 'settings-section-network'
    | 'settings-section-data'
    | 'settings-section-appearance'
    | 'settings-section-performance';
  /** 可选：展开 details / 高亮卡片，如 'ppc-thresholds' | 'master-analysis' | 'ppc-analysis-flags' */
  focus?: string;
  /** 打开时强制高级模式（模块深链专家项时） */
  density?: 'simple' | 'advanced';
}
```

实现要点：

1. `SETTINGS_OPEN` 事件 payload 携带 `SettingsOpenOptions`（需扩展 `eventConstants` / EventBus 类型）  
2. 面板 `open(options?)` 后 `scrollToSection` + 按 `focus` 展开对应 `<details>`  
3. 模块按钮文案：`在系统设置中配置`  
4. 禁止模块内再调用 `saveRuntimeStrategySettings` / 旁路 `StorageService.set` 写**全局策略**字段（读 API 可保留）  
5. PPC 的 **ASIN/类目/Listing 上下文文本** 属于任务会话输入，**不**迁入系统设置（仅策略开关/阈值迁入）

---

## 4. Save Contracts（可靠性核心）

### 4.1 按钮 → 写入集合

| UI 动作 | 函数 | 必须写入 | 不得写入 |
| --- | --- | --- | --- |
| 保存连接配置 | `saveProviderConfig` | LLM provider 配置 + API Key | runtime / toolStrategy / proxy |
| 保存工具与运行策略 | `saveToolStrategy` | `toolStrategy` + **完整** `runtimeStrategy`（推荐）或「非 scraper/storage 子集」且文档与测例一致 | LLM Key；proxy secrets（除非明确合并策略——默认不合并） |
| 恢复默认策略 | `resetRuntimeStrategy` | **仅内存** | 任何 storage（用户需再点保存） |
| 更新代理配置 | `saveProxyConfig` | scraper proxy 配置 | runtime 其它域 |
| 保存\*策略（采集区） | `saveRuntimeStrategy` | 当前实现为整包 runtime；P0 起允许整包写，但 UI 须提示「将保存全部运行时策略」或改为子集写（二选一，见下） | — |
| 保存数据策略 | `saveRuntimeStrategy` | 同上 | — |
| 诊断开关 | `setDeveloperDiagnostic*` | 对应诊断 key | 业务 runtime |

**P0 决议（可落地、低歧义）：**

- **采用「Runtime 整包保存」模型**：任何 `saveRuntimeStrategy` / `saveToolStrategy` 均持久化当前内存中的完整 `RuntimeStrategySettings`。  
- UI 必须在采集区、数据区次要保存按钮旁注明：`将保存当前面板中的全部运行时策略（含工具策略区未点保存的已编辑字段）`。  
- Dirty 以「整包 runtime + toolStrategy + 连接表单 + proxy 表单 + appearance」分区计算；关闭确认列出脏分区名。

备选（更高工程量，本 Spec 不默认）：真正的分区 patch 保存。若未来要做，需独立 RFC。

### 4.2 Dirty 模型（P0-2）

```ts
type SettingsDirtyPartition =
  | 'llm'
  | 'toolStrategy'
  | 'runtime'
  | 'proxy'
  | 'appearance';

// 打开或每次成功保存后：
baseline = snapshotPartitions()
// 编辑时：
dirtyPartitions = diff(baseline, current)
// close / Esc / backdrop：
if (dirtyPartitions.length) confirmDiscard()
```

规则：

- UI-only 状态不计入 dirty：导航展开、密码可见、下拉菜单 open、清理列表 expand  
- `resetRuntimeStrategy` → runtime 相对 baseline dirty  
- 诊断开关 **不** 计入 dirty（即时生效，已落盘）

### 4.3 双源收敛（P0-3）

| 来源 | 角色 |
| --- | --- |
| `runtimeStrategyService` | **运行时参数 SSOT**（scraper/llm 超时重试/storage 保留等） |
| `toolStrategyService` | **工具默认模型 SSOT** |
| `ConfigCenter` llm/scraper/storage 数字 | **仅无用户配置时的编译期/环境 fallback**；注释与类型标明 `fallback-only` |
| 业务服务 | 禁止直接读 ConfigCenter 覆盖用户 Runtime；应 `getRuntime*Options()` |

验收：修改 Runtime 采集并发后，scraper 实际行为变化；即使 ConfigCenter 仍为旧默认。

### 4.4 遗留双写清除（P1-1）

| 位置 | 现状 | 目标 |
| --- | --- | --- |
| `ppc_search_terms/settings/thresholdSettings.ts` | `StorageService.set('ppc_search_terms_thresholds_v1')` + Runtime | **只写 Runtime**；读优先 Runtime；一次性迁移旧 key 后停止写入 |
| `ppc_search_terms/settings/analysisSettings.ts` | `StorageService.set('ppc_search_terms_analysis_settings_v1')` + Runtime（useAgent / allowLocalFallback / useContext） | **只写 Runtime**；会话级 context（asin/listing 文本）可留在模块（非全局策略）；开关类与系统设置同源后模块改为深链或只读 |
| `PerformanceSettings.ts` | 已读写 Runtime，模块内仍有完整编辑 UI | UI 改为摘要 + `openSettings({ sectionId, focus: 'master-analysis' })`；保留 `getPerformanceSettings` 只读 |
| 全仓 `saveRuntimeStrategySettings` | 设置面板 + 上列模块 | P1 后业务模块写路径归零（单测可 mock service） |

---

## 5. Phased Requirements

### 5.1 P0 — 可靠性地基

| ID | 需求 | 主要文件 | 验收 |
| --- | --- | --- | --- |
| **P0-1** | 保存契约文案/注释/测例对齐 §4.1 | `systemSettings.html/ts`、单测 | 契约表每行有测例或注释锁定 |
| **P0-2** | Dirty + 关闭确认 | `systemSettings.ts` | 见 §2.3.1 |
| **P0-3** | ConfigCenter fallback-only + 业务读路径审计 | `ConfigCenter.ts`、scraper/llm 调用链 | 无用户 Runtime 被 ConfigCenter 静默覆盖 |
| **P0-4** | 打开设置时健康检查 | `systemSettings.ts` + normalize | 坏 JSON 不白屏；coach 提示 |
| **P0-5** | 代理连通性最小测试 | network section | 失败有明确 toast/行内错误 |

### 5.2 P1 — 唯一入口 + 用户友好 + 视觉收敛

| ID | 需求 | 验收 |
| --- | --- | --- |
| **P1-0** | **视觉基线收敛**（§14）：settings CSS/HTML 去硬编码 hex 优先改 token；统一控件/卡片/徽章/导航/CTA 层级；与全站 surface 对齐 | 关键样式走 CSS 变量；无新增裸色值；焦点环与全站一致 |
| **P1-1** | 系统设置唯一写入口 + 深链 | 模块无旁路写；深链可打开并聚焦 |
| **P1-1b** | 模块「只读摘要 + 配置入口」视觉 | 使用与设置内 `settings-card` 同族或共享 card 样式；按钮为次要/文字链，非第三套 CTA |
| **P1-2** | 精简/高级 density | 默认 simple；持久化；切换控件符合 §14.6 分段控件 |
| **P1-3** | 设置内搜索 | 关键词可定位；搜索框用 `settings-control` 变体 |
| **P1-4** | 影响范围标签 | 徽章语义见 §14.5；禁止每区自定义 badge 色盘 |
| **P1-5** | 外观与体验一级区 | theme + animation 同源；无第二套 storage 语义；frame 变体见 §14.3 |
| **P1-6** | 一键预设（稳定/速度/成本） | 只改内存 runtime 表单 → dirty；需保存；预设按钮组符合 §14.6 |

#### P1-6 预设映射（明确值，避免歧义）

以 `DEFAULT_RUNTIME_STRATEGY_SETTINGS` 为底，覆盖：

| 字段路径 | 稳定优先 | 速度优先 | 成本优先 |
| --- | --- | --- | --- |
| `llm.maxRetries` | 3 | 1 | 1 |
| `llm.analysisTimeoutMs` | 180000 | 90000 | 120000 |
| `masterAnalysis.schedulingPreference` | reliability | speed | recommended |
| `masterAnalysis.enableCache` | true | true | true |
| `scraper.maxConcurrent` | 1 | 3 | 2 |
| `scraper.maxRetries` | 4 | 1 | 2 |
| `ppcSearchTerms.maxConcurrentBatches` | 1 | 3 | 1 |
| `ppcSearchTerms.enableLlmCache` | true | true | true |
| `deepChat.maxOutputTokens` | 2000 | 1500 | 1200 |
| `deepChat.enableBusinessTools` | true | true | true |

预设 **不修改** API Key、代理凭据、工具默认模型选择（模型选择属成本另一维度，由用户在工具策略手调）。

### 5.3 P2 — 本机备份 HA

| ID | 需求 | 验收 |
| --- | --- | --- |
| **P2-1** | 分桶导出（多选 bucket） | 导出 payload 含 `buckets: string[]` 与 schemaVersion |
| **P2-2** | 导入预检增强 | 非法 JSON / 缺字段 / 版本不支持 → 阻断；展示键统计与是否含 secrets |
| **P2-3** | 保存前回滚点 | 每分区最多 N=5 份本地快照；「撤销上次保存」恢复 baseline 并写回 |
| **P2-4** | 多标签 `storage` 事件 | 脏时提示冲突；干净时提示可重载 |
| **P2-5** | 配额主动告警 | 用量 ≥ 阈值时设置顶栏 warning + CTA 清理/导出 |

### 5.4 P3 — 可维护性

| ID | 需求 | 验收 |
| --- | --- | --- |
| **P3-1** | 按 section 拆分 html/ts 模块 | Alpine `settingsPanel` 对外 API 不变；测例绿 |
| **P3-2** | `SettingsDomain` 门面 | `load / savePartition / diff / validate / snapshot`；UI 变薄 |
| **P3-3** | 测试金字塔补齐 | 见 §7 |

建议拆分形态（目标，非一次 PR 强求）：

```text
src/components/settings/
  systemSettings.ts              # 注册 + open/close + 组合
  domain/
    settingsDirty.ts
    settingsHealth.ts
    settingsDeepLink.ts
    settingsPresets.ts
  sections/
    llmSection.*
    toolStrategySection.*
    networkSection.*
    dataSection.*
    appearanceSection.*
    diagnosticsSection.*
  systemSettings.css
```

### 5.5 外观与体验（P1-5 细节）

| 控件 | 后端 |
| --- | --- |
| 主题选择 | 现有 `themeConfig` / `app-theme`（或现行键名，不新建平行语义） |
| 动画总开关 / 速度 | `animation-settings` store / `app:animation-settings` |
| 遵循系统减少动效 | `respectSystemPreference` |

保存策略：**即时写入**（与诊断类似）并标注 `即时生效`；**不** 计入关闭丢弃确认的「可丢弃脏状态」（已落盘）。若实现成本更高，允许「显式保存外观」但需在 P1 内二选一并写测例——**默认即时写入**。

---

## 6. Error Handling

| 场景 | 用户可见行为 | 工程行为 |
| --- | --- | --- |
| 保存失败（配额等） | 错误 toast；保持 dirty | `ErrorService`；`SETTINGS_SAVE_*` |
| Runtime 损坏 | coach：已用安全默认，请检查后保存 | `normalizeRuntimeStrategySettings` |
| 导入失败 | 模态/toast 说明原因；不 reload | 校验阶段抛 `SETTINGS_IMPORT_*` |
| replace 导入 | 仅校验通过后写入；失败不刷新 | 尽量避免半写入；现有 LocalDataStore 语义需审计并在 P2 固化 |
| LLM/代理测试失败 | 行内错误 + toast | 不关闭面板 |
| Dirty 关闭取消 | 保持打开 | focus 回到面板 |
| 多标签冲突 | 确认：重新加载 / 留下本地编辑 | 不自动覆盖 dirty |

错误码前缀：`SETTINGS_` + 场景 + 三位序号。

---

## 7. Testing & Regression（闭环强制）

> **原则：没有对应测试的需求不算完成。**  
> 每个 PR 必须形成闭环：`实现 → 单测/契约 →（阶段）E2E → 门禁命令全绿 → 再宣称完成`。  
> **禁止**「先合功能、测试后补」；**禁止**将核心路径标为 optional 后跳过。

### 7.0 闭环模型

```text
          ┌─────────────────────────────────────────────┐
          │  Spec 需求 ID (P0-x / P1-x / …)              │
          └───────────────────┬─────────────────────────┘
                              ▼
          ┌─────────────────────────────────────────────┐
          │  自动化测试用例 ID (UT / CT / E2E / MAN)     │
          └───────────────────┬─────────────────────────┘
                              ▼
          ┌─────────────────────────────────────────────┐
          │  PR 门禁命令通过 + 回归矩阵勾选              │
          └───────────────────┬─────────────────────────┘
                              ▼
                    允许 merge / 宣称阶段完成
```

| 层级 | 代号 | 职责 | 工具/目录 |
| --- | --- | --- | --- |
| 单元 | **UT** | 行为、契约、迁移、normalize、dirty/diff | Vitest：`tests/unit/systemSettings*.ts`、相关 service/module 测例 |
| 模板/CSS 契约 | **CT** | HTML 结构、绑定 path、导航文案、token 变量存在 | 现有 `systemSettingsCurrent.test.ts` 风格字符串/快照断言 |
| 端到端 | **E2E** | 真浏览器：打开、保存、刷新保持、关闭确认、深链 | Playwright：`tests/e2e/release-smoke.spec.ts` + **新建** `tests/e2e/system-settings.spec.ts` |
| 静态门禁 | **GATE** | type-check / lint 相关 / 既有 quality | npm scripts |
| 手工 | **MAN** | 仅自动化极不稳定或需肉眼的项；**必须**有步骤与通过标准，不得空口「测过了」 | §7.8 清单 |

**覆盖率规则（本 Spec 范围）：**

1. §5 每个需求 ID ≥ 1 条自动化用例（UT 或 E2E）；纯文案微调可用 CT。  
2. §4 保存契约每条「写入/不得写入」≥ 1 条 UT。  
3. §14.12 视觉清单：P1-0 以 CT + 可选截图；功能 PR 勾选清单作为 PR 描述必填项。  
4. 修 bug 必须附 regression 用例（先红后绿优先）。

### 7.1 测试资产规划（文件级）

| 文件 | 阶段引入 | 内容 |
| --- | --- | --- |
| `tests/unit/systemSettingsCurrent.test.ts` | 已有；持续扩展 | 面板行为、保存、导入导出、模板结构 |
| `tests/unit/systemSettingsDirty.test.ts` | **P0-2 同 PR** | dirty 快照、分区、关闭确认 mock |
| `tests/unit/systemSettingsHealth.test.ts` | **P0-4 同 PR** | 坏 JSON / normalize / coach 状态 |
| `tests/unit/systemSettingsPresets.test.ts` | **P1-6 同 PR** | 三套预设字段映射 |
| `tests/unit/systemSettingsDeepLink.test.ts` | **P1-1 同 PR** | `SETTINGS_OPEN` payload、scroll/focus |
| `tests/unit/runtimeStrategyService` 既有/扩展 | P0–P1 | normalize、读写 |
| `tests/unit/.../thresholdSettings*.test.ts`（扩展） | **P1-1** | 不再写旧 key；只写 Runtime |
| `tests/unit/.../analysisSettings*.test.ts`（扩展） | **P1-1** | 同上 |
| `tests/unit/.../PerformanceSettings.test.ts` | **P1-1** | 写路径移除或仅 deep link |
| `tests/e2e/release-smoke.spec.ts` | 扩展 | 保持打开设置 + 分区标题；**不得变弱** |
| `tests/e2e/system-settings.spec.ts` | **P0 起新建** | 设置专项 E2E（见 §7.4） |
| `tests/e2e/pages/SystemSettingsPage.ts`（建议） | P0/P1 | Page Object：open / section / save / dirty confirm |

> 文件可合并，但 **用例 ID 与需求 ID 映射不得丢**（§7.3 矩阵）。

### 7.2 基线：现有必须守住的回归（不得破坏）

以下在改设置相关代码时 **必须仍通过**（基线回归）：

| 基线 ID | 来源 | 断言摘要 |
| --- | --- | --- |
| BASE-UT-01 | `systemSettingsCurrent` | Alpine `settingsPanel` 注册；OPEN/CLOSE 事件 |
| BASE-UT-02 | 同上 | LLM 保存 / fetch models / test connection |
| BASE-UT-03 | 同上 | tool strategy 保存与 reload |
| BASE-UT-04 | 同上 | runtime strategy 保存；Deep Chat 业务工具模板绑定 |
| BASE-UT-05 | 同上 | proxy 保存与 key 缓存 |
| BASE-UT-06 | 同上 | 导出警告、导入 replace/merge/cancel、分桶清理、清空全部二次确认 |
| BASE-UT-07 | 同上 | `scrollToSection` 不改 URL hash；PC 导航结构 |
| BASE-UT-08 | `PerformanceSettings.test` | 读 Runtime 调度/缓存语义（P1 改写入口后仍读 SSOT） |
| BASE-E2E-01 | `release-smoke` | 经「全局设置」打开；可见「系统设置」「AI 模型与连接」 |

**门禁命令（基线，每个设置相关 PR 必跑）：**

```bash
npm run type-check
npx vitest run tests/unit/systemSettingsCurrent.test.ts tests/unit/systemSettingsModelMetadata.test.ts
npx playwright test tests/e2e/release-smoke.spec.ts --project=chromium
```

P1-1 触及 PPC/Performance 时追加对应 unit 文件；全量设置专项见 §7.6。

### 7.3 需求 → 测试矩阵（闭环主表）

> 状态列在实施计划中勾选：`pending` → `implemented` → `passing`。  
> **任一 `passing` 缺失则对应需求不得标完成。**

#### 7.3.1 P0 — 可靠性

| 需求 | 用例 ID | 层 | 断言（可执行） |
| --- | --- | --- | --- |
| P0-1 保存契约 | UT-P0-01 | UT | mock storage：`saveProviderConfig` 调用 LLM 写、**不**调用 `saveRuntimeStrategySettings` |
| P0-1 | UT-P0-02 | UT | `saveToolStrategy` 调用 tool save **且** `saveRuntimeStrategySettings`（整包） |
| P0-1 | UT-P0-03 | UT | `saveProxyConfig` 不写 toolStrategy；不写 LLM key |
| P0-1 | CT-P0-01 | CT | 工具策略主按钮文案含「运行策略」或现行契约文案；采集/数据次要保存有整包提示文案 |
| P0-2 Dirty | UT-P0-04 | UT | 改 `llm.analysisTimeoutMs` → `dirtyPartitions` 含 `runtime`；save 后 empty |
| P0-2 | UT-P0-05 | UT | 仅切换密码可见 / 展开清理列表 → **不** dirty |
| P0-2 | UT-P0-06 | UT | dirty 时 `close()` 调用确认；取消则 `isOpen===true`；确认丢弃则 `isOpen===false` 且内存回滚或重载 baseline |
| P0-2 | E2E-P0-01 | E2E | 打开设置 → 改一数字 → Esc/遮罩 → 出现确认 → 取消仍打开 |
| P0-2 | E2E-P0-02 | E2E | 保存后关闭无确认（或确认不出现） |
| P0-3 双源 | UT-P0-07 | UT | scraper/llm 业务读路径使用 `getRuntime*Options`（对关键 service 单测或依赖注入断言） |
| P0-3 | UT-P0-08 | UT | ConfigCenter 注释/导出类型标明 fallback（契约或源码断言，避免静默回归） |
| P0-4 健康检查 | UT-P0-09 | UT | storage 注入非法 runtime → open 不抛；normalize 后有默认值；health 标志/文案非空 |
| P0-5 代理测试 | UT-P0-10 | UT | 测试失败设置错误态；成功 clear；不关闭面板 |
| P0-5 | E2E-P0-03 | E2E | 网络区可见测试入口（或按钮）；点击有反馈（成功 mock / 失败文案二选一稳定测） |

#### 7.3.2 P1 — 入口 / 体验 / 视觉

| 需求 | 用例 ID | 层 | 断言 |
| --- | --- | --- | --- |
| P1-0 视觉基线 | CT-P1-00 | CT | CSS 含 `--settings-surface`（或根映射变量）；新增关键 class 无裸 `#` 色值回归扫（允许存量渐进，**新增行**禁止） |
| P1-0 | MAN-P1-00 | MAN | §14.12 清单全勾；并排截图「设置 vs 工作台」无第二套皮肤感 |
| P1-1 唯一入口 | UT-P1-01 | UT | `saveThresholds` **不** `StorageService.set('ppc_search_terms_thresholds_v1')` |
| P1-1 | UT-P1-02 | UT | `saveAnalysisSettings` **不**写 `ppc_search_terms_analysis_settings_v1` 的策略字段（或整键停写） |
| P1-1 | UT-P1-03 | UT | Performance 保存入口移除或转为 openSettings；模块不再直接 `saveRuntimeStrategySettings` 于 UI action（grep 门禁可辅助） |
| P1-1 | E2E-P1-01 | E2E | 模块页「在系统设置中配置」打开设置并落到工具策略区 |
| P1-1b 摘要卡 | CT-P1-01 | CT | 模块模板含 `settings-card` 或 `settings-summary-card` |
| P1-2 density | UT-P1-04 | UT | 默认 simple；切换 advanced 持久化再读回 |
| P1-2 | CT-P1-02 | CT | 存在 segmented / density 控件 |
| P1-2 | E2E-P1-02 | E2E | simple 下专家 token 输入不可见或折叠；切 advanced 可见 |
| P1-3 搜索 | UT-P1-05 | UT | 查询「ACOS」命中 PPC 相关 focus id |
| P1-3 | E2E-P1-03 | E2E | 搜索框输入后滚动到对应区（允许 data-testid） |
| P1-4 徽章 | CT-P1-03 | CT | 模板含影响范围 badge 文案关键字 |
| P1-5 外观 | UT-P1-06 | UT | 改主题走既有 theme API；不写 runtimeStrategy |
| P1-5 | E2E-P1-04 | E2E | 外观区可见；切换「减少动效」或主题后 UI 有可见变化（稳定选择器） |
| P1-6 预设 | UT-P1-07 | UT | 「成本优先」字段 === §5.2 表；且 dirty；未自动 save storage |
| P1-6 | UT-P1-08 | UT | 「稳定优先」「速度优先」关键字段抽样断言 |

#### 7.3.3 P2 — 本机 HA

| 需求 | 用例 ID | 层 | 断言 |
| --- | --- | --- | --- |
| P2-1 分桶导出 | UT-P2-01 | UT | 仅选 cache 时 payload.buckets 仅含 cache；schemaVersion 存在 |
| P2-2 导入预检 | UT-P2-02 | UT | 非法 JSON / 缺 version → 不调用 importAll |
| P2-2 | UT-P2-03 | UT | 合法包 summarize 含 keys/secrets 标记 |
| P2-2 | E2E-P2-01 | E2E | 可选：fixture 文件导入 cancel 路径（若 file chooser 可 mock） |
| P2-3 回滚 | UT-P2-04 | UT | save 前快照数 ≤ N；撤销恢复上一版 runtime |
| P2-4 多标签 | UT-P2-05 | UT | 模拟 storage 事件 → 冲突标志 true；dirty 时不自动 reload |
| P2-5 配额 | UT-P2-06 | UT | usage 超阈值 → 告警可见标志 |

#### 7.3.4 P3 — 拆分

| 需求 | 用例 ID | 层 | 断言 |
| --- | --- | --- | --- |
| P3-1 拆分 | UT-P3-01 | UT | 既有 BASE-UT-* 全绿；对外 `openSettings`/`initAlpineSettings` API 不变 |
| P3-2 Domain | UT-P3-02 | UT | `diff/savePartition/validate` 单测 |
| P3-3 金字塔 | GATE-P3-01 | GATE | §7.6 全量命令进入 CI 文档/脚本说明 |

### 7.4 E2E 专项规格（`system-settings.spec.ts`）

**必须新建**（P0 第一个含 UI 行为的 PR 起具备骨架，其后按矩阵补满），不得长期只靠 smoke 里「能打开」一条。

| E2E ID | 步骤摘要 | 期望 | 最早阶段 |
| --- | --- | --- | --- |
| E2E-P0-01 | 改 runtime 字段 → 关闭 | 确认框出现 | P0-2 |
| E2E-P0-02 | 保存 runtime → 关闭 | 无丢弃确认 | P0-2 |
| E2E-P0-04 | 改工具超时 → 保存工具与运行策略 → reload → 再开设置 | 值保持 | P0-1 |
| E2E-P0-05 | 导航点击「数据与备份」 | section 进入可视区 | P0 |
| E2E-P1-01 | 从模块深链进入 | section tool-strategy 可见 | P1-1 |
| E2E-P1-02 | density 切换 | 高级字段显隐 | P1-2 |
| E2E-P1-03 | 搜索 | 定位成功 | P1-3 |
| E2E-SMOKE-EXT | 六区导航文案（含外观，P1-5 后） | 可见 | P1-5 |

稳定选择器约定（实现时加入，测例依赖）：

- 根：`[data-testid="settings-panel"]` 或既有 `[x-data="settingsPanel"]`  
- 分区：既有 `#settings-section-*`  
- 主保存：`[data-testid="settings-save-tool-strategy"]` 等（P0 起为关键按钮补 testid，避免纯文案脆）  
- Dirty 确认：复用共享 modal 的 role/标题

**禁止**：E2E 依赖真实外部 LLM/代理网络；连接测试用 mock 路由或跳过真网（UT 覆盖失败路径即可）。

### 7.5 回归套件分层

| 套件名 | 何时跑 | 命令 |
| --- | --- | --- |
| **settings-unit** | 每个设置相关 PR、本地提交前 | `npx vitest run tests/unit/systemSettingsCurrent.test.ts tests/unit/systemSettingsModelMetadata.test.ts tests/unit/systemSettingsDirty.test.ts tests/unit/systemSettingsHealth.test.ts tests/unit/systemSettingsPresets.test.ts tests/unit/systemSettingsDeepLink.test.ts`（文件按落地情况存在则加入；可用 vitest 路径 glob：`tests/unit/systemSettings*.test.ts`） |
| **settings-module-unit** | P1-1 及之后触及模块写路径时 | PPC threshold/analysis + PerformanceSettings 相关 unit |
| **settings-e2e** | P0-2 起每个设置 PR；release 前 | `npx playwright test tests/e2e/system-settings.spec.ts --project=chromium` |
| **settings-smoke** | 每个 PR + CI | `npm run test:e2e:smoke`（或等价 release-smoke chromium） |
| **settings-gate** | 每个 PR | `npm run type-check` + settings-unit + settings-smoke |
| **settings-full** | 阶段完成 / RC | settings-gate + settings-e2e + settings-module-unit + `npm run lint:warning-gate`（若改动触碰 eslint 范围） |

推荐增加 npm script（实施 P0 时落地，写入 package.json）：

```json
{
  "test:unit:settings": "vitest run tests/unit/systemSettings*.test.ts",
  "test:e2e:settings": "playwright test tests/e2e/system-settings.spec.ts --project=chromium",
  "test:settings": "npm run type-check && npm run test:unit:settings && npm run test:e2e:smoke && npm run test:e2e:settings"
}
```

`test:settings` = **本 Spec 的闭环完成命令**；阶段宣称完成前必须绿。

### 7.6 PR Definition of Done（强制）

每个实现 PR 的描述必须包含：

```markdown
## Spec coverage
- Requirements: P0-2, …
- Tests added/updated: UT-P0-04, E2E-P0-01, …

## Commands run (paste output summary)
- [ ] npm run type-check
- [ ] npm run test:unit:settings   # 或 vitest 等价
- [ ] npm run test:e2e:smoke
- [ ] npm run test:e2e:settings   # 若本 PR 改关闭/保存/导航行为
- [ ] §14.12 visual checklist      # 若本 PR 含 UI

## Risk
- 未覆盖项：无 / 列出 + 跟进 issue
```

**Reviewer 拒绝条件：**

- 需求在 §7.3 有用例 ID 但 PR 无对应测例  
- 只改生产代码、测试红或未跑  
- 删除/弱化 BASE-* 断言且无替代  
- 将 E2E 标 skip 超过 1 个迭代无 ticket  

### 7.7 阶段出口（Phase Exit Criteria）

| 阶段 | 出口条件（全部满足） |
| --- | --- |
| **P0 done** | §7.3.1 全部用例 `passing`；`test:settings`（含当时已有 e2e）绿；BASE-* 绿 |
| **P1 done** | §7.3.2 全部 `passing`；模块旁路写路径 grep 为 0（策略字段）；视觉 MAN-P1-00 勾选 |
| **P2 done** | §7.3.3 全部 `passing` |
| **P3 done** | §7.3.4 全部 `passing`；拆分后 `test:settings` 绿 |
| **Spec done** | P0–P3 出口均满足；矩阵无 `pending`/`failing` |

### 7.8 手工回归清单（MAN — 自动化补位）

仅以下允许 MAN，且 **每次 RC / 阶段出口执行一次**，结果记入 PR 或阶段报告：

| MAN ID | 步骤 | 通过标准 | 对应 |
| --- | --- | --- | --- |
| MAN-P1-00 | 打开设置与任意工具页并排截图 | 无第二套设计语言；控件圆角/主色一致 | P1-0 / §14 |
| MAN-P0-01 | 真实代理（若有）点测试连接 | 失败可读；不白屏 | P0-5 补充 |
| MAN-P2-01 | 导出真实备份到磁盘再导入 merge | 数据可恢复；密钥警告出现 | P2 |
| MAN-A11Y-01 | 仅键盘：打开设置、Tab 到保存、Esc | 焦点可见；dirty 确认可键盘操作 | §14.10 |

MAN **不能**替代 UT-P0-04 / E2E-P0-01 等核心自动化。

### 7.9 缺陷回流

1. 生产/测试发现设置缺陷 → 先补 **失败用例**（UT 优先）→ 再修代码 → 用例变绿。  
2. 用例 ID 写入 changelog 或 PR：`Fixes regression for UT-P0-xx`。  
3. 若缺陷暴露矩阵遗漏 → **先改 Spec §7.3 补行** 再修（保持 Spec 为测试真相源）。

### 7.10 与 CI 的关系

- **不强制**本 Spec 单独新建 CI workflow；必须挂现有 pipeline 可跑的 script。  
- 最低：PR CI 已跑 unit 全量或 path filter 时，settings 变更触发 `test:unit:settings` + smoke。  
- Release：`test:settings` 或 `settings-full` 写入 release checklist（`docs/superpowers/plans` 实施计划中引用）。  
- 若 CI 暂不能跑 Playwright：本地/RC **必须**跑 E2E；并在 PR 贴摘要；不得以「CI 没跑」免责。

### 7.11 反模式（测试）

| 禁止 | 原因 |
| --- | --- |
| 只手点不写测 | 不可回归 |
| `it.skip` / `test.fix` 长期残留 | 假绿 |
| E2E 依赖公网 LLM | 不稳定 |
| 断言过宽（仅 `toBeTruthy`） | 不锁定契约 |
| 为让测过而删 BASE 断言 | 掩盖回归 |
| 实现与测例分两个「有空再做」PR | 打断闭环 |

---

## 8. Risks & Mitigations

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 唯一入口增加操作路径长度 | UX | 深链 + 模块只读摘要显示当前值 |
| Dirty 误报 | 烦扰 | 快照对比；忽略 UI-only 字段 |
| 整包 runtime 保存导致「改采集却写了 PPC」 | 惊讶 | P0 文案明示；长期可选分区 patch RFC |
| 预设覆盖用户精细调参 | 数据丢失感 | 仅内存 + dirty；可恢复默认；不自动保存 |
| P3 拆分回归 | 稳定性 | 契约测先行；垂直切片 PR |
| 导出含密钥 | 安全 | 维持警告；P2 分桶默认可排除 secrets |
| 双写清除遗漏 | 状态分叉 | 全仓 grep `saveRuntimeStrategySettings` / 旧 STORAGE_KEY |
| 功能 PR 绕过视觉基线 | 二次孤岛 | P1 功能增量依赖 PR-P1-visual 或同 PR 含 §14.12 清单 |
| Token 迁移范围过大 | 回归/冲突 | §14.13 渐进；先映射变量再替换调用点 |
| 只开发不测试 | 回归债务 | §7 强制矩阵 + DoD；Reviewer 拒合无测 PR |
| E2E 不稳定导致跳过 | 假绿 | 禁止长期 skip；mock 网络；testid 稳定选择器 |

---

## 9. Implementation Boundaries

### 9.1 预期修改

| 路径 | 阶段 |
| --- | --- |
| `src/components/settings/systemSettings.ts` | P0–P3 |
| `src/components/settings/systemSettings.html` | P0–P3 |
| `src/components/settings/systemSettings.css` | **P1-0 起**（token 映射与组件族）；P1+ 增量 |
| `src/services/runtimeStrategyService.ts` | P0/P1（注释、只读 helper、如需） |
| `src/services/toolStrategyService.ts` | 按需 |
| `src/common/config/ConfigCenter.ts` | P0-3 |
| LocalDataStore / storage 导出导入 | P2 |
| `src/modules/.../PerformanceSettings*` | P1-1 |
| `src/modules/.../ppc_search_terms/settings/*` | P1-1 |
| `src/stores/animation-settings.ts` / theme | P1-5 |
| `src/main.ts`（openSettings 传参） | P1 |
| `tests/unit/systemSettings*.test.ts`（含 Dirty/Health/Presets/DeepLink 等） | 全程，与功能同 PR |
| `tests/e2e/system-settings.spec.ts`、可选 `pages/SystemSettingsPage.ts` | P0 起新建并随阶段补满 |
| `tests/e2e/release-smoke.spec.ts` | 全程不得弱化 |
| `package.json` scripts：`test:unit:settings` / `test:e2e:settings` / `test:settings` | P0 落地 |

### 9.2 明确不改

- 各 SOP 业务模板内容  
- LLM 协议层（Responses / Chat Completions）本身  
- 云端或代理服务端实现  

---

## 10. Dependency Graph

```text
P0-1 文案契约 ──┐
P0-2 Dirty ─────┼──► P1-1 唯一入口/深链 ──► P1-2/3/4 体验
P0-3 双源收敛 ──┤         │
P0-4 健康检查 ──┤         ├──► P1-5 外观
P0-5 代理测试 ──┘         └──► P1-6 预设
                              │
                              ▼
                         P2 备份 HA
                              │
                    P3 拆分（可与 P2 后期并行）
```

**建议交付切片（可落地 PR 序列）：**

1. PR-P0a：Dirty + 关闭确认 + 保存契约 + **UT-P0-01..06 + E2E 骨架 + npm scripts**  
2. PR-P0b：ConfigCenter 审计 + 健康检查 + 代理测试 + **UT-P0-07..10 + E2E-P0-0x**  
3. PR-P1-visual：§14 视觉基线 + **CT-P1-00 + MAN-P1-00**  
4. PR-P1a：深链 + 去双写 + 摘要卡 + **UT-P1-01..03 + E2E-P1-01**  
5. PR-P1b：density + 搜索 + 徽章 + **UT/CT/E2E-P1-02..03**  
6. PR-P1c：外观区 + 预设 + **UT-P1-06..08 + E2E-P1-04**  
7. PR-P2a：导入预检 + 分桶导出 + **UT-P2-01..03**  
8. PR-P2b：回滚 + 多标签 + 配额 + **UT-P2-04..06**  
9. PR-P3：domain 拆分 + **BASE 全绿 + UT-P3-***；拆分时禁止新视觉语言  

**每个 PR 出口：** §7.6 DoD 勾选完成；`npm run test:settings`（或当时子集）绿。

```text
P0 可靠性+测试骨架 ──► P1-visual ──► P1 功能+测例 ──► P2+测例 ──► P3+全量回归
         │                                    │
         └──── 禁止无测例合入 ─────────────────┘
```

---

## 11. Audit Appendix — 设置项查漏补缺清单

### 11.1 已在系统设置覆盖（保持）

- LLM 连接、模型、Reasoning、连接测试  
- 工具默认模型（5 targets）  
- Runtime：LLM / Master Analysis / Deep Chat / PPC / KH / Scraper / Storage  
- 代理、数据导出导入清理、危险清空  
- 开发者诊断开关与端点只读  

### 11.2 本 Spec 纳入补齐

| 项 | 阶段 |
| --- | --- |
| Dirty / 未保存保护 | P0 |
| 配置健康检查 | P0 |
| 代理测试 | P0 |
| ConfigCenter 双源收敛 | P0 |
| 模块唯一写入口 | P1 |
| 视觉基线（token / 反孤岛 / 组件族） | P1-0 |
| 精简/高级、搜索、徽章 | P1 |
| 主题 / 动画 | P1 |
| 稳定/速度/成本预设 | P1 |
| 模块深链摘要卡视觉同族 | P1 |
| 分桶导出、导入预检、回滚、多标签、配额 | P2 |
| 代码拆分与 Domain | P3 |
| 回归测试矩阵 / npm scripts / E2E 专项 / PR DoD | **全程强制（§7）** |

### 11.3 明确排除或延后

| 项 | 原因 |
| --- | --- |
| 云同步 / 多设备 | 决策：仅本机 |
| 组织成员/计费 | 产品未具备 |
| 用户可写 `api.baseUrl` | 部署环境配置 |
| SOPS 各页默认负责人 | 低优先级业务偏好，非系统级 |
| 完整 Settings Profile 平台 | 非 A 路线阻断项；P2 回滚点是其子集 |

### 11.4 已知遗留双写 / 多入口（P1 必清）

| # | 位置 | 问题 |
| --- | --- | --- |
| 1 | `ppc_search_terms_thresholds_v1` | 与 Runtime `ppcSearchTerms.thresholds` 双写 |
| 2 | `ppc_search_terms_analysis_settings_v1` | 与 Runtime `useAgent` / `allowLocalFallback` / `useContext` 双写 |
| 3 | `PerformanceSettings` 模块 UI | 数据已同源 Runtime，**写入口未唯一** |
| 4 | `SETTINGS_OPEN` 无 payload | 深链需扩展事件载荷（实现前置） |

---

## 12. Spec Self-Review（完整性与可落地性）

> 本节在落盘时完成；作为审查记录保留。

### 12.1 Placeholder 扫描

- 无 TBD/TODO 作为未决需求；预设数值已表格式给出  
- 分区 patch 保存标为非默认备选，避免与整包模型矛盾  

### 12.2 内部一致性

- 数据边界：全文仅本机  
- 唯一入口与 Performance/PPC 改造一致  
- 保存模型：明确「Runtime 整包」避免与多按钮文案冲突  
- 外观：即时生效且不进入 discard dirty，与诊断一致  
- 视觉：§14 挂靠全站 VISUAL / THEME / MODAL 规范，不另立色盘  

### 12.3 范围是否可执行

- 单 Spec 覆盖 P0–P3，但 **按 PR 切片** 可独立交付；不要求一个迭代做完  
- 若资源紧张：最低可行集 = **P0 全部 + P1-1**（可靠性 + 去双写）  
- 若同步做体验增量：必须先或同 PR 落地 **P1-0 视觉基线**，禁止「功能先堆、样式后补」导致二次孤岛  

### 12.4 可落地性检查

| 检查项 | 结果 |
| --- | --- |
| 是否依赖不存在后端？ | 否 |
| 是否可在现有 Alpine 抽屉内完成？ | 是 |
| 是否有明确文件与测例锚点？ | 是 |
| 是否与近期 Runtime UI 工作冲突？ | 否，继承并硬化契约 |
| 最大风险点 | Dirty 实现细节 + 去模块写路径的产品路径变长 → 深链缓解；视觉 PR 过大 → 按 §14.13 渐进 token 化 |
| 是否可在不改存储 key 语义下启动 P0？ | 是 |
| 视觉是否可独立验收？ | 是：§14.12 清单 + PR-P1-visual |

### 12.5 完整性缺口（已关闭）

| 曾可能含糊点 | 本 Spec 处理 |
| --- | --- |
| saveToolStrategy 是否写完整 runtime | §4.1 决议：整包 + 文案 |
| 预设改哪些字段 | §5.2 表 |
| 外观是否一级目录 | §0 / §3.1 是 |
| openSettings 深链参数 | §3.6 类型 + EventBus payload |
| 模块双写清单 | §4.4 / §11.4（含 analysisSettings） |
| PPC 上下文文本是否进系统设置 | §3.6：否，仅策略开关/阈值 |
| 视觉是否另起炉灶 | §14：否；挂靠全站 token + 设置组件族 |
| 分区 tint 是否算孤岛 | §14.3：允许轻度 section accent，禁止整页重色盘 |

### 12.6 落地时注意（非阻塞）

1. `confirmSettingsAction` / `chooseWithModal` 已存在，Dirty 确认应复用，勿新造第三套 modal  
2. `scrollToSection` 已存在，深链复用  
3. 导出敏感提示与 `SECURE_STORAGE_SECURITY_BOUNDARY` 已存在，P2 分桶应沿用  
4. 修改 `saveThresholds` 时同步更新 PPC 模块测例  
5. 任何 HTML 新增 `bg-gradient-to-*` / 硬编码 `from-*-500` 须对照 §14.9 反模式表  

### 12.7 视觉补充自审（本轮增补）

| 检查项 | 结果 |
| --- | --- |
| 是否引用全站 VISUAL / THEME / MODAL 文档？ | 是（Related + §14.1） |
| 是否规定 token 优先级而非只写「好看」？ | 是（§14.2） |
| 是否定义组件族与 CTA 层级？ | 是（§14.4–§14.6） |
| 是否覆盖模块深链侧视觉？ | 是（§14.8 / P1-1b） |
| 是否可分 PR 落地？ | 是（PR-P1-visual 优先） |
| 是否要求重做全站主题？ | 否；仅收敛设置抽屉 + 模块摘要 |

### 12.8 回归测试补充自审（本轮增补）

| 检查项 | 结果 |
| --- | --- |
| 是否仅有原则无用例？ | 否；§7.3 按 P0–P3 需求展开 UT/CT/E2E/MAN ID |
| 是否可「只开发不测」合入？ | 否；§7.6 DoD + Reviewer 拒绝条件 |
| 是否有阶段出口？ | 是；§7.7 |
| 是否有可复制命令？ | 是；§7.2 / §7.5 / 建议 npm scripts |
| 是否弱化 BASE 回归？ | 否；明确不得破坏既有 systemSettings + smoke |
| 是否依赖公网 LLM 做 E2E？ | 否；禁止 |
| 手工是否替代核心自动化？ | 否；MAN 仅补位 |
| 缺陷是否回流测例？ | 是；§7.9 |

---

## 13. Out of Scope Follow-ups（未来可选 RFC）

1. Runtime **真·分区 patch** 保存（解决整包惊讶）  
2. 加密备份口令（导出文件密码）  
3. 设置变更本地审计日志（谁在何时改了何项——单机用户场景价值有限）  
4. 将抽屉升级为可分享 URL 的 settings 路由  
5. 设置抽屉暗色模式完整适配（若全站暗色未完成，设置不单独先行一套 dark skin）  

---

## 14. Visual Design System（反孤岛规范）

> **定位：** 系统设置是 **全局工作台配置层**，不是独立产品。视觉必须让用户感觉「仍在 SOPs 内改配置」，而不是打开了另一个 Admin 皮肤。  
> **上位法：** `docs/VISUAL_DESIGN_GUIDELINES.md`、`docs/THEME_SYSTEM_GUIDELINES.md`、`docs/MODAL_DEVELOPMENT_GUIDELINES.md`。本节只规定 **设置抽屉 + 模块深链摘要** 的落地细则；冲突时以上位法与 design-tokens 为准。

### 15.1 设计原则

| # | 原则 | 含义 |
| --- | --- | --- |
| V1 | **先归属，再表达** | 设置归属 `context: sys` / 工作台全局层；主强调色使用 **slate + blue 中性工作台**，不用 App Center 的 purple hero、不用各业务模块 banner 色抢戏 |
| V2 | **工具优先，装饰克制** | 无粒子、无大面积高饱和渐变、无营销 hero；分区仅允许 **低饱和 tint** |
| V3 | **组件族优先** | 新 UI 必须复用 `settings-*` 组件类或全站共享 card/button；禁止 section 内联「一次性」样式 |
| V4 | **Token 单源** | 颜色/圆角/阴影/间距优先 `var(--*)` / design-tokens；禁止在新增代码中写死 `#64748b`、`rgba(59,130,246,0.2)` 等 |
| V5 | **交互同源** | 危险确认用 `confirmWithModal`；焦点环、Esc、遮罩关闭与全站 modal/drawer 习惯一致 |
| V6 | **状态色语义固定** | 成功/警告/危险/信息使用全站语义色，不跟 section accent 走 |

### 15.2 Token 与样式来源（优先级）

实现时按序选用，**禁止跳级发明**：

1. **Design tokens / 生成变量**  
   `design-tokens.ts` → `variables.generated.css`（如 `--color-slate-*`、`--shadow-sm`、`--radius-*`、字号阶梯）
2. **语义变量**  
   `variables.css` 的 `--surface-*`、`--border-*`、`--color-text-*`、`--color-primary` 等
3. **设置局部语义 token**（仅允许在 `systemSettings.css` 顶部用变量映射一次）  

```css
/* 允许：映射到全局 token，供设置组件族使用 */
.settings-panel-root {
  --settings-surface: var(--color-bg-elevated, #fff);
  --settings-surface-muted: var(--color-slate-50, #f8fafc);
  --settings-border: var(--color-slate-200, #e2e8f0);
  --settings-text: var(--color-slate-700, #334155);
  --settings-text-muted: var(--color-slate-500, #64748b);
  --settings-accent: var(--color-blue-600, #2563eb);
  --settings-accent-soft: var(--color-blue-50, #eff6ff);
  --settings-danger: var(--color-red-600, #dc2626);
  --settings-radius-card: var(--radius-xl, 0.875rem);
  --settings-radius-control: var(--radius-lg, 0.75rem);
  --settings-focus-ring: 0 0 0 3px color-mix(in srgb, var(--settings-accent) 25%, transparent);
}
```

4. **Tailwind 工具类** — 仅用于布局（flex/grid/gap/padding），颜色类优先 `slate`/`blue`/`red` 语义阶；**新增**避免 `from-violet-500 via-indigo-500` 等装饰渐变堆叠  
5. **硬编码 hex** — **禁止新增**；存量在 P1-0 迁移清单中消除

### 15.3 全局壳与分区层级

#### 15.3.1 抽屉壳（Chrome）

| 元素 | 规范 |
| --- | --- |
| 形态 | 右侧抽屉（已有）；`max-w` 保持可读宽度；不改为居中大 modal 除非全站统一改 drawer 规范 |
| 遮罩 | 半透明深色 + 轻 blur；点击关闭（dirty 时先确认，见 P0-2） |
| 顶栏 | 左：图标（中性 slate/blue 渐变 **小面积**）+ 标题 15px/bold + 副标题 11px muted；右：关闭按钮 32×32、hover 浅底 |
| 顶部分割 | 1px 中性线或极淡渐变线；**禁止**彩虹进度条式强装饰（若保留 3px accent bar，颜色须来自 `--settings-accent` 单色/双色，不得每版换主题） |
| 背景 | 白 → 极浅 slate 的垂直微渐变即可；不用业务模块 banner 图 |

#### 15.3.2 信息层级（由外到内）

```text
Panel chrome
└── Nav (分类) + Sections
    └── Section head（uppercase 小标题 + 图标）
        └── Section frame（浅 tint 容器）
            ├── Coach（提示条）
            ├── Card / Step / Collapsible（内容单元）
            └── Actions row（保存 / 次要 / 危险）
```

#### 15.3.3 Section accent（允许的「个性」，不是新皮肤）

| Section | Accent 角色 | 允许 | 禁止 |
| --- | --- | --- | --- |
| AI 模型与连接 | violet/indigo **点缀** | head icon、frame 极淡 tint | 整区紫底、紫色主按钮全局化 |
| 工具策略 | indigo | 同上 | 与 LLM 区完全两套 card 圆角 |
| 采集网络 | cyan | 同上 | 商业插画/复杂图标墙 |
| 数据与备份 | blue | 同上 | 把危险按钮做成与主 CTA 同视觉权重 |
| 外观与体验 | slate | 中性为主 | 用当前用户主题色「染满」设置壳 |
| 开发者诊断 | emerald | 仅该区；且 dev-only | 对普通用户露出绿色「高级」错觉 |

**规则：** accent 只作用于 `settings-section-head__icon`、`settings-section-frame--*` 背景/边框 **α ≤ ~0.9 浅色**；正文、label、输入框边框保持中性 slate。

实现：frame 变体改为 CSS 变量，例如：

```css
.settings-section-frame--llm {
  --settings-frame-tint: color-mix(in srgb, var(--color-violet-100) 55%, white);
  --settings-frame-border: color-mix(in srgb, var(--color-violet-200) 70%, var(--settings-border));
  background: linear-gradient(135deg, var(--settings-frame-tint), var(--settings-surface-muted));
  border-color: var(--settings-frame-border);
}
```

### 15.4 组件族目录（必须复用）

| 组件类 | 用途 | 不得平行发明 |
| --- | --- | --- |
| `.settings-section-head` + `__icon` `__title` `__desc` | 区标题 | 各区手写 h3+任意 icon 盒 |
| `.settings-section-frame` + `--*` | 区容器 | 裸 `border rounded-2xl p-4` 复制体 |
| `.settings-coach` | 配置提示 / 健康检查结果 | 新 alert 皮肤（除非危险/警告用 §15.7） |
| `.settings-card` + `__title` `__desc` `__badge` | 通用内容卡 | 模块摘要另起 card 名且不同 padding |
| `.settings-control` + `--sm` | input/select | 混用无类原生控件样式 |
| `.settings-label` / `.settings-field-help` | 表单标签与说明 | 字号随手 `text-[11px]` 无规范 |
| `.settings-tool-app` / collapsible | 可折叠工具组 | 新手风琴交互 |
| `.settings-stat-tile` | 存储用量等统计 | 仪表盘风大数字卡 |
| `.settings-llm-step` | 有序配置步骤 | 仅 LLM 使用；其它区不要复制数字徽章彩虹 |

**P1 新增组件（纳入同族，不新建 BEM 方言）：**

| 新需求 | 类名建议 | 说明 |
| --- | --- | --- |
| 精简/高级切换 | `.settings-segmented` | 分段控件；选中态用 accent soft |
| 设置内搜索 | `.settings-search`（基于 control） | 左侧 magnifier 图标槽与 secret input 图标槽对齐 |
| 影响范围徽章 | `.settings-badge` + 修饰符 | 见 §15.5 |
| 预设按钮组 | `.settings-preset-group` | 次要按钮并排；选中态 outline accent |
| Dirty 顶栏提示 | `.settings-status-bar` | 见 §15.7 |
| 模块深链摘要 | `.settings-summary-card` 或复用 `.settings-card` | 见 §15.8 |

### 15.5 徽章与影响范围（视觉语义）

与 §3.5 标签对应的样式（颜色取语义 token，不按 section accent）：

| Badge | 表面 | 文字 | 备注 |
| --- | --- | --- | --- |
| 仅本浏览器 | slate-100 | slate-600 | 默认中性 |
| 影响 AI 成本 | amber-50 | amber-800 | 成本敏感 |
| 影响采集 | cyan-50 | cyan-800 | 与网络区呼应但浅 |
| 破坏性 | red-50 | red-700 | 仅危险动作附近 |
| 开发者模式 | emerald-50 | emerald-800 | 仅诊断 |
| 即时生效 | violet-50 | violet-700 | 诊断/外观即时项 |
| 全局生效 / 需保存 | indigo-50 | indigo-700 | 策略卡 |

禁止：同一屏超过 **3** 种高饱和 badge；badge 不使用渐变底。

### 15.6 排版 · 间距 · 控件 · CTA

#### 排版阶梯（设置内）

| 角色 | 规格 | 应用 |
| --- | --- | --- |
| Panel title | 15px / 700 / slate-800 | 顶栏「系统设置」 |
| Panel subtitle | 11px / 400 / slate-500 | 顶栏说明 |
| Section title | 12px / 600 / slate-500 / tracking wide / uppercase | `settings-section-head__title` |
| Section desc | 11px / 400 / slate-400–500 | 区说明 |
| Card title | 12px / 700 / slate-700 | 卡片标题 |
| Card desc | 10–11px / 400 / slate-400 | 辅助说明 |
| Label | 12px / 600 / slate-600 | 表单 label |
| Control text | 14px（默认）/ 12px（`--sm`） | 输入与下拉 |
| Helper | 10px / 400 / slate-500 | field-help |
| Mono | font-mono 12px | endpoint、key 掩码、模型 id |

不在设置内使用 welcome banner 的 20–22px 标题体系。

#### 间距与圆角

| 令牌 | 建议 |
| --- | --- |
| Section 垂直节奏 | `space-y-7` 级（约 1.75rem）保持 |
| Frame 内 padding | 1rem |
| Card padding | 0.75rem |
| 表单栅格 gap | 0.75rem |
| 控件高 | 默认 ≥ 40px；sm ≥ 36px；触控目标关闭/图标按钮 ≥ 32px |
| 圆角 | 卡片 ~14px；控件 ~12px；badge ~6px；与 token radius 对齐 |

#### CTA 层级（严格）

| 层级 | 样式 | 场景（每区最多） |
| --- | --- | --- |
| **Primary** | solid accent（blue/indigo 渐变可保留但 **同族**） | 1 个主保存：如「保存连接配置」「保存工具与运行策略」 |
| **Secondary** | 白底 + slate 边框 | 导出、导入、测试连接、恢复默认 |
| **Tertiary / Ghost** | 文字或浅底 | 展开清理项、导航 |
| **Danger** | 白底红字红边 或 浅红底 | 清空全部、清理密钥；**永不**做成主色实心大按钮与 Primary 并排争抢 |

主按钮 loading：图标 spin + disabled opacity；成功态 toast 用全站 toast，不在按钮上做第三套 success 皮肤。

#### 分段控件 / 预设

- 高度与 `settings-control--sm` 对齐  
- 选中：`background: var(--settings-accent-soft); color: var(--settings-accent); font-weight: 600`  
- 未选中：透明 + muted 文字  
- 键盘：左右方向键可切换（P1 体验加分，建议纳入）

### 15.7 状态条与反馈

| 状态 | 容器 | 行为 |
| --- | --- | --- |
| Dirty 未保存 | 顶栏下方或滚动区顶 `settings-status-bar--warning` | 文案列出脏分区；不自动保存 |
| 健康检查失败 | coach 变体或 `status-bar--danger` | 可操作（恢复默认 / 查看） |
| 配额告警（P2） | `status-bar--warning` + CTA 导出/清理 | 固定在数据区顶或全局顶 |
| 多标签冲突（P2） | `status-bar--info` | 主按钮「重新加载」 |
| 成功/失败短反馈 | 全站 `showToast` | 禁止 section 内自定义 snackbar |

警告/危险条：左边 3px 语义色条 + 浅底；图标固定 28–32px 圆角盒。

### 15.8 模块深链与「唯一入口」的视觉连续

模块内（PPC / AI Analysis 等）替换原编辑面板后：

```text
┌ settings-card / settings-summary-card ─────────────┐
│ 标题：PPC 业务阈值          badge：在系统设置中管理   │
│ 只读：目标 ACOS 35% · 高 ACOS 55% · …               │
│ [在系统设置中配置 →]  secondary 或 text link         │
└────────────────────────────────────────────────────┘
```

规则：

1. 摘要卡 padding、标题字号、边框与设置内 card **一致或共享 class**  
2. 不在模块里保留「可编辑表单 + 另一套保存按钮」的视觉（即使后端已改读 Runtime）  
3. 深链打开后，目标 section **短暂高亮**（2s outline 或 ring，用 accent，尊重 `prefers-reduced-motion`）  
4. 模块主题色（emerald PPC 等）**仅**可用于模块页 banner/入口；摘要卡本身保持中性，避免「模块绿卡 vs 设置紫卡」割裂

### 15.9 反模式清单（PR 拒绝项）

| 反模式 | 原因 |
| --- | --- |
| 新增裸 `#hex` / 未映射 rgba | 破坏 token 单源 |
| 新 section 自定义全套 button 渐变色 | 孤岛 CTA |
| 设置内再做 welcome banner / 粒子 | 违反工具页原则 |
| 用业务模块 `wb-theme-*` 包装整个设置壳 | 归属错误（设置是 sys/全局） |
| 平行实现 confirm / 自定义 Escape 栈 | 违反 MODAL 规范 |
| 精简/高级用两套完全不同 layout 皮肤 | 应是显隐，不是换肤 |
| 每个工具 details 不同圆角/阴影 | 破坏组件族 |
| 危险操作使用 Primary 实心蓝/绿 | 安全认知错误 |
| 为暗色模式在设置内写死反色补丁 | 等全站 dark，不单开 |

### 15.10 无障碍与动效

| 项 | 要求 |
| --- | --- |
| 焦点 | 可见 `focus-visible` ring（`--settings-focus-ring`）；关闭/导航/保存均可键盘到达 |
| 对比度 | 正文与 mute 文案满足 WCAG AA（mute 仅用于非必要说明） |
| 标签 | 图标按钮有 `aria-label`；分区 `aria-controls` 已有则保持 |
| 动效 | 面板开合、高亮脉冲遵循 `prefers-reduced-motion`（现有 CSS 已有 reduce 块则扩展而非删除） |
| 滚动 | `scrollToSection` 仅滚动 `.settings-panel-scroll`，不带动整页（已有约束，保持） |

### 15.11 与外观设置区的关系

- 「外观与体验」**改变的是应用主题/动效**，不是设置抽屉自己的设计系统  
- 用户选择深色主题时：设置抽屉跟随全站 surface token；**禁止**设置壳写死 `bg-white` 导致「外黑内白」孤岛（P1-0 将硬编码白底改为 `var(--settings-surface)`）  
- 动画关闭时：设置内过渡降级，但不隐藏结构

### 15.12 视觉验收清单（每个含 UI 的 PR）

- [ ] 无新增未映射硬编码色值  
- [ ] 新控件使用 `settings-control` / 同族变体  
- [ ] Primary CTA ≤ 1 / 可见动作区  
- [ ] 危险动作视觉 ≠ Primary  
- [ ] 徽章仅使用 §15.5 语义  
- [ ] 确认框走共享 modal  
- [ ] 模块摘要卡与设置 card 同族  
- [ ] `prefers-reduced-motion` 下无关键动画  
- [ ] 截图对比：设置抽屉与相邻工作台页并排时，无「第二套产品」感  

### 15.13 存量迁移范围（P1-0）

| 位置 | 动作 |
| --- | --- |
| `systemSettings.css` 中 `#ede9fe`、`#8b5cf6` 等 | 改为 token / color-mix |
| `systemSettings.html` 中大量 `bg-gradient-to-*`、`shadow-*-500/25` | 收敛主 CTA 与顶栏；次要按钮去渐变 |
| 各 section 重复的 Tailwind 卡片 class | 尽量回到 `.settings-card` |
| 新增外观 section | **只**用组件族搭建，禁止复制 LLM step 彩虹序号 |

**非目标：** 一次 PR 删光所有 Tailwind 颜色类；允许布局类保留，颜色类逐步替换。

### 15.14 测试与文档挂钩

| 类型 | 内容 |
| --- | --- |
| 单测/契约 | HTML 含 `settings-segmented` / `settings-search` 等关键 class（随功能加） |
| 视觉 | 可选：设置面板打开态截图纳入现有 visual / smoke；不强制新工具链 |
| 文档 | 若 `VISUAL_DESIGN_GUIDELINES.md` 增补「全局抽屉」小节，链回本节；**不必**复制全文 |

---

## 15. Approval Gate

**请审查本 Spec（含 §14 视觉规范 + §7 完整回归闭环）。** 确认后：

1. 将 `Status` 改为 `approved`  
2. 调用 `writing-plans` 产出实施计划：每个 Task 必须含 **对应用例 ID + 红绿命令**（TDD 友好）；顺序建议 **PR-P0a（功能+测试骨架）→ P0b → P1-visual → …**  
3. 实施时严格执行 §7.6 DoD；阶段完成跑 §7.7  
4. 再进入 subagent-driven 或 inline 实施  

未批准前 **不修改业务代码**。
