# 应用中心（App Center）工作台改造路线审查与落地方案

> 视角：内部亚马逊欧洲站运营作业系统 · 产品 / 工程联合审查
> 审查对象：`src/modules/app_center/`、`BaseModule`、`ModuleLoader`、`module.manifest.ts`、App Store、现有历史 / 快照服务
> 目标：把 App Center 从「应用入口 + 局部工具链」稳步升级为「可续做、可复核、可沉淀的运营工作台」

---

## 一、审查结论

App Center 不是从零开始的「工具启动器」。它已经有一个局部跑通的工作链路：`scraper -> ai_analysis -> promptlab` 之间通过 `HistoryService`、报告指纹、Prompt 结果和产品 DNA 做了部分产物绑定；Keyword Hunter 也有独立快照；PPC 搜索词分析器已有动作清单和导出能力。

真正缺的不是再造一个庞大的 WorkflowEngine，而是三件更小、更可靠的事：

1. **统一作业上下文**：明确当前站点、ASIN / SKU、语言、来源路由、当前作业 ID。
2. **统一产物外壳**：把现有历史、快照、PPC 动作和 Prompt 输出纳入同一种 `WorkItem / Artifact` 业务语言。
3. **把总览页从静态入口升级为任务路径入口**：先展示步骤、输入、输出、复核点，再逐步补自动 handoff。

因此，本路线应从「重建工作流平台」纠偏为「复用现有链路，补一层薄工作台协议」。

---

## 二、前提与边界

这些前提来自现有 `OPERATING_SYSTEM_ROADMAP.md`，应作为 App Center 改造的硬边界：

- **内部工具优先**：服务小团队运营、新人训练和复盘沉淀，不做对外 SaaS、计费、多租户、公开 API。
- **短期不引入复杂后端**：继续以静态前端、浏览器本地存储、IndexedDB / localStorage 和导入导出完成闭环。
- **AI 不自动执行高风险动作**：广告调价、否词、Listing 上线、合规处置都必须保留人工确认。
- **不推翻现有架构**：保留 `ModuleLoader`、`BaseModule`、manifest 路由、设计 token、现有服务和测试门禁。
- **先打穿 App Center 自身链路**：新品 NPI 主线在 SOPS 模块，App Center MVP 更适合选「竞品与 Listing」作业流。

---

## 三、现状判断

### 已经可靠的底座

| 能力                 | 现状                                                                        | 结论                                             |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| 模块加载             | `module.manifest.ts` + `import.meta.glob` + `buildModuleMapFromLoaderPaths` | 路由和懒加载底座可继续复用                       |
| 生命周期             | `BaseModule` 支持 `mount/unmount`、清理监听器、DI 获取服务、错误边界        | 不需要重写模块生命周期                           |
| 导航                 | `data-action="switch-tab"` 最终走 `navigateToRouteId`                       | 任务路径可先复用现有导航动作                     |
| Master Analysis 产物 | `HistoryService` 保存采集数据、分析状态、Prompt 结果、产品 DNA              | 已有局部 artifact 雏形                           |
| Keyword Hunter 产物  | `KeywordHunterSnapshotService` 保存关键词快照和 diff                        | 已有独立快照，不应另起炉灶                       |
| 合规知识             | SOPS 已有产品合规、GPSR、品牌侵权、高危词等页面                             | 问题是 App Center 缺可执行闸门，而不是全仓无合规 |

### 主要缺口

| #   | 缺口                               | 证据                                                                                                                      | 影响                                                        |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | 缺少统一作业上下文                 | `appStore` 只有模块局部状态，`selectedSite/currentHistoryId/currentSnapshotId` 分散；没有 `workItemId / workspaceContext` | 工具知道自己的状态，但不知道「当前这次作业」                |
| 2   | 总览页仍是静态目录                 | `overview/template.html` 手写卡片、列表、分类计数和任务路径按钮                                                           | 新增路由容易漂移；任务路径只是跳转，不是作业入口            |
| 3   | manifest 信息不足以直接生成卡片    | manifest 只有 route 的 `label/icon/category/loaderPath`，缺分组描述、主入口、业务说明、状态标签                           | 不能简单说「扫描 manifest 渲染 overview」，需要补目录元数据 |
| 4   | 持久化是工具内聚合，不是项目级聚合 | `HistoryService`、Keyword Hunter 快照、PPC 输出各自成体系                                                                 | 复盘时缺「一次作业包含哪些产物」                            |
| 5   | 合规没有变成流程闸门               | App Center 分析字段可出现合规风险，SOPS 有合规页面，但 Prompt / 导出前没有统一 checklist                                  | 欧洲站高风险动作缺少强制复核提醒                            |
| 6   | 活动流 / 最近继续做没有统一来源    | 现有历史散落在各工具服务里                                                                                                | 用户不能从一个入口回到「上次做到哪一步」                    |

---

## 四、需要纠正的不可靠方向

| 原方向                        | 风险                                                  | 纠偏后的方向                                                     |
| ----------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| 一上来做 `WorkflowEngine`     | 容易抽象过重，和现有 `HistoryService` / 快照服务重复  | 先做 `WorkflowDefinition` 静态定义 + 当前步骤状态 + 手动下一步   |
| 新建独立 `ArtifactStore`      | 会绕开已有历史 / 快照，产生双写和迁移风险             | 先做 `ArtifactEnvelope` 适配层，底层继续调用现有服务             |
| 「全仓无合规」                | 与 SOPS 合规页面、App Center 报告字段不符             | 改为「App Center 缺关键节点合规闸门」                            |
| 直接用 manifest 生成 overview | manifest 缺业务描述和分组主入口                       | 新增轻量 `appCatalog`，其中 routeId 必须引用 manifest 已声明路由 |
| MVP 选新品流                  | 新品 NPI 主链路在 SOPS，App Center 内部改造收益不集中 | MVP 选「竞品与 Listing」：采集、分析、Prompt、关键词复核         |
| 立刻做账号 / 店铺 / 多人协作  | 当前无身份和后端，容易假权限、假协作                  | v1 只做本机上下文：marketplace、language、asinOrSku、workItemId  |
| 先做右侧活动流                | 没有统一 artifact 前只能拼 UI                         | 先统一事件和产物，再做最近面板                                   |

---

## 五、目标架构：薄工作台协议

```
┌──────────────────────────────────────────────────────────────┐
│ App Catalog                                                   │
│ - 分组、主入口、描述、状态标签                                 │
│ - routeId 必须来自 appCenterManifest                           │
├──────────────────────────────────────────────────────────────┤
│ Workspace Context v1                                          │
│ - workItemId / marketplace / language / asinOrSku / sourceRoute │
│ - 变更通过 EventBus 通知，状态保存在受控服务中                  │
├──────────────────────────────────────────────────────────────┤
│ Artifact Envelope                                              │
│ - type / sourceRoute / workItemId / title / summary / payloadRef │
│ - 适配 HistoryService、KeywordHunterSnapshotService、PPC 导出    │
├──────────────────────────────────────────────────────────────┤
│ Workflow Definition                                            │
│ - 输入、步骤、产物、复核点、下一步 routeId                       │
│ - 先支持静态定义和手动推进，再补自动 handoff                     │
├──────────────────────────────────────────────────────────────┤
│ Compliance Gate                                                │
│ - Prompt / Listing / PPC 导出前的人工复核 checklist              │
│ - 链接到 SOPS 合规、高危词、品牌侵权、GPSR 页面                   │
└──────────────────────────────────────────────────────────────┘
```

关键原则：

- `manifest` 仍是**路由事实来源**。
- `appCatalog` 是**总览展示和分组事实来源**。
- `WorkflowDefinition` 是**任务路径事实来源**。
- `HistoryService` / `KeywordHunterSnapshotService` 是**现阶段存储事实来源**。
- 新协议只做薄层适配，不迁移历史数据，不重写子工具。

---

## 六、落地方案

### Phase 1：总览页去硬编码（1 周）

目标：先解决目录漂移和任务路径表达不清的问题。

改动范围：

- 新增 `src/modules/app_center/appCatalog.ts`：
  - 定义应用分组：Master Analysis、Keyword Hunter、PPC Tools、Playground。
  - 每组声明 `primaryRouteId`、`routeIds`、描述、状态标签、搜索词。
  - 增加校验：所有 `routeIds` 必须存在于 `appCenterManifest.routes`。
- 调整 `overview/index.ts`：
  - 从 `appCatalog` 生成分类按钮、卡片、列表计数。
  - 保留现有筛选、搜索、grid/list 交互。
- 简化 `overview/template.html`：
  - 保留外壳、容器和空状态。
  - 删除手写重复卡片和硬编码计数。

验收：

- 新增或移除 App Center route 时，目录校验能提示同步 `appCatalog`。
- overview 中显示数量与 `appCatalog` 一致。
- `switch-tab` 导航行为不变。
- 单元测试覆盖 catalog 校验和 overview 渲染核心 DOM。

### Phase 2：Workspace Context v1（1-2 周）

目标：建立「当前作业」的最小上下文，而不是完整账号体系。

最小字段：

```ts
interface WorkspaceContext {
  workItemId: string | null;
  marketplace: 'DE' | 'FR' | 'IT' | 'ES' | 'NL' | 'SE' | 'PL' | 'BE' | 'IE' | 'UK' | 'US' | '';
  language: string;
  asinOrSku: string;
  sourceRoute: string;
  updatedAt: string;
}
```

改动范围：

- 新增轻量 context service，优先放在 App Center 内部，不急着注册全局 DI。
- 从 Scraper 的 `selectedSite`、HistoryItem 的 `site/asins` 初始化上下文。
- Keyword Hunter / PromptLab 先只读上下文展示，不强行重写表单逻辑。
- 通过 EventBus 发出 `app-center:workspace-context-changed`。

验收：

- 在 Scraper 选择站点 / 保存历史后，context 可得到站点和 ASIN。
- 切到 AI Analysis / PromptLab 时，能读取同一个 context。
- 刷新后只恢复必要上下文字段，不恢复进行中的请求状态。

### Phase 3：竞品与 Listing 样板流（2-3 周）

目标：选最贴近现有代码的 MVP，把已有局部链路包装成一条可见作业流。

样板流：

1. 数据采集：输入 ASIN 和 marketplace，保存 `HistoryItem`。
2. AI 分析：读取当前历史，生成并绑定 `analysisStatus`。
3. Prompt 生成：读取报告和产品 DNA，保存 `promptResults`。
4. 关键词复核：从 Prompt / 报告手动带入关键词和 Listing 文案，保存 Keyword Hunter 快照。
5. 合规复核：导出 / 复制前展示合规 checklist 和 SOPS 链接。

实现策略：

- 不做通用引擎，只新增 `workflowDefinitions.ts`。
- overview 的「竞品与 Listing 作业流」展示步骤、当前可进入步骤和下一步按钮。
- 第一次 handoff 只做一个窄场景：PromptLab 输出 Listing Prompt 后，提供「进入 Keyword Hunter 复核」并带入可解析文本。

验收：

- 用户能从 overview 进入竞品与 Listing 作业流，并看到 5 个步骤。
- `scraper -> ai_analysis -> promptlab` 沿用现有历史绑定，不产生双写。
- PromptLab 到 Keyword Hunter 至少支持一次明确 handoff。
- Keyword Hunter 快照能记录来源为当前作业。

### Phase 4：Artifact Envelope 适配层（2-4 周）

目标：把现有产物纳入统一业务语言，先不迁移底层存储。

最小对象：

```ts
interface WorkItem {
  id: string;
  type: 'competitor_listing' | 'ppc_review' | 'npi_reference';
  title: string;
  status: 'draft' | 'in_progress' | 'review_required' | 'done';
  marketplace: string;
  asinOrSku: string;
  sourceRoute: string;
  createdAt: string;
  updatedAt: string;
}

interface ArtifactEnvelope {
  id: string;
  workItemId: string;
  type:
    | 'scrape_history'
    | 'analysis_report'
    | 'listing_prompt'
    | 'keyword_snapshot'
    | 'ppc_action_list'
    | 'compliance_check';
  sourceRoute: string;
  title: string;
  summary: string;
  payloadRef: string;
  createdAt: string;
}
```

实现策略：

- `payloadRef` 指向现有服务里的 ID，例如 `HistoryItem.id`、`KeywordHunterSnapshot.id`。
- 只新增 envelope 索引，不复制大 payload。
- 先支持本地读取最近 10 个 artifact，给后续最近面板使用。

验收：

- 一次竞品与 Listing 作业能列出采集历史、分析报告、Prompt、关键词快照。
- 删除底层快照 / 历史时 envelope 能容错显示「产物已不存在」。
- 不破坏现有 HistoryService 和 Keyword Hunter 快照读写测试。

### Phase 5：PPC 与最近面板（后续）

目标：在薄协议稳定后再扩大到 PPC 和活动流。

范围：

- PPC 搜索词分析器导出的动作清单登记为 `ppc_action_list` artifact。
- overview 增加「最近继续」面板，只展示 artifact 和下一步入口。
- NPI 仍以 SOPS 主链路为主，App Center 只作为引用入口或辅助工具，不把 NPI 强行塞进 App Center MVP。

验收：

- PPC 动作清单能带 `workItemId`、owner、人工确认标记。
- 最近面板能回到最近作业和最近产物。
- 不引入后端、不引入多人协作假象。

---

## 七、本周可执行任务

1. **新增 `appCatalog` 并让 overview 从 catalog 渲染**
   - 验证：catalog routeId 与 manifest 对齐；overview 数量和分组正确。

2. **把 overview 的「任务路径」改成真实路径说明**
   - 验证：每条路径包含输入、步骤、输出、复核点和起始 routeId，而不是只有跳转按钮。

3. **定义 `WorkspaceContext` 和事件名，但只接入 Scraper 读写**
   - 验证：保存采集历史后能得到 marketplace、ASIN、sourceRoute。

4. **补一份竞品与 Listing workflow definition**
   - 验证：步骤 routeId 都存在；每步有输入 / 输出 / 人工复核说明。

5. **把合规闸门先做成静态 checklist 数据**
   - 验证：Prompt / Listing 相关流程能引用高危词、品牌侵权、产品合规、GPSR 等 SOPS route。

---

## 八、测试与验证要求

每个阶段至少覆盖：

- `npm run type-check`
- 与改动相关的单元测试
- overview DOM 渲染测试
- 路由 ID 校验测试
- 若改 UI 样式，补 Chromium 视觉 / 冒烟验证

建议新增测试：

- `tests/unit/app-center-catalog.test.ts`
  - catalog 中所有 routeId 存在于 `appCenterManifest`。
  - 每个分组有唯一 `primaryRouteId`。
  - 分类数量与 route 分组一致。
- `tests/unit/app-center-workflow-definition.test.ts`
  - workflow step routeId 都可导航。
  - 每个 step 都声明输入、输出、复核点。
- `tests/unit/workspace-context.test.ts`
  - Scraper 保存历史后能生成 context。
  - context change 事件 payload 字段完整。

---

## 九、成功指标

短期指标不要伪装成平台级增长数据，只看内部作业闭环：

- 竞品与 Listing 样板流是否能从入口走到关键词快照。
- 单次作业是否至少沉淀 2 类产物：报告 / Prompt / 关键词快照 / 动作清单。
- 高风险输出是否都有人工确认提示。
- 新增 App Center route 是否不再需要手改多处 overview 卡片。
- 用户能否从最近产物回到下一步。

---

## 十、不要做清单

- 不重写 `ModuleLoader`、`BaseModule`、路由系统。
- 不为了概念完整新建大型 WorkflowEngine。
- 不把已有 `HistoryService` / Keyword Hunter 快照复制进新存储。
- 不在没有身份系统和后端前做多人协作、账号权限、审计日志承诺。
- 不让 AI 自动执行广告、Listing、合规动作。
- 不把 NPI 作为 App Center MVP 主线；NPI 主链路继续留在 SOPS。
- 不把合规写成泛泛提示；必须绑定具体高风险节点和人工确认。
