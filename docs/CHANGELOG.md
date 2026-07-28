# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

## [3.0.12-rc.2] - 2026-07-28

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.11`。
> 收口 `v3.0.12-rc.1` 之后的 **应用总览 · 最近作业** 作业链路真实指标、卡片视觉与 Appearance 色调对齐。
> 生产回滚目标为 `v3.0.11` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- 最近作业 **作业链路真实摘要**：按阶段展示 metrics（采集来源、分析维度/置信度/ASIN 数、Prompt 策略、文案 SEO 词与模型、关键词命中、评审得分与模型等），优先 artifact metadata，不再用静态 workflow 死文案。
- 数据采集 / AI 分析 / Listing 评审落库时写入更完整的 summary 与 model 等可索引元数据（新作业生效；旧 envelope 需重跑对应阶段）。

### Changed

- 作业卡片正文：主行突出阶段 facts，次行保留站点/ASIN 作业上下文；左侧类型图标放大。
- 作业链路配色改为跟随 Appearance `--color-primary*`（与系统设置色调一致），不再跟卡片类型色跑偏。
- 浅色模式：仅 **置顶** 卡片保留行背景；需复核等 attention 不再整行浅底。
- 快捷操作 tray：hover 延迟展开 + tooltip 同步延迟，避免误触闪现。
- 链路文案收敛：`DE · x个ASIN · JSON导入`、`x个ASIN · x个分析维度 · xx%置信度`、`待优化 · xx/100 · 模型名` 等。

### Fixed

- 最近作业 focus/遮罩与左侧伪竖线回归：点击快捷操作不再整卡 focus wash。
- 采集来源 JSON 导入 vs 采集 可在链路中区分（metadata `data_source`）。

## [3.0.12-rc.1] - 2026-07-28

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.11`。
> 收口 `v3.0.11` 之后的 **Deep Chat host vision 上传 UX**（默认关闭、产品开关）与 **系统设置导航定位遮罩** 打磨。
> 生产回滚目标为 `v3.0.11` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- Deep Chat **host vision composer**：图片入口由宿主绘制（非 vendor 默认壳），白名单格式（不含 SVG）、总容量上限、ghost 上传控件与 helper 限额说明；历史诚实展示张数、错误脱敏。
- 系统设置工具策略 **「启用 Vision」** 开关（`deepChat.enableVision`，默认 `false`）；产品侧 Alpha 徽章与搜索词（Alpha / 不稳定）。
- 系统设置左导航定位：将目标解析到 fold / L3 内容面，主题 soft 遮罩（`--settings-accent-soft`）短暂高亮，避免标题外框杂乱。

### Changed

- Vision UI 默认关闭；仅当设置开启且模型支持 vision 时显示上传入口。
- 左导航深链高亮改为单遮罩、可切换清除，跟随 Appearance 主色与深浅色 soft 阶。

### Fixed

- Prettier `endOfLine: auto` + 关键文件格式债，解除 `npm run build` / `format:check` 阻塞。
- 导航高亮 inset 阴影被子元素遮挡：改为 `::after` 叠层 veil。

## [3.0.11] - 2026-07-27

> 正式 GA。发布后 GitHub Latest 指向 `v3.0.11`；上一 GA 与生产回滚基线均为 `v3.0.10`。
> 生产目标为 `https://sops.hongecb.store`。
> 本版定稿 `v3.0.11-rc.1`…`rc.13` 的全部候选增量：系统设置 pref-list 收敛与层级 ≤L3、企业主题 v2 深色对比、Deep Chat 动态推理/vision 附件、四路径 LLM 传输对齐，以及上线前 build+smoke 门禁修复。

### Added

- 系统设置 Preference List 规范与统一视觉：`settings-pref-row` / fold / tool-page L3 壳层、搜索多命中与侧栏深链对齐。
- Deep Chat 按模型能力动态渲染推理 effort（含 low…max clamp）；vision 模型支持当轮图片附件（≤4 张 / 5MB，base64 不落盘）。
- AI 模型连接：厂商 API 类型（OpenAI / Anthropic / Gemini）驱动路径匹配；凭证/服务层级改为 L2 并列控制。
- 工具策略即时 switch 保存、应用策略预案分段控件、默认模型「跟随全局 / 覆盖」文案。

### Changed

- 设置信息架构压到最多 L3；应用中心工具页（Master Analysis / Playground / Keyword Hunter / PPC）与外观区视觉对齐。
- Token 上限收敛到「模型与能力」统一配置；运行策略预设更名为「应用策略预案」。
- 深色模式：mega menu / 卡片 hover / 侧栏 L2 active / scraper 与 ASIN 目标可读性全面补齐；KH「开始分析」填充与描边跟随 Appearance primary。
- 外观 color-mode 切换 snap 过渡，减弱文字滞后与卡顿；segmented 控件样式与 effort 档统一。

### Fixed

- content-surface 门禁：scraper 深色 utility 重写避免 `text-slate-*` 字面量抬升 baseline。
- 发布冒烟：LLM 连接步骤适配 `settings-pref-fold` 折叠结构；utility-bridge / CSS audit / Prettier 预检闭环。
- 若干设置与主题债务：默认模型下拉对比度、数字块密度、导出勾选框布局、panel footer 遮挡等。

## [3.0.11-rc.13] - 2026-07-27

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.12` 之后的 **Deep Chat 模型能力最大化入口**：推理 effort 按模型能力动态档位，图片附件按 `supportsVision` 门控接入当轮请求。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- Deep Chat 图片附件：模型 `supportsVision` 时启用 deep-chat 图片上传；files → `visionUserParts`（`input_image`）当轮透传 chat/responses；单轮最多 4 张、单图 5MB；纯图回合用 `[图片]` 文本占位。
- Deep Chat 推理强度档位按 `cap.reasoningEfforts` 动态渲染，覆盖 `low/medium/high/xhigh/max`；超纲档位 `clampEffort` 后回写 UI 与会话状态。

### Changed

- Deep Chat 推理 effort 类型与系统设置对齐到完整 `ReasoningEffortLevel`；调试口吻 hint 改为用户向说明。
- 图片上传入口 fail-closed：非 vision 模型继续隐藏；麦克风/相机/音频/GIF/混合文件仍关闭。

### Fixed

- 多轮 messages 仅取**最后一条 user** 的 files，避免历史附件被重复收集进本轮 vision 载荷。
- 图片 base64 **不写 thread / localStorage**，仅服务当轮 `callLLM`。

## [3.0.11-rc.12] - 2026-07-27

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.11` 之后的**四条大模型 API 路径官方对齐**（`/chat/completions`、`/responses`、`/messages`、`:generateContent` 传输层与协议层全量补齐）、**上线前残留风险修复**（jsonMode 原生路径保持、OpenAI effort 出口 clamp）与**暗色 WCAG 对比度清零**。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- Gemini 原生流式：`buildFullApiUrl` 支持 stream 时切 `:streamGenerateContent` + `?alt=sse`（保留网关前缀，pathSuffix 不带 query）。
- 协议解析层新增纯函数：`extractAnthropicUsage`（三形态 + cache 折入 prompt）、`extractGeminiUsage`（thoughts 计入 completion）、`extractAnthropicToolUses` / `extractGeminiFunctionCalls`、`extractGeminiFinishDiagnostics`、`extractAnthropicStopReason`、Anthropic 流式 tool_use start / input_json_delta 读取器。
- Responses 失败通道：`getResponsesFailureFromEvent/FromPayload` + `getResponsesRefusalDelta`（refusal 并入可见文本；response.failed/incomplete 抛中文 ApiError，部分文本保留）。
- 传输层：Anthropic/Gemini 流式旁路收割（usage 合并、tool_use/functionCall 累积→chatToolCalls）、非流式 payload 读取（空文本 + max_tokens/finish 诊断抛错）、整段原生 JSON 回落解析；三 surface 共用 chat 工具循环。
- Chat vision 部件补齐：`input_audio`、`file`；verbosity（chat 顶层 / responses `text.verbosity` 与 format 合并）；service_tier 白名单加 `scale`。

### Changed

- OpenAI 出口 effort clamp：`reasoning_effort` / `reasoning.effort` 把产品侧 `xhigh`/`max` 钳制为官方枚举上限 `high`（仅 OpenAI 两个 mapper；Anthropic `output_config.effort` 与产品侧 5 档不变）。
- jsonMode 不再把 `anthropic_messages` 静默切到 `chat_completions`（原生 Anthropic 端点会 404；Anthropic 无 response_format，JSON 靠 prompt 约束）。
- 双认证头（Bearer + x-api-key / x-goog-api-key）补设计意图注释：BYOK 网关依赖 Bearer，原生端点忽略多余头，刻意兼容策略勿“修复”。
- 设置面板 `undoLastSettingsSave` 提取 `restoreLlmSettingsSnapshot` helper，清除 deep-nesting 中位技术债（tech-debt gate 回归 0 中以上）。

### Fixed

- 暗色 WCAG 对比度扫描 440 处失败清零；PPC 搜索词 / Keyword Hunter 深度双主题补齐；amz hub 残留 ink 色 token 化。
- 设置模型下拉改按 value 键控（`isModelSelected`），修复同名不同渠道模型选中态错乱。
- Gemini 流式 usage 不再被通用 harvest 覆盖归一化结果；Anthropic 相邻同角色消息合并 + thinking budget floor。

## [3.0.11-rc.11] - 2026-07-27

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.10` 之后的**企业主题 v2 双色轴全面落地**（light/dark/system × Appearance 正交、ui-card 语义面、utility bridge）、**Claude/Gemini 厂商 API 对齐修复**与 **CI 恢复**（ubuntu runner + 全绿测试）。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- 企业主题 v2（#3）：light/dark/system 颜色模式轴与 Appearance 主题轴正交共存；新用户默认跟随系统；切换模式时整页 ~260ms 调光过渡。
- `ui-card` 语义表面原语 + 双主题表单 token；SOP（backend/growth/safety/service）、App Center、amz_hub、explore/scenario 等业务卡片全面迁移。
- Utility bridge：为遗留 light 工具类提供暗色语义（含 alpha 边框类映射、`--deep-chat-*` / `--wash-*` 变量桥）；bridge drift 门禁纳入 `ci:quality`，T5 正交矩阵检查。
- 暗色表面高程阶梯（surface elevation ladder）与暗色关键 chrome（critical、mega glass、wb badge soft duals）。
- 设置外观区「跟随系统」实时解析提示（当前为浅色/深色）。
- 内容表面 hardcode 门禁扩展到业务模块；`--wash-*` token 纳入 CSS 变量审计。

### Changed

- 四个 GitHub Actions workflow 全部迁至 `ubuntu-latest`（免费计划 1x 计费；Windows 2x 计费致 7 月配额中旬耗尽、Quality Gate/Release 自 07-14 起全部拒绝启动）。PowerShell 步骤显式 `shell: pwsh`；Playwright 安装补 `--with-deps`。
- Claude 能力注册表改用官方连字符模型 ID（`claude-opus-4-8` 等），点号网关别名归一化后匹配；4.6 代档位表移除 xhigh（4.7 引入）；Opus 4.5 移回 legacy budget_tokens 路径；新增 `claude-fable-5` / `claude-mythos-5`（1M 上下文，adaptive + effort 五档）；`claude-3-5-sonnet*` 不再声明推理（fail-closed）。
- Claude 4.7+ 现代路径显式 `thinking.display: "summarized"`（默认 omitted 会让深度思考面板空白）；4.6 代不发 display。
- Gemini 原生路径 `thinkingConfig` 收进 `generationConfig`（官方 v1beta 形状）；legacy budget 的 max_tokens 答案余量 512 → 4096。
- 单测断言与已落地产品契约对齐（rc.9 Toast options 对象、aria-current token 化导航、Appearance color-mix chrome、调度偏好迁设置、prepare-release 版本断言改读 package.json 等 18 处）。

### Fixed

- CHANGELOG rc.10 章节反引号损坏修复并补录遗漏条目（pre-paint 防 FOUC、暗色孤岛绑定等）；GitHub Release notes 重建为完整模板。
- deep-chat 消息工具栏 rAF 调度守卫竞态：同步 rAF 环境下 handle 先清后覆，导致后续渲染全部静默丢弃、工具栏永不挂载。
- 设置面板 5 处 `x-show` 违反 inline-style 策略（含主题 v2 合并回归的 1 处），统一改 `hidden` + `:hidden` 绑定。
- 主题 v2 合并后的暗色可读性收尾：settings drawer、data-backup、dev-diagnostics、ziniao scenario、ppc search terms 14 个拆分样式、深聊双主题变量桥。
- 发布冒烟 e2e：两处主题断言仍期待 pre-seed 时代的 `system` 默认，与测试自身注入的 light 起点矛盾（发布跑必红），改断言注入值。
- 企业主题 v2 union-merge 带入的 18 个文件 Prettier 格式漂移。

## [3.0.11-rc.10] - 2026-07-26

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.9` 之后的**推理档企业闭环 / 厂商 API 对齐**、**主题系统 Phase 1–2 收敛**（颜色模式 + Appearance primary 迁样）、设置 TD 与企业指南 SSOT。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- 推理档企业闭环 Spec：`docs/superpowers/specs/2026-07-26-reasoning-effort-closed-loop-design.md`（L1 意图 / L2 allowlist / L3 clamp + requested·effective 请求日志）。
- 厂商推理 API 对齐 Spec：`docs/superpowers/specs/2026-07-26-vendor-effort-api-alignment-design.md`（`EffortControlKind` 长期演进）。
- `EffortControlKind` + registry 分模型挂载；Claude 现代路径 `thinking.adaptive` + `output_config.effort` 正交配对；legacy 路径 `thinking.budget_tokens`。
- 表驱动契约测试：`effortClosedLoop.test.ts`（GPT / Grok / Claude 双路径 / Gemini）。
- 设置 AC3：拉模型换 id / 加载配置时按 allowlist 钳制并静默落盘，降档 toast 一次性。
- Color Mode API：`ThemeManager.applyColorMode` / `restoreColorMode`；设置外观支持浅色 / 深色 / 跟随系统；颜色模式偏好键 `app-color-mode` 纳入本地数据配置键清单。
- 双主题壳层中性色：侧栏 / 顶栏 / mega panel 提供 light·dark 双份 shell neutrals。
- 主题企业审查与作战手册 / D1–D12 计划与门禁（hardcode baseline、token override audit、D12 视觉 scaffold）；agent-contract XO 运行与视觉审查证据留档，XO 残余 #24–26 可执行化。
- Ownership Role SSOT scaffold + soft ownership 单测；企业设计规范 SSOT 栈与结构门禁。
- 设置 TD：Keyword Hunter 二级导航深链、数据策略保存契约、侧栏 scroll-spy；TD-DOC-01 / TD-SET-02 / TD-TEST-02 收口；相关 e2e / 矩阵文档。

### Changed

- 产品推理轴保持 `low…max`；UI 仅展示当前模型 allowlist；GPT 旗舰含 xhigh/max，Grok-4.5 仅三档默认 high。
- Appearance primary / focus 批量迁入共享壳与业务样例 CTA（KH / Scraper / Analysis / PPC / PromptLab / Deep Chat / Home / Modal 等 residual 波次）。
- 暗色 foundation 多文件 dual/tri-selector（`.dark` + `data-color-mode-resolved` + legacy）。
- 主题语义：颜色模式 light/dark/system 与 accent-as-tone 分轨（见主题 XO / landing 板）。
- `ColorContext.setModuleColor` deprecated + ESLint 禁生产调用；workbench radius 语义 token 与长尾 defer 记录。

### Fixed

- Claude：effort 与 thinking 正交；现代路径同时发送 adaptive thinking + effort（不再只发 effort）。
- Grok 等非法档不再静默掉成 medium；就近 clamp（如 max→high）。
- 设置 fetchModels 自动切模型后未钳制 effort / 加载降档重复 toast 的 AC3 缺口。
- 颜色模式 pre-paint bootstrap：首屏按已存偏好预绘制，避免暗色偏好下的 FOUC 闪烁。
- 暗色模式不再覆盖 Appearance primary；常暗「暗色孤岛」改绑 `data-color-mode-resolved`，与颜色模式解析结果对齐。
- 多处模块 focus / 主 CTA hard blue·indigo 迁 Appearance，避免与颜色模式冲突。

## [3.0.11-rc.9] - 2026-07-26

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.8` 之后的**主题架构企业级收口**、**可行动 LLM 失败体验**、Keyword Hunter 生命周期与文档权威整理。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- 外观主题 **极简素色（`minimal`）**：工业 slate-700 primary/focus；设置面板自动出现；A2 分层（Appearance 不覆盖模块归属色）。
- 共享 LLM 失败体验：`formatLlmFailureUx` / `showLlmFailureToast`（配置/401/429/超时/存储满等可行动 Toast，支持「打开设置」深链）。
- Toast 可选 `action` 按钮（`notifications` + `.toast-action` 样式）。
- 运维文档：`docs/troubleshooting/DEGRADATION_MATRIX.md`（LLM / 存储 / chunk 降级与代码路径对照）。
- 工具 LLM 错误码速查：`docs/troubleshooting/LLM_ERROR_CODES.md`（`ERR_LLM_*` 与历史码映射）。
- 主题架构 Spec / Plan：`docs/superpowers/specs|plans/2026-07-25-theme-architecture-enterprise*.md`；`THEME_SYSTEM` / `VISUAL` 双层契约与 D1–D6 债务登记。
- 文档权威：`.kiro/README.md`（historical）、`docs/superpowers/README.md`、刷新 `docs/INDEX.md` 现行 vs 归档分区。

### Changed

- 删除无引用的 `src/common/config/themes.ts` 双轨主题运行时；Appearance 仅 `ThemeManager`（`app-theme`）。
- `ThemeManager.applyTheme` 不再调用 `ColorContext.setModuleColor`；`previewTheme` 与 customVars 对齐。
- 收敛下载 / CSV / 剪贴板 / 一次性 handoff / `llmToolBridge` / `llmRequestCache` / Alpine panel 工厂，业务模块改复用共享实现。
- Keyword Hunter：DOM/定时器经 BaseModule disposable；离开时拆除 body 浮动 chrome。
- 系统设置：EventBus / storage / `$watch` 订阅 init-once，避免重复打开堆监听。
- 根目录 one-off Deep Chat 审查笔记迁入 `docs/archive/ui-audit/`（结构清理 batch B）。

### Fixed

- 设置 E2E smoke：展开 LLM 折叠步骤后再操作凭证与模型列表。
- `GlobalErrorHandler` 通知用户时按 `showToast(title, { type })` 调用，并走 LLM actionable UX。
- AI Analysis / Keyword Hunter 分析失败提示统一为可行动 LLM 失败 Toast。
- 模型列表拉取错误映射 complexity（ESLint warning gate）。
- 推理档位按模型上限 clamp（如 Grok `max` → `high`），避免非法 effort 写入网关。
- `themeConfig` 单测 / type-check:tests / Prettier 门禁与完整 `npm run build` 通过（rc.8 后主题批次）。

## [3.0.11-rc.8] - 2026-07-25

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.7` 之后的**系统设置企业级硬化**：保存契约、侧栏二级导航、采集/外观 UX、推理 5 档与回归闭环。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- 系统设置企业级硬化 Spec / Plan 与测试闭环（dirty 关闭确认、健康检查、回滚点、分桶导出、多标签提示、配额告警）。
- 侧栏分类 **一级 + 二级** 导航（点击展开并滚动定位 / 展开祖先 details）。
- 推理等级 **5 档**：`low` / `medium` / `high` / `xhigh` / `max`（分段控件，即时保存）。
- 运行策略一键预设（稳定 / 速度 / 成本）并入通用 AI 执行策略；点击后即时写入 runtime。
- 调度偏好自定义下拉：选项后附「并发 · 缓存 · 失败」浅色提示。
- 设置内搜索、外观与体验区、数据采集扁平运行策略字段。

### Changed

- 系统设置：保存后**不再自动关闭**面板；按钮型控件（推理、预设、调度偏好、动画）即时保存。
- 精简/高级 density 模式移除；全部设置项默认可见（折叠子菜单默认收起）。
- 采集代理并入 Master Analysis → 数据采集；采集策略保存归一到「保存工具与运行策略」。
- 数据区：分桶导出更名为「数据导入与导出」，导入/导出按钮收入该折叠框底部。
- 文案去 AI 味；badge 每区收敛为主徽章。
- Master Analysis 页去掉 workflow-strip；分析设置入口改为极简「清除缓存」。

### Fixed

- 推理设置无法持久化：Zod schema 补齐 `xhigh`/`max`，避免读盘校验失败删库。
- 搜索框放大镜与 placeholder 重叠。
- LLM 子菜单折叠图标（改用真实 FA chevron）。
- 保存相关 ESLint complexity 门禁。
- density 死代码清理；`lint:warning-gate` 归零。

## [3.0.11-rc.7] - 2026-07-25

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.6` 之后的双路径 tools 闭环、Deep Chat 生成 chrome / 已完成时间线，以及 Create 字段透传。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- **Responses Create 字段透传收敛：** `top_p` / `top_logprobs` / `metadata` / `prompt_cache_key` / `safety_identifier` / `user` / `truncation` / `background` / `max_tool_calls` / `include`；探针 `tools/verify-responses-create-parity.mts`。
- 双轨收敛 Spec：`docs/superpowers/specs/2026-07-25-dual-track-api-convergence.md`。
- **Chat Completions 真全量 Create 客户端**：在既有 tools / vision / structured / 采样字段之上，补齐 `modalities`、`audio`、`prediction`、`web_search_options`、`user`；`onUsage` / `onCompletion` 回调；stream tool_calls 闭环；CRUD 客户端（list/get/update/delete/messages）。
- `chatCompletionsResource.ts` + `tools/verify-chat-create-parity.mts` 结构探针。
- Spec：`docs/superpowers/specs/2026-07-24-chat-completions-true-full-parity.md`（含不可完成项理由）。
- **双路径官方 Create 对齐（chat + responses）**：tools / tool loop、vision、json_schema、stream_options 等。
- `chatTools.ts` / `chatVision.ts`：官方 `tool_calls` 多轮与多模态映射。
- Deep Chat 业务工具：`web_search` / `search_x` 等；文本态 tool dump 解析与恢复（XML / JSON 数组）。

### Changed

- Registry chat surface：`supportsTools` / `supportsVision` = true（与 Responses 并行，非互斥子集）。
- `enableToolLoop` 在 **chat_completions** 与 **responses** 均可；不再把 tools 锁死在 Responses。
- API 路径与设置文案：双路径均为官方 Create 能力，fallback 仅为传输降级。
- Deep Chat：工具 / 状态时间线收口到「已完成」折叠区；stream-first + 末轮 `tool_choice: none` 防止空转。
- 系统设置：`scrollToSection` 仅滚动设置内容区，避免 `scrollIntoView` 顶起底栏。

### Fixed

- 模型列表 string id 默认 context 与能力目录对齐为 `32768`（单测期望同步）。
- Tool loop：空最终文本时从工具结果合成可见回答；文本 dump 的 tool_calls 可恢复并继续多轮。
- Deep Chat chrome：续聊不再闪「已完成 0s」；ZWSP 占位气泡折叠；深度思考 / 活动行 body 高度与 remount 稳定。
- `web_search`：剥离 DuckDuckGo / jina reader 站点 chrome（region / date 等噪声）。
- 质量门禁：ESLint complexity 拆分使 warning gate 归零；单测对齐 `callLLM` 扩展 options（`apiPath` / `reasoningPrefs`）。

## [3.0.11-rc.6] - 2026-07-24

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.5` 之后的 Deep Chat 包结构重组、深度思考 / 模型能力线，以及系统设置体验统一。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- 模型能力目录与推理控制：`modelCapability` Registry（fail-closed）+ `/models` context 合并；系统设置全局推理开关/强度；Deep Chat 会话级覆盖；`llmService` 请求体 mapper（无 mapRequest 不写字段）；`callLLM` 自动从已存 provider 配置注入全局 reasoningPrefs。new-api 实测：`reasoning_effort` + 流式 `reasoning_content`。
- 头部模型能力目录（2026-07）+ **真·多协议**：`chat/completions` 与 `/responses` 双 surface；OpenAI GPT-5/o 系默认 responses；Grok/DeepSeek 默认 completions；**Claude 发 `thinking.budget_tokens`、Gemini 发 thinking_config**（无 label 假实现）。见 `model-capability-catalog-2026.md` / `2026-07-23-multi-protocol-llm-design.md`。

### Changed

- Deep Chat：domain 分包重组；`styles.css` 上提至 playground 层，入口 import 对齐 `../styles.css`。
- 系统设置：AI 模型与连接改为四步编号（基本信息 / 凭证 / 模型与能力 / 高级选项）；Endpoint 与 API 路径并排（Endpoint 无前置图标以完整展示）；API 路径自定义下拉（路径主色、说明单行省略）；推理区开关 + Low/Medium/High 分段；各板块标题/卡片/表单控件视觉统一。

### Fixed

- 系统设置左侧分类导航：改用内容区局部滚动，避免 `scrollIntoView` 顶起底部状态栏遮挡内容。
- Deep Chat / Responses：空回复恢复与网关兼容路径继续收口。

## [3.0.11-rc.5] - 2026-07-23

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.4` 之后的 Deep Chat 技能单次执行语义。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Changed

- Deep Chat：挂载技能改为**单次执行**——用户发送后立即消费 `skillContexts` 与技能派生系统提示；历史消息中的 `「技能名」` 仍可展示 / 编辑回填 Chip，再次调用需从 Skill Library 重新挂载。

### Fixed

- 单测 / E2E：覆盖发送后无会话 dock、无续挂系统提示，以及历史气泡 Chip 仍可见。

## [3.0.11-rc.4] - 2026-07-23

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.3` 之后的 Deep Chat 发送钮几何、会话 Skill Chip dock 与侧栏 Skill Library 入口。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- Deep Chat：发送后保留非消息态会话 Skill Chip dock（可移除，不进入请求正文）；技能标记水合与多技能 Chip 序列化覆盖加强。
- E2E：`deep-chat-send` 覆盖视口变化 pin、手机壳侧栏、stop 态过渡与装饰 Skill Chip 全链路。

### Changed

- Deep Chat：Skill Library 入口移到左侧会话栏「搜索会话」下方，与新建/搜索会话按钮统一边框与 hover 视觉。
- Deep Chat：系统提示随剩余 skillContexts 同步；去掉 Context Bar，改为输入区 Chip / 会话 dock。

### Fixed

- Deep Chat：窗口 resize / stage 宽度过渡后重算发送钮位置，避免错位。
- Deep Chat：手机宽度下全局侧栏 `max-md:hidden`，主内容与输入区不再被 256px 侧栏挤压。
- Deep Chat：stop 按钮视觉态等待 CSS transition 完成后再断言，降低 flaky。

## [3.0.11-rc.3] - 2026-07-22

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.2` 之后的 Deep Chat 会话稳定性、发布门禁与 Skill Library 构建产物优化。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- 发布验证：补充 RC3 发布元数据契约，覆盖当前候选版本、变更日志分区与 Release notes 回填版本列表。

### Fixed

- Deep Chat：生成结束后清除停止态（仅可中止请求显示停止）；Prompt 空状态 CTA 收敛（去掉顶栏「生成 Prompt」入口）。
- Deep Chat：发送/停止按钮尺寸与 auxiliaryStyle 对齐，减少 loading → stop 样式闪烁。
- Deep Chat：水合历史会话时保留已持久化的非默认会话名称，不再被首条消息内容覆盖；搜索弹窗仍展示完整消息摘要。

### Changed

- CI Quality Gate：覆盖率门槛与 `vite.config.js` 对齐（lines 82 / statements 80 / functions 82 / branches 65）；smoke 改为对 `dist` 跑 `test:e2e:smoke:release` 并复用 build artifact。
- 构建：将 Skill Registry 的原始 `SKILL.md` 内容按技能名称前缀拆分为 `skill-content-*` 产物，消除单个 450 kB 以上的技能注册表 chunk。
- Vercel：clean-path 使用 302 → Hash，与 Cloudflare `_redirects` 对齐；移除未知路径 SPA rewrite 到 `index.html`。
- 文档：产品主推作业流/知识页/探索页口径；Sentry 默认关闭的监控决策；部署双宿主合同说明。

## [3.0.11-rc.2] - 2026-07-22

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 收口 `v3.0.11-rc.1` 之后的技能页叙事对齐与 Deep Chat 技能 Chip / 输入体验热修。
> 生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- 技能页叙事对齐提示词页（方案 B）：使用原则 ×4、技能使用公式、高频实战路径 ×4、业务规则 ×6、页脚统计与来源说明。
- 技能目录 eyebrow 调整为 Skill Library / 可试用方法论；筛选区随页滚动（不吸顶）。

### Changed

- 技能页移除底部「数据与使用说明」折叠区；指标迁移到页脚。
- Deep Chat 技能挂载：试用/附加时输入框前缀 Chip 并重试水合；Context Bar 同步展示可移除 Chip。

### Fixed

- 发送/输出完成后空输入框被强制回填技能 Chip。
- Context Bar 胶囊样式裁切导致 Chip 不可见。
- 输入框长草稿无法纵向滚动（发送钮贴底固定）。
- 技能页 `skills-catalog-sticky` 滚动吸顶干扰阅读。

## [3.0.11-rc.1] - 2026-07-21

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.10`。
> 本版覆盖部署到 Staging / 候选生产验证；生产回滚目标为 `v3.0.10` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Added

- **更多 → 大模型探索 → 技能**：只读技能目录（搜索 / 分类 / 详情 / 复制全文）、Overview 入口（已接入）、`skillRegistry` 运行时注册表（构建期加载 `vendor/amazon-skills/*/SKILL.md`）。
- **Deep Chat × 技能试用链路**：技能页「在 Deep Chat 试用」事件交接（含已挂载 Deep Chat 二次试用）；新建会话或附加到当前会话；系统提示覆盖确认；Context Bar + 输入框 Chip；短时撤销；会话列表技能徽标。
- Deep Chat 会话级 `systemPrompt` / `temperature` 随线程持久化。
- Deep Chat 后台完成回复后的极简**未读实心圆点**（切回会话清除）。
- 技能筛选状态跨试用往返保留（StorageService）。
- release smoke / 单测覆盖 Skills 路由与生成中切会话、后台输出、未读标记。

### Changed

- Deep Chat 软卸载：离开模块时保留在飞 LLM（不 abort），显示定时器清空，remount 后恢复「生成中 / 输出中」；会话间切换时打字机后台静默推进直至完成。
- deep-chat vendor bundle 在构建期对空 `messageToElements` 滚动崩溃打防护补丁；**生产构建若补丁模式未命中则 fail-closed**。
- 技能页主 CTA 使用探索紫系；试用链路图标与 Deep Chat 徽标统一为 graduation-cap。

### Fixed

- 生成中无法点击切换其他会话（列表每 tick 重绘导致点击丢失）。
- 「输出中」切走后输出暂停，须切回才继续；现已后台静默推进。
- 会话列表因调参写回被打乱排序。
- deep-chat 空历史滚动 `TypeError`（vendor 补丁）。
- 技能 Chip remount 后不可见、dismiss 残留标题、系统提示确认误弹、skill bar 叠层、发送按钮垂直对齐、用户气泡 Chip 对比度等体验问题。
- 技能详情弹窗挂载根、卡片标题尾部 emoji、welcome banner 标签等 Skills 页收口。

### Security

- Deep Chat 错误日志经脱敏后再输出，避免 apiKey 等敏感字段进入 console。

## [3.0.10] - 2026-07-20

> 正式 GA。发布后 GitHub Latest 指向 `v3.0.10`；上一 GA 与生产回滚基线均为 `v3.0.9`。
> 生产目标为 `https://sops.hongecb.store`。
> 本版收口 `v3.0.9` 后已上线热修，使 package / tag / Release / 生产产物重新三者一致。

### Added

- 更多菜单快捷入口增加「采集插件下载」，与 Chrome 扩展分发入口对齐。

### Changed

- Vercel 构建改为 `build:app`，避免 `prebuild` 在远端重复跑本地 CI 门禁导致部署失败。
- 本地数据导入改为三向选择（合并 / 覆盖 / 取消），清空全部本地数据后自动刷新页面。
- PromptLab / Deep Chat / Keyword Hunter 交接按钮与 DNA 字段标签样式收敛；采集历史快照列表限高可滚动。
- 确认弹窗抽取共享 shell，消除 medium 级重复代码技术债；`tech-debt:gate --fail-on medium` 保持 0 问题。

### Fixed

- 本地备份导入文案与清空后状态不一致问题。
- XSS 扫描报告与当前 `src/` 文件数对齐（534 文件 / 清空 DOM 跳过 8）。

## [3.0.9] - 2026-07-19

> 正式 GA。发布后 GitHub Latest 指向 `v3.0.9`；上一 GA 与生产回滚基线均为 `v3.0.8`。
> 生产目标为 `https://sops.hongecb.store`。

### Added

- 新增静态产物合同校验（`release:artifact-contract`）：Hash 规范 clean URL 的 `302` 映射、独立 `404.html`、安全响应头集合。
- 新增本地发布编排 `npm run release:gate` 与只读生产探测 `npm run release:production-gate`。
- 新增隔离的发布 Playwright 配置与性能门禁（`test:e2e:smoke:release`、`test:performance:gate` / lighthouse-gate）。
- 新增功能 E2E 分组 runner（`test:e2e:functional`）与发布就绪状态说明文档。
- 声明 Node engines 与 `.node-version`，对齐 Vite 8 运行时下限；coverage 四维阈值抬升。

### Changed

- Clean URL 由 SPA `200` rewrite 改为指向 canonical Hash 的临时重定向；`_headers` 去掉扩展名级 MIME 强覆盖。
- Playwright Chromium 恢复正常浏览器安全（移除全局 `--disable-web-security`）；性能路径收敛为单 worker 隔离门禁。
- quality-monitor / tech-debt 扫描 fail-closed；`tech-debt:gate` 对 medium 及以上失败。
- Keyword Hunter 单元 mock 对齐 `SafeRenderer.renderUntrustedHtml`；忽略本地 `.worktrees/`。

### Fixed

- 修复 `npm run build` 预检：`static-artifact-contract` 测试正则触发 `no-regex-spaces`，以及 hardening 合入后 14 个源文件 Prettier 未过 `format:check` 的问题。

## [3.0.8] - 2026-07-19

> 正式 GA。发布后 GitHub Latest 指向 `v3.0.8`；上一 GA 与生产回滚基线均为 `v3.0.7`。
> 生产目标为 `https://sops.hongecb.store`。

### Added

- 新增启动故障注入回归覆盖：无关 domain import 失败时 App Center 深链继续可用；目标 App Center domain import 失败时回退完整首页。

### Changed

- Release scripts and workflow bind tag-bound operations to an annotated tag at the final HEAD, then recheck the remote tag SHA around mutations.
- Test quality now validates executable `test` and `spec` sources, excludes generated reports, and uses a dedicated TypeScript project for root tests.
- Removed the incorrect `system-settings` manual chunk so the strict per-chunk production warning remains meaningful without known large-chunk noise.
- 启动阶段按 domain 独立记录动态 import 结果，避免单个可选 domain 的失败中断全局初始化。

### Fixed

- 修复 App Center singleton 在 A → B → A 快速路由切换时，旧异步 mount 完成后卸载新实例的问题。
- 修复 App Center 初始深链在自身 domain chunk 无法加载时留下空壳的问题，改为回退首页并提示用户。
- 修复 Deep Chat 初次挂载及重建会话时注入 Google Fonts，导致本地 CSP 报错的问题。

- Fixed proxy and LLM credential migration so failed secure writes or cleanup cannot delete legacy values or overwrite an existing secure credential.
- Hardened untrusted LLM/import rendering and scraper site validation before data reaches the page.
- Replaced SafeModuleLoader's ineffective dynamic `viewLoader` import with its actual static dependency, removing the production build warning.

## [3.0.7] - 2026-07-18

> 正式 GA。发布后 GitHub Latest 指向 `v3.0.7`；上一 GA 与生产回滚基线均为 `v3.0.6`。
> 生产目标为 `https://sops.hongecb.store`，不在本章节声明尚未完成的部署结果或性能分数。

### Added

- 新增生产预览 Lighthouse 证据门禁，分别审计 `/app-center/master-analysis/ai-analysis`、`/app-center/master-analysis/promptlab`、`/app-center/master-analysis/scraper` 三条 canonical hash route，并对最终路由、资源总量与 console 结果执行缺失即失败的证据校验。
- 补充页面搜索描述、显式 `robots.txt` 及对应发布资产契约，确保爬虫策略由独立静态资源提供。

### Changed

- 鉴权后的路由更新收敛为单次同步 prepare 后再加载视图；首屏同时等待 home view 与主样式就绪后再显示内容，失败路径也会解除等待态。
- 业务 singleton 统一注入已解析 logger；SafeModuleLoader 为同路径模块与模板加载复用 inflight 请求，并在完成或失败后清理状态。
- Release workflow 改为命令失败即中止，固定第三方 Action commit，校验精确 annotated tag、checkout SHA 与 `main` 上同 SHA 的成功 Quality Gate 后才允许发布。

### Fixed

- HTTP 写方法默认不再重试网络错误；区分 timeout 与外部 abort 的归因，并允许去重请求的 follower 独立取消而不终止 owner 请求。
- 修复 Vercel SPA fallback 吞掉 `robots.txt`、首屏内容提前闪现，以及导航当前态在明暗主题下的对比度与可访问性问题。

## [3.0.7-rc.2] - 2026-07-14

> 生产验证候选版。GitHub Release 保持 Pre-release，Latest 继续指向稳定 GA `v3.0.6`。
> 本版覆盖部署到 `https://sops.hongecb.store`；生产回滚目标为 `v3.0.6` 对应的上一条 Pages 部署。

### Changed

- PromptLab 移除 welcome banner 中语义重复的「复制 SEO 关键词」入口及其专用格式化链路；Listing Prompt 仍携带对应 SEO 关键词交接到 Deep Chat。

### Fixed

- 修复应用总览存在最近作业数据时，旧 `fade-in` 与模块统一入场动画重复执行导致页面加载闪烁的问题。

## [3.0.7-rc.1] - 2026-07-14

> 生产验证候选版。GitHub Release 保持 Pre-release，Latest 继续指向稳定 GA `v3.0.6`。
> 本版覆盖部署到 `https://sops.hongecb.store`；生产回滚目标为 `v3.0.6` 对应的上一条 Pages 部署。

### Added

- Keyword Hunter 词云增加可访问的「已匹配词根 / 未匹配词根 / 其他词根」图例和独立视觉标记。
- PromptLab 标题区增加将当前 Listing Prompt 交接到 Deep Chat 的明确入口。

### Changed

- Keyword Hunter 处理页移除「同步回输入」旧入口，避免用户误以为处理结果需要回退到输入格式化阶段。
- Keyword Hunter 处理页只恢复当前内存状态，不再自动载入历史匹配快照，防止旧文案和词频覆盖新的作业上下文。
- PromptLab 保留 SEO 关键词复制能力，同时通过 Deep Chat 携带 Prompt 与对应关键词进入文案生成链路。
- `v3.0.5-rc.1` / `v3.0.5-rc.2` 固定为仅保留 tag 的历史别名，发布同步和审计不会再次把它们创建为重复 Release。

### Fixed

- 修复同一快照、同一类型和相同内容的 Listing Prompt 被重复写入历史记录的问题。
- 修复 PromptLab 重构时误删「复制 SEO 关键词」按钮与动作的问题。
- 移除重复误标 Release 后恢复 `v3.0.4-rc.1` 至 `rc.11` 的连续展示顺序，同时保留原 tag 与 CHANGELOG 追溯。

## [3.0.6] - 2026-07-14

> 正式 GA。聚焦应用中心本地作业闭环、生产预览可靠性与发布治理。
> 同站点 / ASIN 的重复执行保持独立作业；不会引入多人协作、云同步、NPI 最近作业或 AI 自动执行 PPC / Listing 动作。
> 回滚版本：`v3.0.5`。部署目标：https://sops.hongecb.store

### Added

- 应用中心「最近作业」增加本地作业索引、按执行实例聚合的恢复队列、逐阶段载荷可用性检查和复制摘要。
- Listing 作业链路补齐为「数据采集 → AI 分析 → Prompt 生成 → Deep Chat 产品文案 → 关键词复核 → 文案评审 → 合规复核」，链路节点可直接进入对应阶段。
- Deep Chat 增加 Listing Prompt 与 SEO 关键词工作流交接、产品文案产物保存，以及将选中文案和对应关键词送入 Keyword Hunter 输入格式化页的能力。
- Keyword Hunter 独立作业使用「关键词复核 → 文案评审 → 合规复核」三阶段链路。
- 合规复核增加本地浮动对话框、逐项人工状态、风险节点和旧版 `confirmed` / `skipped` 状态迁移。
- PPC 搜索词分析增加独立动作清单快照、人工复核恢复横幅和最近作业入口。
- 最近作业增加 1 / 2 / 3 列偏好、分类与状态下拉筛选、优先级 / 最近更新排序、总数和分批显示更多。
- 新增共享文件选择器，供数据采集与 PPC 报表导入复用。
- 发版回填与审计脚本：`npm run release:backfill-notes` / `release:audit`（CHANGELOG 完整章节回填 GitHub Release）
- 新增 CBA 网关提供商支持
- 新增 KR 网关提供商和 Anthropic 适配器
- 新增 ChatAnywhere 支持
- 新增 Cloudflare 环境部署脚本
- 新增 NEW/CPA 网关占位符到环境文件

### Changed

- 最近作业默认按「置顶 → 需人工处理 → 业务更新时间 → 最近查看时间」排序，单纯打开旧记录不再挤占新作业位置。
- 作业卡标题优先展示站点、主 ASIN / SKU 与多 ASIN 范围，并补充执行开始时间和有业务含义的产物信息。
- 置顶、复制摘要和从列表移除改为卡片右上角纯图标操作；置顶状态保持透明背景，以图标颜色和角度区分。
- 完整链路在单列使用横向节点，在双列 / 三列卡片内使用纵向节点；节点 hover 只突出圆点和文字。
- PPC 导出始终创建独立 `ppc_review:*` 作业，不再继承过期的 Listing `workItemId`。
- 合规人工状态统一为 `pending` / `passed` / `issue_found` / `not_applicable`，完成但存在问题的作业保持需复核状态。
- 每个折叠作业卡保留所有阶段的载荷状态；历史载荷缺失时使用明确的不可用节点，不再跳转到失效页面。
- 回填 `v3.0.5`、`v3.0.4`、`v3.0.4-rc.1`…`rc.11` 的 GitHub Release notes（完整 CHANGELOG，不压缩）
- 为误标孤儿 tag `v3.0.5-rc.1` / `v3.0.5-rc.2` 创建 superseded 预发布说明
- `v3.0.5` Release 补充 Cloudflare Pages 生产部署记录
- 替换旧版网关为 new_api 和 cpa
- 更新 CB-E 网关 URL 为 sds.dpdns.org
- 使用 chatanywhere.org 并修复 OpenAI 域名
- 集中化 CORS 头部并优化响应

### Fixed

- 修复生产预览包中原生 file input 偶发无法打开文件选择框的问题，并避免隐藏 input 被重复点击链路阻断。
- 修复开发环境 HMR 后 ActionRegistry 重复覆盖动作及初始导航早于 Router 初始化的问题。
- 修复同一 Listing 作业跨「数据采集 / AI 分析 / Prompt / Deep Chat / Keyword Hunter」推进时生成多张最近作业卡的问题。
- 修复 Prompt 生成直接跳转 Keyword Hunter、产品文案与关键词复核节点目标页面错误的问题。
- 修复最近作业置顶图标状态不清晰、链路布局拥挤、合规复核以内联展开代替浮动窗口的问题。
- 清零最近作业相关 ESLint 复杂度与函数长度警告，恢复 `lint:warning-gate` 通过。
- 修复 CSS 构建和 API 认证问题（Cloudflare Pages）
- 修复 Alpine.js `$cleanup` 生命周期钩子错误
- 修复 Keyword Hunter 路由路径错误
- 修复最小化按钮不可见问题

## [3.0.5] - 2026-07-13

> 正式 GA。整合 `v3.0.4` 之后冻结线 `3.0.4-rc.1`…`rc.11` 的全部能力，并落地企业级发布治理。  
> 本版本取代误打且无 Release 的历史 tag 指向；各 RC 章节下文**完整保留**，本 GA 章节在汇总之外补充发布治理与运维信息。  
> 回滚版本：`v3.0.4`。部署目标：https://sops.hongecb.store

### Added

- 企业级发布治理：`docs/RELEASE_POLICY.md`、Release Notes 模板、`SECURITY.md`
- 发版脚本：`npm run release:validate` / `release:notes` / `release:package`（CHANGELOG 抽取、产物与 SHA256）
- GitHub Release 流水线：`.github/workflows/release.yml` 与自动 notes 分类 `.github/release.yml`
- 应用中心总览「最近继续」重做为高密度 Resume Queue：作业上下文优先标题、短类型标签、去重 fact chips、1/2/3 列偏好持久化与空状态快捷入口
- 新增 `recentArtifactPresenter` 纯展示变换与对应单元测试，并补充设计规格文档
- 新增共享剪贴板、模板与 LLM JSON 工具，沉淀 Shared Capabilities Guide
- 统一生产路径错误为 `ValidationError` / `SystemError` 等结构化错误，覆盖 PPC、History、Keyword Hunter、Deep Chat 等模块
- 新增共享确认弹窗组件，并补充 AppModal 与确认弹窗回归测试覆盖
- 新增 Modal 开发指南，沉淀触发、焦点、关闭行为和测试约定
- 新增 SOPS 共享模板模块、复制动作封装和页面复制工作流测试夹具
- 新增循环依赖检查脚本，统一处理 Vite `?url` 资源导入后再执行 Madge 审计
- 新增 App Center catalog、artifact envelope、workflow definitions 和 workspace context 服务
- 新增 App Center 工作台评审文档和对应单元测试覆盖
- 新增 action name、import path 和 source naming 质量审计，并接入 `ci:quality`
- 新增 SOPS owner field 共享处理工具和测试覆盖
- Deep Chat 线程支持内联重命名；Deep Chat / Keyword Hunter 快照删除主题化确认弹窗（取消 / Esc / 遮罩 /「不再询问」）
- App Center 概览最近项图标盒、相对/绝对时间展示与改进 aria-label
- PPC Search Terms 增加 action-list 产物导出和 recent UI 衔接
- PromptLab、Keyword Hunter 和历史记录服务接入新的产物/最近上下文

### Changed

- GitHub Latest 纠正为稳定版通道（本版 `v3.0.5` 为 Latest）；RC 保持 Pre-release
- 仓库 homepage 对齐生产域 `https://sops.hongecb.store`
- 冻结 `3.0.4-rc.*` 版本线；本 GA 为其正式收口
- 应用版本号改为只读 `package.json`（经 Vite 注入），避免非 semver git tag 污染 UI 版本展示
- 拆分 `SECURE_STORAGE_SECURITY_BOUNDARY` 常量，恢复 `secureStorage` 动态导入拆包；提高 Vite chunk 体积告警阈值以匹配已知 deferred `system-settings` 包
- 优化入口加载：拆分系统设置、domain shells 与 Font Awesome brands 异步块
- 将应用级事件命名统一为 `app:` + kebab-case
- 对齐部署 CSP `connect-src` 与站点清单，覆盖 Amazon 全站点域名
- 将 Keyword Hunter、Master Analysis、Deep Chat 等模块的确认逻辑收敛到共享确认弹窗
- 将 SOPS 页面里的分散模板渲染与剪贴板反馈收敛到共享工具，减少页面重复实现
- 归档历史预发布检查、UI 审计、安全审计和技术债务报告，收敛文档索引与项目结构说明
- 将 Deep Chat bundle 固定输出到 `assets/vendor/deepChat.bundle.js`
- App Center 概览改为 catalog-driven 渲染，减少模板内硬编码
- 统一 TypeScript、Vite、Vitest 和源码导入到单一 `@/` 项目别名
- 同步应用内版本显示到 `3.0.5`

### Fixed

- 修复应用中心总览「应用矩阵」分类筛选不生效：作者样式 `display:flex/grid` 覆盖了 `[hidden]`，改为 `.hidden` + 模块 CSS 强制隐藏
- 修复 Alpine 设置面板在懒加载后的注册竞态
- 修复 AppModal 打开态 host 元素不可见导致浏览器自动化无法识别弹窗的问题，并稳定 NPI Tracker 移动端 Next Step smoke 覆盖
- 修复阻塞 Vercel 构建的 Prettier 格式问题，并清理误入发布树的构建临时文件
- 通过 CSS 变量命名与 ESLint 复杂度拆分，恢复 `css:audit` / `lint:warning-gate` 通过
- 修复共享剪贴板在无 `execCommand` 环境下的降级路径，并同步 Promptlab / Prompts 相关测试
- 移除废弃 CSS 半径别名 `--radius-card` / `--radius-panel`
- 替换多个 SOPS 页面里的 `alert` 复制反馈，统一成功与失败提示行为
- 调整 Sentry 加载方式，按浏览器 SDK 和 core API 显式映射监控方法，提升生产构建兼容性
- 强化 NPI Tracker、Restricted Words、Prompt Library 和系统设置相关回归测试覆盖

### 里程碑对照（完整 RC 叙述见下文各章节）

- `3.0.4-rc.11` — Resume Queue、版本只读 package.json、入口异步拆分、Alpine/Prettier/css 门禁修复
- `3.0.4-rc.10` — 共享剪贴板/模板/LLM JSON、结构化错误、事件命名、应用矩阵筛选、CSP
- `3.0.4-rc.9` — 共享确认弹窗、Modal 指南、SOP 模板模块、AppModal 可见性
- `3.0.4-rc.8` — 循环依赖检查、rc.1–rc.7 整合、Deep Chat bundle 固定、Sentry 兼容
- `3.0.4-rc.7`…`rc.1` — Deep Chat 重命名/删除确认、recent items 图标与时间、App Center catalog/workflow、质量审计等（详见各 RC 章节）

## [3.0.5-rc.2] - 2026-07-13

> **Superseded / 已取代**：误标版本线 tag，勿用于生产。请使用 GA `v3.0.5`。

该 tag 属于曾误标的 `3.0.5-rc` 线，内容已并入冻结线 `3.0.4-rc.*` 并收口于 GA `v3.0.5`。
本条目仅作归档说明，避免孤儿 tag 无文档。

## [3.0.5-rc.1] - 2026-07-13

> **Superseded / 已取代**：误标版本线 tag，勿用于生产。请使用 GA `v3.0.5`。

该 tag 属于曾误标的 `3.0.5-rc` 线，内容已并入冻结线 `3.0.4-rc.*` 并收口于 GA `v3.0.5`。
本条目仅作归档说明，避免孤儿 tag 无文档。

## [3.0.4] - 2026-07-06

### Added

- 新增 Keyword Hunter AI 翻译模型选择器和界面刷新。
- 新增 AI 功能深度优化建议文档。

### Changed

- Deep Chat/Playground 请求预算改为动态计算，并延续 rc 系列的线程、搜索、本地化和 prompt 持久化体验。
- 整合 `v3.0.3-rc.7` 至 `v3.0.3-rc.23` 的监控、安全门禁、PPC 分析器、Keyword Hunter、PromptLab、Settings 和 UI 可访问性改进。
- 同步应用内版本显示到 `3.0.4`。

### Fixed

- 修复 LLM abort 边界行为和动态请求预算回归。
- 补充 Keyword Hunter 翻译模型选择与 LLM 行为测试覆盖。

## [3.0.4-rc.11] - 2026-07-12

> 版本线说明：曾误标为 `3.0.5` / `3.0.5-rc.*` / `3.0.6-rc.*`。按当前约定并入 `3.0.4` 预发布序列：`rc.8`–`rc.11`。

### Added

- 应用中心总览「最近继续」重做为高密度 Resume Queue：作业上下文优先标题、短类型标签、去重 fact chips、1/2/3 列偏好持久化与空状态快捷入口。
- 新增 `recentArtifactPresenter` 纯展示变换与对应单元测试，并补充设计规格文档。

### Changed

- 拆分 `SECURE_STORAGE_SECURITY_BOUNDARY` 常量，恢复 `secureStorage` 动态导入拆包；提高 Vite chunk 体积告警阈值以匹配已知 deferred `system-settings` 包。
- 优化入口加载：拆分系统设置、domain shells 与 Font Awesome brands 异步块。
- 同步应用内版本显示到 `3.0.4-rc.11`。
- 应用版本号改为只读 `package.json`，避免非 semver git tag（如 `latest`）污染 UI 版本展示。

### Fixed

- 修复 Alpine 设置面板在懒加载后的注册竞态。
- 修复阻塞 Vercel 构建的 Prettier 格式问题，并清理误入发布树的构建临时文件。
- 通过 CSS 变量命名与 ESLint 复杂度拆分，恢复 `css:audit` / `lint:warning-gate` 通过。

## [3.0.4-rc.10] - 2026-07-12

### Added

- 新增共享剪贴板、模板与 LLM JSON 工具，沉淀 Shared Capabilities Guide。
- 统一生产路径错误为 `ValidationError` / `SystemError` 等结构化错误，覆盖 PPC、History、Keyword Hunter、Deep Chat 等模块。

### Changed

- 将应用级事件命名统一为 `app:` + kebab-case。
- 对齐部署 CSP `connect-src` 与站点清单，覆盖 Amazon 全站点域名。
- 同步应用内版本显示到 `3.0.4-rc.10`。

### Fixed

- 修复应用中心总览「应用矩阵」分类筛选不生效：作者样式 `display:flex/grid` 覆盖了 `[hidden]`，改为 `.hidden` + 模块 CSS 强制隐藏。
- 修复共享剪贴板在无 `execCommand` 环境下的降级路径，并同步 Promptlab / Prompts 相关测试。
- 移除废弃 CSS 半径别名 `--radius-card` / `--radius-panel`。

## [3.0.4-rc.9] - 2026-07-12

### Added

- 新增共享确认弹窗组件，并补充 AppModal 与确认弹窗回归测试覆盖。
- 新增 Modal 开发指南，沉淀触发、焦点、关闭行为和测试约定。
- 新增 SOPS 共享模板模块、复制动作封装和页面复制工作流测试夹具。

### Changed

- 将 Keyword Hunter、Master Analysis、Deep Chat 等模块的确认逻辑收敛到共享确认弹窗。
- 将 SOPS 页面里的分散模板渲染与剪贴板反馈收敛到共享工具，减少页面重复实现。
- 更新页面架构审计以识别共享 SOP 模板模块。
- 同步应用内版本显示到 `3.0.4-rc.9`。

### Fixed

- 修复 AppModal 打开态 host 元素不可见导致浏览器自动化无法识别弹窗的问题，并稳定 NPI Tracker 移动端 Next Step smoke 覆盖。
- 替换多个 SOPS 页面里的 `alert` 复制反馈，统一成功与失败提示行为。
- 强化 NPI Tracker、Restricted Words、Prompt Library 和系统设置相关回归测试覆盖。

## [3.0.4-rc.8] - 2026-07-12

### Added

- 新增循环依赖检查脚本，统一处理 Vite `?url` 资源导入后再执行 Madge 审计。
- 整合 `v3.0.4-rc.1` 至 `v3.0.4-rc.7` 的 App Center 工作台、Deep Chat、Keyword Hunter、PPC Search Terms、系统设置和质量门禁更新。

### Changed

- 归档历史预发布检查、UI 审计、安全审计和技术债务报告，收敛文档索引与项目结构说明。
- 将 Deep Chat bundle 固定输出到 `assets/vendor/deepChat.bundle.js`，减少构建产物散列变动对加载器和循环依赖检查的影响。
- 同步应用内版本显示到 `3.0.4-rc.8`。

### Fixed

- 调整 Sentry 加载方式，按浏览器 SDK 和 core API 显式映射监控方法，提升生产构建兼容性。

## [3.0.4-rc.7] - 2026-07-09

### Added

- Deep Chat 线程支持内联重命名，减少进入管理菜单的来回切换。

### Changed

- 同步应用内版本显示到 `3.0.4-rc.7`。

## [3.0.4-rc.6] - 2026-07-09

### Added

- 新增 Deep Chat 删除确认弹窗，替换原生 `confirm()`，支持取消、Esc、点击遮罩关闭与「不再询问」持久化。
- 新增 Keyword Hunter 快照删除确认弹窗，支持取消、Esc、点击遮罩关闭与「不再询问」持久化。
- 补充删除确认弹窗与快照删除流程的单元测试。

### Changed

- 同步应用内版本显示到 `3.0.4-rc.6`。

## [3.0.4-rc.5] - 2026-07-08

### Added

- App Center 概览最近项（recent items）新增图标盒与 `RECENT_ARTIFACT_ICONS` 图标映射，区分不同产物类型。
- 新增相对/绝对时间格式化工具，最近项时间以「刚刚 / N 分钟前 / N 小时前 / N 天前…」展示，并保留绝对时间 tooltip。

### Changed

- 重构最近项条目结构：图标盒 + 标题（标题 + 相对时间）+ 元信息 + 操作按钮，补充 hover/focus 过渡、reduced-motion 与响应式微调。
- 同步应用内版本显示到 `3.0.4-rc.5`。

### Fixed

- 改进最近项 `aria-label`（类型 · 标题 · 相对时间），提升可访问性。
- 更新 XSS 扫描报告时间戳。

## [3.0.4-rc.4] - 2026-07-08

### Added

- 新增 App Center catalog、artifact envelope、workflow definitions 和 workspace context 服务。
- 新增 App Center 工作台评审文档和对应单元测试覆盖。

### Changed

- App Center 概览改为 catalog-driven 渲染，减少模板内硬编码。
- PPC Search Terms 增加 action-list 产物导出和 recent UI 衔接。
- PromptLab、Keyword Hunter 和历史记录服务接入新的产物/最近上下文。
- 同步应用内版本显示到 `3.0.4-rc.4`。

### Fixed

- 补充 App Center catalog/workflow/workspace、Keyword Hunter 快照、PPC UI 和历史记录回归覆盖。

## [3.0.4-rc.3] - 2026-07-07

### Added

- 新增 action name、import path 和 source naming 质量审计，并接入 `ci:quality`。
- 新增 SOPS owner field 共享处理工具和测试覆盖。

### Changed

- 统一 TypeScript、Vite、Vitest 和源码导入到单一 `@/` 项目别名。
- 内部私有/工具方法去除前导下划线，并同步调用点、测试和 source-name 审计规则。
- 同步应用内版本显示到 `3.0.4-rc.3`。

### Fixed

- 对齐核心工具、组件、路由、bootstrap、服务和单元测试的内部命名约定。
- 收紧源码命名、导入路径和 action 命名约定，减少后续回归风险。

## [3.0.4-rc.2] - 2026-07-07

### Added

- 系统设置面板新增原生 `<details>/<summary>` 折叠体验和默认折叠状态测试覆盖。

### Changed

- 移除 Deep Chat 未使用的 provider status UI，并调整配置刷新与模型选择交互。
- Keyword Tracker 路由和服务命名收敛为 Keyword Hunter，刷新输入、分析、流程模板与样式。
- Deep Chat 资源收敛到功能路由目录，并加强请求生命周期、预算、prompt 选择和线程历史行为。
- PPC Search Terms 更新设置、Agent 分析流、结果控件和相关单元/E2E/视觉测试。
- 同步应用内版本显示到 `3.0.4-rc.2`。

### Fixed

- 对齐 Keyword Hunter 快照驱动流程、Deep Chat 发送/预览和 release smoke 覆盖。
- 刷新 App Center workflow 相关路由、manifest、action registry 与视觉回归测试。

## [3.0.4-rc.1] - 2026-07-07

### Added

- 新增运行时策略服务和工具策略服务，统一模型选择、超时、缓存、批处理和默认提供商设置。
- 系统设置新增工具策略、运行时控制、数据/备份、诊断和危险操作面板。
- 新增开发者诊断服务与设置面板，支持性能、事件调试、错误/分析、功能开关和日志级别开关。

### Changed

- Keyword Hunter、Master Analysis、Deep Chat、PPC Search Terms 和 Scraper 接入策略设置。
- 启动时应用开发者诊断配置，并将 eventLogger 事件日志改为受调试开关门控。
- 同步应用内版本显示到 `3.0.4-rc.1`。

### Fixed

- 补充和更新系统设置、策略服务、LLM 行为、存储、Keyword Hunter、PPC 与 release smoke 测试覆盖。
- 修复监控导入兼容、存储键和 XSS 报告时间戳相关维护项。

## [3.0.3-rc.23] - 2026-07-06

### Added

- 新增 Sentry SDK、监控初始化、secret leak scanner 和安全 CI 门禁。
- 新增本地 flag icons、Deep Chat Search Chats 弹窗和线程菜单 UI。
- 新增 release smoke 覆盖、PPC 分析器状态测试和安全审计报告。

### Changed

- Deep Chat 完成界面本地化、历史线程过滤和 prompt 选择持久化。
- 优化 PromptLab、Settings、Playground 渲染器、Sidebar 和 loading/skeleton 体验。
- PPC Search Terms 分析器改用回调驱动 UI，并保留分析状态。
- 同步应用内版本显示到 `3.0.3-rc.23`。

### Fixed

- 修复 Keyword Hunter 可访问性、拖拽交互、追踪服务和分析流程状态问题。
- 加固 release 安全门禁、CSP 和 secret 泄露检查。
- 修复监控、存储、模块加载、图片懒加载和模板可访问性回归。

## [3.0.3-rc.22] - 2026-07-05

### Added

- 新增安全审计报告、release smoke E2E 覆盖和持久化清洗测试。
- 新增 AppModal 独立样式文件与 Restricted Words 样式入口。

### Changed

- 收紧 LLM 网关、CSP/headers、系统设置和 new_api 直连配置。
- 使用系统字体并调整 Deep Chat、Restricted Words 与代码高亮样式。
- 同步应用内版本显示到 `3.0.3-rc.22`。

### Fixed

- 修复 HttpService Abort/timeout/retry 行为和性能包装重复执行风险。
- 修复 EventBus 错误记录上限、可选服务监控清理和事件解绑元数据。
- 修复持久化中间件对异常 payload 的清洗与恢复。

## [3.0.3-rc.21] - 2026-07-05

### Added

- 新增 async DI、`loaderPath` API 与 SafeTemplateLoader。
- 新增页面架构审计、预发布检查文档和模板实现指南。
- 新增 PC 端设计 token、动效 CSS 和页面架构收敛测试。

### Changed

- 收敛 PC 端模块、模板、空状态和概览列表视图。
- 为模板按钮补充显式类型、ARIA 和可访问性测试覆盖。
- 同步应用内版本显示到 `3.0.3-rc.21`。

### Fixed

- 修复模块错误处理、卸载流程、Loader 和 StorageService 安全性。

## [3.0.3-rc.20] - 2026-07-04

### Added

- 新增导航队列处理与可折叠概览交互。
- PPC Search Terms 新增阈值设置面板。
- Deep Chat 启用 prompt panel。

### Changed

- 重命名 Keyword Hunter 标签并格式化相关样式与 TypeScript。
- 刷新 App Center 与 SOPS 主题体验。
- 优化报告 UI、PPC 导入流程和结果布局。
- 同步应用内版本显示到 `3.0.3-rc.20`。

### Fixed

- 修复报告区块模板嵌套问题。

## [3.0.3-rc.19] - 2026-07-04

### Added

- 新增 LLM provider 与 Scraper proxy 配置。
- SOPS 工具页新增统一剪贴板辅助能力。

### Changed

- App Center 切换到 DeepSeek 蓝主题，并更新主题色、图标和 mega-menu 语义类名。
- 重构 Master Analysis、Promptlab、Scraper 和 App Center 概览模板与样式。
- 规范引号并压缩 CSS 格式。
- 同步应用内版本显示到 `3.0.3-rc.19`。

### Fixed

- 修复 NPI Tracker mock data 类型与 App Center 相关模板测试覆盖。

## [3.0.3-rc.18] - 2026-07-04

### Added

- 新增认证路由守卫与 API endpoint 安全测试。
- 新增 2026-07-04 安全审计报告与 CI 质量门禁说明。

### Changed

- 强化 CSP、SafeRenderer 和安全工具处理，减少渲染与内联脚本风险。
- 收紧 LLM secret 处理并移除旧 timeout wrapper。
- 将 Floating Workbench 命名统一回 App Center。
- 同步应用内版本显示到 `3.0.3-rc.18`。

### Fixed

- 修复本地存储、安全渲染、PPC 导入和路由守卫相关回归覆盖。

## [3.0.3-rc.17] - 2026-07-04

### Added

- Deep Chat 增加 pending assistant 文案和打字机反馈。
- Home 页面新增 Workbench 入口。
- Scraper 导入面板增加导入状态与可访问性回归覆盖。

### Changed

- 规范化 App Center 路由命名为 kebab-case，并补充历史路由别名。
- 使用设计 token 调整 welcome 与 app_center 样式。
- 强化卡片、弹窗、导航、模板控件和 decorative controls 的 ARIA/focus/accessibility 支持。
- 同步应用内版本显示到 `3.0.3-rc.17`。

### Fixed

- 稳定 Deep Chat 请求生命周期、Scraper 模板可访问性和导航页面入场动画测试。

## [3.0.3-rc.16] - 2026-07-03

### Added

- 新增延迟路由/模块加载骨架，提升页面切换反馈。
- 新增路由审计脚本，覆盖 manifest 路径与导航配置。

### Changed

- 路由系统迁移到 routeId 优先 API，并支持 manifest route paths 与 redirects。
- PPC Search Terms 迁移到 PPC Tools 目录结构。
- Deep Chat 拆分为 controller、配置、样式、预览和渲染模块。
- 归档历史文档与本地工具产物，减少仓库噪声。
- 同步应用内版本显示到 `3.0.3-rc.16`。

### Removed

- 移除 LegacyAdapter、全局 legacy 路由 API 和旧 routeEvents 入口。

## [3.0.3-rc.15] - 2026-07-03

### Added

- 新增功能开关服务及路由守卫集成。
- 新增 AI Analysis 端到端 fixture，覆盖沉浸式翻译运行恢复。

### Changed

- 拆分 PPC Search Terms 动作、Agent、分析、导入导出、规则、设置和 UI 模块。
- 持久化沉浸式翻译运行记录。
- 放宽 Promptlab/Scraper 性能端到端阈值并强化等待逻辑。
- 同步应用内版本显示到 `3.0.3-rc.15`。

### Fixed

- 强化 LLM streaming 响应解析与空响应处理。

## [3.0.3-rc.14] - 2026-07-03

### Changed

- 刷新 Keyword Hunter 分析、输入页和快照服务测试覆盖。
- 清理历史复杂度/技术债务报告，更新架构债务与 Kiro 状态文档。
- 强化 Promptlab 视觉 readiness 状态与 E2E helper。
- 同步应用内版本显示到 `3.0.3-rc.14`。

### Fixed

- 稳定 Keyword Hunter、Promptlab 和 Scraper 端到端页面对象与等待逻辑。

## [3.0.3-rc.13] - 2026-07-03

### Added

- Deep Chat 增加发送流程端到端测试、停止遮罩和请求生命周期覆盖。
- 新增主题系统文档、CSS 性能/调试工具测试和质量报告沉淀。

### Changed

- 持久化分析运行记录，处理空 LLM 响应并提升请求预算控制。
- 拆分 AI Analysis、PPC Search Terms、Scraper import、Prompt Library 与 Keyword Highlight 热点模块。
- 整合 CSS token、共享 keyframes、badge/icon 样式和质量工具。
- 强化 Promptlab 页面选择器、DNA 提取流程和 E2E helper。
- 同步应用内版本显示到 `3.0.3-rc.13`。

### Fixed

- 修复 Deep Chat 停止竞态并稳定 Promptlab 端到端测试。
- 更新 Deep Chat stop button 选择器和断言，降低 Playwright 超时与并发抖动。

## [3.0.3-rc.12] - 2026-07-02

### Added

- Keyword Hunter 输入页新增历史快照面板与快照服务，支持保存、恢复和删除分析状态。
- 为 Keyword Hunter 快照服务、输入页和 Scraper 当前数据渲染补充单元测试。

### Changed

- Keyword Hunter 分析结果改为自动归档，减少手动快照操作和跨步骤状态丢失。
- Scraper 页面挂载时渲染当前采集数据。
- 同步应用内版本显示到 `3.0.3-rc.12`。

## [3.0.3-rc.11] - 2026-07-01

### Added

- 新增 AMZ_HUB 成熟期运营视图。
- 新增质量报告、技术债务报告和知识库评审执行报告。

### Changed

- 统一 AMZ_HUB 与 SOPS 内容、元数据和页面脚手架。
- 调整 AMZ_HUB 模块命名和导航内容呈现。
- 优化 AI 翻译 UI。
- 同步应用内版本显示到 `3.0.3-rc.11`。

### Fixed

- 修复暗色 tile 对比度和标签重叠问题。

## [3.0.3-rc.10] - 2026-06-30

### Added

- 新增 Vercel 部署配置和静态资源路由兼容设置。
- 新增 Master Analysis 报告身份指纹服务及相关单元测试。

### Changed

- AI Analysis 报告绑定 scraped-data 指纹，减少旧报告与新采集数据混用。
- Promptlab 拆分 readiness 状态并补充 SEO context。
- 同步应用内版本显示到 `3.0.3-rc.10`。

### Fixed

- 将构建配置文件从符号链接转换为常规文件，提升 Vercel 构建兼容性。

## [3.0.3-rc.9] - 2026-06-12

### Changed

- NPI Tracker 改用 `data-action` 操作绑定，并更新页面对象和端到端测试。
- Deep Chat prompt preview 支持 pointer-aware 交互。
- 同步应用内版本显示到 `3.0.3-rc.9`。

### Fixed

- 为 NPI Tracker 高风险操作增加确认弹窗覆盖。
- 放宽表格渲染耗时断言到 5000ms，降低环境抖动导致的误报。

## [3.0.3-rc.8] - 2026-06-12

### Added

- 新增 Card、Callout、Workbench UI 审计脚本和 `ui:audit` 聚合命令。
- 新增页面进入动画工具和使用指南。
- 新增回归测试审计脚本，用于汇总覆盖率、Playwright 结果和显式 skip。

### Changed

- 优化卡片、工作台和多个模块页面的边框、动效与视觉一致性。
- 将报告、站点标识和状态文案中的结构性 emoji 替换为文本或 Font Awesome 图标。
- 同步应用内版本显示到 `3.0.3-rc.8`。

### Fixed

- 稳定 Restricted Words E2E 的导航、搜索和详情断言。

## [3.0.3-rc.7] - 2026-06-11

### Changed

- 优化 Master Analysis 的 AI Analysis、Scraper 和 Promptlab 工作流界面。
- 同步应用内版本显示到 `3.0.3-rc.7`。

### Fixed

- 新增统一确认弹窗并接入 Scraper 数据操作流程，降低误清空和误覆盖风险。
- 更新 Scraper 端到端测试和页面对象以匹配新的确认交互。

## [3.0.3-rc.6] - 2026-06-11

> Historical notes imported from GitHub Release `v3.0.3-rc.6` (2026-06-11).

## 版本定位

`v3.0.3-rc.6` 是 `v3.0.3` 的第 6 个候选版本，基于 `v3.0.3-rc.5` 之后的 Keyword Hunter、Deep Chat 存储与工具栏、系统设置布局、CSS token 和导航状态优化提交发布，用于验证 App Center 工具链、视觉 token 收敛和 Keyword Hunter 数据流。

- 发布分支：`main`
- 目标提交：`1445fcdf2201cd990498f3469c64f095457c97fb`
- 对比基线：`v3.0.3-rc.5`
- 变更规模：4 个提交，37 个文件变更，约 1,799 行新增 / 831 行删除

## 关键提交

- `2c8c952c` Refactor settings panel styling/layout
- `dafde3cf` Refactor CSS tokens and update navigation state
- `69134d2d` Enhance Deep Chat storage, toolbar & UI
- `1445fcdf` Keyword Hunter: undo clean, matching & tests

## 详细更新

### Keyword Hunter 数据流与测试

- 优化 Keyword Hunter 输入、流程页和 tracker service，增强 undo clean、关键词匹配和状态追踪能力。
- 新增 Keyword Hunter e2e fixture 与 input/process/analysis 测试，覆盖关键工作流。
- 新增 `keywordHunterTrackerService` 单测，覆盖 tracker service 的匹配与状态行为。

### Deep Chat 存储、工具栏与 UI

- 增强 Deep Chat conversation context 和存储逻辑，补充更完整的上下文与历史处理。
- 更新 Deep Chat 消息工具栏、聊天模板和 Playground 样式，优化操作入口与状态表达。
- 扩展 conversation context 测试，覆盖新增存储与上下文处理路径。

### Settings、导航状态与 CSS token

- 重构系统设置面板布局与样式，提升配置区的扫描性和操作密度。
- 收敛 CSS foundation token、header、toast、home、More、SOPs、AMZ Hub 和 App Center 等模块样式。
- 更新 navigation 状态处理和主题配置，减少重复或过时的视觉变量。
- 更新 CSS module 分析报告与 CSS variable audit 脚本。

### PPC 与视觉回归细节

- 调整 PPC search terms 样式，延续导入区和工具界面的布局稳定性。
- 更新 visual test 相关配置，配合视觉 token 调整后的页面状态。

## 验证结果

已在本地执行 `npm run build`，完整通过：

- XSS gate：扫描 356 个 `src` 文件，0 findings
- Circular dependency check：Madge 处理 354 个文件，未发现循环依赖，保留 1 条非阻断 warning
- Type check：通过
- ESLint：通过
- ESLint warning gate：`0/0 warning(s)`
- Vite production build：通过，Vite v8.0.16，405 modules transformed，构建耗时约 16.13s

## 已知非阻断提示

- 构建仍提示插件耗时较高，主要集中在 terser、CSS post-processing、asset 和 CSS 阶段。
- `deep-chat` 等少数 chunk 仍超过 300 kB；当前不阻断候选版发布，后续可继续按页面或功能拆包优化。
- `package.json` 内部包版本字段仍为历史值 `1.0.0`，本次 GitHub 发布版本以 tag/release `v3.0.3-rc.6` 为准。

## [3.0.3-rc.5] - 2026-06-11

> Historical notes imported from GitHub Release `v3.0.3-rc.5` (2026-06-11).

## 版本定位

`v3.0.3-rc.5` 是 `v3.0.3` 的第 5 个候选版本，基于 `v3.0.3-rc.4` 之后的分析进度追踪、Deep Chat pending drafts 和 PromptLab 草稿状态优化提交发布，用于验证 App Center 生成式工作流的处理中状态、草稿队列和分析反馈链路。

- 发布分支：`main`
- 目标提交：`b2aee88aea6da32b0446eb004398beccef633bef`
- 对比基线：`v3.0.3-rc.4`
- 变更规模：1 个提交，15 个文件变更，约 811 行新增 / 130 行删除

## 关键提交

- `b2aee88a` Track analysis progress & deep-chat pending drafts

## 详细更新

### 分析进度与反馈状态

- 更新 AI Analysis action 流程，补充分析处理中状态和用户反馈入口。
- 调整 Alpine panel 相关逻辑，增强分析执行过程的可见性。
- 扩展 `ai-analysis-actions` 测试，覆盖新增状态与动作行为。

### PromptLab 草稿状态

- 增强 PromptLab computed 状态，支持更完整的草稿生成、等待和展示逻辑。
- 调整 prompt action 与 panel 交互，减少生成草稿时的状态断层。
- 扩展 PromptLab 单测，覆盖 pending drafts 和草稿状态展示。

### Deep Chat pending drafts

- 更新 Deep Chat Playground 逻辑和模板，支持 pending draft 相关交互与显示。
- 调整 Playground 样式，优化生成中草稿和聊天状态的界面反馈。
- 更新 app store 类型与状态，补充 pending draft 数据结构。

### Scraper 与 PPC 体验细节

- 调整 Scraper 模板与样式，精简部分不再需要的布局样式。
- 微调 PPC search terms 样式，保持导入区域布局更稳定。

## 验证结果

已在本地执行 `npm run build`，完整通过：

- XSS gate：扫描 356 个 `src` 文件，0 findings
- Circular dependency check：Madge 处理 354 个文件，未发现循环依赖，保留 1 条非阻断 warning
- Type check：通过
- ESLint：通过
- ESLint warning gate：`0/0 warning(s)`
- Vite production build：通过，Vite v8.0.16，405 modules transformed，构建耗时约 12.50s

## 已知非阻断提示

- 构建仍提示插件耗时较高，主要集中在 terser、asset、CSS post-processing 和 CSS 阶段。
- `deep-chat` 等少数 chunk 仍超过 300 kB；当前不阻断候选版发布，后续可继续按页面或功能拆包优化。
- `package.json` 内部包版本字段仍为历史值 `1.0.0`，本次 GitHub 发布版本以 tag/release `v3.0.3-rc.5` 为准。

## [3.0.3-rc.4] - 2026-06-11

> Historical notes imported from GitHub Release `v3.0.3-rc.4` (2026-06-11).

## 版本定位

`v3.0.3-rc.4` 是 `v3.0.3` 的第 4 个候选版本，基于 `v3.0.3-rc.3` 之后的 Playground / Deep Chat、PromptLab 草稿持久化、系统设置与 release 门禁修复提交发布，用于验证 App Center 工具体验和本地数据持久化链路。

- 发布分支：`main`
- 目标提交：`807e9504dfc6c26aa2da9a8f83be3d2d15f5bb2e`
- 对比基线：`v3.0.3-rc.3`
- 变更规模：6 个提交，27 个文件变更，约 2,229 行新增 / 279 行删除

## 关键提交

- `83dc13d4` refactor(deep-chat): align visual design with project standards
- `a1bef029` fix(deep-chat): remove redundant provider status message
- `54d62fc3` fix(deep-chat): fix tuning panel z-index to prevent input overlay
- `c6e44381` Add Playground module, UI and menu ordering
- `a2bc965d` Persist generated prompts and add drafts UI
- `807e9504` Fix release gate for playground controls

## 详细更新

### Playground / Deep Chat

- 增加 App Center Playground 入口，并调整模块 manifest、overview 和菜单排序。
- 优化 Deep Chat 视觉结构、控制区布局、线程 rail、调参面板和输入区体验。
- 修复调参面板 z-index，避免覆盖或干扰输入区域。
- 移除冗余 provider 状态提示，降低界面噪音。
- 拆分 Deep Chat 控制绑定逻辑，消除 release 门禁中的 ESLint warning。

### PromptLab 草稿与本地持久化

- 扩展 PromptLab prompt action 流程，支持生成内容持久化为草稿。
- 增强 `historyService` 和 `LocalDataStore`，补齐本地数据结构、schema 和存取逻辑。
- 更新 app store 状态类型与持久化测试，覆盖新增草稿数据链路。

### 系统设置与模型元信息

- 扩展系统设置页面和配置逻辑，补充模型元信息展示与测试覆盖。
- 更新相关 zod schema、状态类型和业务类型定义，保证配置数据结构一致。

### PPC 导入区微调

- 调整 PPC search terms 导入区域布局，为文件上传和粘贴输入列增加更稳定的布局约束。
- 优化 textarea 显示高度和列宽，减少导入区域在不同 viewport 下的挤压。

## 验证结果

已在本地执行 `npm run build`，完整通过：

- XSS gate：扫描 356 个 `src` 文件，0 findings
- Circular dependency check：Madge 处理 354 个文件，未发现循环依赖，保留 1 条非阻断 warning
- Type check：通过
- ESLint：通过
- ESLint warning gate：`0/0 warning(s)`
- Vite production build：通过，Vite v8.0.16，405 modules transformed，构建耗时约 11.47s

## 已知非阻断提示

- 构建仍提示插件耗时较高，主要集中在 terser、asset、CSS 和 CSS post-processing 阶段。
- `deep-chat` 等少数 chunk 仍超过 300 kB；当前不阻断候选版发布，后续可继续按页面或功能拆包优化。
- `package.json` 内部包版本字段仍为历史值 `1.0.0`，本次 GitHub 发布版本以 tag/release `v3.0.3-rc.4` 为准。

## [3.0.3-rc.3] - 2026-06-11

> Historical notes imported from GitHub Release `v3.0.3-rc.3` (2026-06-11).

## 版本定位

`v3.0.3-rc.3` 是 `v3.0.3` 的第 3 个候选版本，基于 `v3.0.3-rc.2` 之后的 SOP 作业元信息、动作指标与测试覆盖提交发布，用于验证 SOP 页面从静态流程文档进一步收敛到可记录、可复用、可审计的运营动作体系。

- 发布分支：`main`
- 目标提交：`285dce80762be2b09104e94a2b1c1d835ca4a7f0`
- 对比基线：`v3.0.3-rc.2`
- 变更规模：2 个提交，72 个文件变更，约 5,903 行新增 / 763 行删除

## 关键提交

- `c54c2b9b` Add ops metrics, action owner & roadmap
- `285dce80` Add SOP action owner coverage

## 详细更新

### SOP 作业负责人和人工确认点

- 为增长、后端、安全、客服等 SOP 页面补齐作业元信息，明确 Owner、更新时间、适用站点、输入、输出和人工确认点。
- 在多个 SOP 页面增加可复制的复盘、登记、提报或归档模板，减少纯说明型页面带来的执行断点。
- 将账号安全、权限管理、产品合规、GPSR、品牌侵权、绩效通知、库存补货、采购 QC、FBA 发货、客服邮件、差评处理、QA 维护、竞品监控、促销提报和高危词复盘等页面接入统一的作业动作输出。

### 运营动作指标

- 扩展 `opsMetrics` 指标集合，覆盖更多 SOP 页面模板复制与动作输出。
- SOP overview 增加更多本地记录卡片，用于展示各类运营动作的次数和最近执行时间。
- PPC、NPI、Listing SEO 等既有工具动作继续接入本地指标记录，保持 overview 统计口径一致。

### Agent Center 与路线图

- 新增/更新运营系统路线图，记录 SOP 从流程文档走向可执行运营工作台的演进方向。
- 调整 App Center overview 与 Agent Center 相关入口，增强运营动作与工具入口之间的收敛关系。
- 更新 README 与文档索引，补充运营系统路线图入口。

### 测试覆盖

- 新增 SOP 元信息守卫测试，要求真实 SOP 页面保持 Owner、输入、输出和人工确认点等关键字段。
- 新增多组 SOP 页面复制模板测试，覆盖账号安全、品牌侵权、GPSR、库存补货、采购 QC、FBA 发货、客服邮件、差评处理、权限管理、产品合规、促销提报、QA 维护等页面。
- 扩展 `opsMetrics`、SOP overview、PPC search terms、NPI tracker、Listing SEO 和 restricted words 相关测试，覆盖新增动作指标与模板输出。

## 验证结果

已在本地执行以下验证，均通过：

- `git diff --check`
- `npx vitest run`
- `npm run build`

`npm run build` 完整通过：

- XSS gate：扫描 356 个 `src` 文件，0 findings
- Circular dependency check：Madge 处理 354 个文件，未发现循环依赖，保留 1 条非阻断 warning
- Type check：通过
- ESLint：通过
- ESLint warning gate：`0/0 warning(s)`
- Vite production build：通过，Vite v8.0.16，405 modules transformed，构建耗时约 9.03s

## 已知非阻断提示

- 构建仍提示插件耗时较高，主要集中在 terser、asset、CSS 和 CSS post-processing 阶段。
- `deep-chat` 等少数 chunk 仍超过 300 kB；当前不阻断候选版发布，后续可继续按页面或功能拆包优化。
- `package.json` 内部包版本字段仍为历史值 `1.0.0`，本次 GitHub 发布版本以 tag/release `v3.0.3-rc.3` 为准。

## [3.0.3-rc.2] - 2026-06-10

> Historical notes imported from GitHub Release `v3.0.3-rc.2` (2026-06-10).

## 版本定位

`v3.0.3-rc.2` 是 `v3.0.3` 的第 2 个候选版本，基于 `v3.0.3-rc.1` 之后的 UI/CSS 与可访问性优化提交发布，用于验证 welcome banner 统一、菜单与侧边栏交互、More 探索页体验和视觉设计规范落地。

- 发布分支：`main`
- 目标提交：`7f6608d018c532e4ccd2cf77a3e37eff31f4081f`
- 对比基线：`v3.0.3-rc.1`
- 变更规模：5 个提交，90 个文件变更，约 5,123 行新增 / 6,065 行删除

## 关键提交

- `d4e3166b` Welcome banner: theme vars, animations, a11y
- `800ea97f` Normalize welcome banners for accessibility
- `762d55bf` Improve accessibility for menus and sidebar
- `4b4470b9` Refactor mega menu: accessibility, behavior, styles
- `7f6608d0` Add visual design guide; UI/CSS & a11y updates

## 详细更新

### Welcome banner 与主题视觉

- 统一 welcome banner 的主题变量、动画表现和可访问性结构。
- 补齐多模块页面的 banner 语义和交互一致性，覆盖 SOPs、AMZ Hub、App Center、More 等页面模板。
- 调整卡片、表单、主导航 header、代码高亮和模块样式，降低不同页面之间的视觉割裂。
- 新增 `welcomeBannerA11y` 工具与测试，集中处理 banner 相关的可访问性行为。

### 菜单、侧边栏与导航可访问性

- 重构 mega menu 的行为、样式和可访问性状态，减少分散样式和交互分支。
- 改进侧边栏与菜单的键盘导航、状态表达和 ARIA 语义。
- 更新 navigation、mega menu、SidebarRenderer 和相关类型定义，保持菜单组件之间的交互一致。
- 为 `ModuleLoader` 补充测试覆盖，验证模块加载相关行为在 UI 调整后仍保持稳定。

### More 探索页与业务页面整理

- 优化 More / Explore 的 prompts 与 workflows 页面结构和样式。
- 调整 prompt library 数据组织，减少页面模板中的重复内容和样式堆叠。
- 业务场景页面进一步复用 `casePageRenderer`，移除多个页面中的重复模板结构。
- 更新 More overview、Agents、Prompts、Workflows 等页面的视觉细节与响应式表现。

### App Center 与工具页面体验

- 优化 Deep Chat playground 的模板、交互入口和页面样式。
- 调整 PPC search terms、Master Analysis、Scraper、PromptLab 等工具页面的布局与视觉细节。
- 更新 NPI tracker、promotion submission、restricted words 等 SOP 页面模板，保持 banner 与模块主题一致。

### 文档与设计规范

- 新增 `docs/VISUAL_DESIGN_GUIDELINES.md`，沉淀视觉设计规范。
- 新增 banner 修复与优化相关文档，记录 medium priority 修复、优化进展和汇总信息。
- 更新 `docs/INDEX.md` 与 `docs/XSS_SCAN_REPORT.md`，保持文档索引和安全扫描信息同步。

## 验证结果

已在本地执行 `npm run build`，完整通过：

- XSS gate：扫描 355 个 `src` 文件，0 findings
- Circular dependency check：Madge 处理 353 个文件，未发现循环依赖，保留 1 条非阻断 warning
- Type check：通过
- ESLint：通过
- ESLint warning gate：`0/0 warning(s)`
- Vite production build：通过，Vite v8.0.16，404 modules transformed，构建耗时约 14.03s

## 已知非阻断提示

- 构建仍提示插件耗时较高，主要集中在 terser、asset、CSS post-processing 和 CSS 阶段。
- `deep-chat` 等少数 chunk 仍超过 300 kB；当前不阻断候选版发布，后续可继续按页面或功能拆包优化。
- `package.json` 内部包版本字段仍为历史值 `1.0.0`，本次 GitHub 发布版本以 tag/release `v3.0.3-rc.2` 为准。

## [3.0.3-rc.1] - 2026-06-09

> Historical notes imported from GitHub Release `v3.0.3-rc.1` (2026-06-09).

## 版本定位

`v3.0.3-rc.1` 是 `v3.0.3` 的第 1 个候选版本，替代误发布的 `v3.0.2-rc.1`。本版本基于 `v3.0.2` 之后的 UI 主题优化提交发布，用于验证 overview 页面视觉统一、侧边栏主题变量和模块总览交互细节。

- 发布分支：`main`
- 目标提交：`410d53f35cc2df46addd2d5a328fc996c31a27b3`
- 对比基线：`v3.0.2`
- 变更规模：1 个提交，18 个文件变更，约 974 行新增 / 197 行删除
- 关键提交：`410d53f3` Polish overview themes and sidebar visuals

## 详细更新

### 侧边栏主题系统

- 为 `SidebarRenderer` 增加按模块主题色解析的 CSS 变量注入能力。
- 新增 `src/css/components/sidebar-renderer.css`，统一侧边栏 active 状态、图标容器、搜索框 focus、分类 hover 等样式。
- 引入 `SIDEBAR_THEMES` 主题映射，覆盖 blue、sky、indigo、violet、purple、fuchsia、emerald、teal、green、lime、amber、orange、red、rose、pink、cyan、slate 等主题。
- 侧边栏复用现有 DOM 时会同步主题 style，避免模块切换后主题色残留。
- 分类竖线改为从设计 token 取色，减少 Tailwind 动态类无法被构建扫描覆盖的风险。

### 模块 overview 视觉统一

- SOPs、More、AMZ Hub、App Center 四个 overview 页面补充模块级主题样式。
- welcome banner 图标阴影改为 CSS 变量控制，使不同模块可以注入自己的阴影和主题强调色。
- AMZ Hub overview 新增独立视觉增强：hero、filter panel、模块 section、卡片网格、状态 badge 和移动端适配。
- SOPs / More overview 新增模块主题变量、banner 背景、筛选按钮 active/hover 状态和徽章颜色。
- App Center overview 调整为更统一的紫粉主题，优化流程卡片、应用卡片、筛选工具条、状态徽章和 focus 样式。

### 交互与可访问性细节

- overview 分类筛选按钮增加 `aria-pressed` 状态同步。
- active 按钮状态由 CSS 类统一接管，减少 inline Tailwind 类堆叠带来的颜色不一致。
- App Center overview 移除本页搜索过滤逻辑，保留分类筛选，降低复杂度并避免搜索框 UI 与新工具条冲突。
- More 菜单探索分组主题色从 `lime` 调整为 `teal`，与业务场景和探索内容区的视觉定位更一致。

### 安全扫描报告

- 更新 `docs/XSS_SCAN_REPORT.md`，扫描文件数从 341 更新到 352。
- 本次发布前重新执行 XSS gate，结果为 0 findings、13 audited skips、0 clear-DOM skips。

## 验证结果

已在本地执行 `npm run build`，完整通过：

- XSS gate：扫描 352 个 `src` 文件，0 findings
- Circular dependency check：Madge 处理 351 个文件，未发现循环依赖，保留 1 条非阻断 warning
- Type check：通过
- ESLint：通过
- ESLint warning gate：`0/0 warning(s)`
- Vite production build：通过，Vite v8.0.16，403 modules transformed，构建耗时约 13.57s

## 已知非阻断提示

- 构建仍提示插件耗时较高，主要集中在 terser、asset、CSS 阶段。
- 部分 chunk 仍超过 300 kB；当前不阻断候选版发布，后续可继续按模块拆包优化。
- `package.json` 内部包版本字段仍为历史值 `1.0.0`，本次 GitHub 发布版本以 tag/release `v3.0.3-rc.1` 为准。

## [3.0.2] - 2026-06-09

> Historical notes imported from GitHub Release `v3.0.2` (2026-06-09).

## 版本定位

`v3.0.2` 是从 `v3.0.1-rc.4` 之后发布的正式稳定版本，主要补齐业务场景入口、模型能力配置、历史记录管理和首屏加载优化。

- 发布分支：`main`
- 目标提交：`fb9c4d7f48a47c86ab8daf20890b99fc972889ef`
- 对比基线：`v3.0.1-rc.4`
- 变更规模：4 个提交，37 个文件变更，约 3,779 行新增 / 109 行删除

## 关键提交

- `673d4397` Lazy-load non-critical CSS into deferred.css
- `b1eb8c04` Lazy-load dev libs and update scan time
- `a4824f1e` Support model context/features and history delete
- `fb9c4d7f` Add business_scenarios views, menu & styles

## 详细更新

### More / 业务场景页

- 新增 `business_scenarios` 业务场景模块入口，并接入 More 模块菜单与 overview 页面。
- 新增 5 个业务场景页面：
  - `usage_notice`：使用须知与场景说明
  - `review_monitor`：评论监控场景
  - `ad_acos_diagnosis`：广告 ACOS 诊断场景
  - `amazon_daily_report`：Amazon 日报场景
  - `bad_review_response`：差评回复场景
- 新增 `casePageRenderer`，统一业务场景页的渲染结构、内容区块、操作入口和页面组织方式。
- 新增/扩展 `more_style.css`，补充业务场景页需要的布局、卡片、表单、提示区和响应式样式。
- 更新 `menuConfig`、`module.loaders.ts`、`module.manifest.ts`，确保新页面可以通过现有模块加载与导航体系访问。

### 模型配置与系统设置

- 扩展模型配置常量与类型定义，支持模型 context、features 等元数据。
- 更新系统设置面板的模型展示与配置逻辑，增强模型能力信息在 UI 中的表达。
- 更新 `llmService` 对模型元数据的读取和测试覆盖，降低模型配置变化时的回归风险。
- 新增 `providerModels.test.ts` 与 `systemSettingsModelMetadata.test.ts`，覆盖 provider/model 元数据、系统设置展示和能力字段。

### Scraper 历史记录管理

- 为 Master Analysis / Scraper 历史记录补充删除能力。
- 更新 `HistoryPanel`、`ScraperPanel` 和 scraper template，提供历史项删除入口和状态同步。
- 扩展 `historyService`，补充删除逻辑及对应单元测试。
- 更新相关状态类型，保证历史记录删除与现有数据结构一致。

### 加载性能与资源组织

- 将非关键 CSS 拆入 `src/css/deferred.css`，减少主样式包压力。
- 更新 `main.ts`，延迟加载非关键样式和开发辅助库。
- 调整 `homeDisplay.css` 与 `main.css`，把不必阻塞首屏的样式移出主链路。
- 优化开发工具库加载路径，避免不必要的初始加载开销。

### 安全扫描与质量验证

- 本地执行 `npm run build` 已完整通过。
- XSS gate：扫描 352 个 `src` 文件，0 findings，13 audited skips，0 clear-DOM skips。
- Circular dependency check：Madge 处理 350 个文件，未发现循环依赖，保留 1 条非阻断 warning。
- Type check：通过。
- ESLint：通过。
- ESLint warning gate：`0/0 warning(s)`。
- Vite production build：通过，Vite v8.0.16，构建耗时约 11.67s。

## 已知非阻断提示

- 构建仍提示部分插件耗时较高，主要集中在 terser、CSS post-processing 和 asset 阶段。
- `deep-chat` 等少数 chunk 仍超过 300 kB；当前不阻断发布，后续可继续按页面或功能拆包优化。
- `package.json` 内部包版本字段仍为历史值 `1.0.0`，本次 GitHub 发布版本以 tag/release `v3.0.2` 为准。

## [3.0.1-rc.4] - 2026-06-09

> Historical notes imported from GitHub Release `v3.0.1-rc.4` (2026-06-09).

## 版本定位

`v3.0.1-rc.4` 是 `v3.0.1` 的第 4 个候选版本，定位为进入正式版前的稳定性、构建链路和质量基线强化版本。

- 发布分支：`main`
- 目标提交：`045cd3224ff39cdc3cd43d7996adebce0796c468`
- 对比基线：`v3.0.1-rc.3`
- 变更规模：9 个提交，234 个文件变更，约 18,570 行新增 / 14,441 行删除

## 关键提交

- `12536688` Tech-debt audit, CSS analysis, replace xlsx
- `669a716c` Upgrade Vite/Vitest/esbuild & update docs/tests
- `9a234ec4` Reduce ESLint baseline and add safe rendering
- `a8f7c284` Update ESLint baseline, add tests & docs edits
- `85e960f6` Refactor preview extractor and product card
- `f17872a4` Refactor analysis services/adapters; add modal close
- `fc8f22cf` Refactor report generator & LLM API; add tests
- `11f723d5` Refactor logging, errors, and core service setup
- `045cd322` Quiet logs, enhance EventBus, update Vite config

## 详细更新

### 构建链路与依赖

- 升级前端构建与测试工具链：Vite `^8.0.16`、Vitest `^4.1.8`、esbuild `^0.27.3`。
- 更新根级 `vite.config.js` 与 `config/vite.config.js`，同步构建配置、开发服务器和产物配置。
- 调整 `package-lock.json` 与依赖树，减少历史依赖负担，并替换高风险/维护成本较高的表格处理依赖路径。
- 新增/更新 `public/_headers`，补充静态发布环境相关响应头配置。

### 质量基线、安全扫描与审计文档

- 将 ESLint warning baseline 进一步压降到 `0/0 warning(s)`，把 warning gate 固化为发布阻断项。
- 更新 XSS 扫描报告与质量检查脚本，本轮扫描范围为 `src/` 下 341 个文件，结果为 0 命中。
- 增补技术债审计、CSS module 分析、UI/UX 视觉审计和修复 backlog 文档，方便后续正式版前继续跟踪风险。
- 调整 `.gitignore` 与质量脚本输出管理，避免临时审计产物和构建副作用污染发布内容。

### 安全渲染与模块加载

- 强化 `SafeModuleLoader`、`SafeRenderer`、`BaseModule`、`StandardModule` 相关安全渲染路径。
- 拆分并补充 `module.loaders.ts`，替代旧的 manifest 聚合方式，降低模块加载耦合。
- 更新导航、搜索、sidebar、overview、modal、loading 等公共 UI 初始化与挂载流程，减少直接 DOM 注入和不安全渲染入口。
- 补充 `safeMount`、`security`、`xssFixer` 相关调整，与 XSS gate 保持一致。

### Core services、事件与日志

- 重构 core service bootstrap、DI service registry、错误模型和全局错误处理路径。
- 增强 `EventBus` 行为和单元测试覆盖，改善事件订阅、派发和清理逻辑。
- 收敛 logger、errorService、monitoring、performance、web vitals 等运行期服务日志噪声，减少开发和生产环境无效输出。
- 更新 HTTP、缓存、存储、LLM timeout、本地数据存储等服务的边界处理与测试覆盖。

### Master Analysis、PromptLab 与数据处理

- 重构 Master Analysis 相关 analysis services/adapters，覆盖 full analysis、competitor report、product overview、semantic analysis 等适配路径。
- 更新 report generator 与 LLM API 调用链，补充报告生成和 AI analysis service 单元测试。
- 优化 PromptLab preview extractor、report renderer、product card 与 prompt actions，提升预览抽取和报告展示稳定性。
- 调整 scraper import handler、data operations、renderers、validators、history panel 和 data preview，补充文件导入读取、处理和回归测试。
- 更新 PPC search terms、NPI tracker、restricted words 等业务模块的渲染、数据处理与测试。

### UI 与交互稳定性

- 修复/增强 `AppModal` 关闭行为并补充 regression test。
- 更新 skeleton loader、navigation animation、button ripple、modal animation、settings panel 等通用交互组件。
- 增补 PerformanceSettings、promo tools、scraper modal、parser service、ParamParser 等测试，覆盖更多用户路径和边界行为。

## 验证结果

已在本地执行 `npm run build`，完整通过：

- XSS gate：341 个文件，0 findings，13 audited skips，0 clear-DOM skips
- Circular dependency check：通过，Madge 处理 343 个文件，保留 1 条非阻断 warning
- Type check：通过
- ESLint：通过
- ESLint warning gate：`0/0 warning(s)`
- Vite production build：通过，Vite v8.0.16，构建耗时约 11.46s

## 已知非阻断提示

- Vite 构建仍存在部分插件耗时提示。
- 部分 chunk 超过 300 kB，当前未作为发布阻断项；后续可继续拆包或按页面级懒加载优化。
- Madge 保留 1 条 warning，本轮没有发现阻断发布的循环依赖问题。

## [3.0.1-rc.3] - 2026-06-08

> Historical notes imported from GitHub Release `v3.0.1-rc.3` (2026-06-08).

## 版本定位

`v3.0.1-rc.3` 是 `v3.0.1` 的第三个候选版本，基于 `v3.0.1-rc.2` 继续补充运行时版本标识、视图缓存版本化、Scraper UI、持久化修复，以及 AMZ Hub 官方数据指导内容。

Release 指向提交：`c30fbc6ea96ad4262f231a8fd39a72473a952b95`。

## 新增提交

- `13f614ff` Add runtime app version & view cache versioning
- `13f04743` Update scraper UI, store persistence and tests
- `c30fbc6e` Expand AMZ Hub official-data guidance

## 主要变化

- 增加运行时 app version 信息，便于版本识别和排查。
- 增加 view cache versioning，降低旧视图缓存影响新版本的风险。
- 更新 scraper UI 和 store persistence 相关逻辑。
- 补充/更新对应测试。
- 扩展 AMZ Hub 知识页内容：EU Insights 与 SEO Strategy 增加 Amazon 官方数据入口、SEO/本地化执行框架、周度运营闭环和官方参考链接。

## 验证状态

`npm run build` 已通过。

通过项包括：

- XSS gate
- 循环依赖检查
- TypeScript type-check
- ESLint 本体检查
- ESLint warning gate
- Vite build

保留既有非阻断 warning：Madge warning、ESLint baseline 内 warning、Vite chunk size / dynamic import warning。

## 说明

这是 prerelease，用于 rc.3 验收与部署前回归。此 release 的 tag 已从原 `13f04743` 更新到 `c30fbc6e`，以包含本次补充提交。

## [3.0.1-rc.2] - 2026-06-08

> Historical notes imported from GitHub Release `v3.0.1-rc.2` (2026-06-08).

## 版本定位

`v3.0.1-rc.2` 是 `v3.0.1` 的第二个候选版本，使用正确的 prerelease 版本号格式，替代此前误命名的 `v3.0.1-rc2`。

Release 指向提交：`5335215ed58e1db09ff1e41cd5bbcbb5ab844554`。

## 新增提交

- `797a7afd` Add ERP campaign report type & XLSX import
- `b9826869` Add PPC Agent flow and reviewed UI
- `dc8a38d0` Support ERP search-term reports; update Agent Center
- `5335215e` Fix PPC search terms warning gate

## 主要变化

- 增加 ERP campaign 报告类型识别和 XLSX 导入能力。
- 增加 PPC Agent 流程与 reviewed UI 状态。
- 支持 ERP search-term reports，并更新 Agent Center 入口与展示。
- 拆分 PPC 搜索词分析中的复杂逻辑，修复 ESLint warning gate 失败。

## 验证状态

`npm run build` 已通过。

通过项包括：

- XSS gate
- 循环依赖检查
- TypeScript type-check
- ESLint 本体检查
- ESLint warning gate
- Vite build

保留既有非阻断 warning：Madge warning、ESLint baseline 内 warning、Vite chunk size / dynamic import warning。

## 说明

这是 prerelease，用于 rc.2 验收与部署前回归。此前错误命名的 `v3.0.1-rc2` 不再作为推荐版本使用。

## [3.0.1-rc] - 2026-06-07

> Historical notes imported from GitHub Release `v3.0.1-rc` (2026-06-07).

## 版本定位

`v3.0.1-rc` 是当前 `main` 分支的候选发布版本，用于主线验收、Cloudflare Pages 部署前回归和后续稳定版整理。本次仅补齐 GitHub release/tag 元数据，未修改 `package.json` 的包版本。

Release 指向提交：`11d2c78b17c38c015328a04d48035eacae93753e`。

## 主线审计结论

- `main` 工作区干净，并与远端 `sops/main` 同步。
- 当前仓库此前没有 GitHub release 或 version tag。
- `npm run build` 已通过：XSS gate、循环依赖检查、type-check、lint warning gate、Vite build 均完成。
- 保留既有 warning：ESLint warning baseline、Madge warning、Vite chunk size / dynamic import warning，未阻断本次 rc 发布。

## 关键提交节点

### 业务与 AI 功能

- `11d2c78b` Integrate LLM analysis for PPC search terms
- `829b42f1` feat(app-center): add PPC search terms analyzer
- `b24d4441` Improve deep-chat empty state and layout
- `fdae3252` Extract deep-chat conversation context & add tests
- `422a9904` Add Playground module to App Center
- `8dc0a07d` Promptlab: add reports, UI/service updates, tests
- `c60f5050` Add granular 3-level report selection UI
- `f5cbd6c0` feat: AI 智能分析性能优化 - 并行分析引擎
- `2ee7ea97` feat: 实现产品DNA自动提取功能

### 架构、安全与质量

- `028ff66a` Replace innerHTML with safe mount + retry UI
- `734d70f1` Refactor ModuleLoader; add Alpine lifecycle & tests
- `d6d511df` Add CI quality gate, ESLint XSS rules and docs
- `f621b8cb` Add XSS scan report & scanner; adjust lint and UI
- `f16010f4` Migrate to @alpinejs/csp and remove user guide
- `b8408d3f` Introduce LocalDataStore and async storage
- `d02f6c35` feat: 完成路由系统迁移至 Navigo (Week 1-5)
- `9b978a27` Merge: 架构债务消除 - 统一错误处理和存储访问
- `a604de15` 代码质量改进和 CSS 设计令牌迁移 (#28)

### 云部署与网关

- `4a4720b7` Fix CSS build and API authentication for Cloudflare Pages
- `af3b29df` ci: add cloudflare pages deploy workflow
- `52f4836a` feat: implement gateway auto-discovery system
- `f8bbadf6` feat: switch to optimized gateway APIs
- `c8f5cc94` feat: integrate frontend gateway service
- `8576ff29` Add ChatAnywhere support & CF env deploy script
- `0e465322` Add CB (cb2api) provider and endpoint

### 产品内容与体验

- `c2c18453` Revamp welcome banner styles and UI polish
- `ca66b303` refactor: 重构 welcome banner 配色方案，提升可读性和无障碍性
- `fc54a25c` feat(sops): 添加欧洲GPSR合规SOP模块
- `c3ea6cbf` 新增'新品30天极速突围'页面
- `f63e3bb5` Add Keyword Index Check panel to SEO template
- `26d01e73` Add dual-page guide UI to promo pages

## Release 说明

- 当前版本定位为 Release Candidate，适合验收、演示和部署前回归，不直接作为长期稳定基线。
- 下一步稳定版建议在确认既有 warning 风险后发布 `v3.0.1`。

## Cloudflare Pages 对照

Cloudflare Pages 项目核对：未发现 `spos` 项目，实际项目为 `sops`，域名包括 `sops-3js.pages.dev` 和 `sops.hongecb.store`。最近生产部署 source 覆盖 `f16010f`、`f621b8c`、`3f778dd`、`734d70f`、`625f6d2`、`7d0fd7f`、`829b42f`、`c2c1845` 等节点。

审计时最新 Cloudflare Pages 部署 source 为 `c2c1845`，对应 `v3.0.1-beta.1`。`v3.0.1-rc` tag 指向 `11d2c78b17c38c015328a04d48035eacae93753e`，该提交已作为 GitHub release candidate 标记，但未在 Wrangler 最近部署列表中观察到对应生产部署记录。

## [3.0.1-beta.1] - 2026-06-07

> Historical notes imported from GitHub Release `v3.0.1-beta.1` (2026-06-07).

## 历史版本定位

历史日期：2026-06-08
Target commit：`c2c18453b0b3a25b7511d3abf89e2b002f749ab5`

v3.0.1 beta 节点，完成 welcome banner 样式重做和 UI polish。

关键 commit：`c2c18453` Revamp welcome banner styles and UI polish。

## Cloudflare Pages 对照

Cloudflare Pages `sops` recent deployment source observed: `c2c1845`; this was the latest observed Cloudflare deployment during this audit.

## [3.0.1-alpha.2] - 2026-06-07

> Historical notes imported from GitHub Release `v3.0.1-alpha.2` (2026-06-07).

## 历史版本定位

历史日期：2026-06-07
Target commit：`829b42f15fbd71a45272edd1dab3e58d6a94b3d6`

PPC Search Terms Analyzer 首次进入应用中心。

关键 commit：`829b42f1` feat(app-center): add PPC search terms analyzer。

## Cloudflare Pages 对照

Cloudflare Pages `sops` recent deployment source observed: `829b42f`.

## [3.0.1-alpha.1] - 2026-06-07

> Historical notes imported from GitHub Release `v3.0.1-alpha.1` (2026-06-07).

## 历史版本定位

历史日期：2026-06-07
Target commit：`7d0fd7f36d3c51682d716f0cc4783000e72d1584`

v3.0.1 候选线的第一个 alpha，补入 onboarding checklist 和 UI tweaks。

关键 commit：`7d0fd7f3` Add onboarding checklists and UI tweaks。

## Cloudflare Pages 对照

Cloudflare Pages `sops` recent deployment source observed: `7d0fd7f`.

## [3.0.0] - 2026-06-07

> Historical notes imported from GitHub Release `v3.0.0` (2026-06-07).

## 历史版本定位

历史日期：2026-06-07  
Target commit：`625f6d2e8f3865b2b81969313248d5720f99a352`

`v3.0.0` 标记 CSP 迁移、安全扫描、CI 质量门禁、LocalDataStore 和 ModuleLoader 生命周期进入新的安全与架构基线。后续 `v3.0.1-rc` 在此基础上加入 PPC 搜索词分析和 LLM 分析集成。

## 关键提交

- `b8408d3f` Introduce LocalDataStore and async storage
- `f16010f4` Migrate to @alpinejs/csp and remove user guide
- `f621b8cb` Add XSS scan report & scanner; adjust lint and UI
- `d6d511df` Add CI quality gate, ESLint XSS rules and docs
- `734d70f1` Refactor ModuleLoader; add Alpine lifecycle & tests
- `028ff66a` Replace innerHTML with safe mount + retry UI
- `625f6d2e` Refactor module manifests and CI workflows

## [2.7.0] - 2026-06-07

> Historical notes imported from GitHub Release `v2.7.0` (2026-06-07).

## 历史版本定位

历史日期：2026-06-07
Target commit：`734d70f1deb99a6530cf8a450efadf7490bfebab`

ModuleLoader、Alpine 生命周期和相关测试进入新的运行时加载基线。

关键 commit：`734d70f1` Refactor ModuleLoader; add Alpine lifecycle & tests。

## Cloudflare Pages 对照

Cloudflare Pages `sops` recent deployment source observed: `734d70f`.

## [2.6.0] - 2026-06-07

> Historical notes imported from GitHub Release `v2.6.0` (2026-06-07).

## 历史版本定位

历史日期：2026-06-07
Target commit：`3f778dde63c3d5b8f330ed3360b68e5055e038e1`

补齐 ESLint warning baseline 和 CI gate，使质量门禁可以稳定执行。

关键 commit：`d6d511df` CI quality gate；`3f778dde` Add ESLint warning baseline and CI gate。

## Cloudflare Pages 对照

Cloudflare Pages `sops` recent deployment source observed: `3f778dd`.

## [2.5.0] - 2026-06-07

> Historical notes imported from GitHub Release `v2.5.0` (2026-06-07).

## 历史版本定位

历史日期：2026-06-06
Target commit：`f621b8cb62e1289fd57df2af8890057fc198e62e`

新增 XSS 扫描报告与扫描器，安全审计开始进入可自动化门禁。

关键 commit：`f621b8cb` Add XSS scan report & scanner; adjust lint and UI。

## Cloudflare Pages 对照

Cloudflare Pages `sops` recent deployment source observed: `f621b8c`.

## [2.4.0] - 2026-06-07

> Historical notes imported from GitHub Release `v2.4.0` (2026-06-07).

## 历史版本定位

历史日期：2026-06-05
Target commit：`f16010f410bfc0188276152ed87ec07a0c1d8210`

迁移到 @alpinejs/csp，移除用户指南，进入 CSP 安全收敛阶段。

关键 commit：`f16010f4` Migrate to @alpinejs/csp and remove user guide。

## Cloudflare Pages 对照

Cloudflare Pages `sops` recent deployment source observed: `f16010f`.

## [2.3.0] - 2026-06-07

> Historical notes imported from GitHub Release `v2.3.0` (2026-06-07).

## 历史版本定位

历史日期：2026-06-05
Target commit：`b8408d3fed75b62b0340c7d2e05d4c0a68016c18`

引入 LocalDataStore 和异步存储能力，为后续 CSP、安全与模块加载收敛铺底。

关键 commit：`b8408d3f` Introduce LocalDataStore and async storage。

## [2.2.0] - 2026-06-07

> Historical notes imported from GitHub Release `v2.2.0` (2026-06-07).

## 历史版本定位

历史日期：2026-05-20  
Target commit：`b24d44418c02483479615961d09f177ac12e8cb4`

`v2.2.0` 标记 Deep Chat 从 Playground 演进为应用中心能力，并补齐线程上下文、消息工具和空状态体验。

## 关键提交

- `422a9904` Add Playground module to App Center
- `8a67d325` Rename Playground to Deep Chat; routes & thread store
- `b4bab6bb` Use Deep Chat playground with message tools
- `fe454b7d` Merge thread history with request messages
- `fdae3252` Extract deep-chat conversation context & add tests
- `b24d4441` Improve deep-chat empty state and layout

## [2.1.3] - 2026-06-07

> Historical notes imported from GitHub Release `v2.1.3` (2026-06-07).

## 历史版本定位

历史日期：2026-05-20
Target commit：`fdae32527a347a81235d2e0194ae90c8568b85dd`

Deep Chat 线程历史合并、上下文抽取和测试补齐。

关键 commit：`fe454b7d` Merge thread history with request messages；`fdae3252` Extract deep-chat conversation context & add tests。

## [2.1.2] - 2026-06-07

> Historical notes imported from GitHub Release `v2.1.2` (2026-06-07).

## 历史版本定位

历史日期：2026-05-20
Target commit：`8a67d325f8696951e514717abca119801048badc`

Playground 重命名为 Deep Chat，并补齐路由和线程存储。

关键 commit：`8a67d325` Rename Playground to Deep Chat; routes & thread store；`b4bab6bb` message tools。

## [2.1.1] - 2026-06-07

> Historical notes imported from GitHub Release `v2.1.1` (2026-06-07).

## 历史版本定位

历史日期：2026-05-20
Target commit：`422a9904de03b6a9d59472f826869db4afe1e690`

应用中心新增 Playground 模块，作为 Deep Chat 演进的起点。

关键 commit：`422a9904` Add Playground module to App Center。

## [2.1.0] - 2026-06-07

> Historical notes imported from GitHub Release `v2.1.0` (2026-06-07).

## 历史版本定位

历史日期：2026-05-01  
Target commit：`11c5d41b2ff3752dcc6f271194a9b5844589e634`

`v2.1.0` 标记 PromptLab 报告能力、历史处理、构建路径和 NEW API 模型配置的一组增量稳定更新。

## 关键提交

- `afb1d2a8` Cleanup docs, tools, and remove backups
- `094829da` Remove CPA gateway and update gateway examples
- `d735baa4` Improve history handling and increase limit to 50
- `ab06e385` Add timing headers & fix build script paths
- `8dc0a07d` Promptlab: add reports, UI/service updates, tests
- `11c5d41b` Update NEW API models, env, and docs

## [2.0.0] - 2026-06-07

> Historical notes imported from GitHub Release `v2.0.0` (2026-06-07).

## 历史版本定位

历史日期：2026-04-17  
Target commit：`9f143cf7967025dd4d551b665b7cbf77e8b07649`

`v2.0.0` 标记项目文档重构、LLM 网关优化、安全凭据清理和 Master Analysis 范围收敛后的主版本基线。

## 关键提交

- `ed5ac629` Docs overhaul, changelog added, project renamed
- `52f4836a` feat: implement gateway auto-discovery system
- `f8bbadf6` feat: switch to optimized gateway APIs
- `c8f5cc94` feat: integrate frontend gateway service
- `baa21809` security: remove hardcoded password from wrangler.toml
- `e714566e` security: remove all hardcoded credentials from documentation
- `c60f5050` Add granular 3-level report selection UI
- `9f143cf7` refactor: remove Q&A预研 (QALab) module from Master Analysis

## [1.4.0] - 2026-06-07

> Historical notes imported from GitHub Release `v1.4.0` (2026-06-07).

## 历史版本定位

历史日期：2026-04-15
Target commit：`4a4720b75820f78ddb7715aa011f6d2b51aeeb52`

完成 legacy gateway 替换后的 Cloudflare Pages CSS 构建和 API 认证修复。

关键 commit：`c6d6f9c1` Replace legacy gateways with new_api and cpa；`4a4720b7` Fix CSS build and API authentication for Cloudflare Pages。

## [1.3.0] - 2026-06-07

> Historical notes imported from GitHub Release `v1.3.0` (2026-06-07).

## 历史版本定位

历史日期：2026-03-29
Target commit：`8576ff29158fb86ed1d63910695ad13b4b6a8b9b`

补入 ChatAnywhere 支持，并加入 Cloudflare env 部署脚本。

关键 commit：`8576ff29` Add ChatAnywhere support & CF env deploy script；`a546152f` Centralize CORS headers。

## [1.2.0] - 2026-06-07

> Historical notes imported from GitHub Release `v1.2.0` (2026-06-07).

## 历史版本定位

历史日期：2026-03-28
Target commit：`3f576833da743a097d5fb105efd337328d3989e0`

LLM 网关开始多 provider、多路由和 AUTH_PASSWORD 检查的基础演进。

关键 commit：`0e465322` CB provider；`3f576833` multi-gateway routing and AUTH_PASSWORD checks。

## [1.1.0] - 2026-06-07

> Historical notes imported from GitHub Release `v1.1.0` (2026-06-07).

## 历史版本定位

历史日期：2026-03-24  
Target commit：`04b58fd8472b3b8dbcbd8f6a6cb36e44936d7992`

`v1.1.0` 标记 Cloudflare Pages CI/构建链路修复完成，并补入 SEO Keyword Index Check 能力。

## 关键提交

- `f63e3bb5` Add Keyword Index Check panel to SEO template
- `af3b29df` ci: add cloudflare pages deploy workflow
- `345943dd` build: fix vite alias resolution for pages
- `46cb1a27` build: make vite aliases explicit for pages
- `d5088be5` fix(pages): preserve static asset routes
- `04b58fd8` fix(build): resolve tailwind scan paths for pages

## [1.0.1] - 2026-06-07

> Historical notes imported from GitHub Release `v1.0.1` (2026-06-07).

## 历史版本定位

历史日期：2026-03-24
Target commit：`f63e3bb5796777f5e81c19fee64fc2e9086c2f23`

在 SEO 模板中补入 Keyword Index Check panel，作为 v1.1 部署基线前的功能补丁。

关键 commit：`f63e3bb5` Add Keyword Index Check panel to SEO template。

## [1.0.0] - 2026-06-07

### Added

- 完整的设计令牌系统
  - 300+ 个设计令牌统一管理
  - 自动生成 CSS 变量、Tailwind 配置和 TypeScript 类型
  - 17 种颜色方案，11 级梯度
- 依赖注入容器系统
  - 核心服务和业务服务的集中管理
  - 服务生命周期管理
- 模块化架构
  - BaseModule 基类提供统一生命周期
  - 自动资源清理
  - 模块懒加载支持
- 路由系统
  - 基于 Navigo 的现代化路由
  - 路由预加载
  - 模块生命周期集成
- 完整的测试套件
  - Vitest 单元测试
  - Playwright E2E 测试
  - 性能测试
  - 视觉回归测试
- 代码质量工具
  - ESLint 代码检查
  - Prettier 代码格式化
  - TypeScript 严格模式
  - 技术债务扫描工具
  - CSS 变量审查和迁移工具
- 安全特性
  - XSS 防护
  - CSRF 防护
  - 内容安全策略（CSP）
  - 安全审计工具

### Changed

- 采用 Vite 作为构建工具
- 使用 Alpine.js 作为响应式框架
- 使用 Tailwind CSS 作为 CSS 框架
- 使用 Zustand 进行状态管理

### Architecture

- 实现事件总线系统（EventBus）
  - 替代 window.dispatchEvent
  - 类型安全的事件系统
  - 内存泄漏检测
- 实现结构化错误处理
  - ValidationError - 验证错误
  - ApiError - API 错误
  - BusinessError - 业务逻辑错误
  - SystemError - 系统错误
- 实现 StorageService
  - 类型安全的 localStorage 封装
  - 自动序列化/反序列化
- 实现 Logger 服务
  - 统一的日志记录
  - 日志级别控制
  - 性能监控集成

### Documentation

- 添加 CLAUDE.md 开发指南
- 添加 CSS 架构系统文档
- 添加最佳实践文档
- 添加 API 文档
- 添加测试指南
- 添加故障排查指南

### Performance

- CSS 代码分割
- 模块懒加载
- 资源压缩（Gzip + Brotli）
- Tree Shaking
- 关键 CSS 内联
- 图片懒加载
- 路由预加载

### Technical Debt

- 完成错误处理标准化（100%）
- 完成内存泄漏修复（100%）
- 完成事件机制迁移（56%）
- 架构债务整体完成率：79%

## [0.9.6] - 2026-06-07

> Historical notes imported from GitHub Release `v0.9.6` (2026-06-07).

## 历史版本定位

历史日期：2026-03-18
Target commit：`256c0f86f46dd7dd0a3da03bbacb6b0b50dd1926`

欢迎横幅视觉、可读性和无障碍配色完成阶段性升级。

关键 commit：`ca66b303` welcome banner 配色重构；`256c0f86` 合并 branch3-17welcome。

## [0.9.5] - 2026-06-07

> Historical notes imported from GitHub Release `v0.9.5` (2026-06-07).

## 历史版本定位

历史日期：2026-03-14
Target commit：`dbb8516df43a58a947945ea9f1fcc76bde2beb66`

完成错误处理、存储访问、事件机制和动画生命周期的一组架构债务收敛。

关键 commit：`9b978a27` 架构债务消除；`dbb8516d` 动画系统事件机制配对修复。

## [0.9.4] - 2026-06-07

> Historical notes imported from GitHub Release `v0.9.4` (2026-06-07).

## 历史版本定位

历史日期：2026-03-13
Target commit：`2ce494ac40d71579ba71733870332015f919e436`

AI 智能分析进入并行分析引擎阶段，并补充交付文档。

关键 commit：`f5cbd6c0` 并行分析引擎；`2ce494ac` 合并 branch3-13。

## [0.9.3] - 2026-06-07

> Historical notes imported from GitHub Release `v0.9.3` (2026-06-07).

## 历史版本定位

历史日期：2026-03-07
Target commit：`467121e4fa77e02d76a0c764b03f951f874ef573`

产品 DNA 提取器完成技术债务修复、路径别名补齐和单元测试补充。

关键 commit：`467121e4` Merge branch3-6 - DNA 提取器技术债务修复完成。

## [0.9.2] - 2026-06-07

> Historical notes imported from GitHub Release `v0.9.2` (2026-06-07).

## 历史版本定位

历史日期：2026-03-06
Target commit：`a604de1508871da37e7ff4904048fbba2665c3d1`

补齐代码质量改进和 CSS 设计令牌迁移，为后续架构基线收敛做准备。

关键 commit：`a604de15` 代码质量改进和 CSS 设计令牌迁移 (#28)。

## [0.9.1] - 2026-06-07

> Historical notes imported from GitHub Release `v0.9.1` (2026-06-07).

## 历史版本定位

历史日期：2026-02-28
Target commit：`6959c6df1affffb194d5d44e4886207c67c1ea86`

集中修复前端显示、加载动画、QALab 样式和操作按钮问题。

关键 commit：`6959c6df` 合并 branch2-28，覆盖页面显示和 Q&A 预研体验修复。

## [0.9.0] - 2026-06-07

> Historical notes imported from GitHub Release `v0.9.0` (2026-06-07).

## 历史版本定位

历史日期：2026-02-21  
Target commit：`0e55dc2128048d766c5347b1fc4e6456fd2d7182`

`v0.9.0` 标记早期生产可用性修复、测试基础设施和 PromptLab 容器污染修复后的候选稳定基线。

## 关键提交

- `68bd0d0d` Merge branch 'feature/data-collection-integration'
- `19e382c8` Merge branch2-21: 修复生产环境页面显示问题
- `27b03dc3` feat: 系统稳定性优化 - 添加测试框架和基础设施改进
- `0e55dc21` Merge branch2-21: 修复Promptlab默认勾选和容器污染问题

## [0.8.0] - 2026-06-07

> Historical notes imported from GitHub Release `v0.8.0` (2026-06-07).

## 历史版本定位

历史日期：2026-02-18
Target commit：`68bd0d0d3f91f0347413c8454e42f4633f7f21c3`

合并数据采集集成分支，进入 v0.9 生产稳定化之前的功能集成节点。

关键 commit：`68bd0d0d` Merge branch feature/data-collection-integration。

## [0.2.0] - 2026-06-07

> Historical notes imported from GitHub Release `v0.2.0` (2026-06-07).

## 历史版本定位

历史日期：2026-01-22
Target commit：`68ca6cadb0f58488d5b1504bace844087e826890`

合并早期 branch1-21 主线工作，作为一月迭代后的可追溯节点。

关键 commit：`68ca6cad` Merge pull request #8 from earshore/branch1-21。

## [0.1.0] - 2026-06-07

### Added

- 初始项目结构
- 基础模块系统
- 基础路由系统
- 基础样式系统

---

## 版本说明

### 版本号规则

- **主版本号（Major）**: 不兼容的 API 修改
- **次版本号（Minor）**: 向下兼容的功能性新增
- **修订号（Patch）**: 向下兼容的问题修正

### 变更类型

- **Added**: 新增功能
- **Changed**: 功能变更
- **Deprecated**: 即将废弃的功能
- **Removed**: 已移除的功能
- **Fixed**: 问题修复
- **Security**: 安全相关修复

---

**维护者**: sops 开发团队  
**最后更新**: 2026-04-17
