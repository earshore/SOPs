# 系统设置 UI 收口修复计划（SETTINGS_UI_TEXT_PLAN）

> 日期：2026-08-04（v2，按问题/需求分流程）· 状态：待实施
> 前置：确认 `docs/SETTINGS_UI_TEXT_SPEC.md` 第 10 节 5 个决策。
> 流程：**P-1 按缺陷流程（测试先行）**；**R-1~R-6 按需求流程（确认→实施→验证）**。

## 0. 决策确认（阻塞项）

- [ ] 确认 SPEC 第 10 节 5 项决策（凭证判定、占位文案、危险行标题、toggle 文案、reset 图标）。

---

## 1. P-1 问题修复：无凭证展示不可调用模型（缺陷流程，测试先行）

### 1.1 步骤

1. **复现测试先行**：在 `tests/unit/systemSettingsCurrent.test.ts` 新增用例
   - 无 savedConfig、无 API Key → 期望 `llm.models=[]`、`llm.model=''`、`modelSelectDisabled=true`；下拉模板仍含 `— 请选择 —`。
   - 先运行确认该用例**失败**（复现缺陷）。
2. **修复**：`src/components/settings/sections/llmSection.ts` `loadProviderConfig`
   - 按决策 1 计算 `hasCredentials`，无凭证时 `llm.models=[]`、`llm.model=''`；有凭证时保持现有逻辑。
3. **验证**：用例转绿；现有有 key 场景用例（:746-796 附近）不回归。

> 说明：`loadProviderApiKey` 在填充 models 之前已 `await`，顺序满足判定需求，无需调整加载顺序。

### 1.2 影响面

- 仅 `llmSection.ts` + 单测。`modelSelectDisabled`、`— 请选择 —` 选项已存在，无需改模板。

---

## 2. R-1/R-2 需求：折叠行 meta 信息增强

### 2.1 实施

| 文件 | 改动 |
|---|---|
| `src/components/settings/sections/llmSection.ts` | 新增 getter `basicInfoMetaText`（`llm.endpoint || defaultLlmEndpoint`，空→决策 2 占位）；新增 getter `modelMetaText`（模型名 + 推理状态，复用 `reasoningEffortLabel`） |
| `src/components/settings/sections/llmSection.html` | 基本信息折叠行 hint 改 `x-text="basicInfoMetaText"`（约 :105）；模型与能力折叠行 hint 改 `x-text="modelMetaText"`（约 :298） |
| `tests/unit/systemSettingsCurrent.test.ts` | 新增 getter 断言（含空态/选中态） |

### 2.2 验证

- 单测：`basicInfoMetaText` 空态返回占位、有值返回完整 URL；`modelMetaText` 含模型名与推理状态。
- 手动冒烟：折叠行即时反映输入变化（Alpine 响应式）。

---

## 3. R-3 需求：导航 Deep Chat → Playground

| 文件 | 改动 |
|---|---|
| `src/components/settings/systemSettings.html:293` | `Deep Chat` → `Playground` |
| `tests/e2e/system-settings.spec.ts:149,251` | `name: 'Deep Chat'` → `name: 'Playground'` |

验证：`npx playwright test tests/e2e/system-settings.spec.ts -g "E2E-P1-nav"`。

---

## 4. R-4 需求：恢复默认按钮加图标

| 文件 | 改动 |
|---|---|
| `src/components/settings/sections/toolStrategySection.html:122-126` | 文字前插入 `<i class="fas fa-rotate-left text-xs mr-1" aria-hidden="true"></i>` |

验证：模板断言（可选加 `toContain('fa-rotate-left')`）；手动查看按钮。

---

## 5. R-5 需求：数据与备份文案

| 文件 | 改动 |
|---|---|
| `src/components/settings/systemSettings.html:374` | `清理项` → `项目清理` |
| `src/components/settings/systemSettings.html:382` | `危险操作` → `本地数据清空` |
| `src/components/settings/sections/dataSection.html:244` | `清理项` → `项目清理` |
| `src/components/settings/sections/dataSection.ts:157` | 决策 4 若通过：`展开/收起项目清理` |
| `src/components/settings/domain/settingsSearch.ts:201,203` | labels 更新（旧词保留别名） |
| `tests/unit/systemSettingsCurrent.test.ts:1477` | `危险操作` → `本地数据清空` |
| `tests/unit/systemSettingsCurrent.test.ts:363` | 决策 4 若通过：`展开清理项` → `展开项目清理` |
| `tests/e2e/system-settings.spec.ts:254` | `清理项` → `项目清理` |

---

## 6. R-6 需求：外观与体验文案

| 文件 | 改动 |
|---|---|
| `src/components/settings/systemSettings.html:435` | `跟随系统动效偏好` → `动效偏好` |
| `src/components/settings/sections/appearanceSection.html:170,175` | 标题 + sr-only → `动效偏好` |
| `src/components/settings/sections/appearanceSection.html:229` | `标准` → `默认` |
| `src/components/settings/domain/settingsSearch.ts:231,236` | labels 更新（旧词保留别名） |
| `tests/e2e/system-settings.spec.ts:347` | `跟随系统动效偏好` → `动效偏好` |

---

## 7. 全量验证

| 命令 | 目的 |
|---|---|
| `npx vitest run tests/unit/systemSettingsCurrent.test.ts` | 设置单测全绿（含 P-1 新增用例、R-1/R-2 getter 断言） |
| `npx vitest run`（CI 子集） | 回归 |
| `npm run lint` | 规范（无未用 import/getter） |
| `npm run build:app` | 构建通过 |
| `npx playwright test tests/e2e/system-settings.spec.ts` | 导航/文案 e2e |
| 手动冒烟 | 无凭证新用户：下拉仅 `— 请选择 —`；折叠行显示 URL 与模型/推理摘要；导航/文案逐项核对 |

## 8. 验收清单

- [ ] P-1：无凭证时默认模型下拉仅 `— 请选择 —`（disabled）；有凭证/已保存后恢复展示
- [ ] R-1/R-2：两个折叠行 meta 显示目标信息（URL；模型名+推理等级），空态占位正确
- [ ] R-3：系统设置菜单内 `Deep Chat` 已改 `Playground`（App Center 等范围外不动）
- [ ] R-4：“恢复默认”带小图标，可访问名不变
- [ ] R-5：`清理项`→`项目清理`、`危险操作`→`本地数据清空` 出现处（导航/页面/搜索）一致
- [ ] R-6：`跟随系统动效偏好`→`动效偏好`、`标准`→`默认` 出现处一致
- [ ] 单测 / e2e 全绿，无其它破坏
