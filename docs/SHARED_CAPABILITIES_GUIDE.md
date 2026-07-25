# 共享能力复用指南（高回报轮子）

**适用范围**: 新增/改动页面入口、复制交互、LLM 解析、站点映射、Overview 交互  
**更新时间**: 2026-07-11  
**目标**: 直接复用现有共享实现，禁止再造孤岛式拷贝

---

## 1. 原则

1. **先搜再写**：同类能力优先 `src/common/utils/*`、`src/components/*`、`src/modules/sops/utils/*`。
2. **页面入口必须挂共享壳**：`BaseModule` 或共享工厂（见第 2 节）。`page:architecture:audit` 会强制检查。
3. **横切能力只保留一处实现**：剪贴板、LLM JSON 解析、站点码映射、Overview 筛选/滚动。
4. **回报优先**：模板字符串/业务文案差异不抽；骨架、交互、安全与解析要抽。
5. **改共享层要补测试**：至少覆盖 happy path + 失败/回退路径。

禁止：

- 业务目录再写 `navigator.clipboard.writeText` / `execCommand('copy')` 私有实现
- 业务目录再写 `jsonrepair` + fence 提取的 LLM 解析私有实现
- 再拷贝一份 `filterByCategory` / `scrollToModule`
- 页面入口手写 `mount` 裸函数且不走共享壳
- 再维护一份 `DE/FR/UK` 域名中文名硬编码表

---

## 2. 页面入口：共享壳选型

| 场景                                                   | 使用                           | 路径                                                                            |
| ------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------- |
| SOP 模板页（负责人字段 + 复制模板 + actions）          | `createSopTemplateModule`      | `src/modules/sops/utils/sopTemplateModule.ts`                                   |
| 纯静态 HTML 页                                         | `createStaticTemplateModule`   | `src/common/utils/createStaticTemplateModule.ts`                                |
| More 业务场景案例页                                    | `createBusinessScenarioModule` | `src/modules/more/views/business_scenarios/createBusinessScenarioModule.ts`     |
| Alpine 作业面板页（AI Analysis / PromptLab / Scraper） | `createAlpinePanelModule`      | `src/modules/app_center/views/master_analysis/utils/createAlpinePanelModule.ts` |
| 复杂交互页                                             | `extends BaseModule`           | `src/common/BaseModule.ts`                                                      |

### 2.1 静态模板页

```ts
import { createStaticTemplateModule } from "@/common/utils/createStaticTemplateModule";
import "./styles.css";

const instance = createStaticTemplateModule({
  moduleId: "amz_quality_listing",
  templatePath:
    "src/modules/amz_hub/views/practice/quality_listing/template.html",
  // 可选：挂载后绑定事件
  // onInit: (container) => { ... },
  // 可选：卸载清理
  // onUnmount: () => { ... },
});

export const mount = (container: HTMLElement): Promise<void> =>
  instance.mount(container);
export const unmount = (): void => {
  instance.unmount();
};
```

需要“加载模板后再变换 HTML”时用 `transformHtml`（业务场景工厂已这样做）。

### 2.2 业务场景案例页

```ts
import { createBusinessScenarioModule } from "../createBusinessScenarioModule";

const scenarioModule = createBusinessScenarioModule({
  moduleId: "more_ziniao_usage_notice",
  templatePath:
    "src/modules/more/views/business_scenarios/usage_notice/template.html",
  caseId: "usage_notice",
});

export const mount = (container: HTMLElement) =>
  scenarioModule.mount(container);
export const unmount = () => scenarioModule.unmount();
```

新增 case：

1. 在 `casePageRenderer.ts` 增加 `CaseId` 与数据。
2. 新增 `views/business_scenarios/<id>/template.html` + `index.ts`（上表模板）。
3. 更新 `module.manifest.ts` 路由。

### 2.3 SOP 模板页

```ts
import { createSopTemplateModule } from "../../../utils/sopTemplateModule";
import { createOwnerField } from "../../../utils/ownerField";
import { createTemplateCopyAction } from "../../../utils/templateCopyAction";

const ownerField = createOwnerField({
  storageKey: "listing_review_owner_v1",
  defaultOwner: "内容负责人",
  inputId: "listing-review-owner",
});

export function buildListingReviewTemplate(owner = "内容负责人"): string {
  // 业务模板字符串...
  return `# Listing 复盘 - ${owner}`;
}

const module = createSopTemplateModule({
  moduleId: "listing_seo",
  templatePath: "src/modules/sops/views/growth/listing_seo/template.html",
  ownerFields: [ownerField],
  actions: {
    copyListingReviewTemplate: createTemplateCopyAction({
      ownerField,
      buildTemplate: buildListingReviewTemplate,
      successMessage: "已复制 Listing 复盘模板",
      failureMessage: "复制失败，请手动复制模板或稍后重试。",
    }),
  },
});

export const mount = (container: HTMLElement) => module.mount(container);
export const unmount = () => module.unmount();
```

### 2.4 复杂交互页

```ts
import BaseModule from "@/common/BaseModule";
import { SafeTemplateLoader } from "@/common/infrastructure/SafeModuleLoader";
import { setSafeHtml } from "@/common/utils/security";

class MyToolModule extends BaseModule {
  constructor() {
    super("my_tool");
  }

  protected async render(): Promise<void> {
    if (!this.container) return;
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      "src/modules/.../template.html",
    );
    setSafeHtml(this.container, html);
    this.container.classList.add("fade-in");
  }

  protected async init(): Promise<void> {
    if (!this.container) return;
    // 用 this.addEventListener / this.addDisposable 绑定，保证卸载清理
  }
}

const instance = new MyToolModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
```

门禁：

- `npm run page:architecture:audit`
- `tests/unit/page-architecture-convergence.test.ts`

---

## 3. 剪贴板

**唯一实现**：`src/common/utils/clipboard.ts`  
**API**：

- `copyTextToClipboard(text: string): Promise<boolean>`
- `readTextFromClipboard(): Promise<string | null>`

```ts
import { copyTextToClipboard } from "@/common/utils/clipboard";
import { showToast } from "@/common/ui/notifications";

async function copyReport(text: string): Promise<void> {
  try {
    if (!(await copyTextToClipboard(text))) {
      throw new Error("clipboard unavailable");
    }
    showToast("已复制", { type: "success" });
  } catch {
    showToast("复制失败，请手动选择文本复制", { type: "error" });
  }
}
```

说明：

- 返回 `true/false`，调用方负责 toast/错误文案。
- 已内置 Clipboard API 失败时的 selection fallback（尽量保留用户选区）。
- SOP 侧兼容 re-export：`src/modules/sops/utils/clipboard.ts` → 新代码仍建议直接 import common。

禁止：在 feature 目录再实现 `writeTextToClipboard` / `writeClipboardText` / 直接 `navigator.clipboard.readText`。

相关测试：`tests/unit/clipboard.test.ts`

---

## 3.1 文件下载 / CSV

**唯一实现**：

- `src/common/utils/download.ts` — `downloadBlob` / `downloadText` / `downloadJson` / `downloadCsv`
- `src/common/utils/csv.ts` — `sanitizeCsvCell` / `escapeCsvCell` / `formatCsvRows`

规则：

- 业务侧不要再写 `URL.createObjectURL` + `<a download>` 样板。
- 默认 CSV 需公式注入防护；**故意导出 Excel 公式**（如 NPI）时用 `{ allowFormula: true }`。
- 日志等无需 BOM 的导出：`downloadCsv(name, content, { bom: false })`。

相关测试：`tests/unit/csv.test.ts`、`tests/unit/download.test.ts`

---

## 3.2 工具 LLM 配置解析

**唯一实现**：`src/services/llmToolBridge.ts`

- `resolveToolLlmConfig(targetId)` — 含 API Key，用于真实调用
- `resolveToolLlmPublicConfig(targetId)` — 无 Key，用于缓存键/展示

业务侧保留 prompt / schema；不要再复制「读 active provider → getLLMConfigWithKey → applyToolTargetModel → 校验」样板。

配置失败统一使用 `ERR_LLM_*`（见 [工具 LLM 错误码速查](./troubleshooting/LLM_ERROR_CODES.md)）；勿再引入 `AI_ANALYSIS_001`～`003`。

用户可见失败统一：

```ts
import { showLlmFailureToast } from "@/common/errors/llmFailureUx";

try {
  // resolveToolLlmConfig + callLLM ...
} catch (error) {
  showLlmFailureToast(error, { titlePrefix: "分析失败: " });
}
```

已知 `ERR_LLM_*` / `API_*` / 超时 / 存储满会带 **打开设置** 深链；未知错误才使用 `titlePrefix`。场景对照见 [降级矩阵](./troubleshooting/DEGRADATION_MATRIX.md)。

### 3.2.1 LLM 请求缓存 / in-flight

**唯一实现**：`src/services/llmRequestCache.ts`

- `buildLlmRequestCacheKey`
- `getTimedLocalCacheValue` / `setTimedLocalCacheValue`
- `runWithInFlightDedup`

业务侧只决定：namespace/version、是否启用缓存、TTL、payload 字段（如 `response` 或 `decisions`）。

---

## 3.3 一次性 Handoff 队列

**唯一实现**：`src/common/utils/oneShotHandoff.ts` 的 `createOneShotHandoffQueue`

已用：`skillDeepChatHandoff`、`listingWorkflowHandoff`。新交接只保留 payload 构造 + 队列 API。

---

## 4. LLM 响应 JSON 解析

**唯一实现**：`src/common/utils/parseLlmJson.ts`

| 函数                                   | 用途                          |
| -------------------------------------- | ----------------------------- |
| `parseLlmJson(text)`                   | 返回 `{ value, wasRepaired }` |
| `parseLlmJsonObject(text)`             | 必须是 object，否则 throw     |
| `stripCodeFence` / `extractJsonObject` | 需要细粒度控制时使用          |

```ts
import { parseLlmJson, parseLlmJsonObject } from "@/common/utils/parseLlmJson";

// 宽松：允许非 object
const { value, wasRepaired } = parseLlmJson(llmText);

// 严格：必须是 JSON 对象
const data = parseLlmJsonObject(llmText);

// 业务 schema 仍留在业务层（zod 等）
```

已接入示例：

- `master_analysis/services/analysisService.ts`（经 `robustParseJSON` 包装）
- `ai_analysis/services/analysisResultParser.ts`
- `ppc_search_terms/agents/agentResponseJson.ts`（薄封装 `parseJsonObject`）

规则：

- 业务侧可以保留 **schema 校验 / 领域映射**。
- 业务侧不要再 import `jsonrepair` 做解析。
- Prompt 注入清洗继续用 `@/common/utils/promptSanitizer`。

相关测试：`tests/unit/parseLlmJson.test.ts`

---

## 5. Overview 筛选 / 滚动

**唯一实现**：`src/common/utils/overviewInteractions.ts`

```ts
import {
  bindCategoryFilterButtons,
  filterSectionsByCategory,
  scrollToModuleSection,
} from "@/common/utils/overviewInteractions";

// 绑定分类按钮（互斥 active + 按 data-category 显隐 section）
const dispose = bindCategoryFilterButtons(container);
this.addDisposable(dispose); // BaseModule / SOP context 内

// 或手动筛选
filterSectionsByCategory(container, "growth");

// 滚动到区块并高亮
export function scrollToModule(categoryId: string): void {
  scrollToModuleSection(categoryId, {
    idPrefix: "sop-module-", // amz: hub-module- / more: more-module-
    highlightClass: "sop-module-highlight",
  });
}
```

DOM 约定：

- 按钮：`.category-filter-btn` + `data-category`
- 区块：`section[data-category]`
- 滚动目标：`#${idPrefix}${categoryId}`

相关测试：`tests/unit/overviewInteractions.test.ts`

---

## 6. 站点码 / 域名 / 中文名

**唯一数据源**：`src/common/constants/constants.ts` 的 `SITE_CONFIGS`

派生导出：

- `SITE_NAME_MAP`（含 `UK`/`GB` 别名）
- `SITE_DOMAIN_MAP`（含 `UK`/`GB` 别名）
- `languageFlagMap`

```ts
import { SITE_DOMAIN_MAP, SITE_NAME_MAP } from "@/common/constants/constants";

export function getSiteName(site: string): string {
  return SITE_NAME_MAP[site] || site;
}

export function getSiteDomain(site: string): string {
  return SITE_DOMAIN_MAP[site] || "amazon.com";
}
```

已有展示封装可复用：

- scraper：`src/modules/app_center/views/master_analysis/scraper/utils/formatters.ts` 的 `getSiteName` / `getSiteDomain` / `getFlag`

新增站点：只改 `SITE_CONFIGS`，不要在业务文件加第三张表。

---

## 7. 确认弹窗 / 安全渲染（相关既有轮子）

| 能力        | 路径                                                      | 说明                                      |
| ----------- | --------------------------------------------------------- | ----------------------------------------- |
| 确认弹窗    | `@/components/modal/confirmModal` 的 `confirmWithModal`   | 见 `docs/MODAL_DEVELOPMENT_GUIDELINES.md` |
| 安全 HTML   | `@/common/utils/security` 的 `setSafeHtml` / `escapeHtml` | 模板挂载必用                              |
| 模板加载    | `SafeTemplateLoader`                                      | 禁止 `?raw` 直灌未审计用户内容            |
| Prompt 清洗 | `@/common/utils/promptSanitizer`                          | 拼 LLM prompt 前必用                      |
| Toast       | `@/common/ui/notifications` 的 `showToast`                | 统一反馈                                  |

不要：

- 从 feature 目录 re-export 一层 `confirmModal.ts` 再造入口（历史兼容可留，新代码直连 common）。

---

## 8. 新增页面检查清单

1. **选壳**：静态 / 场景 / SOP / BaseModule（第 2 节）
2. **manifest + loaders**：`module.manifest.ts`；loaders 保持 `import.meta.glob('./views/**/index.ts')`
3. **安全**：`SafeTemplateLoader` + `setSafeHtml`；无直接 `innerHTML =`
4. **复制 / 粘贴**：只用 `copyTextToClipboard` / `readTextFromClipboard`
5. **AI**：配置用 `resolveToolLlmConfig`；解析用 `parseLlmJson*`；输入用 `sanitizePromptInput*`
   5b. **导出**：只用 `download*` + `formatCsvRows`
6. **站点**：只用 `SITE_*` / scraper formatters
7. **Overview**：只用 `overviewInteractions`
8. **验证**：
   - `npm run page:architecture:audit`
   - `npm run type-check`
   - `npm run lint`
   - 相关 unit test
   - `npm run build`（含 prebuild 门禁）

---

## 9. 常见反模式 → 正确做法

| 反模式                                     | 正确做法                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| 页面内复制一套 `writeText` + `execCommand` | `copyTextToClipboard`                                                        |
| 每个 AI 工具自写 fence + jsonrepair        | `parseLlmJson` / `parseLlmJsonObject`                                        |
| overview 三份 filter/scroll                | `bindCategoryFilterButtons` / `scrollToModuleSection`                        |
| 静态页手写 BaseModule 样板 30 行           | `createStaticTemplateModule`                                                 |
| 场景页 5 份几乎相同 index                  | `createBusinessScenarioModule`                                               |
| 各模块硬编码 amazon.de 映射                | `SITE_DOMAIN_MAP` / `SITE_NAME_MAP`                                          |
| 为骗审计写“空壳工厂”不挂 BaseModule        | 工厂内部必须真正 `extends BaseModule`（`createStaticTemplateModule` 已满足） |

---

## 10. 相关文件索引

```
src/common/utils/clipboard.ts
src/common/utils/parseLlmJson.ts
src/common/utils/overviewInteractions.ts
src/common/utils/createStaticTemplateModule.ts
src/common/utils/promptSanitizer.ts
src/common/constants/constants.ts
src/common/BaseModule.ts
src/modules/sops/utils/sopTemplateModule.ts
src/modules/sops/utils/ownerField.ts
src/modules/sops/utils/templateCopyAction.ts
src/modules/more/views/business_scenarios/createBusinessScenarioModule.ts
src/modules/more/views/business_scenarios/casePageRenderer.ts
src/components/modal/confirmModal.ts
scripts/quality/audit-page-architecture.ts
tests/unit/clipboard.test.ts
tests/unit/parseLlmJson.test.ts
tests/unit/overviewInteractions.test.ts
tests/unit/page-architecture-convergence.test.ts
```

配套文档：

- [模态框开发规范](./MODAL_DEVELOPMENT_GUIDELINES.md)
- [页面访问动画规范](./PAGE_ENTRY_ANIMATION_GUIDELINES.md)
- [CI 质量门禁](./CI-QUALITY-GATES.md)
- [项目结构](./PROJECT_STRUCTURE.md)
