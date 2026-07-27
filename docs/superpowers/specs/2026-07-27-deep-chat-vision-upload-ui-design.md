# Deep Chat 图片上传（Vision）— UI 设计细则

**Date:** 2026-07-27  
**Status:** UI design addendum (ready for review → formal spec → plan)  
**Parent draft:** [2026-07-27-deep-chat-vision-upload-ux-design-draft.md](./2026-07-27-deep-chat-vision-upload-ux-design-draft.md)  
**Scope:** 入口、布局、视觉规格、交互流、中文微文案、a11y、与发送钮几何冲突消解、工程落地提示（**不写 `src/` 实现**）  
**Approach lock:** 方案 B — deep-chat `images` 配置 + `auxiliaryStyle` + 请求侧校验；不重写自定义 file picker  

---

## 1. Goals / Non-goals（UI 专属）

### 1.1 Goals

| # | 目标 | 可验收含义 |
| --- | --- | --- |
| U1 | **可发现** | vision 模型下，上传入口与发送钮同族、同层，3 秒内可见 |
| U2 | **可预期** | 限制（4 / 5MB / 12MB / 仅当轮）在发送前可见，不靠猜 |
| U3 | **与发送钮同级 polish** | 36px 圆、token 色、focus-visible、贴底、暗色可读 |
| U4 | **少打断** | 无 modal 向导；失败用 toast + 附件条状态，不抢焦点 |
| U5 | **本机诚实** | helper / 历史 meta 明确「原图不落盘」 |
| U6 | **Skill 共存** | skill chip dock + 附件条 + 双钮不互挡、不挤偏 stop 态 |
| U7 | **a11y 底线** | 中文 accessible name、键盘可达、触控热区 ≥44px、色不独表义 |

### 1.2 Non-goals（本 UI 文档明确不做）

- 通用文件 / PDF / 相机 / 麦克风入口 UI  
- 灰态假上传钮（非 vision **隐藏**，产品锁）  
- Lottie、上传进度环秀、拖放全屏营销蒙层  
- 自建完整 Composer 附件层（方案 C）  
- IndexedDB 原图预览回放 UI  
- 英文 i18n 双语文案矩阵  
- 改 deep-chat 库源码  

---

## 2. Information architecture — Composer 区

### 2.1 区域分层（自上而下）

```
#input (deep-chat 输入区根)
├── .deep-chat-skill-load-banner          [host chrome · 载入技能时]
├── #text-input-container                 [主卡片 · 圆角 29]
│   ├── #deep-chat-session-skill-chip-dock  [可选 · 会话技能 chips]
│   ├── #file-attachment-container          [有附件时 · 缩略图条]
│   ├── #text-input                         [contenteditable]
│   └── .input-button-container             [绝对层 · pointer-events 分流]
│       ├── #upload-images-button           [vision only · secondary 圆钮]
│       └── submit .inside-end              [primary / stop / disabled]
└── .deep-chat-vision-helper                [host chrome · vision only · 1 行限制]
```

### 2.2 职责与优先级

| 区域 | 角色 | 视觉权重 | 可见条件 |
| --- | --- | --- | --- |
| Skill chip dock | 会话上下文 | 中 | 有会话技能 |
| Attachment strip | 本轮待发图片 | 中高（有内容时） | 已选图 |
| Text input | 主输入 | 高 | 始终 |
| **Upload button** | 次要动作 | 中（ghost） | `supportsVision` |
| **Send button** | 主 CTA | **最高**（实心 accent） | 始终（库状态机） |
| Helper line | 约束说明 | 低（muted 12px） | `supportsVision` |

**原则：** 同屏仅 **一个** 实心 primary（发送 / 停止）。上传为 **secondary outline/ghost**，避免双 primary。

### 2.3 焦点与 Tab 顺序（目标）

1. `#text-input`（内容编辑）  
2. 附件条内：缩略图 → 删除（若库 DOM 可聚焦；否则删除用鼠标/触控，键盘走库默认）  
3. `#upload-images-button`  
4. Submit / Stop  

不插入 modal、不把 helper 做成可聚焦控件（纯说明）。

---

## 3. Visual specs

### 3.1 Spacing rhythm（4 / 8）

| Token 语义 | 值 | 用途 |
| --- | --- | --- |
| `space-1` | 4px | 图标与边距微调 |
| `space-2` | 8px | **上传 ↔ 发送** 间距；chip 内 gap |
| `space-3` | 12px | helper 与卡片间距；附件条内边距 |
| `space-4` | 16px | 附件条与文本区间隙（若库结构允许） |
| 贴边 | 11px | 发送钮 `inset-inline-end` / `inset-block-end`（**已有，不改**） |
| 贴边 mobile | 10px | ≤640px（**已有**） |

### 3.2 Geometry — 双钮 inside-end 带

| 元素 | 视觉尺寸 | 热区 | 形状 |
| --- | --- | --- | --- |
| Send / Stop | **36×36** | 36（已有；可选伪元素扩至 44） | 正圆 `border-radius: 50%` |
| Upload | **36×36** | **≥44×44**（`::after` 透明扩展或 padding 盒） | 正圆 |
| 两钮间距 | **8px** 净空 | — | — |
| 发送贴右 | `inset-inline-end: max(11px, calc((100% - 768px)/2 + 11px))` | 与现网一致 | — |
| 发送贴底 | `inset-block-end: 11px`；`inset-block-start: auto` | 与现网一致 | — |
| 上传贴右 | `inset-inline-end: max(55px, calc((100% - 768px)/2 + 55px))` | = 11 + 36 + 8 | — |
| 上传贴底 | **同发送** `11px` | 底对齐 | — |

**Mobile（≤640px）:**

| 元素 | 值 |
| --- | --- |
| Send end | `10px`（现网） |
| Upload end | `10 + 36 + 8 = 54px` |
| Both bottom | `10px` |

### 3.3 Text padding（为双钮让路）

现网 `#text-input`：`padding: 18px 62px 16px 22px`（右 62 仅够单钮）。

| 断点 | padding（T R B L） | 说明 |
| --- | --- | --- |
| Desktop | `18px 108px 16px 22px` | 右 = 11 + 36 + 8 + 36 + 17 余量 ≈ **108** |
| ≤640px | `17px 100px 15px 18px` | 右 = 10 + 36 + 8 + 36 + 10 ≈ **100** |
| Skill dock 顶 | 保持现网 `padding: 10px 58px 0 14px`；**升级右内边距为 108/100** 以免 chip 伸入钮区 | |

有附件条时：文本区顶部 padding 可减至 `8–12px`（库默认 + 轻覆盖），避免卡片过高。

### 3.4 Radii

| 表面 | 半径 |
| --- | --- |
| `#text-input-container` | **29px**（现网，保留） |
| 上传 / 发送钮 | **50%**（正圆） |
| 附件缩略图 | **8px** |
| 附件 chip 容器 | **8–10px** |
| 删除钮 | **50%** |
| Helper 无卡片 | 无独立 radius |

> 工作台面板规范 ≤8px **不覆盖** Deep Chat 输入胶囊（既有产品例外，与 send polish 一致）。

### 3.5 Colors — 仅 CSS 变量（禁止新硬编码业务 hex）

实现时全部经 `--deep-chat-*`；fallback 可与 `styles.css` 现网一致。

#### 3.5.1 Upload button（secondary / ghost）

| 状态 | 背景 | 边框 | 图标色 |
| --- | --- | --- | --- |
| Default | `var(--deep-chat-surface)` | `1px solid var(--deep-chat-accent-border)` | `var(--deep-chat-accent)` |
| Hover | `var(--deep-chat-accent-soft)` | `var(--deep-chat-accent-border-hover)` | `var(--deep-chat-accent-hover)` |
| Focus-visible | 同 hover + ring | 同 hover | 同 hover |
| Active | `color-mix` 或 `var(--deep-chat-surface-hover)` | accent-border-hover | `var(--deep-chat-accent-active)` |
| Disabled / Generating | `transparent` 或 surface 50% | `var(--deep-chat-hairline)` | `var(--deep-chat-ink-faint)` opacity **0.5** |
| Hidden（!vision） | `display: none` | — | — |

**Focus ring（与发送对齐）:**

```
outline: 2px solid rgba(var(--deep-chat-accent-rgb), 0.75);
outline-offset: 2px;
```

**禁止：** 上传钮使用实心 `var(--deep-chat-accent)` 填充（那是发送专属）。

#### 3.5.2 Attachment strip

| 部件 | 规格 |
| --- | --- |
| 条容器 padding | `8px 12px 0 14px`（有 skill dock 时与 dock 对齐左 14） |
| 条 gap | `8px` |
| 缩略图 | **44×44** 显示（≥40）；`object-fit: cover`；radius 8 |
| 缩略图边框 | `1px solid var(--deep-chat-hairline)` |
| 文件名（若展示） | 11–12px，`var(--deep-chat-ink-muted)`，max-width 72px，ellipsis |
| 删除钮视觉 | 20–22px 圆，叠在缩略图右上 |
| 删除热区 | ≥**28px**（优先 32）；背景 `var(--deep-chat-surface)` + 轻 shadow |
| 删除图标 | `var(--deep-chat-ink-label)`；hover → `var(--deep-chat-danger-ink)` |
| 条空态 | 不占位（`display: none` / 零高度） |

#### 3.5.3 Helper line

| 项 | 值 |
| --- | --- |
| 字号 | **12px** / line-height **1.4** / weight **400** |
| 色 | `var(--deep-chat-ink-muted)` |
| 最大宽 | 与输入卡同宽 `min(100%, 768px)`，居中 |
| 与卡间距 | **8px** top margin |
| 水平 padding | 与卡内左对齐感：`0 12px`（窄屏 `0 8px`） |
| 图标 | 可选 12px `info` / `image` outline，同色 muted；**非必须** |

#### 3.5.4 History meta（用户气泡次行）

| 项 | 值 |
| --- | --- |
| 字号 | 12px |
| 色 | `var(--deep-chat-ink-faint)` |
| 图标 | 可选 image outline 12px |
| 位置 | 用户气泡正文下方 1 行；或替换纯 `[图片]` 旁注 |

#### 3.5.5 Light / Dark

| 轴 | 规则 |
| --- | --- |
| Light | 使用 `styles.css` 默认 `--deep-chat-*`（terracotta 旗袍色系） |
| Dark | 宿主已在 `.dark .deep-chat-shell` 等重映射 surface/ink/accent；**上传/附件/helper 不新增独立 dark hex** |
| 对比 | helper muted ≥ 次要文本可读；图标对 surface ≥ 3:1；正文/tooltip ≥ 4.5:1 |
| 危险 | 删除 hover / 错误 toast 用 `--deep-chat-danger*` / 全局 toast 语义，不只改红边 |

### 3.6 Iconography

| 控件 | 图标语义 | 实现约束 |
| --- | --- | --- |
| Upload | **图片 / 相框**（非回形针、非文件夹） | 优先 deep-chat 默认 images 图标；若换 SVG，描边 1.5–2、17×17 与 `#submit-icon` 对齐 |
| Delete attachment | × 或 trash-sm | 非 emoji |
| Helper optional | info-circle outline | `aria-hidden` |

### 3.7 Motion

| 交互 | 时长 | 属性 |
| --- | --- | --- |
| 钮 hover / focus 背景 | **150ms** | background, border-color；easing `var(--deep-chat-ease)` 或 `cubic-bezier(0,0,0.2,1)` |
| 附件条出现 | **150–200ms** | opacity + 轻微 translateY(4→0)；**禁止** height 动画造成 CLS 抖动优先用预留/瞬时布局 |
| 删除 | 120–150ms opacity | — |
| reduced-motion | `transition-duration: 0.01ms`；无位移动画 | 扩展现网 `@media (prefers-reduced-motion: reduce)` 选择器，纳入 upload + attachment |

无装饰 Lottie、无脉冲「请上传」。

---

## 4. Component states

### 4.1 Upload button

| 状态 | 条件 | 视觉 | 交互 |
| --- | --- | --- | --- |
| **Hidden** | `!supportsVision` 或无模型 | `display: none`；`#file-input` 等同藏 | 不可达 |
| **Default** | vision + idle | ghost 圆钮 §3.5.1 | 打开系统选图（多选） |
| **Hover** | 指针设备 | soft 底 + 边框加深 | `cursor: pointer` |
| **Focus-visible** | 键盘 Tab | outline ring 2+2 | Enter/Space 激活 |
| **Disabled** | 库 disabled（若有） | faint 边/图标 0.5 | 不可点；`aria-disabled` 若库支持 |
| **Generating** | pending / stream | 同 disabled 视觉；`pointer-events: none` 或库禁用 | **禁止**并行加图导致双发；与现 pending 锁一致 |
| **Near-limit** | 已有 4 张 | 仍可点；选后 toast 拒 | 不预灰（简单优先；M2 可灰） |

### 4.2 Attachment strip

| 状态 | 条件 | 视觉 |
| --- | --- | --- |
| **Empty** | 0 张 | 不渲染 / 零高度，不挤布局 |
| **Filled 1–4** | 有图 | 水平 chips；可横向滚动若溢出（`overflow-x: auto`，无页面级横滚） |
| **Error chip**（可选轻量） | 单张校验失败且库仍暂留 | 缩略图上 **1px danger 边** + toast；不单独发明错误 badge 文案堆叠。**M1 优先 toast，error chip 非必须** |
| **Overflow scroll** | 窄宽 4 张 | 条内横滚；滚动条细/overlay |

### 4.3 Helper

| 状态 | 可见 |
| --- | --- |
| vision | 显示 §6 helper 全文 |
| !vision | **隐藏**（不占位） |
| 生成中 | 保持显示（不闪） |

### 4.4 Send button（回归约束，不重设计）

保持现网：accent 实心 / disabled faint / stop 红 `#dc2626` 系 / 36px / inside-end 贴底。  
**Stop 态几何不得被上传钮挤偏**（见 §9）。

---

## 5. Interaction flows

### 5.1 点击选图（主路径）

1. 用户确认当前为 vision 模型 → 见上传钮 + helper。  
2. 点击上传 / 键盘激活 → 系统文件选择（`accept` 白名单；多选）。  
3. 用户确认文件 → deep-chat 附件条出现缩略图。  
4. **M1：** 发送路径完整校验；若有低成本 onInput files hook → 即时 toast。  
5. 可选补文案 → 点发送。  
6. 成功：附件条清空；气泡可暂显图；thread **无 base64**；可选 meta。

### 5.2 粘贴

1. 焦点在输入区，粘贴剪贴板图片。  
2. vision：进入与选图相同校验与附件条。  
3. **非 vision：** 不出现上传钮；toast：`当前模型不支持图片输入，请切换到支持视觉的模型后再试。`  
4. 非图片剪贴板：忽略（库默认），无额外 UI。

### 5.3 拖放

1. 拖入聊天/输入区（库支持范围）。  
2. vision：落附件条 + 校验。  
3. 非 vision：toast 同 5.2；不显示虚假 drop 高亮（避免假 affordance）。  
4. **不**做全屏品牌 dropzone。

### 5.4 移除单张

1. 点缩略图删除。  
2. 该 chip 消失；helper 仍显示全局限制。  
3. 无「撤销删除」toast（少打断；图仍在本机可选回）。

### 5.5 纯图发送（无字）

1. 仅附件、文本空 → **允许**发送。  
2. 正文占位 `[图片]`（逻辑层）；UI **不**强制红框「请输入文字」。  
3. Helper 不改写为错误态。

### 5.6 模型切换且附件残留

1. vision → 非 vision：`applyDeepChatVisionUploadConfig` 隐藏上传 + helper。  
2. 若仍有附件：**一次** toast：`已切换到不支持图片的模型，发送前请移除图片或换回视觉模型。`  
3. **不**静默清空附件（保护用户劳动）。  
4. 若用户仍发送 → fail-closed toast：`当前模型不支持图片输入…`  
5. 非 vision → vision：显示上传 + helper；残留附件可继续发。

### 5.7 非 vision 粘贴 / 拖入

同 5.2 / 5.3：隐藏入口 + 解释性 toast。无常驻「当前模型不支持图片」占位（避免噪音）；**仅在尝试时解释**（产品锁 Q1）。

### 5.8 超限

| 条件 | 反馈 | 附件条 |
| --- | --- | --- |
| >4 张 | toast warning | 不接受超额（库 max 或发送拒） |
| 单张 >5MB | toast 含文件名 | 拒该文件 |
| 合计 >12MB | toast 合计文案 | 发送拒；用户减张/压缩 |
| SVG / 非法类型 | toast 类型文案 | 拒 |

### 5.9 生成中

上传禁用；发送变 Stop（现网）。用户不可通过上传绕过 pending 锁。

---

## 6. Microcopy matrix（简体中文 · 精确字符串）

对齐 `CONTENT_DESIGN`：短、可操作、无正确废话、无 emoji 堆。

### 6.1 控件标签

| Key | 字符串 | 载体 |
| --- | --- | --- |
| `upload.tooltip` | `上传图片` | deep-chat button tooltip |
| `upload.aria` | `上传图片，最多四张` | `aria-label` / 等价 |
| `upload.aria.disabled` | `上传图片不可用` | 若生成中需区分（可选） |
| `remove.aria` | `移除图片 {name}` | 删除钮；name 未知时 `移除图片` |
| `helper.full` | `最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送` | helper 常驻（vision） |
| `helper.short` | `最多 4 张 · ≤5MB · 合计≤12MB · 仅当轮` | 窄屏 ≤360 可选缩短；**默认仍用 full，允许 CSS 截断不换文案** |
| `history.meta` | `附 {n} 张图片（原图未保存）` | n≥1；n 用阿拉伯数字 |
| `history.meta.one` | `附 1 张图片（原图未保存）` | 可选；也可用 meta 模板 n=1 |
| `placeholder.logic` | `[图片]` | 逻辑占位，非输入 placeholder |
| `input.placeholder` | `有问题，尽管问` | **不改**（现网） |

### 6.2 Toast / 错误

| Key | 字符串 | 类型 |
| --- | --- | --- |
| `err.max_count` | `单次最多上传 4 张图片，请减少后重试。` | warning |
| `err.max_file` | `图片「{name}」超过 5MB 上限。` | warning |
| `err.max_total` | `本轮图片合计超过 12MB，请压缩或减少张数。` | warning |
| `err.type` | `不支持的文件类型，请使用 PNG、JPEG、WebP 或 GIF。` | warning |
| `err.svg` | `不支持 SVG 图片，请改用 PNG 或 JPEG。` | warning |
| `err.non_vision` | `当前模型不支持图片输入，请切换到支持视觉的模型后再试。` | warning |
| `warn.model_switch` | `已切换到不支持图片的模型，发送前请移除图片或换回视觉模型。` | warning |
| `err.generic_read` | `图片读取失败，请重试。` | error |

> `{name}` 过长时截断展示（UI 层建议 max 24 字 + `…`），逻辑错误对象可保留全名于日志（已 redact data URL）。

### 6.3 禁止文案

- 「恭喜您成功上传！」类成功废话（附件条出现即反馈）  
- 「AI 将理解您的图片」营销句  
- 英文默认 tooltip（`Upload images` 等）残留  
- 把「12MB」写成「payload」等实现词  

### 6.4 Toast 行为

- 使用共享 `showToast`；**不抢焦点**；`aria-live` 随现有通知系统。  
- 时长 3–5s；同文案短时去重（避免连贴 4 张刷 4 次同一 toast —— 实现建议合并）。  

---

## 7. Layout wireframes

### 7.1 Desktop（≥641px，vision + 2 图 + skill）

```
┌──────────────────────────── stage max 768 ────────────────────────────┐
│  … messages …                                                         │
│                                                                        │
│  ┌─ #text-input-container (r=29, border, surface gradient) ─────────┐ │
│  │  [skill chip] [skill chip ×]                                      │ │
│  │  ┌────┐ ┌────┐                                                    │ │
│  │  │img │ │img×│   ← attachment strip                               │ │
│  │  └────┘ └────┘                                                    │ │
│  │  有问题，尽管问…                              (○ upload) (● send) │ │
│  │                                         ghost 36    solid 36      │ │
│  │                                         └── 8px ──┘  end 11px     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│  最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送   ← helper 12 muted │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Desktop — 无附件、有 vision

```
┌─ input card ──────────────────────────────────────┐
│  有问题，尽管问…              (○) (●)             │
└───────────────────────────────────────────────────┘
  最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送
```

### 7.3 Desktop — 非 vision

```
┌─ input card ──────────────────────────────────────┐
│  有问题，尽管问…                    (● send only) │
└───────────────────────────────────────────────────┘
  （无 helper、无 upload）
```

### 7.4 Narrow（≤640px）

```
┌─ 100% width, r=28, min-h 56 ─────────────────────┐
│ [thumbs horizontal scroll if needed]             │
│ 文本…                         (○)(●) end 10px    │
└──────────────────────────────────────────────────┘
  最多 4 张 · 单张 ≤ 5MB · 合计 ≤ 12MB · 仅当轮发送
  （可两行 wrap；不横滚页面）
```

### 7.5 Generating / Stop

```
│  文本或附件…                  (○ disabled) (■ stop red) │
```

上传 ghost 变淡；Stop 占原 send 几何，**仍占 rightmost 36 slot**；upload 仍在其左 8px。

### 7.6 z-index

| 层 | z |
| --- | --- |
| 文本 / 附件 | 0–1 |
| `.input-button-container` | **2**（现网） |
| 上传 / 发送 | 同层，靠 DOM 顺序与位置，不互叠 |
| Toast / modal | 全局层，远高于 composer |

---

## 8. A11y checklist

| # | 项 | 要求 | 验收 |
| --- | --- | --- | --- |
| A1 | Accessible name | 上传：`上传图片，最多四张`；删除：`移除图片…` | SR / 无障碍树 |
| A2 | Tooltip 语言 | 中文 `上传图片` | 无英文残留 |
| A3 | Focus-visible | 2px accent ring + 2 offset，与 send 一致 | Tab 可见 |
| A4 | Focus order | 文本 →（附件控件）→ 上传 → 发送 | 与视觉一致 |
| A5 | Keyboard | 上传 Enter/Space；发送现网 | 主路径可键盘完成 |
| A6 | Touch | 上传热区 **≥44×44**；钮间距 ≥8 | 窄屏点按 |
| A7 | Color not only | 错误靠 toast 全文；删除 hover 可加图标加深 | 无「仅红边」 |
| A8 | Contrast | helper / 图标 / 钮在 light+dark 抽检 | AA 实用子集 |
| A9 | Reduced motion | 扩展 prefers-reduced-motion | 设置减少动效生效 |
| A10 | Live errors | toast 不抢焦点；依赖现有 live region | 焦点仍在输入区 |
| A11 | Hidden state | 非 vision 不在 a11y 树暴露假按钮 | `display:none` |
| A12 | Decorative icons | 钮内图标 `aria-hidden`（name 在 button） | — |
| A13 | Drag alternative | 拖放非唯一路径；保留点击上传 | 无 gesture-only |
| A14 | History images | 刷新后无原图：meta 文案可读，不假装有图 | — |

对齐 `docs/ACCESSIBILITY.md` 强制底线 A1–A10。

---

## 9. Conflict resolution — 与发送钮 `inside-end` 几何

### 9.1 现状（锁）

- `submitButtonStyles.position = 'inside-end'`  
- 视觉 **36×36**；CSS 强制贴底 `inset-block-end: 11px`  
- 右缘：`max(11px, calc((100% - 768px)/2 + 11px))`  
- `.input-button-container` 铺满 `#text-input` 层，由 controller 对齐到 `#text-input-container`  
- Stop 态 class 可能只剩 `.input-button.inside-end`（选择器已覆盖）  
- E2E：`tests/e2e/deep-chat-send.spec.ts` 钉扎几何  

### 9.2 冲突点

| 风险 | 说明 |
| --- | --- |
| C1 | 上传与发送同为 inside-end 默认叠在同一右下角 |
| C2 | 右 padding 62 不够双钮，文字伸入热区 |
| C3 | Skill dock 右 padding 58 使 chip 撞钮 |
| C4 | 上传样式误用 `.inside-end` 实心 accent 规则，变成第二 primary |
| C5 | Stop 切换时上传位移或遮挡红钮 |
| C6 | `alignSubmitButtonLayerToTextInput` 只认 submit，上传脱层 |

### 9.3 决议（UI / 工程契约）

1. **发送几何零回归：** 发送/Stop 的 `inset-inline-end` / `inset-block-end` / 36px **数值不改**。  
2. **上传独立选择器定位：** 使用 `#upload-images-button`（及库稳定 class），**不要**让上传吃到「可发送实心 hover」那组 `.inside-end.submit-button` 规则。  
3. **上传 = 发送左侧 8px 槽：**  
   - desktop: `end = sendEnd + 36 + 8` → **55px** 基准（+ 768 居中补偿同公式）  
   - mobile: **54px** 基准  
4. **文本右 padding 升级：** 62 → **108**（desktop）、mobile **100**（§3.3）。  
5. **Skill dock 右 padding** 同步升到与文本右安全距一致（≥108 / 100）。  
6. **底对齐：** 上传与发送同一 `inset-block-end`，禁止上传 `top: 50%` 垂直居中（多行时会与 send 脱节）。  
7. **Stop 态：** 上传保持左侧槽；仅降低透明度 / pointer-events；**不**挪到 send 位置。  
8. **E2E 扩展（实现阶段）：**  
   - 现有 send pin 断言保持；  
   - 新增：vision 下 upload 与 send 水平间距 8±2、底边对齐 ±2、upload 不溢出 container。  
9. **Helper 位置：** **卡片外下方** host chrome（推荐），避免 `#text-input-container { overflow: hidden }` 裁切，且不改变贴底按钮坐标系。  
10. **若库强制 upload 与 submit 同 class 难拆：** 允许 upload 视觉 32–36 但 **位置仍按 #upload-images-button 覆盖**；仍禁止方案 C。

### 9.4 非决议（明确不做）

- 不把发送改到 outside-end / 左侧  
- 不把上传放到输入框外左侧大按钮（破坏现网胶囊构图）  
- 不为双钮把容器改成 `flex` 真按钮行（回归面过大；M3 再议）

---

## 10. Implementation notes for engineers

> 仅指引；**本任务不改 `src/`**。

### 10.1 deep-chat 配置旋钮

| 旋钮 | 文件 | 用途 |
| --- | --- | --- |
| `chat.images` | `deepChatConfig.ts` → `resolveDeepChatImagesConfig` | vision 时对象，否则 `false` |
| `files.maxNumberOfFiles` | `visionAttachments.ts` | `4` |
| `files.acceptedFormats` | 同上 | 白名单字符串（禁裸 `image/*`） |
| button tooltip / styles | `images` 配置内 `button`（若库支持）或 CSS | 中文 tooltip |
| `chat.classList 'is-vision-enabled'` | `applyDeepChatVisionUploadConfig` | 与 CSS `:host` 双轨 |
| `gifs/camera/audio/mixedFiles/microphone` | 保持 `false` | — |
| `submitButtonStyles` | **不改 position/size 语义** | 仅注意与 upload 共存 |
| `textInput.styles.text.padding` | 右 padding → 108 | 与 CSS 双写防闪 |
| `onInput` | 可选侦测 files 做即时 toast | M1 尽力；发送路径必校 |

### 10.2 CSS 选择器（`deepChatStyles.ts` / auxiliaryStyle）

| 选择器 | 动作 |
| --- | --- |
| `:host(:not(.is-vision-enabled)) #upload-images-button` 等 | 保持隐藏（现网） |
| `:host(.is-vision-enabled) #upload-images-button` | `display: flex` + **新** ghost 视觉与定位 |
| `#upload-images-button` 定位 | `inset-inline-end: max(55px, …)`；`inset-block-end: 11px`；36×36；圆 |
| **排除** 上传命中实心 accent hover 规则 | 选择器加 `:not(#upload-images-button)` 或上传更高优先级 ghost |
| `#text-input` padding-right | 108 / 100 |
| `#file-attachment-container` / 库附件类名 | token 化缩略图、删除钮（以运行时 DOM 为准锁定稳定 id/class） |
| `.deep-chat-vision-helper` | host 注入于 `#input` 内、卡片下 |
| `@media (max-width: 640px)` | 同步 upload end 54、padding 100 |
| `prefers-reduced-motion` | 纳入 upload、attachment |

### 10.3 校验与文案 SSOT

| 逻辑 | 位置 |
| --- | --- |
| 常量 4 / 5MB / **12MB** | `visionAttachments.ts` |
| 错误字符串 | 与 §6 矩阵一致；单测 snapshot 可选 |
| SVG reject | 类型 + 扩展名双判 |
| 模型切换 toast | `shellUi` / 模型切换钩子，**仅当附件非空** |
| 历史 meta | thread 类型可选 `attachmentMeta`；渲染用户气泡次行 |
| Toast API | 共享 `showToast`，禁止自建 snackbar |

### 10.4 Helper 挂载建议

- **推荐：** host chrome 在 shadow 外或 deep-chat 可注入的 `#input` 子节点（与 skill-load-banner 同级策略）。  
- 可见性：`is-vision-enabled` class 同步。  
- 文案常量与校验常量同源注释，避免 12MB 文案漂移。

### 10.5 回归清单（工程）

- Skill chip dock + 4 图 + 双钮  
- Stop 几何 e2e 仍绿  
- 暗色 shell  
- 无模型 / 非 vision class 切换  
- `type-check` + vision unit + send e2e  

---

## 11. Acceptance criteria — Visual / UX QA

### 11.1 视觉

| # | 标准 |
| --- | --- |
| V1 | vision：上传钮可见；与发送同高底对齐；间距 8±2px |
| V2 | 上传为 ghost/outline，发送为实心 accent；无双 primary |
| V3 | 非 vision：无上传、无 helper、无附件入口 |
| V4 | 色/边/焦环均来自 `--deep-chat-*`；无新增业务裸 hex |
| V5 | 暗色：上传边框与图标可读；helper 可读 |
| V6 | 附件 44 缩略图、8px 圆角、删除可辨 |
| V7 | 窄宽 375：双钮不溢出卡片；无页面横滚 |
| V8 | 动效 ≤200ms；reduced-motion 无位移动画 |

### 11.2 交互

| # | 标准 |
| --- | --- |
| I1 | 选图 / 粘贴 / 拖放三条路径可用（vision） |
| I2 | 纯图可发；不强制填字 |
| I3 | 超 4 / 5MB / 12MB / SVG 均有 §6 对应 toast |
| I4 | 非 vision 粘贴 → `err.non_vision` toast |
| I5 | 切换到非 vision 且有附件 → `warn.model_switch` 一次 |
| I6 | 生成中不可加图扰乱 pending |
| I7 | 成功发送后输入区附件清空 |

### 11.3 文案

| # | 标准 |
| --- | --- |
| C1 | tooltip / aria / helper / toast / history 与 §6 **逐字**一致（含标点） |
| C2 | 无英文默认 tooltip |
| C3 | helper 含 4、5MB、12MB、仅当轮 |

### 11.4 a11y

| # | 标准 |
| --- | --- |
| X1 | Tab 可达上传与发送；focus-visible 可见 |
| X2 | 上传热区 ≥44px |
| X3 | 错误不靠色独表；toast 不抢焦点 |
| X4 | 非 vision 无隐藏可聚焦假钮 |

### 11.5 回归

| # | 标准 |
| --- | --- |
| R1 | 发送钮 pin e2e 仍通过 |
| R2 | Stop 不被上传遮挡或挤出 container |
| R3 | Skill chips 不与双钮重叠 |
| R4 | 刷新后无 base64；历史可有 meta 句 |

### 11.6 安全 / 产品锁（UI 可见侧）

| # | 标准 |
| --- | --- |
| S1 | UI 不提供 SVG 作为推荐格式 |
| S2 | 不展示「图片已保存到本机会话」类承诺 |
| S3 | 范围仍是图片 vision，无通用文件入口 |

---

## 12. Open UI decisions（本文件拍板）

| # | 议题 | 决议 |
| --- | --- | --- |
| U-Q1 | 上传实心还是 ghost | **Ghost / outline secondary** |
| U-Q2 | Helper 在卡内还是卡外 | **卡外下方**（避 overflow:hidden） |
| U-Q3 | 非 vision 弱文案常驻 | **否**；仅尝试时 toast |
| U-Q4 | 附件 error chip | **M1 非必须**；toast 优先 |
| U-Q5 | 已满 4 张是否预灰上传 | **M1 不预灰**；点后 toast |
| U-Q6 | 图标 | 图片语义；非 paperclip |
| U-Q7 | 右 padding | **108 / 100** |

---

## 13. Traceability

| 来源 | 吸收点 |
| --- | --- |
| UX draft | 产品锁、校验、方案 B、文案骨架、fail-closed |
| Send button polish | 36px、inside-end、11px、token accent、focus ring、stop 选择器 |
| PRODUCT_PRINCIPLES | 工具优先、少打断、本机诚实、即时反馈 |
| VISUAL / THEME | token、暗色、无营销装饰 |
| CONTENT_DESIGN | 中文短句、toast 配方 |
| ACCESSIBILITY | focus、name、触控、色不独、reduced-motion |
| ui-ux-pro-max | 44px 热区、8px 间距、150–300ms、form feedback、color-not-only |

---

## 14. Next pipeline

1. **Review 子代理** — 对照 draft 找矛盾与生产风险 → `…-review.md`  
2. **Spec + Plan** — 正式 design + implementation tasks  
3. **Go/No-Go** — 企业生产级清单  

---

**Document owner:** Product Design + Frontend UX  
**Implements with:** Approach B only · images-only · no base64 persistence · max 4 / 5MB / 12MB · block SVG  
