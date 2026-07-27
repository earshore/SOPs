# Deep Chat 图片上传（Vision Attachments）企业级 UX 设计草案

**Date:** 2026-07-27  
**Status:** draft (awaiting UI design polish → review → formal spec → plan → production gate)  
**Scope:** Deep Chat 输入框图片附件的能力、UI 入口、交互、校验、反馈、持久化边界与验收标准  
**Out of scope (本迭代明确不做):** 通用文件（PDF/文档）、相机、麦克风、GIF、云端附件存储、跨会话图片记忆回放原图  

---

## 0. 背景与问题陈述

### 0.1 现状（已实现）

- 能力边界：**仅图片 vision**，非通用文件上传。
- 门控：模型 `supportsVision` 时开启 deep-chat `images`；其余多媒体入口关闭。
- 硬限制：单轮最多 4 张、单图 5MB；纯图回合文本占位 `[图片]`。
- 请求路径：files → `visionUserParts`（`input_image`）当轮透传 chat/responses/多协议。
- 安全决策：base64 **禁止**写入 thread / localStorage。
- UI：几乎完全依赖 deep-chat 原生上传钮 + 附件条；项目侧仅 CSS 显示/隐藏。

### 0.2 缺口（审查结论）

| ID | 缺口 | 影响 |
| --- | --- | --- |
| G1 | 限制不可预期（4 张 / 5MB 无常驻说明） | 用户在发送时才失败 |
| G2 | 无单次请求总 payload 上限 | 4×5MB base64 易超时/413 |
| G3 | 上传钮 / 附件条未接入设计 token | 与发送钮、输入框视觉脱节 |
| G4 | 非 vision 模型无解释性空态 | 「为什么没有上传」不可发现 |
| G5 | 校验偏晚（体积/类型主要在 prepare） | 选图后无即时反馈 |
| G6 | 草稿不保留附件；切模型后附件残留语义不清 | 状态错乱 |
| G7 | 历史只剩文本/`[图片]` | 会话回顾与追问丢视觉上下文（产品已知取舍，需诚实呈现） |
| G8 | a11y：英文 tooltip、触控目标未统一 | 企业可访问性不足 |
| G9 | SVG 扩展名允许 | 潜在 XSS 面 |
| G10 | 与 Skill Chip / 增高 draft 布局未专项设计 | 可能挤压错位 |

### 0.3 目标用户与场景

- **用户:** 运营同学在 Deep Chat 中用多模态模型分析 Listing 截图、竞品图、后台报表截图。
- **成功:** 在支持 vision 的模型下，3 步内完成「选图 → 确认限制 → 发送」；失败原因可读、可恢复；刷新后不炸 localStorage。

---

## 1. 产品原则与非目标

对齐 `docs/PRODUCT_PRINCIPLES.md`：

| 原则 | 本功能含义 |
| --- | --- |
| 工具优先 | 清晰入口与状态，不搞上传动画秀 |
| 本机数据诚实 | 明确「图片仅当轮发送，不写入本机会话存储」 |
| 即时反馈 | 选图即时校验；限制可见 |
| 少打断 | 无多余 modal；info 用 inline helper / toast |
| 危险可感知 | 超限、非 vision、总大小超限明确文案 |

**非目标（YAGNI）:**

- 不做 PDF/Office 解析管线。
- 不做 IndexedDB 原图长期缓存（可作为 P2 可选，本迭代不做）。
- 不做服务端对象存储。
- 不改造 deep-chat 库源码；通过配置 + `auxiliaryStyle` + 可选 host 侧 chrome 完成。

---

## 2. 方案选型（3 种路径）

### 方案 A — 纯 deep-chat 配置增强（最小）

- 仅调 `images.files`、`button.tooltip`、`infoModal`、少量 CSS。
- **优点:** 改动面最小。  
- **缺点:** 即时体积校验、总 payload、布局与 Skill Chip 仍弱；难以企业级。

### 方案 B — 配置 + 请求侧 hardening + 样式 token 化（推荐）

- UI：deep-chat 图片入口保留；token 化上传钮/附件条；inline 限制文案；中文 a11y。
- 逻辑：选图/发送双阶段校验；总 payload cap；排除 SVG；模型切换清理或提示。
- 历史：元数据诚实展示（「已附 N 张图 · 原图未保存」），仍不落 base64。
- **优点:** 与现有架构契合；安全边界不变；可达生产级。  
- **缺点:** 需 shadow DOM 样式与少量 host chrome 协调。

### 方案 C — 自建 Composer 附件层（替换 deep-chat 上传）

- 完全自定义 file input + preview strip，绕过 deep-chat attachments。
- **优点:** UI 完全可控。  
- **缺点:** 与库提交链路、粘贴/拖放、消息气泡展示耦合重；成本高、回归面大。

**推荐: 方案 B。** 在不重写库的前提下达到企业生产级；P2 再评估 C。

---

## 3. 目标架构（方案 B）

```
┌─────────────────────────────────────────────────────────┐
│ Composer (deep-chat shadow + host chrome)               │
│  [Skill chips]                                          │
│  [Attachment strip · token styled]                      │
│  [Text input]  [Upload btn] [Send btn]                  │
│  [Helper: 最多4张 · 单张≤5MB · 合计≤12MB · 仅当轮]      │
└───────────────────────┬─────────────────────────────────┘
                        │ on send / on add file
                        ▼
┌─────────────────────────────────────────────────────────┐
│ visionAttachments (pure)                                │
│  · collect candidates (latest user only)                │
│  · validate type / count / per-file / total bytes       │
│  · block svg · optional client downscale (P1 optional)  │
│  · → visionUserParts | typed error                      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ prepareDeepChatRequest → callLLM (当轮 only)            │
│ thread persist: text + optional attachmentMeta (no b64) │
└─────────────────────────────────────────────────────────┘
```

### 3.1 模块职责

| 单元 | 职责 | 不做什么 |
| --- | --- | --- |
| `visionAttachments.ts` | 纯函数校验与 parts 构建；常量 SSOT | 不碰 DOM |
| `deepChatConfig.ts` | `images` 配置、tooltip 中文、infoModal 可选、vision class | 不写业务 toast 文案细节到多处 |
| `deepChatStyles.ts` | 上传钮/附件条/helper 视觉 token | 不藏业务逻辑 |
| `composer/*` 或 `shell` 轻量 hook | 模型切换时附件策略；helper 可见性 | 不复制 deep-chat 附件状态机 |
| `handleRequest.ts` | 接入校验错误 → toast + reject | 不在此做 FileReader |
| `conversationContext` / thread types | 可选 `attachmentMeta` 文本元数据 | 永不存 data URL |

### 3.2 常量（SSOT，实现时单一来源）

| 常量 | 值 | 说明 |
| --- | --- | --- |
| `DEEP_CHAT_VISION_MAX_FILES` | `4` | 已有 |
| `DEEP_CHAT_VISION_MAX_FILE_BYTES` | `5 * 1024 * 1024` | 已有 |
| `DEEP_CHAT_VISION_MAX_TOTAL_BYTES` | `12 * 1024 * 1024` | **新增** 单次请求合计解码后字节 |
| `DEEP_CHAT_VISION_PLACEHOLDER_TEXT` | `'[图片]'` | 已有；历史展示可升级为带 meta 的文案 |
| `DEEP_CHAT_VISION_ACCEPTED` | 明确白名单 | **变更:** 不用裸 `image/*` 放行一切；见下 |

**Accept 白名单（产品决策）:**

- 允许: `image/png`, `image/jpeg`, `image/webp`, `image/gif`（静态 GIF 当图；不开放独立 GIF 按钮）
- 拒绝: `image/svg+xml`、未知类型、非图扩展名
- `acceptedFormats` 字符串建议: `image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif`

---

## 4. 交互设计（功能级，UI 细节由 UI 子代理完善）

### 4.1 入口状态机

| 状态 | 条件 | UI |
| --- | --- | --- |
| **Hidden** | 无配置 / 无模型 | 不显示上传（与现有一致） |
| **Disabled-explained** | 有模型但 `!supportsVision` | **本迭代推荐:** 仍隐藏上传钮（避免假入口），在模型旁或 helper 区可选一行弱文案「当前模型不支持图片」——仅当用户曾尝试粘贴图片时 toast 解释（见 4.3） |
| **Enabled** | `supportsVision` | 显示上传钮 + helper 限制文案 |
| **Busy** | 生成中 | 上传钮 disabled（库行为）或 pointer-events；不新增并行附件编辑 |

**决策（明确）:** 非 vision **默认隐藏**按钮（与现 fail-closed 一致），不采用「灰态可见」以免用户误以为可点。粘贴/拖入非 vision 时 toast 解释。

### 4.2 添加图片路径

1. 点击上传钮 → 系统文件选择（多选，受 max 约束）  
2. 粘贴剪贴板图片（deep-chat 已支持）  
3. 拖放到聊天区域（deep-chat 已支持）  

每条路径最终都进入同一校验：`validateVisionCandidates`（可在 add 时由库 format 过滤 + 发送时完整校验；**本迭代要求发送路径完整校验；若可低成本 hook onInput files 则即时 toast**）。

### 4.3 即时反馈矩阵

| 事件 | 反馈 |
| --- | --- |
| 超过 4 张 | toast warning：`单次最多上传 4 张图片，请减少后重试。`（文案与现有一致） |
| 单张 > 5MB | toast：`图片「{name}」超过 5MB 上限。` |
| 合计 > 12MB | toast：`本轮图片合计超过 12MB，请压缩或减少张数。` |
| 类型不支持（含 SVG） | toast：`不支持的文件类型：…` / 明确「不支持 SVG」 |
| 非 vision 却有图 | toast：`当前模型不支持图片输入，请切换到支持视觉的模型后再试。` |
| 纯图无字 | 允许发送；占位 `[图片]`；UI helper 不强制填字 |
| 成功发送 | 附件从输入区清除（库行为）；历史用户气泡可显示「N 张图片（仅当轮，未保存原图）」若实现 meta |

### 4.4 模型切换

- 切换到非 vision：调用 `applyDeepChatVisionUploadConfig`；**若 composer 仍有附件**，toast 一次：`已切换到不支持图片的模型，发送前请移除图片或换回视觉模型。`  
  - 不强制静默清空附件（避免误删用户劳动）；发送时仍 fail-closed。  
- 切换到 vision：显示入口 + helper。

### 4.5 草稿与持久化

| 数据 | 草稿 | Thread 持久化 | 当轮请求 |
| --- | --- | --- | --- |
| 文本 | ✅ | ✅ | ✅ |
| 图片 bytes | ❌ 不存 | ❌ 不存 | ✅ base64/data URL |
| 附件元数据（可选） | ❌ | ✅ 可选 `attachmentMeta: { count, names? }` 截断 | — |

诚实文案（helper 常驻，Enabled 时）：

> 最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 图片仅当轮发送，不写入本机会话

### 4.6 历史消息呈现

- **当轮 UI（发送瞬间）:** deep-chat 原生气泡可暂显图（库行为，可接受）。  
- **持久化后 / 刷新后:** 用户消息文本为原文或 `[图片]`；若有 `attachmentMeta`，展示一行次要文案：`附 2 张图片（原图未保存）`。  
- **多轮追问:** 不自动重传历史图（保持现架构）；产品文案不承诺「模型记得上一张图的像素」。

---

## 5. UI 结构（草案，待 UI 子代理细化）

### 5.1 布局

```
┌─ text-input-container (rounded card) ──────────────────┐
│  [file-attachment-container · horizontal chips]        │
│  [contenteditable text · padding 兼容 send+upload]     │
│                                           [⬆] [➤]     │
│  helper line (12px muted) — vision only                │
└────────────────────────────────────────────────────────┘
```

- 上传钮：与发送钮同视觉家族（36px 圆、token 色、focus-visible ring），位于 send **左侧** inside-end 区。  
- 触控目标：≥ 44×44 热区（可用 padding 扩展）。  
- 附件 chip：缩略图 40–48px、圆角 8、删除钮 ≥ 24 可见 + 扩展热区；文件名截断。  
- 暗色模式：全部走 `--deep-chat-*` / 语义 token，禁止新硬编码 hex（fallback 可保留）。

### 5.2 文案（中文）

| 键 | 文案 |
| --- | --- |
| upload tooltip | `上传图片` |
| helper | `最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送` |
| aria upload | `上传图片，最多四张` |
| history meta | `附 {n} 张图片（原图未保存）` |

### 5.3 动效

- 150–200ms opacity/transform；尊重 `prefers-reduced-motion`。  
- 无装饰性 Lottie。

---

## 6. 错误、安全、性能

### 6.1 安全

- 继续禁止 base64 落盘。  
- 拒绝 SVG。  
- http(s) 远程 src：若出现，保持现有「不估体积」但记录风险；产品路径以本地 File 为主。  
- 日志：`redactSensitiveError` 已有，不新增打印 data URL。

### 6.2 性能

- 单次最多 4 文件顺序 FileReader（可接受）。  
- P1 可选：超 1.5MB 客户端 canvas 压缩（需独立任务与测试，**本迭代默认不做**，仅在 plan 列为可选 Task）。  
- 总 cap 12MB 降低网关失败率。

### 6.3 可访问性

- 中文 tooltip + `aria-label`。  
- focus-visible 与发送钮一致。  
- 错误 toast 不抢焦点；`aria-live` 依赖现有通知系统。  
- 颜色不单独表达错误（toast 文案完整）。

---

## 7. 测试与验收（生产级门禁）

### 7.1 单元

- 总大小超限 fail  
- SVG reject  
- accept 白名单  
- 非 vision + files  
- meta 序列化不含 data:  
- 常量与 helper 文案同源（可选 snapshot）

### 7.2 集成

- `handleRequest`：总 cap、SVG、成功传 parts、不落盘  
- 模型切换后 `applyDeepChatVisionUploadConfig` class/images

### 7.3 E2E / 手工验收矩阵

| # | 场景 | 期望 |
| --- | --- | --- |
| E1 | vision 模型 | 可见上传钮 + helper |
| E2 | 非 vision | 无上传钮；粘贴图 toast |
| E3 | 5 张 | 拒绝 |
| E4 | 单张 6MB | 拒绝 |
| E5 | 3 张合计 >12MB | 拒绝 |
| E6 | 纯图发送 | 成功；thread 无 base64 |
| E7 | 刷新会话 | 无原图；可有 meta 文案 |
| E8 | 生成中 | 不可追加导致双发（与现 pending 锁一致） |
| E9 | 暗色主题 | 对比度可读 |
| E10 | 键盘 Tab | 上传/发送可聚焦、可操作 |

### 7.4 回归

- Skill chip 共存不遮挡发送/上传  
- Stop 按钮几何不被上传钮挤偏  
- `npm run type-check` + 相关 vitest + 现有 deep-chat e2e 冒烟

---

## 8. 分期

| 阶段 | 内容 | 生产就绪？ |
| --- | --- | --- |
| **M1（本方案主交付）** | 总 cap、SVG 禁、白名单 accept、中文 tooltip/helper、token 化上传/附件样式、双门控保持、测试补齐、历史诚实 meta（轻量） | ✅ 目标 |
| **M2** | 选图即时校验 hook、客户端压缩、灰态解释增强 | 可选 |
| **M3** | 会话级原图缓存 / 自建附件层 | 另开 spec |

---

## 9. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| shadow DOM 样式脆弱 | 选择器锁定 deep-chat 稳定 id；样式单测或视觉 checklist |
| 库升级破坏按钮 DOM | `is-vision-enabled` 双轨（属性 + class）；e2e 断言存在性 |
| helper 挤占输入高度 | helper 放 input 外 host 或 container 底边 1 行；draft height sync 纳入 |
| 总 cap 与单张 cap 文案混淆 | 文案矩阵固定；错误码/消息单测 |

---

## 10. 成功标准（Definition of Done）

1. 支持 vision 时入口可发现、限制可预期、失败可理解。  
2. 任意失败路径不写入 base64 到 storage。  
3. 单测覆盖新 cap / SVG / 白名单；关键集成不落盘断言保留。  
4. UI 使用设计 token，与发送钮同族；a11y 中文标签。  
5. 文档：正式 spec + implementation plan + 验收矩阵通过审查。  
6. **不**引入通用文件上传或云存储范围蔓延。

---

## 11. 开放问题（已拍板默认，UI/审查可推翻）

| # | 问题 | 默认决议 |
| --- | --- | --- |
| Q1 | 非 vision 是否显示灰态上传？ | **否，隐藏** |
| Q2 | 是否做客户端压缩？ | **M1 不做** |
| Q3 | 历史是否存原图？ | **否**；仅可选 meta |
| Q4 | 总 cap 多少？ | **12MB** |
| Q5 | GIF 动图？ | 允许作 image/gif 文件，不单独入口 |

---

## 12. 关键代码地图（实现参考）

- `src/modules/app_center/views/playground/deep-chat/request/visionAttachments.ts`
- `…/request/handleRequest.ts`
- `…/infra/deepChatConfig.ts`
- `…/infra/deepChatStyles.ts`
- `…/shell/shellUi.ts`（模型切换）
- `…/composer/composerUi.ts`（高度/布局）
- `…/types.ts`
- `src/services/modelCapability/*`（协议侧已具备，原则上 M1 少动）

---

**下一步流水线:**

1. UI 设计子代理：完善入口视觉、交互微文案、布局与 a11y 细则 → `…-ui-design.md`  
2. 方案审核子代理：找矛盾、范围蔓延、生产风险 → `…-review.md`  
3. Spec+Plan 子代理：正式 design spec + implementation plan  
4. 目标校验子代理：对照企业生产级清单签发 Go/No-Go  
