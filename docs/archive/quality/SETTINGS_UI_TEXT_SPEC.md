# 系统设置 UI 收口方案 Spec（SETTINGS_UI_TEXT_SPEC）

> 日期：2026-08-04（v2，按问题/需求甄别重排）· 状态：待确认
> 范围：系统设置（System Settings）面板相关 6 条子项。
> 处理原则：**问题**按缺陷流程（复现→测试先行→修复→验证）；**需求**按变更流程（确认文案/范围→实施→验证）。两者不混为一谈。

## 1. 甄别总表

| 编号 | 条目 | 甄别 | 判定理由 |
|---|---|---|---|
| P-1 | 无凭证时默认模型下拉展示 gpt-5.5 / gemini-3.5-flash 并自动选中 | **问题（缺陷）** | 未配置任何凭证即展示并选中“可能无法调用”的模型，误导用户以为已就绪；保存后调用必然失败 |
| R-1 | “基本信息”折叠行 meta 直接显示完整 URL | **需求（信息增强）** | 现有输入框可查看，功能可用，属折叠行信息密度不足 |
| R-2 | “模型与能力”折叠行 meta 显示默认模型名 + 推理等级 | **需求（信息增强）** | 同上，折叠行未暴露当前选择 |
| R-3 | 系统设置导航 “Deep Chat” → “Playground” | **需求（命名/文案）** | 产品命名统一 |
| R-4 | “恢复默认”按钮文字前加小图标 | **需求（UI 一致性）** | 同栏按钮风格不一致，非功能缺陷 |
| R-5 | “清理项”→“项目清理”；“危险操作”→“本地数据清空” | **需求（文案）** | 文案调整 |
| R-6 | “跟随系统动效偏好”→“动效偏好”；动画速度“标准”→“默认” | **需求（文案）** | 文案调整 |

---

## 2. P-1 问题：无凭证时展示并自动选中不可调用的模型

### 2.1 现状与证据

| 证据 | 说明 |
|---|---|
| `src/components/settings/sections/llmSection.ts:300-303`（`loadProviderConfig`） | `llm.models = dedupeModels(getRawProviderModels(savedConfig, config))`——无论有无凭证都填充模型 |
| `src/components/settings/domain/settingsLlmModel.ts:212-214`（`getRawProviderModels`） | 无保存模型时直接返回 `config.models`（厂商预设） |
| `settingsLlmModel.ts:217-221`（`getInitialModel`） | 无保存模型时自动取第一个预设 → 自动选中 gpt-5.5 |
| `src/common/config/llmProviders.ts:41,55` | 预设含 `gpt-5.5`、`gemini-3.5-flash` |
| `src/components/settings/sections/llmSection.html:324` | 已有空选项 `— 请选择 —`，但被预设项淹没 |

### 2.2 缺陷判定

- 预期：无任何凭证时，默认模型下拉只显示 `— 请选择 —`（disabled），不展示可能无法调用的模型。
- 实际：下拉展示预设模型并自动选中第一个。
- 影响：用户误以为已配置完成；保存后所有依赖默认模型的工具调用失败。

### 2.3 处理方式（缺陷流程）

1. 先补单测复现：无凭证（无 savedConfig、无 key）→ `models=[]`、`model=''`、`modelSelectDisabled=true`。
2. 修复 `loadProviderConfig`：按凭证判定填充 models/model。
3. 回归现有用例（`tests/unit/systemSettingsCurrent.test.ts:746-796` 有 key 场景）。

### 2.4 凭证判定规则（需确认）

- 推荐：`hasCredentials = 存在已保存配置(savedConfig) || API Key 非空`。
  - 理由：`resolveProviderEndpoint`（`settingsLlmModel.ts:201-206`）无保存配置时会回填默认 endpoint，**endpoint 非空不能作为凭证依据**；无 key 必然无法调用。
  - 兼容：存量已保存配置的用户不受影响。
- 替代（更严格）：仅 `API Key 非空` 才显示模型。会清空“只配 endpoint 未配 key”存量用户的下拉。

---

## 3. R-1/R-2 需求：折叠行 meta 信息增强

### 3.1 现状与证据

| 证据 | 说明 |
|---|---|
| `src/components/settings/sections/llmSection.html:85-110` | “基本信息”折叠行 hint 静态：`厂商、协议类型与 Endpoint`，无 `x-text` 绑定 |
| `llmSection.html:288-300` | “模型与能力”折叠行 hint 静态：`默认模型与推理` |
| `src/components/settings/sections/llmSection.ts:150-153`（`fullApiUrlPreview`） | 已有 URL 组合能力，可复用思路 |
| `llmSection.ts:242-245`（`reasoningEffortLabel`） | 已有推理等级 label，可复用 |

### 3.2 变更请求

- R-1：基本信息折叠行 meta 显示完整 Endpoint URL（含协议）；未配置时显示默认地址或“尚未配置”占位（待确认）。
- R-2：模型与能力折叠行 meta 显示：默认模型名（空→“未选择”）+ 推理状态（启用→effort 档位 / 关闭→“推理 关”）。

### 3.3 处理方式（需求流程）

确认展示格式 → 新增 getter（复用 `defaultLlmEndpoint`、`reasoningEffortLabel`、`getModelLabel`）→ 模板改 `x-text` 绑定 → 单测/冒烟。

---

## 4. R-3 需求：导航 Deep Chat → Playground

| 证据 | 说明 |
|---|---|
| `src/components/settings/systemSettings.html:293` | 导航按钮文本 `Deep Chat` |
| `tests/e2e/system-settings.spec.ts:149,251` | e2e 按 `name: 'Deep Chat', exact: true` 匹配 |

范围：仅系统设置菜单内按钮文字。内部 id `playground-deep-chat`、模块标题 `Playground · Deep Chat`（`toolStrategyDeepChat.html:13`）、App Center 菜单（`release-smoke.spec.ts:43`）不改。

---

## 5. R-4 需求：恢复默认按钮加图标

| 证据 | 说明 |
|---|---|
| `src/components/settings/sections/toolStrategySection.html:122-126` | “恢复默认”纯文本，同栏“保存配置”带图标（:117-121） |

变更：文字前加小图标（推荐 `fas fa-rotate-left text-xs`，`aria-hidden="true"`，可访问名不变）。

---

## 6. R-5 需求：数据与备份文案

| 位置 | 现状 | 证据 |
|---|---|---|
| 左侧导航 | 清理项 / 危险操作 | `systemSettings.html:374,382` |
| 页内折叠标题 | 清理项 | `dataSection.html:244` |
| 折叠状态按钮 | 展开/收起清理项 | `dataSection.ts:157`（推荐同步，待确认） |
| 页内危险区标题 | 清空全部本地数据 | `dataSection.html:329`（推荐保留，待确认） |
| 搜索索引 | 清理项 等 | `settingsSearch.ts:201,203` |
| 单测 | 断言 `危险操作` / `展开清理项` | `tests/unit/systemSettingsCurrent.test.ts:1477,363` |
| e2e | 按 `清理项` 匹配 | `tests/e2e/system-settings.spec.ts:254` |

变更：导航与页内折叠标题 `清理项`→`项目清理`；导航 `危险操作`→`本地数据清空`。

---

## 7. R-6 需求：外观与体验文案

| 位置 | 现状 | 证据 |
|---|---|---|
| 左侧导航 | 跟随系统动效偏好 | `systemSettings.html:435` |
| 页内标题 + sr-only | 跟随系统动效偏好 | `appearanceSection.html:170,175` |
| 动画速度档位 | 快 / 标准 / 慢 | `appearanceSection.html:229`（值 `normal` 不变） |
| 搜索索引 | 跟随系统动效偏好 / 标准 | `settingsSearch.ts:231,236` |
| e2e | 按 `跟随系统动效偏好` 匹配 | `tests/e2e/system-settings.spec.ts:347` |

变更：`跟随系统动效偏好`→`动效偏好`；档位 `标准`→`默认`（仅文案，`normal` 值不变）。

---

## 8. 共性同步清单（所有变更共享）

- 搜索索引 `src/components/settings/domain/settingsSearch.ts` 随新文案更新（旧词可保留为别名）。
- 单测 `tests/unit/systemSettingsCurrent.test.ts`（:1477 等）与 e2e `tests/e2e/system-settings.spec.ts`（:149/:251/:254/:347）同步。
- `aria-label`/`sr-only` 随可见文案同步；图标一律 `aria-hidden`，不改可访问名。
- 路由 id、DOM id、数据字段（`playground-deep-chat`、`settings-data-danger` 等）不动。

## 9. 非目标（明确不做）

- 不重命名路由 / DOM id / 数据字段。
- 不改模型能力目录（`modelCapability/registry.ts` 中 gpt-5.5 / gemini-3.5-flash 保留）。
- 不改“获取模型列表”按钮及校验逻辑（已具备凭证拦截）。
- 不顺手处理“撤销上次”按钮等相邻样式。

## 10. 待确认决策

1. P-1 凭证判定：推荐 `有保存配置 || API Key 非空`；替代 `仅 API Key 非空`。
2. R-1 未配置时占位：默认 Endpoint 地址（`https://new.hongecb.store/v1`）还是“尚未配置 Endpoint”。
3. R-5 页内危险区标题 `清空全部本地数据` 是否一并改为 `本地数据清空`。
4. R-5 折叠按钮 `展开/收起清理项` 是否同步为 `展开/收起项目清理`。
5. R-4 图标样式：推荐 `fa-rotate-left`。
