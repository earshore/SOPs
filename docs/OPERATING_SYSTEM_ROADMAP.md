# 运营作业系统落地计划

本文档用于约束 SOPs 下一阶段产品收敛：不追求外部商用平台能力，只服务小团队内部提效、带新人和复盘沉淀。

## 目标

把项目从“工具和知识页面集合”升级为内部运营作业系统：

- 新人能独立完成任务：按页面给出的输入、步骤、判断阈值和交付标准完成作业。
- 老手能更快生成动作：用工具把报表、竞品素材和客户反馈转成可执行清单。
- 团队能沉淀复盘：每次作业留下结论、证据、负责人和下次动作，而不是只读一篇 SOP。

## 基本假设

- 使用者是内部亚马逊运营、负责人和新人，不考虑多租户、计费、外部权限、公开 API 或商业化 SLA。
- 当前静态前端 + 浏览器本地存储 + new-api 模型网关的部署形态先保持不变。
- 短期不引入复杂后端。只有当“作业记录共享、多人协作、统一权限”成为真实阻塞时，再评估最小后端。
- AI 只负责辅助判断和生成草稿；广告调价、否词、合规处置、客服公开回复等高风险动作仍由人工确认。

## 决策逻辑

所有新功能和改造都必须回答四个问题：

1. 这个页面帮助新人完成哪一个具体任务？
2. 这个工具帮老手节省哪一步重复判断？
3. 这个流程最终留下什么复盘资产？
4. 如果只做最小版本，能否先用本地数据和导出文件完成闭环？

答不上来，就不进入近期计划。

## 作业闭环标准

一条合格的内部作业流必须包含：

- 输入：用户需要准备的 ASIN、SKU、报表、竞品链接、评论或店铺信息。
- SOP：明确步骤、红线、阈值、人工确认点和常见误区。
- 工具：能解析输入、生成判断、导出动作或复制摘要。
- 输出：动作清单、复盘表、周报摘要、邮件草稿、Listing Prompt 或风险登记。
- 复核：标出哪些结论必须人工确认，哪些动作禁止自动执行。
- 沉淀：记录作业版本、负责人、关键证据、结论和下次动作。

只提供说明但没有输出物的页面，归为知识页；只提供实验能力但没有固定输入输出的页面，归为探索页。

## 三条优先主线

### 1. 新品作业流

目标：让新人按流程完成新品从建档到 30/90 天复盘。

最小闭环：

- 输入：SKU、ASIN、站点、配送费、成本、售价、库存、上架时间、广告基础数据。
- SOP：NPI 阶段判断、Listing 上架检查、高危词检查、促销提报边界。
- 工具：清仓线/动销价/建议价计算，阶段状态判断，周复盘模板导出。
- 输出：新品状态、风险提示、下一步动作、清仓/继续/观察结论。

优先页面：

- `src/modules/sops/views/growth/npi_tracker/`
- `src/modules/sops/views/growth/listing_seo/`
- `src/modules/sops/views/growth/restricted_words/`
- `src/modules/sops/views/growth/promotion_submission/`

### 2. 广告作业流

目标：让老手从广告报表快速得到可复核的 PPC 动作。

最小闭环：

- 输入：Amazon Ads 或 ERP 搜索词/活动报表。
- SOP：广告调价、否词、加词、预算调整和人工复盘规则。
- 工具：PPC 搜索词分析器，本地规则优先，模型只复核低置信候选。
- 输出：否词、加词、降竞价、加预算、结构复盘、周报摘要。

优先页面：

- `src/modules/app_center/views/ppc_search_terms/`
- `src/modules/sops/views/growth/ppc_advertising/`
- `src/modules/more/views/business_scenarios/ad_acos_diagnosis/`

### 3. 竞品与 Listing 作业流

目标：把竞品素材、AI 分析和 Listing 改稿串成可复用过程。

最小闭环：

- 输入：ASIN、竞品数据、Listing 原文、目标站点和产品上下文。
- SOP：竞品监控、Listing SEO、合规复核和 Prompt 使用边界。
- 工具：数据采集、AI 分析、Prompt 生成、关键词覆盖检查。
- 输出：竞品洞察、Listing 改写 Prompt、关键词补强清单、合规检查项。

优先页面：

- `src/modules/app_center/views/master_analysis/scraper/`
- `src/modules/app_center/views/master_analysis/ai_analysis/`
- `src/modules/app_center/views/master_analysis/promptlab/`
- `src/modules/app_center/views/keyword_hunter/`
- `src/modules/sops/views/growth/competitor_monitoring/`

## 阶段计划

### Phase 0：收敛地图

周期：1 周。

交付：

- 明确每个模块属于主线、知识、探索或归档。
- README 和文档索引指向本计划。
- 新增页面或改页面前，先声明它服务哪条作业流。

验收：

- 任一开发者能从本文档判断一个需求是否应该做。
- 不再因为“看起来有用”新增孤立页面。

### Phase 1：作业流入口

周期：1-2 周。

交付：

- 在现有总览页强化三条作业流入口。
- 每条主线列出输入、步骤、工具、输出和复核点。
- 新人入口从“功能卡片”调整为“任务路径”。

验收：

- 新人不需要理解完整模块结构，也能从一个任务开始执行。
- 老手能直接进入 PPC、NPI 或竞品分析的核心工具。

### Phase 2：两个闭环样板

周期：2-4 周。

交付：

- PPC 作业流打穿：导入报表 -> 生成动作 -> 导出动作 -> 复制周报摘要 -> 标记人工复核项。
- NPI 作业流打穿：建档 -> 阶段判断 -> 财务红线 -> 周复盘 -> 清仓/继续/观察结论。

验收：

- 每条样板流都有可保存或可导出的输出物。
- 每条样板流都有对应单元测试覆盖核心业务规则。
- 高风险动作明确标注“人工执行”。

### Phase 3：轻量作业记录

周期：4-8 周。

交付：

- 引入最小业务对象：`WorkItem`、`ASIN/SKU`、`Report`、`ActionItem`、`ReviewNote`。
- 先使用浏览器本地存储和导入导出，不上复杂后端。
- 支持按 ASIN/SKU 查看最近作业、动作和复盘记录。

验收：

- 团队能把一次分析变成可追溯的复盘资产。
- 清仓、广告复盘、Listing 改稿能看到历史依据。

### 最小业务对象草案

以下对象先作为页面输出、导出模板和测试命名的业务语言；没有真实跨页面复用前，不实现复杂持久化层。

- `WorkItem`：`id`、`type`、`title`、`owner`、`status`、`sourceRoute`、`asinOrSku`、`createdAt`、`updatedAt`、`outputSummary`。
- `ASIN/SKU`：`asin`、`sku`、`site`、`title`、`owner`、`lifecycleStatus`、`lastWorkItemId`、`updatedAt`。
- `Report`：`id`、`workItemId`、`reportType`、`source`、`fileName`、`periodStart`、`periodEnd`、`importedAt`、`summary`。
- `ActionItem`：`id`、`workItemId`、`actionType`、`target`、`reason`、`riskLevel`、`requiresHumanConfirmation`、`status`、`owner`。
- `ReviewNote`：`id`、`workItemId`、`decision`、`evidence`、`nextStep`、`reviewedBy`、`reviewedAt`。

## 不做事项

近期明确不做：

- 不做对外 SaaS、租户隔离、计费、公开 API。
- 不做复杂权限系统；内部使用先依赖部署边界和人工管理。
- 不让 AI 自动执行高风险运营动作。
- 不为了概念完整新增 Agent、MCP、工作流页面。
- 不在没有作业输出物的情况下新增大段知识页。
- 不一次性重构全站架构或引入后端。

## 新需求准入规则

一个新需求进入实现前，必须满足至少一项：

- 能减少新人完成某项任务的阻塞。
- 能减少老手重复判断或整理报表的时间。
- 能把一次运营判断沉淀成后续可复用资产。

同时必须给出：

- 目标用户：新人、老手、负责人或团队复盘。
- 所属主线：新品、广告、竞品与 Listing，或明确归为知识/探索。
- 输入和输出：不能只有“展示内容”。
- 人工确认点：尤其是广告、合规、客服和账号安全动作。
- 最小验证方式：单元测试、导入样例、导出文件、页面冒烟或人工检查清单。

## 衡量指标

内部项目不以注册、付费或外部增长衡量。建议跟踪：

- 新人完成一条任务路径所需时间。
- PPC/NPI/Listing/促销/高危词/库存/采购QC/FBA发货/竞品/客服邮件/QA维护/差评/绩效通知/产品合规/GPSR/品牌侵权/账号安全/权限管理样板流每周使用次数。
- 动作清单或复盘模板导出次数。
- SOP 页面过期数量和按期复核比例。
- 高风险动作是否都有人工确认标记。
- 清仓、促销、高危词、库存、采购QC、FBA发货、广告、客服邮件、QA维护、差评、合规、GPSR、品牌侵权、权限管理等复盘记录是否能被下一次任务复用。

当前最小落地方式：

- 先用浏览器本地计数记录核心输出动作，不做后端统计、不追踪个人。
- 已记录事件：`ppc.action_export`、`ppc.review_template_copy`、`npi.csv_export`、`npi.review_template_copy`、`inventory.replenishment_template_copy`、`procurement.qc_template_copy`、`fba.shipping_template_copy`、`listing.review_template_copy`、`promotion.submission_template_copy`、`restricted_words.review_template_copy`、`competitor.review_template_copy`、`email_templates.reply_template_copy`、`qa.maintenance_template_copy`、`negative_review.review_template_copy`、`performance_notification.report_template_copy`、`product_compliance.review_template_copy`、`gpsr.compliance_template_copy`、`brand_infringement.review_template_copy`、`account_security.review_template_copy`、`permission.management_template_copy`。
- SOP 总览页只读展示本机试运行计数，用于判断样板流是否真的被内部使用。
- 指标只用于判断样板流是否真的被使用；当团队需要多人共享复盘数据时，再评估是否引入最小后端。

## 第一批任务清单

- [x] 在总览页突出三条主线：新品作业流、广告作业流、竞品与 Listing 作业流。
- [x] 给 SOP 页面补齐 owner、更新时间、适用站点、输入、输出、人工确认点。
  - [x] 三条主线优先页面已补齐：NPI Tracker、Listing SEO、高危词检查、促销提报、PPC 广告、竞品监控。
  - [x] 高频/高风险页面已补齐：库存补货、产品合规、账号安全、绩效通知、差评处理。
  - [x] 其他后台、安全、客服作业页已补齐；SOP 总览页不按单项作业页处理。
  - [x] 已增加测试护栏，新增真实 SOP 作业页缺少作业元信息或强制人工确认边界时会失败。
- [x] 将 PPC 搜索词分析器输出统一标记为“建议动作”，并突出人工执行边界。
  - [x] PPC 动作清单导出补齐 `ActionItem` 字段：风险等级、人工确认、状态、Owner。
  - [x] PPC 动作清单和周复盘模板支持本地作业负责人，确保导出资产有明确归属。
  - [x] PPC 周报摘要补充人工复核提示，明确建议动作不自动执行。
  - [x] PPC 复制输出升级为固定周复盘模板，包含复盘结论、关键证据、建议动作、下周跟进和复盘记录。
- [x] 将 NPI Tracker 的复盘模板变成可导出或可复制的固定输出。
  - [x] NPI 复盘模板支持本地复盘负责人，确保人工确认点和下次复盘有明确归属。
- [x] 将库存补货周报补成可复制的复盘归档。
  - [x] 库存模板支持本地负责人，并明确补货下单、物流方式、暂停补货和清仓动作必须人工确认。
- [x] 将采购/QC 放行补成可复制的复盘归档。
  - [x] 采购/QC 模板支持本地负责人，并明确首单下单、QC 放行、让步接收、返工/拒收和供应商切换必须人工确认。
- [x] 将 FBA 发货放行补成可复制的复盘归档。
  - [x] FBA 发货模板支持本地负责人，并明确超重、错标、货件拆分、异常费用和最终发货放行必须人工确认。
- [x] 将 Listing SEO 的提交模板补成可复制的改稿复盘归档。
  - [x] Listing 复盘模板支持本地作业负责人，并明确 AI 草稿、合规复核和人工上线边界。
- [x] 将促销活动提报补成可复制的提报/复盘归档。
  - [x] 促销模板支持本地负责人，并明确 Omnibus 价格、利润红线、库存、广告预算和最终提报/取消必须人工确认。
- [x] 将高危词检查补成可复制的复盘归档。
  - [x] 高危词模板支持本地负责人，并明确 4/5 级风险词、证书依据、本地语言替换和最终上架提交必须人工确认。
- [x] 将竞品监控周报补成可复制的复盘归档。
  - [x] 竞品复盘模板支持本地作业负责人，并明确调价、广告、Listing 跟进动作必须人工确认。
- [x] 将差评 VOC 登记补成可复制的复盘归档。
  - [x] 差评复盘模板支持本地负责人，并明确公开回复、Report、补偿和质量整改必须人工确认。
- [x] 将客服邮件处理补成可复制的回复/复盘归档。
  - [x] 邮件模板支持本地负责人，并明确 A-to-Z、退款补偿、Review 红线、合规敏感回复和公开发送必须人工确认。
- [x] 将 QA 问答维护补成可复制的巡检/复盘归档。
  - [x] QA 模板支持本地负责人，并明确公开回复、医疗/安全声明、保修承诺、竞品对比和前台发布必须人工确认。
- [x] 将绩效通知上报补成可复制的复盘归档。
  - [x] 绩效通知模板支持本地负责人，并明确任何回复、申诉、资料提交和账号处置必须主管确认。
- [x] 将产品合规准入补成可复制的复盘归档。
  - [x] 产品合规模板支持本地负责人，并明确敏感品准入、证书有效性、上架提交和整改完成必须人工确认。
- [x] 将 GPSR 合规交付件补成可复制的复盘归档。
  - [x] GPSR 模板支持本地负责人，并明确欧代/厂家信息、安全文件、后台上传、多站点语言和整改完成必须人工确认。
- [x] 将品牌/侵权审核补成可复制的复盘归档。
  - [x] 品牌侵权模板支持本地负责人，并明确疑似侵权词、图片版权、授权文件和最终上架必须人工确认。
- [x] 将账号登录异常登记补成可复制的复盘归档。
  - [x] 账号安全模板支持本地负责人，并明确登录、凭证变更、环境调整和账号处置必须负责人或主管人工确认。
- [x] 将后台权限管理补成可复制的变更/回收归档。
  - [x] 权限模板支持本地负责人，并明确新增用户、权限扩大、Payments/Settings、离职回收和权限登记必须人工确认。
- [x] 在 SOP 总览展示本地试运行计数，只看核心输出动作，不追踪个人、不做后端。
  - [x] 已增加测试护栏，新增核心输出指标时必须在 SOP 总览展示计数和最后使用时间。
- [x] 把 Agent Center 中未落地的 Agent 标为设计草案，优先只保留 PPC 和日报两个样板。
  - [x] 已增加测试护栏，Agent Center 只能有 PPC 和日报两个落地样板，其余 Agent 必须保持设计草案。
- [x] 建立 `WorkItem` 最小类型草案，但在没有真实使用前不实现复杂持久化。
