# 系统设置企业级硬化设计 Spec

**Date:** 2026-07-25  
**Status:** draft-for-review  
**Route:** A — 分阶段硬化（Reliability-first phased hardening）  
**Related:**

- 归档审查：`docs/archive/ui-audit/SYSTEM_SETTINGS_STRUCTURE_REVIEW_2026-07-06.md`
- Runtime UI：`docs/superpowers/specs/2026-07-25-runtime-strategy-settings-ui-completeness-design.md`
- 实现入口：`src/components/settings/systemSettings.{ts,html,css}`
- SSOT：`src/services/runtimeStrategyService.ts`、`src/services/toolStrategyService.ts`

---

## 0. 决策记录（已确认）

| 决策点 | 结论 |
| --- | --- |
| 优化范围 | **C 全量企业级治理**：可靠性（HA）+ 用户友好，分阶段路线图一次成 Spec |
| 数据边界 | **仅本浏览器本地**（localStorage / IndexedDB）；不做云同步 / 多账号 |
| 模块关系 | **系统设置为唯一写入口**；模块内改为只读摘要 + 深链 |
| 技术路线 | **A 分阶段硬化**：P0 可靠性 → P1 体验与唯一入口 → P2 备份 HA → P3 拆分可维护性 |
| 外观偏好 | 新增一级目录 **「外观与体验」**（主题 / 动画 / 减少动效） |

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

### 2.2 Non-goals

- 账号体系、云同步、远程 feature flag 管理台
- 新建「安全与凭据」「危险区」等空一级目录（危险操作保留在数据与备份内）
- 本阶段实现完整 Settings Profile 平台（可作为未来演进，不阻塞 A 路线）

### 2.3 成功标准（可验证）

1. 改工具策略未保存 → 关闭面板出现确认；保存后关闭无确认  
2. 模块内无法再独立持久化 PPC 阈值 / AI 调度到旁路 key（或旁路 key 只读迁移后删除写路径）  
3. 刷新后 Runtime / 外观 / 连接配置与保存时一致  
4. 导入坏文件不破坏现有数据；replace 前完成校验  
5. `tests/unit/systemSettingsCurrent.test.ts` + release-smoke 设置断言持续绿  

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

### 5.2 P1 — 唯一入口 + 用户友好

| ID | 需求 | 验收 |
| --- | --- | --- |
| **P1-1** | 系统设置唯一写入口 + 深链 | 模块无旁路写；深链可打开并聚焦 |
| **P1-2** | 精简/高级 density | 默认 simple；持久化 |
| **P1-3** | 设置内搜索 | 关键词可定位 |
| **P1-4** | 影响范围标签 | 关键卡片徽章齐全 |
| **P1-5** | 外观与体验一级区 | theme + animation 同源；无第二套 storage 语义 |
| **P1-6** | 一键预设（稳定/速度/成本） | 只改内存 runtime 表单 → dirty；需保存 |

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

## 7. Testing Strategy

### 7.1 单测（扩展 `tests/unit/systemSettingsCurrent.test.ts` 或拆分）

| 用例主题 | 断言 |
| --- | --- |
| Dirty | 编辑 runtime → dirty；save → clean；reset → dirty |
| Close guard | dirty 时 close 走确认；确认丢弃后 isOpen false |
| Save contract | `saveProviderConfig` 不调用 runtime save；`saveToolStrategy` 调用 tool+runtime save |
| Health | 损坏 payload normalize 后可打开 |
| Presets | 应用「成本优先」后字段等于 §5.2 表 |
| Deep link | `openSettings({ sectionId, focus })` 调用 scroll/expand |
| PPC 迁移 | 旧 `ppc_search_terms_thresholds_v1` 读入 Runtime 后不再 set 旧 key |
| Appearance | 改主题调用既有 API，不写 runtime |

### 7.2 模板契约

延续现有 HTML 字符串断言风格：

- 六区导航含「外观与体验」  
- `saveToolStrategy` 文案含运行策略  
- density / search 控件存在（P1 后）  

### 7.3 E2E

- `tests/e2e/release-smoke.spec.ts`：打开设置、可见分区、基础保存路径  
- 可选：dirty 关闭拦截（若 e2e 稳定可测 confirm modal）  

### 7.4 回归门禁

- `npm run type-check`  
- 相关 unit + release-smoke  
- 不要求本 Spec 单独引入新 CI job；挂现有 quality gate  

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

---

## 9. Implementation Boundaries

### 9.1 预期修改

| 路径 | 阶段 |
| --- | --- |
| `src/components/settings/systemSettings.ts` | P0–P3 |
| `src/components/settings/systemSettings.html` | P0–P3 |
| `src/components/settings/systemSettings.css` | P1+ |
| `src/services/runtimeStrategyService.ts` | P0/P1（注释、只读 helper、如需） |
| `src/services/toolStrategyService.ts` | 按需 |
| `src/common/config/ConfigCenter.ts` | P0-3 |
| LocalDataStore / storage 导出导入 | P2 |
| `src/modules/.../PerformanceSettings*` | P1-1 |
| `src/modules/.../ppc_search_terms/settings/*` | P1-1 |
| `src/stores/animation-settings.ts` / theme | P1-5 |
| `src/main.ts`（openSettings 传参） | P1 |
| `tests/unit/systemSettings*.ts`、`tests/e2e/release-smoke.spec.ts` | 全程 |

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

1. PR-P0a：Dirty + 关闭确认 + 保存契约测例  
2. PR-P0b：ConfigCenter 审计 + 健康检查 + 代理测试  
3. PR-P1a：深链 API（SETTINGS_OPEN payload）+ PPC thresholds/analysis + Performance 去写路径  
4. PR-P1b：density + 搜索 + 徽章  
5. PR-P1c：外观区 + 预设  
6. PR-P2a：导入预检 + 分桶导出  
7. PR-P2b：回滚点 + 多标签 + 配额条  
8. PR-P3：domain 拆分（可多 PR）  

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
| 精简/高级、搜索、徽章 | P1 |
| 主题 / 动画 | P1 |
| 稳定/速度/成本预设 | P1 |
| 分桶导出、导入预检、回滚、多标签、配额 | P2 |
| 代码拆分与 Domain | P3 |

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

### 12.3 范围是否可执行

- 单 Spec 覆盖 P0–P3，但 **按 PR 切片** 可独立交付；不要求一个迭代做完  
- 若资源紧张：最低可行集 = **P0 全部 + P1-1**（可靠性 + 去双写）  

### 12.4 可落地性检查

| 检查项 | 结果 |
| --- | --- |
| 是否依赖不存在后端？ | 否 |
| 是否可在现有 Alpine 抽屉内完成？ | 是 |
| 是否有明确文件与测例锚点？ | 是 |
| 是否与近期 Runtime UI 工作冲突？ | 否，继承并硬化契约 |
| 最大风险点 | Dirty 实现细节 + 去模块写路径的产品路径变长 → 深链缓解 |
| 是否可在不改存储 key 语义下启动 P0？ | 是 |

### 12.5 完整性缺口（已关闭）

| 曾可能含糊点 | 本 Spec 处理 |
| --- | --- |
| saveToolStrategy 是否写完整 runtime | §4.1 决议：整包 + 文案 |
| 预设改哪些字段 | §5.2 表 |
| 外观是否一级目录 | §0 / §3.1 是 |
| openSettings 深链参数 | §3.6 类型 + EventBus payload |
| 模块双写清单 | §4.4 / §11.4（含 analysisSettings） |
| PPC 上下文文本是否进系统设置 | §3.6：否，仅策略开关/阈值 |

### 12.6 落地时注意（非阻塞）

1. `confirmSettingsAction` / `chooseWithModal` 已存在，Dirty 确认应复用，勿新造第三套 modal  
2. `scrollToSection` 已存在，深链复用  
3. 导出敏感提示与 `SECURE_STORAGE_SECURITY_BOUNDARY` 已存在，P2 分桶应沿用  
4. 修改 `saveThresholds` 时同步更新 PPC 模块测例  

---

## 13. Out of Scope Follow-ups（未来可选 RFC）

1. Runtime **真·分区 patch** 保存（解决整包惊讶）  
2. 加密备份口令（导出文件密码）  
3. 设置变更本地审计日志（谁在何时改了何项——单机用户场景价值有限）  
4. 将抽屉升级为可分享 URL 的 settings 路由  

---

## 14. Approval Gate

**请审查本 Spec。** 确认后：

1. 将 `Status` 改为 `approved`  
2. 调用 `writing-plans` 产出 `docs/superpowers/plans/2026-07-25-system-settings-enterprise-hardening.md`（建议先写 **PR-P0a/P0b** 详细步骤）  
3. 再进入 subagent-driven 或 inline 实施  

未批准前 **不修改业务代码**。
