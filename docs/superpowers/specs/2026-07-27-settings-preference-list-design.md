# Settings Preference List 规范

**Date:** 2026-07-27  
**Status:** P0+P1 shipped · P2 LLM partial · appearance CSS hard-cut · data retention skipped（无纯 toggle）
**Updated:** 2026-07-27  
**Visual route:** A — Operational Quiet  
**Scope note:** 只推广「单点偏好拼接列表」原语，**不是**全页 iOS 式设置列表。  
**Related:**

- 企业级硬化：`docs/superpowers/specs/2026-07-25-system-settings-enterprise-hardening-design.md`（外观即时生效 / 反孤岛 / 测例锁；本 Spec 不得与之冲突）
- 主题架构：`docs/superpowers/specs/2026-07-25-theme-architecture-enterprise-design.md`
- 样板实现：`src/components/settings/systemSettings.html`（`#settings-section-appearance` ~2492–2716）
- 样板样式：`src/components/settings/systemSettings.css`（`.settings-appearance-*` ~879–1020；含 `.settings-segmented--inline` / `--color-mode`）
- 实现入口：`src/components/settings/systemSettings.{html,css,ts}`（P0 **默认不改** `.ts` 业务）

---

## 0. 决策记录（已确认）

| 决策点       | 结论                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------- |
| 视觉方向     | **Operational Quiet（A）**：颜色只表达状态/风险；紧凑但不廉价                               |
| 推广对象     | **单点偏好的紧凑拼接列表**，不是「所有设置都左标题右控件」                                  |
| 字段形态三分 | A Preference Row / B Stacked Field / C Composite·Step Card                                  |
| 命名         | 历史布局 class `settings-appearance-*` → 中性 `settings-pref-*`（**不含** testid / nav id） |
| 容器策略     | 同一决策域一个 list + divider；避免「彩 tint frame + list 边框」双重强调                    |
| 迁移         | **默认：Rename + CSS alias 兼容**；hard cut 仅当同一 PR 测全绿                              |
| 契约冻结     | `data-testid` / `id` / `data-settings-nav-id` / Alpine 绑定 / 即时生效存储 **P0 禁止改**    |

---

## 1. 问题与目标

### 1.1 问题

外观与体验区已落地「拼接列表行」密度与结构，但 class 仍绑在 `appearance` 历史命名上，其他 section（诊断开关、工具策略简单偏好、数据保留开关等）容易各自长出一套 grid/card 文案布局，导致：

1. 同类「即时偏好」视觉密度不一致
2. 工程师缺少清晰 **适用 / 禁用** 边界，误把 key/URL/多步流程硬塞进左右拼接行
3. 双重容器（彩虹 frame + 内层 list 边框）破坏 Operational Quiet

### 1.2 目标

| ID        | Outcome                                                                       |
| --------- | ----------------------------------------------------------------------------- |
| **PL-O1** | 抽取中性原语 `settings-pref-list` / `settings-pref-row`，外观区作为样板可推广 |
| **PL-O2** | 用形态三分明确：何时用拼接行、何时堆叠、何时卡片流程                          |
| **PL-O3** | 密度与变体可测、可复用，不另起全局 token 体系                                 |
| **PL-O4** | 分阶段迁移：P0 原语化 → P1 高价值开关簇 → P2 LLM 局部吸收，不取消 step        |
| **PL-O5** | a11y 基线（焦点环、sr-only、最小触控）与现有 switch/segmented 一致            |

### 1.3 成功判据（摘要）

- 新写「简单即时偏好」默认走 pref-list，而不是新造 section 样式
- key / URL / 长 help / 四步 LLM 配置不出现在左右拼接行里
- 外观区 rename 后视觉无回归；测试 id 与交互契约可继续绿

---

## 2. 适用范围 / 禁用范围

### 2.1 三种字段形态

| 形态  | 名称                  | 适用                                 | 典型控件                                    | 布局                            |
| ----- | --------------------- | ------------------------------------ | ------------------------------------------- | ------------------------------- |
| **A** | Preference Row        | 单点即时偏好；1 行标题 + 可选短 hint | toggle、segmented、简单 select、短数字/enum | `settings-pref-list` 内左右拼接 |
| **B** | Stacked Field         | 需要完整 label + 长说明 + 宽输入     | text、password、URL、textarea、多行 help    | 上 label/help，下全宽 control   |
| **C** | Composite / Step Card | 多字段流程、可折叠高级项、成组验证   | LLM 四步、连接测试、危险分桶操作            | 卡片/步骤容器；内部可局部嵌 A   |

### 2.2 适用范围（应用 A）

| 场景                  | 说明                                                  |
| --------------------- | ----------------------------------------------------- |
| 外观与体验            | 主题 / 色调 / 动画开关 / 速度等（样板）               |
| 诊断开关簇            | 仅布尔或小 enum 的调试开关组                          |
| 工具策略通用开关      | 即时生效、无长说明的策略开关                          |
| 数据保留简单偏好      | 如「启用自动清理」类 toggle；复杂天数/分桶仍走 B/C    |
| LLM step **局部**偏好 | 推理开关、effort、service_tier 等单点项，嵌在 step 内 |

### 2.3 禁用范围（禁止硬塞 A）

| 场景                | 原因                         | 应用形态                    |
| ------------------- | ---------------------------- | --------------------------- |
| API key / secret    | 敏感输入需全宽 + 脱敏 + 状态 | B                           |
| Base URL / endpoint | 长字符串；错误提示常多行     | B                           |
| 多行说明 / 合规文案 | hint 会被压扁，可读性崩      | B 或段落 + 控件             |
| 代理账号密码组      | 多字段关联 + 测试动作        | C（或 B 组）                |
| LLM 四步主流程      | 步骤进度、校验、测试连接     | C（保持 step）              |
| 导入导出 / 危险操作 | 二次确认、影响面大           | 既有危险区模式，非 pref row |
| 搜索 / 导航 chrome  | 不属于字段偏好               | 保持现有 head/nav           |

**一句话规则：**  
「看完标题 2 秒内能改完的单点偏好」→ A；「需要输入或长解释」→ B；「一次配置要完成一组事」→ C。

---

## 3. 信息架构与 DOM 约定

### 3.1 结构原则

1. **一个决策域 = 一个 list**：共享边框与表面，行之间用 divider 拼接，不用行级卡片
2. **list 外 section head 负责分区叙事**；避免 list + 彩色 frame 双重「盒子感」
3. **行内结构固定**：`meta`（可选 icon + title + hint）| `control`
4. **同一 list 内密度一致**
5. **Icon 只服务顶层**（见 §3.1.1）；嵌套 list 禁止行级 icon

### 3.1.1 设置面板层级与 Icon 规则（顶层设计）

目标：用户一眼分清「我在哪一层」，而不是每行都贴纸。

| 层级   | 名称         | 视觉身份                        | Icon                                     | 示例                                            |
| ------ | ------------ | ------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| **L0** | 侧栏分类     | 导航                            | **要**（侧栏一级图标）                   | AI 模型 / 工具策略 / 外观                       |
| **L1** | Section 头   | 分区叙事                        | **要**（`settings-section-head__icon`）  | 「外观与体验」「开发者诊断」                    |
| **L2** | 顶层内容块   | 本分区主决策列表                | **行 icon 可选但统一：有则整 list 都有** | 外观 pref-list；诊断「调试配置」pref-list       |
| **L3** | 容器分组     | 折叠 App / LLM Step / Submodule | **容器标题可弱标识**；**内行禁止 icon**  | `settings-tool-app`、`settings-llm-step`        |
| **L4** | 嵌套字段列表 | 细节偏好                        | **禁止** `settings-pref-row__icon`       | tool-app 内 boolean pref-list；step 内推理 list |

**判定「是否顶层 L2」：**  
该 `settings-pref-list` 是否**直接**落在 section frame 下，且**祖先中没有** `settings-tool-app` / `settings-llm-step` / `settings-collapsible-card` / `settings-submodule`。

- 是 → L2，行 icon 允许（与外观一致）
- 否 → L3/L4，**必须去掉**行 icon，只留标题+hint+控件

**原则摘要：**

1. **最上层才示意**：导航 + section +（可选）顶层 pref 行
2. **越深越安静**：嵌套只靠缩进、折叠标题、divider，不再叠小图标
3. **同 list 一致**：同一 list 内不要「有的行有 icon、有的没有」（L2 全有或全无；L4 全无）
4. **颜色不层级**：层级用结构与字重，不用彩虹 section 色带当主导航（Operational Quiet；彩色 frame 为遗留，择机中性化）
5. **折叠 = 目录节点**：tool-app / llm-step 扮演「子目录」；其内部字段是叶子，叶子不戴 icon

### 3.2 Class 映射（历史 → 规范）

仅改 **布局骨架 class**。下表一对一映射；**不**改控件 class、testid、id、nav。

| 历史（appearance）                 | 规范（pref）                 | 说明                                                       |
| ---------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| `settings-appearance-grid`         | `settings-pref-list`         | list 容器                                                  |
| `settings-appearance-row`          | `settings-pref-row`          | 单行                                                       |
| `settings-appearance-row__meta`    | `settings-pref-row__meta`    | 左：icon+文案                                              |
| `settings-appearance-row__icon`    | `settings-pref-row__icon`    | 可选弱化 icon                                              |
| `settings-appearance-row__title`   | `settings-pref-row__title`   | 标题                                                       |
| `settings-appearance-row__hint`    | `settings-pref-row__hint`    | 短 hint                                                    |
| `settings-appearance-row__control` | `settings-pref-row__control` | **仅** select/短输入壳；switch/segmented **不强制** 包一层 |
| `settings-appearance-divider`      | `settings-pref-divider`      | 行间分隔                                                   |

**保持原名（禁止借本 Spec 改名）：**

| 类别       | 名称                                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 控件       | `settings-switch`、`settings-switch__track`、`settings-segmented`、`settings-segmented__btn`、`settings-segmented--inline`、`settings-segmented--color-mode`、`settings-control` |
| 分区壳     | `settings-section-frame`、现网 `settings-section-frame--appearance`（已是 muted 中性；**不必**新造 `--neutral`）                                                                 |
| Section 头 | `settings-section-head*`、`settings-badge*`                                                                                                                                      |

### 3.2.1 契约冻结（P0 红线）

下列 **键名 / 选择器锚点不得改名、不得迁移到 class**：

| 类型      | 稳定值（现网）                                                                                                                                                                                 | 谁在用             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| section   | `id` / nav = `settings-section-appearance`                                                                                                                                                     | 导航、e2e          |
| list 容器 | `id` + `data-testid` + nav = `settings-appearance-theme`                                                                                                                                       | e2e / visual / nav |
| 主题行    | `data-testid` + nav = `settings-appearance-color-mode`                                                                                                                                         | unit / nav         |
| 色调行    | `data-testid="settings-appearance-accent"`                                                                                                                                                     | 契约               |
| 动画行    | `id` + testid + nav = `settings-appearance-animation`                                                                                                                                          | nav unit           |
| 控件      | `settings-color-mode`、`settings-color-mode-light/dark/system`、`settings-color-mode-resolved-hint`、`settings-theme-select`、`settings-animations-enabled`、`settings-respect-reduced-motion` | e2e / unit / smoke |

> 命名易混：产品文案 **主题** = light/dark/system（testid `settings-color-mode*`）；**色调** = accent 预设（testid `settings-theme-select`）。P0 只改 class，不改文案语义。

### 3.3 样板骨架（形态 A = 现网外观区映射）

以下与 `systemSettings.html` 外观区 **结构同构**；实施时只把 `settings-appearance-*` 换成 `settings-pref-*`，其余属性原样保留（含 Alpine）。

```html
<section
  id="settings-section-appearance"
  class="settings-panel-section space-y-4"
  data-settings-nav-id="settings-section-appearance"
  data-settings-nav-group="appearance"
>
  <div class="settings-section-head">…</div>

  <!-- 现网 frame 名保留；已是中性 muted，禁止再叠彩虹 tint -->
  <div class="settings-section-frame settings-section-frame--appearance">
    <div
      id="settings-appearance-theme"
      class="settings-pref-list"
      data-testid="settings-appearance-theme"
      data-settings-nav-id="settings-appearance-theme"
      data-settings-nav-group="appearance"
    >
      <!-- 1 主题：segmented 直接贴右，不包 __control -->
      <div
        class="settings-pref-row"
        data-testid="settings-appearance-color-mode"
        data-settings-nav-id="settings-appearance-color-mode"
        data-settings-nav-group="appearance"
      >
        <div class="settings-pref-row__meta">
          <span class="settings-pref-row__icon" aria-hidden="true">…</span>
          <div class="min-w-0">
            <h4 class="settings-pref-row__title">主题</h4>
            <p class="settings-pref-row__hint">工作台明暗：浅色 / 深色 / 跟随系统…</p>
          </div>
        </div>
        <div
          class="settings-segmented settings-segmented--inline settings-segmented--color-mode"
          role="group"
          aria-label="主题"
          data-testid="settings-color-mode"
        >
          <button
            type="button"
            class="settings-segmented__btn"
            data-testid="settings-color-mode-light"
          >
            浅色
          </button>
          <button
            type="button"
            class="settings-segmented__btn"
            data-testid="settings-color-mode-dark"
          >
            深色
          </button>
          <button
            type="button"
            class="settings-segmented__btn"
            data-testid="settings-color-mode-system"
          >
            跟随系统
          </button>
        </div>
      </div>

      <div class="settings-pref-divider" role="separator"></div>

      <!-- 2 色调：select 走 __control -->
      <div class="settings-pref-row" data-testid="settings-appearance-accent">
        <div class="settings-pref-row__meta">…</div>
        <label class="settings-pref-row__control">
          <span class="sr-only">当前色调</span>
          <select class="settings-control settings-control--sm" data-testid="settings-theme-select">
            …
          </select>
        </label>
      </div>

      <div class="settings-pref-divider" role="separator"></div>

      <!-- 3 界面动画：switch 直接贴右 -->
      <div
        id="settings-appearance-animation"
        class="settings-pref-row"
        data-testid="settings-appearance-animation"
        data-settings-nav-id="settings-appearance-animation"
        data-settings-nav-group="appearance"
      >
        <div class="settings-pref-row__meta">…</div>
        <label class="settings-switch">
          <span class="sr-only">启用界面动画</span>
          <input type="checkbox" data-testid="settings-animations-enabled" />
          <span class="settings-switch__track" aria-hidden="true"></span>
        </label>
      </div>

      <!-- 4 减少动效：与上一行同组，样板无 divider（语义簇可省略） -->
      <div class="settings-pref-row">
        <div class="settings-pref-row__meta">…</div>
        <label class="settings-switch">
          <span class="sr-only">遵循系统减少动效</span>
          <input type="checkbox" data-testid="settings-respect-reduced-motion" />
          <span class="settings-switch__track" aria-hidden="true"></span>
        </label>
      </div>

      <div class="settings-pref-divider" role="separator"></div>

      <!-- 5 动画速度：segmented inline -->
      <div class="settings-pref-row">
        <div class="settings-pref-row__meta">…</div>
        <div
          class="settings-segmented settings-segmented--inline"
          role="group"
          aria-label="动画速度"
        >
          …
        </div>
      </div>
    </div>
  </div>
</section>
```

**控件落位规则（对齐现网，避免迁移时「全包 \_\_control」）：**

| 右侧控件                                         | 是否包 `settings-pref-row__control` |
| ------------------------------------------------ | ----------------------------------- |
| `settings-switch`                                | 否（`flex-shrink: 0` 贴右）         |
| `settings-segmented--inline`（± `--color-mode`） | 否（自身带 flex 宽）                |
| `select.settings-control`                        | 是                                  |

### 3.4 形态 B / C 对照（不进入 pref-list 硬塞）

```html
<!-- B：Stacked Field -->
<div class="settings-field">
  <label class="settings-field__label" for="settings-api-key">API Key</label>
  <p class="settings-field__help">仅保存在本机；留空表示不修改已有密钥。</p>
  <input id="settings-api-key" class="settings-control" type="password" autocomplete="off" />
</div>

<!-- C：Composite / Step（示意） -->
<div class="settings-step-card" data-step="reasoning">
  <header class="settings-step-card__head">…</header>
  <!-- step 内可局部嵌 A：一个小 pref-list 只放开关/effort -->
  <div class="settings-pref-list">…</div>
</div>
```

> B/C 的既有 class 名以当前 `systemSettings` 实现为准；本规范不重做 field/step 体系，只界定 **不得误用 A**。

---

## 4. 视觉与密度 token

### 4.1 Operational Quiet 约束

| 规则       | 要求                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 颜色语义   | 颜色只表达 **状态 / 风险**；不用彩虹区分模块                                                                                                  |
| 容器       | list 使用中性 surface + border；禁用 row 底色轮换                                                                                             |
| 图标       | 同组可弱化/省略 icon；禁止每行高饱和色块                                                                                                      |
| 分区 frame | 外观保留现网 `settings-section-frame--appearance`（muted 中性，**非**彩虹）；P0 **不必**改 frame class；禁用「彩 tint + list border」双重强调 |

### 4.2 密度（与样板对齐）

引用既有 CSS 变量，不新增全局 token 族：

| 元素           | 目标值                                                      | 参考                            |
| -------------- | ----------------------------------------------------------- | ------------------------------- |
| row padding    | ~`0.75rem 1rem`（12×16）                                    | 样板 `.settings-appearance-row` |
| row min-height | ~`3.25rem`（52px）                                          | 同上                            |
| title          | `0.8125rem` / `600` / line-height ~1.3                      | `__title`                       |
| hint           | `0.6875–0.75rem`（11–12px）/ 400 / tertiary                 | `__hint`                        |
| icon 盒        | `1.75rem` 方；muted 表面 12% mix                            | `__icon`                        |
| list 边框      | `1px solid var(--settings-border)`                          | list                            |
| list 圆角      | `var(--settings-radius-card, var(--workbench-radius, 8px))` | list                            |
| list 表面      | `var(--settings-surface)`                                   | list                            |
| divider        | `1px` light border，无上下 margin 撑开                      | divider                         |
| control 列     | `flex: 0 1 14rem; min 10rem; max ~16rem`                    | `__control`                     |
| 行 gap         | `0.75rem 1rem`                                              | row                             |

### 4.3 控件列宽度

| 控件                | 行为                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------- |
| switch              | 靠右、不包 `__control`；track 可小于 44，但 row `min-height: 3.25rem` + label hit 区兜底 |
| segmented（inline） | 贴右；**必须**继续挂靠现有 `.settings-segmented--inline` / `--color-mode` 宽度规则       |
| select / 短 control | 走 `__control` max-width                                                                 |
| 复杂右侧控件        | `--multiline-control` 放宽 max-width（见 §5）                                            |

**CSS 耦合提醒（迁移易漏）：**

- `.settings-segmented--inline` 与 list 行并排宽由 **独立选择器** 控制（现网 ~1001–1020），**不是** `settings-appearance-*` 子选择器。
- Rename 时 **禁止**误删/误改这些规则；P0 验收须看主题 segmented（三钮含「跟随系统」）与速度 segmented 是否仍贴右、不裁切。

---

## 5. 变体规则与 a11y

### 5.1 变体

| 变体     | Class                                  | 用途                       | 规则                                                                                  | 阶段                                |
| -------- | -------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------- |
| 默认     | （无）                                 | 桌面宽：左 meta 右 control | 复制现网 appearance-row：`align-items: center; flex-wrap: wrap`                       | **P0 必须**                         |
| 堆叠     | `settings-pref-row--stack`             | 窄屏或宽控件挤不下         | control 换行全宽；padding 保持；**优先 CSS**（container/`max-width`），避免纯 JS 测宽 | P0 可预留 CSS；外观 HTML **可不挂** |
| 危险提示 | `settings-pref-row--danger`            | 高风险偏好的轻提示         | **细左边框**（`--settings-danger` 等语义 token）+ 可选 hint 强调；**禁止**整行大红底  | P1 起实际使用；危险操作本身仍禁用 A |
| 多行控件 | `settings-pref-row--multiline-control` | 右侧非单行控件             | 放宽 `__control` max-width；`align-items: flex-start`                                 | 按需                                |

### 5.2 a11y 基线

| 要求             | 落地                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| 可见标题不重复读 | 控件旁使用 `sr-only` label，或 `aria-label` / `role="group" aria-label`（segmented） |
| 焦点可见         | `focus-visible` 使用 `var(--settings-focus-ring)`；switch 焦点落在 track 环上        |
| 开关语义         | 真实 `input[type=checkbox]` + 装饰 track；禁止纯 div 冒充                            |
| Segmented        | `role="group"` + 每钮 `aria-pressed`                                                 |
| Divider          | `role="separator"`；装饰性可不进 a11y tree 之外另行 aria                             |
| 触控             | 可点区域 ≥ ~44px 高度优先；row min-height 52 提供余量                                |
| 对比             | title 用 `--settings-text`；hint 用 tertiary；危险态用语义色，不只靠红底             |

### 5.3 文案密度

- title：动宾/名词短语，≤ ~16 汉字优先
- hint：一行理想，两行上限；不把操作手册写进 hint
- 需要长文案 → 升级为形态 B

---

## 6. 与现有组件关系

| 组件                     | 关系                                  | 注意                                                                                                                  |
| ------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `settings-control`       | pref-row 右侧主输入壳（select/input） | 保持 `--sm` 密度；不要在 row 内再套大号 form-group                                                                    |
| `settings-switch`        | toggle 标准控件                       | 继续用 sr-only + track；焦点环已存在则复用                                                                            |
| `settings-segmented`     | enum 即时选择                         | 优先 `--inline`；与 pref-row 并排                                                                                     |
| `settings-section-frame` | **可选**外层分区壳                    | 外观：保留 `settings-section-frame--appearance`（muted）；P1 诊断/工具簇优先裸 list **或** 单一中性 frame，勿双重边框 |
| `settings-section-head`  | section 叙事（标题/徽章）             | 不属于 list 内部                                                                                                      |
| `settings-badge`         | 「即时生效」等                        | 挂 head，不挂每一行                                                                                                   |

**不在本规范发明：** 新的全局 settings design system、新图标库、新的 switch 实现。

---

## 7. 迁移策略

### 7.1 推荐路径：Rename + Alias 兼容（P0 默认）

**工程可落地的硬写法：** CSS **并列选择器**，不要只改名丢旧规则。

```css
/* 正确：新名 + 旧名共享同一声明块 */
.settings-pref-list,
.settings-appearance-grid {
  /* 原 .settings-appearance-grid 声明 */
}

.settings-pref-row,
.settings-appearance-row {
  /* … */
}

/* 其余 __meta/__icon/__title/__hint/__control、divider 同理 */
```

步骤：

1. 在 `systemSettings.css` 为 §3.2 全表建立 `settings-pref-*` + 旧名并列（**不改** switch/segmented 块）
2. HTML 外观区布局 class 改为 `settings-pref-*`（可选短暂双 class；默认单写新 class + CSS alias 即可）
3. **冻结** testid / id / nav / Alpine；unit 若有 class 字符串断言再改（现网主路径用 testid）
4. 跑外观相关 UT / E2E / visual
5. 兼容期内文档以 pref 为准；删 alias 须另 PR + `grep settings-appearance-(grid|row|divider)` 零命中

### 7.2 可选路径：Hard cut（同 PR 测全绿才可）

允许 HTML+CSS 一次去掉旧 class **且不留 alias**，但必须同一 PR：

- 禁止改 testid / 存储 / 即时生效 API
- `tests/e2e/system-settings.spec.ts`、`tests/e2e/release-smoke.spec.ts`、`tests/unit/systemSettingsPresets.test.ts`、`tests/unit/settingsNavScroll.test.ts`、`tests/visual/theme-appearance-scaffold.test.ts` 相关断言绿
- 人工或截图确认密度 ±2px

不确定时 **退回 7.1 alias**。

### 7.3 兼容期规则

| 项           | 规则                                                      |
| ------------ | --------------------------------------------------------- |
| 新代码       | **只写** `settings-pref-*` 布局 class                     |
| 旧 class     | 仅 CSS alias；HTML 新代码禁止继续写 appearance 布局 class |
| testid / nav | **永不**随 rename 改                                      |
| 删除 alias   | 显式 PR；grep 零命中 + 视觉回归                           |

### 7.4 非迁移项

- `settings-switch` / `settings-segmented*` / `settings-control` 名称与行为
- LLM 四步 / 保存契约 / dirty 分区语义
- `settings-section-frame--appearance` 的 class 名（除非另开「frame 去 tint」小 PR）
- enterprise 规定的外观 **即时写入** 策略

---

## 8. 分 Section 推广矩阵

| Section             | 主形态  | Pref List 吸收                                    | 优先级      | 备注                                                                 |
| ------------------- | ------- | ------------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| 外观与体验          | A       | **全量作为样板**                                  | **P0**      | 仅布局 class rename + CSS alias；testid/nav 冻结；frame class 可不动 |
| 开发者诊断          | A       | 调试布尔/小 enum 开关簇                           | **P1**      | 只读 endpoint 安全块保持 B/只读；勿与监控大按钮混成 row              |
| 工具策略            | A + B/C | **通用即时**开关、小 enum                         | **P1**      | runtime 数字/超时/矩阵/预设按钮组 **非 A**                           |
| 数据与备份          | A + C   | 简单保留偏好 toggle                               | **P1**      | 导入导出/分桶清理/危险确认 **禁用 A**                                |
| 采集代理与网络      | B/C     | 默认不塞 URL/凭据                                 | **P2 可选** | 仅「启用代理」类纯开关可 A；勿与账号密码同行                         |
| AI 模型与连接 / LLM | C 为主  | step **内局部** A（推理开关/effort/service_tier） | **P2**      | **不取消**四步；key/URL **永属 B**                                   |

> 矩阵偏保守：宁可 P1 少收，也不要把 B/C 硬塞 A。一次只接一个开关簇。

### 8.1 容器策略补充

| Section           | list 外 frame                                                                        |
| ----------------- | ------------------------------------------------------------------------------------ |
| 外观              | 现网 `settings-section-frame--appearance` 可保留；list 自带 border 时勿再叠加彩 tint |
| 诊断 / 工具开关簇 | **裸 list** 或单一中性 frame **二选一**                                              |
| LLM step 内       | 瘦 list（无外 frame），嵌在 step/card 内                                             |

---

## 9. 验收标准（可测）

| ID         | 标准                                                                                    | 测法                                                                                    |
| ---------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **PL-A1**  | 外观区已挂 `settings-pref-*`；密度与 rename 前一致（row padding/min-height/title ±2px） | 对比 CSS + 手工/截图                                                                    |
| **PL-A2**  | 兼容路径下旧 `settings-appearance-*` 选择器仍指向同一规则（或 hard cut 已清零且测绿）   | 读 CSS；外观 UT/E2E 绿                                                                  |
| **PL-A3**  | 主题 / 色调 / 动画 / 减少动效 / 速度 **交互与持久化**无回归                             | `systemSettingsPresets` UT-P1-06、`system-settings` E2E-P1-04、release-smoke appearance |
| **PL-A3b** | §3.2.1 testid/id/nav **全部仍在**                                                       | unit 字符串 + e2e `getByTestId`                                                         |
| **PL-A4**  | 可聚焦控件有 `focus-visible`（switch → track 环；segmented → btn）                      | 键盘 Tab                                                                                |
| **PL-A5**  | switch sr-only；segmented `role="group"` + `aria-pressed` / aria-label                  | DOM 抽查                                                                                |
| **PL-A6**  | 窄抽屉宽（约 320–400px）主题/速度 segmented **不横向裁切**；必要时可挂 `--stack`        | 手工走查                                                                                |
| **PL-A7**  | P1 新增 A 项只用 `settings-pref-*`，禁止新造 `*-appearance-grid` 式私有命名             | review / grep                                                                           |
| **PL-A8**  | key / URL / 危险操作 / LLM 主流程未硬塞 A                                               | checklist                                                                               |
| **PL-A9**  | `--danger` 仅左边框，无整行大红底                                                       | 视觉                                                                                    |
| **PL-A10** | P0 diff **仅**外观布局 rename + 必要测试；无 LLM/保存/其他 section 大改                 | diff 审查                                                                               |
| **PL-A11** | `.settings-segmented--inline` / `--color-mode` 宽度规则仍生效                           | 主题三钮 + 速度三钮布局                                                                 |

---

## 10. 非目标

- 把系统设置 **全部** 改成左标题右控件 / 全页 iOS Settings
- 重做 LLM 四步或取消 step
- 新建独立 settings 组件库 / Storybook 设计系统
- 引入新全局 spacing/color token 族替代 `--settings-*`（须挂 enterprise §14 反孤岛）
- 改外观 **即时生效** / 存储 key / dirty 分区语义（enterprise 已定）
- 改 `data-testid` / `data-settings-nav-id` / 导航 target 字符串
- 云端同步偏好、组织策略
- 为每一行强制 icon 或模块彩虹色
- 借本 Spec 做危险操作、导入导出、代理表单的 UI 重构

---

## 11. 实施切片建议

### P0 — 原语化外观样板（必须小而完整）

| 项                 | 内容                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目标               | 布局 class `settings-appearance-*` → `settings-pref-*`；**行为/契约零回归**                                                                                                                                         |
| 精确文件（允许改） | `src/components/settings/systemSettings.css`（§3.2 规则并列 + 可选变体桩）<br>`src/components/settings/systemSettings.html`（**仅** `#settings-section-appearance` 内布局 class）                                   |
| 按需文件           | 仅当有人断言 **class 字符串**：相关 `tests/unit/*`；**默认** e2e/unit 走 testid，不应为 P0 大改测试                                                                                                                 |
| 禁止触碰           | `systemSettings.ts` 业务（除非编译/类型强制，默认不动）<br>LLM/工具/网络/数据/诊断 section HTML<br>testid / id / nav / Alpine 表达式<br>保存与即时生效 API<br>`.settings-segmented--inline` / `--color-mode` 的误删 |
| 不做               | 其他 section 改版；LLM 重构；frame 去/换名大改造                                                                                                                                                                    |
| 出口               | PL-A1–A6、A3b、A10、A11                                                                                                                                                                                             |

### P1 — 高价值开关簇

| 项       | 内容                                                |
| -------- | --------------------------------------------------- |
| 目标     | 诊断开关簇 → 工具策略通用开关 → 数据保留简单 toggle |
| 建议文件 | 对应 section HTML 片段；CSS 尽量零覆盖；相关测例    |
| 原则     | 每项先过 §2；不合格保持 B/C；每次 **一个**开关簇    |
| 出口     | PL-A7、A8；无双重彩边框                             |

### P2 — LLM 局部吸收

| 项       | 内容                                                       |
| -------- | ---------------------------------------------------------- |
| 目标     | 既有 step **内**局部 A（推理开关 / effort / service_tier） |
| 建议文件 | LLM step HTML + 最小 CSS；既有 reasoning/effort 测         |
| 不做     | 取消 step；key/URL 进 row；状态机大重构                    |
| 出口     | step 测绿；局部 list 不与 step 卡片双重冲突                |

### 实施顺序（建议）

```text
1. CSS：settings-pref-* 与 settings-appearance-* 并列；不动 switch/segmented 规则
2. HTML：仅外观区布局 class → pref（testid/nav/Alpine 不动）
3. 跑 UT-P1-06、settingsNavScroll、E2E-P1-04、release-smoke appearance、visual scaffold
4. P1 每次一个开关簇
5. 稳定后另 PR 删 alias
6. P2 只碰 LLM step 内局部行
```

### 11.1 与 enterprise-hardening 的边界

| 点                        | 关系                                                                   |
| ------------------------- | ---------------------------------------------------------------------- |
| SS-O7 / P1-5 外观纳入设置 | 本 Spec 只抽布局原语，不改外观数据契约                                 |
| 外观即时生效              | **保持**；pref-list 不引入「显式保存外观」                             |
| SS-O9 反孤岛              | 继续用 `--settings-*`；禁止新色盘                                      |
| §14 低饱和 section tint   | 外观 frame 已 muted；本 Spec 反对的是 **双重强调**，不是消灭一切 frame |
| 测试闭环 §7               | P0 须继续满足外观相关 UT/E2E ID，不得解绑                              |

---

## 12. Review Checklist（PR 自检）

- [ ] 该字段是否真的是 **单点即时偏好**？
- [ ] 是否误把 key/URL/长 help/危险操作/流程塞进 row？
- [ ] 是否使用 `settings-pref-*` 而非新造 `*-grid`？
- [ ] 是否误改 testid / nav id / 即时生效逻辑？
- [ ] switch/segmented 是否仍 **不**被错误包进强制宽 `__control`？
- [ ] `.settings-segmented--inline` / `--color-mode` 是否仍生效？
- [ ] 是否出现 frame + list 双重彩边框？
- [ ] switch/segmented 是否有可访问名称与 focus 环？
- [ ] 窄宽是否裁切；是否需要 `--stack` / `--multiline-control`？
- [ ] `--danger` 是否仅左边框？
- [ ] 断言是否仍以 `data-testid` / 行为为主？

---

## 13. 开放项（需产品/实现拍板时再开）

| 项                                 | 默认建议                                         | 是否阻塞 P0 |
| ---------------------------------- | ------------------------------------------------ | ----------- |
| Alias 保留时长                     | 至 P1 至少一个 section 落地后，grep 零旧引用再删 | 否          |
| 同组是否强制 icon                  | 不强制；连续 switch 可共享弱 icon 或省略         | 否          |
| 网络区「启用代理」是否 P1          | 默认 P2 可选，避免与凭据字段混排视觉误导         | 否          |
| B 形态是否统一 `settings-field` 名 | 后续小规格；不阻塞 pref-list                     | 否          |

---

**本 Spec 完成标志：** P0 外观原语可合并；工程师可用 §2 表在 1 分钟内判定形态 A/B/C；P1/P2 有明确文件与禁止项，不回退为「所有设置左右布局」。
